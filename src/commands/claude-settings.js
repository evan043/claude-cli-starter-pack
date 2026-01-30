/**
 * Claude Settings Command
 *
 * Configure Claude Code CLI settings including:
 * - Bypass All Permissions mode
 * - Agent Only mode shortcuts
 * - Permission rules
 * - MCP server configuration
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';

/**
 * Default GitHub settings schema
 */
const DEFAULT_GITHUB_SETTINGS = {
  repository: {
    owner: '',
    name: '',
  },
  project: {
    number: null,
    id: '',
  },
  defaults: {
    branch: 'main',
    createFeatureBranches: false,
    useWorktreesForPhaseDev: true,
    labels: ['feature'],
    priority: 'P2-Medium',
    qa: 'Not Required',
    agent: 'general-purpose',
  },
  workflow: {
    autoFixBlankFields: true,
    autoReorderOnCreate: false,
    generateTestsByDefault: false,
    taskListsAsPRs: false,
    autoDeployOnComplete: true,
  },
  pr: {
    baseBranch: 'main',
    autoCloseIssues: true,
    squashMerge: true,
    deleteBranchAfterMerge: true,
  },
};

/**
 * Permission modes for Claude CLI
 */
const PERMISSION_MODES = {
  bypassPermissions: {
    name: 'Bypass All Permissions',
    description: 'Auto-approve all tool calls without prompting',
    recommended: false,
    warning: 'Use only in trusted environments',
  },
  acceptEdits: {
    name: 'Accept Edits',
    description: 'Auto-approve Read/Glob/Grep, prompt for Edit/Write/Bash',
    recommended: true,
  },
  ask: {
    name: 'Ask for Each',
    description: 'Prompt for every tool call (most secure)',
    recommended: false,
  },
};

/**
 * Run the Claude settings wizard
 */
export async function runClaudeSettings(options) {
  showHeader('Claude CLI Settings');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to configure?',
      choices: [
        {
          name: `${chalk.green('1)')} Configure Permission Mode      Set default permission behavior`,
          value: 'permission-mode',
          short: 'Permission Mode',
        },
        {
          name: `${chalk.cyan('2)')} Create Agent-Only Launcher     Scripts for agent-only execution`,
          value: 'agent-only',
          short: 'Agent Only Launcher',
        },
        {
          name: `${chalk.yellow('3)')} Configure Permissions          Set allow/deny rules`,
          value: 'permissions',
          short: 'Permissions',
        },
        {
          name: `${chalk.blue('4)')} View Current Settings          Show .claude/settings.json`,
          value: 'view',
          short: 'View Settings',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.magenta('5)')} GitHub Settings                Configure project board, PRs, workflow`,
          value: 'github',
          short: 'GitHub Settings',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back / Exit`,
          value: 'exit',
          short: 'Exit',
        },
      ],
    },
  ]);

  if (action === 'exit') {
    return null;
  }

  switch (action) {
    case 'permission-mode':
      return await configurePermissionMode();
    case 'agent-only':
      return await createAgentOnlyLauncher();
    case 'permissions':
      return await configurePermissions();
    case 'view':
      return await viewCurrentSettings();
    case 'github':
      return await configureGitHubSettings();
  }
}

/**
 * Configure the default permission mode
 */
async function configurePermissionMode() {
  showHeader('Permission Mode');

  console.log(chalk.dim('Permission modes control how Claude CLI handles tool approvals.\n'));

  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select default permission mode:',
      choices: Object.entries(PERMISSION_MODES).map(([key, mode]) => ({
        name: `${mode.name}${mode.recommended ? chalk.green(' (Recommended)') : ''}${mode.warning ? chalk.red(' ⚠') : ''}\n   ${chalk.dim(mode.description)}`,
        value: key,
        short: mode.name,
      })),
      default: 'acceptEdits',
    },
  ]);

  // Warn for bypass mode
  if (mode === 'bypassPermissions') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('Warning: Bypass mode auto-approves ALL operations. Continue?'),
        default: false,
      },
    ]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return null;
    }
  }

  // Load or create settings
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      settings = {};
    }
  }

  // Update permission mode
  if (!settings.permissions) {
    settings.permissions = {};
  }
  settings.permissions.defaultMode = mode;

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  showSuccess('Permission Mode Updated', [
    `Mode: ${PERMISSION_MODES[mode].name}`,
    `File: ${settingsPath}`,
  ]);

  return { mode, path: settingsPath };
}

/**
 * Create Agent-Only mode launcher scripts
 */
