/**
 * Integration Management Actions
 *
 * Add, configure, remove, and test integrations.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  SUPPORTED_INTEGRATIONS,
  getIntegrationInfo,
  createAdapterRegistry,
} from '../integrations/index.js';
import { loadConfig, saveConfig } from './config.js';
import { configureSpecificIntegration } from './prompts.js';

/**
 * Add a new integration
 */
export async function addIntegration(config, cwd) {
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
export async function configureIntegration(config, cwd) {
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
 * Remove an integration
 */
export async function removeIntegration(config, cwd) {
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
export async function testIntegrations(config, cwd) {
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
