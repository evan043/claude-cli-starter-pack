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
import { showGitHubEpicMenu } from '../commands/github-epic-menu.js';
import { launchPanel, launchPanelInline } from '../commands/panel.js';
import { hasTestingConfig } from '../testing/config.js';
import { showHelp } from '../commands/help.js';
import { hasValidConfig, getVersion, loadTechStack, saveTechStack } from '../utils.js';
import { performVersionCheck, formatUpdateBanner } from '../utils/version-check.js';
import { isHappyMode, shouldUseMobileUI } from '../utils/happy-detect.js';
import { showMobileMenu, showMobilePanel, showMobileSettings, mobileReturnPrompt } from './mobile-menu.js';

// Import from extracted modules
import {
  showHeader,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  BANNER,
  getBypassPermissionsStatus,
  getVisionEpicsStatus,
  toggleVisionEpics,
  toggleBypassPermissions,
  showDevModeIndicator,
  checkPendingRestore,
  getDeployCommand,
  launchAgentOnlySession,
} from './menu/index.js';

// Re-export display functions for backwards compatibility
export { showHeader, showSuccess, showError, showWarning, showInfo };

/**
 * Show Project Settings submenu
 */
export async function showProjectSettingsMenu() {
  // Get current bypass status for display
  const bypassEnabled = getBypassPermissionsStatus();
  const bypassStatus = bypassEnabled ? chalk.green('ON') : chalk.red('OFF');
  const bypassLine = `   [P] Bypass All Permissions                             [${bypassStatus}]`;
  // eslint-disable-next-line no-control-regex
  const bypassPadding = ' '.repeat(79 - bypassLine.replace(/\x1B\[[0-9;]*m/g, '').length - 1);

  // Get Vision & Epics status
  const visionEpicsEnabled = getVisionEpicsStatus();
  const visionStatus = visionEpicsEnabled ? chalk.green('ON') : chalk.red('OFF');
  const visionLine = `   [V] Vision & Epics                                     [${visionStatus}]`;
  // eslint-disable-next-line no-control-regex
  const visionPadding = ' '.repeat(79 - visionLine.replace(/\x1B\[[0-9;]*m/g, '').length - 1);

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                           PROJECT CONFIGURATION                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + bypassLine + bypassPadding + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Toggle auto-approve all tool calls (use with caution)               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + visionLine + visionPadding + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Enable strategic Vision & Epics layer (disabled by default)         ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('╠───────────────────────────────────────────────────────────────────────────────╣'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [1] GitHub Project Board                                                    ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Connect to GitHub Projects v2 for issue tracking                     ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [2] Deployment Platforms                                                    ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Configure Railway, Cloudflare, Vercel, or self-hosted               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [3] Tunnel Services                                                         ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Set up ngrok, localtunnel, or cloudflare-tunnel                     ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [4] Token Management                                                        ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Customize daily budget and thresholds                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [5] Happy Mode                                                              ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Configure mobile app integration                                    ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [B] Back to main menu                                                       ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  const { settingsAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'settingsAction',
      message: 'Select a configuration area:',
      choices: [
        { name: `P. Bypass All Permissions [${bypassEnabled ? 'ON' : 'OFF'}]`, value: 'bypass' },
        { name: `V. Vision & Epics [${visionEpicsEnabled ? 'ON' : 'OFF'}]`, value: 'vision-epics' },
        new inquirer.Separator(),
        { name: '1. GitHub Project Board', value: 'github' },
        { name: '2. Deployment Platforms', value: 'deployment' },
        { name: '3. Tunnel Services', value: 'tunnel' },
        { name: '4. Token Management', value: 'token' },
        { name: '5. Happy Mode', value: 'happy' },
        new inquirer.Separator(),
        { name: 'Back to main menu', value: 'back' },
      ],
    },
  ]);

  if (settingsAction === 'back') {
    return;
  }

  // Handle bypass toggle
  if (settingsAction === 'bypass') {
    const newState = toggleBypassPermissions();
    console.log('');
    if (newState) {
      console.log(chalk.green('  ✓ Bypass All Permissions: ON'));
      console.log(chalk.yellow('    All tool calls will be auto-approved'));
    } else {
      console.log(chalk.green('  ✓ Bypass All Permissions: OFF'));
      console.log(chalk.dim('    Using Accept Edits mode (prompts for Edit/Write/Bash)'));
    }
    console.log('');
    await showProjectSettingsMenu();
    return;
  }

  // Handle Vision & Epics toggle/configuration
  if (settingsAction === 'vision-epics') {
    await configureVisionEpics();
    await showProjectSettingsMenu();
    return;
  }

  // Load current tech-stack.json
  const techStack = loadTechStack();

  switch (settingsAction) {
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

  // Show submenu again
  await showProjectSettingsMenu();
}

/**
 * Configure GitHub Project Board
 */
async function configureGitHub(techStack) {
  console.log('');
  showHeader('GitHub Project Board Configuration');

  const current = techStack.versionControl || {};
  const currentBoard = current.projectBoard || {};

  console.log(chalk.dim('  Current settings:'));
  console.log(chalk.dim(`    Provider: ${current.provider || 'not set'}`));
  console.log(chalk.dim(`    Owner: ${current.owner || 'not set'}`));
  console.log(chalk.dim(`    Repo: ${current.repo || 'not set'}`));
  console.log(chalk.dim(`    Project #: ${currentBoard.number || 'not set'}`));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'owner',
      message: 'GitHub owner (username or org):',
      default: current.owner || '',
    },
    {
      type: 'input',
      name: 'repo',
      message: 'Repository name:',
      default: current.repo || '',
    },
    {
      type: 'number',
      name: 'projectNumber',
      message: 'GitHub Project number (from URL):',
      default: currentBoard.number || null,
    },
    {
      type: 'input',
      name: 'defaultBranch',
      message: 'Default branch:',
      default: current.defaultBranch || 'main',
    },
  ]);

  // Update tech-stack
  techStack.versionControl = {
    ...current,
    provider: 'github',
    owner: answers.owner,
    repo: answers.repo,
    defaultBranch: answers.defaultBranch,
    projectBoard: {
      type: 'github-projects',
      number: answers.projectNumber,
      url: answers.owner && answers.projectNumber
        ? `https://github.com/users/${answers.owner}/projects/${answers.projectNumber}`
        : null,
    },
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'githubIntegration');
  }

  saveTechStack(techStack);
  showSuccess('GitHub configuration saved!');
}