async function createAgentOnlyLauncher() {
  showHeader('Agent-Only Launcher');

  console.log(chalk.dim('Creates launcher scripts for Agent-Only execution mode.'));
  console.log(chalk.dim('In this mode, Claude delegates all work to agents via Task tool.\n'));

  const { createPolicy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createPolicy',
      message: 'Create AGENT_ONLY_POLICY.md?',
      default: true,
    },
  ]);

  const { createAgents } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createAgents',
      message: 'Create agents.json with custom agent definitions?',
      default: true,
    },
  ]);

  const { platform } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platform',
      message: 'Create launchers for:',
      choices: [
        { name: 'Windows (.bat + .ps1)', value: 'windows', checked: process.platform === 'win32' },
        { name: 'Mac/Linux (.sh)', value: 'unix', checked: process.platform !== 'win32' },
      ],
    },
  ]);

  const spinner = ora('Creating launcher files...').start();
  const files = [];

  // Create .claude directory if needed
  const claudeDir = join(process.cwd(), '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // 1. Create AGENT_ONLY_POLICY.md
  if (createPolicy) {
    const policyContent = generateAgentOnlyPolicy();
    const policyPath = join(claudeDir, 'AGENT_ONLY_POLICY.md');
    writeFileSync(policyPath, policyContent, 'utf8');
    files.push(policyPath);
  }

  // 2. Create agents.json
  if (createAgents) {
    const agentsContent = generateAgentsJson();
    const agentsPath = join(claudeDir, 'agents.json');
    writeFileSync(agentsPath, agentsContent, 'utf8');
    files.push(agentsPath);
  }

  // 3. Create Windows launchers
  if (platform.includes('windows')) {
    const batContent = generateWindowsBatch();
    const batPath = join(process.cwd(), 'start-agent-only.bat');
    writeFileSync(batPath, batContent, 'utf8');
    files.push(batPath);

    const ps1Content = generatePowerShellLauncher();
    const ps1Path = join(process.cwd(), 'claude-agent-only.ps1');
    writeFileSync(ps1Path, ps1Content, 'utf8');
    files.push(ps1Path);
  }

  // 4. Create Unix launcher
  if (platform.includes('unix')) {
    const shContent = generateBashLauncher();
    const shPath = join(process.cwd(), 'claude-agent-only.sh');
    writeFileSync(shPath, shContent, { encoding: 'utf8', mode: 0o755 });
    files.push(shPath);
  }

  spinner.succeed('Launcher files created');

  showSuccess('Agent-Only Launcher Created', [
    ...files.map((f) => f.replace(process.cwd(), '.')),
    '',
    'Usage:',
    platform.includes('windows') ? '  start-agent-only.bat' : '',
    platform.includes('unix') ? '  ./claude-agent-only.sh' : '',
  ].filter(Boolean));

  return { files };
}

/**
 * Configure permission allow/deny rules
 */
async function configurePermissions() {
  showHeader('Permission Rules');

  console.log(chalk.dim('Configure which tools and patterns are allowed or denied.\n'));

  // Load existing settings
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = { permissions: { allow: [], deny: [] } };

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (!settings.permissions) {
        settings.permissions = { allow: [], deny: [] };
      }
    } catch {
      // Use defaults
    }
  }

  // Show current rules
  console.log(chalk.cyan('Current Allow Rules:'));
  if (settings.permissions.allow?.length > 0) {
    settings.permissions.allow.forEach((rule) => console.log(chalk.green(`  + ${rule}`)));
  } else {
    console.log(chalk.dim('  (none)'));
  }

  console.log('');
  console.log(chalk.cyan('Current Deny Rules:'));
  if (settings.permissions.deny?.length > 0) {
    settings.permissions.deny.forEach((rule) => console.log(chalk.red(`  - ${rule}`)));
  } else {
    console.log(chalk.dim('  (none)'));
  }
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Add allow rule', value: 'add-allow' },
        { name: 'Add deny rule', value: 'add-deny' },
        { name: 'Use preset (recommended)', value: 'preset' },
        { name: 'Clear all rules', value: 'clear' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') {
    return null;
  }

  if (action === 'preset') {
    const { preset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'Select preset:',
        choices: [
          { name: 'Permissive - Allow most, deny dangerous', value: 'permissive' },
          { name: 'Balanced - Allow common, deny sensitive', value: 'balanced' },
          { name: 'Strict - Minimal allows, many denies', value: 'strict' },
        ],
      },
    ]);

    const presets = {
      permissive: {
        allow: ['Read(*)', 'Write(src/**)', 'Bash(git:*)', 'MCP(*)'],
        deny: ['Read(.env*)', 'Write(secrets/**)', 'Bash(rm -rf:*)'],
      },
      balanced: {
        allow: ['Read(*)', 'Write(src/**)', 'Bash(git:*)', 'Bash(npm:*)'],
        deny: ['Read(.env*)', 'Write(secrets/**)', 'Bash(rm:*)', 'Bash(sudo:*)'],
      },
      strict: {
        allow: ['Read(src/**)', 'Bash(git status)', 'Bash(git log:*)'],
        deny: ['Read(.env*)', 'Write(*)', 'Bash(rm:*)', 'Bash(sudo:*)', 'WebFetch(*)'],
      },
    };

    settings.permissions.allow = presets[preset].allow;
    settings.permissions.deny = presets[preset].deny;
  } else if (action === 'add-allow' || action === 'add-deny') {
    const { rule } = await inquirer.prompt([
      {
        type: 'input',
        name: 'rule',
        message: `Enter ${action === 'add-allow' ? 'allow' : 'deny'} rule (e.g., "Read(*)", "Bash(git:*)"):`,
        validate: (input) => input.length > 0 || 'Rule cannot be empty',
      },
    ]);

    if (action === 'add-allow') {
      if (!settings.permissions.allow) settings.permissions.allow = [];
      settings.permissions.allow.push(rule);
    } else {
      if (!settings.permissions.deny) settings.permissions.deny = [];
      settings.permissions.deny.push(rule);
    }
  } else if (action === 'clear') {
    settings.permissions.allow = [];
    settings.permissions.deny = [];
  }

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  showSuccess('Permissions Updated', [`File: ${settingsPath}`]);

  return { settings, path: settingsPath };
}

