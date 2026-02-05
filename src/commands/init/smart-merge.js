/**
 * Smart Merge Logic
 * Handles conflict resolution and backup decisions for existing commands
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getAssetsNeedingMerge,
  getLocalAsset,
  getTemplateAsset,
  generateMergeExplanation,
} from '../../utils/smart-merge.js';

/**
 * Handle smart merge for existing commands
 * @param {Array} finalCommands - Commands to install
 * @param {Array} existingCmdNames - Existing command names
 * @param {Array} requiredCommands - Required commands
 * @param {Object} options - Command options
 * @param {string} cwd - Current working directory
 * @returns {Promise<Object>} Merge decisions and updated command list
 */
export async function handleSmartMerge(finalCommands, existingCmdNames, requiredCommands, options, cwd) {
  const commandsToOverwrite = finalCommands.filter(cmd => existingCmdNames.includes(cmd));
  const smartMergeDecisions = {};
  let overwrite = options.force || false;

  if (commandsToOverwrite.length === 0) {
    return {
      smartMergeDecisions,
      overwrite,
      finalCommands,
    };
  }

  if (!overwrite) {
    // In skipPrompts mode, preserve all existing commands (no overwrite)
    if (options.skipPrompts) {
      for (const cmd of commandsToOverwrite) {
        smartMergeDecisions[cmd] = 'skip';
      }
      // Filter out skipped commands
      const filtered = finalCommands.filter((c) => !commandsToOverwrite.includes(c) || requiredCommands.includes(c));
      console.log(chalk.dim(`  Preserving ${commandsToOverwrite.length} existing command(s), installing ${filtered.length} new`));

      return {
        smartMergeDecisions,
        overwrite: false,
        finalCommands: filtered,
      };
    }

    // Interactive smart merge
    const result = await handleInteractiveSmartMerge(commandsToOverwrite, requiredCommands, cwd, smartMergeDecisions);
    overwrite = result.overwrite;

    // Apply skipped commands filter
    const skippedCommands = Object.entries(smartMergeDecisions)
      .filter(([, decision]) => decision === 'skip')
      .map(([cmd]) => cmd);

    if (skippedCommands.length > 0) {
      const filtered = finalCommands.filter((c) => !skippedCommands.includes(c) || requiredCommands.includes(c));
      return {
        smartMergeDecisions,
        overwrite,
        finalCommands: filtered,
      };
    }
  }

  return {
    smartMergeDecisions,
    overwrite,
    finalCommands,
  };
}

/**
 * Handle interactive smart merge prompts
 */
async function handleInteractiveSmartMerge(commandsToOverwrite, requiredCommands, cwd, smartMergeDecisions) {
  // Check for customized assets that have been used
  const assetsNeedingMerge = getAssetsNeedingMerge(cwd);
  const customizedCommands = commandsToOverwrite.filter(cmd =>
    assetsNeedingMerge.commands?.some(a => a.name === cmd)
  );

  let overwrite = false;

  // Show smart merge prompt for customized commands
  if (customizedCommands.length > 0) {
    const action = await promptCustomizedCommands(customizedCommands, assetsNeedingMerge, cwd, smartMergeDecisions);

    if (action === 'cancel') {
      throw new Error('Installation cancelled by user');
    }

    // Remove customized commands from the standard overwrite flow
    const nonCustomizedToOverwrite = commandsToOverwrite.filter(c => !customizedCommands.includes(c));

    if (nonCustomizedToOverwrite.length > 0) {
      console.log(chalk.yellow.bold('\n  ⚠ The following non-customized commands also exist:'));
      for (const cmd of nonCustomizedToOverwrite) {
        console.log(chalk.yellow(`    • /${cmd}`));
      }
    }
  }

  // Standard overwrite prompt for non-customized commands
  const remainingToOverwrite = commandsToOverwrite.filter(c => !smartMergeDecisions[c]);

  if (remainingToOverwrite.length > 0) {
    overwrite = await promptRemainingCommands(remainingToOverwrite, customizedCommands, smartMergeDecisions);
  } else if (Object.keys(smartMergeDecisions).length > 0) {
    // All commands handled by smart merge - show summary
    const skippedCommands = Object.entries(smartMergeDecisions)
      .filter(([, decision]) => decision === 'skip')
      .map(([cmd]) => cmd);

    if (skippedCommands.length > 0) {
      console.log(chalk.green(`\n  ✓ Will preserve ${skippedCommands.length} customized command(s)`));
    }
  }

  return { overwrite };
}

/**
 * Prompt for customized commands
 */
async function promptCustomizedCommands(customizedCommands, assetsNeedingMerge, cwd, smartMergeDecisions) {
  console.log(chalk.cyan.bold('\n  🔀 Smart Merge Available'));
  console.log(chalk.dim('  The following commands have been customized and used:\n'));

  for (const cmd of customizedCommands) {
    const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
    console.log(chalk.cyan(`    • /${cmd}`));
    console.log(chalk.dim(`      Used ${assetInfo.usageData.useCount} time(s), last: ${new Date(assetInfo.usageData.lastUsed).toLocaleDateString()}`));
    console.log(chalk.dim(`      Change: ${assetInfo.comparison.significance.level} significance - ${assetInfo.comparison.summary}`));
  }
  console.log('');

  const { smartMergeAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'smartMergeAction',
      message: 'How would you like to handle your customized commands?',
      choices: [
        { name: '🔍 Explore each one - Let Claude explain the changes', value: 'explore' },
        { name: '📋 Skip all customized - Keep your versions', value: 'skip-customized' },
        { name: '🔄 Replace all - Use new versions (lose customizations)', value: 'replace-all' },
        { name: '❌ Cancel installation', value: 'cancel' },
      ],
    },
  ]);

  if (smartMergeAction === 'cancel') {
    return 'cancel';
  }

  if (smartMergeAction === 'explore') {
    await exploreCustomizedCommands(customizedCommands, assetsNeedingMerge, cwd, smartMergeDecisions);
  } else if (smartMergeAction === 'skip-customized') {
    for (const cmd of customizedCommands) {
      smartMergeDecisions[cmd] = 'skip';
    }
    console.log(chalk.green(`\n  ✓ Will preserve ${customizedCommands.length} customized command(s)`));
  } else if (smartMergeAction === 'replace-all') {
    for (const cmd of customizedCommands) {
      smartMergeDecisions[cmd] = 'backup';
    }
    console.log(chalk.yellow(`\n  ⚠ Will backup and replace ${customizedCommands.length} customized command(s)`));
  }

  return smartMergeAction;
}

