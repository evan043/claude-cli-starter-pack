/**
 * Orchestrator Monitoring and Observability
 * Handles progress observation, drift detection, and status reporting
 */

import { observeProgress, formatDriftReport } from '../observer.js';
import { log } from './lifecycle.js';
import fs from 'fs';
import path from 'path';

/**
 * Observe progress and detect drift
 */
export function observe(orchestrator, update) {
  if (!orchestrator.config.observer.enabled || !orchestrator.vision) {
    return { success: false, error: 'Observer not enabled or vision not initialized' };
  }

  const result = observeProgress(update, orchestrator.vision, orchestrator.projectRoot);

  if (result.success && result.observation.drift_severity !== 'none') {
    log(orchestrator, 'warn', 'Drift detected', {
      severity: result.observation.drift_severity,
      alignment: result.observation.alignment
    });

    // Format and log drift report
    const report = formatDriftReport(result.observation);
    console.log('\n' + report);

    // Check if replan needed
    if (result.observation.requires_replan) {
      log(orchestrator, 'warn', 'Vision replan required');
    }
  }

  return result;
}

/**
 * Get current status
 */
export function getStatus(orchestrator) {
  return {
    stage: orchestrator.stage,
    vision: orchestrator.vision ? {
      slug: orchestrator.vision.slug,
      title: orchestrator.vision.title,
      status: orchestrator.vision.status,
      completion: orchestrator.vision.metadata?.completion_percentage || 0
    } : null,
    agents: Array.from(orchestrator.agents.keys()),
    stageHistory: orchestrator.stageHistory,
    config: orchestrator.config
  };
}

/**
 * Check if session restart is needed for hooks
 */
export function checkSessionRestart(orchestrator) {
  const markerPath = path.join(orchestrator.projectRoot, '.claude', 'vision-initialized');
  const hooksPath = path.join(orchestrator.projectRoot, '.claude', 'hooks.json');

  // Check if this is a fresh session after vision init
  if (fs.existsSync(markerPath)) {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    const initTime = new Date(marker.initialized_at);
    const now = new Date();
    const minutesSinceInit = (now - initTime) / (1000 * 60);

    // If initialized less than 5 minutes ago and hooks exist, warn about restart
    if (minutesSinceInit < 5 && fs.existsSync(hooksPath)) {
      return {
        needsRestart: true,
        reason: 'Vision was recently initialized. Please restart Claude Code to activate hooks.',
        markerPath
      };
    }
  }

  return { needsRestart: false };
}
