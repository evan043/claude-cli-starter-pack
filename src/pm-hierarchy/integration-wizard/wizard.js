/**
 * Integration Wizard Main Entry Points
 *
 * Interactive wizard for managing PM tool integrations.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig } from './config.js';
import {
  addIntegration,
  configureIntegration,
  removeIntegration,
  testIntegrations,
} from './actions.js';

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
