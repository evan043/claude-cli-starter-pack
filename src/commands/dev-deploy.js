/**
 * Dev Deploy Command
 *
 * Developer-only command for testing CCASP changes locally without publishing to npm.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - dev-deploy/worktree.js - Worktree management (create, list, cleanup, config, helpers)
 * - dev-deploy/deploy.js - Local deployment (npm link, project updates, smart sync)
 * - dev-deploy/scan.js - Project customization scanner
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { getVersion } from '../utils.js';
import {
  CCASP_ROOT,
  createWorktree,
  cleanupWorktree,
  showWorktreeList,
  isWorktree,
  getCurrentBranch,
  loadDevConfig,
  prompt
} from './dev-deploy/worktree.js';
import { deployWorktreeLocally } from './dev-deploy/deploy.js';
import { scanProjectCustomizations } from './dev-deploy/scan.js';

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

  // Handle --scan
  if (options.scan) {
    await scanProjectCustomizations();
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
