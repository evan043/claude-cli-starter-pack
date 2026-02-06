/**
 * Vision Mode Observer - Detection Module
 *
 * Drift detection, alignment calculation, and replan trigger logic.
 */

import { DriftSeverity } from '../schema.js';

// Drift detection thresholds
export const DRIFT_THRESHOLDS = {
  [DriftSeverity.NONE]: 0.95,      // 95%+ alignment = no drift
  [DriftSeverity.LOW]: 0.85,       // 85-95% alignment = low drift
  [DriftSeverity.MEDIUM]: 0.70,    // 70-85% alignment = medium drift
  [DriftSeverity.HIGH]: 0.50,      // 50-70% alignment = high drift
  [DriftSeverity.CRITICAL]: 0.0    // <50% alignment = critical drift
};

// Replan triggers
export const REPLAN_THRESHOLDS = {
  severity: DriftSeverity.HIGH,
  alignment: 0.60,
  consecutive_adjustments: 3,
  drift_areas_count: 5
};

/**
 * Calculate alignment score between actual and expected progress
 * @param {Object} actual - Actual progress metrics
 * @param {Object} expected - Expected progress metrics
 * @returns {number} Alignment score (0-1)
 */
export function calculateAlignment(actual, expected) {
  if (!actual || !expected) {
    return 0;
  }

  const metrics = [];

  // Completion percentage alignment
  if (typeof actual.completion_percentage === 'number' &&
      typeof expected.completion_percentage === 'number') {
    const completionDiff = Math.abs(actual.completion_percentage - expected.completion_percentage);
    const completionAlignment = Math.max(0, 1 - (completionDiff / 100));
    metrics.push({ weight: 0.4, score: completionAlignment });
  }

  // Roadmap count alignment
  if (typeof actual.roadmaps_completed === 'number' &&
      typeof expected.roadmaps_completed === 'number' &&
      expected.roadmaps_completed > 0) {
    const roadmapDiff = Math.abs(actual.roadmaps_completed - expected.roadmaps_completed);
    const roadmapAlignment = Math.max(0, 1 - (roadmapDiff / expected.roadmaps_completed));
    metrics.push({ weight: 0.3, score: roadmapAlignment });
  }

  // Status alignment
  if (actual.status && expected.status) {
    const statusAlignment = actual.status === expected.status ? 1.0 : 0.5;
    metrics.push({ weight: 0.2, score: statusAlignment });
  }

  // Architecture adherence (if available)
  if (actual.architecture_adherence !== undefined) {
    metrics.push({ weight: 0.1, score: actual.architecture_adherence });
  }

  // Calculate weighted average
  if (metrics.length === 0) {
    return 0.5; // Default to neutral if no metrics available
  }

  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = metrics.reduce((sum, m) => sum + (m.score * m.weight), 0);

  return Math.min(1.0, Math.max(0.0, weightedSum / totalWeight));
}

/**
 * Detect drift severity based on alignment score
 * @param {number} alignment - Alignment score (0-1)
 * @param {Object} thresholds - Drift thresholds
 * @returns {string} Drift severity level
 */
export function detectDrift(alignment, thresholds = DRIFT_THRESHOLDS) {
  if (alignment >= thresholds[DriftSeverity.NONE]) {
    return DriftSeverity.NONE;
  }
  if (alignment >= thresholds[DriftSeverity.LOW]) {
    return DriftSeverity.LOW;
  }
  if (alignment >= thresholds[DriftSeverity.MEDIUM]) {
    return DriftSeverity.MEDIUM;
  }
  if (alignment >= thresholds[DriftSeverity.HIGH]) {
    return DriftSeverity.HIGH;
  }
  return DriftSeverity.CRITICAL;
}

/**
 * Identify specific areas where drift occurred
 * @param {Object} actual - Actual progress metrics
 * @param {Object} expected - Expected progress metrics
 * @returns {Array} Array of drift areas with details
 */
