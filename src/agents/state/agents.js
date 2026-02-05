/**
 * Agent Operations
 *
 * Agent lifecycle management: adding, updating, task assignment.
 */

import fs from 'fs';
import { acquireLock, releaseLock } from './locking.js';
import { getStatePath, loadState } from './store.js';

/**
 * Update agent status
 */
export async function updateAgentStatus(projectRoot, agentId, status, result = null) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    const agentIndex = state.activeAgents.findIndex(a => a.agentId === agentId);

    if (agentIndex >= 0) {
      const agent = state.activeAgents[agentIndex];
      agent.status = status;
      agent.completedAt = new Date().toISOString();

      if (result) {
        agent.result = result;
      }

      // Handle different statuses
      if (status === 'completed') {
        state.completedTasks.push(agent.taskId);
        state.metrics.tasksCompleted++;

        const pendingIndex = state.pendingTasks.indexOf(agent.taskId);
        if (pendingIndex >= 0) {
          state.pendingTasks.splice(pendingIndex, 1);
        }
      } else if (status === 'failed') {
        state.failedTasks.push({
          taskId: agent.taskId,
          error: result?.error || 'Unknown error',
          failedAt: new Date().toISOString(),
        });
        state.metrics.tasksFailed++;
      } else if (status === 'blocked') {
        state.blockedTasks.push({
          taskId: agent.taskId,
          blocker: result?.blocker || 'Unknown blocker',
          blockedAt: new Date().toISOString(),
        });
        state.metrics.tasksBlocked++;
      }

      // Remove from active
      state.activeAgents.splice(agentIndex, 1);
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Add agent to active agents
 */
export async function addActiveAgent(projectRoot, agentConfig) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.activeAgents.push({
      agentId: agentConfig.agentId,
      taskId: agentConfig.taskId,
      level: agentConfig.level,
      domain: agentConfig.domain,
      spawnedAt: new Date().toISOString(),
      status: 'running',
      parentAgentId: agentConfig.parentAgentId,
    });

    state.metrics.totalAgentsSpawned++;
    if (agentConfig.level === 'L2') {
      state.metrics.l2AgentsSpawned++;
    } else if (agentConfig.level === 'L3') {
      state.metrics.l3AgentsSpawned++;
    }

    // Remove from pending if present
    const pendingIndex = state.pendingTasks.indexOf(agentConfig.taskId);
    if (pendingIndex >= 0) {
      state.pendingTasks.splice(pendingIndex, 1);
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Get tasks for an agent
 */
export function getAgentTasks(projectRoot, agentId) {
  const state = loadState(projectRoot);
  if (!state) return [];

  return state.activeAgents
    .filter(a => a.agentId === agentId)
    .map(a => a.taskId);
}
