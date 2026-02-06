/**
 * Vision Mode Observer - Progress Module
 *
 * Progress observation and tracking.
 */

import {
  calculateAlignment,
  detectDrift,
  identifyDriftAreas,
  shouldTriggerReplan,
  DRIFT_THRESHOLDS
} from './detection.js';
import { generateAdjustments } from './adjustments.js';
import {
  DriftSeverity,
  recordDriftEvent,
  updateAlignment
} from '../schema.js';
import { updateVision } from '../state-manager.js';

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
