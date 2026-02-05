/**
 * Command Selection
 * Handles slash command selection interface
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, readdirSync } from 'fs';

/**
 * Select slash commands to install
 * @param {Array} AVAILABLE_COMMANDS - All available commands
 * @param {string} commandsDir - Commands directory path
 * @param {Object} options - Command options
 * @param {Array} featureCommands - Commands from selected features
 * @returns {Promise<Object>} Selected commands and metadata
 */
export async function selectCommands(AVAILABLE_COMMANDS, commandsDir, options, featureCommands) {
  console.log(chalk.bold('Step 5: Select slash commands to install\n'));

  // Check for existing commands first
  const existingCmdFiles = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md')
    : [];
  const existingCmdNames = existingCmdFiles.map(f => f.replace('.md', ''));

  if (existingCmdNames.length > 0 && !options.skipPrompts) {
    console.log(chalk.blue(`  ℹ Found ${existingCmdNames.length} existing command(s) in your project:`));
    console.log(chalk.dim(`    ${existingCmdNames.map(c => '/' + c).join(', ')}`));
    console.log(chalk.dim('    These will be preserved unless you choose to overwrite.\n'));
  }

  let selectedCommands;

  if (options.skipPrompts) {
    // Use default selections when called non-interactively
    selectedCommands = AVAILABLE_COMMANDS.filter(c => c.selected).map(c => c.name);
    console.log(chalk.dim(`  Auto-selecting ${selectedCommands.length} default command(s)`));
  } else {
    // Interactive selection
    displayCommandCategories(AVAILABLE_COMMANDS, existingCmdNames);

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCommands',
        message: 'Select commands to install (existing commands marked with [exists]):',
        choices: AVAILABLE_COMMANDS.map((cmd) => {
          const isExisting = existingCmdNames.includes(cmd.name);
          return {
            name: `/${cmd.name}${isExisting ? ' [exists]' : ''} - ${cmd.description}`,
            value: cmd.name,
            checked: cmd.selected,
            disabled: cmd.required ? 'Required' : false,
          };
        }),
        pageSize: 15,
      },
    ]);
    selectedCommands = result.selectedCommands;
  }

  // Always include required commands AND feature-specific commands
  const requiredCommands = AVAILABLE_COMMANDS.filter(c => c.required).map(c => c.name);
  // Critical commands for upgrade system - always include these
  const criticalCommands = ['update-check', '__ccasp-sync-marker'];
  const finalCommands = [...new Set([...requiredCommands, ...criticalCommands, ...selectedCommands, ...featureCommands])];

  if (finalCommands.length === 0) {
    return null; // Signal to abort
  }

  // Show what feature commands were auto-added
  const autoAddedCommands = featureCommands.filter(c => !selectedCommands.includes(c) && !requiredCommands.includes(c));
  if (autoAddedCommands.length > 0) {
    console.log(chalk.cyan(`  ℹ Auto-including ${autoAddedCommands.length} feature command(s): ${autoAddedCommands.map(c => '/' + c).join(', ')}`));
  }

  console.log('');

  return {
    finalCommands,
    existingCmdNames,
    requiredCommands,
  };
}

/**
 * Display command categories
 */
function displayCommandCategories(AVAILABLE_COMMANDS, existingCmdNames) {
  const categories = [...new Set(AVAILABLE_COMMANDS.map((c) => c.category))];

  for (const category of categories) {
    console.log(chalk.cyan(`  ${category}:`));
    const cmds = AVAILABLE_COMMANDS.filter((c) => c.category === category);
    for (const cmd of cmds) {
      const isExisting = existingCmdNames.includes(cmd.name);
      const marker = cmd.selected ? chalk.green('●') : chalk.dim('○');
      const required = cmd.required ? chalk.yellow(' (required)') : '';
      const existing = isExisting ? chalk.blue(' [exists]') : '';
      console.log(`    ${marker} /${cmd.name}${required}${existing} - ${chalk.dim(cmd.description)}`);
    }
    console.log('');
  }
}