/**
 * Configure Deployment Platforms
 */
async function configureDeployment(techStack) {
  console.log('');
  showHeader('Deployment Platform Configuration');

  const { target } = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Which deployment target do you want to configure?',
      choices: [
        { name: 'Frontend (static sites, SPAs)', value: 'frontend' },
        { name: 'Backend (APIs, servers)', value: 'backend' },
        { name: 'Both', value: 'both' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (target === 'back') return;

  if (target === 'frontend' || target === 'both') {
    const frontendAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Frontend deployment platform:',
        choices: [
          { name: 'Cloudflare Pages', value: 'cloudflare' },
          { name: 'Vercel', value: 'vercel' },
          { name: 'Netlify', value: 'netlify' },
          { name: 'GitHub Pages', value: 'github-pages' },
          { name: 'Railway', value: 'railway' },
          { name: 'Self-hosted', value: 'self-hosted' },
          { name: 'None / Skip', value: 'none' },
        ],
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name (for deployment commands):',
        when: (ans) => ans.platform !== 'none',
      },
      {
        type: 'input',
        name: 'productionUrl',
        message: 'Production URL:',
        when: (ans) => ans.platform !== 'none',
      },
    ]);

    techStack.deployment = techStack.deployment || {};
    techStack.deployment.frontend = {
      platform: frontendAnswers.platform,
      projectName: frontendAnswers.projectName || null,
      productionUrl: frontendAnswers.productionUrl || null,
      deployCommand: getDeployCommand('frontend', frontendAnswers),
    };
  }

  if (target === 'backend' || target === 'both') {
    const backendAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Backend deployment platform:',
        choices: [
          { name: 'Railway', value: 'railway' },
          { name: 'Heroku', value: 'heroku' },
          { name: 'Render', value: 'render' },
          { name: 'Fly.io', value: 'fly' },
          { name: 'Vercel', value: 'vercel' },
          { name: 'DigitalOcean', value: 'digitalocean' },
          { name: 'Self-hosted (SSH)', value: 'self-hosted' },
          { name: 'None / Skip', value: 'none' },
        ],
      },
      {
        type: 'input',
        name: 'projectId',
        message: 'Project ID (from platform dashboard):',
        when: (ans) => ['railway', 'render', 'fly'].includes(ans.platform),
      },
      {
        type: 'input',
        name: 'serviceId',
        message: 'Service ID:',
        when: (ans) => ans.platform === 'railway',
      },
      {
        type: 'input',
        name: 'environmentId',
        message: 'Environment ID:',
        when: (ans) => ans.platform === 'railway',
      },
      {
        type: 'input',
        name: 'productionUrl',
        message: 'Production URL:',
        when: (ans) => ans.platform !== 'none',
      },
    ]);

    // Handle self-hosted config
    let selfHostedConfig = null;
    if (backendAnswers.platform === 'self-hosted') {
      const sshAnswers = await inquirer.prompt([
        { type: 'input', name: 'sshUser', message: 'SSH username:' },
        { type: 'input', name: 'sshHost', message: 'SSH host:' },
        { type: 'number', name: 'sshPort', message: 'SSH port:', default: 22 },
        { type: 'input', name: 'appPath', message: 'App path on server:' },
        { type: 'input', name: 'deployScript', message: 'Deploy script/command:', default: './deploy.sh' },
      ]);
      selfHostedConfig = sshAnswers;
    }

    techStack.deployment = techStack.deployment || {};
    techStack.deployment.backend = {
      platform: backendAnswers.platform,
      projectId: backendAnswers.projectId || null,
      serviceId: backendAnswers.serviceId || null,
      environmentId: backendAnswers.environmentId || null,
      productionUrl: backendAnswers.productionUrl || null,
      selfHostedConfig,
    };
  }

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'deploymentAutomation');
  }

  saveTechStack(techStack);
  showSuccess('Deployment configuration saved!');
}

