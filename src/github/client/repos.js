/**
 * GitHub repository operations
 *
 * Functions for listing, viewing, and checking repos
 */

import { safeGhExec } from './exec.js';

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
