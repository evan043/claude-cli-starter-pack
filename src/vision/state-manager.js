/**
 * Vision State Manager
 *
 * Manages Vision-level state with file locking for concurrent access.
 * Handles VISION.json persistence and state transitions.
 */

import fs from 'fs';
import path from 'path';
import {
  createVision,
  validateVision,
  updateVisionStatus,
  calculateVisionCompletion,
  VisionStatus
} from './schema.js';

// In-memory lock map for file locking
const locks = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds

/**
 * Acquire lock for a file path
 * @param {string} filePath - Path to lock
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if lock acquired
 */
async function acquireLock(filePath, timeout = LOCK_TIMEOUT) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!locks.has(filePath)) {
      locks.set(filePath, {
        acquired: Date.now(),
        holder: process.pid
      });
      return true;
    }

    // Check for stale locks
    const lock = locks.get(filePath);
    if (Date.now() - lock.acquired > LOCK_TIMEOUT) {
      locks.delete(filePath);
      continue;
    }

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Lock acquisition timeout for ${filePath}`);
}

/**
 * Release lock for a file path
 * @param {string} filePath - Path to unlock
 */
function releaseLock(filePath) {
  locks.delete(filePath);
}

/**
 * Get Vision storage directory
 * @param {string} projectRoot - Project root directory
 * @returns {string} Vision storage directory path
 */
export function getVisionDir(projectRoot) {
  return path.join(projectRoot, '.claude', 'visions');
}

/**
 * Get path to a specific Vision file
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {string} Path to VISION.json
 */
export function getVisionPath(projectRoot, visionSlug) {
  return path.join(getVisionDir(projectRoot), visionSlug, 'VISION.json');
}

/**
 * Ensure Vision directory exists
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 */
export function ensureVisionDir(projectRoot, visionSlug) {
  const visionDir = path.join(getVisionDir(projectRoot), visionSlug);
  if (!fs.existsSync(visionDir)) {
    fs.mkdirSync(visionDir, { recursive: true });
  }
  return visionDir;
}

/**
 * Load a Vision from disk
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {Object|null} Vision object or null if not found
 */
export function loadVision(projectRoot, visionSlug) {
  const visionPath = getVisionPath(projectRoot, visionSlug);

  if (!fs.existsSync(visionPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(visionPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading vision ${visionSlug}:`, error.message);
    return null;
  }
}

/**
 * Save a Vision to disk with validation
 * @param {string} projectRoot - Project root directory
 * @param {Object} vision - Vision object to save
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function saveVision(projectRoot, vision) {
  // Validate before saving
  const validation = validateVision(vision);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`
    };
  }

  const visionPath = getVisionPath(projectRoot, vision.slug);

  try {
    await acquireLock(visionPath);

    // Ensure directory exists
    ensureVisionDir(projectRoot, vision.slug);

    // Update timestamp
    vision.metadata.updated = new Date().toISOString();

    // Write to file
    fs.writeFileSync(visionPath, JSON.stringify(vision, null, 2), 'utf8');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    releaseLock(visionPath);
  }
}

/**
 * Create and save a new Vision
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Vision creation options
 * @returns {Object} Result { success: boolean, vision?: Object, error?: string }
 */
export async function createAndSaveVision(projectRoot, options) {
  const vision = createVision(options);

  const result = await saveVision(projectRoot, vision);

  if (result.success) {
    return { success: true, vision };
  }

  return result;
}

/**
 * List all Visions in project
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of vision summaries
 */
export function listVisions(projectRoot) {
  const visionDir = getVisionDir(projectRoot);

  if (!fs.existsSync(visionDir)) {
    return [];
  }

  const visions = [];
  const entries = fs.readdirSync(visionDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const visionPath = path.join(visionDir, entry.name, 'VISION.json');
      if (fs.existsSync(visionPath)) {
        try {
          const vision = JSON.parse(fs.readFileSync(visionPath, 'utf8'));
          visions.push({
            vision_id: vision.vision_id,
            slug: vision.slug,
            title: vision.title,
            status: vision.status,
            completion_percentage: vision.metadata?.completion_percentage || 0,
            created: vision.metadata?.created,
            updated: vision.metadata?.updated
          });
        } catch (error) {
          console.error(`Error reading vision ${entry.name}:`, error.message);
        }
      }
    }
  }

  // Sort by updated date, newest first
  visions.sort((a, b) => new Date(b.updated) - new Date(a.updated));

  return visions;
}

/**
 * Update Vision with locked access
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @param {Function} updateFn - Function that receives vision and returns updated vision
 * @returns {Object} Result { success: boolean, vision?: Object, error?: string }
 */
export async function updateVision(projectRoot, visionSlug, updateFn) {
  const visionPath = getVisionPath(projectRoot, visionSlug);

  try {
    await acquireLock(visionPath);

    const vision = loadVision(projectRoot, visionSlug);
    if (!vision) {
      return {
        success: false,
        error: `Vision not found: ${visionSlug}`
      };
    }

    // Apply update function
    const updatedVision = updateFn(vision);

    // Save updated vision
    updatedVision.metadata.updated = new Date().toISOString();
    fs.writeFileSync(visionPath, JSON.stringify(updatedVision, null, 2), 'utf8');

    return { success: true, vision: updatedVision };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    releaseLock(visionPath);
  }
}

/**
 * Delete a Vision
 * @param {string} projectRoot - Project root directory
 * @param {string} visionSlug - Vision slug
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function deleteVision(projectRoot, visionSlug) {
  const visionDir = path.join(getVisionDir(projectRoot), visionSlug);

  if (!fs.existsSync(visionDir)) {
    return {
      success: false,
      error: `Vision not found: ${visionSlug}`
    };
  }

  try {
    fs.rmSync(visionDir, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

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

  return {
    vision_id: vision.vision_id,
    slug: vision.slug,
    title: vision.title,
    status: vision.status,
    completion_percentage: vision.metadata?.completion_percentage || 0,
    roadmaps: {
      total: roadmaps.length,
      completed: completedRoadmaps,
      in_progress: roadmaps.filter(rm => rm.status === 'in_progress').length,
      pending: roadmaps.filter(rm => rm.status === 'pending').length
    },
    observer: {
      enabled: vision.observer?.enabled,
      current_alignment: vision.observer?.current_alignment,
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

export default {
  getVisionDir,
  getVisionPath,
  ensureVisionDir,
  loadVision,
  saveVision,
  createAndSaveVision,
  listVisions,
  updateVision,
  deleteVision,
  transitionVisionStatus,
  getVisionStatus,
  createVisionCheckpoint,
  restoreVisionCheckpoint,
  listVisionCheckpoints
};
