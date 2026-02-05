/**
 * Vision Mode Observer
 *
 * Monitors Epic/Roadmap/Phase progress and compares against Vision plan.
 * Detects drift, calculates alignment, and generates automatic adjustments.
 *
 * Phase 4 of Vision Mode implementation.
 */

import {
  DriftSeverity,
  recordDriftEvent,
  updateAlignment
} from './schema.js';
import {
  loadVision,
  updateVision
} from './state-manager.js';

// Drift detection thresholds
const DRIFT_THRESHOLDS = {
  [DriftSeverity.NONE]: 0.95,      // 95%+ alignment = no drift
  [DriftSeverity.LOW]: 0.85,       // 85-95% alignment = low drift
  [DriftSeverity.MEDIUM]: 0.70,    // 70-85% alignment = medium drift
  [DriftSeverity.HIGH]: 0.50,      // 50-70% alignment = high drift
  [DriftSeverity.CRITICAL]: 0.0    // <50% alignment = critical drift
};

// Replan triggers
const REPLAN_THRESHOLDS = {
  severity: DriftSeverity.HIGH,
  alignment: 0.60,
  consecutive_adjustments: 3,
  drift_areas_count: 5
};

/**
 * Observe progress and detect drift
 * @param {Object} epicUpdate - Epic/Roadmap/Phase update event
 * @param {Object} visionPlan - Vision plan to compare against
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Observation result
 */
export function observeProgress(epicUpdate, visionPlan, projectRoot) {
  if (!visionPlan || !epicUpdate) {
    return {
      success: false,
      error: 'Missing vision plan or epic update'
    };
  }

  // Extract actual progress from update
  const actual = extractActualProgress(epicUpdate);

  // Extract expected progress from vision plan
  const expected = extractExpectedProgress(visionPlan, epicUpdate);

  // Calculate alignment score
  const alignment = calculateAlignment(actual, expected);

  // Detect drift severity
  const driftSeverity = detectDrift(alignment, DRIFT_THRESHOLDS);

  // Build observation result
  const observation = {
    timestamp: new Date().toISOString(),
    update_type: epicUpdate.type || 'unknown',
    update_source: epicUpdate.source || 'unknown',
    alignment,
    drift_severity: driftSeverity,
    actual,
    expected
  };

  // If drift detected, identify specific areas
  if (driftSeverity !== DriftSeverity.NONE) {
    const driftAreas = identifyDriftAreas(actual, expected);
    observation.drift_areas = driftAreas;

    // Generate adjustment recommendations
    const adjustments = generateAdjustments(driftAreas, visionPlan, driftSeverity);
    observation.adjustments = adjustments;

    // Check if full replan needed
    observation.requires_replan = shouldTriggerReplan(
      driftSeverity,
      driftAreas,
      visionPlan
    );

    // Record drift event in vision
    const driftEvent = {
      severity: driftSeverity,
      area: driftAreas.map(d => d.area).join(', '),
      expected: JSON.stringify(expected, null, 2),
      actual: JSON.stringify(actual, null, 2),
      resolution: observation.requires_replan ? 'escalated' : 'adjusted'
    };

    // Update vision with drift event and alignment
    updateVision(projectRoot, visionPlan.slug, (vision) => {
      recordDriftEvent(vision, driftEvent);
      updateAlignment(vision, alignment);
      return vision;
    }).catch(err => {
      console.error('Failed to update vision with drift event:', err);
    });
  } else {
    // No drift - just update alignment
    updateVision(projectRoot, visionPlan.slug, (vision) => {
      updateAlignment(vision, alignment);
      return vision;
    }).catch(err => {
      console.error('Failed to update vision alignment:', err);
    });
  }

  return {
    success: true,
    observation
  };
}

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
  } else if (alignment >= thresholds[DriftSeverity.LOW]) {
    return DriftSeverity.LOW;
  } else if (alignment >= thresholds[DriftSeverity.MEDIUM]) {
    return DriftSeverity.MEDIUM;
  } else if (alignment >= thresholds[DriftSeverity.HIGH]) {
    return DriftSeverity.HIGH;
  } else {
    return DriftSeverity.CRITICAL;
  }
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
 * Generate adjustment recommendations based on drift
 * @param {Array} driftAreas - Identified drift areas
 * @param {Object} visionPlan - Vision plan
 * @param {string} driftSeverity - Overall drift severity
 * @returns {Array} Array of adjustment recommendations
 */
