/**
 * Orchestration Module
 *
 * Provides cross-level coordination for Epic/Roadmap/Phase/Task hierarchy.
 *
 * Main capabilities:
 * - Delegation protocol for standardized messaging
 * - Gating logic for roadmap transitions
 * - Token budget management and allocation
 * - Progress aggregation from bottom to top
 */

// Delegation Protocol
export {
  MessageTypes,
  Levels,
  createSpawnMessage,
  createCompleteMessage,
  createBlockedMessage,
  createFailedMessage,
  parseCompletionOutput,
  formatSpawnPrompt,
  formatCompleteOutput,
  formatBlockedOutput,
  formatFailedOutput
} from './delegation-protocol.js';

// Gating
export {
  GateTypes,
  GateResults,
  checkGates,
  checkTestGate,
  checkDocsGate,
  requestManualOverride,
  applyGateOverride,
  formatGateResults,
  logGateDecision,
  canOverrideGate
} from './gating.js';

// Token Budget
export {
  BudgetStatus,
  DEFAULT_COMPACTION_THRESHOLD,
  createTokenBudget,
  allocateBudget,
  trackUsage,
  checkBudget,
  shouldCompact,
  reallocateBudget,
  releaseBudget,
  getBudgetSummary,
  formatBudgetSummary
} from './token-budget.js';

// Progress Aggregation
export {
  HierarchyStatus,
  aggregateEpicProgress,
  aggregateRoadmapProgress,
  aggregatePhaseProgress,
  getProgressAtLevel,
  determineStatus,
  formatProgressSummary,
  calculateVelocity
} from './progress-aggregator.js';
