/**
 * Progress Aggregation for Epic/Roadmap/Phase/Task Hierarchy
 *
 * Rolls up progress from bottom to top:
 * - Task completion → Phase progress
 * - Phase completion → Roadmap progress
 * - Roadmap completion → Epic progress
 *
 * Decomposed into:
 * - progress/constants.js - HierarchyStatus enum
 * - progress/aggregators.js - Core aggregation functions
 * - progress/formatters.js - Display and velocity calculations
 * - progress/closers.js - GitHub issue auto-closure
 */

export { HierarchyStatus } from './progress/constants.js';
export { aggregateEpicProgress, aggregateRoadmapProgress, aggregatePhaseProgress, getProgressAtLevel, determineStatus } from './progress/aggregators.js';
export { formatProgressSummary, calculateVelocity } from './progress/formatters.js';
export { closePhaseDevIssueIfComplete, closeRoadmapIssueIfComplete, closeEpicIssueIfComplete } from './progress/closers.js';