/**
 * Configure Tunnel Services
 */
async function configureTunnel(techStack) {
  console.log('');
  showHeader('Tunnel Service Configuration');

  console.log(chalk.dim('  Tunnel services expose your local development server to the internet.'));
  console.log(chalk.dim('  Useful for mobile testing, webhooks, or sharing work-in-progress.\n'));

  const current = techStack.devEnvironment?.tunnel || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'service',
      message: 'Which tunnel service would you like to use?',
      choices: [
        { name: 'None - I don\'t need tunnel access', value: 'none' },
        { name: 'ngrok - Popular tunneling service (requires ngrok CLI)', value: 'ngrok' },
        { name: 'localtunnel - Free, no signup required', value: 'localtunnel' },
        { name: 'cloudflare-tunnel - Enterprise-grade (requires CF account)', value: 'cloudflare-tunnel' },
        { name: 'serveo - Free SSH-based tunneling', value: 'serveo' },
        { name: 'Other - I\'ll configure manually', value: 'other' },
      ],
      default: current.service || 'none',
    },
    {
      type: 'input',
      name: 'subdomain',
      message: 'Reserved subdomain (optional):',
      when: (ans) => ['ngrok', 'localtunnel'].includes(ans.service),
      default: current.subdomain || '',
    },
    {
      type: 'number',
      name: 'adminPort',
      message: 'Admin/API port (for ngrok):',
      when: (ans) => ans.service === 'ngrok',
      default: current.adminPort || 4040,
    },
  ]);

  // Build start command based on service
  let startCommand = null;
  const frontendPort = techStack.frontend?.port || 5173;

  switch (answers.service) {
    case 'ngrok':
      startCommand = answers.subdomain
        ? `ngrok http ${frontendPort} --subdomain=${answers.subdomain}`
        : `ngrok http ${frontendPort}`;
      break;
    case 'localtunnel':
      startCommand = answers.subdomain
        ? `lt --port ${frontendPort} --subdomain ${answers.subdomain}`
        : `lt --port ${frontendPort}`;
      break;
    case 'cloudflare-tunnel':
      startCommand = `cloudflared tunnel --url http://localhost:${frontendPort}`;
      break;
    case 'serveo':
      startCommand = `ssh -R 80:localhost:${frontendPort} serveo.net`;
      break;
  }

  techStack.devEnvironment = techStack.devEnvironment || {};
  techStack.devEnvironment.tunnel = {
    service: answers.service,
    subdomain: answers.subdomain || null,
    url: null, // Set when tunnel is running
    startCommand,
    adminPort: answers.adminPort || null,
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'tunnelServices');
  }

  saveTechStack(techStack);
  showSuccess('Tunnel configuration saved!', [
    '',
    answers.service !== 'none' ? `Start command: ${startCommand}` : 'Tunnel disabled',
  ]);
}

