/**
 * Create Task Command
 *
 * Interactive task creation with codebase analysis
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { loadConfigSync } from '../utils.js';
import { createIssue, addIssueToProject, getProjectItemId, updateProjectItemField } from '../github/client.js';
import { analyzeForIssue, detectProjectType } from '../analysis/codebase.js';
import { generateIssueBody, generateSimpleIssueBody, suggestAcceptanceCriteria } from '../templates/issue-body.js';

/**
 * Label categories
 */
const LABEL_CATEGORIES = {
  type: [
    { name: 'feature', description: 'New functionality' },
    { name: 'refactor', description: 'Code improvement without behavior change' },
    { name: 'bug', description: 'Something isn\'t working' },
    { name: 'testing', description: 'Test coverage and quality' },
    { name: 'feature-update', description: 'Enhancement to existing feature' },
    { name: 'documentation', description: 'Documentation only' },
  ],
  stack: [
    { name: 'frontend', description: 'UI/client changes' },
    { name: 'backend', description: 'API/server changes' },
  ],
};

/**
 * Priority options
 */
const PRIORITIES = [
  { name: 'P0-Critical', description: 'Production broken, blocks all users' },
  { name: 'P1-High', description: 'Major feature broken, affects many users' },
  { name: 'P2-Medium', description: 'Minor bug or new feature (default)' },
  { name: 'P3-Low', description: 'Nice to have, polish, cleanup' },
];

/**
 * Run the create command
 */
export async function runCreate(options) {
  showHeader('Create GitHub Task');

  // Load config
  const { config, path: configPath } = loadConfigSync();

  if (!config || !config.project_board?.owner) {
    showError('Not configured', 'Run "gtask setup" first to configure your project.');
    return;
  }

  const { owner, repo, project_number: projectNumber, project_id: projectId } = config.project_board;

  console.log(chalk.dim(`Creating task for ${owner}/${repo}`));
  if (projectNumber) {
    console.log(chalk.dim(`Project board: #${projectNumber}`));
  }
  console.log('');

  // Gather task details
  const taskData = await gatherTaskDetails(options, config);

  if (!taskData) {
    return; // User cancelled
  }

  // Perform codebase analysis
  let codeAnalysis = null;
  if (!options.skipAnalysis) {
    const analyzeSpinner = ora('Analyzing codebase...').start();
    try {
      // Extract keywords from title and description
      const keywords = extractKeywords(taskData.title, taskData.description);
      codeAnalysis = await analyzeForIssue(keywords, { maxFiles: 5 });
      analyzeSpinner.succeed(`Found ${codeAnalysis.relevantFiles.length} relevant files`);
    } catch (error) {
      analyzeSpinner.warn('Codebase analysis skipped');
    }
  }

  // Generate issue body
  const spinner = ora('Generating issue body...').start();

  const issueBody = codeAnalysis
    ? generateIssueBody({
        description: taskData.description,
        expectedBehavior: taskData.expectedBehavior,
        actualBehavior: taskData.actualBehavior,
        acceptanceCriteria: taskData.acceptanceCriteria,
        codeAnalysis,
        todoList: generateTodoList(taskData, codeAnalysis),
        testScenarios: generateTestScenarios(taskData),
        priority: taskData.priority,
        labels: taskData.labels,
        issueType: taskData.issueType || 'feature', // Pass issue type
      })
    : generateSimpleIssueBody({
        description: taskData.description,
        acceptanceCriteria: taskData.acceptanceCriteria,
      });

  spinner.succeed('Issue body generated');

  // Preview
  console.log('');
  console.log(chalk.cyan('─'.repeat(60)));
  console.log(chalk.bold('Preview:'));
  console.log(chalk.cyan('─'.repeat(60)));
  console.log(chalk.dim(issueBody.slice(0, 500) + '...'));
  console.log(chalk.cyan('─'.repeat(60)));
  console.log('');

  // Confirm creation
  const { confirmCreate } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmCreate',
      message: 'Create this issue?',
      default: true,
    },
  ]);

  if (!confirmCreate) {
    console.log(chalk.yellow('Cancelled.'));
    return;
  }

  // Create the issue
  const createSpinner = ora('Creating GitHub issue...').start();

  const result = await createIssue(owner, repo, {
    title: taskData.title,
    body: issueBody,
    labels: taskData.labels,
    assignees: [owner],
  });

  if (!result.success) {
    createSpinner.fail('Failed to create issue');
    showError('Error', result.error);
    return;
  }

  createSpinner.succeed(`Issue #${result.number} created`);

  // Add to project board
  if (projectNumber) {
    const projectSpinner = ora('Adding to project board...').start();
    const added = addIssueToProject(owner, projectNumber, result.url);

    if (added) {
      projectSpinner.succeed('Added to project board');

      // Update fields if we have IDs
      if (projectId && config.field_ids?.status) {
        const itemId = getProjectItemId(owner, projectNumber, result.number);

        if (itemId) {
          // Set status to "Todo"
          if (config.status_options?.todo) {
            updateProjectItemField(
              projectId,
              itemId,
              config.field_ids.status,
              config.status_options.todo,
              'single-select'
            );
          }

          // Set priority if available
          if (config.field_ids?.priority && config.priority_options) {
            const priorityKey = taskData.priority.toLowerCase().replace('-', '').slice(0, 2);
            const priorityOptionId = config.priority_options[priorityKey];
            if (priorityOptionId) {
              updateProjectItemField(
                projectId,
                itemId,
                config.field_ids.priority,
                priorityOptionId,
                'single-select'
              );
            }
          }
        }
      }
    } else {
      projectSpinner.warn('Could not add to project board');
    }
  }

  // Success summary
  showSuccess('Task Created Successfully', [
    `Issue: #${result.number} - ${taskData.title}`,
    `URL: ${result.url}`,
    `Priority: ${taskData.priority}`,
    `Labels: ${taskData.labels.join(', ')}`,
    '',
    'Next: Start working or create another task',
  ]);

  return result;
}

