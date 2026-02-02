/**
 * GitHub CLI Wrapper
 *
 * Provides clean interface for gh CLI operations
 * Uses execFileSync to prevent shell injection vulnerabilities
 */

import { execCommand, execAsync } from '../utils.js';
import { execFileSync } from 'child_process';
import chalk from 'chalk';

/**
 * Safely execute gh CLI commands using execFileSync (no shell injection)
 * @param {string[]} args - Array of arguments for gh command
 * @param {Object} options - execFileSync options
 * @returns {{ success: boolean, output: string, error?: string }}
 */
function safeGhExec(args, options = {}) {
  try {
    const output = execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      ...options,
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.stderr || error.message,
    };
  }
}

/**
 * Check if gh CLI is authenticated
 */
export function isAuthenticated() {
  const result = execCommand('gh auth status');
  return result.success;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  const result = execCommand('gh api user --jq ".login"');
  if (result.success) {
    return result.output;
  }
  return null;
}

/**
 * List repositories for a user/org
 */
export function listRepos(owner, options = {}) {
  const { limit = 30 } = options;
  const args = owner
    ? ['repo', 'list', owner, '--limit', String(limit), '--json', 'name,description,isPrivate']
    : ['repo', 'list', '--limit', String(limit), '--json', 'name,description,isPrivate'];

  const result = safeGhExec(args);
  if (result.success) {
    try {
      return JSON.parse(result.output);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Check if repo exists and is accessible
 */
export function repoExists(owner, repo) {
  const result = safeGhExec(['repo', 'view', `${owner}/${repo}`, '--json', 'name']);
  return result.success;
}

/**
 * Get repository info
 */
export function getRepoInfo(owner, repo) {
  const result = safeGhExec([
    'repo', 'view', `${owner}/${repo}`,
    '--json', 'name,description,isPrivate,defaultBranchRef'
  ]);
  if (result.success) {
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * List GitHub Projects for a user/org
 */
export function listProjects(owner) {
  const result = safeGhExec(['project', 'list', '--owner', owner, '--format', 'json']);
  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      return data.projects || [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get project details
 */
export function getProject(owner, projectNumber) {
  const result = safeGhExec([
    'project', 'view', String(projectNumber),
    '--owner', owner,
    '--format', 'json'
  ]);
  if (result.success) {
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * List project fields
 */
export function listProjectFields(owner, projectNumber) {
  const result = safeGhExec([
    'project', 'field-list', String(projectNumber),
    '--owner', owner,
    '--format', 'json'
  ]);
  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      return data.fields || [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get field options for single-select fields via GraphQL
 */
export function getFieldOptions(projectId, fieldId) {
  // Note: fieldId is interpolated into the query, but GraphQL handles this safely
  // via variable substitution for projectId. fieldId is a field name, not user input.
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          field(name: "${fieldId}") {
            ... on ProjectV2SingleSelectField {
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  `.replace(/\n/g, ' ');

  const result = safeGhExec([
    'api', 'graphql',
    '-f', `query=${query}`,
    '-F', `projectId=${projectId}`
  ]);

  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      return data?.data?.node?.field?.options || [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get all single-select field options for a project
 */
export function getAllFieldOptions(projectId) {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2IterationField {
                id
                name
              }
            }
          }
        }
      }
    }
  `.replace(/\n/g, ' ');

  const result = safeGhExec([
    'api', 'graphql',
    '-f', `query=${query}`,
    '-F', `projectId=${projectId}`
  ]);

  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      return data?.data?.node?.fields?.nodes || [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Create a GitHub issue
 */
export async function createIssue(owner, repo, options) {
  const { title, body, labels = [], assignees = [] } = options;

  const args = [
    'issue', 'create',
    '--repo', `${owner}/${repo}`,
    '--title', title,
    '--body', body,
  ];

  if (labels.length > 0) {
    args.push('--label', labels.join(','));
  }

  if (assignees.length > 0) {
    args.push('--assignee', assignees.join(','));
  }

  const result = safeGhExec(args);
  if (result.success) {
    // Extract issue URL from output
    const urlMatch = result.output.match(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/
    );
    if (urlMatch) {
      const issueNumber = urlMatch[0].split('/').pop();
      return {
        success: true,
        url: urlMatch[0],
        number: parseInt(issueNumber, 10),
      };
    }
  }

  return {
    success: false,
    error: result.error || 'Failed to create issue',
  };
}

/**
 * Add issue to project board
 */
export function addIssueToProject(owner, projectNumber, issueUrl) {
  const result = safeGhExec([
    'project', 'item-add', String(projectNumber),
    '--owner', owner,
    '--url', issueUrl
  ]);
  return result.success;
}

/**
 * Get project item ID for an issue
 */
export function getProjectItemId(owner, projectNumber, issueNumber) {
  const result = safeGhExec([
    'project', 'item-list', String(projectNumber),
    '--owner', owner,
    '--format', 'json'
  ]);

  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      const item = data.items?.find(
        (i) => i.content?.number === issueNumber
      );
      return item?.id || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Update project item field
 */
export function updateProjectItemField(
  projectId,
  itemId,
  fieldId,
  value,
  fieldType = 'text'
) {
  const args = [
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectId,
    '--field-id', fieldId,
  ];

  if (fieldType === 'single-select') {
    args.push('--single-select-option-id', value);
  } else if (fieldType === 'number') {
    args.push('--number', String(value));
  } else {
    args.push('--text', value);
  }

  const result = safeGhExec(args);
  return result.success;
}

/**
 * List issues for a repo
 */
export function listIssues(owner, repo, options = {}) {
  const { limit = 10, state = 'open', assignee } = options;

  const args = [
    'issue', 'list',
    '--repo', `${owner}/${repo}`,
    '--limit', String(limit),
    '--state', state,
    '--json', 'number,title,state,labels,createdAt,author'
  ];

  if (assignee) {
    args.push('--assignee', assignee);
  }

  const result = safeGhExec(args);
  if (result.success) {
    try {
      return JSON.parse(result.output);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get issue details
 */
export function getIssue(owner, repo, issueNumber) {
  const result = safeGhExec([
    'issue', 'view', String(issueNumber),
    '--repo', `${owner}/${repo}`,
    '--json', 'number,title,body,state,labels,assignees,createdAt,author'
  ]);

  if (result.success) {
    try {
      return JSON.parse(result.output);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Add comment to issue
 */
export function addIssueComment(owner, repo, issueNumber, body) {
  const result = safeGhExec([
    'issue', 'comment', String(issueNumber),
    '--repo', `${owner}/${repo}`,
    '--body', body
  ]);
  return result.success;
}

/**
 * Create a phase development issue with full metadata
 */
export async function createPhaseIssue(owner, repo, phaseConfig) {
  const {
    planName,
    planId,
    scale,
    phases,
    taskCount,
    estimatedSuccessRate,
    progressJsonPath,
    labels = ['phase-dev'],
  } = phaseConfig;

  // Build issue body
  const body = generatePhaseIssueBody({
    planName,
    planId,
    scale,
    phases,
    taskCount,
    estimatedSuccessRate,
    progressJsonPath,
  });

  // Add scale-based labels
  const allLabels = [...labels];
  if (scale) {
    allLabels.push(`scale:${scale.toLowerCase()}`);
  }

  const result = await createIssue(owner, repo, {
    title: `[Phase Dev] ${planName}`,
    body,
    labels: allLabels,
  });

  return result;
}

/**
 * Generate issue body for phase development plan
 */
function generatePhaseIssueBody(config) {
  const {
    planName,
    planId,
    scale,
    phases,
    taskCount,
    estimatedSuccessRate,
    progressJsonPath,
  } = config;

  let body = `## ${planName}\n\n`;
  body += `**Plan ID:** \`${planId}\`\n`;
  body += `**Scale:** ${scale || 'Auto'}\n`;
  body += `**Tasks:** ${taskCount}\n`;
  body += `**Estimated Success Rate:** ${Math.round(estimatedSuccessRate * 100)}%\n`;
  body += `**Progress File:** \`${progressJsonPath}\`\n\n`;

  body += `---\n\n`;
  body += `## Phases\n\n`;

  if (phases && phases.length > 0) {
    phases.forEach((phase, index) => {
      const statusEmoji = phase.status === 'completed' ? '✅' : phase.status === 'in_progress' ? '🔄' : '⬜';
      body += `### ${statusEmoji} Phase ${index + 1}: ${phase.name}\n\n`;

      if (phase.description) {
        body += `${phase.description}\n\n`;
      }

      if (phase.tasks && phase.tasks.length > 0) {
        body += `**Tasks:**\n`;
        phase.tasks.forEach((task) => {
          const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
          body += `- ${checkbox} ${task.title || task.id}\n`;
        });
        body += `\n`;
      }

      if (phase.success_criteria && phase.success_criteria.length > 0) {
        body += `**Success Criteria:**\n`;
        phase.success_criteria.forEach((criteria) => {
          body += `- ${criteria}\n`;
        });
        body += `\n`;
      }
    });
  }

  body += `---\n\n`;
  body += `## Tracking\n\n`;
  body += `This issue is automatically tracked by CCASP phase development system.\n`;
  body += `Progress updates will be posted as comments when phases complete.\n\n`;
  body += `\`\`\`\n`;
  body += `To track progress: /phase-track ${planId}\n`;
  body += `\`\`\`\n`;

  return body;
}

/**
 * Create roadmap with parent epic and child phase issues
 */
export async function createRoadmapIssues(owner, repo, roadmapConfig) {
  const {
    roadmapName,
    roadmapSlug,
    projects,
    dependencyGraph,
    labels = ['roadmap', 'epic'],
  } = roadmapConfig;

  // Create parent epic issue
  const epicBody = generateRoadmapEpicBody(roadmapConfig);

  const epicResult = await createIssue(owner, repo, {
    title: `[Roadmap] ${roadmapName}`,
    body: epicBody,
    labels,
  });

  if (!epicResult.success) {
    return { success: false, error: epicResult.error };
  }

  const childIssues = [];

  // Create child issues for each project/phase
  if (projects && projects.length > 0) {
    for (const project of projects) {
      const childResult = await createIssue(owner, repo, {
        title: `[Phase] ${project.project_name}`,
        body: generatePhaseChildBody(project, epicResult.number),
        labels: ['phase-dev', `roadmap:${roadmapSlug}`],
      });

      if (childResult.success) {
        childIssues.push({
          projectId: project.project_id,
          issueNumber: childResult.number,
          issueUrl: childResult.url,
        });
      }
    }
  }

  return {
    success: true,
    epicIssue: epicResult,
    childIssues,
  };
}

/**
 * Generate epic issue body for roadmap
 */
function generateRoadmapEpicBody(config) {
  const {
    roadmapName,
    roadmapSlug,
    primaryGoal,
    projects,
    totalProjects,
    completedProjects,
  } = config;

  let body = `## ${roadmapName}\n\n`;

  if (primaryGoal) {
    body += `**Goal:** ${primaryGoal}\n\n`;
  }

  body += `**Progress:** ${completedProjects || 0} / ${totalProjects || projects?.length || 0} phases complete\n\n`;

  body += `---\n\n`;
  body += `## Phases\n\n`;

  if (projects && projects.length > 0) {
    // Generate Mermaid dependency graph
    body += `### Dependency Graph\n\n`;
    body += '```mermaid\n';
    body += 'graph LR\n';
    projects.forEach((project, index) => {
      const nodeId = `P${index + 1}`;
      body += `  ${nodeId}["${project.project_name}"]\n`;
    });
    // Add dependency arrows if available
    projects.forEach((project, index) => {
      if (project.dependencies && project.dependencies.length > 0) {
        const nodeId = `P${index + 1}`;
        project.dependencies.forEach((depId) => {
          const depIndex = projects.findIndex((p) => p.project_id === depId);
          if (depIndex >= 0) {
            body += `  P${depIndex + 1} --> ${nodeId}\n`;
          }
        });
      }
    });
    body += '```\n\n';

    // List phases
    body += `### Phase List\n\n`;
    projects.forEach((project, index) => {
      const statusEmoji = project.status === 'completed' ? '✅' : project.status === 'in_progress' ? '🔄' : '⬜';
      body += `${index + 1}. ${statusEmoji} **${project.project_name}**`;
      if (project.description) {
        body += ` - ${project.description}`;
      }
      body += `\n`;
    });
  }

  body += `\n---\n\n`;
  body += `## Commands\n\n`;
  body += `\`\`\`bash\n`;
  body += `# View roadmap status\n`;
  body += `/roadmap-status ${roadmapSlug}\n\n`;
  body += `# Sync with GitHub\n`;
  body += `ccasp roadmap sync ${roadmapSlug}\n`;
  body += `\`\`\`\n`;

  return body;
}

/**
 * Generate child issue body for roadmap phase
 */
function generatePhaseChildBody(project, parentIssueNumber) {
  let body = `## ${project.project_name}\n\n`;
  body += `**Parent Roadmap:** #${parentIssueNumber}\n`;
  body += `**Priority:** ${project.priority || 'MEDIUM'}\n`;
  body += `**Estimated Effort:** ${project.estimated_effort_hours || 'TBD'}\n\n`;

  if (project.description) {
    body += `${project.description}\n\n`;
  }

  if (project.phase_dev_config?.progress_json_path) {
    body += `**Progress File:** \`${project.phase_dev_config.progress_json_path}\`\n\n`;
  }

  body += `---\n\n`;
  body += `This phase is part of roadmap #${parentIssueNumber}.\n`;

  return body;
}

/**
 * Update issue body (for progress updates)
 */
export function updateIssueBody(owner, repo, issueNumber, body) {
  const result = safeGhExec([
    'issue', 'edit', String(issueNumber),
    '--repo', `${owner}/${repo}`,
    '--body', body
  ]);
  return result.success;
}

/**
 * Close issue with completion comment
 */
export function closeIssue(owner, repo, issueNumber, comment) {
  if (comment) {
    addIssueComment(owner, repo, issueNumber, comment);
  }
  const result = safeGhExec([
    'issue', 'close', String(issueNumber),
    '--repo', `${owner}/${repo}`
  ]);
  return result.success;
}
