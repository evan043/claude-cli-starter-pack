/**
 * Permission Configuration
 *
 * Configure Claude CLI permission modes and allow/deny rules.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showWarning } from '../../cli/menu.js';

/**
 * Permission modes for Claude CLI
 */
export const PERMISSION_MODES = {
  bypassPermissions: {
    name: 'Bypass All Permissions',
    description: 'Auto-approve all tool calls without prompting',
    recommended: false,
    warning: 'Use only in trusted environments',
  },
  acceptEdits: {
    name: 'Accept Edits',
    description: 'Auto-approve Read/Glob/Grep, prompt for Edit/Write/Bash',
    recommended: true,
  },
  ask: {
    name: 'Ask for Each',
    description: 'Prompt for every tool call (most secure)',
    recommended: false,
  },
};

/**
 * Configure the default permission mode
 */
export async function configurePermissionMode() {
  showHeader('Permission Mode');

  console.log(chalk.dim('Permission modes control how Claude CLI handles tool approvals.\n'));

  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select default permission mode:',
      choices: Object.entries(PERMISSION_MODES).map(([key, mode]) => ({
        name: `${mode.name}${mode.recommended ? chalk.green(' (Recommended)') : ''}${mode.warning ? chalk.red(' ⚠') : ''}\n   ${chalk.dim(mode.description)}`,
        value: key,
        short: mode.name,
      })),
      default: 'acceptEdits',
    },
  ]);

  // Warn for bypass mode
  if (mode === 'bypassPermissions') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('Warning: Bypass mode auto-approves ALL operations. Continue?'),
        default: false,
      },
    ]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return null;
    }
  }

  // Load or create settings
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      settings = {};
    }
  }

  // Update permission mode
  if (!settings.permissions) {
    settings.permissions = {};
  }
  settings.permissions.defaultMode = mode;

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  showSuccess('Permission Mode Updated', [
    `Mode: ${PERMISSION_MODES[mode].name}`,
    `File: ${settingsPath}`,
  ]);

  return { mode, path: settingsPath };
}

/**
 * Configure permission allow/deny rules
 */
export async function configurePermissions() {
  showHeader('Permission Rules');

  console.log(chalk.dim('Configure which tools and patterns are allowed or denied.\n'));

  // Load existing settings
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = { permissions: { allow: [], deny: [] } };

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (!settings.permissions) {
        settings.permissions = { allow: [], deny: [] };
      }
    } catch {
      // Use defaults
    }
  }

  // Show current rules
  console.log(chalk.cyan('Current Allow Rules:'));
  if (settings.permissions.allow?.length > 0) {
    settings.permissions.allow.forEach((rule) => console.log(chalk.green(`  + ${rule}`)));
  } else {
    console.log(chalk.dim('  (none)'));
  }

  console.log('');
  console.log(chalk.cyan('Current Deny Rules:'));
  if (settings.permissions.deny?.length > 0) {
    settings.permissions.deny.forEach((rule) => console.log(chalk.red(`  - ${rule}`)));
  } else {
    console.log(chalk.dim('  (none)'));
  }
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Add allow rule', value: 'add-allow' },
        { name: 'Add deny rule', value: 'add-deny' },
        { name: 'Use preset (recommended)', value: 'preset' },
        { name: 'Clear all rules', value: 'clear' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') {
    return null;
  }

  if (action === 'preset') {
    const { preset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'Select preset:',
        choices: [
          { name: 'Permissive - Allow most, deny dangerous', value: 'permissive' },
          { name: 'Balanced - Allow common, deny sensitive', value: 'balanced' },
          { name: 'Strict - Minimal allows, many denies', value: 'strict' },
        ],
      },
    ]);

    const presets = {
      permissive: {
        allow: ['Read(*)', 'Write(src/**)', 'Bash(git:*)', 'MCP(*)'],
        deny: ['Read(.env*)', 'Write(secrets/**)', 'Bash(rm -rf:*)'],
      },
      balanced: {
        allow: ['Read(*)', 'Write(src/**)', 'Bash(git:*)', 'Bash(npm:*)'],
        deny: ['Read(.env*)', 'Write(secrets/**)', 'Bash(rm:*)', 'Bash(sudo:*)'],
      },
      strict: {
        allow: ['Read(src/**)', 'Bash(git status)', 'Bash(git log:*)'],
        deny: ['Read(.env*)', 'Write(*)', 'Bash(rm:*)', 'Bash(sudo:*)', 'WebFetch(*)'],
      },
    };

    settings.permissions.allow = presets[preset].allow;
    settings.permissions.deny = presets[preset].deny;
  } else if (action === 'add-allow' || action === 'add-deny') {
    const { rule } = await inquirer.prompt([
      {
        type: 'input',
        name: 'rule',
        message: `Enter ${action === 'add-allow' ? 'allow' : 'deny'} rule (e.g., "Read(*)", "Bash(git:*)"):`,
        validate: (input) => input.length > 0 || 'Rule cannot be empty',
      },
    ]);

    if (action === 'add-allow') {
      if (!settings.permissions.allow) settings.permissions.allow = [];
      settings.permissions.allow.push(rule);
    } else {
      if (!settings.permissions.deny) settings.permissions.deny = [];
      settings.permissions.deny.push(rule);
    }
  } else if (action === 'clear') {
    settings.permissions.allow = [];
    settings.permissions.deny = [];
  }

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  showSuccess('Permissions Updated', [`File: ${settingsPath}`]);

  return { settings, path: settingsPath };
}

/**
 * View current settings
 */
export async function viewCurrentSettings() {
  showHeader('Current Settings');

  const settingsPath = join(process.cwd(), '.claude', 'settings.json');

  if (!existsSync(settingsPath)) {
    showWarning('No .claude/settings.json found.');
    console.log(chalk.dim('Run "gtask claude-settings" to create one.'));
    return null;
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    console.log(chalk.cyan('File: ') + settingsPath);
    console.log('');
    console.log(JSON.stringify(settings, null, 2));
    return settings;
  } catch (err) {
    const { showError } = await import('../../cli/menu.js');
    showError('Failed to read settings', err.message);
    return null;
  }
}
