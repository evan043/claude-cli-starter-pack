/**
 * Main Flow - Main menu, navigation, and top-level handlers
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { runSetup } from '../../commands/setup.js';
import { runCreate } from '../../commands/create.js';
import { runList } from '../../commands/list.js';
import { runInstall } from '../../commands/install.js';
import { runDecompose } from '../../commands/decompose.js';
import { runSync } from '../../commands/sync.js';
import { runTestSetup } from '../../commands/test-setup.js';
import { runTest } from '../../commands/test-run.js';
import { runCreateAgent } from '../../commands/create-agent.js';
import { runClaudeSettings } from '../../commands/claude-settings.js';
import { showPhasDevMainMenu } from '../../commands/create-phase-dev.js';
import { showExploreMcpMenu } from '../../commands/explore-mcp.js';
import { showClaudeAuditMenu } from '../../commands/claude-audit.js';
import { showRoadmapMenu } from '../../commands/roadmap.js';
import { showGitHubEpicMenu } from '../../commands/github-epic-menu.js';
import { runVision } from '../../commands/vision.js';
import { launchPanel } from '../../commands/panel.js';
import { hasTestingConfig } from '../../testing/config.js';
import { showHelp } from '../../commands/help.js';
import { hasValidConfig, getVersion, loadTechStack } from '../../utils.js';
import { performVersionCheck, formatUpdateBanner } from '../../utils/version-check.js';
import { shouldUseMobileUI } from '../../utils/happy-detect.js';
import { showMobileMenu, mobileReturnPrompt } from '../mobile-menu.js';
import { BANNER } from '../menu/constants.js';
import {
  showDevModeIndicator,
  checkPendingRestore,
  getDevModeSyncStatus,
  formatDevModeSyncBanner,
  executeWorktreeSync,
} from '../menu/helpers.js';
import { launchAgentOnlySession } from '../menu/agent-launch.js';
import { isDevMode } from '../../utils/dev-mode-state.js';
import { showProjectSettingsMenu } from './settings.js';

/**
 * Show Vision Mode menu
 */
