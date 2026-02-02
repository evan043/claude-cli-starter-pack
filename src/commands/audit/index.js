/**
 * Audit Module
 *
 * Unified exports for the claude-audit command module.
 * Provides access to rules, templates, and helper functions.
 *
 * @see https://github.com/evan043/claude-cli-advanced-starter-pack/issues/53
 */

// Rules and configuration
export {
  AUDIT_RULES,
  createAuditResult,
} from './rules.js';

// Enhancement templates
export {
  ENHANCEMENT_TEMPLATES,
  quickStart,
  techStackTable,
  keyLocations,
  importPatterns,
  testingInstructions,
  deploymentSection,
  referenceLinks,
  architectureRules,
  criticalRules,
  fullTemplate,
} from './templates.js';

// Helper functions
export {
  auditClaudeMdFiles,
  auditSingleClaudeMd,
  auditClaudeFolder,
  auditClaudeFolderContents,
  validateSkillOrAgent,
  validateJsonFile,
  checkCommonMisconfigurations,
  calculateOverallScore,
  displayAuditResults,
  showDetailedFixes,
  showBestPracticesReference,
  generateEnhancementSuggestions,
} from './helpers.js';
