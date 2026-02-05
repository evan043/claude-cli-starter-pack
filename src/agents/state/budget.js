/**
 * Token Budget & Checkpoints
 *
 * Token usage tracking and checkpoint management.
 */

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { acquireLock, releaseLock } from './locking.js';
import { getStatePath } from './store.js';

/**
 * Update token budget
 */
export async function updateTokenBudget(projectRoot, tokensUsed) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.tokenBudget.used += tokensUsed;

    const usage = state.tokenBudget.used / state.tokenBudget.limit;
    const needsCompaction = usage >= state.tokenBudget.compactionThreshold;

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return {
      used: state.tokenBudget.used,
      limit: state.tokenBudget.limit,
      usage,
      needsCompaction,
    };
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Create checkpoint
 */
export async function createCheckpoint(projectRoot, summary) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    const checkpoint = {
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      phase: state.currentPhase,
      lastCompletedTask: state.completedTasks[state.completedTasks.length - 1] || null,
      activeAgentCount: state.activeAgents.length,
      summary,
    };

    state.checkpoints.push(checkpoint);
    state.lastUpdated = new Date().toISOString();

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return checkpoint;
  } finally {
    releaseLock(statePath);
  }
}