/**
 * View current settings
 */
async function viewCurrentSettings() {
  showHeader('Current Settings');

  const settingsPath = join(process.cwd(), '.claude', 'settings.json');

  if (!existsSync(settingsPath)) {
    showWarning('No .claude/settings.json found.');
    console.log(chalk.dim('Run "gtask claude-settings" to create one.'));
    return null;
  }

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    console.log(chalk.cyan('File: ') + settingsPath);
    console.log('');
    console.log(JSON.stringify(settings, null, 2));
    return settings;
  } catch (err) {
    showError('Failed to read settings', err.message);
    return null;
  }
}

/**
 * Configure GitHub settings submenu
 */
async function configureGitHubSettings() {
  showHeader('GitHub Settings');

  const { section } = await inquirer.prompt([
    {
      type: 'list',
      name: 'section',
      message: 'What would you like to configure?',
      choices: [
        {
          name: `${chalk.green('1)')} Project Board Settings         Repository, project number, field IDs`,
          value: 'project-board',
          short: 'Project Board',
        },
        {
          name: `${chalk.cyan('2)')} Branch & Worktree Strategy     Feature branches vs worktrees`,
          value: 'branch-strategy',
          short: 'Branch Strategy',
        },
        {
          name: `${chalk.yellow('3)')} Task Creation Defaults         Labels, priority, QA requirements`,
          value: 'task-defaults',
          short: 'Task Defaults',
        },
        {
          name: `${chalk.blue('4)')} PR Workflow                    Merge strategy, auto-close issues`,
          value: 'pr-workflow',
          short: 'PR Workflow',
        },
        {
          name: `${chalk.magenta('5)')} Deployment Settings            Auto-deploy on task complete`,
          value: 'deployment',
          short: 'Deployment',
        },
        {
          name: `${chalk.white('6)')} View Current GitHub Settings   Show github section of settings`,
          value: 'view-github',
          short: 'View Settings',
        },
        {
          name: `${chalk.green('7)')} Apply Settings to .claude      Run updater script`,
          value: 'apply',
          short: 'Apply Settings',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back to Main Menu`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  if (section === 'back') {
    return await runClaudeSettings();
  }

  switch (section) {
    case 'project-board':
      return await configureProjectBoard();
    case 'branch-strategy':
      return await configureBranchStrategy();
    case 'task-defaults':
      return await configureTaskDefaults();
    case 'pr-workflow':
      return await configurePRWorkflow();
    case 'deployment':
      return await configureDeployment();
    case 'view-github':
      return await viewGitHubSettings();
    case 'apply':
      return await applyGitHubSettings();
  }
}

/**
 * Load existing GitHub settings or return defaults
 */
function loadGitHubSettings() {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  let settings = { github: { ...DEFAULT_GITHUB_SETTINGS } };

  if (existsSync(settingsPath)) {
    try {
      const fileSettings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (fileSettings.github) {
        settings.github = { ...DEFAULT_GITHUB_SETTINGS, ...fileSettings.github };
      }
      settings = { ...fileSettings, github: settings.github };
    } catch {
      // Use defaults
    }
  }

  return settings;
}

/**
 * Save GitHub settings
 */
function saveGitHubSettings(settings) {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  const dir = dirname(settingsPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return settingsPath;
}

/**
 * Configure Project Board settings
 */
async function configureProjectBoard() {
  showHeader('Project Board Settings');

  const settings = loadGitHubSettings();
  const github = settings.github;

  console.log(chalk.dim('Configure your GitHub repository and project board.\n'));

  // Repository settings
  const repoAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'owner',
      message: 'Repository owner (username or org):',
      default: github.repository?.owner || '',
    },
    {
      type: 'input',
      name: 'name',
      message: 'Repository name:',
      default: github.repository?.name || '',
    },
  ]);

  // Project board settings
  const projectAnswers = await inquirer.prompt([
    {
      type: 'number',
      name: 'number',
      message: 'Project board number (from URL):',
      default: github.project?.number || null,
    },
    {
      type: 'input',
      name: 'id',
      message: 'Project ID (PVT_... from GraphQL, leave blank if unknown):',
      default: github.project?.id || '',
    },
  ]);

  // Update settings
  settings.github.repository = {
    owner: repoAnswers.owner,
    name: repoAnswers.name,
  };
  settings.github.project = {
    number: projectAnswers.number,
    id: projectAnswers.id,
  };

  const path = saveGitHubSettings(settings);

  showSuccess('Project Board Settings Updated', [
    `Repository: ${repoAnswers.owner}/${repoAnswers.name}`,
    `Project #${projectAnswers.number}`,
    `File: ${path}`,
  ]);

  return await configureGitHubSettings();
}

/**
 * Configure Branch & Worktree Strategy
 */
async function configureBranchStrategy() {
  showHeader('Branch & Worktree Strategy');

  const settings = loadGitHubSettings();
  const github = settings.github;

  console.log(chalk.dim('Configure how branches and worktrees are used for development.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'branch',
      message: 'Default base branch:',
      default: github.defaults?.branch || 'main',
    },
    {
      type: 'confirm',
      name: 'createFeatureBranches',
      message: 'Create feature branches for each task?',
      default: github.defaults?.createFeatureBranches || false,
    },
    {
      type: 'confirm',
      name: 'useWorktreesForPhaseDev',
      message: 'Use git worktrees for phase-dev projects? (recommended for large projects)',
      default: github.defaults?.useWorktreesForPhaseDev !== false,
    },
  ]);

  settings.github.defaults = {
    ...settings.github.defaults,
    branch: answers.branch,
    createFeatureBranches: answers.createFeatureBranches,
    useWorktreesForPhaseDev: answers.useWorktreesForPhaseDev,
  };

  const path = saveGitHubSettings(settings);

  showSuccess('Branch Strategy Updated', [
    `Base branch: ${answers.branch}`,
    `Feature branches: ${answers.createFeatureBranches ? 'Yes' : 'No'}`,
    `Worktrees for phase-dev: ${answers.useWorktreesForPhaseDev ? 'Yes' : 'No'}`,
    `File: ${path}`,
  ]);

  return await configureGitHubSettings();
}

/**
 * Configure Task Creation Defaults
 */
async function configureTaskDefaults() {
  showHeader('Task Creation Defaults');

  const settings = loadGitHubSettings();
  const github = settings.github;

  console.log(chalk.dim('Configure default values for new GitHub issues/tasks.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'labels',
      message: 'Default labels for new issues:',
      choices: [
        { name: 'feature', checked: github.defaults?.labels?.includes('feature') },
        { name: 'bug', checked: github.defaults?.labels?.includes('bug') },
        { name: 'enhancement', checked: github.defaults?.labels?.includes('enhancement') },
        { name: 'documentation', checked: github.defaults?.labels?.includes('documentation') },
        { name: 'frontend', checked: github.defaults?.labels?.includes('frontend') },
        { name: 'backend', checked: github.defaults?.labels?.includes('backend') },
      ],
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Default priority:',
      choices: ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'],
      default: github.defaults?.priority || 'P2-Medium',
    },
    {
      type: 'list',
      name: 'qa',
      message: 'Default QA requirement:',
      choices: ['Required', 'Not Required', 'Self-Tested'],
      default: github.defaults?.qa || 'Not Required',
    },
    {
      type: 'input',
      name: 'agent',
      message: 'Default agent for tasks:',
      default: github.defaults?.agent || 'general-purpose',
    },
  ]);

  settings.github.defaults = {
    ...settings.github.defaults,
    labels: answers.labels,
    priority: answers.priority,
    qa: answers.qa,
    agent: answers.agent,
  };

  const path = saveGitHubSettings(settings);

  showSuccess('Task Defaults Updated', [
    `Labels: ${answers.labels.join(', ') || '(none)'}`,
    `Priority: ${answers.priority}`,
    `QA: ${answers.qa}`,
    `Agent: ${answers.agent}`,
    `File: ${path}`,
  ]);

  return await configureGitHubSettings();
}

/**
 * Configure PR Workflow
 */
async function configurePRWorkflow() {
  showHeader('PR Workflow');

  const settings = loadGitHubSettings();
  const github = settings.github;

  console.log(chalk.dim('Configure pull request behavior.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Default PR base branch:',
      default: github.pr?.baseBranch || 'main',
    },
    {
      type: 'confirm',
      name: 'taskListsAsPRs',
      message: 'Create task lists as PRs instead of issues?',
      default: github.workflow?.taskListsAsPRs || false,
    },
    {
      type: 'confirm',
      name: 'autoCloseIssues',
      message: 'Auto-close linked issues when PR is merged?',
      default: github.pr?.autoCloseIssues !== false,
    },
    {
      type: 'confirm',
      name: 'squashMerge',
      message: 'Use squash merge by default?',
      default: github.pr?.squashMerge !== false,
    },
    {
      type: 'confirm',
      name: 'deleteBranchAfterMerge',
      message: 'Delete branch after merge?',
      default: github.pr?.deleteBranchAfterMerge !== false,
    },
  ]);

  settings.github.pr = {
    baseBranch: answers.baseBranch,
    autoCloseIssues: answers.autoCloseIssues,
    squashMerge: answers.squashMerge,
    deleteBranchAfterMerge: answers.deleteBranchAfterMerge,
  };
  settings.github.workflow = {
    ...settings.github.workflow,
    taskListsAsPRs: answers.taskListsAsPRs,
  };

  const path = saveGitHubSettings(settings);

  showSuccess('PR Workflow Updated', [
    `Base branch: ${answers.baseBranch}`,
    `Task lists as PRs: ${answers.taskListsAsPRs ? 'Yes' : 'No'}`,
    `Auto-close issues: ${answers.autoCloseIssues ? 'Yes' : 'No'}`,
    `Squash merge: ${answers.squashMerge ? 'Yes' : 'No'}`,
    `Delete branch: ${answers.deleteBranchAfterMerge ? 'Yes' : 'No'}`,
    `File: ${path}`,
  ]);

  return await configureGitHubSettings();
}

