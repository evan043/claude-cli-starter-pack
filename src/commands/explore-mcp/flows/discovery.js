/**
 * MCP Explorer - Discovery & Recommendations
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { analyzeCodebase, displayAnalysisResults } from '../../create-phase-dev/codebase-analyzer.js';
import {
  getRecommendedMcps,
  getCoreTestingMcps,
  getMcpById,
  mergeMcpResults,
} from '../mcp-registry.js';
import {
  installMcp,
  installMultipleMcps,
  getInstalledMcps,
} from '../mcp-installer.js';
import { updateClaudeMd } from '../claude-md-updater.js';
import { loadCachedDiscovery, loadCachedRegistry, saveCachedRegistry } from '../mcp-cache.js';
import { displayInstallResults } from '../display.js';
import { ensureTechStackAnalysis, buildSearchKeywords } from '../tech-stack.js';
import { getAnthropicRegistryMcps } from '../registry/anthropic-registry.js';

/**
 * Smart recommendations flow with tech stack check
 */
export async function runRecommendedFlow(options) {
  // Step 1: Check for tech-stack.json first
  const { techStack, analysis: freshAnalysis, fromCache } = await ensureTechStackAnalysis();

  // Use fresh analysis or run new one
  let analysis;
  if (freshAnalysis) {
    analysis = freshAnalysis;
  } else if (fromCache && techStack) {
    // Convert tech-stack.json format to analysis format if needed
    console.log(chalk.cyan.bold('\n🔍 Analyzing Codebase...\n'));
    analysis = await analyzeCodebase(process.cwd());
    displayAnalysisResults(analysis);
  } else {
    // No tech stack, no detection - use basic analysis
    console.log(chalk.cyan.bold('\n🔍 Analyzing Codebase...\n'));
    analysis = await analyzeCodebase(process.cwd());
    displayAnalysisResults(analysis);
  }

  // Step 2: Check for cached dynamic discovery
  const cachedDiscovery = loadCachedDiscovery();
  let dynamicMcps = [];

  if (cachedDiscovery && cachedDiscovery.mcps && cachedDiscovery.mcps.length > 0) {
    console.log(chalk.dim(`\nUsing cached MCP discoveries (${cachedDiscovery.mcps.length} found)`));
    dynamicMcps = cachedDiscovery.mcps;
  }

  // Step 3: Get static recommendations based on analysis
  const staticRecommendations = getRecommendedMcps(analysis);

  // Step 4: Always include core testing MCPs
  const coreTestingMcps = getCoreTestingMcps();

  // Step 5: Merge all sources (static + dynamic + core testing)
  const recommendations = mergeMcpResults(staticRecommendations, dynamicMcps, coreTestingMcps);

  const installed = getInstalledMcps();

  console.log(chalk.cyan.bold('\n📋 Recommended MCP Servers\n'));

  if (recommendations.length === 0) {
    console.log(chalk.yellow('No specific recommendations based on your stack.'));
    console.log(chalk.dim('Consider installing testing MCPs for browser automation.\n'));
    return;
  }

  // Show recommendations with install status and source indicator
  const choices = recommendations.slice(0, 10).map((mcp, i) => {
    const isInstalled = installed.includes(mcp.id);
    const status = isInstalled ? chalk.green(' [installed]') : '';
    const score = chalk.dim(` (score: ${mcp.score})`);

    // Source indicator
    let sourceTag = '';
    if (mcp.source === 'dynamic') {
      sourceTag = chalk.magenta(' [web]');
    } else if (mcp.source === 'core-testing') {
      sourceTag = chalk.blue(' [core]');
    } else if (mcp.source === 'anthropic-registry') {
      sourceTag = chalk.magenta(' [registry]');
    }

    return {
      name: `${chalk.cyan(`${i + 1})`)} ${mcp.name}${sourceTag}${status}${score}\n      ${chalk.dim(mcp.description)}`,
      value: mcp.id,
      short: mcp.name,
      disabled: isInstalled ? 'Already installed' : false,
    };
  });

  choices.push(new inquirer.Separator());
  choices.push({
    name: `${chalk.green('A)')} Install All Recommended`,
    value: 'all',
    short: 'Install All',
  });
  choices.push({
    name: `${chalk.dim('Q)')} Skip`,
    value: 'skip',
    short: 'Skip',
  });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: 'Select MCPs to install:',
      choices,
      pageSize: 15,
    },
  ]);

  if (selection === 'skip') return;

  if (selection === 'all') {
    const toInstall = recommendations
      .filter((mcp) => !installed.includes(mcp.id))
      .slice(0, 5); // Limit to top 5

    if (toInstall.length === 0) {
      console.log(chalk.yellow('\nAll recommended MCPs are already installed.'));
      return;
    }

    console.log(chalk.cyan(`\nInstalling ${toInstall.length} MCPs...`));
    const results = await installMultipleMcps(toInstall);

    // Update CLAUDE.md
    const successfulMcps = results
      .filter((r) => r.success)
      .map((r) => getMcpById(r.mcp.id));

    if (successfulMcps.length > 0) {
      await updateClaudeMd(successfulMcps);
    }

    displayInstallResults(results);
  } else {
    // Install single MCP
    const mcp = getMcpById(selection);
    if (mcp) {
      const result = await installMcp(mcp);
      if (result.success) {
        await updateClaudeMd([mcp]);
      }
      displayInstallResults([result]);
    }
  }
}

/**
 * Fetch registry servers with spinner and error handling
 * @returns {Promise<Array>} Registry MCPs or empty array on failure
 */
