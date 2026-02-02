/**
 * Roadmap GitHub Integration
 *
 * Fetches issues from GitHub repos or project boards,
 * displays selection tables, and syncs roadmap progress.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../utils.js';
import { safeCreateIssue } from '../utils/safe-exec.js';

/**
 * Check if gh CLI is available and authenticated
 *
 * @returns {Object} { available: boolean, authenticated: boolean, error?: string }
 */
export function checkGhCli() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch (e) {
    return {
      available: false,
      authenticated: false,
      error: 'GitHub CLI (gh) not found. Install from: https://cli.github.com/',
    };
  }

  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return { available: true, authenticated: true };
  } catch (e) {
    return {
      available: true,
      authenticated: false,
      error: 'GitHub CLI not authenticated. Run: gh auth login',
    };
  }
}

/**
 * Get repository info from config or git remote
 *
 * @returns {Object} { owner: string, repo: string } or null
 */
export function getRepoInfo() {
  const config = loadConfig();

  if (config?.owner && config?.repo) {
    return { owner: config.owner, repo: config.repo };
  }

  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (e) {
    // Not a git repo or no origin
  }

  return null;
}

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

  let cmd = `gh issue list --repo "${targetOwner}/${targetRepo}" --state ${state} --limit ${limit}`;
  cmd += ' --json number,title,body,state,labels,assignees,createdAt,updatedAt,url';

  if (labels.length > 0) {
    cmd += ` --label "${labels.join(',')}"`;
  }

  try {
    const result = execSync(cmd, { encoding: 'utf8' });
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
    const cmd = `gh project item-list ${projectNumber} --owner "${targetOwner}" --format json --limit ${limit}`;
    const result = execSync(cmd, { encoding: 'utf8' });
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
    const cmd = `gh issue view ${issueNumber} --repo "${owner}/${repo}" --json number,title,body,state,labels,assignees,comments,createdAt,updatedAt,url`;
    const result = execSync(cmd, { encoding: 'utf8' });
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
  table += chalk.dim('┌' + '─'.repeat(4) + '┬' + '─'.repeat(maxNumberWidth + 2) + '┬' + '─'.repeat(maxTitleWidth + 2) + '┬' + '─'.repeat(12) + '┬' + '─'.repeat(10) + '┐\n');
  table += chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(` ${'Issue'.padEnd(maxNumberWidth)} `) + chalk.dim('│') + chalk.bold(` ${'Title'.padEnd(maxTitleWidth)} `) + chalk.dim('│') + chalk.bold(' Status     ') + chalk.dim('│') + chalk.bold(' Include  ') + chalk.dim('│\n');
  table += chalk.dim('├' + '─'.repeat(4) + '┼' + '─'.repeat(maxNumberWidth + 2) + '┼' + '─'.repeat(maxTitleWidth + 2) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(10) + '┤\n');

  // Rows
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const rowNum = String(i + 1).padStart(2);
    const issueNum = `#${issue.number}`.padEnd(maxNumberWidth);
    const title = (issue.title || '').substring(0, maxTitleWidth).padEnd(maxTitleWidth);
    const status = (issue.state || 'open').padEnd(10);
    const statusColor = issue.state === 'open' ? chalk.green : chalk.dim;

    table += chalk.dim('│') + ` ${rowNum} ` + chalk.dim('│') + ` ${issueNum} ` + chalk.dim('│') + ` ${title} ` + chalk.dim('│') + ` ${statusColor(status)} ` + chalk.dim('│') + '   [ ]    ' + chalk.dim('│\n');
  }

  table += chalk.dim('└' + '─'.repeat(4) + '┴' + '─'.repeat(maxNumberWidth + 2) + '┴' + '─'.repeat(maxTitleWidth + 2) + '┴' + '─'.repeat(12) + '┴' + '─'.repeat(10) + '┘\n');

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

/**
 * Create a GitHub issue for a roadmap phase
 *
 * @param {Object} phase - Phase object
 * @param {Object} roadmap - Parent roadmap
 * @param {Object} options - Creation options
 * @returns {Object} Created issue info
 */
export async function createPhaseIssue(phase, roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    throw new Error('Could not determine repository');
  }

  const title = `[Phase] ${phase.phase_title}`;
  const body = generatePhaseIssueBody(phase, roadmap);
  const labels = ['phase-dev', `roadmap:${roadmap.slug}`];

  if (phase.complexity) {
    labels.push(`complexity:${phase.complexity.toLowerCase()}`);
  }

  // Use safe execution to prevent shell injection
  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate issue body for a roadmap phase
 */
function generatePhaseIssueBody(phase, roadmap) {
  let body = `## ${phase.phase_title}\n\n`;
  body += `**Roadmap:** ${roadmap.title}\n`;
  body += `**Phase ID:** \`${phase.phase_id}\`\n`;
  body += `**Complexity:** ${phase.complexity || 'M'}\n`;
  body += `**Status:** ${phase.status || 'pending'}\n\n`;

  if (phase.goal) {
    body += `### Goal\n\n${phase.goal}\n\n`;
  }

  if (phase.inputs?.issues?.length > 0) {
    body += `### Related Issues\n\n`;
    for (const issue of phase.inputs.issues) {
      body += `- ${issue}\n`;
    }
    body += '\n';
  }

  if (phase.outputs?.length > 0) {
    body += `### Deliverables\n\n`;
    for (const output of phase.outputs) {
      body += `- [ ] ${output}\n`;
    }
    body += '\n';
  }

  if (phase.dependencies?.length > 0) {
    body += `### Dependencies\n\n`;
    body += `This phase depends on: ${phase.dependencies.join(', ')}\n\n`;
  }

  body += `---\n`;
  body += `*Part of [${roadmap.title}] roadmap*\n`;
  body += `*Generated by CCASP*`;

  return body;
}

