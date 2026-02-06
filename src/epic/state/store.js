/**
 * Epic State Store
 *
 * Core storage operations for epic and orchestrator state files.
 */

import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from './locking.js';

/**
 * Get epic directory path
 */
function getEpicDir(projectRoot, epicSlug) {
  return path.join(projectRoot, '.claude', 'epics', epicSlug);
}

/**
 * Get epic file path
 */
function getEpicPath(projectRoot, epicSlug) {
  return path.join(getEpicDir(projectRoot, epicSlug), 'EPIC.json');
}

/**
 * Get epic state directory path
 */
function getEpicStateDir(projectRoot, epicSlug) {
  return path.join(getEpicDir(projectRoot, epicSlug), 'state');
}

/**
 * Get orchestrator state path
 */
function getOrchestratorStatePath(projectRoot, epicSlug) {
  return path.join(getEpicStateDir(projectRoot, epicSlug), 'orchestrator-state.json');
}

/**
 * Initialize epic directory structure
 */
export function initEpicDirectory(projectRoot, epicSlug) {
  const epicDir = getEpicDir(projectRoot, epicSlug);
  const stateDir = getEpicStateDir(projectRoot, epicSlug);
  const roadmapsDir = path.join(epicDir, 'roadmaps');
  const logsDir = path.join(stateDir, 'logs');

  // Create directories
  [epicDir, stateDir, roadmapsDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return {
    epicDir,
    stateDir,
    roadmapsDir,
    logsDir,
  };
}

/**
 * Load epic JSON
 */
export function loadEpic(projectRoot, epicSlug) {
  const epicPath = getEpicPath(projectRoot, epicSlug);

  if (!fs.existsSync(epicPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(epicPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save epic JSON with locking
 */
export async function saveEpic(projectRoot, epicSlug, epic) {
  const epicPath = getEpicPath(projectRoot, epicSlug);

  await acquireLock(epicPath);
  try {
    epic.updated = new Date().toISOString();

    // Ensure directory exists
    const epicDir = path.dirname(epicPath);
    if (!fs.existsSync(epicDir)) {
      fs.mkdirSync(epicDir, { recursive: true });
    }

    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');
  } finally {
    releaseLock(epicPath);
  }
}

/**
 * Initialize epic orchestrator state
 */
export async function initEpicOrchestratorState(projectRoot, epicConfig) {
  const stateDir = getEpicStateDir(projectRoot, epicConfig.slug);
  const statePath = getOrchestratorStatePath(projectRoot, epicConfig.slug);

  // Create directory
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const state = {
    epic_id: epicConfig.epic_id,
    epicSlug: epicConfig.slug,
    initialized: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'active', // active, paused, completed, failed
    currentRoadmapIndex: 0,
    activeRoadmaps: [],
    completedRoadmaps: [],
    failedRoadmaps: [],
    blockedRoadmaps: [],
    tokenBudget: {
      used: 0,
      total: epicConfig.token_budget?.total || 500000,
      perRoadmap: epicConfig.token_budget?.per_roadmap || 100000,
      compactionThreshold: epicConfig.token_budget?.compaction_threshold || 0.8,
    },
    githubConfig: {
      enabled: !!epicConfig.github_epic_number,
      epicNumber: epicConfig.github_epic_number || null,
      epicUrl: epicConfig.github_epic_url || null,
    },
    metrics: {
      roadmapsCompleted: 0,
      roadmapsFailed: 0,
      totalPhases: 0,
      totalTasks: 0,
      totalAgentsSpawned: 0,
      averageRoadmapDuration: 0,
      totalDuration: 0,
    },
    checkpoints: [],
    messages: [],
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return { state, statePath };
}

/**
 * Load epic orchestrator state
 */
export function loadOrchestratorState(projectRoot, epicSlug) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

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
 * Save epic orchestrator state with locking
 */
export async function saveOrchestratorState(projectRoot, epicSlug, state) {
  const statePath = getOrchestratorStatePath(projectRoot, epicSlug);

  await acquireLock(statePath);
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  } finally {
    releaseLock(statePath);
  }
}

export { getEpicPath, getOrchestratorStatePath };
