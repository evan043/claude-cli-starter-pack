/**
 * Claude Settings Configuration
 *
 * Unified entry point for all Claude CLI configuration.
 * This module maintains the original runClaudeSettings API while
 * delegating to specialized configuration modules.
 *
 * Modules:
 * - permission-config.js: Permission modes and allow/deny rules
 * - github-config.js: GitHub Project Board integration
 * - tech-stack-config.js: Tech stack detection and configuration
 * - agent-config.js: Agent-Only mode launchers
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../../cli/menu.js';

// Import from specialized modules
import {
  configurePermissionMode,
  configurePermissions,
  viewCurrentSettings,
  PERMISSION_MODES,
} from './permission-config.js';

import {
  configureGitHubSettings,
  loadGitHubSettings,
  saveGitHubSettings,
  DEFAULT_GITHUB_SETTINGS,
  generateGitHubSettingsUpdater,
} from './github-config.js';

import {
  configureTechStackSettings,
  loadTechStack,
  saveTechStack,
} from './tech-stack-config.js';

import {
  createAgentOnlyLauncher,
  generateAgentOnlyPolicy,
  generateAgentsJson,
  generateWindowsBatch,
  generatePowerShellLauncher,
  generateBashLauncher,
} from './agent-config.js';

/**
 * Run the Claude settings wizard
 *
 * This is the main entry point that maintains backwards compatibility
 * with the original claude-settings.js API.
 */
export async function runClaudeSettings(options) {
  showHeader('Claude CLI Settings');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to configure?',
      choices: [
        {
          name: `${chalk.green('1)')} Configure Permission Mode      Set default permission behavior`,
          value: 'permission-mode',
          short: 'Permission Mode',
        },
        {
          name: `${chalk.cyan('2)')} Create Agent-Only Launcher     Scripts for agent-only execution`,
          value: 'agent-only',
          short: 'Agent Only Launcher',
        },
        {
          name: `${chalk.yellow('3)')} Configure Permissions          Set allow/deny rules`,
          value: 'permissions',
          short: 'Permissions',
        },
        {
          name: `${chalk.blue('4)')} View Current Settings          Show .claude/settings.json`,
          value: 'view',
          short: 'View Settings',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.magenta('5)')} GitHub Settings                Configure project board, PRs, workflow`,
          value: 'github',
          short: 'GitHub Settings',
        },
        {
          name: `${chalk.red('6)')} Tech Stack Settings            Auto-detect and configure tech stack`,
          value: 'tech-stack',
          short: 'Tech Stack',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back / Exit`,
          value: 'exit',
          short: 'Exit',
        },
      ],
    },
  ]);

  if (action === 'exit') {
    return null;
  }

  // Create a callback to return to main menu
  const returnToMain = () => runClaudeSettings(options);

  switch (action) {
    case 'permission-mode':
      return await configurePermissionMode();
    case 'agent-only':
      return await createAgentOnlyLauncher();
    case 'permissions':
      return await configurePermissions();
    case 'view':
      return await viewCurrentSettings();
    case 'github':
      return await configureGitHubSettings(returnToMain);
    case 'tech-stack':
      return await configureTechStackSettings(returnToMain);
  }
}

// Re-export everything for backwards compatibility
export {
  // Permission config
  configurePermissionMode,
  configurePermissions,
  viewCurrentSettings,
  PERMISSION_MODES,

  // GitHub config
  configureGitHubSettings,
  loadGitHubSettings,
  saveGitHubSettings,
  DEFAULT_GITHUB_SETTINGS,
  generateGitHubSettingsUpdater,

  // Tech stack config
  configureTechStackSettings,
  loadTechStack,
  saveTechStack,

  // Agent config
  createAgentOnlyLauncher,
  generateAgentOnlyPolicy,
  generateAgentsJson,
  generateWindowsBatch,
  generatePowerShellLauncher,
  generateBashLauncher,
};

// Default export for backwards compatibility
export default runClaudeSettings;
