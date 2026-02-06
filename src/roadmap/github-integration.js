/**
 * Roadmap GitHub Integration
 *
 * Fetches issues from GitHub repos or project boards,
 * displays selection tables, and syncs roadmap progress.
 *
 * This is a thin re-export wrapper. All implementations are in submodules.
 */

// CLI utilities
export { checkGhCli, getRepoInfo } from './github-integration/cli.js';

// Issue operations
export {
  fetchIssues,
  fetchProjectItems,
  getIssueDetails,
  formatIssueTable,
  parseSelection,
} from './github-integration/issues.js';

// Phase synchronization
export {
  createPhaseIssue,
  generatePhaseIssueBody,
  createRoadmapEpic,
  generateRoadmapEpicBody,
  addProgressComment,
  closeIssue,
  syncToGitHub,
} from './github-integration/phase-sync.js';

// Multi-project integration
export {
  createProjectIssue,
  generateProjectIssueBody,
  formatDependencies,
  createRoadmapEpicAfterProjects,
  generateMultiProjectEpicBody,
  linkProjectsToEpic,
  updateProjectIssueTask,
  closeProjectIssue,
} from './github-integration/multi-project.js';
