/**
 * Epic State Transitions
 *
 * State mutation operations for roadmap lifecycle and orchestrator management.
 */

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { acquireLock, releaseLock } from './locking.js';
import { getEpicPath, getOrchestratorStatePath, loadEpic } from './store.js';
import { calculateEpicCompletion } from '../schema.js';

/**
 * Update roadmap status within epic
 */
export async function updateRoadmapStatus(projectRoot, epicSlug, roadmapId, status, result = null) {
  const epicPath = getEpicPath(projectRoot, epicSlug);

  await acquireLock(epicPath);
  try {
    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

    const roadmap = epic.roadmaps.find(r => r.roadmap_id === roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found in epic`);
    }

    roadmap.status = status;
    roadmap.updated = new Date().toISOString();

    if (status === 'completed') {
      roadmap.completed_at = new Date().toISOString();
      roadmap.completion_percentage = 100;
    } else if (status === 'failed') {
      roadmap.failed_at = new Date().toISOString();
      if (result?.error) {
        roadmap.error = result.error;
      }
    }

    // Update epic completion percentage
    epic.completion_percentage = calculateEpicCompletion(epic);

    // Update epic status
    const allComplete = epic.roadmaps.every(r => r.status === 'completed');
    const anyFailed = epic.roadmaps.some(r => r.status === 'failed');

    if (allComplete) {
      epic.status = 'completed';
      epic.completed_at = new Date().toISOString();
    } else if (anyFailed) {
      epic.status = 'failed';
    } else {
      epic.status = 'in_progress';
    }

    epic.updated = new Date().toISOString();
    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

    return epic;
  } finally {
    releaseLock(epicPath);
  }
}

/**
 * Update roadmap progress (completion percentage)
 */
export async function updateRoadmapProgress(projectRoot, epicSlug, roadmapId, completionPercentage, phaseData = null) {
  const epicPath = getEpicPath(projectRoot, epicSlug);

  await acquireLock(epicPath);
  try {
    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

    const roadmap = epic.roadmaps.find(r => r.roadmap_id === roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found in epic`);
    }

    roadmap.completion_percentage = completionPercentage;
    roadmap.updated = new Date().toISOString();

    if (phaseData) {
      roadmap.phase_count = phaseData.total || roadmap.phase_count;
      roadmap.completed_phases = phaseData.completed || roadmap.completed_phases;
    }

    // Update epic completion percentage
    epic.completion_percentage = calculateEpicCompletion(epic);
    epic.updated = new Date().toISOString();

    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

    return epic;
  } finally {
    releaseLock(epicPath);
  }
}

/**
 * Advance to next roadmap
 */
