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

/**
 * Sync progress up the hierarchy: PROGRESS → ROADMAP → EPIC → VISION
 * This is the EVENT-DRIVEN progress propagation system
 * @param {string} projectRoot - Project root directory
 * @param {string} planSlug - Phase-dev-plan slug that was updated
 * @returns {Object} Sync result with updates made at each level
 */
export async function syncProgressHierarchy(projectRoot, planSlug) {
  const result = {
    success: true,
    updates: {
      plan: null,
      roadmap: null,
      epic: null,
      vision: null
    }
  };

  try {
    // Step 1: Load the updated PROGRESS.json
    const planDir = path.join(projectRoot, '.claude', 'phase-plans', planSlug);
    const progressPath = path.join(planDir, 'PROGRESS.json');

    if (!fs.existsSync(progressPath)) {
      return { success: false, error: `Plan not found: ${planSlug}` };
    }

    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    result.updates.plan = {
      slug: planSlug,
      completion: progress.completion_percentage
    };

    // Step 2: Find and update parent ROADMAP
    if (progress.parent_context?.type === 'roadmap' && progress.parent_context?.path) {
      const roadmapPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(roadmapPath)) {
        const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

        // Update the plan reference in roadmap
        const planRef = roadmap.phase_dev_plan_refs?.find(p => p.slug === planSlug);
        if (planRef) {
          planRef.completion_percentage = progress.completion_percentage;
          planRef.status = progress.status;
        }

        // Recalculate roadmap completion from all plans
        if (roadmap.phase_dev_plan_refs?.length > 0) {
          const totalCompletion = roadmap.phase_dev_plan_refs.reduce(
            (sum, p) => sum + (p.completion_percentage || 0),
            0
          );
          roadmap.completion_percentage = Math.round(totalCompletion / roadmap.phase_dev_plan_refs.length);

          // Check if all plans complete
          const allComplete = roadmap.phase_dev_plan_refs.every(p => p.completion_percentage === 100);
          if (allComplete) {
            roadmap.status = 'completed';
          } else if (roadmap.phase_dev_plan_refs.some(p => (p.completion_percentage || 0) > 0)) {
            roadmap.status = 'in_progress';
          }
        }

        roadmap.metadata = roadmap.metadata || {};
        roadmap.metadata.updated = new Date().toISOString();

        fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

        result.updates.roadmap = {
          slug: roadmap.slug,
          completion: roadmap.completion_percentage,
          status: roadmap.status
        };

        // Step 3: Find and update parent EPIC
        if (roadmap.parent_epic?.epic_path) {
          const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
            ? roadmap.parent_epic.epic_path
            : path.join(projectRoot, roadmap.parent_epic.epic_path);

          if (fs.existsSync(epicPath)) {
            const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

            // Update the roadmap reference in epic
            const roadmapRef = epic.roadmaps?.find(r => r.path === roadmap.parent_epic?.path || r.roadmap_id === roadmap.slug);
            if (roadmapRef) {
              roadmapRef.completion_percentage = roadmap.completion_percentage;
              roadmapRef.status = roadmap.status;
            }

            // Recalculate epic completion from all roadmaps
            if (epic.roadmaps?.length > 0) {
              const totalCompletion = epic.roadmaps.reduce(
                (sum, r) => sum + (r.completion_percentage || 0),
                0
              );
              epic.completion_percentage = Math.round(totalCompletion / epic.roadmaps.length);

              // Check if all roadmaps complete
              const allComplete = epic.roadmaps.every(r => r.completion_percentage === 100);
              if (allComplete) {
                epic.status = 'completed';
              } else if (epic.roadmaps.some(r => (r.completion_percentage || 0) > 0)) {
                epic.status = 'in_progress';
              }
            }

            epic.updated = new Date().toISOString();

            fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

            result.updates.epic = {
              slug: epic.slug,
              completion: epic.completion_percentage,
              status: epic.status
            };

            // Step 4: Find and update parent VISION
            const visionSlug = epic.metadata?.vision_slug || progress.metadata?.vision_slug;
            if (visionSlug) {
              const visionPath = getVisionPath(projectRoot, visionSlug);

              if (fs.existsSync(visionPath)) {
                const vision = JSON.parse(fs.readFileSync(visionPath, 'utf8'));

                // Update vision completion from epic
                vision.metadata = vision.metadata || {};
                vision.metadata.completion_percentage = epic.completion_percentage;
                vision.metadata.updated = new Date().toISOString();

                // Update planning section if it exists
                if (vision.planning) {
                  vision.planning.epic_completion = epic.completion_percentage;
                  vision.planning.last_sync = new Date().toISOString();
                }

                // Update status if all complete
                if (epic.status === 'completed') {
                  vision.status = VisionStatus.COMPLETED;
                } else if (epic.status === 'in_progress') {
                  vision.status = VisionStatus.EXECUTING;
                }

                fs.writeFileSync(visionPath, JSON.stringify(vision, null, 2), 'utf8');

                result.updates.vision = {
                  slug: visionSlug,
                  completion: epic.completion_percentage,
                  status: vision.status
                };
              }
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      updates: result.updates
    };
  }
}

/**
 * Mark a task as complete and trigger hierarchy sync
 * @param {string} projectRoot - Project root directory
 * @param {string} planSlug - Phase-dev-plan slug
 * @param {number} phaseId - Phase ID
 * @param {number} taskId - Task ID
 * @returns {Object} Result with updated completion percentages
 */
export async function completeTaskAndSync(projectRoot, planSlug, phaseId, taskId) {
  const planDir = path.join(projectRoot, '.claude', 'phase-plans', planSlug);
  const progressPath = path.join(planDir, 'PROGRESS.json');

  if (!fs.existsSync(progressPath)) {
    return { success: false, error: `Plan not found: ${planSlug}` };
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Find and update the task
    const phase = progress.phases?.find(p => p.id === phaseId);
    if (!phase) {
      return { success: false, error: `Phase not found: ${phaseId}` };
    }

    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task not found: ${taskId}` };
    }

    // Mark task complete
    task.completed = true;
    task.status = 'completed';
    task.completed_at = new Date().toISOString();

    // Recalculate phase completion
    const totalTasks = phase.tasks?.length || 0;
    const completedTasks = phase.tasks?.filter(t => t.completed || t.status === 'completed').length || 0;
    phase.completion_percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (completedTasks === totalTasks) {
      phase.status = 'completed';
    } else if (completedTasks > 0) {
      phase.status = 'in_progress';
    }

    // Recalculate overall plan completion
    const totalPhases = progress.phases?.length || 0;
    const totalPhaseCompletion = progress.phases?.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) || 0;
    progress.completion_percentage = totalPhases > 0 ? Math.round(totalPhaseCompletion / totalPhases) : 0;

    // Update plan status
    const allPhasesComplete = progress.phases?.every(p => p.status === 'completed');
    if (allPhasesComplete) {
      progress.status = 'completed';
    } else if (progress.phases?.some(p => p.status === 'in_progress')) {
      progress.status = 'in_progress';
    }

    progress.metadata = progress.metadata || {};
    progress.metadata.updated = new Date().toISOString();

    // Save updated progress
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

    // Sync up the hierarchy
    const syncResult = await syncProgressHierarchy(projectRoot, planSlug);

    return {
      success: true,
      task: { phaseId, taskId, completed: true },
      phase: { id: phaseId, completion: phase.completion_percentage, status: phase.status },
      plan: { slug: planSlug, completion: progress.completion_percentage, status: progress.status },
      hierarchySync: syncResult
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
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
  listVisionCheckpoints,
  syncProgressHierarchy,
  completeTaskAndSync
};
