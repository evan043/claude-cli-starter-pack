/**
 * Dev Deploy Command
 *
 * Developer-only command for testing CCASP changes locally without publishing to npm.
 *
 * Features:
 * - Creates/manages git worktrees for isolated development
 * - Links worktree as global npm package (npm link)
 * - Updates all registered projects with local version
 * - Supports private remote branches for worktree sync
 * - Does NOT commit to main or publish to npm
 *
 * Usage:
 *   ccasp dev-deploy              - Deploy current worktree locally
 *   ccasp dev-deploy --create     - Create new worktree for development
 *   ccasp dev-deploy --list       - List active worktrees
 *   ccasp dev-deploy --cleanup    - Remove worktree and restore npm version
 */

import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { loadRegistry } from '../utils/global-registry.js';
import { getVersion } from '../utils.js';
import { fileURLToPath } from 'url';
import {
  activateDevMode,
  deactivateDevMode,
  loadDevState,
  addBackedUpProject,
  isDevMode,
  getDevModeInfo
} from '../utils/dev-mode-state.js';
import { backupProject, getLatestBackup, restoreProject } from '../utils/project-backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CCASP_ROOT = join(__dirname, '..', '..');

// Config file for dev worktree state
const DEV_CONFIG_PATH = join(CCASP_ROOT, '.dev-worktree-config.json');

/**
 * Execute command with output
 */