/**
 * Gather task details interactively
 */
async function gatherTaskDetails(options, config) {
  const data = {
    title: options.title || '',
    description: options.description || '',
    priority: options.priority || 'P2-Medium',
    labels: options.labels ? options.labels.split(',').map((l) => l.trim()) : [],
    acceptanceCriteria: [],
    expectedBehavior: '',
    actualBehavior: '',
    issueType: options.issueType || 'feature', // Default to feature for backwards compatibility
  };

  // Batch mode - parse from options
  if (options.batch) {
    if (!data.title || !data.description) {
      showError('Batch mode requires --title and --description');
      return null;
    }
    return data;
  }

  // Interactive mode

  // Title
  if (!data.title) {
    const { title } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Issue title:',
        validate: (input) => (input.trim() ? true : 'Title is required'),
      },
    ]);
    data.title = title.trim();
  }

  // Type (determines other fields)
  const { issueType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'issueType',
      message: 'Issue type:',
      choices: LABEL_CATEGORIES.type.map((t) => ({
        name: `${t.name} - ${chalk.dim(t.description)}`,
        value: t.name,
      })),
    },
  ]);
  data.labels.push(issueType);
  data.issueType = issueType; // Store for generateIssueBody()

  // Description
  console.log('');
  console.log(chalk.dim('Enter description (press Enter twice to finish):'));
  const { description } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'description',
      message: 'Description:',
      default: data.description || '',
    },
  ]);
  data.description = description.trim();

  // Bug-specific fields
  if (issueType === 'bug') {
    const { expectedBehavior, actualBehavior } = await inquirer.prompt([
      {
        type: 'input',
        name: 'expectedBehavior',
        message: 'Expected behavior:',
      },
      {
        type: 'input',
        name: 'actualBehavior',
        message: 'Actual behavior:',
      },
    ]);
    data.expectedBehavior = expectedBehavior;
    data.actualBehavior = actualBehavior;
  }

  // Stack
  const { stack } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'stack',
      message: 'Stack affected:',
      choices: LABEL_CATEGORIES.stack.map((s) => ({
        name: `${s.name} - ${chalk.dim(s.description)}`,
        value: s.name,
      })),
      validate: (input) =>
        input.length > 0 ? true : 'Select at least one stack',
    },
  ]);
  data.labels.push(...stack);

  // Priority
  const { priority } = await inquirer.prompt([
    {
      type: 'list',
      name: 'priority',
      message: 'Priority:',
      choices: PRIORITIES.map((p) => ({
        name: `${p.name} - ${chalk.dim(p.description)}`,
        value: p.name,
      })),
      default: 2, // P2-Medium
    },
  ]);
  data.priority = priority;

  // Acceptance criteria
  const suggestedCriteria = suggestAcceptanceCriteria(issueType);
  console.log('');
  console.log(chalk.dim('Suggested acceptance criteria:'));
  suggestedCriteria.forEach((c, i) => console.log(chalk.dim(`  ${i + 1}. ${c}`)));

  const { useSuggested } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useSuggested',
      message: 'Use suggested acceptance criteria?',
      default: true,
    },
  ]);

  if (useSuggested) {
    data.acceptanceCriteria = [...suggestedCriteria];
  }

  const { additionalCriteria } = await inquirer.prompt([
    {
      type: 'input',
      name: 'additionalCriteria',
      message: 'Additional acceptance criteria (comma-separated, or Enter to skip):',
    },
  ]);

  if (additionalCriteria.trim()) {
    const additional = additionalCriteria.split(',').map((c) => c.trim()).filter(Boolean);
    data.acceptanceCriteria.push(...additional);
  }

  return data;
}

/**
 * Extract keywords from title and description for codebase search
 */
function extractKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
    'although', 'though', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'what', 'which', 'who', 'whom', 'bug', 'fix',
    'issue', 'problem', 'error', 'broken', 'working', 'work', 'doesnt', 'dont',
  ]);

  // Extract words
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Dedupe and limit
  const unique = [...new Set(words)];
  return unique.slice(0, 10);
}

/**
 * Generate todo list from task data and analysis
 */
function generateTodoList(taskData, codeAnalysis) {
  const todos = [];

  // Add steps based on relevant files found
  if (codeAnalysis?.relevantFiles?.length > 0) {
    for (const fileInfo of codeAnalysis.relevantFiles.slice(0, 3)) {
      if (fileInfo.definitions?.length > 0) {
        const mainDef = fileInfo.definitions[0];
        todos.push({
          task: `Review and update ${mainDef.name}() in ${fileInfo.file}`,
          file: fileInfo.file,
          details: `Line ${mainDef.line}`,
        });
      }
    }
  }

  // Add testing step
  todos.push({
    task: 'Test changes locally',
    details: 'Verify fix works in development environment',
  });

  // Add PR step
  todos.push({
    task: 'Create commit with descriptive message',
    details: `Reference issue number in commit: "fix: description (#${taskData.issueNumber || 'N'})"`,
  });

  return todos;
}

/**
 * Generate test scenarios
 */
function generateTestScenarios(taskData) {
  const scenarios = [];

  // Basic happy path
  scenarios.push({
    name: 'Happy path - normal usage',
    steps: ['Navigate to feature', 'Perform action', 'Verify result'],
    expected: 'Feature works as expected',
  });

  // Edge case
  scenarios.push({
    name: 'Edge case - boundary conditions',
    steps: ['Test with edge case input', 'Verify handling'],
    expected: 'No errors, graceful handling',
  });

  return scenarios;
}
