/**
 * GitHub CLI Wrapper
 *
 * Thin re-export layer for modularized GitHub client
 */

// Execution helpers
export { safeGhExec } from './client/exec.js';

// Authentication
export { isAuthenticated, getCurrentUser } from './client/auth.js';

// Repository operations
export { listRepos, repoExists, getRepoInfo } from './client/repos.js';

// Issue operations
export {
  createIssue,
  listIssues,
  getIssue,
  addIssueComment,
  updateIssueBody,
  closeIssue,
  createPhaseIssue,
  createRoadmapIssues,
} from './client/issues.js';

// Project board operations
export {
  listProjects,
  getProject,
  listProjectFields,
  getFieldOptions,
  getAllFieldOptions,
  addIssueToProject,
  getProjectItemId,
  updateProjectItemField,
} from './client/projects.js';
