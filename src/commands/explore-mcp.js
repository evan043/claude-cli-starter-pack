/**
 * Explore MCP Command
 *
 * Interactive MCP server discovery and installation.
 * Uses codebase analyzer to recommend relevant MCPs.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { showHeader } from '../cli/menu.js';
import { analyzeCodebase, generateStackSummary, displayAnalysisResults } from './create-phase-dev/codebase-analyzer.js';
import {
  getAllMcps,
  getMcpsByCategory,
  getRecommendedMcps,
  getTestingMcps,
  getCoreTestingMcps,
  searchMcps,
  getMcpById,
  getCategories,
  mergeMcpResults,
} from './explore-mcp/mcp-registry.js';
import {
  installMcp,
  installMultipleMcps,
  isMcpInstalled,
  getInstalledMcps,
  removeMcp,
} from './explore-mcp/mcp-installer.js';
import { updateClaudeMd, removeMcpSection } from './explore-mcp/claude-md-updater.js';
import { loadCachedDiscovery, saveCachedDiscovery } from './explore-mcp/mcp-cache.js';

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
    case 'back':
      return null;
  }

  // Return to menu unless exiting
  if (action !== 'back') {
    return await showExploreMcpMenu();
  }
}

/**
 * Check for tech-stack.json and load it if available
 * @returns {Object|null} Tech stack config or null
 */
function loadTechStackJson() {
  const possiblePaths = [
    path.join(process.cwd(), '.claude', 'config', 'tech-stack.json'),
    path.join(process.cwd(), '.claude', 'tech-stack.json'),
    path.join(process.cwd(), 'tech-stack.json'),
  ];

  for (const techStackPath of possiblePaths) {
    if (fs.existsSync(techStackPath)) {
      try {
        const content = fs.readFileSync(techStackPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // Continue to next path
      }
    }
  }
  return null;
}

/**
 * Display tech stack status and prompt for detection if missing
 * @returns {Object} Analysis result from tech stack or fresh detection
 */
async function ensureTechStackAnalysis() {
  const techStack = loadTechStackJson();

  if (techStack) {
    console.log(chalk.green('✓ Found tech-stack.json'));
    console.log(chalk.dim(`  Project: ${techStack.project?.name || 'Unknown'}`));

    // Check if tech stack has useful detection data
    if (techStack.detectedStack || techStack.frontend || techStack.backend) {
      console.log(chalk.dim('  Using cached tech stack analysis\n'));
      return { techStack, fromCache: true };
    }
  }

  // No tech stack found or incomplete - offer to run detection
  console.log(chalk.yellow('\n⚠️  Tech stack not detected yet'));

  const { runDetection } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'runDetection',
      message: 'Run tech stack detection for better MCP recommendations?',
      default: true,
    },
  ]);

  if (runDetection) {
    console.log(chalk.cyan.bold('\n🔍 Analyzing Codebase...\n'));
    const analysis = await analyzeCodebase(process.cwd());
    displayAnalysisResults(analysis);
    return { analysis, fromCache: false };
  }

  return { analysis: null, fromCache: false };
}

/**
 * Smart recommendations flow with tech stack check
 */
async function runRecommendedFlow(options) {
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
 * Testing MCPs flow - install Playwright and Puppeteer
 */
async function runTestingFlow(options) {
  console.log(chalk.cyan.bold('\n🧪 Testing MCP Servers\n'));
  console.log(chalk.dim('Browser automation MCPs for E2E testing and UI interaction.\n'));

  const testingMcps = getTestingMcps();
  const installed = getInstalledMcps();

  // Show testing MCPs
  const choices = testingMcps.map((mcp) => {
    const isInstalled = installed.includes(mcp.id);
    const recommended = mcp.recommended ? chalk.green(' (Recommended)') : '';
    const status = isInstalled ? chalk.green(' [installed]') : '';

    return {
      name: `${mcp.name}${recommended}${status}\n   ${chalk.dim(mcp.description)}`,
      value: mcp.id,
      checked: mcp.recommended && !isInstalled,
      disabled: isInstalled ? 'Already installed' : false,
    };
  });

  const { selections } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selections',
      message: 'Select testing MCPs to install:',
      choices,
    },
  ]);

  if (selections.length === 0) {
    console.log(chalk.yellow('\nNo MCPs selected.'));
    return;
  }

  // Install selected MCPs
  const mcpsToInstall = selections.map((id) => getMcpById(id)).filter(Boolean);
  const results = await installMultipleMcps(mcpsToInstall);

  // Update CLAUDE.md
  const successfulMcps = results
    .filter((r) => r.success)
    .map((r) => getMcpById(r.mcp.id));

  if (successfulMcps.length > 0) {
    await updateClaudeMd(successfulMcps);
  }

  displayInstallResults(results);

  // Show usage tips
  console.log(chalk.cyan.bold('\n📚 Usage Tips\n'));
  console.log(chalk.white('Playwright MCP:'));
  console.log(chalk.dim('  mcp__playwright__browser_navigate(url: "https://example.com")'));
  console.log(chalk.dim('  mcp__playwright__browser_screenshot()'));
  console.log(chalk.dim('  mcp__playwright__browser_click(selector: "button.submit")'));
  console.log('');
  console.log(chalk.white('Puppeteer MCP:'));
  console.log(chalk.dim('  mcp__browser-monitor__puppeteer_navigate(url: "http://localhost:5174")'));
  console.log(chalk.dim('  mcp__browser-monitor__puppeteer_screenshot()'));
  console.log('');
  console.log(chalk.yellow('⚠️  Restart Claude Code for changes to take effect.'));
}

