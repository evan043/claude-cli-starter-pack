/**
 * GitHub Configuration Handlers
 *
 * User interaction handlers and prompts.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess, showWarning } from '../../../cli/menu.js';
import { loadGitHubSettings, saveGitHubSettings } from './persistence.js';
import { generateGitHubSettingsUpdater } from './templates.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { claudeAbsolutePath } from '../../../utils/paths.js';

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
  const updaterPath = claudeAbsolutePath(process.cwd(), 'hooks', 'tools', 'github-settings-updater.js');
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
