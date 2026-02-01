/**
 * Display utilities for MCP Explorer
 *
 * Functions for formatting and displaying MCP-related output.
 */

import chalk from 'chalk';
import { getMcpApiKeyInfo } from './mcp-registry.js';

/**
 * Display installation results
 * @param {Array} results - Installation results
 */
export function displayInstallResults(results) {
  console.log(chalk.cyan.bold('\n📋 Installation Results\n'));

  const successful = results.filter((r) => r.success);
  const skipped = results.filter((r) => r.skipped);
  const queued = results.filter((r) => r.queued);
  const failed = results.filter((r) => !r.success && !r.skipped && !r.queued);

  if (successful.length > 0) {
    console.log(chalk.green('✓ Installed:'));
    for (const result of successful) {
      console.log(`  - ${result.mcp.name}`);
    }
  }

  if (skipped.length > 0) {
    console.log(chalk.yellow('\n⏭ Skipped (no API key):'));
    for (const result of skipped) {
      const apiInfo = getMcpApiKeyInfo(result.mcp);
      console.log(`  - ${result.mcp.name}`);
      if (apiInfo?.url) {
        console.log(chalk.dim(`    Get key at: ${apiInfo.url}`));
      }
    }
  }

  if (queued.length > 0) {
    console.log(chalk.blue('\n📋 Queued for later:'));
    for (const result of queued) {
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