async function fetchWithSpinner() {
  const spinner = ora('Fetching from Anthropic MCP Registry...').start();
  try {
    const mcps = await getAnthropicRegistryMcps({ timeout: 15000, maxPages: 3 });
    saveCachedRegistry(mcps);
    spinner.succeed(`Fetched ${mcps.length} servers from Anthropic registry`);
    return mcps;
  } catch (error) {
    spinner.fail(`Registry unavailable: ${error.message}`);
    console.log(chalk.dim('Falling back to curated catalog only.\n'));
    return [];
  }
}

/**
 * Official Anthropic MCP Registry discovery flow
 * Fetches live data from the Anthropic registry API
 */
export async function runDiscoverFlow() {
  console.log(chalk.magenta.bold('\n🌐 Anthropic Official MCP Registry\n'));
  console.log(chalk.dim('Browse 100+ commercial MCP servers from the official Anthropic registry.'));
  console.log(chalk.dim('These servers are verified to work with Claude Code.\n'));

  // Check cache first
  const cached = loadCachedRegistry();
  let registryMcps;

  if (cached && cached.mcps.length > 0) {
    const ageHours = Math.round(cached.age / (60 * 60 * 1000));
    console.log(chalk.dim(`  Cached: ${cached.mcps.length} servers (${ageHours}h old)\n`));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Registry data cached. What would you like to do?',
        choices: [
          { name: 'Browse cached results', value: 'use-cache' },
          { name: 'Refresh from live API', value: 'refresh' },
          { name: 'Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'back') return;

    if (action === 'refresh') {
      registryMcps = await fetchWithSpinner();
    } else {
      registryMcps = cached.mcps;
    }
  } else {
    registryMcps = await fetchWithSpinner();
  }

  if (!registryMcps || registryMcps.length === 0) {
    console.log(chalk.yellow('\nNo servers found. Check your internet connection.'));
    return;
  }

  // Group by category and display summary
  const byCat = {};
  for (const mcp of registryMcps) {
    const cat = mcp.category || 'utilities';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(mcp);
  }

  console.log(chalk.green(`\n  Found ${registryMcps.length} Claude Code-compatible servers\n`));

  for (const [cat, mcps] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
    const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
    console.log(
      chalk.cyan(`  ${catName} (${mcps.length}): `) +
      chalk.dim(mcps.slice(0, 4).map((m) => m.name).join(', ') + (mcps.length > 4 ? `, +${mcps.length - 4} more` : ''))
    );
  }

  console.log(chalk.dim('\nThese servers are now available in Browse and Search.\n'));

  // Offer to browse or install
  const installed = getInstalledMcps();
  const { nextAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'nextAction',
      message: 'What next?',
      choices: [
        { name: 'Browse by category', value: 'browse' },
        { name: 'Search registry', value: 'search' },
        { name: 'Done', value: 'done' },
      ],
    },
  ]);

  if (nextAction === 'browse') {
    // Quick category browse within registry results
    const catChoices = Object.entries(byCat)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([cat, mcps]) => ({
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${mcps.length} servers)`,
        value: cat,
        short: cat,
      }));

    catChoices.push(new inquirer.Separator());
    catChoices.push({ name: 'Back', value: 'back' });

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select category:',
        choices: catChoices,
        pageSize: 15,
      },
    ]);

    if (category !== 'back' && byCat[category]) {
      const mcpChoices = byCat[category].map((mcp) => {
        const isInstalled = installed.includes(mcp.id);
        const status = isInstalled ? chalk.green(' [installed]') : '';
        const auth = mcp.isAuthless ? chalk.dim(' (no auth)') : chalk.dim(' (OAuth)');

        return {
          name: `${mcp.name}${auth}${status}\n   ${chalk.dim(mcp.description)}`,
          value: mcp.id,
          short: mcp.name,
        };
      });

      mcpChoices.push(new inquirer.Separator());
      mcpChoices.push({ name: 'Back', value: 'back' });

      const { mcpSelection } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mcpSelection',
          message: `${category} servers:`,
          choices: mcpChoices,
          pageSize: 12,
        },
      ]);

      if (mcpSelection !== 'back') {
        const mcp = registryMcps.find((m) => m.id === mcpSelection);
        if (mcp) {
          const { showMcpDetails } = await import('./install.js');
          await showMcpDetails(mcp);
        }
      }
    }
  } else if (nextAction === 'search') {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search registry:',
        validate: (input) => input.length >= 2 || 'Enter at least 2 characters',
      },
    ]);

    const queryLower = query.toLowerCase();
    const results = registryMcps.filter(
      (mcp) =>
        mcp.name.toLowerCase().includes(queryLower) ||
        mcp.description.toLowerCase().includes(queryLower) ||
        mcp.id.toLowerCase().includes(queryLower)
    );

    if (results.length === 0) {
      console.log(chalk.yellow(`\nNo servers found matching "${query}".`));
      return;
    }

    const resultChoices = results.map((mcp) => {
      const isInstalled = installed.includes(mcp.id);
      const status = isInstalled ? chalk.green(' [installed]') : '';

      return {
        name: `${mcp.name}${status} (${mcp.category})\n   ${chalk.dim(mcp.description)}`,
        value: mcp.id,
        short: mcp.name,
      };
    });

    resultChoices.push(new inquirer.Separator());
    resultChoices.push({ name: 'Back', value: 'back' });

    const { resultSelection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'resultSelection',
        message: `Results for "${query}":`,
        choices: resultChoices,
      },
    ]);

    if (resultSelection !== 'back') {
      const mcp = registryMcps.find((m) => m.id === resultSelection);
      if (mcp) {
        const { showMcpDetails } = await import('./install.js');
        await showMcpDetails(mcp);
      }
    }
  }
}
