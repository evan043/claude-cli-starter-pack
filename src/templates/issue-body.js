/**
 * Issue Body Templates
 *
 * Generates comprehensive GitHub issue bodies with codebase analysis
 *
 * This is a thin re-export wrapper. Implementation split into submodules:
 * - generator.js - main issue body generation functions
 * - sections.js - section builders (task lists, metadata, etc.)
 * - code-analysis.js - code analysis section generators
 * - planning.js - planning/phase section generators
 * - formatters.js - formatting utilities, markdown helpers
 */

// Main generators
export {
  generateIssueBody,
  generateSimpleIssueBody,
} from './issue-body/generator.js';

// Section builders
export {
  generateTodoSection,
  generateTestingSection,
  generateAgentRecommendationSection,
  suggestAcceptanceCriteria,
} from './issue-body/sections.js';

// Code analysis
export {
  generateCodeAnalysisSection,
  generateApiStatusSection,
  getAgentRecommendation,
} from './issue-body/code-analysis.js';

// Planning/phase sections
export {
  generateTypeSpecificSection,
} from './issue-body/planning.js';

// Formatters
export {
  getLanguageForExt,
} from './issue-body/formatters.js';

// Re-export from other modules for convenience
export {
  getIssueType,
  getTypeSections,
  getTypeLabels,
  getTypeAcceptanceCriteria,
  getRequiredFields,
  validateIssueData,
  getAvailableTypes,
  isValidType,
} from './issue-types.js';

export {
  generateCCSAPMeta,
  parseCCSAPMeta,
  updateCCSAPMeta,
  hasCCSAPMeta,
  extractCCSAPMetaBlock,
} from './issue-metadata.js';

export {
  generateFilesSection,
  generateFilesList,
  generateCompactFilesSection,
  generateGroupedFilesSection,
  generateFileLinksSection,
  formatFilePath,
  createFileObject,
} from './generated-files-section.js';