function exec(cmd, options = {}) {
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
function execSilent(cmd, cwd = process.cwd()) {
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
function prompt(question) {
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
function loadDevConfig() {
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
function saveDevConfig(config) {
  writeFileSync(DEV_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Get current git branch
 */
function getCurrentBranch(cwd = process.cwd()) {
  return execSilent('git rev-parse --abbrev-ref HEAD', cwd);
}

/**
 * Check if we're in a worktree
 */
function isWorktree(cwd = process.cwd()) {
  const gitDir = execSilent('git rev-parse --git-dir', cwd);
  return gitDir && gitDir.includes('.git/worktrees');
}

/**
 * Get worktree root from main repo
 */
function getWorktreeRoot() {
  // Worktrees are created as siblings to the main repo
  return dirname(CCASP_ROOT);
}

/**
 * List existing worktrees
 */
function listWorktrees() {
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
async function createWorktree(name, options = {}) {
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
 * Deploy worktree locally (npm link)
 */
async function deployWorktreeLocally(worktreePath) {
  console.log(chalk.cyan('\n  Deploying worktree locally...\n'));

  // Verify worktree has package.json
  const pkgPath = join(worktreePath, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log(chalk.red(`  ✗ No package.json found in worktree`));
    return false;
  }

  // Read version from worktree
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(chalk.dim(`  Package: ${pkg.name}@${pkg.version}`));
  console.log(chalk.dim(`  Worktree: ${worktreePath}\n`));

  // Step 1: Unlink any existing global link
  console.log(chalk.dim('  [1/4] Unlinking existing global package...'));
  exec('npm unlink -g claude-cli-advanced-starter-pack', { ignoreError: true, silent: true });
  console.log(chalk.green('  ✓ Unlinked'));

  // Step 2: Create global link from worktree
  console.log(chalk.dim('  [2/4] Creating global link from worktree...'));
  exec('npm link', { cwd: worktreePath });
  console.log(chalk.green('  ✓ Global link created'));

  // Step 2b: Activate global dev mode
  activateDevMode(worktreePath, pkg.version);
  console.log(chalk.yellow('  ✓ Global dev mode activated'));

  // Step 3: Verify link
  console.log(chalk.dim('  [3/4] Verifying installation...'));
  const ccaspPath = execSilent('npm root -g', worktreePath);
  if (ccaspPath) {
    const linkedPath = join(ccaspPath, 'claude-cli-advanced-starter-pack');
    if (existsSync(linkedPath)) {
      console.log(chalk.green(`  ✓ Linked at ${linkedPath}`));
    }
  }

  // Step 4: Update registered projects
  console.log(chalk.dim('  [4/4] Updating registered projects...'));
  await updateRegisteredProjects(worktreePath);

  return true;
}

/**
 * Update all registered projects with the local version
 */
async function updateRegisteredProjects(worktreePath) {
  const registry = loadRegistry();

  if (registry.projects.length === 0) {
    console.log(chalk.dim('       No registered projects to update.'));
    return;
  }

  console.log(chalk.dim(`       Found ${registry.projects.length} registered project(s)`));

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let backedUp = 0;

  for (const project of registry.projects) {
    if (!existsSync(project.path)) {
      skipped++;
      continue;
    }

    const projectClaudeDir = join(project.path, '.claude');
    if (!existsSync(projectClaudeDir)) {
      skipped++;
      continue;
    }

    try {
      // Backup project before updating
      console.log(chalk.dim(`       Backing up ${project.name}...`));
      const backup = backupProject(project.path);
      if (backup) {
        addBackedUpProject({
          path: project.path,
          name: project.name,
          backupPath: backup.backupPath,
          backedUpAt: backup.backedUpAt,
          fileCount: backup.fileCount
        });
        backedUp++;
        console.log(chalk.green(`       ✓ Backed up (${backup.fileCount} files)`));
      }

      // Run ccasp init in dev mode to refresh commands
      const originalCwd = process.cwd();
      process.chdir(project.path);

      // Import and run init with dev flag
      const { runInit } = await import('./init.js');
      await runInit({ dev: true, force: true, skipPrompts: true, noRegister: true });

      process.chdir(originalCwd);
      updated++;
    } catch (err) {
      failed++;
    }
  }

  if (backedUp > 0) {
    console.log(chalk.green(`       ✓ Backed up ${backedUp} project(s)`));
  }
  if (updated > 0) {
    console.log(chalk.green(`       ✓ Updated ${updated} project(s)`));
  }
  if (skipped > 0) {
    console.log(chalk.dim(`       Skipped ${skipped} project(s) (not found)`));
  }
  if (failed > 0) {
    console.log(chalk.yellow(`       ⚠️  Failed ${failed} project(s)`));
  }
}

/**
 * Cleanup worktree and restore npm version
 */
async function cleanupWorktree(name) {
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
function showWorktreeList() {
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

/**
 * Main dev-deploy function
 */
export async function runDevDeploy(options = {}) {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.bold.white('            CCASP Developer Deploy (Local)                   ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  const version = getVersion();
  console.log(chalk.dim(`  CCASP Version: ${version}`));
  console.log(chalk.dim(`  Main repo: ${CCASP_ROOT}\n`));

  // Handle --list
  if (options.list) {
    showWorktreeList();
    return;
  }

  // Handle --create
  if (options.create) {
    const name = typeof options.create === 'string' ? options.create : await prompt('  Worktree name: ');
    if (!name) {
      console.log(chalk.red('  ✗ Name is required'));
      return;
    }

    const worktreePath = await createWorktree(name, { privateRemote: options.private });
    if (worktreePath) {
      console.log(chalk.green('\n  ✓ Worktree created successfully!\n'));
      console.log(chalk.dim('  Next steps:'));
      console.log(chalk.cyan(`    1. cd "${worktreePath}"`));
      console.log(chalk.cyan('    2. Make your changes'));
      console.log(chalk.cyan('    3. ccasp dev-deploy  # to deploy locally'));
      console.log('');
    }
    return;
  }

  // Handle --cleanup
  if (options.cleanup) {
    const config = loadDevConfig();
    const name = typeof options.cleanup === 'string'
      ? options.cleanup
      : config.activeWorktree || await prompt('  Worktree name to cleanup: ');

    if (!name) {
      console.log(chalk.red('  ✗ No worktree specified'));
      return;
    }

    await cleanupWorktree(name);
    return;
  }

  // Default: Deploy current directory if it's a worktree, or active worktree
  let worktreePath = process.cwd();
  const currentBranch = getCurrentBranch();
  const inWorktree = isWorktree();

  if (inWorktree) {
    console.log(chalk.dim(`  Current worktree: ${currentBranch}`));
    console.log(chalk.dim(`  Path: ${worktreePath}\n`));
  } else {
    // Not in a worktree, check for active worktree
    const config = loadDevConfig();
    if (config.activeWorktree) {
      const activeWt = config.worktrees.find(w => w.name === config.activeWorktree);
      if (activeWt && existsSync(activeWt.path)) {
        worktreePath = activeWt.path;
        console.log(chalk.dim(`  Using active worktree: ${config.activeWorktree}`));
        console.log(chalk.dim(`  Path: ${worktreePath}\n`));
      } else {
        console.log(chalk.yellow('  ⚠️  Active worktree not found.\n'));
        console.log(chalk.dim('  Options:'));
        console.log(chalk.cyan('    ccasp dev-deploy --create <name>  # Create new worktree'));
        console.log(chalk.cyan('    ccasp dev-deploy --list           # List worktrees'));
        console.log('');
        return;
      }
    } else {
      console.log(chalk.yellow('  ⚠️  Not in a worktree and no active worktree set.\n'));
      console.log(chalk.dim('  Options:'));
      console.log(chalk.cyan('    ccasp dev-deploy --create <name>  # Create new worktree'));
      console.log(chalk.cyan('    cd <worktree-path> && ccasp dev-deploy  # Deploy from worktree'));
      console.log('');
      return;
    }
  }

  // Confirm deployment
  if (!options.force) {
    console.log(chalk.yellow.bold('  ⚠️  This will:'));
    console.log(chalk.yellow('     1. Unlink any existing global CCASP'));
    console.log(chalk.yellow('     2. Link this worktree as global package'));
    console.log(chalk.yellow('     3. Update all registered projects'));
    console.log(chalk.dim('     (Does NOT publish to npm or commit to main)'));
    console.log('');

    const confirm = await prompt('  Proceed? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log(chalk.dim('\n  Cancelled.\n'));
      return;
    }
  }

  // Deploy
  const success = await deployWorktreeLocally(worktreePath);

  if (success) {
    console.log(chalk.green('\n  ═══════════════════════════════════════════════════════════'));
    console.log(chalk.green.bold('  ✓ Local deployment complete!'));
    console.log(chalk.green('  ═══════════════════════════════════════════════════════════\n'));
    console.log(chalk.dim('  The worktree is now your global ccasp installation.'));
    console.log(chalk.dim('  Changes you make will be reflected immediately.'));
    console.log(chalk.dim('  Restart Claude Code CLI to see command changes.\n'));
    console.log(chalk.dim('  To restore npm version: ccasp dev-deploy --cleanup\n'));
  }
}
