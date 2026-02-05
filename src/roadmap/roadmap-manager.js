/**
 * Roadmap Manager
 *
 * CRUD operations for roadmaps. Handles file I/O, validation, and
 * roadmap lifecycle management.
 *
 * This is a thin re-export wrapper. Implementation is split into:
 * - manager/crud.js - Create, read, update, delete operations
 * - manager/lifecycle.js - Status transitions, phase progression
 * - manager/queries.js - Search, filter, aggregation, reporting
 */

// CRUD Operations
export {
  loadRoadmap,
  saveRoadmap,
  createNewRoadmap,
  deleteRoadmap,
  addPhase,
  updatePhase,
  removePhase,
  addPhaseDevPlanRef,
  removePhaseDevPlanRef,
  updatePhaseDevPlanRef,
  addCrossPlanDep,
} from './manager/crud.js';

// Lifecycle Operations
export {
  reorderPhase,
  mergePhases,
  splitPhase,
  syncPhaseDevPlanRef,
} from './manager/lifecycle.js';

// Query Operations
export {
  getRoadmapPath,
  getRoadmapDir,
  getRoadmapsDir,
  ensureRoadmapDir,
  ensureRoadmapsDir,
  listRoadmaps,
  getRoadmapSummary,
  generateRoadmapsIndex,
  getNextAvailablePlans,
} from './manager/queries.js';
