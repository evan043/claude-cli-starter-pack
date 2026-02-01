/**
 * CCASP Panel - Persistent Control Panel for Claude Code
 *
 * Runs in a separate terminal and sends commands to Claude Code CLI
 * via a queue file. Claude Code reads the queue via a hook.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  queueCommand,
  copyToClipboard,
  getQueueStatus,
  clearQueue,
  getQueueFilePath,
  ensureQueueDir,
} from '../panel/queue.js';
import { getVersion } from '../utils.js';
import { isHappyMode } from '../utils/happy-detect.js';
import { isDevMode } from '../utils/dev-mode-state.js';

// Panel ASCII Banner
const PANEL_BANNER = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}${chalk.bold.white('          CCASP Control Panel')}${chalk.dim('  v' + getVersion())}${' '.repeat(20)}${chalk.cyan('║')}
${chalk.cyan('║')}${chalk.dim('      Commands are sent to Claude Code CLI')}${' '.repeat(19)}${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}`;

// Command definitions with their slash command equivalents
const PANEL_COMMANDS = {
  // Agents & Skills
  agents: {
    header: 'Agents & Skills',
    items: [
      { key: 'A', label: 'Create Agent', command: '/create-agent', desc: 'L1/L2/L3 agent builder' },
      { key: 'H', label: 'Create Hook', command: '/create-hook', desc: 'Enforcement hooks' },
      { key: 'S', label: 'Create Skill', command: '/create-skill', desc: 'RAG skill packages' },
      { key: 'M', label: 'Explore MCP', command: '/explore-mcp', desc: 'MCP server discovery' },
      { key: 'C', label: 'Claude Audit', command: '/claude-audit', desc: 'Best practices check' },
      { key: 'E', label: 'Explore Codebase', command: '/codebase-explorer', desc: 'Analyze structure' },
    ]
  },
  // Project Resources
  resources: {
    header: 'Project Resources',
    items: [
      { key: '1', label: 'View Agents', command: '/view-agents', desc: 'List configured agents' },
      { key: '2', label: 'View Skills', command: '/view-skills', desc: 'List available skills' },
      { key: '3', label: 'View Hooks', command: '/view-hooks', desc: 'List enforcement hooks' },
      { key: '4', label: 'View Commands', command: '/INDEX', desc: 'All slash commands' },
      { key: '5', label: 'Settings', command: '/ccasp-settings', desc: 'Configuration' },
      { key: '6', label: 'Documentation', command: '/README', desc: 'Help & guides' },
    ]
  },
  // Quick Actions
  quick: {
    header: 'Quick Actions',
    items: [
      { key: 'P', label: 'Phase Dev Plan', command: '/phase-dev-plan', desc: '95%+ success plans' },
      { key: 'G', label: 'GitHub Task', command: '/github-task', desc: 'Create GitHub issue' },
      { key: 'T', label: 'Run E2E Tests', command: '/e2e-test', desc: 'Playwright tests' },
      { key: 'U', label: 'Update Check', command: '/update-check', desc: 'Check for updates' },
    ]
  }
};

/**
 * Display the panel menu
 */
function displayMenu() {
  console.clear();

  // Show dev mode indicator if active
  if (isDevMode()) {
    console.log(chalk.bgYellow.black.bold(' ⚠ DEVELOPMENT MODE '));
    console.log(chalk.yellow('  Running from local worktree'));
    console.log('');
  }

  console.log(PANEL_BANNER);
  console.log('');

  // Get queue status
  const status = getQueueStatus();
  const statusIndicator = status.pending > 0
    ? chalk.yellow(`[${status.pending} pending]`)
    : chalk.green('[Ready]');

  console.log(`  ${chalk.dim('Status:')} ${statusIndicator}`);
  console.log('');

  // Display each section
  for (const [key, section] of Object.entries(PANEL_COMMANDS)) {
    console.log(chalk.cyan(`  ${section.header}:`));
    console.log(chalk.cyan('  ' + '─'.repeat(40)));

    // Display items in rows of 3
    const items = section.items;
    for (let i = 0; i < items.length; i += 3) {
      const row = items.slice(i, i + 3);
      const formatted = row.map(item =>
        `  ${chalk.yellow(`[${item.key}]`)} ${item.label.padEnd(14)}`
      ).join('');
      console.log(formatted);
    }
    console.log('');
  }

  // Bottom controls
  console.log(chalk.dim('  ─────────────────────────────────────────────────────────────'));
  console.log(`  ${chalk.yellow('[Q]')} Quit    ${chalk.yellow('[R]')} Refresh    ${chalk.yellow('[X]')} Clear Queue    ${chalk.yellow('[?]')} Help`);
  console.log('');
}

/**
 * Find command by key
 */
function findCommandByKey(key) {
  const upperKey = key.toUpperCase();
  for (const section of Object.values(PANEL_COMMANDS)) {
    const found = section.items.find(item => item.key.toUpperCase() === upperKey);
    if (found) return found;
  }
  return null;
}

/**
 * Send command to Claude Code
 */
async function sendCommand(item) {
  console.log('');
  console.log(chalk.cyan(`  Sending: ${item.command}`));

  // Queue the command
  const entry = queueCommand(item.command, '', {
    label: item.label,
    source: 'panel'
  });

  // Also copy to clipboard as fallback
  const copied = copyToClipboard(item.command);

  console.log('');
  console.log(chalk.green('  ✓ Command queued'));
  if (copied) {
    console.log(chalk.dim('  ✓ Also copied to clipboard'));
  }
  console.log('');
  console.log(chalk.white.bold('  → In Claude Code, press Enter to execute'));
  console.log(chalk.dim('    (or paste with Ctrl+V if hook not installed)'));
  console.log('');

  // Wait for user acknowledgment
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
  }]);
}

/**
 * Show help
 */
async function showHelp() {
  console.clear();
  console.log(chalk.cyan.bold('\n  CCASP Panel Help\n'));
  console.log(chalk.white('  How it works:'));
  console.log(chalk.dim('  1. Select a command from the menu'));
  console.log(chalk.dim('  2. Command is queued for Claude Code'));
  console.log(chalk.dim('  3. In Claude Code, press Enter to execute'));
  console.log('');
  console.log(chalk.white('  Queue File:'));
  console.log(chalk.dim(`  ${getQueueFilePath()}`));
  console.log('');
  console.log(chalk.white('  Claude Code Hook:'));
  console.log(chalk.dim('  Install with: ccasp install-panel-hook'));
  console.log('');

  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to return to menu...',
  }]);
}

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
    displayMenu();

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
      await sendCommand(item);
    } else if (key) {
      console.log(chalk.red(`\n  Unknown option: ${key}\n`));
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

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

  const ccaspPath = join(process.cwd(), 'node_modules', '.bin', 'ccasp');
  const globalPath = 'ccasp'; // Assume globally installed

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
        name: `${chalk.yellow(item.key + ')')} ${item.label}`,
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
