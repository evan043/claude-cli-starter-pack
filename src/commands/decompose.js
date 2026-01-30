/**
 * Decompose Command
 *
 * Break down a GitHub issue into granular, actionable tasks
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { loadConfigSync } from '../utils.js';
import { getIssue, addIssueComment } from '../github/client.js';
import { parseIssueBody, toClaudeTaskList, toMarkdownChecklist, getCompletionStats } from '../analysis/checklist-parser.js';
import { analyzeForIssue, searchFiles, findDefinitions } from '../analysis/codebase.js';
import { saveTaskState, loadTaskState } from './sync.js';

/**
 * Run the decompose command
 */
export async function runDecompose(options) {
  showHeader('Decompose GitHub Issue');

  // Load config
  const { config } = loadConfigSync();
  if (!config?.project_board?.owner) {
    showError('Not configured', 'Run "gtask setup" first.');
    return;
  }

  const { owner, repo } = config.project_board;

  // Get issue number
  let issueNumber = options.issue;
  if (!issueNumber) {
    const { num } = await inquirer.prompt([
      {
        type: 'input',
        name: 'num',
        message: 'Issue number to decompose:',
        validate: (input) => {
          const n = parseInt(input, 10);
          return n > 0 ? true : 'Enter a valid issue number';
        },
      },
    ]);
    issueNumber = parseInt(num, 10);
  }

  // Fetch issue
  const spinner = ora(`Fetching issue #${issueNumber}...`).start();
  const issue = getIssue(owner, repo, issueNumber);

  if (!issue) {
    spinner.fail(`Issue #${issueNumber} not found`);
    return;
  }

  spinner.succeed(`Fetched: ${issue.title}`);
  console.log('');

  // Parse existing issue body
  const parseSpinner = ora('Parsing issue structure...').start();
  const parsed = parseIssueBody(issue.body);
  parseSpinner.stop();

  // Show what we found
  console.log(chalk.dim('Found in issue:'));
  console.log(chalk.dim(`  - ${parsed.todoList.length} existing todo items`));
  console.log(chalk.dim(`  - ${parsed.acceptanceCriteria.length} acceptance criteria`));
  console.log(chalk.dim(`  - ${parsed.testScenarios.length} test scenarios`));
  console.log(chalk.dim(`  - ${parsed.codeAnalysis.files.length} file references`));
  console.log('');

  // Decide decomposition strategy
  const { strategy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: 'How should we decompose this issue?',
      choices: [
        {
          name: 'Use existing checklist + enhance with codebase analysis',
          value: 'enhance',
        },
        {
          name: 'Create new detailed breakdown (ignore existing)',
          value: 'new',
        },
        {
          name: 'Merge: combine existing + new analysis',
          value: 'merge',
        },
      ],
    },
  ]);

  let tasks = [];

  if (strategy === 'enhance' || strategy === 'merge') {
    // Start with existing todos
    tasks = toClaudeTaskList(parsed);
    console.log(chalk.green(`✓ Loaded ${tasks.length} existing tasks`));
  }

  if (strategy === 'new' || strategy === 'merge') {
    // Perform codebase analysis
    const analyzeSpinner = ora('Analyzing codebase...').start();

    // Extract keywords from issue
    const keywords = extractKeywords(issue.title, parsed.problemStatement);
    const analysis = await analyzeForIssue(keywords, { maxFiles: 8 });

    analyzeSpinner.succeed(
      `Found ${analysis.relevantFiles.length} relevant files`
    );

    // Generate new tasks from analysis
    const newTasks = generateTasksFromAnalysis(analysis, parsed, issue);

    if (strategy === 'merge') {
      // Deduplicate and merge
      tasks = mergeTasks(tasks, newTasks);
      console.log(chalk.green(`✓ Merged to ${tasks.length} total tasks`));
    } else {
      tasks = newTasks;
      console.log(chalk.green(`✓ Generated ${tasks.length} new tasks`));
    }
  }

  // Add standard tasks if missing
  tasks = ensureStandardTasks(tasks);

  // Show task preview
  console.log('');
  console.log(chalk.cyan('─'.repeat(60)));
  console.log(chalk.bold('Task Breakdown Preview:'));
  console.log(chalk.cyan('─'.repeat(60)));

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const status = task.status === 'completed' ? chalk.green('✓') : chalk.dim('○');
    const num = chalk.dim(`${i + 1}.`);
    console.log(`${status} ${num} ${task.content}`);

    if (task.metadata?.fileRefs?.length > 0) {
      const refs = task.metadata.fileRefs
        .slice(0, 2)
        .map((r) => `${r.file}${r.line ? ':' + r.line : ''}`)
        .join(', ');
      console.log(chalk.dim(`      Files: ${refs}`));
    }
  }

  console.log(chalk.cyan('─'.repeat(60)));
  console.log('');

  // Confirm and choose output
  const { outputChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputChoice',
      message: 'What would you like to do with this breakdown?',
      choices: [
        {
          name: 'Save locally (for gtask sync later)',
          value: 'local',
        },
        {
          name: 'Post as comment on GitHub issue',
          value: 'comment',
        },
        {
          name: 'Both: save locally + post comment',
          value: 'both',
        },
        {
          name: 'Cancel',
          value: 'cancel',
        },
      ],
    },
  ]);

  if (outputChoice === 'cancel') {
    console.log(chalk.yellow('Cancelled.'));
    return;
  }

  // Save locally
  if (outputChoice === 'local' || outputChoice === 'both') {
    const state = {
      issueNumber,
      issueTitle: issue.title,
      owner,
      repo,
      tasks,
      createdAt: new Date().toISOString(),
      lastSyncedAt: null,
    };

    saveTaskState(state);
    console.log(chalk.green('✓ Saved locally'));
  }

  // Post to GitHub
  if (outputChoice === 'comment' || outputChoice === 'both') {
    const commentSpinner = ora('Posting to GitHub...').start();

    const commentBody = generateDecomposeComment(tasks, strategy);
    const success = addIssueComment(owner, repo, issueNumber, commentBody);

    if (success) {
      commentSpinner.succeed('Posted task breakdown to GitHub');
    } else {
      commentSpinner.fail('Failed to post comment');
    }
  }

  // Summary
  const stats = getCompletionStats(tasks);
  showSuccess('Decomposition Complete', [
    `Issue: #${issueNumber} - ${issue.title}`,
    `Tasks: ${stats.total} (${stats.completed} completed, ${stats.pending} pending)`,
    '',
    'Next steps:',
    `  gtask sync ${issueNumber}     - Sync progress to GitHub`,
    `  gtask sync watch ${issueNumber} - Auto-sync on changes`,
  ]);

  return { issueNumber, tasks };
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'and',
    'but', 'or', 'not', 'this', 'that', 'it', 'bug', 'fix', 'issue', 'error',
  ]);

  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 10);
}