/**
 * Configure Token Management
 */
async function configureToken(techStack) {
  console.log('');
  showHeader('Token Budget Management Configuration');

  const current = techStack.tokenManagement || {};
  const thresholds = current.thresholds || {};

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable token budget tracking?',
      default: current.enabled || false,
    },
    {
      type: 'number',
      name: 'dailyBudget',
      message: 'Daily token budget:',
      when: (ans) => ans.enabled,
      default: current.dailyBudget || 200000,
    },
    {
      type: 'number',
      name: 'compactThreshold',
      message: 'Compact suggestion threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.compact || 0.75,
    },
    {
      type: 'number',
      name: 'archiveThreshold',
      message: 'Archive suggestion threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.archive || 0.85,
    },
    {
      type: 'number',
      name: 'respawnThreshold',
      message: 'Force respawn threshold (0-1):',
      when: (ans) => ans.enabled,
      default: thresholds.respawn || 0.90,
    },
  ]);

  techStack.tokenManagement = {
    enabled: answers.enabled,
    dailyBudget: answers.dailyBudget || 200000,
    thresholds: answers.enabled ? {
      compact: answers.compactThreshold,
      archive: answers.archiveThreshold,
      respawn: answers.respawnThreshold,
    } : thresholds,
    trackingFile: current.trackingFile || '.claude/hooks/cache/token-usage.json',
  };

  saveTechStack(techStack);
  showSuccess('Token management configuration saved!');
}

/**
 * Configure Happy Mode
 */
async function configureHappy(techStack) {
  console.log('');
  showHeader('Happy Mode Configuration');

  console.log(chalk.dim('  Happy Mode enables integration with the Happy Coder mobile app'));
  console.log(chalk.dim('  for remote session control, checkpoints, and mobile-optimized responses.\n'));

  const current = techStack.happyMode || {};
  const notifications = current.notifications || {};

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable Happy Mode integration?',
      default: current.enabled || false,
    },
    {
      type: 'input',
      name: 'dashboardUrl',
      message: 'Dashboard URL (if self-hosted, leave blank for cloud):',
      when: (ans) => ans.enabled,
      default: current.dashboardUrl || '',
    },
    {
      type: 'number',
      name: 'checkpointInterval',
      message: 'Checkpoint interval (minutes):',
      when: (ans) => ans.enabled,
      default: current.checkpointInterval || 10,
    },
    {
      type: 'list',
      name: 'verbosity',
      message: 'Response verbosity for mobile:',
      when: (ans) => ans.enabled,
      choices: [
        { name: 'Full - Complete responses', value: 'full' },
        { name: 'Condensed - Summarized responses (recommended)', value: 'condensed' },
        { name: 'Minimal - Bare essentials only', value: 'minimal' },
      ],
      default: current.verbosity || 'condensed',
    },
    {
      type: 'confirm',
      name: 'notifyTaskComplete',
      message: 'Notify on task completion?',
      when: (ans) => ans.enabled,
      default: notifications.onTaskComplete !== false,
    },
    {
      type: 'confirm',
      name: 'notifyError',
      message: 'Notify on errors?',
      when: (ans) => ans.enabled,
      default: notifications.onError !== false,
    },
  ]);

  techStack.happyMode = {
    enabled: answers.enabled,
    dashboardUrl: answers.dashboardUrl || null,
    checkpointInterval: answers.checkpointInterval || 10,
    verbosity: answers.verbosity || 'condensed',
    notifications: answers.enabled ? {
      onTaskComplete: answers.notifyTaskComplete,
      onError: answers.notifyError,
      onCheckpoint: false,
    } : notifications,
  };

  // Remove from pending configuration
  if (techStack._pendingConfiguration) {
    techStack._pendingConfiguration = techStack._pendingConfiguration.filter((f) => f !== 'happyMode');
  }

  saveTechStack(techStack);
  showSuccess('Happy Mode configuration saved!');
}

