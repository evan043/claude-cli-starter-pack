/**
 * State Manager
 *
 * Manages orchestrator state with file locking for
 * concurrent access from multiple agents.
 *
 * This is a thin re-export wrapper for the modular state management system.
 */

// Import all functions for default export
import {
  getStatePath,
  initOrchestratorState,
  loadState,
  saveState,
} from './state/store.js';

import {
  updateAgentStatus,
  addActiveAgent,
  getAgentTasks,
} from './state/agents.js';

import {
  getPendingTasksForPhase,
  getStatus,
} from './state/queries.js';

import {
  advancePhase,
} from './state/phases.js';

import {
  addMessage,
  getMessages,
  markMessageProcessed,
} from './state/messages.js';

import {
  updateTokenBudget,
  createCheckpoint,
} from './state/budget.js';

import {
  pauseOrchestration,
  resumeOrchestration,
  completeOrchestration,
} from './state/lifecycle.js';

import {
  initProjectOrchestratorState,
  loadProjectState,
  saveProjectState,
  updateL2Findings,
  getAllProjectStates,
  markProjectDiscoveryComplete,
  completeProjectOrchestration,
} from './state/projects.js';

// Re-export all named exports
export {
  getStatePath,
  initOrchestratorState,
  loadState,
  saveState,
  updateAgentStatus,
  addActiveAgent,
  getAgentTasks,
  getPendingTasksForPhase,
  getStatus,
  advancePhase,
  addMessage,
  getMessages,
  markMessageProcessed,
  updateTokenBudget,
  createCheckpoint,
  pauseOrchestration,
  resumeOrchestration,
  completeOrchestration,
  initProjectOrchestratorState,
  loadProjectState,
  saveProjectState,
  updateL2Findings,
  getAllProjectStates,
  markProjectDiscoveryComplete,
  completeProjectOrchestration,
};

// Default export for backward compatibility
export default {
  initOrchestratorState,
  loadState,
  saveState,
  updateAgentStatus,
  addActiveAgent,
  getAgentTasks,
  getPendingTasksForPhase,
  advancePhase,
  addMessage,
  getMessages,
  markMessageProcessed,
  updateTokenBudget,
  createCheckpoint,
  getStatus,
  pauseOrchestration,
  resumeOrchestration,
  completeOrchestration,
  // Per-project functions
  initProjectOrchestratorState,
  loadProjectState,
  saveProjectState,
  updateL2Findings,
  getAllProjectStates,
  markProjectDiscoveryComplete,
  completeProjectOrchestration,
};