/**
 * Explore customized commands individually
 */
async function exploreCustomizedCommands(customizedCommands, assetsNeedingMerge, cwd, smartMergeDecisions) {
  console.log(chalk.cyan('\n  Exploring customized commands...\n'));

  for (const cmd of customizedCommands) {
    const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
    const local = getLocalAsset('commands', cmd, cwd);
    const template = getTemplateAsset('commands', cmd);

    // Show merge explanation
    console.log(chalk.bold(`\n  ┌${'─'.repeat(60)}┐`));
    console.log(chalk.bold(`  │ /${cmd.padEnd(58)} │`));
    console.log(chalk.bold(`  └${'─'.repeat(60)}┘`));

    const explanation = generateMergeExplanation(
      'commands',
      cmd,
      assetInfo.comparison,
      local?.content,
      template?.content
    );

    // Display condensed explanation
    console.log(chalk.dim('\n  ' + explanation.split('\n').slice(0, 15).join('\n  ')));

    const { decision } = await inquirer.prompt([
      {
        type: 'list',
        name: 'decision',
        message: `What would you like to do with /${cmd}?`,
        choices: [
          { name: 'Skip - Keep your customized version', value: 'skip' },
          { name: 'Backup & Replace - Save yours, use new version', value: 'backup' },
          { name: 'Replace - Use new version (no backup)', value: 'replace' },
          { name: 'Show full diff', value: 'diff' },
        ],
      },
    ]);

    if (decision === 'diff') {
      // Show full diff
      console.log(chalk.dim('\n--- Your Version ---'));
      console.log(local?.content?.slice(0, 500) + (local?.content?.length > 500 ? '\n...(truncated)' : ''));
      console.log(chalk.dim('\n--- Update Version ---'));
      console.log(template?.content?.slice(0, 500) + (template?.content?.length > 500 ? '\n...(truncated)' : ''));

      // Re-prompt after showing diff
      const { finalDecision } = await inquirer.prompt([
        {
          type: 'list',
          name: 'finalDecision',
          message: `Final decision for /${cmd}?`,
          choices: [
            { name: 'Skip - Keep your version', value: 'skip' },
            { name: 'Backup & Replace', value: 'backup' },
            { name: 'Replace without backup', value: 'replace' },
          ],
        },
      ]);
      smartMergeDecisions[cmd] = finalDecision;
    } else {
      smartMergeDecisions[cmd] = decision;
    }
  }
}

/**
 * Prompt for remaining non-customized commands
 */
async function promptRemainingCommands(remainingToOverwrite, customizedCommands, smartMergeDecisions) {
  if (!customizedCommands || customizedCommands.length === 0) {
    console.log(chalk.yellow.bold('  ⚠ The following commands already exist:'));
    for (const cmd of remainingToOverwrite) {
      console.log(chalk.yellow(`    • /${cmd}`));
    }
  }
  console.log('');

  const { overwriteChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'overwriteChoice',
      message: 'How would you like to handle these existing commands?',
      choices: [
        { name: 'Skip existing - only install new commands (recommended)', value: 'skip' },
        { name: 'Overwrite with backup - save existing to .claude/backups/ first', value: 'backup' },
        { name: 'Overwrite all - replace existing (no backup)', value: 'overwrite' },
        { name: 'Cancel installation', value: 'cancel' },
      ],
    },
  ]);

  if (overwriteChoice === 'cancel') {
    throw new Error('Installation cancelled by user');
  }

  const overwrite = overwriteChoice === 'overwrite' || overwriteChoice === 'backup';

  // Apply decision to remaining commands
  for (const cmd of remainingToOverwrite) {
    smartMergeDecisions[cmd] = overwriteChoice === 'skip' ? 'skip' : (overwriteChoice === 'backup' ? 'backup' : 'replace');
  }

  if (!overwrite) {
    const skippedCommands = Object.entries(smartMergeDecisions)
      .filter(([, decision]) => decision === 'skip')
      .map(([cmd]) => cmd);
    console.log(chalk.green(`\n  ✓ Will preserve ${skippedCommands.length} existing command(s)`));
  } else if (overwriteChoice === 'backup') {
    console.log(chalk.cyan(`\n  ✓ Will backup and overwrite ${remainingToOverwrite.length} existing command(s)`));
  } else {
    console.log(chalk.yellow(`\n  ⚠ Will overwrite ${remainingToOverwrite.length} existing command(s)`));
  }

  return overwrite;
}

/**
 * Create helper functions for backup and skip checks
 * @param {Object} smartMergeDecisions - Smart merge decisions map
 * @param {boolean} createBackups - Default backup flag
 * @returns {Object} Helper functions
 */
export function createMergeHelpers(smartMergeDecisions, createBackups) {
  const shouldBackupCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'backup';
    }
    return createBackups;
  };

  const shouldSkipCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'skip';
    }
    return false;
  };

  return { shouldBackupCommand, shouldSkipCommand };
}