export function identifyDriftAreas(actual, expected) {
  const driftAreas = [];

  // Check completion percentage drift
  if (typeof actual.completion_percentage === 'number' &&
      typeof expected.completion_percentage === 'number') {
    const diff = actual.completion_percentage - expected.completion_percentage;
    if (Math.abs(diff) > 10) { // 10% threshold
      driftAreas.push({
        area: 'completion_percentage',
        expected: expected.completion_percentage,
        actual: actual.completion_percentage,
        drift: diff,
        severity: Math.abs(diff) > 30 ? 'high' : 'medium',
        description: diff > 0
          ? `Ahead of schedule by ${diff.toFixed(1)}%`
          : `Behind schedule by ${Math.abs(diff).toFixed(1)}%`
      });
    }
  }

  // Check roadmap completion drift
  if (typeof actual.roadmaps_completed === 'number' &&
      typeof expected.roadmaps_completed === 'number') {
    const diff = actual.roadmaps_completed - expected.roadmaps_completed;
    if (diff !== 0) {
      driftAreas.push({
        area: 'roadmaps_completed',
        expected: expected.roadmaps_completed,
        actual: actual.roadmaps_completed,
        drift: diff,
        severity: Math.abs(diff) > 2 ? 'high' : 'medium',
        description: diff > 0
          ? `${diff} more roadmap(s) completed than expected`
          : `${Math.abs(diff)} fewer roadmap(s) completed than expected`
      });
    }
  }

  // Check status drift
  if (actual.status && expected.status && actual.status !== expected.status) {
    driftAreas.push({
      area: 'status',
      expected: expected.status,
      actual: actual.status,
      drift: null,
      severity: 'medium',
      description: `Status mismatch: expected '${expected.status}', got '${actual.status}'`
    });
  }

  // Check architecture adherence
  if (actual.architecture_adherence !== undefined &&
      actual.architecture_adherence < 0.8) {
    driftAreas.push({
      area: 'architecture',
      expected: 1.0,
      actual: actual.architecture_adherence,
      drift: actual.architecture_adherence - 1.0,
      severity: actual.architecture_adherence < 0.5 ? 'high' : 'medium',
      description: `Architecture adherence is ${(actual.architecture_adherence * 100).toFixed(1)}%`
    });
  }

  // Check technology stack drift
  if (actual.tech_stack_changes && actual.tech_stack_changes.length > 0) {
    driftAreas.push({
      area: 'tech_stack',
      expected: 'No changes',
      actual: actual.tech_stack_changes.join(', '),
      drift: null,
      severity: 'medium',
      description: `Technology stack changes detected: ${actual.tech_stack_changes.join(', ')}`
    });
  }

  // Check scope changes
  if (actual.scope_changes && actual.scope_changes.length > 0) {
    driftAreas.push({
      area: 'scope',
      expected: 'Original scope',
      actual: actual.scope_changes.join(', '),
      drift: null,
      severity: 'high',
      description: `Scope changes detected: ${actual.scope_changes.join(', ')}`
    });
  }

  return driftAreas;
}

/**
 * Determine if drift requires a full vision replan
 * @param {string} driftSeverity - Drift severity level
 * @param {Array} driftAreas - Drift areas detected
 * @param {Object} visionPlan - Vision plan
 * @returns {boolean} True if replan needed
 */
export function shouldTriggerReplan(driftSeverity, driftAreas, visionPlan) {
  // Critical drift always triggers replan
  if (driftSeverity === DriftSeverity.CRITICAL) {
    return true;
  }

  // High drift with multiple areas
  if (driftSeverity === DriftSeverity.HIGH &&
      driftAreas.length >= REPLAN_THRESHOLDS.drift_areas_count) {
    return true;
  }

  // Check for architectural or scope changes (always significant)
  const significantChanges = driftAreas.some(d =>
    d.area === 'architecture' || d.area === 'scope'
  );
  if (significantChanges && driftSeverity !== DriftSeverity.LOW) {
    return true;
  }

  // Check adjustment history
  const recentAdjustments = visionPlan.observer?.adjustments_made || 0;
  if (recentAdjustments >= REPLAN_THRESHOLDS.consecutive_adjustments) {
    return true;
  }

  // Check current alignment
  const currentAlignment = visionPlan.observer?.current_alignment || 1.0;
  if (currentAlignment < REPLAN_THRESHOLDS.alignment) {
    return true;
  }

  return false;
}
