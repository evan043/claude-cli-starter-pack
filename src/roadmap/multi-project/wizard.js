/**
 * Multi-Project Builder - Wizard & User Interaction
 *
 * Handles user prompts and input collection for roadmap creation.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { checkGhCli } from '../github-integration.js';

/**
 * Prompt for roadmap info
 */
export async function promptRoadmapInfo(options) {
  console.log(chalk.cyan.bold('📝 Step 1: Roadmap Information\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Roadmap title:',
      default: options.title || '',
      validate: v => v.length > 0 || 'Title is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: options.description || '',
    },
  ]);

  return answers;
}

/**
 * Prompt for project scope items
 */
export async function promptProjectScope(options) {
  console.log('');
  console.log(chalk.cyan.bold('📋 Step 2: Define Scope\n'));

  const { scopeMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'scopeMethod',
      message: 'How do you want to define the scope?',
      choices: [
        { name: 'Describe in editor', value: 'editor' },
        { name: 'Import from GitHub issues', value: 'github' },
        { name: 'Enter items one by one', value: 'manual' },
      ],
    },
  ]);

  if (scopeMethod === 'editor') {
    const { scope } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'scope',
        message: 'Describe your projects (press Enter to open editor):',
        default: `# Projects to Build

## Project 1: [Name]
- Feature A
- Feature B

## Project 2: [Name]
- Feature C
- Feature D

## Requirements
- Common requirement 1
- Common requirement 2
`,
      },
    ]);

    return parseProjectScope(scope);
  }

  if (scopeMethod === 'github') {
    // Use existing GitHub import flow
    const ghCheck = checkGhCli();
    if (!ghCheck.available || !ghCheck.authenticated) {
      console.log(chalk.yellow('\nGitHub CLI not available. Using editor instead.'));
      return promptProjectScope({ ...options, scopeMethod: 'editor' });
    }

    console.log(chalk.dim('\nFetching issues...'));

    const { fetchIssues, formatIssueTable, parseSelection } = await import('../github-integration.js');

    const issues = fetchIssues({ limit: 50 });
    if (issues.length === 0) {
      console.log(chalk.yellow('\nNo issues found. Using editor instead.'));
      return promptProjectScope({ ...options, scopeMethod: 'editor' });
    }

    console.log(formatIssueTable(issues));

    const { selection } = await inquirer.prompt([
      {
        type: 'input',
        name: 'selection',
        message: 'Select issues (e.g., 1,2,5-7 or "all"):',
        validate: v => v.length > 0 || 'Select at least one issue',
      },
    ]);

    const selectedIndices = parseSelection(selection, issues.length);
    return selectedIndices.map(i => issues[i]);
  }

  if (scopeMethod === 'manual') {
    const items = [];
    let addMore = true;

    while (addMore) {
      const { title, description } = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: `Item ${items.length + 1} title:`,
          validate: v => v.length > 0 || 'Title required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description (optional):',
          default: '',
        },
      ]);

      items.push({
        id: items.length + 1,
        title,
        body: description,
      });

      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Add another item?',
          default: items.length < 5,
        },
      ]);

      addMore = more;
    }

    return items;
  }

  return [];
}

/**
 * Parse scope text into items grouped by project
 */
export function parseProjectScope(scope) {
  const items = [];
  const lines = scope.split('\n');
  let currentProject = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Project header
    if (trimmed.startsWith('## Project') || trimmed.match(/^##\s+\d+[.:]/)) {
      const titleMatch = trimmed.match(/^##\s+(?:Project\s+\d+:?\s*)?(.+)/);
      currentProject = {
        id: items.length + 1,
        title: titleMatch ? titleMatch[1].replace(/\[|\]/g, '').trim() : `Project ${items.length + 1}`,
        body: '',
        isProject: true,
      };
      items.push(currentProject);
    }
    // Bullet points as features/requirements
    else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-•*]\s*/, '').trim();
      if (text.length > 0) {
        if (currentProject) {
          currentProject.body += `\n- ${text}`;
        } else {
          items.push({
            id: items.length + 1,
            title: text,
            body: '',
          });
        }
      }
    }
  }

  // If no items found, create one from whole scope
  if (items.length === 0 && scope.trim().length > 0) {
    items.push({
      id: 1,
      title: 'Main Project',
      body: scope,
      isProject: true,
    });
  }

  return items;
}

/**
 * Prompt for execution configuration
 */
export async function promptExecutionConfig() {
  console.log('');
  console.log(chalk.cyan.bold('⚙️ Step 3: Execution Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'parallel_discovery',
      message: 'Run L2 discovery in parallel for all projects?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'sequential_execution',
      message: 'Execute projects sequentially (safer) vs parallel?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'ralph_loop_enabled',
      message: 'Enable Ralph Loop (iterative test-fix cycles)?',
      default: false,
    },
    {
      type: 'list',
      name: 'testing_strategy',
      message: 'Testing strategy:',
      choices: [
        { name: 'Test per project completion', value: 'per-project' },
        { name: 'Test only at final completion', value: 'final-only' },
        { name: 'No automated testing', value: 'none' },
      ],
      default: 'per-project',
    },
  ]);

  return answers;
}
