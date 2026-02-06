/**
 * Progress Aggregation Functions
 *
 * Rolls up progress from bottom to top:
 * - Task completion → Phase progress
 * - Phase completion → Roadmap progress
 * - Roadmap completion → Epic progress
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { HierarchyStatus } from './constants.js';

/**
 * Calculate epic completion from roadmap children
 *
 * Reads EPIC.json and aggregates progress from all referenced roadmaps.
 *
 * @param {string} epicPath - Path to epic directory
 * @returns {Object} Epic progress summary
 */
export function aggregateEpicProgress(epicPath) {
  const epicFile = join(epicPath, 'EPIC.json');

  if (!existsSync(epicFile)) {
    return {
      completion: 0,
      status: HierarchyStatus.PENDING,
      roadmaps: [],
      error: 'EPIC.json not found'
    };
  }

  let epic;
  try {
    epic = JSON.parse(readFileSync(epicFile, 'utf8'));
  } catch (error) {
    return {
      completion: 0,
      status: HierarchyStatus.FAILED,
      roadmaps: [],
      error: `Failed to parse EPIC.json: ${error.message}`
    };
  }

  const roadmapProgress = [];
  let totalWeight = 0;
  let weightedCompletion = 0;

  for (const ref of epic.roadmap_refs || []) {
    const roadmapCompletion = aggregateRoadmapProgress(ref.roadmap_path);

    roadmapProgress.push({
      id: ref.roadmap_id,
      title: ref.title,
      path: ref.roadmap_path,
      completion: roadmapCompletion.completion,
      status: roadmapCompletion.status,
      phases_completed: roadmapCompletion.phases_completed || 0,
      phases_total: roadmapCompletion.phases_total || 0
    });

    // Weight by estimated complexity (or equal weight if not specified)
    const weight = ref.weight || 1;
    totalWeight += weight;
    weightedCompletion += roadmapCompletion.completion * weight;
  }

  const overallCompletion = totalWeight > 0 ? Math.round(weightedCompletion / totalWeight) : 0;
  const overallStatus = determineStatus(roadmapProgress);

  return {
    completion: overallCompletion,
    status: overallStatus,
    roadmaps: roadmapProgress,
    roadmaps_total: roadmapProgress.length,
    roadmaps_completed: roadmapProgress.filter(r => r.completion === 100).length,
    roadmaps_blocked: roadmapProgress.filter(r => r.status === HierarchyStatus.BLOCKED).length
  };
}

/**
 * Calculate roadmap completion from phase children
 *
 * Reads ROADMAP.json and aggregates progress from all referenced phase-dev-plans.
 *
 * @param {string} roadmapPath - Path to roadmap directory or ROADMAP.json file
 * @returns {Object} Roadmap progress summary
 */
export function aggregateRoadmapProgress(roadmapPath) {
  // Handle both directory and file paths
  const roadmapFile = roadmapPath.endsWith('.json')
    ? roadmapPath
    : join(roadmapPath, 'ROADMAP.json');

  if (!existsSync(roadmapFile)) {
    return {
      completion: 0,
      status: HierarchyStatus.PENDING,
      phases: [],
      error: 'ROADMAP.json not found'
    };
  }

  let roadmap;
  try {
    roadmap = JSON.parse(readFileSync(roadmapFile, 'utf8'));
  } catch (error) {
    return {
      completion: 0,
      status: HierarchyStatus.FAILED,
      phases: [],
      error: `Failed to parse ROADMAP.json: ${error.message}`
    };
  }

  const phaseProgress = [];
  let totalPhases = 0;
  let completedPhases = 0;
  let totalCompletion = 0;

  // Handle both old format (direct phase refs) and new format (phase_dev_refs)
  const phaseRefs = roadmap.phase_dev_refs || roadmap.phases || [];

  for (const ref of phaseRefs) {
    // Handle different ref formats
    let progressPath;
    if (typeof ref === 'string') {
      progressPath = ref;
    } else if (ref.progress_path) {
      progressPath = ref.progress_path;
    } else if (ref.path) {
      progressPath = ref.path;
    } else {
      continue;
    }

    const phaseCompletion = aggregatePhaseProgress(progressPath);

    phaseProgress.push({
      path: progressPath,
      title: ref.title || 'Unknown',
      completion: phaseCompletion.completion,
      status: phaseCompletion.status,
      tasks_completed: phaseCompletion.tasks_completed || 0,
      tasks_total: phaseCompletion.tasks_total || 0
    });

    totalPhases++;
    totalCompletion += phaseCompletion.completion;

    if (phaseCompletion.completion === 100) {
      completedPhases++;
    }
  }

  // Roadmap completion is average of phase completions
  const overallCompletion = totalPhases > 0 ? Math.round(totalCompletion / totalPhases) : 0;
  const overallStatus = determineStatus(phaseProgress);

  return {
    completion: overallCompletion,
    status: overallStatus,
    phases: phaseProgress,
    phases_completed: completedPhases,
    phases_total: totalPhases
  };
}

