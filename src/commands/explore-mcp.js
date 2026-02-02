/**
 * Explore MCP Command
 *
 * Interactive MCP server discovery and installation.
 * Uses codebase analyzer to recommend relevant MCPs.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';
import { getInstalledMcps } from './explore-mcp/mcp-installer.js';
import { showExploreMcpHelp } from './explore-mcp/display.js';
import { isApiKeyHookEnabled, runApiKeyHookFlow } from './explore-mcp/api-key-hook.js';
import {
  runRecommendedFlow,
  runTestingFlow,
  runBrowseFlow,
  runSearchFlow,
  runInstalledFlow,
  runUpdateDocsFlow,
  runDiscoverFlow,
} from './explore-mcp/flows.js';

/**
 * Run the explore-mcp command
 */
export async function runExploreMcp(options = {}) {
  showHeader('MCP Server Explorer');

  console.log(chalk.dim('Discover and install MCP servers to extend Claude\'s capabilities.'));
  console.log(chalk.dim('MCPs add tools for browser automation, API access, deployments, and more.\n'));

  // Check for quick options
  if (options.recommend) {
    return await runRecommendedFlow(options);
  }

  if (options.testing) {
    return await runTestingFlow(options);
  }

  // Show main menu
  return await showExploreMcpMenu();
}

/**
 * Main menu for MCP exploration
 */
export async function showExploreMcpMenu() {
  const installed = getInstalledMcps();
  const installedCount = installed.length;

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.green('1)')} Smart Recommendations    Auto-detect stack & suggest MCPs`,
          value: 'recommend',
          short: 'Recommend',
        },
        {
          name: `${chalk.cyan('2)')} Testing MCPs (Recommended)  Install Playwright + Puppeteer`,
          value: 'testing',
          short: 'Testing',
        },
        {
          name: `${chalk.magenta('3)')} Discover New MCPs         Web search for stack-specific MCPs`,
          value: 'discover',
          short: 'Discover',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.blue('4)')} Browse by Category       View all available MCPs`,
          value: 'browse',
          short: 'Browse',
        },
        {
          name: `${chalk.blue('5)')} Search MCPs              Find specific servers`,
          value: 'search',
          short: 'Search',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('6)')} View Installed (${installedCount})       Manage existing MCPs`,
          value: 'installed',
          short: 'Installed',
        },
        {
          name: `${chalk.dim('7)')} Update CLAUDE.md         Regenerate MCP documentation`,
          value: 'update-docs',
          short: 'Update Docs',
        },
        {
          name: `${chalk.dim('8)')} API Key Validation       ${isApiKeyHookEnabled() ? chalk.green('[enabled]') : chalk.dim('[disabled]')} Configure hook`,
          value: 'api-key-hook',
          short: 'API Key Hook',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  switch (action) {
    case 'recommend':
      await runRecommendedFlow({});
      break;
    case 'testing':
      await runTestingFlow({});
      break;
    case 'discover':
      await runDiscoverFlow();
      break;
    case 'browse':
      await runBrowseFlow();
      break;
    case 'search':
      await runSearchFlow();
      break;
    case 'installed':
      await runInstalledFlow();
      break;
    case 'update-docs':
      await runUpdateDocsFlow();
      break;
    case 'api-key-hook':
      await runApiKeyHookFlow();
      break;
    case 'back':
      return null;
  }

  // Return to menu unless exiting
  if (action !== 'back') {
    return await showExploreMcpMenu();
  }
}

// Re-export showExploreMcpHelp for backwards compatibility
export { showExploreMcpHelp };
