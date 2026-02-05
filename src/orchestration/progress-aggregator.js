/**
 * Progress Aggregation for Epic/Roadmap/Phase/Task Hierarchy
 *
 * Rolls up progress from bottom to top:
 * - Task completion → Phase progress
 * - Phase completion → Roadmap progress
 * - Roadmap completion → Epic progress
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getGitHubConfig } from '../github/issue-hierarchy-manager.js';
import { closeIssue } from '../github/client.js';

/**
 * Status values used across hierarchy
 */
export const HierarchyStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed'
};

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

/**
 * Format progress summary for display
 *
 * @param {Object} progressSummary - Progress summary object
 * @returns {string} Formatted output
 */
export function formatProgressSummary(progressSummary) {
  const level = progressSummary.level || 'unknown';

  let output = `\n${level.toUpperCase()} Progress Summary\n`;
  output += '='.repeat(60) + '\n\n';
  output += `Completion: ${progressSummary.completion}%\n`;
  output += `Status: ${progressSummary.status}\n\n`;

  if (progressSummary.error) {
    output += `Error: ${progressSummary.error}\n`;
    return output;
  }

  // Level-specific details
  if (progressSummary.roadmaps) {
    output += `Roadmaps: ${progressSummary.roadmaps_completed}/${progressSummary.roadmaps_total} completed\n`;
    if (progressSummary.roadmaps_blocked > 0) {
      output += `Blocked: ${progressSummary.roadmaps_blocked} roadmap(s)\n`;
    }
    output += '\n';

    for (const roadmap of progressSummary.roadmaps) {
      const statusIcon = getStatusIcon(roadmap.status);
      output += `${statusIcon} ${roadmap.title} (${roadmap.completion}%)\n`;
    }
  }

  if (progressSummary.phases) {
    output += `Phases: ${progressSummary.phases_completed}/${progressSummary.phases_total} completed\n\n`;

    for (const phase of progressSummary.phases) {
      const statusIcon = getStatusIcon(phase.status);
      output += `${statusIcon} ${phase.title || 'Phase'} (${phase.completion}%)\n`;
    }
  }

  if (progressSummary.tasks) {
    output += `Tasks: ${progressSummary.tasks_completed}/${progressSummary.tasks_total} completed\n\n`;

    const groupedTasks = {
      completed: [],
      in_progress: [],
      pending: []
    };

    for (const task of progressSummary.tasks) {
      if (task.status === 'completed') {
        groupedTasks.completed.push(task);
      } else if (task.status === 'in_progress') {
        groupedTasks.in_progress.push(task);
      } else {
        groupedTasks.pending.push(task);
      }
    }

    if (groupedTasks.in_progress.length > 0) {
      output += 'In Progress:\n';
      for (const task of groupedTasks.in_progress) {
        output += `  ⧗ ${task.title}\n`;
      }
      output += '\n';
    }

    if (groupedTasks.pending.length > 0) {
      output += 'Pending:\n';
      for (const task of groupedTasks.pending) {
        output += `  ○ ${task.title}\n`;
      }
    }
  }

  return output;
}

/**
 * Get status icon for display
 * @private
 */
function getStatusIcon(status) {
  switch (status) {
    case HierarchyStatus.COMPLETED:
      return '✓';
    case HierarchyStatus.IN_PROGRESS:
      return '⧗';
    case HierarchyStatus.BLOCKED:
      return '⚠';
    case HierarchyStatus.FAILED:
      return '✗';
    case HierarchyStatus.PENDING:
    default:
      return '○';
  }
}

/**
 * Calculate velocity metrics from progress history
 *
 * @param {Array<Object>} progressHistory - Array of progress snapshots over time
 * @returns {Object} Velocity metrics
 */
export function calculateVelocity(progressHistory) {
  if (!progressHistory || progressHistory.length < 2) {
    return {
      completion_rate: 0,
      estimated_completion: null,
      trend: 'unknown'
    };
  }

  // Calculate completion rate (% per hour)
  const first = progressHistory[0];
  const last = progressHistory[progressHistory.length - 1];

  const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  const completionDiff = last.completion - first.completion;
  const completionRate = hoursDiff > 0 ? completionDiff / hoursDiff : 0;

  // Estimate time to completion
  let estimatedCompletion = null;
  if (completionRate > 0 && last.completion < 100) {
    const remainingCompletion = 100 - last.completion;
    const remainingHours = remainingCompletion / completionRate;
    estimatedCompletion = new Date(Date.now() + remainingHours * 60 * 60 * 1000).toISOString();
  }

  // Determine trend
  let trend = 'stable';
  if (progressHistory.length >= 3) {
    const recent = progressHistory.slice(-3);
    const rates = [];

    for (let i = 1; i < recent.length; i++) {
      const td = new Date(recent[i].timestamp) - new Date(recent[i - 1].timestamp);
      const hd = td / (1000 * 60 * 60);
      const cd = recent[i].completion - recent[i - 1].completion;
      rates.push(hd > 0 ? cd / hd : 0);
    }

    const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    if (avgRate > completionRate * 1.2) {
      trend = 'accelerating';
    } else if (avgRate < completionRate * 0.8) {
      trend = 'decelerating';
    }
  }

  return {
    completion_rate: Math.round(completionRate * 100) / 100,
    estimated_completion: estimatedCompletion,
    trend
  };
}