/**
 * Configure Deployment Settings
 */
async function configureDeployment() {
  showHeader('Deployment Settings');

  const settings = loadGitHubSettings();
  const github = settings.github;

  console.log(chalk.dim('Configure deployment behavior for completed tasks.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'autoDeployOnComplete',
      message: 'Auto-deploy when task is marked complete?',
      default: github.workflow?.autoDeployOnComplete !== false,
    },
    {
      type: 'confirm',
      name: 'autoFixBlankFields',
      message: 'Auto-fix blank fields on GitHub issues?',
      default: github.workflow?.autoFixBlankFields !== false,
    },
    {
      type: 'confirm',
      name: 'autoReorderOnCreate',
      message: 'Auto-reorder project board when creating issues?',
      default: github.workflow?.autoReorderOnCreate || false,
    },
    {
      type: 'confirm',
      name: 'generateTestsByDefault',
      message: 'Generate tests by default for new tasks?',
      default: github.workflow?.generateTestsByDefault || false,
    },
  ]);

  settings.github.workflow = {
    ...settings.github.workflow,
    autoDeployOnComplete: answers.autoDeployOnComplete,
    autoFixBlankFields: answers.autoFixBlankFields,
    autoReorderOnCreate: answers.autoReorderOnCreate,
    generateTestsByDefault: answers.generateTestsByDefault,
  };

  const path = saveGitHubSettings(settings);

  showSuccess('Deployment Settings Updated', [
    `Auto-deploy: ${answers.autoDeployOnComplete ? 'Yes' : 'No'}`,
    `Auto-fix fields: ${answers.autoFixBlankFields ? 'Yes' : 'No'}`,
    `Auto-reorder: ${answers.autoReorderOnCreate ? 'Yes' : 'No'}`,
    `Generate tests: ${answers.generateTestsByDefault ? 'Yes' : 'No'}`,
    `File: ${path}`,
  ]);

  return await configureGitHubSettings();
}

