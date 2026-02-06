/**
 * Roadmap Executor - State Management
 *
 * Handles execution state persistence and retrieval.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadRoadmap } from '../roadmap-manager.js';

/**
 * Execution state file path
 */
const EXECUTION_STATE_FILE = 'EXECUTION_STATE.json';

/**
 * Get execution state path for a roadmap
 */
function getExecutionStatePath(roadmapSlug, cwd = process.cwd()) {
  return join(cwd, '.claude', 'phase-plans', roadmapSlug, EXECUTION_STATE_FILE);
}

/**
 * Initialize or load execution state for a roadmap
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Execution state
 */
export function loadExecutionState(roadmapSlug, cwd = process.cwd()) {
  const statePath = getExecutionStatePath(roadmapSlug, cwd);

  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, 'utf8'));
    } catch (e) {
      // Fall through to create new state
    }
  }

  // Create new execution state
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return null;
  }

  const state = {
    roadmap_id: roadmap.roadmap_id,
    roadmap_slug: roadmapSlug,
    mode: 'paused',
    current_phase: null,
    queue: roadmap.phases.map(p => p.phase_id),
    completed_this_session: [],
    completed_all_time: [],
    metrics: {
      phases_completed_total: 0,
      phases_remaining: roadmap.phases.length,
      consecutive_failures: 0,
      total_tasks_completed: 0,
    },
    safety: {
      max_parallel_agents: 2,
      max_context_percent: 80,
      compact_at_context_percent: 70,
      max_consecutive_failures: 3,
    },
    active_agents: [],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  saveExecutionState(state, cwd);

  return state;
}

/**
 * Save execution state
 */
export function saveExecutionState(state, cwd = process.cwd()) {
  const statePath = getExecutionStatePath(state.roadmap_slug, cwd);
  const dir = join(cwd, '.claude', 'phase-plans', state.roadmap_slug);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.last_updated = new Date().toISOString();
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}
