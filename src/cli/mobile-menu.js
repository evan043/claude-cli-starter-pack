/**
 * Mobile-Optimized Menu System for Happy CLI
 *
 * Renders menus optimized for mobile screens (max 40 chars).
 * Single-column layout, no overflow, minimal decorations.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { getVersion, loadTechStack, hasValidConfig } from '../utils.js';
import { isHappyMode, getMobileWidth } from '../utils/happy-detect.js';
import { isDevMode } from '../utils/dev-mode-state.js';

// Mobile-friendly banner (40 chars max)
const MOBILE_BANNER = `
${chalk.cyan('╔══════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.bold('CCASP')} ${chalk.dim('v' + getVersion().slice(0, 5))}${' '.repeat(17)}${chalk.cyan('║')}
${chalk.cyan('║')} ${chalk.dim('Mobile Menu')}${' '.repeat(21)}${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════╝')}`;

// Compact panel banner for mobile
const MOBILE_PANEL_BANNER = `
${chalk.cyan('╔══════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.bold('CCASP Panel')}${' '.repeat(20)}${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════╝')}`;

/**
 * Truncate text to fit mobile width
 * @param {string} text - Text to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLen = 30) {
  if (!text) return '';
  // Strip ANSI codes for length calculation
  // eslint-disable-next-line no-control-regex
  const plainText = text.replace(/\x1B\[[0-9;]*m/g, '');
  if (plainText.length <= maxLen) return text;
  return text.slice(0, maxLen - 2) + '..';
}

/**
 * Format a menu item for mobile (single line)
 * @param {string} key - Shortcut key
 * @param {string} label - Item label
 * @returns {string} Formatted menu item
 */
function formatMobileItem(key, label) {
  const truncLabel = truncate(label, 28);
  return `${chalk.yellow(key + ')')} ${truncLabel}`;
}

/**
 * Show mobile-optimized main menu
 */
