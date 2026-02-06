/**
 * MCP Explorer - Install Flows
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getTestingMcps,
  getMcpById,
} from '../mcp-registry.js';
import {
  installMcp,
  installMultipleMcps,
  isMcpInstalled,
  getInstalledMcps,
  removeMcp,
} from '../mcp-installer.js';
import { updateClaudeMd } from '../claude-md-updater.js';
import { displayInstallResults } from '../display.js';

/**
 * Testing MCPs flow - install Playwright and Puppeteer
 */
export async function runTestingFlow(options) {
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
 * View installed MCPs flow
 */
export async function runInstalledFlow() {
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
export async function runUpdateDocsFlow() {
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
export async function showMcpDetails(mcp) {
  console.log(chalk.cyan.bold(`\n📦 ${mcp.name}\n`));
  console.log(`${chalk.white('Description:')} ${mcp.description}`);
  console.log(`${chalk.white('Category:')} ${mcp.category}`);

  // Remote HTTP servers (from Anthropic registry)
  if (mcp.remoteUrl) {
    console.log(`${chalk.white('Transport:')} Remote ${(mcp.transport || 'http').toUpperCase()}`);
    console.log(`${chalk.white('URL:')} ${mcp.remoteUrl}`);
    console.log(`${chalk.white('Auth:')} ${mcp.isAuthless ? 'None required' : 'OAuth (browser-based via /mcp)'}`);
    if (mcp.author) {
      console.log(`${chalk.white('Author:')} ${mcp.author}`);
    }
  } else {
    console.log(`${chalk.white('Package:')} ${mcp.npmPackage || mcp.command}`);
  }

  if (mcp.tools && mcp.tools.length > 0) {
    console.log(`${chalk.white('Tools:')} ${mcp.tools.join(', ')}`);
  }

  if (Object.keys(mcp.requiredEnv || {}).length > 0) {
    console.log(`${chalk.white('Required Env:')} ${Object.keys(mcp.requiredEnv).join(', ')}`);
  }

  if (mcp.documentationUrl) {
    console.log(`${chalk.white('Docs:')} ${mcp.documentationUrl}`);
  }

  if (mcp.claudeCodeCopyText) {
    console.log(`\n${chalk.white('Quick Install:')} ${chalk.cyan(mcp.claudeCodeCopyText)}`);
  }

  if (mcp.note && !mcp.documentationUrl) {
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
