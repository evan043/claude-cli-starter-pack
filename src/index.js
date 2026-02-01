/**
 * Claude CLI Advanced Starter Pack - Main Export
 *
 * Platform-agnostic Claude Code enhancement toolkit with:
 * - Tech stack auto-detection
 * - Templated .claude file generation
 * - GitHub Project Board integration
 * - Advanced testing configuration
 */

// CLI
export { showMainMenu, showHeader, showSuccess, showError } from './cli/menu.js';

// Commands
export { runSetup } from './commands/setup.js';
export { runCreate } from './commands/create.js';
export { runList } from './commands/list.js';
export { runInstall } from './commands/install.js';
export { showHelp } from './commands/help.js';
export { runClaudeSettings } from './commands/claude-settings.js';
export { runGtaskInit } from './commands/gtask-init.js';
export { detectTechStack, runDetection } from './commands/detect-tech-stack.js';
export {
  runClaudeAudit,
  showClaudeAuditMenu,
  ENHANCEMENT_TEMPLATES,
  runEnhancement,
} from './commands/claude-audit.js';
export { runSetupWizard, generateSlashCommand } from './commands/setup-wizard.js';

// Template Engine
export {
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,
  flattenObject,
  extractPlaceholders,
  validateTechStack,
} from './utils/template-engine.js';

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

// Roadmap Orchestration Framework
export { runCreateRoadmap } from './commands/create-roadmap.js';
export {
  createRoadmap,
  createPhase,
  validateRoadmap,
  validatePhase,
  calculateCompletion,
  getNextAvailablePhases,
  updateRoadmapMetadata,
  generateSlug,
  ROADMAP_SCHEMA,
  COMPLEXITY,
  PHASE_STATUS,
  ROADMAP_SOURCE,
} from './roadmap/schema.js';
export {
  listRoadmaps,
  loadRoadmap,
  saveRoadmap,
  createNewRoadmap,
  deleteRoadmap,
  addPhase,
  updatePhase,
  removePhase,
  reorderPhase,
  mergePhases,
  splitPhase,
  getRoadmapSummary,
  getRoadmapsDir,
  generateRoadmapsIndex,
} from './roadmap/roadmap-manager.js';
export {
  classifyDomain,
  getPrimaryDomain,
  groupRelatedItems,
  detectDependencies,
  estimateComplexity,
  identifyParallelWork,
  shouldRecommendSinglePhase,
  analyzeScope,
  generatePhaseRecommendations,
  suggestAgents,
} from './roadmap/intelligence.js';
export {
  checkGhCli,
  getRepoInfo,
  fetchIssues,
  fetchProjectItems,
  formatIssueTable,
  parseSelection,
  createPhaseIssue,
  createRoadmapEpic,
  addProgressComment,
  closeIssue,
  syncToGitHub,
} from './roadmap/github-integration.js';
export {
  checkNormalizationStatus,
  normalizeIssue,
  batchNormalize,
  extractNormalizationMetadata,
} from './roadmap/issue-normalizer.js';
export {
  generatePhasePlan,
  generateAllPhasePlans,
  loadPhasePlan,
  updatePhasePlan,
  completeTask,
  getRoadmapProgress,
  getPhasePlansDir,
} from './roadmap/phase-generator.js';
export {
  loadExecutionState,
  checkDependencies,
  startPhase,
  completePhase,
  blockPhase,
  getExecutionStatus,
  autoAdvance,
  syncExecution,
  generateExecutionReport,
} from './roadmap/executor.js';
