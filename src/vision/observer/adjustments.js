/**
 * Vision Mode Observer - Adjustments Module
 *
 * Adjustment generation and drift reporting.
 */

import { DriftSeverity } from '../schema.js';

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
