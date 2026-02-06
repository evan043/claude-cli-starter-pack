/**
 * Vision Schema Mutations
 * Functions for validating and mutating Vision objects.
 */

import { VisionStatus, DriftSeverity } from './constants.js';

/**
 * Validate a Vision object against schema
 * @param {Object} vision - Vision object to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateVision(vision) {
  const errors = [];

  // Required fields
  if (!vision.vision_id) {
    errors.push('Missing required field: vision_id');
  }
  if (!vision.slug) {
    errors.push('Missing required field: slug');
  }
  if (!vision.title || vision.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (!Object.values(VisionStatus).includes(vision.status)) {
    errors.push(`Invalid status: ${vision.status}`);
  }

  // Validate prompt
  if (!vision.prompt || typeof vision.prompt.original !== 'string') {
    errors.push('Missing or invalid prompt.original');
  }

  // Validate observer
  if (vision.observer) {
    if (typeof vision.observer.current_alignment !== 'number' ||
        vision.observer.current_alignment < 0 ||
        vision.observer.current_alignment > 1) {
      errors.push('observer.current_alignment must be a number between 0 and 1');
    }
  }

  // Validate token budget
  if (vision.execution_plan?.token_budget) {
    const budget = vision.execution_plan.token_budget;
    if (budget.used > budget.total) {
      errors.push('Token budget exceeded: used > total');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Update Vision status with timestamp
 * @param {Object} vision - Vision object to update
 * @param {string} newStatus - New status value
 * @returns {Object} Updated vision
 */
export function updateVisionStatus(vision, newStatus) {
  if (!Object.values(VisionStatus).includes(newStatus)) {
    throw new Error(`Invalid vision status: ${newStatus}`);
  }

  vision.status = newStatus;
  vision.metadata.updated = new Date().toISOString();

  return vision;
}

/**
 * Update Vision completion percentage
 * @param {Object} vision - Vision object
 * @returns {number} Calculated completion percentage
 */
export function calculateVisionCompletion(vision) {
  if (!vision.execution_plan?.roadmaps?.length) {
    return 0;
  }

  const roadmaps = vision.execution_plan.roadmaps;
  const totalCompletion = roadmaps.reduce((sum, rm) => sum + (rm.completion_percentage || 0), 0);
  const completion = Math.round(totalCompletion / roadmaps.length);

  vision.metadata.completion_percentage = completion;
  vision.metadata.updated = new Date().toISOString();

  return completion;
}

/**
 * Record a drift event
 * @param {Object} vision - Vision object
 * @param {Object} driftEvent - Drift event details
 */
export function recordDriftEvent(vision, driftEvent) {
  const event = {
    detected_at: new Date().toISOString(),
    severity: driftEvent.severity || DriftSeverity.LOW,
    area: driftEvent.area,
    expected: driftEvent.expected,
    actual: driftEvent.actual,
    resolution: driftEvent.resolution || 'adjusted'
  };

  vision.observer.drift_events.push(event);
  vision.observer.observation_count++;
  vision.observer.last_observation = event.detected_at;

  if (event.resolution === 'adjusted') {
    vision.observer.adjustments_made++;
  }

  vision.metadata.updated = event.detected_at;
}

/**
 * Update alignment score
 * @param {Object} vision - Vision object
 * @param {number} alignment - New alignment score (0-1)
 */
export function updateAlignment(vision, alignment) {
  const timestamp = new Date().toISOString();

  vision.observer.current_alignment = alignment;
  vision.observer.alignment_history.push({ timestamp, alignment });
  vision.observer.last_observation = timestamp;
  vision.metadata.updated = timestamp;

  // Keep only last 100 alignment records
  if (vision.observer.alignment_history.length > 100) {
    vision.observer.alignment_history = vision.observer.alignment_history.slice(-100);
  }
}

/**
 * Record security scan results
 * @param {Object} vision - Vision object
 * @param {Object} scanResults - Security scan results
 */
export function recordSecurityScan(vision, scanResults) {
  const timestamp = new Date().toISOString();

  vision.security.last_scan = timestamp;
  vision.security.scan_count++;
  vision.security.packages_scanned += scanResults.packages_scanned || 0;
  vision.security.vulnerabilities_found += scanResults.vulnerabilities_found || 0;

  if (scanResults.blocked_packages?.length > 0) {
    for (const pkg of scanResults.blocked_packages) {
      vision.security.blocked_packages.push({
        name: pkg.name,
        reason: pkg.reason,
        severity: pkg.severity,
        blocked_at: timestamp
      });
      vision.security.vulnerabilities_blocked++;
    }
  }

  vision.metadata.updated = timestamp;
}

/**
 * Add agent to execution plan
 * @param {Object} vision - Vision object
 * @param {Object} agent - Agent details
 */
export function addCreatedAgent(vision, agent) {
  vision.execution_plan.agents_created.push({
    name: agent.name,
    domain: agent.domain,
    created_at: new Date().toISOString()
  });

  vision.metadata.updated = new Date().toISOString();
}

/**
 * Update roadmap progress in execution plan
 * @param {Object} vision - Vision object
 * @param {string} roadmapId - Roadmap ID to update
 * @param {Object} updates - Updates to apply
 */
export function updateRoadmapProgress(vision, roadmapId, updates) {
  const roadmap = vision.execution_plan.roadmaps.find(rm => rm.roadmap_id === roadmapId);

  if (roadmap) {
    if (updates.status) roadmap.status = updates.status;
    if (typeof updates.completion_percentage === 'number') {
      roadmap.completion_percentage = updates.completion_percentage;
    }

    // Recalculate overall completion
    calculateVisionCompletion(vision);
  }
}
