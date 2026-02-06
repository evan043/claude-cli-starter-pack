/**
 * Wizard Prompts - Core Input Collection
 *
 * Interactive prompts for project identification, scope assessment,
 * workflow options, testing config, and L2 exploration settings.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { kebabCasePrompt } from '../../../utils/inquirer-presets.js';

/**
 * Step 1: Project Identification
 */
export async function promptProjectInfo(options) {
  console.log(chalk.cyan.bold('\n\u{1f4cb} Step 1: Project Identification\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (human-readable):',
      default: options.name || '',
      validate: (input) => input.length > 0 || 'Project name is required',
    },
    kebabCasePrompt({
      name: 'projectSlug',
      message: 'Project slug (kebab-case):',
      default: (answers) =>
        answers.projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
    }),
    {
      type: 'editor',
      name: 'description',
      message: 'Project description (opens editor):',
      default: 'Describe your project goals and requirements...',
    },
  ]);

  return answers;
}

/**
 * Step 3: Scope Assessment
 */
export async function promptScopeAssessment() {
  console.log(chalk.cyan.bold('\n\u{1f4ca} Step 3: Scope Assessment\n'));
  console.log(chalk.dim('Answer these to help estimate project scale.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'linesOfCode',
      message: 'Estimated lines of code to write/modify:',
      choices: [
        { name: '< 500 lines (small feature)', value: 'small' },
        { name: '500-2000 lines (medium feature)', value: 'medium' },
        { name: '2000-5000 lines (large feature)', value: 'large' },
        { name: '5000+ lines (major overhaul)', value: 'xlarge' },
      ],
    },
    {
      type: 'list',
      name: 'components',
      message: 'Number of components/modules affected:',
      choices: [
        { name: '1-3 components', value: 'few' },
        { name: '4-8 components', value: 'several' },
        { name: '9-15 components', value: 'many' },
        { name: '15+ components', value: 'extensive' },
      ],
    },
    {
      type: 'list',
      name: 'integrations',
      message: 'External integrations required:',
      choices: [
        { name: 'None', value: 'none' },
        { name: '1-2 APIs/services', value: 'few' },
        { name: '3-5 APIs/services', value: 'several' },
        { name: '5+ APIs/services', value: 'many' },
      ],
    },
    {
      type: 'list',
      name: 'familiarity',
      message: 'Familiarity with the codebase area:',
      choices: [
        { name: 'Very familiar (worked on it recently)', value: 'high' },
        { name: 'Somewhat familiar', value: 'medium' },
        { name: 'New area (need to learn)', value: 'low' },
      ],
    },
  ]);

  return answers;
}

/**
 * Prompt for enhancements
 */
export async function promptEnhancements() {
  console.log(chalk.cyan.bold('\n\u26a1 Enhancement Options\n'));
  console.log(chalk.dim('Select optional enhancements for your plan.\n'));

  const { enhancements } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'enhancements',
      message: 'Enable enhancements:',
      choices: [
        {
          name: 'Parallel Execution - Deploy multiple agents for file generation',
          value: 'parallel',
          checked: true,
        },
        {
          name: 'E2E Testing - Generate test definitions for your framework',
          value: 'testing',
          checked: true,
        },
        {
          name: 'Per-Phase Commits - Auto-commit after each phase',
          value: 'commits',
          checked: false,
        },
        {
          name: 'Enforcement Hooks - Generate pattern enforcers',
          value: 'hooks',
          checked: false,
        },
        {
          name: 'GitHub Integration - Create issues for each phase',
          value: 'github',
          checked: false,
        },
      ],
    },
  ]);

  return enhancements;
}

/**
 * Prompt for workflow configuration (branch, issue, worktree)
 * @param {Object} options - Current options
 * @returns {Object} Workflow configuration
 */
export async function promptWorkflowOptions(options = {}) {
  console.log(chalk.cyan.bold('\n\u{1f500} Workflow Options\n'));
  console.log(chalk.dim('Configure how this plan integrates with your workflow.\n'));

  const { enableWorkflow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableWorkflow',
      message: 'Configure workflow integration (branch/issue/worktree)?',
      default: false,
    },
  ]);

  if (!enableWorkflow) {
    return {
      github_issue: { enabled: false },
      branch: { enabled: false },
      worktree: { enabled: false },
      project_board: { enabled: false },
    };
  }

  const githubIssueConfig = await promptGitHubIssueConfig();
  const branchConfig = await promptBranchConfig(options);
  const worktreeConfig = await promptWorktreeConfig(options);
  const projectBoardConfig = await promptProjectBoardConfig();

  return {
    github_issue: githubIssueConfig,
    branch: branchConfig,
    worktree: worktreeConfig,
    project_board: projectBoardConfig,
  };
}

/**
 * Prompt for GitHub Issue configuration
 */
async function promptGitHubIssueConfig() {
  const { createIssue } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createIssue',
      message: 'Create GitHub issue for this plan?',
      default: false,
    },
  ]);

  if (!createIssue) {
    return { enabled: false };
  }

  const { autoClose, updateOnTaskComplete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'autoClose',
      message: 'Auto-close issue when plan completes?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'updateOnTaskComplete',
      message: 'Update issue checkboxes as tasks complete?',
      default: true,
    },
  ]);

  return {
    enabled: true,
    issue_number: null,
    issue_url: null,
    auto_close: autoClose,
    update_on_task_complete: updateOnTaskComplete,
  };
}

/**
 * Prompt for branch configuration
 */