/**
 * Configure Vision & Epics
 * Interactive configuration flow that reviews codebase and tech stack
 */
async function configureVisionEpics() {
  const techStack = loadTechStack();
  const currentState = techStack?.visionEpics?.enabled || false;

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                        VISION & EPICS CONFIGURATION                          ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  Vision & Epics adds strategic planning layers to your project:              ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('                                                                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  • Vision: AI-managed strategic direction with OKRs (auto-reminders)         ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  • Epics: User-managed initiatives contained within Vision                   ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('                                                                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.yellow('  Note: Roadmaps, Phase Dev Plans, and Task Lists work independently         ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.yellow('  and are always available regardless of this setting.                       ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Check prerequisites
  const hasTechStack = techStack && Object.keys(techStack).length > 0;
  const hasProjectName = techStack?.project?.name;
  const hasFramework = techStack?.framework || techStack?.frontend?.framework || techStack?.backend?.framework;

  if (!hasTechStack || !hasProjectName || !hasFramework) {
    console.log(chalk.yellow('  ⚠️  Prerequisites not met for Vision & Epics:\n'));

    if (!hasProjectName) {
      console.log(chalk.red('     • Project name not configured'));
    }
    if (!hasFramework) {
      console.log(chalk.red('     • Tech stack not detected (run ccasp init first)'));
    }

    console.log('');
    console.log(chalk.dim('  Vision & Epics requires a scaffolded project with tech stack configured.'));
    console.log(chalk.dim('  Run "ccasp init" or "ccasp wizard" first to set up your project.'));
    console.log('');

    await inquirer.prompt([
      { type: 'input', name: 'continue', message: 'Press Enter to continue...' }
    ]);
    return;
  }

  // Show current status
  console.log(chalk.dim(`  Current status: ${currentState ? chalk.green('ENABLED') : chalk.red('DISABLED')}`));
  console.log(chalk.dim(`  Project: ${techStack.project?.name || 'Unknown'}`));
  console.log(chalk.dim(`  Framework: ${techStack.framework || techStack.frontend?.framework || 'Unknown'}`));
  console.log('');

  // Ask what to do
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: currentState ? 'Disable Vision & Epics' : 'Enable Vision & Epics', value: 'toggle' },
        { name: 'Configure Vision settings', value: 'configure-vision', disabled: !currentState },
        { name: 'Configure Epic defaults', value: 'configure-epic', disabled: !currentState },
        { name: 'Configure integrations (GitHub, Jira, Linear, ClickUp)', value: 'configure-integrations' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return;
  }

  if (action === 'toggle') {
    if (!currentState) {
      // Enabling - show interactive configuration
      await runVisionEpicsSetup(techStack);
    } else {
      // Disabling
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Disable Vision & Epics? (Your data will be preserved)',
          default: false,
        },
      ]);

      if (confirm) {
        techStack.visionEpics = { ...techStack.visionEpics, enabled: false };
        saveTechStack(techStack);
        console.log(chalk.green('\n  ✓ Vision & Epics disabled'));
        console.log(chalk.dim('    Roadmaps, Phase Dev Plans, and Task Lists remain available.'));
        console.log('');
      }
    }
  } else if (action === 'configure-vision') {
    await configureVisionSettings(techStack);
  } else if (action === 'configure-epic') {
    await configureEpicDefaults(techStack);
  } else if (action === 'configure-integrations') {
    // Import and run integration wizard
    try {
      const { runIntegrationWizard } = await import('../pm-hierarchy/integration-wizard.js');
      await runIntegrationWizard({ cwd: process.cwd() });
    } catch (e) {
      console.log(chalk.red(`  Error: ${e.message}`));
    }
  }
}

