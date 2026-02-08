/**
 * Roadmap Schema & Validation
 *
 * Main entry point that re-exports all schema functionality from submodules.
 * This file maintains the original API while delegating to focused modules.
 */

// Re-export constants and schemas
export {
  ROADMAP_SCHEMA,
  COMPLEXITY,
  PHASE_STATUS,
  ROADMAP_SOURCE,
  MULTI_PROJECT_ROADMAP_SCHEMA,
} from './schema/constants.js';

// Re-export validators
export {
  validateRoadmap,
  validatePhase,
  validateMultiProjectRoadmap,
  detectDependencyCycles,
  checkPlanDependencies,
  validateCompliance,
} from './schema/validators.js';

// Re-export generators
export {
  generateSlug,
  createRoadmap,
  createPhase,
  createPlanReference,
  createMultiProjectRoadmap,
  createProject,
} from './schema/generators.js';

// Re-export calculators
export {
  calculateCompletion,
  calculateOverallCompletion,
  calculateMultiProjectCompletion,
  getNextAvailablePhases,
  getNextAvailableProjects,
} from './schema/calculators.js';

// Re-export mutations
export {
  updateRoadmapMetadata,
  addPlanReference,
  removePlanReference,
  updatePlanReference,
  addCrossPlanDependency,
  updateMultiProjectRoadmapMetadata,
} from './schema/mutations.js';

// Re-export migrations
export {
  migrateLegacyRoadmap,
} from './schema/migrations.js';
