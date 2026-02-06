/**
 * Roadmap Executor
 *
 * Orchestrates roadmap execution with dependency checking,
 * agent spawning, progress tracking, and deliverable validation.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - executor/state.js - State persistence
 * - executor/phases.js - Phase lifecycle management
 * - executor/reporting.js - Status and reporting
 */

export { loadExecutionState } from './executor/state.js';

export {
  checkDependencies,
  startPhase,
  completePhase,
  blockPhase,
  autoAdvance,
} from './executor/phases.js';

export {
  getExecutionStatus,
  syncExecution,
  generateExecutionReport,
} from './executor/reporting.js';
