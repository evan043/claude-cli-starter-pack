/**
 * Panel Settings Module
 *
 * Settings management, skipped files handling, and update configuration.
 *
 * Provides:
 * - showSettings: Main settings menu loop
 * - showSkippedFiles: View/manage skipped customized files
 * - showSkippedFileOptions: Per-file action menu
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  queueCommand,
} from '../../panel/queue.js';
import {
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  getSkippedFiles,
  removeSkippedFile,
} from '../../utils/version-check.js';
import {
  getLocalAsset,
  getTemplateAsset,
  compareAssetVersions,
} from '../../utils/smart-merge.js';
import { formatTimeAgo } from './menu.js';

/**
 * Show settings menu
 */
export async function showSettings() {
  const settings = getAutoUpdateSettings();

  while (true) {
    console.clear();
    console.log(chalk.cyan.bold('\n  Panel Settings\n'));
    console.log(chalk.cyan(`  ${'─'.repeat(40)}`));
    console.log('');
    console.log(chalk.white('  Auto-Update Settings:'));
    console.log(`    Enabled: ${settings.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`    Frequency: ${chalk.yellow(settings.frequency)}`);
    console.log(`    Handle Customizations: ${chalk.yellow(settings.handleCustomizations)}`);
    console.log(`    Notification Mode: ${chalk.yellow(settings.notificationMode)}`);
    console.log(`    Backup Before Update: ${settings.backupBeforeUpdate ? chalk.green('Yes') : chalk.red('No')}`);
    console.log('');

    const skippedFiles = getSkippedFiles();
    if (skippedFiles.length > 0) {
      console.log(chalk.yellow(`  ⚠️  ${skippedFiles.length} file(s) skipped (customized)`));
      console.log('');
    }

    const choices = [
      { name: `[E] Toggle Auto-Update (${settings.enabled ? 'Disable' : 'Enable'})`, value: 'toggle' },
      { name: `[F] Change Frequency (${settings.frequency})`, value: 'frequency' },
      { name: `[C] Customization Handling (${settings.handleCustomizations})`, value: 'customization' },
      { name: `[N] Notification Mode (${settings.notificationMode})`, value: 'notification' },
      { name: `[B] Toggle Backup (${settings.backupBeforeUpdate ? 'On' : 'Off'})`, value: 'backup' },
    ];

    if (skippedFiles.length > 0) {
      choices.push(new inquirer.Separator());
      choices.push({ name: `[V] View Skipped Files (${skippedFiles.length})`, value: 'skipped' });
    }

    choices.push(new inquirer.Separator());
    choices.push({ name: '[S] Save & Return', value: 'back' });

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Settings:',
      choices,
      pageSize: 12,
    }]);

    if (action === 'back') {
      updateAutoUpdateSettings(settings);
      break;
    }

    if (action === 'toggle') {
      settings.enabled = !settings.enabled;
      console.log(chalk.green(`\n  ✓ Auto-update ${settings.enabled ? 'enabled' : 'disabled'}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'frequency') {
      const { freq } = await inquirer.prompt([{
        type: 'list',
        name: 'freq',
        message: 'Check frequency:',
        choices: [
          { name: 'Daily', value: 'daily' },
          { name: 'Weekly (recommended)', value: 'weekly' },
          { name: 'Monthly', value: 'monthly' },
          { name: 'On-demand only', value: 'on-demand' },
        ],
      }]);
      settings.frequency = freq;
      console.log(chalk.green(`\n  ✓ Frequency set to ${freq}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'customization') {
      const { strategy } = await inquirer.prompt([{
        type: 'list',
        name: 'strategy',
        message: 'Handle customized files:',
        choices: [
          { name: 'Ask for each file (recommended)', value: 'ask' },
          { name: 'Smart merge automatically', value: 'merge' },
          { name: 'Skip all customized files', value: 'skip' },
          { name: 'Replace with new version', value: 'replace' },
        ],
      }]);
      settings.handleCustomizations = strategy;
      console.log(chalk.green(`\n  ✓ Strategy set to ${strategy}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'notification') {
      const { mode } = await inquirer.prompt([{
        type: 'list',
        name: 'mode',
        message: 'Notification style:',
        choices: [
          { name: 'Banner (in panel)', value: 'banner' },
          { name: 'Panel indicator only', value: 'panel' },
          { name: 'Silent (no notifications)', value: 'silent' },
        ],
      }]);
      settings.notificationMode = mode;
      console.log(chalk.green(`\n  ✓ Notification mode set to ${mode}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'backup') {
      settings.backupBeforeUpdate = !settings.backupBeforeUpdate;
      console.log(chalk.green(`\n  ✓ Backup ${settings.backupBeforeUpdate ? 'enabled' : 'disabled'}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'skipped') {
      await showSkippedFiles();
    }
  }
}

/**
 * Show skipped files menu
 */
export async function showSkippedFiles() {
  const skippedFiles = getSkippedFiles();

  if (skippedFiles.length === 0) {
    console.log(chalk.green('\n  No skipped files\n'));
    await new Promise(r => setTimeout(r, 1500));
    return;
  }

  while (true) {
    console.clear();
    console.log(chalk.cyan.bold('\n  Skipped Files (Customized)\n'));
    console.log(chalk.cyan(`  ${'─'.repeat(60)}`));
    console.log('');

    const choices = skippedFiles.map((file, idx) => {
      const timeAgo = formatTimeAgo(file.timestamp);
      return {
        name: `[${idx + 1}] ${file.path} ${chalk.dim(`(${timeAgo})`)}`,
        value: idx,
      };
    });

    choices.push(new inquirer.Separator());
    choices.push({ name: '[A] Apply All Smart Merge', value: 'merge-all' });
    choices.push({ name: '[B] Back', value: 'back' });

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Select file:',
      choices,
      pageSize: 15,
    }]);

    if (action === 'back') {
      break;
    }

    if (action === 'merge-all') {
      queueCommand('/update-smart', '--merge-all', { source: 'panel' });
      console.log(chalk.green('\n  ✓ Queued smart merge for all files'));
      console.log(chalk.dim('  Execute in Claude Code with Enter\n'));
      await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      }]);
      break;
    }

    if (typeof action === 'number') {
      await showSkippedFileOptions(skippedFiles[action]);
    }
  }
}

