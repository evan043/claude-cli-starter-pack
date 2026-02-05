/**
 * Orchestration Lifecycle
 *
 * Pause, resume, complete operations.
 */

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { acquireLock, releaseLock } from './locking.js';
import { getStatePath } from './store.js';

/**
 * Pause orchestration
 */
export async function pauseOrchestration(projectRoot) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.status = 'paused';
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Resume orchestration
 */
export async function resumeOrchestration(projectRoot) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.status = 'active';
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Complete orchestration
 */
export async function completeOrchestration(projectRoot, summary) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.metrics.totalDuration = Date.now() - new Date(state.initialized).getTime();

    // Final checkpoint
    state.checkpoints.push({
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      phase: state.currentPhase,
      type: 'orchestration_complete',
      summary: summary || 'Orchestration completed successfully',
    });

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}
