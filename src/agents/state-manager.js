/**
 * State Manager
 *
 * Manages orchestrator state with file locking for
 * concurrent access from multiple agents.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simple file locking implementation
const locks = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds
const LOCK_RETRY_INTERVAL = 100; // 100ms

/**
 * Acquire lock on a file
 */
async function acquireLock(filePath, timeout = LOCK_TIMEOUT) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!locks.has(filePath)) {
      locks.set(filePath, {
        acquired: Date.now(),
        holder: `agent-${process.pid}`,
      });
      return true;
    }

    // Check if lock is stale (holder crashed)
    const lock = locks.get(filePath);
    if (Date.now() - lock.acquired > LOCK_TIMEOUT) {
      locks.delete(filePath);
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL));
  }

  throw new Error(`Failed to acquire lock on ${filePath} after ${timeout}ms`);
}

/**
 * Release lock on a file
 */
function releaseLock(filePath) {
  locks.delete(filePath);
}

/**
 * Get state file path
 */
function getStatePath(projectRoot) {
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

/**
 * Get pending tasks for a phase
 */
export function getPendingTasksForPhase(projectRoot, phaseId) {
  const state = loadState(projectRoot);
  if (!state) return [];

  return state.pendingTasks.filter(taskId => taskId.startsWith(phaseId));
}

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

/**
 * Add message to queue
 */
export async function addMessage(projectRoot, message) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.messages.push({
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: message.type,
      sender: message.sender,
      recipient: message.recipient || 'orchestrator',
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
      processed: false,
      payload: message.payload,
    });

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state.messages[state.messages.length - 1];
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Get messages for an agent
 */
export function getMessages(projectRoot, options = {}) {
  const state = loadState(projectRoot);
  if (!state) return [];

  let messages = state.messages;

  if (options.recipient) {
    messages = messages.filter(m =>
      m.recipient === options.recipient || m.recipient === 'all'
    );
  }

  if (options.type) {
    messages = messages.filter(m => m.type === options.type);
  }

  if (options.correlationId) {
    messages = messages.filter(m => m.correlationId === options.correlationId);
  }

  if (options.unprocessedOnly) {
    messages = messages.filter(m => !m.processed);
  }

  if (options.since) {
    const sinceDate = new Date(options.since);
    messages = messages.filter(m => new Date(m.timestamp) > sinceDate);
  }

  return messages;
}

/**
 * Mark message as processed
 */
export async function markMessageProcessed(projectRoot, messageId) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    const message = state.messages.find(m => m.id === messageId);
    if (message) {
      message.processed = true;
      message.processedAt = new Date().toISOString();
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return message;
  } finally {
    releaseLock(statePath);
  }
}

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

// ============================================================
// PER-PROJECT STATE MANAGEMENT (Multi-Project Roadmaps)
// ============================================================

/**
 * Get project state directory path
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 */
function getProjectStatePath(projectRoot, projectId) {
  return path.join(projectRoot, '.claude', 'orchestrator', 'projects', projectId, 'state.json');
}

/**
 * Initialize orchestrator state for a specific project
 * @param {string} projectRoot - Project root directory
 * @param {Object} projectConfig - Project configuration
 */