async function showVisionModeMenu() {
  console.log('');
  console.log(chalk.cyan('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557'));
  console.log(chalk.cyan('\u2551') + chalk.bold('                      \u{1F441} VISION MODE - Autonomous MVP Development                ') + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563'));
  console.log(chalk.cyan('\u2551') + '                                                                               ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + chalk.dim('  Transform natural language prompts into complete, working MVPs              ') + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + chalk.dim('  through intelligent planning, agent orchestration, and self-healing.       ') + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '                                                                               ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [1] Initialize Vision     Create vision from natural language prompt        ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [2] View Status           Show all visions with progress                    ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [3] Run Vision            Execute autonomous development                    ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [4] Start Dashboard       Web UI with real-time updates                     ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [5] Security Scan         Scan packages for vulnerabilities                 ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '                                                                               ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '   [B] Back to main menu                                                       ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u2551') + '                                                                               ' + chalk.cyan('\u2551'));
  console.log(chalk.cyan('\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D'));
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an option:',
      choices: [
        { name: '1. Initialize Vision', value: 'init' },
        { name: '2. View Status', value: 'status' },
        { name: '3. Run Vision', value: 'run' },
        { name: '4. Start Dashboard', value: 'dashboard' },
        { name: '5. Security Scan', value: 'scan' },
        new inquirer.Separator(),
        { name: 'Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return;
  }

  switch (action) {
    case 'init': {
      const { prompt: visionPrompt } = await inquirer.prompt([
        {
          type: 'input',
          name: 'prompt',
          message: 'Describe what you want to build:',
        },
      ]);
      if (visionPrompt?.trim()) {
        await runVision('init', { prompt: visionPrompt.trim() });
      }
      break;
    }
    case 'status':
      await runVision('status', {});
      break;
    case 'run': {
      const { slug } = await inquirer.prompt([
        {
          type: 'input',
          name: 'slug',
          message: 'Vision slug (leave empty to list):',
        },
      ]);
      await runVision(slug?.trim() ? 'run' : 'list', { args: slug?.trim() ? [slug.trim()] : [] });
      break;
    }
    case 'dashboard':
      console.log(chalk.yellow('\n  Starting Vision Dashboard...'));
      console.log(chalk.dim('  This will block until you press Ctrl+C\n'));
      await runVision('dashboard', {});
      break;
    case 'scan':
      await runVision('scan', {});
      break;
  }
}

/**
 * Handle worktree sync from menu
 */
async function handleWorktreeSync() {
  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                       WORKTREE SYNC                                          ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // First, show preview (dry run)
  console.log(chalk.dim('  Analyzing sync actions...\n'));

  const previewResult = await executeWorktreeSync({ dryRun: true });

  if (previewResult.error) {
    console.log(chalk.red(`  ✗ ${previewResult.error}\n`));
    return;
  }

  console.log(previewResult.formatted);
  console.log('');

  // Count files that would be updated
  const { results } = previewResult;
  const willUpdate = results.executed.length;
  const willSkip = results.skipped.length;

  if (willUpdate === 0) {
    console.log(chalk.green('  ✓ Project is already up to date with worktree.\n'));
    return;
  }

  // Ask for confirmation
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Proceed with sync?',
      choices: [
        { name: `Yes, sync ${willUpdate} file(s)`, value: 'sync' },
        { name: 'Force sync (overwrite customizations)', value: 'force' },
        { name: 'Cancel', value: 'cancel' }
      ]
    }
  ]);

  if (action === 'cancel') {
    console.log(chalk.dim('\n  Sync cancelled.\n'));
    return;
  }

  // Execute sync
  console.log('');
  console.log(chalk.dim('  Syncing files...\n'));

  const syncResult = await executeWorktreeSync({
    dryRun: false,
    force: action === 'force'
  });

  if (syncResult.error) {
    console.log(chalk.red(`  ✗ ${syncResult.error}\n`));
    return;
  }

  console.log(syncResult.formatted);
  console.log('');
  console.log(chalk.green('  ✓ Sync complete. Restart Claude Code CLI to see command changes.\n'));
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
 * Show main interactive menu
 * Automatically detects Happy CLI and switches to mobile-optimized UI
 */
export async function showMainMenu() {
  // Check if we should use mobile UI (Happy CLI detected or happyMode.enabled)
  const techStack = loadTechStack();
  if (shouldUseMobileUI(techStack)) {
    return showMobileMainMenu();
  }

  console.clear();

  // Show dev mode warning banner if active
  showDevModeIndicator();

  // Check for pending restore from dev mode
  await checkPendingRestore();

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

  // Dev mode: Show worktree sync banner instead of npm update banner
  const inDevMode = isDevMode();
  if (inDevMode) {
    try {
      const syncStatus = await getDevModeSyncStatus();
      const syncBanner = formatDevModeSyncBanner(syncStatus);
      if (syncBanner) {
        console.log(syncBanner);
      }
    } catch {
      // Silently ignore sync status failures
    }
  } else {
    // Normal mode: Check for npm updates (uses 1-hour cache)
    try {
      const updateCheck = await performVersionCheck(process.cwd(), false);
      if (updateCheck.updateAvailable && updateCheck.shouldNotify) {
        const banner = formatUpdateBanner(updateCheck);
        if (banner) {
          console.log(chalk.yellow(banner));
        }
      }
    } catch {
      // Silently ignore update check failures
    }
  }

  console.log('');

  // Build choices dynamically - add dev mode sync option if active
  const choices = [];

  // Add worktree sync option at top when in dev mode
  if (inDevMode) {
    choices.push({
      name: `${chalk.yellow('W)')} ${chalk.bold('Sync from Worktree')}     Update project from dev worktree`,
      value: 'worktree-sync',
      short: 'Worktree Sync',
    });
    choices.push(new inquirer.Separator());
  }

  choices.push(
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
      name: `${chalk.dim('5)')} ${chalk.bold('List Recent Tasks')}      View issues you've created`,
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
      name: `${chalk.bold.white('⚡')} ${chalk.bold.cyan('Launch Control Panel')}   ${chalk.dim('Agents, Skills, Hooks, MCP (new window)')}`,
      value: 'launch-panel',
      short: 'Panel',
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
      name: `${chalk.bold.green('⚡')} ${chalk.bold('Agent-Only + Bypass')}     Launch new session (full auto-approve)`,
      value: 'launch-agent-only',
      short: 'Agent-Only Launch',
    },
    {
      name: `${chalk.yellow('P)')} ${chalk.bold('Phase Dev Plan')}          Create phased development plan (95%+)`,
      value: 'phase-dev',
      short: 'Phase Dev',
    },
    {
      name: `${chalk.bold.magenta('\u{1F441}')} ${chalk.bold('Vision Mode')}             Autonomous MVP from natural language`,
      value: 'vision-mode',
      short: 'Vision Mode',
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
      name: `${chalk.magenta('E)')} ${chalk.bold('GitHub Epic System')}     Manage epics, phases, and testing schedules`,
      value: 'github-epic',
      short: 'Epic System',
    },
    {
      name: `${chalk.dim('R)')} ${chalk.bold('Roadmap Integration')}    ${chalk.dim('(legacy)')} Sync roadmaps with GitHub`,
      value: 'roadmap',
      short: 'Roadmap',
    },
    new inquirer.Separator(),
    {
      name: `${chalk.yellow('S)')} ${chalk.bold('Project Settings')}       Configure deployment, GitHub, tunnels`,
      value: 'project-settings',
      short: 'Settings',
    },
    {
      name: `${chalk.dim('7)')} ${chalk.bold('Help & Examples')}         Documentation and examples`,
      value: 'help',
      short: 'Help',
    },
    {
      name: `${chalk.dim('Q)')} ${chalk.bold('Exit')}`,
      value: 'exit',
      short: 'Exit',
    }
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select an option:',
      choices,
      pageSize: 20,
    },
  ]);

  console.log('');

  switch (action) {
    case 'worktree-sync':
      await handleWorktreeSync();
      await returnToMenu();
      break;

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

    case 'launch-panel':
      await launchPanel();
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

    case 'launch-agent-only':
      await launchAgentOnlySession();
      await returnToMenu();
      break;

    case 'phase-dev':
      await showPhasDevMainMenu();
      await returnToMenu();
      break;

    case 'vision-mode':
      await showVisionModeMenu();
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

    case 'github-epic':
      await showGitHubEpicMenu();
      await returnToMenu();
      break;

    case 'roadmap':
      await showRoadmapMenu();
      await returnToMenu();
      break;

    case 'project-settings':
      await showProjectSettingsMenu();
      await returnToMenu();
      break;

    case 'exit':
      console.log(chalk.dim('Goodbye!'));
      process.exit(0);
  }
}

/**
 * Mobile-optimized main menu handler
 */
async function showMobileMainMenu() {
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
async function showMobilePanelLoop() {
  const { showMobilePanel } = await import('../mobile-menu.js');

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
      const { copyToClipboard } = await import('../../panel/queue.js');
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
async function showMobileSettingsLoop() {
  const { showMobileSettings } = await import('../mobile-menu.js');

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
    } = await import('./settings.js');

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