export async function advanceToNextRoadmap(projectRoot, epicSlug, completedRoadmapId) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);
  const epicPath = getEpicPath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

    // Find next roadmap
    const currentIndex = state.currentRoadmapIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= epic.roadmaps.length) {
      // No more roadmaps - epic is complete
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      state.metrics.totalDuration = Date.now() - new Date(state.initialized).getTime();

      // Add checkpoint
      state.checkpoints.push({
        checkpointId: uuidv4(),
        createdAt: new Date().toISOString(),
        type: 'epic_complete',
        summary: `Epic completed: ${epic.roadmaps.length} roadmaps finished`,
      });
    } else {
      // Advance to next roadmap
      state.currentRoadmapIndex = nextIndex;

      // Add checkpoint
      state.checkpoints.push({
        checkpointId: uuidv4(),
        createdAt: new Date().toISOString(),
        roadmapIndex: currentIndex,
        type: 'roadmap_complete',
        summary: `Roadmap ${currentIndex + 1} completed, advancing to roadmap ${nextIndex + 1}`,
      });
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return {
      state,
      nextRoadmap: nextIndex < epic.roadmaps.length ? epic.roadmaps[nextIndex] : null,
      epicComplete: nextIndex >= epic.roadmaps.length,
    };
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Check if gating requirements are met
 */
export async function checkGatingRequirements(projectRoot, epicSlug, roadmapIndex) {
  const epic = loadEpic(projectRoot, epicSlug);
  if (!epic) {
    return { canProceed: false, blockers: ['Epic not found'] };
  }

  const roadmap = epic.roadmaps[roadmapIndex];
  if (!roadmap) {
    return { canProceed: false, blockers: ['Invalid roadmap index'] };
  }

  const blockers = [];

  // Check if previous roadmap is complete
  if (roadmapIndex > 0) {
    const previousRoadmap = epic.roadmaps[roadmapIndex - 1];
    if (previousRoadmap.status !== 'completed') {
      blockers.push(`Previous roadmap not complete: ${previousRoadmap.title}`);
    }
  }

  // Check dependencies
  if (roadmap.depends_on && roadmap.depends_on.length > 0) {
    const dependencyRoadmaps = epic.roadmaps.filter(r =>
      roadmap.depends_on.includes(r.roadmap_id)
    );

    const incompleteDeps = dependencyRoadmaps.filter(r =>
      r.status !== 'completed'
    );

    if (incompleteDeps.length > 0) {
      blockers.push(
        `Dependencies not complete: ${incompleteDeps.map(r => r.title).join(', ')}`
      );
    }
  }

  // Check if tests are required and passed
  if (epic.gating.require_tests && roadmapIndex > 0) {
    // This would need to be implemented with actual test execution
    // For now, we just check if the previous roadmap has test results
    const previousRoadmap = epic.roadmaps[roadmapIndex - 1];
    if (previousRoadmap.test_results?.status === 'failed') {
      blockers.push('Tests failed for previous roadmap');
    }
  }

  return {
    canProceed: blockers.length === 0,
    canOverride: epic.gating.allow_manual_override,
    blockers,
  };
}

/**
 * Add active roadmap agent
 */
export async function addActiveRoadmap(projectRoot, epicSlug, roadmapConfig) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.activeRoadmaps.push({
      roadmapId: roadmapConfig.roadmap_id,
      agentId: roadmapConfig.agentId,
      roadmapIndex: roadmapConfig.roadmap_index,
      spawnedAt: new Date().toISOString(),
      status: 'running',
    });

    state.metrics.totalAgentsSpawned++;
    state.lastUpdated = new Date().toISOString();

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Complete roadmap in orchestrator state
 */
export async function completeRoadmap(projectRoot, epicSlug, roadmapId, summary = {}) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // Remove from active
    const activeIndex = state.activeRoadmaps.findIndex(r => r.roadmapId === roadmapId);
    if (activeIndex >= 0) {
      const roadmap = state.activeRoadmaps[activeIndex];
      roadmap.status = 'completed';
      roadmap.completedAt = new Date().toISOString();

      state.activeRoadmaps.splice(activeIndex, 1);
      state.completedRoadmaps.push(roadmapId);
    }

    // Update metrics
    state.metrics.roadmapsCompleted++;
    if (summary.phaseCount) {
      state.metrics.totalPhases += summary.phaseCount;
    }
    if (summary.taskCount) {
      state.metrics.totalTasks += summary.taskCount;
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Fail roadmap in orchestrator state
 */
export async function failRoadmap(projectRoot, epicSlug, roadmapId, error) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // Remove from active
    const activeIndex = state.activeRoadmaps.findIndex(r => r.roadmapId === roadmapId);
    if (activeIndex >= 0) {
      state.activeRoadmaps.splice(activeIndex, 1);
    }

    state.failedRoadmaps.push({
      roadmapId,
      error: error || 'Unknown error',
      failedAt: new Date().toISOString(),
    });

    state.metrics.roadmapsFailed++;
    state.lastUpdated = new Date().toISOString();

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state;
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Update token budget
 */
export async function updateTokenBudget(projectRoot, epicSlug, tokensUsed) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.tokenBudget.used += tokensUsed;

    const usage = state.tokenBudget.used / state.tokenBudget.total;
    const needsCompaction = usage >= state.tokenBudget.compactionThreshold;

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return {
      used: state.tokenBudget.used,
      total: state.tokenBudget.total,
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
export async function createCheckpoint(projectRoot, epicSlug, summary, metadata = {}) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    const checkpoint = {
      checkpointId: uuidv4(),
      createdAt: new Date().toISOString(),
      roadmapIndex: state.currentRoadmapIndex,
      summary,
      ...metadata,
    };

    state.checkpoints.push(checkpoint);
    state.lastUpdated = new Date().toISOString();

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return checkpoint;
  } finally {
    releaseLock(statePath);
  }
}
