/**
 * Model Mode Command
 *
 * Command to view and toggle model modes for the agent infrastructure.
 *
 * Usage:
 *   ccasp model-mode                    # Show current mode
 *   ccasp model-mode efficiency         # Switch to efficiency mode
 *   ccasp model-mode default            # Switch to default mode
 *   ccasp model-mode performance        # Switch to performance mode
 *   ccasp model-mode --list             # List all modes with details
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getModelMode,
  setModelMode,
  getAvailableModes,
  getConfigSummary,
} from '../utils/model-resolver.js';
import { showHeader } from '../cli/menu.js';

/**
 * Display current model mode configuration
 */
function displayCurrentMode() {
  const summary = getConfigSummary();

  console.log('');
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.cyan.bold('  Model Mode Configuration                              ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠══════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + `  Current Mode: ${chalk.green.bold(summary.currentMode.padEnd(38))}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                        ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  Level Mappings:                                       ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `    L1 (Orchestrator): ${chalk.yellow(summary.levelMappings.L1.padEnd(30))}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `    L2 (Specialist):   ${chalk.yellow(summary.levelMappings.L2.padEnd(30))}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `    L3 (Worker):       ${chalk.yellow(summary.levelMappings.L3.padEnd(30))}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                        ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim(`  Available: ${summary.availableModes.join(', ').padEnd(40)}`) + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Display all available modes with details
 */
function displayAllModes() {
  const modes = getAvailableModes();
  const currentMode = getModelMode();

  console.log('');
  console.log(chalk.cyan.bold('Available Model Modes'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log('');

  for (const [modeName, modeConfig] of Object.entries(modes)) {
    const isCurrent = modeName === currentMode;
    const marker = isCurrent ? chalk.green(' ✓ (current)') : '';

    console.log(chalk.yellow.bold(`${modeName}${marker}`));
    if (modeConfig.description) {
      console.log(chalk.dim(`  ${modeConfig.description}`));
    }
    console.log(`  L1: ${chalk.cyan(modeConfig.L1)}`);
    console.log(`  L2: ${chalk.cyan(modeConfig.L2)}`);
    console.log(`  L3: ${chalk.cyan(modeConfig.L3)}`);
    console.log('');
  }
}

/**
 * Interactive mode selection
 */
async function interactiveSelect() {
  const modes = getAvailableModes();
  const currentMode = getModelMode();

  const choices = Object.entries(modes).map(([name, config]) => ({
    name: `${name === currentMode ? chalk.green('*') : ' '} ${name.padEnd(15)} - ${config.description || 'No description'}`,
    value: name,
    short: name,
  }));

  choices.push(new inquirer.Separator());
  choices.push({
    name: chalk.dim('Cancel'),
    value: null,
    short: 'Cancel',
  });

  const { selectedMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedMode',
      message: 'Select model mode:',
      choices,
      default: currentMode,
    },
  ]);

  return selectedMode;
}

/**
 * Switch to a specific mode
 * @param {string} mode - Mode name
 * @returns {object} Result object
 */
function switchMode(mode) {
  const modes = getAvailableModes();

  if (!modes[mode]) {
    console.log(chalk.red.bold('\n✗ Invalid Mode'));
    console.log(chalk.red(`  Mode "${mode}" does not exist.`));
    console.log(chalk.dim(`  Available modes: ${Object.keys(modes).join(', ')}`));
    return { success: false, error: 'Invalid mode' };
  }

  const previousMode = getModelMode();

  if (previousMode === mode) {
    console.log(chalk.yellow(`\n⚠ Already in ${chalk.cyan(mode)} mode.`));
    return { success: true, mode, changed: false };
  }

  const success = setModelMode(mode);

  if (success) {
    const modeConfig = modes[mode];
    console.log(chalk.green.bold('\n✓ Mode Changed'));
    console.log(`  Switched from ${chalk.dim(previousMode)} to ${chalk.green.bold(mode)}`);
    console.log('');
    console.log(chalk.dim('  New level mappings:'));
    console.log(`    L1: ${modeConfig.L1}`);
    console.log(`    L2: ${modeConfig.L2}`);
    console.log(`    L3: ${modeConfig.L3}`);
    console.log('');
    return { success: true, mode, previousMode, changed: true };
  } else {
    console.log(chalk.red.bold('\n✗ Failed to Change Mode'));
    console.log(chalk.red('  Could not save configuration.'));
    return { success: false, error: 'Save failed' };
  }
}

/**
 * Main command runner
 * @param {string} [mode] - Mode to switch to (optional)
 * @param {object} options - Command options
 */
export async function runModelMode(mode, options = {}) {
  showHeader('Model Mode');

  // List all modes
  if (options.list) {
    displayAllModes();
    return { success: true };
  }

  // No mode specified - show current and optionally prompt
  if (!mode) {
    displayCurrentMode();

    if (options.interactive !== false) {
      const { wantToChange } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'wantToChange',
          message: 'Would you like to change the mode?',
          default: false,
        },
      ]);

      if (wantToChange) {
        const selectedMode = await interactiveSelect();
        if (selectedMode) {
          return switchMode(selectedMode);
        }
      }
    }

    return { success: true, mode: getModelMode() };
  }

  // Mode specified - switch to it
  return switchMode(mode);
}

/**
 * Quick mode toggle for panel integration
 * Cycles through: default -> efficiency -> performance -> default
 */
export function cycleMode() {
  const modeOrder = ['default', 'efficiency', 'performance'];
  const current = getModelMode();
  const currentIndex = modeOrder.indexOf(current);
  const nextIndex = (currentIndex + 1) % modeOrder.length;
  const nextMode = modeOrder[nextIndex];

  setModelMode(nextMode);
  return nextMode;
}

/**
 * Get mode for panel display
 */
export function getModeForPanel() {
  const summary = getConfigSummary();
  return {
    mode: summary.currentMode,
    mappings: summary.levelMappings,
  };
}

export default runModelMode;