/**
 * View current GitHub settings
 */
async function viewGitHubSettings() {
  showHeader('Current GitHub Settings');

  const settings = loadGitHubSettings();

  if (!settings.github || Object.keys(settings.github).length === 0) {
    showWarning('No GitHub settings configured.');
    console.log(chalk.dim('Use the GitHub Settings menu to configure them.'));
  } else {
    console.log(chalk.cyan('GitHub Settings:'));
    console.log('');
    console.log(JSON.stringify(settings.github, null, 2));
  }

  console.log('');
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What next?',
      choices: [
        { name: 'Back to GitHub Settings', value: 'back' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'back') {
    return await configureGitHubSettings();
  }

  return null;
}

/**
 * Apply GitHub settings to .claude files using updater script
 */
async function applyGitHubSettings() {
  showHeader('Apply GitHub Settings');

  const settings = loadGitHubSettings();

  if (!settings.github?.repository?.owner || !settings.github?.repository?.name) {
    showWarning('Please configure Project Board settings first.');
    return await configureGitHubSettings();
  }

  console.log(chalk.dim('This will update your .claude files to use the configured GitHub settings.\n'));

  console.log(chalk.cyan('Current settings to apply:'));
  console.log(`  Repository: ${settings.github.repository.owner}/${settings.github.repository.name}`);
  console.log(`  Project: #${settings.github.project?.number || '(not set)'}`);
  console.log('');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Apply these settings to .claude files?',
      default: true,
    },
  ]);

  if (!confirm) {
    return await configureGitHubSettings();
  }

  // Generate and run the updater script
  const updaterPath = join(process.cwd(), '.claude', 'hooks', 'tools', 'github-settings-updater.js');
  const updaterDir = dirname(updaterPath);

  if (!existsSync(updaterDir)) {
    mkdirSync(updaterDir, { recursive: true });
  }

  // Generate the updater script
  const updaterContent = generateGitHubSettingsUpdater();
  writeFileSync(updaterPath, updaterContent, 'utf8');

  showSuccess('GitHub Settings Updater Created', [
    `Script: ${updaterPath}`,
    '',
    'To apply settings, run:',
    `  node ${updaterPath}`,
    '',
    'Or run manually when you want to sync settings.',
  ]);

  return await configureGitHubSettings();
}

