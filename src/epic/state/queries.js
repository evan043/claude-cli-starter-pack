/**
 * Epic State Queries
 *
 * Read-only query operations for epic status and metrics.
 */

import { loadEpic, loadOrchestratorState } from './store.js';

/**
 * Get epic status
 */
export function getEpicStatus(projectRoot, epicSlug) {
  const epic = loadEpic(projectRoot, epicSlug);
  const state = loadOrchestratorState(projectRoot, epicSlug);

  if (!epic) {
    return { active: false, error: 'Epic not found' };
  }

  return {
    active: epic.status === 'in_progress',
    epic_id: epic.epic_id,
    status: epic.status,
    completion_percentage: epic.completion_percentage,
    current_roadmap_index: state?.currentRoadmapIndex || 0,
    roadmaps: {
      total: epic.roadmap_count,
      completed: epic.roadmaps.filter(r => r.status === 'completed').length,
      in_progress: epic.roadmaps.filter(r => r.status === 'in_progress').length,
      failed: epic.roadmaps.filter(r => r.status === 'failed').length,
    },
    token_usage: state ? state.tokenBudget.used / state.tokenBudget.total : 0,
    metrics: state?.metrics || {},
    last_updated: epic.updated,
  };
}
