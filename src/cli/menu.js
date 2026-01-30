/**
 * Interactive ASCII Menu System
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { runSetup } from '../commands/setup.js';
import { runCreate } from '../commands/create.js';
import { runList } from '../commands/list.js';
import { runInstall } from '../commands/install.js';
import { runDecompose } from '../commands/decompose.js';
import { runSync } from '../commands/sync.js';
import { runTestSetup } from '../commands/test-setup.js';
import { runTest } from '../commands/test-run.js';
import { runCreateAgent } from '../commands/create-agent.js';
import { runClaudeSettings } from '../commands/claude-settings.js';
import { runCreatePhaseDev, showPhasDevMainMenu } from '../commands/create-phase-dev.js';
import { runExploreMcp, showExploreMcpMenu } from '../commands/explore-mcp.js';
import { runClaudeAudit, showClaudeAuditMenu } from '../commands/claude-audit.js';
import { runRoadmap, showRoadmapMenu } from '../commands/roadmap.js';
import { hasTestingConfig } from '../testing/config.js';
import { showHelp } from '../commands/help.js';
import { hasValidConfig, getVersion } from '../utils.js';

/**
 * ASCII Art Banner
 */
const BANNER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗    ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝    ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═    ║
║                                                                            ║
║    Advanced Claude Code CLI Toolkit - Agents, MCP, GitHub & More           ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝`;

/**
 * Show main interactive menu
 */
export async function showMainMenu() {
  console.clear();
  console.log(chalk.cyan(BANNER));
  console.log('');

  const configured = hasValidConfig();

  // Show config status
  if (configured) {
    console.log(chalk.green('  ✓ Configuration loaded'));
  } else {
    console.log(chalk.yellow('  ⚠ Not configured - run Setup first'));
  }
  console.log(chalk.dim(`  v${getVersion()}`));
  console.log('');

  const choices = [
    {
      name: `${chalk.green('1)')} ${chalk.bold('Create New Task')}        Create issue with codebase analysis`,
      value: 'create',
      short: 'Create Task',
    },
    {
      name: `${chalk.cyan('2)')} ${chalk.bold('Decompose Issue')}        Break down issue into tasks`,
      value: 'decompose',
      short: 'Decompose',
    },
    {
      name: `${chalk.magenta('3)')} ${chalk.bold('Sync Tasks')}             Sync progress with GitHub`,
      value: 'sync',
      short: 'Sync',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.blue('4)')} ${chalk.bold('Setup / Configure')}      Connect to your GitHub project`,
      value: 'setup',
      short: 'Setup',
    },
    {
      name: `${chalk.dim('5)')} ${chalk.bold('List Recent Tasks')}      View issues you\'ve created`,
      value: 'list',
      short: 'List',
    },
    {
      name: `${chalk.yellow('6)')} ${chalk.bold('Install Claude Command')} Add to .claude/commands/`,
      value: 'install',
      short: 'Install',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.red('T)')} ${chalk.bold('Testing Setup')}          Configure testing mode & credentials`,
      value: 'test-setup',
      short: 'Test Setup',
    },
    {
      name: `${chalk.red('R)')} ${chalk.bold('Run Tests')}              Run tests (Ralph Loop / Manual / Watch)`,
      value: 'test-run',
      short: 'Run Tests',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.magenta('A)')} ${chalk.bold('Agent Creator')}          Create agents, hooks, skills, commands`,
      value: 'agent-creator',
      short: 'Agent Creator',
    },
    {
      name: `${chalk.blue('C)')} ${chalk.bold('Claude Settings')}         Permission modes, agent-only launcher`,
      value: 'claude-settings',
      short: 'Claude Settings',
    },
    {
      name: `${chalk.yellow('P)')} ${chalk.bold('Phase Dev Plan')}          Create phased development plan (95%+)`,
      value: 'phase-dev',
      short: 'Phase Dev',
    },
    {
      name: `${chalk.green('M)')} ${chalk.bold('MCP Explorer')}            Discover & install MCP servers`,
      value: 'explore-mcp',
      short: 'MCP Explorer',
    },
    {
      name: `${chalk.cyan('V)')} ${chalk.bold('Claude Audit')}            Verify CLAUDE.md & .claude/ best practices`,
      value: 'claude-audit',
      short: 'Claude Audit',
    },
    {
      name: `${chalk.magenta('R)')} ${chalk.bold('Roadmap Integration')}    Sync roadmaps with GitHub Project Board`,
      value: 'roadmap',
      short: 'Roadmap',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.dim('7)')} ${chalk.bold('Help & Examples')}         Documentation and examples`,
      value: 'help',
      short: 'Help',
    },
    {
      name: `${chalk.dim('Q)')} ${chalk.bold('Exit')}`,
      value: 'exit',
      short: 'Exit',
    },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an option:',
      choices,
      pageSize: 10,
    },
  ]);

  console.log('');

  switch (action) {
    case 'create':
      if (!configured) {
        console.log(
          chalk.yellow('You need to configure your GitHub project first.')
        );
        console.log('');
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Would you like to run setup now?',
            default: true,
          },
        ]);
        if (proceed) {
          await runSetup({});
          // After setup, return to menu
          await showMainMenu();
        }
      } else {
        await runCreate({});
        await returnToMenu();
      }
      break;

    case 'decompose':
      if (!configured) {
        console.log(chalk.yellow('You need to configure your GitHub project first.'));
        await returnToMenu();
      } else {
        await runDecompose({});
        await returnToMenu();
      }
      break;

    case 'sync':
      if (!configured) {
        console.log(chalk.yellow('You need to configure your GitHub project first.'));
        await returnToMenu();
      } else {
        // Show sync submenu
        const { syncAction } = await inquirer.prompt([
          {
            type: 'list',
            name: 'syncAction',
            message: 'Sync action:',
            choices: [
              { name: 'Status - Show tracked issues', value: 'status' },
              { name: 'Pull - Fetch from GitHub', value: 'pull' },
              { name: 'Push - Update GitHub', value: 'push' },
              { name: 'Watch - Interactive tracking', value: 'watch' },
              { name: 'Back to menu', value: 'back' },
            ],
          },
        ]);
        if (syncAction !== 'back') {
          await runSync({ subcommand: syncAction });
        }
        await returnToMenu();
      }
      break;

    case 'setup':
      await runSetup({});
      await returnToMenu();
      break;

    case 'list':
      if (!configured) {
        console.log(
          chalk.yellow(
            'You need to configure your GitHub project first to list tasks.'
          )
        );
        await returnToMenu();
      } else {
        await runList({});
        await returnToMenu();
      }
      break;

    case 'install':
      await runInstall({});
      await returnToMenu();
      break;

    case 'help':
      showHelp();
      await returnToMenu();
      break;

    case 'test-setup':
      await runTestSetup({});
      await returnToMenu();
      break;

    case 'test-run':
      // Check if testing is configured
      if (!hasTestingConfig()) {
        console.log(chalk.yellow('Testing not configured. Running setup first...'));
        console.log('');
        await runTestSetup({});
      } else {
        // Show test mode submenu
        const { testMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'testMode',
            message: 'How would you like to run tests?',
            choices: [
              { name: 'Default - Use configured mode', value: 'default' },
              { name: 'Ralph Loop - Test-fix cycle until all pass', value: 'ralph' },
              { name: 'Manual - Run tests once', value: 'manual' },
              { name: 'Watch - Interactive UI mode', value: 'watch' },
              { name: 'Back to menu', value: 'back' },
            ],
          },
        ]);
        if (testMode !== 'back') {
          const options = testMode === 'default' ? {} : { mode: testMode };
          await runTest(options);
        }
      }
      await returnToMenu();
      break;

    case 'agent-creator':
      await runCreateAgent({});
      await returnToMenu();
      break;

    case 'claude-settings':
      await runClaudeSettings({});
      await returnToMenu();
      break;

    case 'phase-dev':
      await showPhasDevMainMenu();
      await returnToMenu();
      break;

    case 'explore-mcp':
      await showExploreMcpMenu();
      await returnToMenu();
      break;

    case 'claude-audit':
      await showClaudeAuditMenu();
      await returnToMenu();
      break;

    case 'roadmap':
      await showRoadmapMenu();
      await returnToMenu();
      break;

    case 'exit':
      console.log(chalk.dim('Goodbye!'));
      process.exit(0);
  }
}

/**
 * Prompt to return to main menu
 */
async function returnToMenu() {
  console.log('');
  const { back } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'back',
      message: 'Return to main menu?',
      default: true,
    },
  ]);

  if (back) {
    await showMainMenu();
  } else {
    console.log(chalk.dim('Goodbye!'));
    process.exit(0);
  }
}

/**
 * Show a styled header
 */
export function showHeader(title) {
  const width = 60;
  const padding = Math.max(0, Math.floor((width - title.length - 2) / 2));
  const line = '═'.repeat(width);

  console.log(chalk.cyan(`╔${line}╗`));
  console.log(
    chalk.cyan('║') +
      ' '.repeat(padding) +
      chalk.bold(title) +
      ' '.repeat(width - padding - title.length) +
      chalk.cyan('║')
  );
  console.log(chalk.cyan(`╚${line}╝`));
  console.log('');
}

/**
 * Show a success message in a box
 */
export function showSuccess(title, details = []) {
  const width = 65;
  const line = '═'.repeat(width);

  console.log('');
  console.log(chalk.green(`╔${line}╗`));
  console.log(
    chalk.green('║  ') +
      chalk.green.bold('✅ ' + title.padEnd(width - 5)) +
      chalk.green('║')
  );

  if (details.length > 0) {
    console.log(chalk.green('║' + ' '.repeat(width) + '║'));
    for (const detail of details) {
      const paddedDetail = ('  ' + detail).padEnd(width);
      console.log(chalk.green('║') + paddedDetail + chalk.green('║'));
    }
  }

  console.log(chalk.green(`╚${line}╝`));
  console.log('');
}

/**
 * Show an error message
 */
export function showError(title, message) {
  console.log('');
  console.log(chalk.red(`✗ ${chalk.bold(title)}`));
  if (message) {
    console.log(chalk.red(`  ${message}`));
  }
  console.log('');
}

/**
 * Show a warning message
 */
export function showWarning(message) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Show info message
 */
export function showInfo(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}
