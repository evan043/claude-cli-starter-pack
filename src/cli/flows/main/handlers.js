/**
 * Handlers - Worktree sync handler
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { executeWorktreeSync } from '../../menu/helpers.js';

/**
 * Handle worktree sync from menu
 */
export async function handleWorktreeSync() {
  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                       WORKTREE SYNC                                          ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // First, show preview (dry run)
  console.log(chalk.dim('  Analyzing sync actions...\n'));

  const previewResult = await executeWorktreeSync({ dryRun: true });

  if (previewResult.error) {
    console.log(chalk.red(`  ✗ ${previewResult.error}\n`));
    return;
  }

  console.log(previewResult.formatted);
  console.log('');

  // Count files that would be updated
  const { results } = previewResult;
  const willUpdate = results.executed.length;
  const willSkip = results.skipped.length;

  if (willUpdate === 0) {
    console.log(chalk.green('  ✓ Project is already up to date with worktree.\n'));
    return;
  }

  // Ask for confirmation
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Proceed with sync?',
      choices: [
        { name: `Yes, sync ${willUpdate} file(s)`, value: 'sync' },
        { name: 'Force sync (overwrite customizations)', value: 'force' },
        { name: 'Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (action === 'cancel') {
    console.log(chalk.dim('\n  Sync cancelled.\n'));
    return;
  }

  // Execute sync
  console.log('');
  console.log(chalk.dim('  Syncing files...\n'));

  const syncResult = await executeWorktreeSync({
    dryRun: false,
    force: action === 'force'
  });

  if (syncResult.error) {
    console.log(chalk.red(`  ✗ ${syncResult.error}\n`));
    return;
  }

  console.log(syncResult.formatted);
  console.log('');
  console.log(chalk.green('  ✓ Sync complete. Restart Claude Code CLI to see command changes.\n'));
}