/**
 * Run Vision & Epics interactive setup
 * Reviews codebase and tech stack, asks questions
 */
async function runVisionEpicsSetup(techStack) {
  console.log('');
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan('  Setting up Vision & Epics for your project'));
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // Analyze tech stack
  console.log(chalk.dim('  Analyzing your project configuration...\n'));

  const projectInfo = {
    name: techStack.project?.name || 'Unknown Project',
    framework: techStack.framework || techStack.frontend?.framework || 'Unknown',
    backend: techStack.backend?.framework || null,
    database: techStack.database?.type || null,
    hasGitHub: !!techStack.versionControl?.owner,
  };

  console.log(chalk.dim(`  Project: ${projectInfo.name}`));
  console.log(chalk.dim(`  Frontend: ${projectInfo.framework}`));
  if (projectInfo.backend) console.log(chalk.dim(`  Backend: ${projectInfo.backend}`));
  if (projectInfo.database) console.log(chalk.dim(`  Database: ${projectInfo.database}`));
  console.log(chalk.dim(`  GitHub: ${projectInfo.hasGitHub ? 'Connected' : 'Not configured'}`));
  console.log('');

  // Ask configuration questions
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'visionTitle',
      message: 'What is the overall vision/goal for this project?',
      default: `${projectInfo.name} Development`,
    },
    {
      type: 'list',
      name: 'visionPeriod',
      message: 'Vision timeline period:',
      choices: [
        { name: 'Quarterly (3 months)', value: 'quarterly' },
        { name: 'Yearly (12 months)', value: 'yearly' },
        { name: 'Custom', value: 'custom' },
      ],
      default: 'quarterly',
    },
    {
      type: 'confirm',
      name: 'enableReminders',
      message: 'Enable ahead-of-schedule reminders for vision updates?',
      default: true,
    },
    {
      type: 'number',
      name: 'reminderThreshold',
      message: 'Remind when ahead by what percentage?',
      default: 20,
      when: (ans) => ans.enableReminders,
    },
    {
      type: 'list',
      name: 'primaryIntegration',
      message: 'Primary external integration:',
      choices: [
        { name: 'GitHub (recommended)', value: 'github' },
        { name: 'Jira', value: 'jira' },
        { name: 'Linear', value: 'linear' },
        { name: 'ClickUp', value: 'clickup' },
        { name: 'None', value: 'none' },
      ],
      default: projectInfo.hasGitHub ? 'github' : 'none',
    },
  ]);

  // Save configuration
  techStack.visionEpics = {
    enabled: true,
    configuredAt: new Date().toISOString(),
    vision: {
      title: answers.visionTitle,
      period: answers.visionPeriod,
      reminders: {
        enabled: answers.enableReminders,
        thresholdPercent: answers.reminderThreshold || 20,
      },
    },
    primaryIntegration: answers.primaryIntegration,
  };

  saveTechStack(techStack);

  console.log('');
  console.log(chalk.green('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('  ✓ Vision & Epics enabled successfully!'));
  console.log(chalk.green('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.dim('  Next steps:'));
  console.log(chalk.dim('  1. Use /github-epic-menu to create your first Epic'));
  console.log(chalk.dim('  2. Link Roadmaps to Epics for strategic tracking'));
  console.log(chalk.dim('  3. Vision will auto-remind when you\'re ahead of schedule'));
  console.log('');
}

/**
 * Configure Vision settings
 */
async function configureVisionSettings(techStack) {
  console.log('');
  showHeader('Vision Settings');

  const current = techStack.visionEpics?.vision || {};

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Vision title:',
      default: current.title || '',
    },
    {
      type: 'list',
      name: 'period',
      message: 'Timeline period:',
      choices: [
        { name: 'Quarterly (3 months)', value: 'quarterly' },
        { name: 'Yearly (12 months)', value: 'yearly' },
        { name: 'Custom', value: 'custom' },
      ],
      default: current.period || 'quarterly',
    },
    {
      type: 'list',
      name: 'generationTrigger',
      message: 'Vision generation trigger:',
      choices: [
        { name: 'Manual only', value: 'manual' },
        { name: 'On major completion', value: 'on_completion' },
        { name: 'Scheduled', value: 'scheduled' },
      ],
      default: current.generationTrigger || 'manual',
    },
    {
      type: 'confirm',
      name: 'enableReminders',
      message: 'Enable ahead-of-schedule reminders?',
      default: current.reminders?.enabled ?? true,
    },
    {
      type: 'number',
      name: 'reminderThreshold',
      message: 'Reminder threshold (% ahead):',
      default: current.reminders?.thresholdPercent || 20,
      when: (ans) => ans.enableReminders,
    },
  ]);

  techStack.visionEpics.vision = {
    ...current,
    title: answers.title,
    period: answers.period,
    generationTrigger: answers.generationTrigger,
    reminders: {
      enabled: answers.enableReminders,
      thresholdPercent: answers.reminderThreshold || 20,
    },
  };

  saveTechStack(techStack);
  showSuccess('Vision settings saved!');
}

