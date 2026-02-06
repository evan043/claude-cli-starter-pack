/**
 * MCP Explorer - Discovery & Recommendations
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
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
import { loadCachedDiscovery } from '../mcp-cache.js';
import { displayInstallResults } from '../display.js';
import { ensureTechStackAnalysis, buildSearchKeywords } from '../tech-stack.js';

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
 * Dynamic MCP discovery flow using web search
 * This generates instructions for Claude Code to perform web searches
 */
export async function runDiscoverFlow() {
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
  const keywords = buildSearchKeywords(analysis);

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
  - apiKeyRequired: Does it need an API key? (true/false)
  - apiKeyUrl: Where to get the API key (if required)
  - apiKeyFree: Is there a free tier? (true/false)

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
      const { spawnSync } = await import('child_process');
      const platform = process.platform;

      let result;
      if (platform === 'darwin') {
        result = spawnSync('pbcopy', [], {
          input: instructions,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else if (platform === 'linux') {
        result = spawnSync('xclip', ['-selection', 'clipboard'], {
          input: instructions,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else if (platform === 'win32') {
        result = spawnSync('clip', [], {
          input: instructions,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }

      if (result && result.status === 0) {
        console.log(chalk.green('\n✓ Instructions copied to clipboard'));
      } else {
        console.log(chalk.yellow('\nCould not copy to clipboard. Please copy manually.'));
      }
    } catch {
      console.log(chalk.yellow('\nCould not copy to clipboard. Please copy manually.'));
    }
  }

  console.log(chalk.dim('\nTip: Run "/explore-mcp" in Claude Code CLI to use discovered MCPs.\n'));
}
