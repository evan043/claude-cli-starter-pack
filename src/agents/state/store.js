/**
 * State Store
 *
 * Core state storage operations: init, load, save.
 */

import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from './locking.js';

/**
 * Get state file path
 */
export function getStatePath(projectRoot) {
  return path.join(projectRoot, '.claude', 'orchestrator', 'state.json');
}

/**
 * Initialize orchestrator state
 */
export async function initOrchestratorState(projectRoot, planConfig) {
  const stateDir = path.join(projectRoot, '.claude', 'orchestrator');
  const statePath = path.join(stateDir, 'state.json');

  // Create directory
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const state = {
    planId: planConfig.planId,
    planPath: planConfig.planPath,
    initialized: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'active',
    currentPhase: planConfig.currentPhase || 'P1',
    activeAgents: [],
    completedTasks: planConfig.completedTasks || [],
    pendingTasks: planConfig.pendingTasks || [],
    failedTasks: [],
    blockedTasks: [],
    tokenBudget: {
      used: 0,
      limit: planConfig.tokenLimit || 100000,
      compactionThreshold: 0.8,
    },
    githubConfig: planConfig.githubConfig || { enabled: false },
    messages: [],
    metrics: {
      tasksCompleted: planConfig.completedTasks?.length || 0,
      tasksFailed: 0,
      tasksBlocked: 0,
      totalAgentsSpawned: 0,
      l2AgentsSpawned: 0,
      l3AgentsSpawned: 0,
      averageTaskDuration: 0,
      totalDuration: 0,
    },
    checkpoints: [],
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return { state, statePath };
}

/**
 * Load orchestrator state
 */
export function loadState(projectRoot) {
  const statePath = getStatePath(projectRoot);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save orchestrator state with locking
 */
export async function saveState(projectRoot, state) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  } finally {
    releaseLock(statePath);
  }
}
