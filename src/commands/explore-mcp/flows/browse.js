/**
 * MCP Explorer - Browse & Search Flows
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getMcpsByCategory,
  searchMcps,
  getMcpById,
  getCategories,
} from '../mcp-registry.js';
import { getInstalledMcps } from '../mcp-installer.js';
import { showMcpDetails } from './install.js';

/**
 * Browse by category flow
 */
export async function runBrowseFlow() {
  const categories = getCategories();

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select category:',
      choices: [
        ...categories.map((cat) => ({
          name: `${cat.name} (${cat.count} servers)`,
          value: cat.id,
          short: cat.name,
        })),
        new inquirer.Separator(),
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (category === 'back') return;

  const mcps = getMcpsByCategory(category);
  const installed = getInstalledMcps();

  const choices = mcps.map((mcp) => {
    const isInstalled = installed.includes(mcp.id);
    const status = isInstalled ? chalk.green(' [installed]') : '';
    const sourceTag = mcp.source === 'anthropic-registry' ? chalk.magenta(' [registry]') : '';

    return {
      name: `${mcp.name}${sourceTag}${status}\n   ${chalk.dim(mcp.description)}`,
      value: mcp.id,
      short: mcp.name,
    };
  });

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Back', value: 'back' });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: `${category} MCPs:`,
      choices,
      pageSize: 12,
    },
  ]);

  if (selection === 'back') return;

  const mcp = getMcpById(selection);
  if (mcp) {
    await showMcpDetails(mcp);
  }
}

/**
 * Search flow
 */
export async function runSearchFlow() {
  const { query } = await inquirer.prompt([
    {
      type: 'input',
      name: 'query',
      message: 'Search MCPs:',
      validate: (input) => input.length >= 2 || 'Enter at least 2 characters',
    },
  ]);

  const results = searchMcps(query);

  if (results.length === 0) {
    console.log(chalk.yellow(`\nNo MCPs found matching "${query}".`));
    return;
  }

  const installed = getInstalledMcps();
  const choices = results.map((mcp) => {
    const isInstalled = installed.includes(mcp.id);
    const status = isInstalled ? chalk.green(' [installed]') : '';

    return {
      name: `${mcp.name}${status} (${mcp.category})\n   ${chalk.dim(mcp.description)}`,
      value: mcp.id,
      short: mcp.name,
    };
  });

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Back', value: 'back' });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: `Search results for "${query}":`,
      choices,
    },
  ]);

  if (selection === 'back') return;

  const mcp = getMcpById(selection);
  if (mcp) {
    await showMcpDetails(mcp);
  }
}
