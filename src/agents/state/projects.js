/**
 * Project-Scoped State
 *
 * Multi-project roadmap support with per-project state isolation.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { acquireLock, releaseLock } from './locking.js';

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
