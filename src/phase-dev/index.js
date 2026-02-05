/**
 * Phase-Dev Module
 *
 * Execution-level module for phased development.
 * Phase-Dev owns task execution and reports completion to parent roadmaps/epics.
 */

export {
  reportPhaseDevComplete,
  calculateCompletionMetrics,
  markPhaseDevComplete,
  getPhaseDevStatus,
} from './completion-reporter.js';