/**
 * Browse by category flow
 */
async function runBrowseFlow() {
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

    return {
      name: `${mcp.name}${status}\n   ${chalk.dim(mcp.description)}`,
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
async function runSearchFlow() {
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

/**
 * View installed MCPs flow
 */
async function runInstalledFlow() {
  const installed = getInstalledMcps();

  if (installed.length === 0) {
    console.log(chalk.yellow('\nNo MCPs installed yet.'));
    console.log(chalk.dim('Use "Smart Recommendations" or "Testing MCPs" to get started.\n'));
    return;
  }

  console.log(chalk.cyan.bold(`\n📦 Installed MCPs (${installed.length})\n`));

  const choices = installed.map((id) => {
    const mcp = getMcpById(id);
    const name = mcp ? mcp.name : id;
    const desc = mcp ? chalk.dim(mcp.description) : chalk.dim('Custom MCP');

    return {
      name: `${name}\n   ${desc}`,
      value: id,
      short: name,
    };
  });

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Remove an MCP', value: 'remove' });
  choices.push({ name: 'Back', value: 'back' });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: 'Installed MCPs:',
      choices,
    },
  ]);

  if (selection === 'back') return;

  if (selection === 'remove') {
    const { toRemove } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'toRemove',
        message: 'Select MCPs to remove:',
        choices: installed.map((id) => ({
          name: getMcpById(id)?.name || id,
          value: id,
        })),
      },
    ]);

    if (toRemove.length > 0) {
      for (const id of toRemove) {
        removeMcp(id);
        console.log(chalk.green(`✓ Removed ${id}`));
      }

      // Update CLAUDE.md
      const remainingMcps = getInstalledMcps().map((id) => getMcpById(id)).filter(Boolean);
      await updateClaudeMd(remainingMcps);
    }
  } else {
    const mcp = getMcpById(selection);
    if (mcp) {
      await showMcpDetails(mcp);
    }
  }
}

/**
 * Update CLAUDE.md documentation flow
 */
async function runUpdateDocsFlow() {
  const installed = getInstalledMcps();
  const mcps = installed.map((id) => getMcpById(id)).filter(Boolean);

  if (mcps.length === 0) {
    console.log(chalk.yellow('\nNo MCPs to document.'));
    return;
  }

  const result = await updateClaudeMd(mcps);

  if (result.success) {
    console.log(chalk.green(`\n✓ ${result.action === 'created' ? 'Created' : 'Updated'} CLAUDE.md`));
    console.log(chalk.dim(`  ${result.path}`));
  }
}

/**
 * Show MCP details and install option
 */
async function showMcpDetails(mcp) {
  console.log(chalk.cyan.bold(`\n📦 ${mcp.name}\n`));
  console.log(`${chalk.white('Description:')} ${mcp.description}`);
  console.log(`${chalk.white('Category:')} ${mcp.category}`);
  console.log(`${chalk.white('Package:')} ${mcp.npmPackage || mcp.command}`);

  if (mcp.tools && mcp.tools.length > 0) {
    console.log(`${chalk.white('Tools:')} ${mcp.tools.join(', ')}`);
  }

  if (Object.keys(mcp.requiredEnv || {}).length > 0) {
    console.log(`${chalk.white('Required Env:')} ${Object.keys(mcp.requiredEnv).join(', ')}`);
  }

  if (mcp.note) {
    console.log(`${chalk.yellow('Note:')} ${mcp.note}`);
  }

  console.log('');

  const isInstalled = isMcpInstalled(mcp.id);

  if (isInstalled) {
    console.log(chalk.green('✓ Already installed'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: 'Remove', value: 'remove' },
          { name: 'Back', value: 'back' },
        ],
      },
    ]);

    if (action === 'remove') {
      removeMcp(mcp.id);
      console.log(chalk.green(`✓ Removed ${mcp.name}`));

      const remainingMcps = getInstalledMcps().map((id) => getMcpById(id)).filter(Boolean);
      await updateClaudeMd(remainingMcps);
    }
  } else {
    const { install } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'install',
        message: 'Install this MCP?',
        default: true,
      },
    ]);

    if (install) {
      const result = await installMcp(mcp);
      if (result.success) {
        await updateClaudeMd([mcp]);
      }
      displayInstallResults([result]);
    }
  }
}

/**
 * Display installation results
 */