/**
 * Generate the GitHub settings updater script
 */
function generateGitHubSettingsUpdater() {
  return `/**
 * GitHub Settings Updater
 *
 * Reads settings from .claude/settings.json and updates
 * GitHub-related commands and configurations.
 *
 * Usage: node .claude/hooks/tools/github-settings-updater.js
 *
 * Generated by: gtask claude-settings
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..');

/**
 * Load settings from .claude/settings.json
 */
function loadSettings() {
  const settingsPath = join(projectRoot, '.claude', 'settings.json');

  if (!existsSync(settingsPath)) {
    console.error('ERROR: .claude/settings.json not found');
    console.log('Run "gtask claude-settings" to create it.');
    process.exit(1);
  }

  try {
    return JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch (err) {
    console.error('ERROR: Failed to parse settings.json:', err.message);
    process.exit(1);
  }
}

/**
 * Update GitHub commands with settings
 */
function updateCommands(settings) {
  const github = settings.github;
  if (!github) {
    console.log('No GitHub settings found.');
    return;
  }

  const commandsDir = join(projectRoot, '.claude', 'commands');
  if (!existsSync(commandsDir)) {
    console.log('No .claude/commands directory found.');
    return;
  }

  // List of GitHub-related commands to check
  const githubCommands = [
    'github-create-task.md',
    'github-task-start.md',
    'github-update.md',
    'github-validate.md',
    'create-task-list.md',
  ];

  let updatedCount = 0;

  for (const cmdFile of githubCommands) {
    const cmdPath = join(commandsDir, cmdFile);
    if (!existsSync(cmdPath)) continue;

    let content = readFileSync(cmdPath, 'utf8');
    let modified = false;

    // Update repository references
    if (github.repository?.owner && github.repository?.name) {
      const repoPattern = /--repo [a-zA-Z0-9_-]+\\/[a-zA-Z0-9_-]+/g;
      const newRepo = \`--repo \${github.repository.owner}/\${github.repository.name}\`;
      if (content.match(repoPattern)) {
        content = content.replace(repoPattern, newRepo);
        modified = true;
      }
    }

    // Update project number references
    if (github.project?.number) {
      const projectPattern = /project-number:\\s*\\d+/g;
      const newProject = \`project-number: \${github.project.number}\`;
      if (content.match(projectPattern)) {
        content = content.replace(projectPattern, newProject);
        modified = true;
      }
    }

    if (modified) {
      writeFileSync(cmdPath, content, 'utf8');
      console.log(\`Updated: \${cmdFile}\`);
      updatedCount++;
    }
  }

  console.log(\`\\nUpdated \${updatedCount} command files.\`);
}

/**
 * Update CLAUDE.md with settings
 */
function updateClaudeMd(settings) {
  const github = settings.github;
  if (!github) return;

  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    console.log('No CLAUDE.md found.');
    return;
  }

  // For now, just log that CLAUDE.md could be updated
  // More sophisticated updates could be added here
  console.log('CLAUDE.md exists - manual updates may be needed for complex changes.');
}

/**
 * Main execution
 */
function main() {
  console.log('GitHub Settings Updater');
  console.log('=======================\\n');

  const settings = loadSettings();

  console.log('Loaded settings:');
  if (settings.github?.repository) {
    console.log(\`  Repository: \${settings.github.repository.owner}/\${settings.github.repository.name}\`);
  }
  if (settings.github?.project?.number) {
    console.log(\`  Project: #\${settings.github.project.number}\`);
  }
  console.log('');

  updateCommands(settings);
  updateClaudeMd(settings);

  console.log('\\nDone!');
}

main();
`;
}

/**
 * Generate AGENT_ONLY_POLICY.md content
 */
