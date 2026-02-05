/**
 * Settings Flow - Configuration menus and helpers
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess } from '../menu/display.js';
import {
  getBypassPermissionsStatus,
  getVisionEpicsStatus,
  toggleBypassPermissions,
  toggleVisionEpics,
  getDeployCommand,
} from '../menu/helpers.js';
import { loadTechStack, saveTechStack } from '../../utils.js';

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
  console.log(chalk.cyan('║') + '   [6] Ralph Loop                                                              ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Occurrence auditor, max iterations, web search                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                               ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   [7] GitHub Task                                                             ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('       └─ Auto-split detection, parallel agents, post-creation                ') + chalk.cyan('║'));
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
        { name: '6. Ralph Loop', value: 'ralph-loop' },
        { name: '7. GitHub Task', value: 'github-task' },
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
    case 'ralph-loop':
      await configureRalphLoop(techStack);
      break;
    case 'github-task':
      await configureGitHubTask(techStack);
      break;
  }

  // Show submenu again
  await showProjectSettingsMenu();
}

/**
 * Configure GitHub Project Board
 */
export async function configureGitHub(techStack) {
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
export async function configureDeployment(techStack) {
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
export async function configureTunnel(techStack) {
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
export async function configureToken(techStack) {
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
export async function configureHappy(techStack) {
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
 * Configure Ralph Loop Settings
 */
async function configureRalphLoop(techStack) {
  console.log('');
  showHeader('Ralph Loop Configuration');

  console.log(chalk.dim('  Configure Ralph Loop test-fix cycles and occurrence auditing.\n'));

  const current = techStack.ralphLoop || {};
  const occurrenceAudit = current.occurrenceAudit || {};

  const answers = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxIterations',
      message: 'Maximum iterations before stopping:',
      default: current.maxIterations || 10,
    },
    {
      type: 'confirm',
      name: 'webSearchEnabled',
      message: 'Enable web search for solutions (every 3rd failure)?',
      default: current.webSearchEnabled !== false,
    },
    {
      type: 'confirm',
      name: 'occurrenceAuditEnabled',
      message: 'Enable Occurrence Auditor (scan for similar patterns after fix)?',
      default: occurrenceAudit.enabled !== false,
    },
    {
      type: 'list',
      name: 'auditScope',
      message: 'Occurrence audit scope:',
      when: (ans) => ans.occurrenceAuditEnabled,
      choices: [
        { name: 'Same directory only', value: 'directory' },
        { name: 'Entire project (recommended)', value: 'project' },
        { name: 'Custom glob pattern', value: 'custom' },
      ],
      default: occurrenceAudit.scope || 'project',
    },
    {
      type: 'input',
      name: 'customGlob',
      message: 'Custom glob pattern (e.g., "src/**/*.ts"):',
      when: (ans) => ans.auditScope === 'custom',
      default: occurrenceAudit.customGlob || 'src/**/*.{js,ts,jsx,tsx}',
    },
    {
      type: 'list',
      name: 'autoApplyThreshold',
      message: 'Auto-apply patches threshold:',
      when: (ans) => ans.occurrenceAuditEnabled,
      choices: [
        { name: 'Never - always ask (safest)', value: 'never' },
        { name: '1-2 matches - auto-apply if few', value: '1-2' },
        { name: '3+ matches - auto-apply if many (use with caution)', value: '3+' },
      ],
      default: occurrenceAudit.autoApplyThreshold || 'never',
    },
  ]);

  techStack.ralphLoop = {
    maxIterations: answers.maxIterations,
    webSearchEnabled: answers.webSearchEnabled,
    occurrenceAudit: {
      enabled: answers.occurrenceAuditEnabled,
      scope: answers.auditScope || 'project',
      customGlob: answers.customGlob || null,
      autoApplyThreshold: answers.autoApplyThreshold || 'never',
    },
  };

  saveTechStack(techStack);
  showSuccess('Ralph Loop configuration saved!', [
    '',
    `Max iterations: ${answers.maxIterations}`,
    `Web search: ${answers.webSearchEnabled ? 'Enabled' : 'Disabled'}`,
    `Occurrence auditor: ${answers.occurrenceAuditEnabled ? 'Enabled' : 'Disabled'}`,
  ]);
}

/**
 * Configure GitHub Task Settings
 */
async function configureGitHubTask(techStack) {
  console.log('');
  showHeader('GitHub Task Configuration');

  console.log(chalk.dim('  Configure /github-task and /github-task-multiple behavior.\n'));

  const current = techStack.githubTask || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'autoSplitMode',
      message: 'Auto-split detection for multi-task prompts:',
      choices: [
        { name: 'Suggest - show recommendation (recommended)', value: 'suggest' },
        { name: 'Automatic - auto-split without prompting', value: 'automatic' },
        { name: 'Disabled - always create single issue', value: 'disabled' },
      ],
      default: current.autoSplitMode || 'suggest',
    },
    {
      type: 'list',
      name: 'defaultPostAction',
      message: 'After creating multiple issues:',
      choices: [
        { name: 'Ask every time', value: 'ask' },
        { name: 'Always create Phase Dev Plan', value: 'phase-dev' },
        { name: 'Always create Epic', value: 'epic' },
        { name: 'Always add to Project Board only', value: 'board' },
        { name: 'No grouping (standalone issues)', value: 'none' },
      ],
      default: current.defaultPostAction || 'ask',
    },
    {
      type: 'list',
      name: 'parallelAgentModel',
      message: 'Model for parallel issue creation agents:',
      choices: [
        { name: 'Sonnet 4.5 - thorough analysis (recommended)', value: 'sonnet' },
        { name: 'Haiku - fast, cost-effective', value: 'haiku' },
      ],
      default: current.parallelAgentModel || 'sonnet',
    },
    {
      type: 'number',
      name: 'maxParallelIssues',
      message: 'Maximum issues to create in parallel:',
      default: current.maxParallelIssues || 6,
    },
    {
      type: 'confirm',
      name: 'autoAddToProjectBoard',
      message: 'Automatically add created issues to Project Board?',
      default: current.autoAddToProjectBoard !== false,
    },
  ]);

  techStack.githubTask = {
    autoSplitMode: answers.autoSplitMode,
    defaultPostAction: answers.defaultPostAction,
    parallelAgentModel: answers.parallelAgentModel,
    maxParallelIssues: answers.maxParallelIssues,
    autoAddToProjectBoard: answers.autoAddToProjectBoard,
    defaultLabels: current.defaultLabels || ['enhancement'],
  };

  saveTechStack(techStack);
  showSuccess('GitHub Task configuration saved!', [
    '',
    `Auto-split: ${answers.autoSplitMode}`,
    `Post-creation: ${answers.defaultPostAction}`,
    `Agent model: ${answers.parallelAgentModel}`,
  ]);
}

/**
 * Configure Vision & Epics
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
      const { runIntegrationWizard } = await import('../../pm-hierarchy/integration-wizard.js');
      await runIntegrationWizard({ cwd: process.cwd() });
    } catch (e) {
      console.log(chalk.red(`  Error: ${e.message}`));
    }
  }
}

/**
 * Run Vision & Epics interactive setup
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