export function generateAdjustments(driftAreas, visionPlan, driftSeverity) {
  const adjustments = [];

  for (const drift of driftAreas) {
    const adjustment = {
      area: drift.area,
      severity: drift.severity,
      current_value: drift.actual,
      target_value: drift.expected,
      action: null,
      rationale: null
    };

    switch (drift.area) {
      case 'completion_percentage':
        if (drift.drift < 0) {
          // Behind schedule
          adjustment.action = 'accelerate_development';
          adjustment.rationale = 'Increase parallel work, reduce scope, or extend timeline';
          adjustment.specific_actions = [
            'Deploy additional specialist agents',
            'Identify non-critical features for deferral',
            'Review and optimize phase task lists'
          ];
        } else {
          // Ahead of schedule
          adjustment.action = 'maintain_pace';
          adjustment.rationale = 'Continue current velocity while ensuring quality';
          adjustment.specific_actions = [
            'Add additional testing phases',
            'Enhance documentation',
            'Consider adding stretch goals'
          ];
        }
        break;

      case 'roadmaps_completed':
        if (drift.drift < 0) {
          adjustment.action = 'review_roadmap_dependencies';
          adjustment.rationale = 'Check for blockers or dependency issues';
          adjustment.specific_actions = [
            'Identify and resolve blockers',
            'Re-evaluate roadmap dependencies',
            'Consider parallel execution where possible'
          ];
        }
        break;

      case 'status':
        adjustment.action = 'status_sync_required';
        adjustment.rationale = 'Synchronize status with expected progression';
        adjustment.specific_actions = [
          'Review phase completion criteria',
          'Update Epic/Roadmap status',
          'Verify all gating checks passed'
        ];
        break;

      case 'architecture':
        adjustment.action = 'architecture_review';
        adjustment.rationale = 'Implementation deviates from architectural plan';
        adjustment.specific_actions = [
          'Review architecture diagrams',
          'Identify divergence points',
          'Refactor to align with vision or update architecture'
        ];
        break;

      case 'tech_stack':
        adjustment.action = 'technology_audit';
        adjustment.rationale = 'Technology choices differ from architectural decisions';
        adjustment.specific_actions = [
          'Document technology change rationale',
          'Update vision architecture section',
          'Assess impact on integration points'
        ];
        break;

      case 'scope':
        adjustment.action = 'scope_reconciliation';
        adjustment.rationale = 'Scope changes detected - vision update may be needed';
        adjustment.specific_actions = [
          'Document new scope items',
          'Re-assess roadmap breakdown',
          'Consider creating vision checkpoint'
        ];
        break;

      default:
        adjustment.action = 'manual_review';
        adjustment.rationale = 'Drift detected in unhandled area';
        adjustment.specific_actions = ['Manual inspection recommended'];
    }

    adjustments.push(adjustment);
  }

  // Add severity-based adjustments
  if (driftSeverity === DriftSeverity.HIGH || driftSeverity === DriftSeverity.CRITICAL) {
    adjustments.push({
      area: 'overall',
      severity: driftSeverity,
      action: 'escalate_to_orchestrator',
      rationale: 'Significant drift detected - vision orchestrator review required',
      specific_actions: [
        'Create vision checkpoint',
        'Review overall vision feasibility',
        'Consider vision re-architecture',
        'Engage stakeholder review'
      ]
    });
  }

  return adjustments;
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

/**
 * Format drift event for logging/reporting
 * @param {Object} observation - Observation result from observeProgress
 * @returns {string} Formatted drift report
 */
export function formatDriftReport(observation) {
  if (!observation || !observation.drift_areas || observation.drift_areas.length === 0) {
    return 'No drift detected';
  }

  const lines = [];
  lines.push(`Drift Detected - Severity: ${observation.drift_severity.toUpperCase()}`);
  lines.push(`Alignment Score: ${(observation.alignment * 100).toFixed(1)}%`);
  lines.push(`Timestamp: ${observation.timestamp}`);
  lines.push('');

  lines.push('Drift Areas:');
  for (const drift of observation.drift_areas) {
    lines.push(`  - ${drift.area}: ${drift.description}`);
    lines.push(`    Expected: ${JSON.stringify(drift.expected)}`);
    lines.push(`    Actual: ${JSON.stringify(drift.actual)}`);
  }

  if (observation.adjustments && observation.adjustments.length > 0) {
    lines.push('');
    lines.push('Recommended Adjustments:');
    for (const adj of observation.adjustments) {
      lines.push(`  - ${adj.area}: ${adj.action}`);
      lines.push(`    Rationale: ${adj.rationale}`);
      if (adj.specific_actions) {
        lines.push('    Actions:');
        for (const action of adj.specific_actions) {
          lines.push(`      * ${action}`);
        }
      }
    }
  }

  if (observation.requires_replan) {
    lines.push('');
    lines.push('*** FULL VISION REPLAN REQUIRED ***');
  }

  return lines.join('\n');
}

/**
 * Extract actual progress from update event
 * @param {Object} epicUpdate - Epic/Roadmap/Phase update event
 * @returns {Object} Actual progress metrics
 */
function extractActualProgress(epicUpdate) {
  const actual = {
    completion_percentage: epicUpdate.completion_percentage || 0,
    status: epicUpdate.status || 'unknown',
    roadmaps_completed: 0,
    roadmaps_total: 0,
    architecture_adherence: epicUpdate.architecture_adherence || 1.0,
    tech_stack_changes: epicUpdate.tech_stack_changes || [],
    scope_changes: epicUpdate.scope_changes || []
  };

  // Extract roadmap metrics if available
  if (epicUpdate.roadmaps) {
    actual.roadmaps_total = epicUpdate.roadmaps.length;
    actual.roadmaps_completed = epicUpdate.roadmaps.filter(
      rm => rm.status === 'completed'
    ).length;
  }

  // Extract from execution plan if present
  if (epicUpdate.execution_plan?.roadmaps) {
    actual.roadmaps_total = epicUpdate.execution_plan.roadmaps.length;
    actual.roadmaps_completed = epicUpdate.execution_plan.roadmaps.filter(
      rm => rm.status === 'completed'
    ).length;
  }

  return actual;
}

/**
 * Extract expected progress from vision plan
 * @param {Object} visionPlan - Vision plan
 * @param {Object} epicUpdate - Epic update (for context)
 * @returns {Object} Expected progress metrics
 */
function extractExpectedProgress(visionPlan, epicUpdate) {
  const expected = {
    completion_percentage: 0,
    status: 'not_started',
    roadmaps_completed: 0,
    roadmaps_total: 0
  };

  if (!visionPlan.execution_plan) {
    return expected;
  }

  const plan = visionPlan.execution_plan;
  expected.roadmaps_total = plan.roadmaps?.length || 0;

  // Calculate expected progress based on time or linear progression
  if (plan.roadmaps && plan.roadmaps.length > 0) {
    // Use current roadmap index if available
    if (epicUpdate.current_roadmap_index !== undefined) {
      const currentIndex = epicUpdate.current_roadmap_index;
      expected.roadmaps_completed = Math.max(0, currentIndex);
      expected.completion_percentage = (currentIndex / plan.roadmaps.length) * 100;

      // Determine expected status
      if (currentIndex === 0) {
        expected.status = 'not_started';
      } else if (currentIndex < plan.roadmaps.length) {
        expected.status = 'in_progress';
      } else {
        expected.status = 'completed';
      }
    } else {
      // Fall back to vision completion percentage
      expected.completion_percentage = visionPlan.metadata?.completion_percentage || 0;
      expected.roadmaps_completed = Math.floor(
        (expected.completion_percentage / 100) * plan.roadmaps.length
      );

      if (expected.completion_percentage === 0) {
        expected.status = 'not_started';
      } else if (expected.completion_percentage < 100) {
        expected.status = 'in_progress';
      } else {
        expected.status = 'completed';
      }
    }
  }

  return expected;
}

export default {
  observeProgress,
  calculateAlignment,
  detectDrift,
  identifyDriftAreas,
  generateAdjustments,
  shouldTriggerReplan,
  formatDriftReport
};
