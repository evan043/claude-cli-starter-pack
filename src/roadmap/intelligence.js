/**
 * Roadmap Intelligence Layer
 *
 * Smart grouping, dependency detection, complexity estimation,
 * and parallel work identification for roadmap planning.
 *
 * This module is a re-export wrapper for the intelligence submodules.
 */

// Re-export classifier functions
export {
  classifyDomain,
  getPrimaryDomain,
  groupRelatedItems,
  formatProjectTitle,
  DOMAIN_KEYWORDS,
} from './intelligence/classifier.js';

// Re-export analyzer functions
export {
  detectDependencies,
  analyzeFileOverlap,
  estimateComplexity,
  analyzeScope,
  hasIndependentWorkflows,
  hasSignificantComplexitySpread,
  hasExplicitProjectMarkers,
  identifyIndependentTracks,
} from './intelligence/analyzer.js';

// Re-export recommender functions
export {
  identifyParallelWork,
  generatePhaseRecommendations,
  suggestAgents,
  detectMultiProjectPatterns,
  analyzeProjectForL2Delegation,
} from './intelligence/recommender.js';

// Re-export COMPLEXITY from schema for backward compatibility
export { COMPLEXITY } from './schema.js';