/**
 * Calculate phase completion from task children
 *
 * Reads phase-dev PROGRESS.json and calculates completion from tasks.
 *
 * @param {string} progressPath - Path to PROGRESS.json file
 * @returns {Object} Phase progress summary
 */
export function aggregatePhaseProgress(progressPath) {
  if (!existsSync(progressPath)) {
    return {
      completion: 0,
      status: HierarchyStatus.PENDING,
      tasks: [],
      error: 'PROGRESS.json not found'
    };
  }

  let progress;
  try {
    progress = JSON.parse(readFileSync(progressPath, 'utf8'));
  } catch (error) {
    return {
      completion: 0,
      status: HierarchyStatus.FAILED,
      tasks: [],
      error: `Failed to parse PROGRESS.json: ${error.message}`
    };
  }

  let totalTasks = 0;
  let completedTasks = 0;
  const taskDetails = [];

  // Iterate through all phases in the progress file
  for (const phase of progress.phases || []) {
    for (const task of phase.tasks || []) {
      totalTasks++;

      taskDetails.push({
        id: task.id || task.title,
        title: task.title,
        status: task.status,
        completed: task.status === 'completed'
      });

      if (task.status === 'completed') {
        completedTasks++;
      }
    }
  }

  const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine status from progress.status or derive from tasks
  let status = progress.status || HierarchyStatus.PENDING;

  // Override with derived status if needed
  if (completion === 100) {
    status = HierarchyStatus.COMPLETED;
  } else if (completedTasks > 0) {
    status = HierarchyStatus.IN_PROGRESS;
  }

  return {
    completion,
    status,
    tasks: taskDetails,
    tasks_completed: completedTasks,
    tasks_total: totalTasks
  };
}

/**
 * Get progress at any level of the hierarchy
 *
 * Auto-detects level based on file structure.
 *
 * @param {string} path - Path to hierarchy directory or file
 * @param {string} [level] - Optional level hint (epic|roadmap|phase)
 * @returns {Object} Progress summary
 */
export function getProgressAtLevel(path, level = null) {
  // Auto-detect level if not provided
  if (!level) {
    if (existsSync(join(path, 'EPIC.json'))) {
      level = 'epic';
    } else if (existsSync(join(path, 'ROADMAP.json')) || path.endsWith('ROADMAP.json')) {
      level = 'roadmap';
    } else if (existsSync(path) && path.endsWith('PROGRESS.json')) {
      level = 'phase';
    } else {
      return {
        error: 'Could not detect hierarchy level',
        path
      };
    }
  }

  switch (level.toLowerCase()) {
    case 'epic':
    case 'l0':
      return {
        level: 'epic',
        ...aggregateEpicProgress(path)
      };

    case 'roadmap':
    case 'l1':
      return {
        level: 'roadmap',
        ...aggregateRoadmapProgress(path)
      };

    case 'phase':
    case 'l2':
      return {
        level: 'phase',
        ...aggregatePhaseProgress(path)
      };

    default:
      return {
        error: `Unknown level: ${level}`,
        path
      };
  }
}

/**
 * Determine overall status from child statuses
 *
 * Rules:
 * - If any child is blocked → blocked
 * - If all children completed → completed
 * - If any child in progress → in_progress
 * - Otherwise → pending
 *
 * @param {Array<Object>} children - Array of child progress objects
 * @returns {string} Overall status
 */
export function determineStatus(children) {
  if (!children || children.length === 0) {
    return HierarchyStatus.PENDING;
  }

  const hasBlocked = children.some(c => c.status === HierarchyStatus.BLOCKED);
  const hasFailed = children.some(c => c.status === HierarchyStatus.FAILED);
  const hasInProgress = children.some(c => c.status === HierarchyStatus.IN_PROGRESS);
  const allCompleted = children.every(c => c.completion === 100);

  if (hasBlocked) {
    return HierarchyStatus.BLOCKED;
  }

  if (hasFailed) {
    return HierarchyStatus.FAILED;
  }

  if (allCompleted) {
    return HierarchyStatus.COMPLETED;
  }

  if (hasInProgress) {
    return HierarchyStatus.IN_PROGRESS;
  }

  return HierarchyStatus.PENDING;
}
