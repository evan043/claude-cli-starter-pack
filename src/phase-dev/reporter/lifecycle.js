/**
 * Phase-Dev Lifecycle Management
 *
 * Handles marking phase-dev as complete in PROGRESS.json (local file updates only).
 */

import fs from 'fs';
import path from 'path';
import { calculateCompletionMetrics } from './metrics.js';

/**
 * Mark phase-dev as complete in PROGRESS.json
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} phaseDevSlug - Phase-dev slug
 * @param {Object|null} completionMetrics - Optional completion metrics (auto-calculated if null)
 * @returns {Object} Completion metrics
 * @throws {Error} If PROGRESS.json not found
 */
export function markPhaseDevComplete(projectRoot, phaseDevSlug, completionMetrics = null) {
  const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');

  if (!fs.existsSync(progressPath)) {
    throw new Error('PROGRESS.json not found');
  }

  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  // Calculate metrics if not provided
  const metrics = completionMetrics || calculateCompletionMetrics(progress);

  // Update progress
  progress.status = 'completed';
  progress.completed_at = new Date().toISOString();
  progress.completion_metrics = metrics;
  progress.project.lastUpdated = new Date().toISOString();

  // Mark all phases as completed
  progress.phases.forEach(phase => {
    if (phase.status !== 'completed') {
      phase.status = 'completed';
    }
  });

  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  return metrics;
}
