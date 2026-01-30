/**
 * Sync Command
 *
 * Synchronize task progress between local state and GitHub issues
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { loadConfigSync, execCommand } from '../utils.js';
import { getIssue, addIssueComment, updateProjectItemField, getProjectItemId } from '../github/client.js';
import { parseIssueBody, toClaudeTaskList, toMarkdownChecklist, getCompletionStats } from '../analysis/checklist-parser.js';

// State directory
const STATE_DIR = join(process.cwd(), '.gtask');

/**
 * Run the sync command
 */
export async function runSync(options) {
  const subcommand = options.subcommand || 'status';
  const issueNumber = options.issue ? parseInt(options.issue, 10) : null;

  switch (subcommand) {
    case 'pull':
      return await syncPull(issueNumber, options);
    case 'push':
      return await syncPush(issueNumber, options);
    case 'watch':
      return await syncWatch(issueNumber, options);
    case 'status':
    default:
      return await syncStatus(issueNumber, options);
  }
}

/**
 * Show sync status
 */
async function syncStatus(issueNumber, options) {
  showHeader('Task Sync Status');

  const states = loadAllTaskStates();

  if (states.length === 0) {
    showWarning('No tracked issues found.');
    console.log(chalk.dim('Run "gtask decompose <issue>" to start tracking.'));
    return;
  }

  console.log(chalk.bold('Tracked Issues:\n'));
  console.log(
    chalk.dim(
      `${'#'.padEnd(8)} ${'Title'.padEnd(40)} ${'Progress'.padEnd(12)} ${'Last Sync'}`
    )
  );
  console.log(chalk.dim('─'.repeat(80)));

  for (const state of states) {
    const stats = getCompletionStats(state.tasks);
    const progress = `${stats.completed}/${stats.total} (${stats.percentage}%)`;
    const lastSync = state.lastSyncedAt
      ? new Date(state.lastSyncedAt).toLocaleDateString()
      : 'never';
    const title = (state.issueTitle || '').slice(0, 38);

    const progressColor =
      stats.percentage === 100
        ? chalk.green
        : stats.percentage > 50
        ? chalk.yellow
        : chalk.white;

    console.log(
      `${chalk.cyan(`#${state.issueNumber}`.padEnd(8))} ${title.padEnd(40)} ${progressColor(
        progress.padEnd(12)
      )} ${chalk.dim(lastSync)}`
    );
  }

  console.log('');
  console.log(chalk.dim('Commands:'));
  console.log(chalk.dim('  gtask sync pull <issue>   - Pull latest from GitHub'));
  console.log(chalk.dim('  gtask sync push <issue>   - Push progress to GitHub'));
  console.log(chalk.dim('  gtask sync watch <issue>  - Auto-sync on changes'));
}

/**
 * Pull task state from GitHub issue
 */
async function syncPull(issueNumber, options) {
  showHeader('Pull from GitHub');

  if (!issueNumber) {
    const { num } = await inquirer.prompt([
      {
        type: 'input',
        name: 'num',
        message: 'Issue number:',
        validate: (input) => parseInt(input, 10) > 0 || 'Enter valid number',
      },
    ]);
    issueNumber = parseInt(num, 10);
  }

  const { config } = loadConfigSync();
  if (!config?.project_board) {
    showError('Not configured');
    return;
  }

  const { owner, repo } = config.project_board;

  const spinner = ora(`Fetching issue #${issueNumber}...`).start();
  const issue = getIssue(owner, repo, issueNumber);

  if (!issue) {
    spinner.fail('Issue not found');
    return;
  }

  spinner.text = 'Parsing issue...';
  const parsed = parseIssueBody(issue.body);
  const tasks = toClaudeTaskList(parsed);

  // Load existing state
  const existingState = loadTaskState(issueNumber);
  const stats = getCompletionStats(tasks);

  spinner.succeed(`Pulled ${tasks.length} tasks from #${issueNumber}`);

  // Check for conflicts
  if (existingState && existingState.tasks) {
    const localStats = getCompletionStats(existingState.tasks);

    if (localStats.completed > stats.completed) {
      showWarning(
        `Local has more progress (${localStats.completed}/${localStats.total}) than GitHub (${stats.completed}/${stats.total})`
      );

      const { resolve } = await inquirer.prompt([
        {
          type: 'list',
          name: 'resolve',
          message: 'How to resolve?',
          choices: [
            { name: 'Keep local (more progress)', value: 'local' },
            { name: 'Use GitHub (overwrite local)', value: 'github' },
            { name: 'Merge (keep completed from both)', value: 'merge' },
          ],
        },
      ]);

      if (resolve === 'local') {
        console.log(chalk.green('✓ Keeping local state'));
        return existingState;
      } else if (resolve === 'merge') {
        // Merge: mark as completed if either has it completed
        for (let i = 0; i < tasks.length; i++) {
          if (existingState.tasks[i]?.status === 'completed') {
            tasks[i].status = 'completed';
          }
        }
        console.log(chalk.green('✓ Merged states'));
      }
    }
  }

  // Save state
  const state = {
    issueNumber,
    issueTitle: issue.title,
    owner,
    repo,
    tasks,
    createdAt: existingState?.createdAt || new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    pullSource: 'github',
  };

  saveTaskState(state);

  showSuccess('Pull Complete', [
    `Issue: #${issueNumber} - ${issue.title}`,
    `Tasks: ${stats.total} (${stats.completed} completed)`,
    `Progress: ${stats.percentage}%`,
  ]);

  return state;
}

