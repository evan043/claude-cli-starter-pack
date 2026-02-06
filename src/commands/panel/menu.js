/**
 * CCASP Panel Menu Module
 *
 * Menu display, command routing, and help system
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getQueueStatus,
  queueCommand,
  copyToClipboard,
  getQueueFilePath,
} from '../../panel/queue.js';
import { getVersion } from '../../utils.js';
import { isDevMode } from '../../utils/dev-mode-state.js';
import {
  getAutoUpdateSettings,
  getSkippedFiles,
} from '../../utils/version-check.js';

// Command definitions with their slash command equivalents
export const PANEL_COMMANDS = {
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
      { key: '5', label: 'Settings', command: 'panel:settings', desc: 'Panel settings' },
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
export function displayMenu(panelBanner) {
  console.clear();

  // Show dev mode indicator if active
  if (isDevMode()) {
    console.log(chalk.bgYellow.black.bold(' ⚠ DEVELOPMENT MODE '));
    console.log(chalk.yellow('  Running from local worktree'));
    console.log('');
  }

  console.log(panelBanner);
  console.log('');

  // Get queue status
  const status = getQueueStatus();
  const statusIndicator = status.pending > 0
    ? chalk.yellow(`[${status.pending} pending]`)
    : chalk.green('[Ready]');

  console.log(`  ${chalk.dim('Status:')} ${statusIndicator}`);
  console.log('');

  // Check for skipped files notification
  const settings = getAutoUpdateSettings();
  const skippedFiles = getSkippedFiles();
  if (settings.notificationMode === 'banner' && skippedFiles.length > 0) {
    console.log(chalk.yellow('  ╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.yellow('  ║') + ` ⚠️  Update: ${skippedFiles.length} file(s) skipped (customized)`.padEnd(57) + chalk.yellow('║'));
    console.log(chalk.yellow('  ║') + `    Press [5] Settings → View skipped files`.padEnd(57) + chalk.yellow('║'));
    console.log(chalk.yellow('  ╚════════════════════════════════════════════════════════════╝'));
    console.log('');
  }

  // Display each section
  for (const [key, section] of Object.entries(PANEL_COMMANDS)) {
    console.log(chalk.cyan(`  ${section.header}:`));
    console.log(chalk.cyan(`  ${'─'.repeat(40)}`));

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
export function findCommandByKey(key) {
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
export async function sendCommand(item) {
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
export async function showHelp() {
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
 * Format timestamp as relative time
 */
export function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