function generateAgentOnlyPolicy() {
  return `# Agent Only Execution Policy (STRICT)

**ENFORCEMENT LEVEL: MANDATORY**

All substantive work (implementation, analysis, writing) MUST be delegated to agents via the Task tool.

---

## DEFAULT BEHAVIOR: Delegate via Task Tool

**Agents are the DEFAULT. Direct tools are the EXCEPTION.**

ALL substantive work MUST use Task tool with appropriate agent:
- Investigation/Analysis → \`Task(subagent_type="Explore")\`
- Implementation → \`Task(subagent_type="general-purpose")\` or custom agent
- Multi-step tasks → Task with specialist agent
- Code review/debugging → Task with appropriate agent

---

## Permitted Direct Tools (STRICTLY LIMITED)

| Tool | Call Limit | Permitted Purpose |
|------|------------|-------------------|
| **Read** | 2 calls max | Verify agent output, check single file |
| **Glob** | 2 calls max | Quick path existence check |
| **Grep** | 2 calls max | Single pattern search |
| **TodoWrite** | Unlimited | Task tracking and planning |
| **AskUserQuestion** | Unlimited | Clarifying with user |
| **Task** | Unlimited | Agent dispatch (REQUIRED) |

### FORBIDDEN Direct Tools

| Tool | Status | Alternative |
|------|--------|-------------|
| **Bash** | FORBIDDEN | Delegate to \`general-purpose\` or \`Explore\` agent |
| **Write** | FORBIDDEN | Delegate to appropriate agent |
| **Edit** | FORBIDDEN | Delegate to appropriate agent |
| **WebFetch** | FORBIDDEN | Delegate to agent |
| **WebSearch** | FORBIDDEN | Delegate to agent |

---

## Immediate Delegation Triggers

When user asks to do ANY of the following, spawn an agent IMMEDIATELY as your FIRST action:

| Trigger Word | Agent to Use |
|--------------|--------------|
| review | \`Explore\` |
| analyze | \`Explore\` |
| investigate | \`Explore\` |
| fix | \`general-purpose\` |
| implement | \`general-purpose\` |
| debug | \`general-purpose\` |
| research | \`Explore\` |
| find | \`Explore\` |

**Do NOT make direct tool calls first. Delegate IMMEDIATELY.**

---

## Violation Detection & Self-Correction

### You Are Violating This Policy If:

1. You make 3+ direct Read/Glob/Grep calls without delegating
2. You use Bash directly for ANY reason
3. You analyze code across multiple files without spawning an agent
4. You perform git operations directly instead of via agent
5. You investigate/debug without first spawning an agent

### Self-Correction Protocol:

If you catch yourself making too many direct calls:

\`\`\`
STOP - Policy violation detected
Delegating remaining work to agent...
→ Task(subagent_type="Explore", prompt="Continue investigation of...")
\`\`\`

---

## Agent Dispatch Protocol

Use Claude Code's Task tool to dispatch work:

\`\`\`
Task(
  subagent_type="<agent-type>",
  prompt="<detailed task description>",
  description="<3-5 word summary>"
)
\`\`\`

### Built-in Agent Types (ALWAYS AVAILABLE)

| Agent | Use For |
|-------|---------|
| \`general-purpose\` | Implementation, debugging, multi-step tasks |
| \`Explore\` | File search, codebase exploration, pattern finding |
| \`Plan\` | Architecture planning, implementation strategy |

---

*Generated by gtask claude-settings - ${new Date().toISOString()}*
`;
}

/**
 * Generate agents.json content
 */
function generateAgentsJson() {
  const agents = {
    version: '1.0',
    agents: [
      {
        name: 'frontend_dev',
        scope: 'React, TypeScript, UI components, styling',
        when_to_use: 'Frontend implementation, component creation, UI fixes',
        when_not_to_use: 'Backend work, database operations',
        output_contract: {
          required_fields: ['files_modified', 'components_affected'],
          format: 'Concise summary with code snippets',
        },
      },
      {
        name: 'backend_dev',
        scope: 'API endpoints, Python services, database queries',
        when_to_use: 'Backend implementation, API creation, service logic',
        when_not_to_use: 'UI work, frontend components',
        output_contract: {
          required_fields: ['endpoints_modified', 'services_affected'],
          format: 'Concise summary with code snippets',
        },
      },
      {
        name: 'test_review',
        scope: 'Testing, code review, quality assurance',
        when_to_use: 'Writing tests, reviewing code, finding bugs',
        when_not_to_use: 'Feature implementation',
        output_contract: {
          required_fields: ['tests_added', 'issues_found'],
          format: 'Test results and recommendations',
        },
      },
      {
        name: 'docs_writer',
        scope: 'Documentation, README files, API docs',
        when_to_use: 'Writing documentation, updating README, API docs',
        when_not_to_use: 'Code implementation',
        output_contract: {
          required_fields: ['files_updated'],
          format: 'Documentation content',
        },
      },
    ],
  };

  return JSON.stringify(agents, null, 2);
}

/**
 * Generate Windows batch launcher
 */
function generateWindowsBatch() {
  return `@echo off
REM ============================================================
REM Claude Agent-Only Mode Launcher (Windows Batch)
REM ============================================================
REM
REM This batch file launches the PowerShell script that starts
REM Claude in Agent-Only execution mode with policy enforcement
REM via --append-system-prompt.
REM
REM Usage:
REM   - Double-click this file to start Claude in Agent-Only mode
REM   - Or run from command line: start-agent-only.bat
REM   - With arguments: start-agent-only.bat --permission-mode acceptEdits
REM
REM Generated by: gtask claude-settings
REM ============================================================

setlocal

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%claude-agent-only.ps1"

REM Check if PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo ERROR: PowerShell script not found!
    echo Expected: %PS_SCRIPT%
    echo.
    echo Please ensure claude-agent-only.ps1 exists in the same directory.
    pause
    exit /b 1
)

REM Execute PowerShell script with execution policy bypass
echo Starting Claude in Agent-Only mode...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*

REM Capture exit code from PowerShell
set EXIT_CODE=%ERRORLEVEL%

REM Exit with the same code
exit /b %EXIT_CODE%
`;
}

