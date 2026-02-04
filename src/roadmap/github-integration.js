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

// ============================================================
// MULTI-PROJECT GITHUB INTEGRATION
// ============================================================

/**
 * Create a GitHub issue for a project within a multi-project roadmap
 * @param {Object} project - Project object
 * @param {Object} roadmap - Parent roadmap
 * @param {Object} options - Creation options
 * @returns {Object} Created issue info
 */
export async function createProjectIssue(project, roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    return { success: false, error: 'Could not determine repository' };
  }

  const title = `[Project] ${project.project_title}`;
  const body = generateProjectIssueBody(project, roadmap);
  const labels = ['project', `roadmap:${roadmap.slug}`, `domain:${project.domain || 'general'}`];

  if (project.complexity) {
    labels.push(`complexity:${project.complexity.toLowerCase()}`);
  }

  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate issue body for a project with FULL phase/task breakdown
 * @param {Object} project - Project object
 * @param {Object} roadmap - Parent roadmap
 * @returns {string} Issue body markdown
 */
export function generateProjectIssueBody(project, roadmap) {
  const totalTasks = (project.phases || []).reduce(
    (sum, p) => sum + (p.tasks?.length || 0),
    0
  );

  let body = `## ${project.project_title}

**Roadmap:** ${roadmap.title}
**Project ID:** \`${project.project_id}\`
**Complexity:** ${project.complexity || 'M'}
**Domain:** ${project.domain || 'general'}
**Exploration Docs:** \`${project.exploration_path || '.claude/exploration/' + project.slug + '/'}\`

### Description
${project.description || 'No description provided.'}

---

`;

  // Add L2 findings if available
  if (project.l2_findings) {
    body += `## Codebase Analysis

### Key Code Patterns
`;

    const snippets = project.l2_findings.code_snippets || [];
    if (snippets.length > 0) {
      snippets.slice(0, 5).forEach(s => {
        body += `- **\`${s.file}\`** (lines ${s.lines?.start || '?'}-${s.lines?.end || '?'}): ${s.relevance || 'Reference'}\n`;
      });
    } else {
      body += `*No code snippets extracted.*\n`;
    }

    body += `
### Files to Modify
`;

    const modifyFiles = project.l2_findings.reference_files?.modify || [];
    if (modifyFiles.length > 0) {
      modifyFiles.forEach(f => {
        body += `- \`${f.path}\` - ${f.reason || 'Primary implementation'} (${f.complexity || 'M'})\n`;
      });
    } else {
      body += `*No files identified.*\n`;
    }

    body += `
### Recommended Agents
`;

    const delegation = project.l2_findings.agent_delegation || {};
    body += `**Primary:** ${delegation.primary_agent || 'general-implementation-agent'}\n`;

    const assignments = delegation.task_assignments || [];
    if (assignments.length > 0) {
      body += `\n| Phase | Task | Agent |\n|-------|------|-------|\n`;
      assignments.slice(0, 10).forEach(a => {
        body += `| ${a.phase} | ${a.task} | ${a.agent} |\n`;
      });
    }

    body += `
---

`;
  }

  // Add full phase breakdown
  body += `## Phase Breakdown

`;

  const phases = project.phases || [];

  if (phases.length === 0) {
    body += `*No phases defined yet. Run L2 discovery to generate phase breakdown.*\n\n`;
  } else {
    phases.forEach((phase, phaseIdx) => {
      const phaseNum = phase.id || phaseIdx + 1;
      const tasks = phase.tasks || [];

      body += `### Phase ${phaseNum}: ${phase.name || 'Untitled'}
**Objective:** ${phase.objective || phase.description || 'Not specified'}
**Complexity:** ${phase.complexity || 'M'}
**Agent:** ${phase.assigned_agent || phase.assignedAgent || 'TBD'}
**Dependencies:** ${formatDependencies(phase.dependencies)}

#### Tasks
`;

      if (tasks.length === 0) {
        body += `*No tasks defined.*\n\n`;
      } else {
        tasks.forEach((task, taskIdx) => {
          const taskId = task.id || `${phaseNum}.${taskIdx + 1}`;
          body += `- [ ] **${taskId}** ${task.title}\n`;

          // Add file info if available
          const taskFiles = task.files || {};
          const modifyFiles = taskFiles.modify || [];
          if (modifyFiles.length > 0) {
            body += `  - Files: ${modifyFiles.map(f => `\`${f.path}\``).slice(0, 3).join(', ')}\n`;
          }

          // Add agent if specified
          if (task.assigned_agent) {
            body += `  - Agent: ${task.assigned_agent}\n`;
          }

          // Add criteria summary
          const criteria = task.acceptance_criteria || [];
          if (criteria.length > 0) {
            body += `  - Criteria: ${criteria.slice(0, 2).join(', ')}\n`;
          }
        });
      }

      body += `
#### Phase ${phaseNum} Validation
`;

      const validationCriteria = phase.validation_criteria || ['All tasks complete', 'No blocking issues'];
      validationCriteria.forEach(c => {
        body += `- [ ] ${c}\n`;
      });

      body += `
---

`;
    });
  }

  // Execution checklist
  body += `## Execution Checklist
- [ ] Review exploration docs in \`${project.exploration_path || '.claude/exploration/' + project.slug + '/'}\`
- [ ] Start Phase 1
`;

  phases.forEach((p, i) => {
    body += `- [ ] Complete Phase ${i + 1} validation\n`;
  });

  body += `- [ ] Final testing (Ralph Loop if enabled)
- [ ] Close this issue with summary

---
*Part of [${roadmap.title}] roadmap*
*Exploration docs: \`${project.exploration_path || '.claude/exploration/' + project.slug + '/'}\`*
*Generated by CCASP Multi-Project Orchestration*
`;

  return body;
}

/**
 * Format dependencies for display
 */
function formatDependencies(deps) {
  if (!deps || deps.length === 0) return 'None';
  return deps.join(', ');
}

/**
 * Create roadmap Epic AFTER all project issues are created
 * Links to all project issues
 * @param {Object} roadmap - Multi-project roadmap
 * @param {Object} options - Creation options
 * @returns {Object} Created epic info
 */
export async function createRoadmapEpicAfterProjects(roadmap, options = {}) {
  const repoInfo = getRepoInfo();
  const owner = options.owner || repoInfo?.owner;
  const repo = options.repo || repoInfo?.repo;

  if (!owner || !repo) {
    return { success: false, error: 'Could not determine repository' };
  }

  const title = `[Roadmap Epic] ${roadmap.title}`;
  const body = generateMultiProjectEpicBody(roadmap);
  const labels = ['roadmap', 'epic', 'multi-project'];

  return safeCreateIssue({
    owner,
    repo,
    title,
    body,
    labels,
  });
}

/**
 * Generate epic body for multi-project roadmap
 */
function generateMultiProjectEpicBody(roadmap) {
  const projects = roadmap.projects || [];

  let body = `## ${roadmap.title}

**Type:** Multi-Project Roadmap
**Projects:** ${projects.length}
**Status:** ${roadmap.status || 'planning'}

`;

  if (roadmap.description) {
    body += `### Description\n\n${roadmap.description}\n\n`;
  }

  // Progress tracking
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  body += `### Progress

| Metric | Value |
|--------|-------|
| Total Projects | ${projects.length} |
| Completed | ${completedProjects} |
| Completion | ${projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0}% |

`;

  // Mermaid dependency graph
  if (projects.length > 1) {
    body += `### Project Dependency Graph

\`\`\`mermaid
graph LR
`;

    for (const project of projects) {
      const nodeId = project.project_id.replace(/-/g, '_');
      const statusIcon = project.status === 'completed' ? '✅' :
                        project.status === 'in_progress' ? '🔄' :
                        project.status === 'ready' ? '⬜' : '⏳';
      body += `  ${nodeId}["${statusIcon} ${project.project_title}"]\n`;
    }

    // Add links if projects have dependencies
    // (For now, projects are independent but could add inter-project deps)

    body += `\`\`\`

`;
  }

  // Project list with issue links
  body += `### Projects

`;

  for (const project of projects) {
    const statusIcon = project.status === 'completed' ? '✅' :
                      project.status === 'in_progress' ? '🔄' :
                      project.status === 'ready' ? '⬜' :
                      project.status === 'discovering' ? '🔍' : '⏳';

    const totalTasks = (project.phases || []).reduce(
      (sum, p) => sum + (p.tasks?.length || 0),
      0
    );

    body += `${statusIcon} **${project.project_title}** (${project.complexity || 'M'})\n`;
    body += `   Domain: ${project.domain || 'general'} | Tasks: ${totalTasks}\n`;

    if (project.github_issue_number) {
      body += `   Issue: #${project.github_issue_number}\n`;
    }

    body += `\n`;
  }

  // Execution config
  body += `### Execution Configuration

| Setting | Value |
|---------|-------|
| Parallel Discovery | ${roadmap.execution_config?.parallel_discovery ? 'Yes' : 'No'} |
| Sequential Execution | ${roadmap.execution_config?.sequential_execution ? 'Yes' : 'No'} |
| Ralph Loop | ${roadmap.execution_config?.ralph_loop_enabled ? 'Enabled' : 'Disabled'} |
| Testing Strategy | ${roadmap.execution_config?.testing_strategy || 'per-project'} |

---
*Generated by CCASP Multi-Project Roadmap Orchestration*
`;

  return body;
}

/**
 * Link all project issues to the roadmap Epic
 * @param {Array} projects - Projects with github_issue_number set
 * @param {number} epicNumber - Epic issue number
 * @param {Object} options - Options
 * @returns {Object} Link results
 */
export async function linkProjectsToEpic(projects, epicNumber, options = {}) {
  const results = { linked: 0, failed: 0, errors: [] };

  for (const project of projects) {
    if (!project.github_issue_number) continue;

    const comment = `Parent Epic: #${epicNumber}`;

    try {
      const success = addProgressComment(project.github_issue_number, comment, options);
      if (success) {
        results.linked++;
      } else {
        results.failed++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`Project ${project.project_id}: ${e.message}`);
    }
  }

  return results;
}

/**
 * Update project issue with task completion
 * @param {number} issueNumber - Issue number
 * @param {Object} task - Completed task
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
export function updateProjectIssueTask(issueNumber, task, options = {}) {
  const comment = `✅ Task **${task.id}** completed: ${task.title}`;
  return addProgressComment(issueNumber, comment, options);
}

/**
 * Close project issue with summary
 * @param {number} issueNumber - Issue number
 * @param {Object} summary - Completion summary
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
export function closeProjectIssue(issueNumber, summary = {}, options = {}) {
  const completionMessage = `
## Project Completed 🎉

### Summary
${summary.message || 'Project completed successfully.'}

### Statistics
- Tasks Completed: ${summary.tasksCompleted || 'All'}
- Duration: ${summary.duration || 'Not tracked'}
- Test Results: ${summary.testResults || 'N/A'}

### Manual Testing Recommendations
${summary.manualTestingRecommendations || '- Review UI/UX\n- Test edge cases\n- Verify performance'}

---
*Closed by CCASP Multi-Project Orchestration*
`;

  return closeIssue(issueNumber, completionMessage, options);
}
