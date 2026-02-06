/**
 * GitHub Issues Operations
 *
 * Fetch, display, and parse issue information.
 */

import chalk from 'chalk';
import { safeGhExec } from '../../utils/safe-exec.js';
import { getRepoInfo } from './cli.js';

/**
 * Fetch open issues from a GitHub repository
 *
 * @param {Object} options - Fetch options
 * @returns {Array} Array of issue objects
 */
export function fetchIssues(options = {}) {
  const {
    owner,
    repo,
    limit = 50,
    state = 'open',
    labels = [],
  } = options;

  const repoInfo = getRepoInfo();
  const targetOwner = owner || repoInfo?.owner;
  const targetRepo = repo || repoInfo?.repo;

  if (!targetOwner || !targetRepo) {
    throw new Error('Could not determine repository. Run `ccasp setup` first.');
  }

  const args = [
    'issue', 'list',
    '--repo', `${targetOwner}/${targetRepo}`,
    '--state', state,
    '--limit', String(limit),
    '--json', 'number,title,body,state,labels,assignees,createdAt,updatedAt,url',
  ];

  if (labels.length > 0) {
    args.push('--label', labels.join(','));
  }

  try {
    const result = safeGhExec(args);
    return JSON.parse(result);
  } catch (e) {
    console.error(chalk.red(`Failed to fetch issues: ${e.message}`));
    return [];
  }
}

/**
 * Fetch items from a GitHub Project Board
 *
 * @param {Object} options - Fetch options
 * @returns {Array} Array of project items
 */
export function fetchProjectItems(options = {}) {
  const { owner, projectNumber, limit = 100 } = options;

  const repoInfo = getRepoInfo();
  const targetOwner = owner || repoInfo?.owner;

  if (!targetOwner || !projectNumber) {
    throw new Error('Owner and project number required');
  }

  try {
    const args = [
      'project', 'item-list', String(projectNumber),
      '--owner', targetOwner,
      '--format', 'json',
      '--limit', String(limit),
    ];
    const result = safeGhExec(args);
    const data = JSON.parse(result);
    return data.items || [];
  } catch (e) {
    console.error(chalk.red(`Failed to fetch project items: ${e.message}`));
    return [];
  }
}

/**
 * Get detailed info for a specific issue
 *
 * @param {number} issueNumber - Issue number
 * @param {Object} options - Options with owner/repo
 * @returns {Object|null} Issue details or null
 */
export function getIssueDetails(issueNumber, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) return null;

  try {
    const args = [
      'issue', 'view', String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--json', 'number,title,body,state,labels,assignees,comments,createdAt,updatedAt,url',
    ];
    const result = safeGhExec(args);
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

/**
 * Display issues in a selectable table format
 *
 * @param {Array} issues - Array of issues
 * @returns {string} Formatted table string
 */
export function formatIssueTable(issues) {
  if (issues.length === 0) {
    return chalk.yellow('No issues found');
  }

  // Calculate column widths
  const maxNumberWidth = Math.max(5, String(Math.max(...issues.map(i => i.number))).length);
  const maxTitleWidth = Math.min(40, Math.max(...issues.map(i => (i.title || '').length)));

  // Header
  let table = '\n';
  table += chalk.dim(`┌${  '─'.repeat(4)  }┬${  '─'.repeat(maxNumberWidth + 2)  }┬${  '─'.repeat(maxTitleWidth + 2)  }┬${  '─'.repeat(12)  }┬${  '─'.repeat(10)  }┐\n`);
  table += chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(` ${'Issue'.padEnd(maxNumberWidth)} `) + chalk.dim('│') + chalk.bold(` ${'Title'.padEnd(maxTitleWidth)} `) + chalk.dim('│') + chalk.bold(' Status     ') + chalk.dim('│') + chalk.bold(' Include  ') + chalk.dim('│\n');
  table += chalk.dim(`├${  '─'.repeat(4)  }┼${  '─'.repeat(maxNumberWidth + 2)  }┼${  '─'.repeat(maxTitleWidth + 2)  }┼${  '─'.repeat(12)  }┼${  '─'.repeat(10)  }┤\n`);

  // Rows
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const rowNum = String(i + 1).padStart(2);
    const issueNum = `#${issue.number}`.padEnd(maxNumberWidth);
    const title = (issue.title || '').substring(0, maxTitleWidth).padEnd(maxTitleWidth);
    const status = (issue.state || 'open').padEnd(10);
    const statusColor = issue.state === 'open' ? chalk.green : chalk.dim;

    table += `${chalk.dim('│')  } ${rowNum} ${  chalk.dim('│')  } ${issueNum} ${  chalk.dim('│')  } ${title} ${  chalk.dim('│')  } ${statusColor(status)} ${  chalk.dim('│')  }   [ ]    ${  chalk.dim('│\n')}`;
  }

  table += chalk.dim(`└${  '─'.repeat(4)  }┴${  '─'.repeat(maxNumberWidth + 2)  }┴${  '─'.repeat(maxTitleWidth + 2)  }┴${  '─'.repeat(12)  }┴${  '─'.repeat(10)  }┘\n`);

  return table;
}

/**
 * Parse issue selection input
 *
 * @param {string} input - User input like "1,2,5-7,10"
 * @param {number} maxIndex - Maximum valid index
 * @returns {Array} Array of selected indices (0-indexed)
 */
export function parseSelection(input, maxIndex) {
  const selected = new Set();
  const parts = input.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      // Range like "5-7"
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i >= 1 && i <= maxIndex) {
            selected.add(i - 1); // Convert to 0-indexed
          }
        }
      }
    } else if (part.toLowerCase() === 'all') {
      // Select all
      for (let i = 0; i < maxIndex; i++) {
        selected.add(i);
      }
    } else {
      // Single number
      const num = parseInt(part);
      if (!isNaN(num) && num >= 1 && num <= maxIndex) {
        selected.add(num - 1);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}