/**
 * Show options for a single skipped file
 */
export async function showSkippedFileOptions(file) {
  console.clear();
  console.log(chalk.cyan.bold(`\n  ${file.path}\n`));
  console.log(chalk.dim(`  Skipped: ${new Date(file.timestamp).toLocaleString()}`));
  console.log(chalk.dim(`  Reason: ${file.reason || 'Customized'}`));
  console.log('');

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Action:',
    choices: [
      { name: '[E] Explore - Claude analyzes both versions', value: 'explore' },
      { name: '[M] Smart Merge - Auto-merge with Claude', value: 'merge' },
      { name: '[R] Replace - Use new version', value: 'replace' },
      { name: '[S] Skip - Keep local permanently', value: 'skip' },
      { name: '[D] Show Diff - View differences', value: 'diff' },
      new inquirer.Separator(),
      { name: '[B] Back', value: 'back' },
    ],
  }]);

  if (action === 'back') {
    return;
  }

  if (action === 'explore') {
    queueCommand('/update-smart', `--explore ${file.assetType}/${file.assetName}`, { source: 'panel' });
    console.log(chalk.green('\n  ✓ Queued exploration'));
    console.log(chalk.dim('  Execute in Claude Code with Enter\n'));
  } else if (action === 'merge') {
    queueCommand('/update-smart', `--merge ${file.assetType}/${file.assetName}`, { source: 'panel' });
    console.log(chalk.green('\n  ✓ Queued smart merge'));
    console.log(chalk.dim('  Execute in Claude Code with Enter\n'));
  } else if (action === 'replace') {
    queueCommand('/update-smart', `--replace ${file.assetType}/${file.assetName}`, { source: 'panel' });
    console.log(chalk.green('\n  ✓ Queued replacement'));
    console.log(chalk.dim('  Execute in Claude Code with Enter\n'));
  } else if (action === 'skip') {
    removeSkippedFile(file.assetType, file.assetName);
    console.log(chalk.green('\n  ✓ File permanently skipped\n'));
    await new Promise(r => setTimeout(r, 1000));
    return;
  } else if (action === 'diff') {
    const local = getLocalAsset(file.assetType, file.assetName);
    const template = getTemplateAsset(file.assetType, file.assetName);
    if (local && template) {
      const comparison = compareAssetVersions(local.content, template.content);
      console.log('\n');
      console.log(chalk.cyan('  Change Summary:'));
      console.log(chalk.dim(`  ${comparison.summary}`));
      console.log('');
      console.log(chalk.yellow(`  Lines to add: ${comparison.stats?.addedLines || 0}`));
      console.log(chalk.yellow(`  Lines to remove: ${comparison.stats?.removedLines || 0}`));
      console.log('');
    }
  }

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
  }]);
}