export async function showMobileMenu() {
  console.clear();

  // Show dev mode indicator (compact for mobile)
  if (isDevMode()) {
    console.log(chalk.bgYellow.black(' ⚠ DEV MODE '));
    console.log(chalk.yellow(' Local worktree active'));
    console.log('');
  }

  console.log(MOBILE_BANNER);

  const configured = hasValidConfig();

  // Status line
  if (configured) {
    console.log(chalk.green(' ✓ Configured'));
  } else {
    console.log(chalk.yellow(' ⚠ Not configured'));
  }
  console.log('');

  // Single-column menu items
  const choices = [
    { name: formatMobileItem('1', 'Create Task'), value: 'create' },
    { name: formatMobileItem('2', 'Decompose Issue'), value: 'decompose' },
    { name: formatMobileItem('3', 'Sync Tasks'), value: 'sync' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    { name: formatMobileItem('4', 'Setup'), value: 'setup' },
    { name: formatMobileItem('5', 'List Tasks'), value: 'list' },
    { name: formatMobileItem('6', 'Install Command'), value: 'install' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    { name: formatMobileItem('P', 'Panel (inline)'), value: 'panel-inline' },
    { name: formatMobileItem('T', 'Test Setup'), value: 'test-setup' },
    { name: formatMobileItem('A', 'Agent Creator'), value: 'agent-creator' },
    { name: formatMobileItem('M', 'MCP Explorer'), value: 'explore-mcp' },
    { name: `${chalk.green('⚡')} ${chalk.bold('Agent-Only + Bypass')}`, value: 'launch-agent-only' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    { name: formatMobileItem('S', 'Settings'), value: 'project-settings' },
    { name: formatMobileItem('?', 'Help'), value: 'help' },
    { name: formatMobileItem('Q', 'Exit'), value: 'exit' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select:',
      choices,
      pageSize: 12,
    },
  ]);

  return action;
}

/**
 * Show mobile-optimized panel menu (inline, no new window)
 */
export async function showMobilePanel() {
  console.clear();
  console.log(MOBILE_PANEL_BANNER);
  console.log('');

  // Single-column panel items
  const choices = [
    new inquirer.Separator(chalk.cyan(' Agents & Skills')),
    { name: formatMobileItem('A', 'Create Agent'), value: '/create-agent' },
    { name: formatMobileItem('H', 'Create Hook'), value: '/create-hook' },
    { name: formatMobileItem('S', 'Create Skill'), value: '/create-skill' },
    { name: formatMobileItem('M', 'Explore MCP'), value: '/explore-mcp' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    new inquirer.Separator(chalk.cyan(' Resources')),
    { name: formatMobileItem('1', 'View Agents'), value: '/view-agents' },
    { name: formatMobileItem('2', 'View Skills'), value: '/view-skills' },
    { name: formatMobileItem('3', 'View Hooks'), value: '/view-hooks' },
    { name: formatMobileItem('4', 'All Commands'), value: '/INDEX' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    new inquirer.Separator(chalk.cyan(' Quick Actions')),
    { name: formatMobileItem('P', 'Phase Dev Plan'), value: '/phase-dev-plan' },
    { name: formatMobileItem('G', 'GitHub Task'), value: '/github-task' },
    { name: formatMobileItem('T', 'Run E2E Tests'), value: '/e2e-test' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    { name: formatMobileItem('B', 'Back'), value: 'back' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select:',
      choices,
      pageSize: 15,
    },
  ]);

  return action;
}

/**
 * Show mobile-optimized project settings
 */
export async function showMobileSettings() {
  console.clear();
  console.log(chalk.cyan('╔══════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold(' Settings') + ' '.repeat(23) + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════╝'));
  console.log('');

  const choices = [
    { name: formatMobileItem('1', 'GitHub Board'), value: 'github' },
    { name: formatMobileItem('2', 'Deployment'), value: 'deployment' },
    { name: formatMobileItem('3', 'Tunnel'), value: 'tunnel' },
    { name: formatMobileItem('4', 'Token Budget'), value: 'token' },
    { name: formatMobileItem('5', 'Happy Mode'), value: 'happy' },
    new inquirer.Separator(chalk.dim('─'.repeat(34))),
    { name: formatMobileItem('B', 'Back'), value: 'back' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select:',
      choices,
      pageSize: 10,
    },
  ]);

  return action;
}

/**
 * Show a mobile-friendly success message
 * @param {string} message - Success message
 */
export function showMobileSuccess(message) {
  console.log('');
  console.log(chalk.green(`✓ ${truncate(message, 32)}`));
  console.log('');
}

/**
 * Show a mobile-friendly error message
 * @param {string} message - Error message
 */
export function showMobileError(message) {
  console.log('');
  console.log(chalk.red(`✗ ${truncate(message, 32)}`));
  console.log('');
}

/**
 * Show a mobile-friendly info box
 * @param {string} title - Box title
 * @param {string[]} lines - Content lines
 */
export function showMobileBox(title, lines = []) {
  const width = getMobileWidth() - 4; // Account for borders
  console.log('');
  console.log(chalk.cyan('┌' + '─'.repeat(width) + '┐'));
  console.log(chalk.cyan('│') + ` ${truncate(title, width - 2)}`.padEnd(width) + chalk.cyan('│'));
  console.log(chalk.cyan('├' + '─'.repeat(width) + '┤'));
  for (const line of lines) {
    console.log(chalk.cyan('│') + ` ${truncate(line, width - 2)}`.padEnd(width) + chalk.cyan('│'));
  }
  console.log(chalk.cyan('└' + '─'.repeat(width) + '┘'));
  console.log('');
}

/**
 * Prompt to return to menu (mobile version)
 * @returns {Promise<boolean>} True if user wants to return
 */
export async function mobileReturnPrompt() {
  console.log('');
  const { back } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'back',
      message: 'Back to menu?',
      default: true,
    },
  ]);
  return back;
}
