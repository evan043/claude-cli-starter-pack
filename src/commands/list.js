/**
 * List Command
 *
 * List recent tasks/issues
 */

import chalk from 'chalk';
import ora from 'ora';
import { showHeader, showError } from '../cli/menu.js';
import { loadConfigSync, truncate } from '../utils.js';
import { listIssues, getCurrentUser } from '../github/client.js';

/**
 * Run the list command
 */
export async function runList(options) {
  showHeader('Recent Tasks');

  // Load config
  const { config } = loadConfigSync();

  if (!config || !config.project_board?.owner) {
    showError('Not configured', 'Run "gtask setup" first.');
    return;
  }

  const { owner, repo } = config.project_board;
  const limit = parseInt(options.limit, 10) || 10;
  const state = options.status || 'open';

  let assignee = null;
  if (options.mine) {
    assignee = getCurrentUser();
  }

  console.log(chalk.dim(`Fetching issues from ${owner}/${repo}...`));
  console.log('');

  const spinner = ora('Loading issues...').start();
  const issues = listIssues(owner, repo, { limit, state, assignee });
  spinner.stop();

  if (issues.length === 0) {
    console.log(chalk.yellow('No issues found.'));
    return;
  }

  // Display issues in table format
  console.log(
    chalk.bold(
      `${chalk.cyan('#'.padEnd(6))} ${chalk.white('Title'.padEnd(50))} ${chalk.dim('Labels'.padEnd(20))} ${chalk.dim('Created')}`
    )
  );
  console.log(chalk.dim('─'.repeat(100)));

  for (const issue of issues) {
    const number = `#${issue.number}`.padEnd(6);
    const title = truncate(issue.title, 48).padEnd(50);
    const labels = issue.labels
      .map((l) => l.name)
      .slice(0, 2)
      .join(', ')
      .padEnd(20);
    const created = formatDate(issue.createdAt);

    // Color based on state/labels
    let numberColor = chalk.cyan;
    if (issue.labels.some((l) => l.name.includes('P0') || l.name.includes('Critical'))) {
      numberColor = chalk.red;
    } else if (issue.labels.some((l) => l.name.includes('P1') || l.name.includes('High'))) {
      numberColor = chalk.yellow;
    }

    console.log(
      `${numberColor(number)} ${chalk.white(title)} ${chalk.dim(labels)} ${chalk.dim(created)}`
    );
  }

  console.log('');
  console.log(chalk.dim(`Showing ${issues.length} ${state} issues`));

  // Quick actions hint
  console.log('');
  console.log(chalk.dim('Quick actions:'));
  console.log(chalk.dim(`  gh issue view <number> --repo ${owner}/${repo}`));
  console.log(chalk.dim(`  gh issue edit <number> --repo ${owner}/${repo}`));
}

/**
 * Format date to relative time
 */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }
}
