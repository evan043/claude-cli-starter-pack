/**
 * Progress Formatting and Display Functions
 */

import { HierarchyStatus } from './constants.js';

/**
 * Format progress summary for display
 *
 * @param {Object} progressSummary - Progress summary object
 * @returns {string} Formatted output
 */
export function formatProgressSummary(progressSummary) {
  const level = progressSummary.level || 'unknown';

  let output = `\n${level.toUpperCase()} Progress Summary\n`;
  output += `${'='.repeat(60)  }\n\n`;
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
