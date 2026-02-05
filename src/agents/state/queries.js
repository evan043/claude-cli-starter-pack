/**
 * State Queries
 *
 * Query and filtering operations on state.
 */

import { loadState } from './store.js';

/**
 * Get pending tasks for a phase
 */
export function getPendingTasksForPhase(projectRoot, phaseId) {
  const state = loadState(projectRoot);
  if (!state) return [];

  return state.pendingTasks.filter(taskId => taskId.startsWith(phaseId));
}

/**
 * Get orchestration status
 */
export function getStatus(projectRoot) {
  const state = loadState(projectRoot);
  if (!state) {
    return { active: false };
  }

  return {
    active: state.status === 'active',
    planId: state.planId,
    currentPhase: state.currentPhase,
    progress: {
      completed: state.completedTasks.length,
      pending: state.pendingTasks.length,
      failed: state.failedTasks.length,
      blocked: state.blockedTasks.length,
    },
    activeAgents: state.activeAgents.length,
    tokenUsage: state.tokenBudget.used / state.tokenBudget.limit,
    metrics: state.metrics,
    lastUpdated: state.lastUpdated,
  };
}