/**
 * Generate tasks from codebase analysis
 */
function generateTasksFromAnalysis(analysis, parsed, issue) {
  const tasks = [];

  // Task 1: Understand the problem
  tasks.push({
    content: 'Review issue and understand the problem',
    activeForm: 'Reviewing issue and understanding the problem',
    status: 'pending',
    metadata: { type: 'research' },
  });

  // Tasks for each relevant file
  for (const fileInfo of analysis.relevantFiles.slice(0, 5)) {
    const file = fileInfo.file;
    const mainFunc = fileInfo.definitions?.[0];

    if (mainFunc) {
      tasks.push({
        content: `Review ${mainFunc.name}() in ${file}`,
        activeForm: `Reviewing ${mainFunc.name}() in ${file}`,
        status: 'pending',
        metadata: {
          type: 'review',
          fileRefs: [{ file, line: mainFunc.line }],
          functionRefs: [mainFunc.name],
        },
      });
    } else {
      tasks.push({
        content: `Analyze ${file} for relevant code`,
        activeForm: `Analyzing ${file}`,
        status: 'pending',
        metadata: {
          type: 'review',
          fileRefs: [{ file, line: null }],
        },
      });
    }
  }

  // Task for implementation
  tasks.push({
    content: 'Implement the fix/feature',
    activeForm: 'Implementing the fix/feature',
    status: 'pending',
    metadata: { type: 'implementation' },
  });

  // Tasks from acceptance criteria
  for (const criterion of parsed.acceptanceCriteria.slice(0, 3)) {
    tasks.push({
      content: `Verify: ${criterion.text}`,
      activeForm: `Verifying: ${criterion.text}`,
      status: criterion.completed ? 'completed' : 'pending',
      metadata: { type: 'verification' },
    });
  }

  return tasks;
}

/**
 * Merge two task lists, avoiding duplicates
 */
function mergeTasks(existing, newTasks) {
  const merged = [...existing];
  const existingTexts = new Set(
    existing.map((t) => t.content.toLowerCase())
  );

  for (const task of newTasks) {
    const textLower = task.content.toLowerCase();
    // Check for similar tasks
    const isDuplicate = [...existingTexts].some(
      (t) => t.includes(textLower) || textLower.includes(t)
    );

    if (!isDuplicate) {
      merged.push(task);
      existingTexts.add(textLower);
    }
  }

  return merged;
}

/**
 * Ensure standard tasks are present
 */
function ensureStandardTasks(tasks) {
  const hasTest = tasks.some(
    (t) => t.content.toLowerCase().includes('test')
  );
  const hasCommit = tasks.some(
    (t) => t.content.toLowerCase().includes('commit')
  );

  if (!hasTest) {
    tasks.push({
      content: 'Test changes locally',
      activeForm: 'Testing changes locally',
      status: 'pending',
      metadata: { type: 'testing' },
    });
  }

  if (!hasCommit) {
    tasks.push({
      content: 'Commit changes with descriptive message',
      activeForm: 'Committing changes',
      status: 'pending',
      metadata: { type: 'commit' },
    });
  }

  return tasks;
}

/**
 * Generate comment body for GitHub
 */
function generateDecomposeComment(tasks, strategy) {
  const stats = getCompletionStats(tasks);
  const checklist = toMarkdownChecklist(tasks);

  return `## Task Breakdown

**Strategy**: ${strategy === 'enhance' ? 'Enhanced from existing checklist' : strategy === 'new' ? 'New analysis' : 'Merged existing + new'}
**Tasks**: ${stats.total} total (${stats.completed} done, ${stats.pending} pending)
**Progress**: ${stats.percentage}%

### Detailed Tasks

${checklist}

---
*Generated by GitHub Task Kit - Use \`gtask sync ${stats.total > 0 ? 'watch' : ''}\` to track progress*`;
}
