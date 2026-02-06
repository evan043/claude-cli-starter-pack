/**
 * CCASP Panel - Persistent Control Panel for Claude Code
 *
 * Runs in a separate terminal and sends commands to Claude Code CLI
 * via a queue file. Claude Code reads the queue via a hook.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - panel/menu.js - Menu display, command routing, help, shared helpers
 * - panel/settings.js - Settings management, skipped files handling
 * - panel/launchers.js - OS-specific terminal launching, inline (mobile) panel
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  clearQueue,
  ensureQueueDir,
} from '../panel/queue.js';
import { getVersion } from '../utils.js';
import { displayMenu, findCommandByKey, sendCommand, showHelp } from './panel/menu.js';
import { showSettings } from './panel/settings.js';
import { launchPanel, launchPanelInline } from './panel/launchers.js';

// Panel ASCII Banner
const PANEL_BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}${chalk.bold.white('          CCASP Control Panel')}${chalk.dim(`  v${  getVersion()}`)}${' '.repeat(20)}${chalk.cyan('║')}
${chalk.cyan('║')}${chalk.dim('      Commands are sent to Claude Code CLI')}${' '.repeat(19)}${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}`;

/**
 * Main panel loop
 */
export async function runPanel(options = {}) {
  ensureQueueDir();

  // Check if running inside Claude Code
  if (process.env.CLAUDE_CODE_SESSION) {
    console.log(chalk.yellow('\n  Warning: Panel should run in a SEPARATE terminal.'));
    console.log(chalk.dim('  This terminal is already inside Claude Code.\n'));

    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Continue anyway?',
      default: false
    }]);

    if (!proceed) {
      console.log(chalk.dim('\n  To use the panel:'));
      console.log(chalk.dim('  1. Open a new terminal window'));
      console.log(chalk.dim('  2. Run: ccasp panel\n'));
      return;
    }
  }

  // Main loop
  while (true) {
    displayMenu(PANEL_BANNER);

    const { action } = await inquirer.prompt([{
      type: 'input',
      name: 'action',
      message: 'Select option:',
    }]);

    const key = action.trim().toUpperCase();

    if (key === 'Q') {
      console.log(chalk.dim('\n  Goodbye!\n'));
      process.exit(0);
    }

    if (key === 'R') {
      continue; // Refresh - just redisplay
    }

    if (key === 'X') {
      clearQueue();
      console.log(chalk.green('\n  ✓ Queue cleared\n'));
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    if (key === '?') {
      await showHelp();
      continue;
    }

    // Find and execute command
    const item = findCommandByKey(key);
    if (item) {
      // Handle special panel commands
      if (item.command === 'panel:settings') {
        await showSettings();
      } else {
        await sendCommand(item);
      }
    } else if (key) {
      console.log(chalk.red(`\n  Unknown option: ${key}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Re-export launcher functions used by other modules
export { launchPanel, launchPanelInline } from './panel/launchers.js';