export async function initProjectOrchestratorState(projectRoot, projectConfig) {
  const projectDir = path.join(projectRoot, '.claude', 'orchestrator', 'projects', projectConfig.projectId);
  const statePath = path.join(projectDir, 'state.json');

  // Create directory
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Extract all task IDs from phases
  const allTasks = [];
  if (projectConfig.phases) {
    projectConfig.phases.forEach(phase => {
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
  const currentPhase = projectConfig.phases?.find(p => p.status !== 'completed')?.id || 1;

  const state = {
    projectId: projectConfig.projectId,
    roadmapId: projectConfig.roadmapId,
    projectTitle: projectConfig.projectTitle,
    explorationPath: projectConfig.explorationPath,
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
      limit: projectConfig.tokenLimit || 100000,
      compactionThreshold: 0.8,
    },
    githubConfig: projectConfig.githubConfig || { enabled: false },
    l2Findings: {
      code_snippets: [],
      reference_files: { modify: [], reference: [], tests: [] },
      agent_delegation: { primary_agent: null, task_assignments: [], execution_sequence: [] },
    },
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
 * Load project-specific orchestrator state
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 */
export function loadProjectState(projectRoot, projectId) {
  const statePath = getProjectStatePath(projectRoot, projectId);

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
 * Save project-specific orchestrator state
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 * @param {Object} state - State to save
 */
export async function saveProjectState(projectRoot, projectId, state) {
  const statePath = getProjectStatePath(projectRoot, projectId);

  await acquireLock(statePath);
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Update L2 findings in project state
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 * @param {string} agentType - L2 agent type (code_snippets, reference_files, etc.)
 * @param {Object} findings - Findings from the L2 agent
 */
export async function updateL2Findings(projectRoot, projectId, agentType, findings) {
  const statePath = getProjectStatePath(projectRoot, projectId);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // Update the specific L2 findings type
    switch (agentType) {
      case 'code_snippets':
        state.l2Findings.code_snippets = [
          ...state.l2Findings.code_snippets,
          ...(findings.snippets || []),
        ];
        break;

      case 'reference_files':
        state.l2Findings.reference_files = {
          modify: [
            ...state.l2Findings.reference_files.modify,
            ...(findings.modify || []),
          ],
          reference: [
            ...state.l2Findings.reference_files.reference,
            ...(findings.reference || []),
          ],
          tests: [
            ...state.l2Findings.reference_files.tests,
            ...(findings.tests || []),
          ],
        };
        break;

      case 'agent_delegation':
        state.l2Findings.agent_delegation = {
          primary_agent: findings.primary_agent || state.l2Findings.agent_delegation.primary_agent,
          task_assignments: [
            ...state.l2Findings.agent_delegation.task_assignments,
            ...(findings.task_assignments || []),
          ],
          execution_sequence: findings.execution_sequence || state.l2Findings.agent_delegation.execution_sequence,
        };
        break;

      case 'json_structure':
        // Full structure update
        if (findings.phases) {
          state.phases = findings.phases;
        }
        break;
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Get all project states for a roadmap
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of project states
 */
export function getAllProjectStates(projectRoot) {
  const projectsDir = path.join(projectRoot, '.claude', 'orchestrator', 'projects');

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const states = [];
  const dirs = fs.readdirSync(projectsDir);

  for (const dir of dirs) {
    const statePath = path.join(projectsDir, dir, 'state.json');
    if (fs.existsSync(statePath)) {
      try {
        states.push(JSON.parse(fs.readFileSync(statePath, 'utf8')));
      } catch {
        // Ignore invalid state files
      }
    }
  }

  return states;
}

/**
 * Mark project as discovery complete
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 */
export async function markProjectDiscoveryComplete(projectRoot, projectId) {
  const statePath = getProjectStatePath(projectRoot, projectId);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.status = 'ready';
    state.discoveryCompletedAt = new Date().toISOString();
    state.lastUpdated = new Date().toISOString();

    // Add checkpoint
    state.checkpoints.push({
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      type: 'discovery_complete',
      summary: 'L2 exploration completed',
    });

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Mark project as execution complete
 * @param {string} projectRoot - Project root directory
 * @param {string} projectId - Project ID
 * @param {Object} summary - Completion summary
 */
export async function completeProjectOrchestration(projectRoot, projectId, summary = {}) {
  const statePath = getProjectStatePath(projectRoot, projectId);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    state.metrics.totalDuration = Date.now() - new Date(state.initialized).getTime();
    state.lastUpdated = new Date().toISOString();

    // Final checkpoint
    state.checkpoints.push({
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      type: 'project_complete',
      summary: summary.message || 'Project completed successfully',
      testResults: summary.testResults || null,
    });

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

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