/**
 * Push task progress to GitHub
 */
async function syncPush(issueNumber, options) {
  showHeader('Push to GitHub');

  if (!issueNumber) {
    // Show available issues
    const states = loadAllTaskStates();
    if (states.length === 0) {
      showError('No tracked issues', 'Run "gtask decompose <issue>" first.');
      return;
    }

    const { selectedIssue } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedIssue',
        message: 'Select issue to push:',
        choices: states.map((s) => ({
          name: `#${s.issueNumber} - ${s.issueTitle} (${getCompletionStats(s.tasks).percentage}%)`,
          value: s.issueNumber,
        })),
      },
    ]);
    issueNumber = selectedIssue;
  }

  const state = loadTaskState(issueNumber);
  if (!state) {
    showError(`No local state for issue #${issueNumber}`);
    return;
  }

  const { config } = loadConfigSync();
  const { owner, repo, project_number: projectNumber, project_id: projectId } =
    config.project_board;

  const stats = getCompletionStats(state.tasks);

  // Generate update comment
  const spinner = ora('Generating progress update...').start();

  const completedTasks = state.tasks
    .filter((t) => t.status === 'completed')
    .map((t, i) => `  ✅ ${t.content}`)
    .join('\n');

  const pendingTasks = state.tasks
    .filter((t) => t.status !== 'completed')
    .map((t) => `  ⬜ ${t.content}`)
    .join('\n');

  // Get recent commits
  const commitResult = execCommand('git log --oneline -5 2>/dev/null');
  const recentCommits = commitResult.success
    ? commitResult.output
        .split('\n')
        .slice(0, 3)
        .map((c) => `  - ${c}`)
        .join('\n')
    : '  (no recent commits)';

  const commentBody = `## Progress Update

**Status**: ${stats.percentage}% complete (${stats.completed}/${stats.total} tasks)
**Updated**: ${new Date().toISOString()}

### Completed Tasks
${completedTasks || '  (none yet)'}

### Remaining Tasks
${pendingTasks || '  (all done!)'}

### Recent Commits
${recentCommits}

---
*Synced by GitHub Task Kit*`;

  spinner.text = 'Posting to GitHub...';
  const success = addIssueComment(owner, repo, issueNumber, commentBody);

  if (!success) {
    spinner.fail('Failed to post comment');
    return;
  }

  // Update project board status if 100%
  if (stats.percentage === 100 && projectId && config.field_ids?.status) {
    spinner.text = 'Updating project board...';
    const itemId = getProjectItemId(owner, projectNumber, issueNumber);

    if (itemId && config.status_options?.done) {
      updateProjectItemField(
        projectId,
        itemId,
        config.field_ids.status,
        config.status_options.done,
        'single-select'
      );
    }
  }

  // Update local state
  state.lastSyncedAt = new Date().toISOString();
  saveTaskState(state);

  spinner.succeed('Pushed to GitHub');

  showSuccess('Push Complete', [
    `Issue: #${issueNumber}`,
    `Progress: ${stats.percentage}%`,
    `Comment posted with ${stats.completed} completed tasks`,
    stats.percentage === 100 ? 'Project board status updated to Done' : '',
  ].filter(Boolean));
}

/**
 * Watch for changes and auto-sync
 */