/**
 * Configure Epic defaults
 */
async function configureEpicDefaults(techStack) {
  console.log('');
  showHeader('Epic Defaults');

  const current = techStack.visionEpics?.epicDefaults || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'defaultType',
      message: 'Default Epic type:',
      choices: [
        { name: 'Feature', value: 'feature' },
        { name: 'Quarterly goal', value: 'quarterly' },
        { name: 'Initiative', value: 'initiative' },
      ],
      default: current.type || 'feature',
    },
    {
      type: 'list',
      name: 'defaultPriority',
      message: 'Default priority:',
      choices: [
        { name: 'P0 - Critical', value: 'P0' },
        { name: 'P1 - High', value: 'P1' },
        { name: 'P2 - Medium', value: 'P2' },
        { name: 'P3 - Low', value: 'P3' },
        { name: 'P4 - Minimal', value: 'P4' },
      ],
      default: current.priority || 'P2',
    },
    {
      type: 'confirm',
      name: 'autoLinkRoadmaps',
      message: 'Auto-link new roadmaps to active epics?',
      default: current.autoLinkRoadmaps ?? false,
    },
    {
      type: 'confirm',
      name: 'generateTestingIssues',
      message: 'Generate testing issues on phase completion?',
      default: current.generateTestingIssues ?? true,
    },
  ]);

  techStack.visionEpics.epicDefaults = {
    type: answers.defaultType,
    priority: answers.defaultPriority,
    autoLinkRoadmaps: answers.autoLinkRoadmaps,
    generateTestingIssues: answers.generateTestingIssues,
  };

  saveTechStack(techStack);
  showSuccess('Epic defaults saved!');
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

  // Check for updates (uses 1-hour cache)
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
    },
  ];

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
 * Mobile-optimized main menu handler
 * Routes actions from the mobile menu to their handlers
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
      const { copyToClipboard } = await import('../panel/queue.js');
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
  while (true) {
    const action = await showMobileSettings();

    if (action === 'back') {
      return;
    }

    const techStack = loadTechStack();

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
