import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const CCASP_ROOT = join(__dirname, '..', '..', '..');

export const DEV_CONFIG_PATH = join(CCASP_ROOT, '.dev-worktree-config.json');

/**
 * Execute command with output
 */
export function exec(cmd, options = {}) {
  const { silent = false, cwd = process.cwd(), ignoreError = false } = options;
  try {
    const result = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
    });
    return result ? result.trim() : '';
  } catch (error) {
    if (ignoreError) return null;
    throw error;
  }
}

/**
 * Execute command silently and return output
 */
export function execSilent(cmd, cwd = process.cwd()) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Prompt user for input
 */
export function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Load dev config
 */
export function loadDevConfig() {
  if (existsSync(DEV_CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(DEV_CONFIG_PATH, 'utf8'));
    } catch {
      return { worktrees: [], activeWorktree: null };
    }
  }
  return { worktrees: [], activeWorktree: null };
}

/**
 * Save dev config
 */
export function saveDevConfig(config) {
  writeFileSync(DEV_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Get current git branch
 */
export function getCurrentBranch(cwd = process.cwd()) {
  return execSilent('git rev-parse --abbrev-ref HEAD', cwd);
}

/**
 * Check if we're in a worktree
 */
export function isWorktree(cwd = process.cwd()) {
  const gitDir = execSilent('git rev-parse --git-dir', cwd);
  return gitDir && gitDir.includes('.git/worktrees');
}

/**
 * Get worktree root from main repo
 */
export function getWorktreeRoot() {
  // Worktrees are created as siblings to the main repo
  return dirname(CCASP_ROOT);
}

/**
 * List existing worktrees
 */
export function listWorktrees() {
  const output = execSilent('git worktree list --porcelain', CCASP_ROOT);
  if (!output) return [];

  const worktrees = [];
  const entries = output.split('\n\n').filter(Boolean);

  for (const entry of entries) {
    const lines = entry.split('\n');
    const worktree = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        worktree.path = line.replace('worktree ', '');
      } else if (line.startsWith('HEAD ')) {
        worktree.head = line.replace('HEAD ', '');
      } else if (line.startsWith('branch ')) {
        worktree.branch = line.replace('branch refs/heads/', '');
      } else if (line === 'detached') {
        worktree.detached = true;
      }
    }

    if (worktree.path && worktree.path !== CCASP_ROOT) {
      worktrees.push(worktree);
    }
  }

  return worktrees;
}

/**
 * Create a new worktree with private remote branch
 */
export async function createWorktree(name, options = {}) {
  const worktreeRoot = getWorktreeRoot();
  const worktreePath = join(worktreeRoot, name);

  console.log(chalk.cyan(`\n  Creating worktree: ${name}`));
  console.log(chalk.dim(`  Path: ${worktreePath}\n`));

  // Check if already exists
  if (existsSync(worktreePath)) {
    console.log(chalk.yellow(`  ⚠️  Worktree directory already exists: ${worktreePath}`));
    const overwrite = await prompt('  Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log(chalk.dim('  Cancelled.'));
      return null;
    }
    // Remove existing worktree
    exec(`git worktree remove "${worktreePath}" --force`, { cwd: CCASP_ROOT, ignoreError: true });
  }

  // Create the worktree with a new branch
  const branchName = name;
  console.log(chalk.dim(`  Creating branch: ${branchName}`));

  try {
    exec(`git worktree add "${worktreePath}" -b ${branchName}`, { cwd: CCASP_ROOT });
    console.log(chalk.green(`  ✓ Worktree created at ${worktreePath}`));
  } catch (error) {
    // Branch might already exist, try without -b
    try {
      exec(`git worktree add "${worktreePath}" ${branchName}`, { cwd: CCASP_ROOT });
      console.log(chalk.green(`  ✓ Worktree created (existing branch)`));
    } catch (e) {
      console.log(chalk.red(`  ✗ Failed to create worktree: ${e.message}`));
      return null;
    }
  }

  // Setup private remote branch if requested
  if (options.privateRemote) {
    console.log(chalk.dim(`  Setting up private remote branch...`));

    // Check if origin exists
    const hasOrigin = execSilent('git remote get-url origin', worktreePath);
    if (hasOrigin) {
      // Push branch to origin (it will be a private branch in the same repo)
      exec(`git push -u origin ${branchName}`, { cwd: worktreePath, ignoreError: true });
      console.log(chalk.green(`  ✓ Private branch pushed to origin`));
    } else {
      console.log(chalk.yellow(`  ⚠️  No origin remote found. Branch is local only.`));
    }
  }

  // Update dev config
  const config = loadDevConfig();
  config.worktrees.push({
    name,
    path: worktreePath,
    branch: branchName,
    createdAt: new Date().toISOString(),
    privateRemote: options.privateRemote || false
  });
  config.activeWorktree = name;
  saveDevConfig(config);

  return worktreePath;
}

