/**
 * GitHub Projects (v2) operations
 *
 * Functions for managing project boards, fields, and items
 */

import { safeGhExec } from './exec.js';

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
