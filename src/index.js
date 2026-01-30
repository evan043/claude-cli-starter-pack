/**
 * GitHub Task Kit - Main Export
 *
 * Comprehensive GitHub Issue Creator with Codebase Analysis
 */

// CLI
export { showMainMenu, showHeader, showSuccess, showError } from './cli/menu.js';

// Commands
export { runSetup } from './commands/setup.js';
export { runCreate } from './commands/create.js';
export { runList } from './commands/list.js';
export { runInstall } from './commands/install.js';
export { showHelp } from './commands/help.js';

// GitHub client
export {
  isAuthenticated,
  getCurrentUser,
  listRepos,
  repoExists,
  listProjects,
  getProject,
  listProjectFields,
  createIssue,
  addIssueToProject,
  listIssues,
} from './github/client.js';

// Codebase analysis
export {
  searchFiles,
  searchContent,
  findDefinitions,
  extractSnippet,
  analyzeForIssue,
  detectProjectType,
} from './analysis/codebase.js';

// Templates
export {
  generateIssueBody,
  generateSimpleIssueBody,
  suggestAcceptanceCriteria,
} from './templates/issue-body.js';

export {
  generateClaudeCommand,
  generateMinimalClaudeCommand,
} from './templates/claude-command.js';

// Utils
export {
  getVersion,
  checkPrerequisites,
  loadConfigSync,
  execCommand,
} from './utils.js';