/**
 * Cleanup worktree and restore npm version
 */
export async function cleanupWorktree(name) {
  const config = loadDevConfig();
  const worktree = config.worktrees.find(w => w.name === name);

  if (!worktree) {
    console.log(chalk.red(`  ✗ Worktree not found: ${name}`));
    return false;
  }

  console.log(chalk.cyan(`\n  Cleaning up worktree: ${name}`));
  console.log(chalk.dim(`  Path: ${worktree.path}\n`));

  // Step 1: Unlink global package
  console.log(chalk.dim('  [1/5] Unlinking global package...'));
  exec('npm unlink -g claude-cli-advanced-starter-pack', { ignoreError: true, silent: true });
  console.log(chalk.green('  ✓ Unlinked'));

  // Step 1b: Deactivate dev mode
  const { deactivateDevMode } = await import('../../utils/dev-mode-state.js');
  deactivateDevMode();
  console.log(chalk.green('  ✓ Dev mode deactivated'));

  // Step 2: Remove worktree
  console.log(chalk.dim('  [2/5] Removing worktree...'));
  exec(`git worktree remove "${worktree.path}" --force`, { cwd: CCASP_ROOT, ignoreError: true });
  console.log(chalk.green('  ✓ Worktree removed'));

  // Step 3: Delete remote branch if it was private
  if (worktree.privateRemote) {
    console.log(chalk.dim('  [3/5] Deleting remote branch...'));
    exec(`git push origin --delete ${worktree.branch}`, { cwd: CCASP_ROOT, ignoreError: true });
    console.log(chalk.green('  ✓ Remote branch deleted'));
  } else {
    console.log(chalk.dim('  [3/5] Skipping remote branch deletion (local only)'));
  }

  // Step 4: Offer to restore projects from backup
  const { loadDevState } = await import('../../utils/dev-mode-state.js');
  const devState = loadDevState();
  if (devState.projects && devState.projects.length > 0) {
    console.log(chalk.dim(`  [4/5] ${devState.projects.length} project(s) have backups available`));
    console.log(chalk.dim('        Run /menu to restore or update projects'));
  } else {
    console.log(chalk.dim('  [4/5] No project backups to restore'));
  }

  // Step 5: Restore npm version
  console.log(chalk.dim('  [5/5] Restoring npm version...'));
  exec('npm install -g claude-cli-advanced-starter-pack@latest', { ignoreError: true });
  console.log(chalk.green('  ✓ npm version restored'));

  // Update config
  config.worktrees = config.worktrees.filter(w => w.name !== name);
  if (config.activeWorktree === name) {
    config.activeWorktree = null;
  }
  saveDevConfig(config);

  console.log(chalk.green(`\n  ✓ Worktree ${name} cleaned up successfully\n`));
  return true;
}

/**
 * Show worktree list
 */
export function showWorktreeList() {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.bold.white('              CCASP Development Worktrees                    ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  const config = loadDevConfig();
  const worktrees = listWorktrees();

  if (worktrees.length === 0 && config.worktrees.length === 0) {
    console.log(chalk.dim('  No worktrees found.\n'));
    console.log(chalk.dim('  Create one with: ccasp dev-deploy --create <name>\n'));
    return;
  }

  console.log(chalk.bold('  Git Worktrees:'));
  for (const wt of worktrees) {
    const isActive = config.activeWorktree && wt.branch === config.activeWorktree;
    const activeMarker = isActive ? chalk.green(' ← ACTIVE') : '';
    const exists = existsSync(wt.path) ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${exists} ${wt.branch}${activeMarker}`);
    console.log(chalk.dim(`      Path: ${wt.path}`));
  }

  console.log('');
}
