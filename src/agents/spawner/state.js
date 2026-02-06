/**
 * Agent State Management
 *
 * Provides state management functions for orchestrator state tracking.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Update orchestrator state with agent status
 */
export function updateAgentInState(statePath, agentId, status, result = null) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`Orchestrator state not found: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Find agent in activeAgents
  const agentIndex = state.activeAgents.findIndex(a => a.agentId === agentId);

  if (agentIndex >= 0) {
    const agent = state.activeAgents[agentIndex];
    agent.status = status;
    agent.completedAt = new Date().toISOString();

    if (result) {
      agent.result = result;
    }

    // Move to appropriate list based on status
    if (status === 'completed') {
      state.completedTasks.push(agent.taskId);
      state.metrics.tasksCompleted++;
    } else if (status === 'failed') {
      state.failedTasks.push({
        taskId: agent.taskId,
        error: result?.error || 'Unknown error',
        failedAt: new Date().toISOString(),
      });
      state.metrics.tasksFailed++;
    }

    // Remove from active
    state.activeAgents.splice(agentIndex, 1);
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Add agent to orchestrator state
 */
export function addAgentToState(statePath, agentConfig) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`Orchestrator state not found: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.activeAgents.push({
    agentId: agentConfig.agentId,
    taskId: agentConfig.taskId || agentConfig.subtaskId,
    level: agentConfig.level,
    domain: agentConfig.domain || agentConfig.taskType,
    spawnedAt: agentConfig.spawnedAt,
    status: agentConfig.status,
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
}

/**
 * Initialize orchestrator state for a plan
 */
export function initializeOrchestratorState(projectRoot, planId, planPath, progressData, githubConfig = null) {
  const stateDir = path.join(projectRoot, '.claude', 'orchestrator');
  const statePath = path.join(stateDir, 'state.json');

  // Create directory if needed
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Extract all task IDs
  const allTasks = [];
  if (progressData.phases) {
    progressData.phases.forEach(phase => {
      if (phase.tasks) {
        phase.tasks.forEach(task => {
          if (task.status !== 'completed') {
            allTasks.push(task.id);
          }
        });
      }
    });
  }

  // Find first non-completed phase
  const currentPhase = progressData.phases?.find(p => p.status !== 'completed')?.phase_id || 'P1';

  const state = {
    planId,
    planPath,
    initialized: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'active',
    currentPhase,
    activeAgents: [],
    completedTasks: [],
    pendingTasks: allTasks,
    failedTasks: [],
    blockedTasks: [],
    tokenBudget: {
      used: 0,
      limit: 100000,
      compactionThreshold: 0.8,
    },
    githubConfig: githubConfig || { enabled: false },
    messages: [],
    metrics: {
      tasksCompleted: 0,
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
export function loadOrchestratorState(projectRoot) {
  const statePath = path.join(projectRoot, '.claude', 'orchestrator', 'state.json');

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
 * Create checkpoint for session recovery
 */
export function createCheckpoint(statePath, summary) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  const checkpoint = {
    checkpointId: uuidv4(),
    createdAt: new Date().toISOString(),
    phase: state.currentPhase,
    lastCompletedTask: state.completedTasks[state.completedTasks.length - 1] || null,
    summary,
  };

  state.checkpoints.push(checkpoint);
  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return checkpoint;
}