/**
 * Generate PowerShell launcher
 */
function generatePowerShellLauncher() {
  return `<#
.SYNOPSIS
    Launches Claude in Agent-Only Execution Mode

.DESCRIPTION
    This script loads the agent definitions and policy file, then launches
    Claude with the agent-only execution policy appended to the system prompt.

.PARAMETER Args
    Additional arguments to pass to the claude CLI

.EXAMPLE
    .\\claude-agent-only.ps1
    .\\claude-agent-only.ps1 --permission-mode acceptEdits

Generated by: gtask claude-settings
#>

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

# Define paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Join-Path $ScriptDir ".claude"
$PolicyFile = Join-Path $ClaudeDir "AGENT_ONLY_POLICY.md"
$AgentsFile = Join-Path $ClaudeDir "agents.json"

# Banner
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   CLAUDE - AGENT-ONLY EXECUTION MODE (STRICT)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Validate required files exist
if (-not (Test-Path $PolicyFile)) {
    Write-Host "ERROR: Policy file not found!" -ForegroundColor Red
    Write-Host "Expected: $PolicyFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run 'gtask claude-settings' to create it." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $AgentsFile)) {
    Write-Host "WARNING: Agents file not found." -ForegroundColor Yellow
    Write-Host "Using built-in agents only." -ForegroundColor Yellow
} else {
    try {
        $AgentsContent = Get-Content $AgentsFile -Raw | ConvertFrom-Json
        $AgentCount = $AgentsContent.agents.Count
        Write-Host "Loaded $AgentCount custom agents from agents.json" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: agents.json is not valid JSON" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Direct tools: Read/Glob/Grep (2 max) | FORBIDDEN: Bash/Write/Edit" -ForegroundColor Yellow
Write-Host ""

# Read policy content
$PolicyContent = Get-Content $PolicyFile -Raw

# Build the append system prompt
$AppendPrompt = @"

======================================================================
AGENT-ONLY EXECUTION MODE ACTIVE
======================================================================

$PolicyContent
"@

# Build claude command arguments
$ClaudeArgs = @(
    "--append-system-prompt"
    $AppendPrompt
)

# Add any remaining arguments passed to this script
if ($RemainingArgs) {
    $ClaudeArgs += $RemainingArgs
}

Write-Host "Starting Claude in Agent-Only mode..." -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Execute claude
& claude @ClaudeArgs
exit $LASTEXITCODE
`;
}

/**
 * Generate Bash launcher
 */
function generateBashLauncher() {
  return `#!/bin/bash
# ============================================================
# Claude Agent-Only Mode Launcher (Mac/Linux)
# ============================================================
#
# This script launches Claude in Agent-Only execution mode
# with policy enforcement via --append-system-prompt.
#
# Usage:
#   ./claude-agent-only.sh
#   ./claude-agent-only.sh --permission-mode acceptEdits
#
# Generated by: gtask claude-settings
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$SCRIPT_DIR/.claude"
POLICY_FILE="$CLAUDE_DIR/AGENT_ONLY_POLICY.md"
AGENTS_FILE="$CLAUDE_DIR/agents.json"

# Banner
echo ""
echo "================================================"
echo "   CLAUDE - AGENT-ONLY EXECUTION MODE (STRICT)"
echo "================================================"
echo ""

# Validate required files exist
if [ ! -f "$POLICY_FILE" ]; then
    echo "ERROR: Policy file not found!"
    echo "Expected: $POLICY_FILE"
    echo ""
    echo "Run 'gtask claude-settings' to create it."
    exit 1
fi

if [ -f "$AGENTS_FILE" ]; then
    AGENT_COUNT=$(jq '.agents | length' "$AGENTS_FILE" 2>/dev/null || echo "0")
    echo "Loaded $AGENT_COUNT custom agents from agents.json"
else
    echo "WARNING: Agents file not found. Using built-in agents only."
fi

echo ""
echo "Direct tools: Read/Glob/Grep (2 max) | FORBIDDEN: Bash/Write/Edit"
echo ""

# Read policy content
POLICY_CONTENT=$(cat "$POLICY_FILE")

# Build the append system prompt
APPEND_PROMPT="
======================================================================
AGENT-ONLY EXECUTION MODE ACTIVE
======================================================================

$POLICY_CONTENT
"

echo "Starting Claude in Agent-Only mode..."
echo ""
echo "================================================"
echo ""

# Execute claude with appended prompt
claude --append-system-prompt "$APPEND_PROMPT" "$@"
`;
}
