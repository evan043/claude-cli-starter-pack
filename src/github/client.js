/**
 * GitHub CLI Wrapper
 *
 * Provides clean interface for gh CLI operations
 */

import { execCommand, execAsync } from '../utils.js';
import chalk from 'chalk';

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
  const { limit = 30, type = 'all' } = options;
  const cmd = owner
    ? `gh repo list ${owner} --limit ${limit} --json name,description,isPrivate`
    : `gh repo list --limit ${limit} --json name,description,isPrivate`;

  const result = execCommand(cmd);
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
  const result = execCommand(`gh repo view ${owner}/${repo} --json name`);
  return result.success;
}

/**
 * Get repository info
 */
export function getRepoInfo(owner, repo) {
  const result = execCommand(
    `gh repo view ${owner}/${repo} --json name,description,isPrivate,defaultBranchRef`
  );
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
  const result = execCommand(
    `gh project list --owner ${owner} --format json`
  );
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
  const result = execCommand(
    `gh project view ${projectNumber} --owner ${owner} --format json`
  );
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
  const result = execCommand(
    `gh project field-list ${projectNumber} --owner ${owner} --format json`
  );
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
  `;

  const result = execCommand(
    `gh api graphql -f query='${query.replace(/\n/g, ' ')}' -F projectId="${projectId}"`
  );

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
  `;

  const escapedQuery = query.replace(/\n/g, ' ').replace(/"/g, '\\"');
  const result = execCommand(
    `gh api graphql -f query="${escapedQuery}" -F projectId="${projectId}"`
  );

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

  let cmd = `gh issue create --repo ${owner}/${repo}`;
  cmd += ` --title "${title.replace(/"/g, '\\"')}"`;
  cmd += ` --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;

  if (labels.length > 0) {
    cmd += ` --label "${labels.join(',')}"`;
  }

  if (assignees.length > 0) {
    cmd += ` --assignee "${assignees.join(',')}"`;
  }

  const result = execCommand(cmd);
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
    error: result.error || result.stderr || 'Failed to create issue',
  };
}

/**
 * Add issue to project board
 */
export function addIssueToProject(owner, projectNumber, issueUrl) {
  const result = execCommand(
    `gh project item-add ${projectNumber} --owner ${owner} --url "${issueUrl}"`
  );
  return result.success;
}

/**
 * Get project item ID for an issue
 */
export function getProjectItemId(owner, projectNumber, issueNumber) {
  const result = execCommand(
    `gh project item-list ${projectNumber} --owner ${owner} --format json`
  );

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
  let cmd = `gh project item-edit --id "${itemId}" --project-id "${projectId}" --field-id "${fieldId}"`;

  if (fieldType === 'single-select') {
    cmd += ` --single-select-option-id "${value}"`;
  } else if (fieldType === 'number') {
    cmd += ` --number ${value}`;
  } else {
    cmd += ` --text "${value.replace(/"/g, '\\"')}"`;
  }

  const result = execCommand(cmd);
  return result.success;
}

/**
 * List issues for a repo
 */
export function listIssues(owner, repo, options = {}) {
  const { limit = 10, state = 'open', assignee } = options;

  let cmd = `gh issue list --repo ${owner}/${repo} --limit ${limit} --state ${state} --json number,title,state,labels,createdAt,author`;

  if (assignee) {
    cmd += ` --assignee ${assignee}`;
  }

  const result = execCommand(cmd);
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
  const result = execCommand(
    `gh issue view ${issueNumber} --repo ${owner}/${repo} --json number,title,body,state,labels,assignees,createdAt,author`
  );

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
  const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const result = execCommand(
    `gh issue comment ${issueNumber} --repo ${owner}/${repo} --body "${escapedBody}"`
  );
  return result.success;
}
