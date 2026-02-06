/**
 * Vision State Queries
 *
 * Provides status transitions, checkpoints, and query operations.
 */

import fs from 'fs';
import path from 'path';
import { getVisionDir, getVisionPath, loadVision, updateVision, saveVision } from './store.js';
import { updateVisionStatus } from '../schema.js';

/**
 * Transition Vision to a new status
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @param {string} newStatus - New status
 * @returns {Object} Result { success: boolean, vision?: Object, error?: string }
 */
export async function transitionVisionStatus(projectRoot, visionSlug, newStatus) {
  return updateVision(projectRoot, visionSlug, (vision) => {
    return updateVisionStatus(vision, newStatus);
  });
}

/**
 * Get Vision status summary
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {Object|null} Status summary or null if not found
 */
export function getVisionStatus(projectRoot, visionSlug) {
  const vision = loadVision(projectRoot, visionSlug);

  if (!vision) {
    return null;
  }

  const roadmaps = vision.execution_plan?.roadmaps || [];
  const completedRoadmaps = roadmaps.filter(rm => rm.status === 'completed').length;

  // Calculate completion dynamically from roadmaps instead of relying on stored value
  let completion_percentage = 0;
  if (roadmaps.length > 0) {
    const totalCompletion = roadmaps.reduce((sum, rm) => sum + (rm.completion_percentage || 0), 0);
    completion_percentage = Math.round(totalCompletion / roadmaps.length);
  }

  return {
    vision_id: vision.vision_id,
    slug: vision.slug,
    title: vision.title,
    status: vision.status,
    completion_percentage: completion_percentage,
    roadmaps: {
      total: roadmaps.length,
      completed: completedRoadmaps,
      in_progress: roadmaps.filter(rm => rm.status === 'in_progress').length,
      pending: roadmaps.filter(rm => rm.status === 'pending' || !rm.status).length
    },
    observer: {
      enabled: vision.observer?.enabled,
      current_alignment: vision.observer?.current_alignment ?? 1.0,
      drift_events: vision.observer?.drift_events?.length || 0,
      adjustments: vision.observer?.adjustments_made || 0
    },
    security: {
      enabled: vision.security?.enabled,
      last_scan: vision.security?.last_scan,
      vulnerabilities_found: vision.security?.vulnerabilities_found || 0,
      blocked_packages: vision.security?.blocked_packages?.length || 0
    },
    created: vision.metadata?.created,
    updated: vision.metadata?.updated
  };
}

/**
 * Create checkpoint for Vision state
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @param {string} summary - Checkpoint summary
 * @returns {Object} Result { success: boolean, checkpoint_id?: string, error?: string }
 */
export async function createVisionCheckpoint(projectRoot, visionSlug, summary) {
  const vision = loadVision(projectRoot, visionSlug);

  if (!vision) {
    return {
      success: false,
      error: `Vision not found: ${visionSlug}`
    };
  }

  const checkpointId = `vcp-${Date.now()}`;
  const checkpointDir = path.join(getVisionDir(projectRoot), visionSlug, 'checkpoints');

  try {
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    const checkpoint = {
      checkpoint_id: checkpointId,
      created_at: new Date().toISOString(),
      summary,
      vision_state: JSON.parse(JSON.stringify(vision))
    };

    const checkpointPath = path.join(checkpointDir, `${checkpointId}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');

    return { success: true, checkpoint_id: checkpointId };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Restore Vision from checkpoint
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @param {string} checkpointId - Checkpoint ID to restore
 * @returns {Object} Result { success: boolean, vision?: Object, error?: string }
 */
export async function restoreVisionCheckpoint(projectRoot, visionSlug, checkpointId) {
  const checkpointPath = path.join(
    getVisionDir(projectRoot),
    visionSlug,
    'checkpoints',
    `${checkpointId}.json`
  );

  if (!fs.existsSync(checkpointPath)) {
    return {
      success: false,
      error: `Checkpoint not found: ${checkpointId}`
    };
  }

  try {
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    const restoredVision = checkpoint.vision_state;

    // Update metadata to indicate restoration
    restoredVision.metadata.updated = new Date().toISOString();
    restoredVision.metadata.restored_from = checkpointId;

    const result = await saveVision(projectRoot, restoredVision);

    if (result.success) {
      return { success: true, vision: restoredVision };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List checkpoints for a Vision
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {Array} Array of checkpoint summaries
 */
export function listVisionCheckpoints(projectRoot, visionSlug) {
  const checkpointDir = path.join(getVisionDir(projectRoot), visionSlug, 'checkpoints');

  if (!fs.existsSync(checkpointDir)) {
    return [];
  }

  const checkpoints = [];
  const files = fs.readdirSync(checkpointDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(path.join(checkpointDir, file), 'utf8'));
      checkpoints.push({
        checkpoint_id: checkpoint.checkpoint_id,
        created_at: checkpoint.created_at,
        summary: checkpoint.summary,
        status: checkpoint.vision_state?.status,
        completion: checkpoint.vision_state?.metadata?.completion_percentage
      });
    } catch (error) {
      console.error(`Error reading checkpoint ${file}:`, error.message);
    }
  }

  // Sort by created date, newest first
  checkpoints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return checkpoints;
}