async function syncWatch(issueNumber, options) {
  showHeader('Watch Mode');

  if (!issueNumber) {
    const states = loadAllTaskStates();
    if (states.length === 0) {
      showError('No tracked issues');
      return;
    }

    const { selectedIssue } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedIssue',
        message: 'Select issue to watch:',
        choices: states.map((s) => ({
          name: `#${s.issueNumber} - ${s.issueTitle}`,
          value: s.issueNumber,
        })),
      },
    ]);
    issueNumber = selectedIssue;
  }

  const state = loadTaskState(issueNumber);
  if (!state) {
    showError(`No local state for issue #${issueNumber}`);
    return;
  }

  console.log(chalk.cyan(`Watching issue #${issueNumber}: ${state.issueTitle}`));
  console.log(chalk.dim('Press Ctrl+C to stop\n'));

  // Display interactive task list
  let tasks = state.tasks;
  let lastStats = getCompletionStats(tasks);

  const displayTasks = () => {
    console.clear();
    console.log(chalk.cyan.bold(`\n  Issue #${issueNumber}: ${state.issueTitle}\n`));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const status =
        task.status === 'completed'
          ? chalk.green('✓')
          : task.status === 'in_progress'
          ? chalk.yellow('◉')
          : chalk.dim('○');
      const num = chalk.dim(`${i + 1}.`);
      console.log(`  ${status} ${num} ${task.content}`);
    }

    const stats = getCompletionStats(tasks);
    console.log('');
    console.log(
      chalk.dim(`  Progress: ${stats.completed}/${stats.total} (${stats.percentage}%)`)
    );
    console.log('');
    console.log(chalk.dim('  Commands:'));
    console.log(chalk.dim('    c <num>  - Complete task'));
    console.log(chalk.dim('    s <num>  - Start task (in progress)'));
    console.log(chalk.dim('    r <num>  - Reset task (pending)'));
    console.log(chalk.dim('    p        - Push to GitHub'));
    console.log(chalk.dim('    q        - Quit'));
    console.log('');
  };

  displayTasks();

  // Interactive loop
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const { config } = loadConfigSync();

  const processCommand = async (line) => {
    const [cmd, arg] = line.trim().split(/\s+/);
    const taskNum = parseInt(arg, 10) - 1;

    switch (cmd?.toLowerCase()) {
      case 'c':
      case 'complete':
        if (taskNum >= 0 && taskNum < tasks.length) {
          tasks[taskNum].status = 'completed';
          state.tasks = tasks;
          saveTaskState(state);
          console.log(chalk.green(`✓ Task ${taskNum + 1} completed`));
        }
        break;

      case 's':
      case 'start':
        if (taskNum >= 0 && taskNum < tasks.length) {
          tasks[taskNum].status = 'in_progress';
          state.tasks = tasks;
          saveTaskState(state);
          console.log(chalk.yellow(`◉ Task ${taskNum + 1} in progress`));
        }
        break;

      case 'r':
      case 'reset':
        if (taskNum >= 0 && taskNum < tasks.length) {
          tasks[taskNum].status = 'pending';
          state.tasks = tasks;
          saveTaskState(state);
          console.log(chalk.dim(`○ Task ${taskNum + 1} reset`));
        }
        break;

      case 'p':
      case 'push':
        await syncPush(issueNumber, {});
        break;

      case 'q':
      case 'quit':
        rl.close();
        process.exit(0);
        break;

      default:
        if (cmd) {
          console.log(chalk.red('Unknown command'));
        }
    }

    // Check if we should auto-sync
    const newStats = getCompletionStats(tasks);
    if (newStats.completed !== lastStats.completed) {
      // Progress changed, maybe auto-push
      if (newStats.percentage === 100) {
        console.log(chalk.green('\n🎉 All tasks complete! Pushing to GitHub...'));
        await syncPush(issueNumber, {});
      }
      lastStats = newStats;
    }

    setTimeout(displayTasks, 500);
  };

  rl.on('line', processCommand);

  // Handle Ctrl+C
  rl.on('close', () => {
    console.log(chalk.dim('\nStopped watching.'));
    process.exit(0);
  });
}

/**
 * Save task state to disk
 */
export function saveTaskState(state) {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }

  const filePath = join(STATE_DIR, `issue-${state.issueNumber}.json`);
  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Load task state from disk
 */
export function loadTaskState(issueNumber) {
  const filePath = join(STATE_DIR, `issue-${issueNumber}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load all task states
 */
export function loadAllTaskStates() {
  if (!existsSync(STATE_DIR)) {
    return [];
  }

  const files = readdirSync(STATE_DIR).filter((f) => f.startsWith('issue-') && f.endsWith('.json'));
  const states = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(STATE_DIR, file), 'utf8');
      states.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  return states.sort((a, b) => b.issueNumber - a.issueNumber);
}

/**
 * Update a specific task's status
 */
export function updateTaskStatus(issueNumber, taskIndex, status) {
  const state = loadTaskState(issueNumber);
  if (!state || !state.tasks[taskIndex]) {
    return false;
  }

  state.tasks[taskIndex].status = status;
  saveTaskState(state);
  return true;
}
