/**
 * Panel Launchers Module
 *
 * OS-specific terminal launching and inline (mobile) panel mode.
 *
 * Provides:
 * - launchPanel: Open panel in a new OS-specific terminal window
 * - launchPanelInline: Mobile-friendly inline panel for Happy CLI
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { copyToClipboard } from '../../panel/queue.js';
import { isHappyMode } from '../../utils/happy-detect.js';

/**
 * Launch panel in a new terminal window
 * Automatically detects Happy CLI and falls back to inline mode
 */
export async function launchPanel() {
  // If Happy mode detected, use inline panel instead of new window
  if (isHappyMode()) {
    console.log(chalk.cyan('\n  Happy CLI detected - using inline panel\n'));
    return launchPanelInline();
  }

  console.log(chalk.cyan('\n  Launching CCASP Panel in new window...\n'));

  try {
    if (process.platform === 'win32') {
      // Windows - use start command with PowerShell
      spawn('cmd.exe', ['/c', 'start', 'powershell', '-NoExit', '-Command', 'ccasp panel'], {
        detached: true,
        stdio: 'ignore'
      });
    } else if (process.platform === 'darwin') {
      // macOS - use osascript
      spawn('osascript', [
        '-e', `tell application "Terminal" to do script "ccasp panel"`
      ], {
        detached: true,
        stdio: 'ignore'
      });
    } else {
      // Linux - try various terminal emulators
      const terminals = ['gnome-terminal', 'konsole', 'xterm', 'xfce4-terminal'];
      for (const term of terminals) {
        try {
          if (term === 'gnome-terminal') {
            spawn(term, ['--', 'ccasp', 'panel'], { detached: true, stdio: 'ignore' });
          } else {
            spawn(term, ['-e', 'ccasp panel'], { detached: true, stdio: 'ignore' });
          }
          break;
        } catch {
          continue;
        }
      }
    }

    console.log(chalk.green('  ✓ Panel window opened'));
    console.log(chalk.dim('  You can now use this terminal for Claude Code\n'));
  } catch (error) {
    console.log(chalk.red('  Failed to open new terminal'));
    console.log(chalk.dim(`  Run manually: ${chalk.white('ccasp panel')}\n`));
  }
}

/**
 * Launch panel inline (mobile-friendly, no new window)
 * Used when Happy CLI is detected or explicitly requested
 */
export async function launchPanelInline() {
  const MOBILE_PANEL_BANNER = `
${chalk.cyan('╔══════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.bold('Panel')} ${chalk.dim('(inline)')}${' '.repeat(17)}${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════╝')}`;

  console.clear();
  console.log(MOBILE_PANEL_BANNER);
  console.log('');

  // Simplified single-column panel for mobile
  const sections = [
    { header: 'Agents', items: [
      { key: 'A', label: 'Create Agent', cmd: '/create-agent' },
      { key: 'H', label: 'Create Hook', cmd: '/create-hook' },
      { key: 'S', label: 'Create Skill', cmd: '/create-skill' },
      { key: 'M', label: 'Explore MCP', cmd: '/explore-mcp' },
    ]},
    { header: 'Actions', items: [
      { key: 'P', label: 'Phase Dev', cmd: '/phase-dev-plan' },
      { key: 'G', label: 'GitHub Task', cmd: '/github-task' },
      { key: 'T', label: 'E2E Tests', cmd: '/e2e-test' },
    ]},
  ];

  // Build choices
  const choices = [];
  for (const section of sections) {
    choices.push(new inquirer.Separator(chalk.cyan(` ${section.header}`)));
    for (const item of section.items) {
      choices.push({
        name: `${chalk.yellow(`${item.key})`)} ${item.label}`,
        value: item.cmd,
      });
    }
  }
  choices.push(new inquirer.Separator(chalk.dim('─'.repeat(34))));
  choices.push({ name: `${chalk.yellow('B)')} Back`, value: 'back' });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select:',
    choices,
    pageSize: 12,
  }]);

  if (action === 'back') {
    return;
  }

  // Show command and copy to clipboard
  console.log('');
  console.log(chalk.cyan(`Command: ${action}`));

  const copied = copyToClipboard(action);
  if (copied) {
    console.log(chalk.green('✓ Copied to clipboard'));
  }
  console.log(chalk.dim('Paste in Claude Code'));
  console.log('');

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Enter to continue...',
  }]);

  // Loop back to panel
  return launchPanelInline();
}
