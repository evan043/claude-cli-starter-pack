/**
 * Phase Plan Generator
 *
 * Generates phase-dev-plan JSON files from roadmap phases.
 * Each phase gets its own PROGRESS.json for tracking.
 *
 * This is a thin re-export wrapper for the decomposed submodules.
 */

// Re-export from generator submodule
export {
  getPhasePlansDir,
  ensurePhasePlansDir,
  generatePhasePlan,
  generateAllPhasePlans,
} from './phase-gen/generator.js';

// Re-export from tracker submodule
export {
  loadPhasePlan,
  updatePhasePlan,
  completeTask,
  getRoadmapProgress,
} from './phase-gen/tracker.js';
