/**
 * Integration Configuration Prompts
 *
 * Interactive prompts for configuring specific PM tool integrations.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getIntegrationInfo } from '../integrations/index.js';

/**
 * Configure a specific integration
 */
export async function configureSpecificIntegration(config, integrationId, cwd) {
  const info = getIntegrationInfo(integrationId);
  if (!info) return;

  console.log('');
  console.log(chalk.bold(`Configure ${info.name}`));
  console.log(chalk.dim(info.description));
  console.log('');

  // Initialize config for this integration if not exists
  if (!config[integrationId]) {
    config[integrationId] = { enabled: true };
  }

  switch (integrationId) {
    case 'github':
      await configureGitHub(config.github, cwd);
      break;
    case 'jira':
      await configureJira(config.jira, cwd);
      break;
    case 'linear':
      await configureLinear(config.linear, cwd);
      break;
    case 'clickup':
      await configureClickUp(config.clickup, cwd);
      break;
  }
}

/**
 * Configure GitHub integration
 */
export async function configureGitHub(gitHubConfig, cwd) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'owner',
      message: 'GitHub owner (username or org):',
      default: gitHubConfig.owner || '',
    },
    {
      type: 'input',
      name: 'repo',
      message: 'Repository name:',
      default: gitHubConfig.repo || '',
    },
    {
      type: 'number',
      name: 'project_number',
      message: 'GitHub Project number (from URL, optional):',
      default: gitHubConfig.project_number || null,
    },
    {
      type: 'list',
      name: 'sync_direction',
      message: 'Sync direction:',
      choices: [
        { name: 'Outbound only (local → GitHub)', value: 'outbound' },
        { name: 'Bidirectional (sync both ways)', value: 'bidirectional' },
      ],
      default: gitHubConfig.sync_direction || 'outbound',
    },
  ]);

  Object.assign(gitHubConfig, answers, { enabled: true });
}

/**
 * Configure Jira integration
 */
export async function configureJira(jiraConfig, cwd) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'base_url',
      message: 'Jira base URL (e.g., https://company.atlassian.net):',
      default: jiraConfig.base_url || '',
    },
    {
      type: 'input',
      name: 'project_key',
      message: 'Jira project key (e.g., PROJ):',
      default: jiraConfig.project_key || '',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Jira account email:',
      default: jiraConfig.email || '',
    },
    {
      type: 'password',
      name: 'api_token',
      message: 'Jira API token:',
      mask: '*',
    },
    {
      type: 'list',
      name: 'sync_direction',
      message: 'Sync direction:',
      choices: [
        { name: 'Outbound only (local → Jira)', value: 'outbound' },
        { name: 'Bidirectional (sync both ways)', value: 'bidirectional' },
      ],
      default: jiraConfig.sync_direction || 'outbound',
    },
  ]);

  Object.assign(jiraConfig, answers, { enabled: true });
}

/**
 * Configure Linear integration
 */
export async function configureLinear(linearConfig, cwd) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'team_key',
      message: 'Linear team key (e.g., PROJ):',
      default: linearConfig.team_key || '',
    },
    {
      type: 'password',
      name: 'api_key',
      message: 'Linear API key:',
      mask: '*',
    },
    {
      type: 'list',
      name: 'sync_direction',
      message: 'Sync direction:',
      choices: [
        { name: 'Outbound only (local → Linear)', value: 'outbound' },
        { name: 'Bidirectional (sync both ways)', value: 'bidirectional' },
      ],
      default: linearConfig.sync_direction || 'outbound',
    },
  ]);

  Object.assign(linearConfig, answers, { enabled: true });
}

/**
 * Configure ClickUp integration
 */
export async function configureClickUp(clickUpConfig, cwd) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'workspace_id',
      message: 'ClickUp workspace ID:',
      default: clickUpConfig.workspace_id || '',
    },
    {
      type: 'input',
      name: 'space_id',
      message: 'ClickUp space ID:',
      default: clickUpConfig.space_id || '',
    },
    {
      type: 'input',
      name: 'default_list_id',
      message: 'Default list ID (optional):',
      default: clickUpConfig.default_list_id || '',
    },
    {
      type: 'password',
      name: 'api_key',
      message: 'ClickUp API key:',
      mask: '*',
    },
    {
      type: 'list',
      name: 'sync_direction',
      message: 'Sync direction:',
      choices: [
        { name: 'Outbound only (local → ClickUp)', value: 'outbound' },
        { name: 'Bidirectional (sync both ways)', value: 'bidirectional' },
      ],
      default: clickUpConfig.sync_direction || 'outbound',
    },
  ]);

  Object.assign(clickUpConfig, answers, { enabled: true });
}
