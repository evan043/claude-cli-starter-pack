/**
 * Phase-Dev Metrics Calculator
 *
 * Calculates completion metrics and retrieves phase-dev status from PROGRESS.json
 */

import fs from 'fs';
import path from 'path';

/**
 * Calculate completion metrics from PROGRESS.json
 *
 * @param {Object} progress - PROGRESS.json content
 * @returns {Object} Completion metrics
 */
export function calculateCompletionMetrics(progress) {
  const metrics = {
    tasks_completed: 0,
    tasks_total: 0,
    files_modified: [],
    tests_added: 0,
    tokens_used: 0,
    duration_ms: 0,
  };

  // Count tasks
  progress.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      metrics.tasks_total++;
      if (task.status === 'completed') {
        metrics.tasks_completed++;
      }

      // Collect modified files
      if (task.files) {
        task.files.forEach(file => {
          const filePath = typeof file === 'string' ? file : file.path;
          if (filePath && !metrics.files_modified.includes(filePath)) {
            metrics.files_modified.push(filePath);
          }
        });
      }
    });
  });

  // Count tests from execution log
  if (progress.execution_log) {
    progress.execution_log.forEach(entry => {
      if (entry.type === 'test_created' || entry.action === 'test_added') {
        metrics.tests_added++;
      }
      if (entry.tokens_used) {
        metrics.tokens_used += entry.tokens_used;
      }
    });
  }

  // Calculate duration
  if (progress.project.created && progress.completed_at) {
    const start = new Date(progress.project.created).getTime();
    const end = new Date(progress.completed_at).getTime();
    metrics.duration_ms = end - start;
  }

  return metrics;
}

/**
 * Get phase-dev status
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} phaseDevSlug - Phase-dev slug
 * @returns {Object} Phase-dev status information
 */
export function getPhaseDevStatus(projectRoot, phaseDevSlug) {
  const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');

  if (!fs.existsSync(progressPath)) {
    return {
      exists: false,
      error: 'PROGRESS.json not found',
    };
  }

  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  const totalTasks = progress.phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = progress.phases.reduce(
    (sum, p) => sum + p.tasks.filter(t => t.status === 'completed').length,
    0
  );

  return {
    exists: true,
    status: progress.status || 'active',
    completion_percentage: Math.round((completedTasks / totalTasks) * 100),
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    parent_context: progress.parent_context || null,
    created: progress.project.created,
    last_updated: progress.project.lastUpdated,
  };
}
