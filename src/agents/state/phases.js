/**
 * Phase Operations
 *
 * Phase transitions and advancement.
 */

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { acquireLock, releaseLock } from './locking.js';
import { getStatePath } from './store.js';

/**
 * Advance to next phase
 */
export async function advancePhase(projectRoot, completedPhaseId, nextPhaseId) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.currentPhase = nextPhaseId;

    // Add checkpoint
    state.checkpoints.push({
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      phase: completedPhaseId,
      type: 'phase_complete',
      summary: `Phase ${completedPhaseId} completed, advancing to ${nextPhaseId}`,
    });

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}