async function promptBranchConfig(options) {
  const { createBranch } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createBranch',
      message: 'Create feature branch for this plan?',
      default: false,
    },
  ]);

  if (!createBranch) {
    return { enabled: false };
  }

  const { branchName, baseBranch } = await inquirer.prompt([
    {
      type: 'input',
      name: 'branchName',
      message: 'Branch name:',
      default: options.projectSlug
        ? `feat/${options.projectSlug}`
        : 'feat/phase-dev-plan',
      validate: (input) => {
        if (!/^[a-z0-9][a-z0-9/_-]*$/.test(input)) {
          return 'Branch names should be kebab-case (e.g., feat/my-feature)';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Base branch:',
      default: 'main',
    },
  ]);

  return {
    enabled: true,
    branch_name: branchName,
    base_branch: baseBranch,
    auto_create: true,
  };
}

/**
 * Prompt for worktree configuration
 */
async function promptWorktreeConfig(options) {
  const { useWorktree } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useWorktree',
      message: 'Use git worktree for isolated development? (advanced)',
      default: false,
    },
  ]);

  if (!useWorktree) {
    return { enabled: false };
  }

  const { worktreePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'worktreePath',
      message: 'Worktree path:',
      default: options.projectSlug
        ? `../${options.projectSlug}-worktree`
        : '../phase-dev-worktree',
    },
  ]);

  return {
    enabled: true,
    worktree_path: worktreePath,
    auto_create: true,
  };
}

/**
 * Prompt for project board configuration
 */
async function promptProjectBoardConfig() {
  const { useProjectBoard } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useProjectBoard',
      message: 'Sync with GitHub Project Board?',
      default: false,
    },
  ]);

  if (!useProjectBoard) {
    return { enabled: false };
  }

  const { projectNumber } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectNumber',
      message: 'Project board number:',
      validate: (input) => {
        if (!input || isNaN(parseInt(input))) {
          return 'Enter a valid project number';
        }
        return true;
      },
    },
  ]);

  return {
    enabled: true,
    project_number: parseInt(projectNumber),
    column_mapping: {
      pending: 'Todo',
      in_progress: 'In Progress',
      completed: 'Done',
    },
  };
}

/**
 * Prompt for Ralph Loop testing configuration
 * @param {Object} architecture - Detected architecture
 * @returns {Object} Testing configuration
 */
export async function promptTestingConfig(architecture = {}) {
  console.log(chalk.cyan.bold('\n\u{1f9ea} Testing Configuration\n'));
  console.log(chalk.dim('Configure automated testing (Ralph Loop) for your plan.\n'));

  const defaultTestCommand = determineDefaultTestCommand(architecture);

  const { enableRalphLoop } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableRalphLoop',
      message: 'Enable Ralph Loop (iterative test-fix cycle)?',
      default: !!architecture.testing?.e2e || !!architecture.testing?.framework,
    },
  ]);

  if (!enableRalphLoop) {
    return {
      ralph_loop: {
        enabled: false,
        testCommand: defaultTestCommand,
        maxIterations: 10,
        autoStart: false,
      },
    };
  }

  const ralphConfig = await inquirer.prompt([
    {
      type: 'input',
      name: 'testCommand',
      message: 'Test command:',
      default: defaultTestCommand,
    },
    {
      type: 'number',
      name: 'maxIterations',
      message: 'Max fix iterations per test failure:',
      default: 10,
      validate: (input) => input > 0 || 'Must be at least 1',
    },
    {
      type: 'confirm',
      name: 'autoStart',
      message: 'Auto-start tests after each phase?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'validateAfterEachPhase',
      message: 'Run validation after each phase completes?',
      default: true,
    },
  ]);

  return {
    ralph_loop: {
      enabled: true,
      testCommand: ralphConfig.testCommand,
      maxIterations: ralphConfig.maxIterations,
      autoStart: ralphConfig.autoStart,
      validateAfterEachPhase: ralphConfig.validateAfterEachPhase,
    },
    e2e_framework: architecture.testing?.e2e || null,
    unit_framework: architecture.testing?.unit || architecture.testing?.framework || null,
  };
}

/**
 * Determine default test command from architecture
 */
function determineDefaultTestCommand(architecture) {
  const testing = architecture.testing || {};

  if (testing.e2e === 'playwright') return 'npx playwright test';
  if (testing.e2e === 'cypress') return 'npx cypress run';
  if (testing.framework === 'vitest') return 'npm run test';
  if (testing.framework === 'jest') return 'npm test';
  if (architecture.backend?.language === 'python') return 'pytest';
  if (architecture.backend?.language === 'go') return 'go test ./...';

  return 'npm test';
}

/**
 * Prompt for L2 exploration options
 * @returns {Object} L2 exploration configuration
 */
export async function promptL2ExplorationOptions() {
  console.log(chalk.cyan.bold('\n\u{1f50d} L2 Exploration Options\n'));
  console.log(chalk.dim('Configure parallel agent exploration of your codebase.\n'));

  const { enableExploration } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableExploration',
      message: 'Enable L2 codebase exploration?',
      default: true,
    },
  ]);

  if (!enableExploration) {
    return { enabled: false };
  }

  const { explorationDepth, includeTests, maxSnippets } = await inquirer.prompt([
    {
      type: 'list',
      name: 'explorationDepth',
      message: 'Exploration depth:',
      choices: [
        { name: 'Quick - Fast scan, key files only', value: 'quick' },
        { name: 'Standard - Balanced coverage (recommended)', value: 'standard' },
        { name: 'Deep - Thorough analysis, more snippets', value: 'deep' },
      ],
      default: 'standard',
    },
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Include test files in exploration?',
      default: true,
    },
    {
      type: 'number',
      name: 'maxSnippets',
      message: 'Maximum code snippets to extract:',
      default: 30,
      validate: (input) => input > 0 || 'Must be at least 1',
    },
  ]);

  return {
    enabled: true,
    explorationDepth,
    includeTests,
    maxSnippets,
  };
}
