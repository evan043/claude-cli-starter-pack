/**
 * Integration Configuration Wizard
 *
 * Interactive setup for PM tool integrations (Jira, Linear, ClickUp).
 * Called from the main CCASP wizard during GitHub configuration phase.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  createEmptyIntegrationConfig,
  SUPPORTED_INTEGRATIONS,
  getIntegrationInfo,
  validateIntegrationConfig,
  createAdapterRegistry,
} from './integrations/index.js';

const CONFIG_PATH = '.claude/integrations/config.json';

/**
 * Load existing integration config
 */
function loadConfig(cwd = process.cwd()) {
  const configPath = join(cwd, CONFIG_PATH);

  if (!existsSync(configPath)) {
    return createEmptyIntegrationConfig();
  }

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return createEmptyIntegrationConfig();
  }
}

/**
 * Save integration config
 */
function saveConfig(config, cwd = process.cwd()) {
  const configPath = join(cwd, CONFIG_PATH);
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  config.last_modified = new Date().toISOString();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Main integration wizard entry point
 * @param {Object} options - Options
 * @param {boolean} options.mobile - Use mobile-friendly UI
 * @param {string} options.cwd - Working directory
 */
export async function runIntegrationWizard(options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = loadConfig(cwd);

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('          PROJECT MANAGEMENT INTEGRATIONS                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + '                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  Configure additional PM tools beyond GitHub:                 ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  Jira, Linear, ClickUp                                        ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Show current status
  const enabledIntegrations = config.enabled || ['github'];
  console.log(chalk.dim('Currently enabled:'), enabledIntegrations.join(', '));
  console.log('');

  // Main menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to configure?',
      choices: [
        { name: `${chalk.green('1.')} Add integration`, value: 'add' },
        { name: `${chalk.yellow('2.')} Configure existing`, value: 'configure' },
        { name: `${chalk.red('3.')} Remove integration`, value: 'remove' },
        { name: `${chalk.cyan('4.')} Test connections`, value: 'test' },
        { name: `${chalk.dim('0.')} Done / Back`, value: 'done' },
      ],
    },
  ]);

  switch (action) {
    case 'add':
      await addIntegration(config, cwd);
      break;
    case 'configure':
      await configureIntegration(config, cwd);
      break;
    case 'remove':
      await removeIntegration(config, cwd);
      break;
    case 'test':
      await testIntegrations(config, cwd);
      break;
    case 'done':
      return;
  }

  // Loop back to menu
  await runIntegrationWizard({ ...options, cwd });
}

/**
 * Add a new integration
 */
async function addIntegration(config, cwd) {
  const available = SUPPORTED_INTEGRATIONS.filter(
    i => !config.enabled?.includes(i.id)
  );

  if (available.length === 0) {
    console.log(chalk.yellow('\n  All integrations are already enabled.\n'));
    return;
  }

  const choices = available.map((i, idx) => ({
    name: `${chalk.green(`${idx + 1}.`)} ${i.name} - ${chalk.dim(i.description)}`,
    value: i.id,
    short: i.name,
  }));

  choices.push({
    name: `${chalk.dim('0.')} Cancel`,
    value: null,
  });

  const { integrationId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'integrationId',
      message: 'Select integration to add:',
      choices,
    },
  ]);

  if (!integrationId) return;

  // Configure the selected integration
  await configureSpecificIntegration(config, integrationId, cwd);

  // Add to enabled list
  if (!config.enabled) config.enabled = ['github'];
  if (!config.enabled.includes(integrationId)) {
    config.enabled.push(integrationId);
  }

  saveConfig(config, cwd);
  console.log(chalk.green(`\n  ✓ ${integrationId} added and enabled.\n`));
}

/**
 * Configure an existing integration
 */
async function configureIntegration(config, cwd) {
  const enabled = config.enabled || ['github'];

  const choices = enabled.map((id, idx) => {
    const info = getIntegrationInfo(id);
    return {
      name: `${chalk.cyan(`${idx + 1}.`)} ${info?.name || id}`,
      value: id,
    };
  });

  choices.push({
    name: `${chalk.dim('0.')} Cancel`,
    value: null,
  });

  const { integrationId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'integrationId',
      message: 'Select integration to configure:',
      choices,
    },
  ]);

  if (!integrationId) return;

  await configureSpecificIntegration(config, integrationId, cwd);
  saveConfig(config, cwd);
  console.log(chalk.green(`\n  ✓ ${integrationId} configuration updated.\n`));
}

/**
 * Configure a specific integration
 */
async function configureSpecificIntegration(config, integrationId, cwd) {
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
async function configureGitHub(gitHubConfig, cwd) {
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
async function configureJira(jiraConfig, cwd) {
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
async function configureLinear(linearConfig, cwd) {
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
async function configureClickUp(clickUpConfig, cwd) {
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

/**
 * Remove an integration
 */
async function removeIntegration(config, cwd) {
  const removable = (config.enabled || []).filter(id => id !== 'github');

  if (removable.length === 0) {
    console.log(chalk.yellow('\n  No removable integrations. GitHub cannot be removed.\n'));
    return;
  }

  const choices = removable.map((id, idx) => {
    const info = getIntegrationInfo(id);
    return {
      name: `${chalk.red(`${idx + 1}.`)} ${info?.name || id}`,
      value: id,
    };
  });

  choices.push({
    name: `${chalk.dim('0.')} Cancel`,
    value: null,
  });

  const { integrationId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'integrationId',
      message: 'Select integration to remove:',
      choices,
    },
  ]);

  if (!integrationId) return;

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove ${integrationId}? Configuration will be preserved.`,
      default: false,
    },
  ]);

  if (!confirm) return;

  // Remove from enabled list
  config.enabled = config.enabled.filter(id => id !== integrationId);

  // Disable but don't delete config
  if (config[integrationId]) {
    config[integrationId].enabled = false;
  }

  saveConfig(config, cwd);
  console.log(chalk.green(`\n  ✓ ${integrationId} disabled.\n`));
}

/**
 * Test all enabled integrations
 */
async function testIntegrations(config, cwd) {
  console.log('');
  const spinner = ora('Testing connections...').start();

  try {
    const registry = createAdapterRegistry(config);
    const results = await registry.testAll();

    spinner.stop();
    console.log('');

    for (const [name, result] of Object.entries(results)) {
      if (result.success) {
        console.log(chalk.green(`  ✓ ${name}: ${result.message}`));
      } else {
        console.log(chalk.red(`  ✗ ${name}: ${result.message}`));
      }
    }

    console.log('');
  } catch (e) {
    spinner.fail(`Test failed: ${e.message}`);
  }
}

/**
 * Quick integration check (for wizard flow)
 * Asks if user wants to configure additional integrations
 */
export async function promptForIntegrations(options = {}) {
  const { skipIfConfigured = true, cwd = process.cwd() } = options;

  // Check if already configured
  const config = loadConfig(cwd);
  const hasExtraIntegrations = (config.enabled || []).some(id => id !== 'github');

  if (skipIfConfigured && hasExtraIntegrations) {
    return false;
  }

  console.log('');
  const { wantIntegrations } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'wantIntegrations',
      message: 'Configure additional PM tools (Jira, Linear, ClickUp)?',
      default: false,
    },
  ]);

  if (wantIntegrations) {
    await runIntegrationWizard({ cwd });
    return true;
  }

  return false;
}
