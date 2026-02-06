/**
 * Audit Helper Functions
 *
 * Helper and utility functions for auditing CLAUDE.md files
 * and .claude/ folder structure.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - helpers/validators.js - CLAUDE.md validation, folder structure checks, file validators
 * - helpers/formatters.js - Score calculation, terminal output display, best practices
 * - helpers/fixers.js - Detailed fix instructions, enhancement suggestions
 */

// Validators
export {
  auditClaudeMdFiles,
  auditSingleClaudeMd,
  auditClaudeFolder,
  auditClaudeFolderContents,
  validateSkillOrAgent,
  validateJsonFile,
  checkCommonMisconfigurations,
} from './helpers/validators.js';

// Formatters
export {
  calculateOverallScore,
  displayAuditResults,
  showBestPracticesReference,
} from './helpers/formatters.js';

// Fixers
export {
  showDetailedFixes,
  generateEnhancementSuggestions,
} from './helpers/fixers.js';
