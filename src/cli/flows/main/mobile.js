/**
 * Mobile - Mobile menu handlers
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { runSetup } from '../../../commands/setup.js';
import { runCreate } from '../../../commands/create.js';
import { runList } from '../../../commands/list.js';
import { runInstall } from '../../../commands/install.js';
import { runDecompose } from '../../../commands/decompose.js';
import { runSync } from '../../../commands/sync.js';
import { runTestSetup } from '../../../commands/test-setup.js';
import { runCreateAgent } from '../../../commands/create-agent.js';
import { showExploreMcpMenu } from '../../../commands/explore-mcp.js';
import { showHelp } from '../../../commands/help.js';
import { hasValidConfig, loadTechStack } from '../../../utils.js';
import { showMobileMenu, mobileReturnPrompt } from '../../mobile-menu.js';
import { launchAgentOnlySession } from '../../menu/agent-launch.js';

/**
 * Mobile-optimized main menu handler
 */
export async function showMobileMainMenu() {
  const action = await showMobileMenu();

  switch (action) {
    case 'create': {
      const configured = hasValidConfig();
      if (!configured) {
        console.log(chalk.yellow('Setup required first.'));
        const { proceed } = await inquirer.prompt([
          { type: 'confirm', name: 'proceed', message: 'Run setup?', default: true }
        ]);
        if (proceed) await runSetup({});
      } else {
        await runCreate({});
      }
      break;
    }

    case 'decompose':
      if (!hasValidConfig()) {
        console.log(chalk.yellow('Setup required first.'));
      } else {
        await runDecompose({});
      }
      break;

    case 'sync':
      if (!hasValidConfig()) {
        console.log(chalk.yellow('Setup required first.'));
      } else {
        await runSync({ subcommand: 'status' });
      }
      break;

    case 'setup':
      await runSetup({});
      break;

    case 'list':
      if (!hasValidConfig()) {
        console.log(chalk.yellow('Setup required first.'));
      } else {
        await runList({});
      }
      break;

    case 'install':
      await runInstall({});
      break;

    case 'panel-inline':
      // Show panel inline instead of launching new window
      await showMobilePanelLoop();
      break;

    case 'test-setup':
      await runTestSetup({});
      break;

    case 'agent-creator':
      await runCreateAgent({});
      break;

    case 'explore-mcp':
      await showExploreMcpMenu();
      break;

    case 'launch-agent-only':
      await launchAgentOnlySession();
      break;

    case 'project-settings':
      await showMobileSettingsLoop();
      break;

    case 'help':
      showHelp();
      break;

    case 'exit':
      console.log(chalk.dim('Goodbye!'));
      process.exit(0);
  }

  // Return to menu unless exiting
  if (action !== 'exit') {
    const back = await mobileReturnPrompt();
    if (back) {
      await showMobileMainMenu();
    } else {
      console.log(chalk.dim('Goodbye!'));
      process.exit(0);
    }
  }
}

/**
 * Mobile panel loop - inline panel without new window
 */
export async function showMobilePanelLoop() {
  const { showMobilePanel } = await import('../../mobile-menu.js');

  while (true) {
    const action = await showMobilePanel();

    if (action === 'back') {
      return;
    }

    // Copy command to clipboard and show instructions
    console.log('');
    console.log(chalk.cyan(`Command: ${action}`));
    console.log(chalk.dim('Paste in Claude Code'));
    console.log('');

    // Try to copy to clipboard
    try {
      const { copyToClipboard } = await import('../../../panel/queue.js');
      if (copyToClipboard(action)) {
        console.log(chalk.green('✓ Copied to clipboard'));
      }
    } catch {
      // Clipboard not available
    }

    await inquirer.prompt([
      { type: 'input', name: 'continue', message: 'Enter to continue...' }
    ]);
  }
}

/**
 * Mobile settings loop
 */
export async function showMobileSettingsLoop() {
  const { showMobileSettings } = await import('../../mobile-menu.js');

  while (true) {
    const action = await showMobileSettings();

    if (action === 'back') {
      return;
    }

    const techStack = loadTechStack();

    // Import configuration functions from settings flow
    const {
      configureGitHub,
      configureDeployment,
      configureTunnel,
      configureToken,
      configureHappy
    } = await import('../settings.js');

    switch (action) {
      case 'github':
        await configureGitHub(techStack);
        break;
      case 'deployment':
        await configureDeployment(techStack);
        break;
      case 'tunnel':
        await configureTunnel(techStack);
        break;
      case 'token':
        await configureToken(techStack);
        break;
      case 'happy':
        await configureHappy(techStack);
        break;
    }
  }
}