function displayInstallResults(results) {
  console.log(chalk.cyan.bold('\n📋 Installation Results\n'));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log(chalk.green('✓ Installed:'));
    for (const result of successful) {
      console.log(`  - ${result.mcp.name}`);
    }
  }

  if (failed.length > 0) {
    console.log(chalk.red('\n✗ Failed:'));
    for (const result of failed) {
      console.log(`  - ${result.mcp.name}: ${result.error}`);
    }
  }

  if (successful.length > 0) {
    console.log(chalk.cyan('\n📁 Files Updated:'));
    console.log(chalk.dim('  - .mcp.json'));
    console.log(chalk.dim('  - .claude/settings.json'));
    console.log(chalk.dim('  - CLAUDE.md'));
    console.log(chalk.yellow('\n⚠️  Restart Claude Code for changes to take effect.'));
  }
}

/**
 * Dynamic MCP discovery flow using web search
 * This generates instructions for Claude Code to perform web searches
 */
async function runDiscoverFlow() {
  console.log(chalk.magenta.bold('\n🔎 Dynamic MCP Discovery\n'));
  console.log(chalk.dim('This feature uses web search to find MCPs relevant to your tech stack.'));
  console.log(chalk.dim('It requires Claude Code CLI to execute the search.\n'));

  // First check/run tech stack detection
  const { analysis } = await ensureTechStackAnalysis();

  if (!analysis) {
    console.log(chalk.yellow('\nTech stack analysis required for discovery.'));
    return;
  }

  // Build search keywords from analysis
  const keywords = [];
  if (analysis.frontend?.framework) keywords.push(analysis.frontend.framework);
  if (analysis.backend?.framework) keywords.push(analysis.backend.framework);
  if (analysis.database?.type) keywords.push(analysis.database.type);
  if (analysis.deployment?.platform) keywords.push(analysis.deployment.platform);

  if (keywords.length === 0) {
    console.log(chalk.yellow('\nNo specific frameworks detected. Using generic search.\n'));
    keywords.push('general');
  }

  console.log(chalk.cyan('Detected stack keywords:'), keywords.join(', '));

  // Display instructions for Claude Code
  console.log(chalk.cyan.bold('\n📋 Discovery Instructions\n'));
  console.log(chalk.white('To discover new MCPs, ask Claude Code to run this search:'));
  console.log('');
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.yellow(`
Use WebSearch to find MCP servers for: ${keywords.join(', ')}

Search queries to run:
${keywords.map((k) => `  - "MCP server ${k} Claude"`).join('\n')}
  - "@modelcontextprotocol npm packages"
  - "Claude MCP server list ${new Date().getFullYear()}"

For each MCP found, extract:
  - name: Display name
  - npmPackage: npm package name (e.g., @playwright/mcp)
  - description: What it does
  - tools: List of available tools

Save results using /explore-mcp --save-discovery
`));
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');

  // Offer to save placeholder for manual discovery
  const { savePrompt } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'savePrompt',
      message: 'Copy these instructions to clipboard? (requires xclip/pbcopy)',
      default: false,
    },
  ]);

  if (savePrompt) {
    const instructions = `Use WebSearch to find MCP servers for: ${keywords.join(', ')}

Search queries:
${keywords.map((k) => `- "MCP server ${k} Claude"`).join('\n')}
- "@modelcontextprotocol npm packages"

For each MCP found, provide: name, npmPackage, description, tools list.`;

    try {
      const { execSync } = await import('child_process');
      const platform = process.platform;
      if (platform === 'darwin') {
        execSync(`echo "${instructions}" | pbcopy`);
      } else if (platform === 'linux') {
        execSync(`echo "${instructions}" | xclip -selection clipboard`);
      } else if (platform === 'win32') {
        execSync(`echo ${instructions.replace(/\n/g, '& echo.')} | clip`, { shell: true });
      }
      console.log(chalk.green('\n✓ Instructions copied to clipboard'));
    } catch {
      console.log(chalk.yellow('\nCould not copy to clipboard. Please copy manually.'));
    }
  }

  console.log(chalk.dim('\nTip: Run "/explore-mcp" in Claude Code CLI to use discovered MCPs.\n'));
}

/**
 * Show help for MCP exploration
 */
export function showExploreMcpHelp() {
  console.log(chalk.cyan.bold('\n📚 MCP Explorer Help\n'));

  console.log(chalk.white.bold('What are MCPs?'));
  console.log(chalk.dim(`
  MCP (Model Context Protocol) servers extend Claude's capabilities
  with additional tools for browser automation, API access, deployments,
  and more. They run as separate processes that Claude communicates with.
`));

  console.log(chalk.white.bold('Recommended MCPs:'));
  console.log(chalk.dim(`
  - Playwright: Browser automation for testing and web interaction
  - Puppeteer: Alternative browser automation using Chrome
  - GitHub: GitHub API for issues, PRs, and repository management
`));

  console.log(chalk.white.bold('Files Modified:'));
  console.log(chalk.dim(`
  - .mcp.json: MCP server configurations (commit to git for team sharing)
  - .claude/settings.json: Permissions and enabled servers
  - CLAUDE.md: Documentation of installed tools
`));

  console.log(chalk.white.bold('CLI Usage:'));
  console.log(chalk.dim(`
  gtask explore-mcp                # Interactive menu
  gtask explore-mcp --recommend    # Auto-detect stack and recommend
  gtask explore-mcp --testing      # Install testing MCPs
`));

  console.log('');
}
