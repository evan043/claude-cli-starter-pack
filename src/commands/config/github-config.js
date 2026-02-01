/**
 * GitHub Configuration
 *
 * Configure GitHub Project Board integration, branch strategy, PR workflow,
 * and deployment settings.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showWarning } from '../../cli/menu.js';

/**
 * Default GitHub settings schema
 */
export const DEFAULT_GITHUB_SETTINGS = {
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
 * Load existing GitHub settings or return defaults
 */
export function loadGitHubSettings() {
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
export function saveGitHubSettings(settings) {
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  const dir = dirname(settingsPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return settingsPath;
}

/**
 * Configure GitHub settings submenu
 */
export async function configureGitHubSettings(returnToMain) {
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
    return returnToMain ? await returnToMain() : null;
  }

  switch (section) {
    case 'project-board':
      return await configureProjectBoard(returnToMain);
    case 'branch-strategy':
      return await configureBranchStrategy(returnToMain);
    case 'task-defaults':
      return await configureTaskDefaults(returnToMain);
    case 'pr-workflow':
      return await configurePRWorkflow(returnToMain);
    case 'deployment':
      return await configureDeployment(returnToMain);
    case 'view-github':
      return await viewGitHubSettings(returnToMain);
    case 'apply':
      return await applyGitHubSettings(returnToMain);
  }
}

/**
 * Configure Project Board settings
 */
async function configureProjectBoard(returnToMain) {
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * Configure Branch & Worktree Strategy
 */
async function configureBranchStrategy(returnToMain) {
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * Configure Task Creation Defaults
 */
async function configureTaskDefaults(returnToMain) {
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * Configure PR Workflow
 */
async function configurePRWorkflow(returnToMain) {
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * Configure Deployment Settings
 */
async function configureDeployment(returnToMain) {
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * View current GitHub settings
 */
async function viewGitHubSettings(returnToMain) {
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
    return await configureGitHubSettings(returnToMain);
  }

  return null;
}

/**
 * Apply GitHub settings to .claude files using updater script
 */
async function applyGitHubSettings(returnToMain) {
  showHeader('Apply GitHub Settings');

  const settings = loadGitHubSettings();

  if (!settings.github?.repository?.owner || !settings.github?.repository?.name) {
    showWarning('Please configure Project Board settings first.');
    return await configureGitHubSettings(returnToMain);
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
    return await configureGitHubSettings(returnToMain);
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

  return await configureGitHubSettings(returnToMain);
}

/**
 * Generate the GitHub settings updater script
 */
export function generateGitHubSettingsUpdater() {
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