/**
 * Close GitHub issue when phase-dev reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} progressPath - Path to PROGRESS.json
 */
export async function closePhaseDevIssueIfComplete(projectRoot, progressPath) {
  try {
    const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
    const phaseCompletion = aggregatePhaseProgress(progressPath);

    if (phaseCompletion.completion === 100 && progress.github_issue) {
      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;
      const issueNumber = progress.github_issue;

      const completionSummary = buildPhaseDevCompletionSummary(progress, phaseCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed phase-dev GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing phase-dev issue: ${error.message}`);
  }
}

/**
 * Close GitHub issue when roadmap reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} roadmapPath - Path to ROADMAP.json
 */
export async function closeRoadmapIssueIfComplete(projectRoot, roadmapPath) {
  try {
    const roadmapCompletion = aggregateRoadmapProgress(roadmapPath);

    if (roadmapCompletion.completion === 100) {
      const roadmap = JSON.parse(readFileSync(
        roadmapPath.endsWith('.json') ? roadmapPath : join(roadmapPath, 'ROADMAP.json'),
        'utf8'
      ));

      const issueNumber = roadmap.metadata?.github_epic_number;
      if (!issueNumber) return;

      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;

      const completionSummary = buildRoadmapCompletionSummary(roadmap, roadmapCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed roadmap GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing roadmap issue: ${error.message}`);
  }
}

/**
 * Close GitHub issue when epic reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} epicPath - Path to epic directory
 */
export async function closeEpicIssueIfComplete(projectRoot, epicPath) {
  try {
    const epicCompletion = aggregateEpicProgress(epicPath);

    if (epicCompletion.completion === 100) {
      const epicFile = join(epicPath, 'EPIC.json');
      const epic = JSON.parse(readFileSync(epicFile, 'utf8'));

      const issueNumber = epic.github_epic_number;
      if (!issueNumber) return;

      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;

      const completionSummary = buildEpicCompletionSummary(epic, epicCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed epic GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing epic issue: ${error.message}`);
  }
}

/**
 * Build phase-dev completion summary for GitHub issue
 */
function buildPhaseDevCompletionSummary(progress, phaseCompletion) {
  const duration = progress.completed_at && progress.project?.created
    ? formatDuration(new Date(progress.completed_at) - new Date(progress.project.created))
    : 'N/A';

  let summary = `## ✅ Phase-Dev Plan Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Duration:** ${duration}\n`;
  summary += `**Tasks:** ${phaseCompletion.tasks_completed}/${phaseCompletion.tasks_total}\n`;

  if (progress.completion_metrics?.files_modified?.length > 0) {
    summary += `**Files Modified:** ${progress.completion_metrics.files_modified.length}\n`;
  }

  if (progress.completion_metrics?.tests_added) {
    summary += `**Tests Added:** ${progress.completion_metrics.tests_added}\n`;
  }

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Build roadmap completion summary for GitHub issue
 */
function buildRoadmapCompletionSummary(roadmap, roadmapCompletion) {
  let summary = `## ✅ Roadmap Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Phases Completed:** ${roadmapCompletion.phases_completed}/${roadmapCompletion.phases_total}\n`;

  if (roadmap.updated) {
    summary += `**Last Updated:** ${roadmap.updated}\n`;
  }

  summary += `\n### Completed Phases\n\n`;
  roadmapCompletion.phases.forEach((phase, index) => {
    summary += `${index + 1}. ✓ ${phase.title || 'Phase'} (${phase.completion}%)\n`;
  });

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Build epic completion summary for GitHub issue
 */
function buildEpicCompletionSummary(epic, epicCompletion) {
  let summary = `## ✅ Epic Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Roadmaps Completed:** ${epicCompletion.roadmaps_completed}/${epicCompletion.roadmaps_total}\n`;

  if (epic.updated) {
    summary += `**Last Updated:** ${epic.updated}\n`;
  }

  summary += `\n### Completed Roadmaps\n\n`;
  epicCompletion.roadmaps.forEach((roadmap, index) => {
    summary += `${index + 1}. ✓ ${roadmap.title} (${roadmap.completion}%)\n`;
  });

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Format duration (milliseconds) to human-readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