/**
 * Create an epic issue for a roadmap
 *
 * @param {Object} roadmap - Roadmap object
 * @param {Object} options - Creation options
 * @returns {Object} Created issue info
 */
export async function createRoadmapEpic(roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    throw new Error('Could not determine repository');
  }

  const title = `[Roadmap] ${roadmap.title}`;
  const body = generateRoadmapEpicBody(roadmap);
  const labels = ['roadmap', 'epic'];

  // Use safe execution to prevent shell injection
  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate issue body for roadmap epic
 */
function generateRoadmapEpicBody(roadmap) {
  const phases = roadmap.phases || [];

  let body = `## ${roadmap.title}\n\n`;

  if (roadmap.description) {
    body += `${roadmap.description}\n\n`;
  }

  body += `### Progress\n\n`;
  body += `**Phases:** ${phases.filter(p => p.status === 'completed').length}/${phases.length} complete\n`;
  body += `**Status:** ${roadmap.status || 'planning'}\n\n`;

  // Dependency graph
  if (phases.length > 1) {
    body += `### Dependency Graph\n\n`;
    body += '```mermaid\n';
    body += 'graph LR\n';

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const nodeId = phase.phase_id.replace(/-/g, '_');
      body += `  ${nodeId}["${phase.phase_title}"]\n`;
    }

    for (const phase of phases) {
      if (phase.dependencies?.length > 0) {
        const nodeId = phase.phase_id.replace(/-/g, '_');
        for (const dep of phase.dependencies) {
          const depId = dep.replace(/-/g, '_');
          body += `  ${depId} --> ${nodeId}\n`;
        }
      }
    }

    body += '```\n\n';
  }

  // Phase list
  body += `### Phases\n\n`;

  for (const phase of phases) {
    const statusIcon = phase.status === 'completed' ? '✅' :
                       phase.status === 'in_progress' ? '🔄' :
                       phase.status === 'blocked' ? '🚫' : '⬜';
    body += `${statusIcon} **${phase.phase_title}** (${phase.complexity || 'M'})\n`;
    if (phase.goal) {
      body += `   ${phase.goal.substring(0, 100)}${phase.goal.length > 100 ? '...' : ''}\n`;
    }
    body += '\n';
  }

  body += `---\n`;
  body += `*Generated by CCASP Roadmap Orchestration Framework*`;

  return body;
}

/**
 * Add a progress comment to an issue
 *
 * @param {number} issueNumber - Issue number
 * @param {string} comment - Comment text
 * @param {Object} options - Options with owner/repo
 * @returns {boolean} Success status
 */
export function addProgressComment(issueNumber, comment, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) return false;

  try {
    const escapedComment = comment.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const cmd = `gh issue comment ${issueNumber} --repo "${owner}/${repo}" --body "${escapedComment}"`;
    execSync(cmd, { encoding: 'utf8' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Close an issue
 *
 * @param {number} issueNumber - Issue number
 * @param {string} reason - Closing reason
 * @param {Object} options - Options with owner/repo
 * @returns {boolean} Success status
 */
export function closeIssue(issueNumber, reason, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) return false;

  try {
    if (reason) {
      addProgressComment(issueNumber, `✅ ${reason}`, options);
    }
    const cmd = `gh issue close ${issueNumber} --repo "${owner}/${repo}"`;
    execSync(cmd, { encoding: 'utf8' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sync roadmap progress to GitHub
 *
 * @param {Object} roadmap - Roadmap object
 * @param {Object} options - Sync options
 * @returns {Object} Sync result
 */
export async function syncToGitHub(roadmap, options = {}) {
  const spinner = ora('Syncing roadmap to GitHub...').start();
  const results = { synced: 0, failed: 0, errors: [] };

  for (const phase of roadmap.phases || []) {
    const issueNumber = phase.github_issue_number;
    if (!issueNumber) continue;

    try {
      const progress = phase.metadata?.completed_tasks || 0;
      const total = phase.metadata?.total_tasks || 0;
      const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

      const comment = `📊 **Progress Update**\n\nStatus: ${phase.status}\nTasks: ${progress}/${total} (${percentage}%)\n\n_Updated by CCASP_`;

      const success = addProgressComment(issueNumber, comment, options);

      if (success) {
        results.synced++;

        // Close if completed
        if (phase.status === 'completed') {
          closeIssue(issueNumber, 'Phase completed', options);
        }
      } else {
        results.failed++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`Phase ${phase.phase_id}: ${e.message}`);
    }
  }

  spinner.succeed(`Synced ${results.synced} phases${results.failed > 0 ? `, ${results.failed} failed` : ''}`);

  return results;
}
