/**
 * Vision State Manager
 *
 * Thin re-export wrapper for organized submodules.
 * Manages Vision-level state with file locking for concurrent access.
 * Handles VISION.json persistence and state transitions.
 */

import { getVisionDir, getVisionPath, ensureVisionDir, loadVision, saveVision, createAndSaveVision, listVisions, updateVision, deleteVision } from './state/store.js';
import { transitionVisionStatus, getVisionStatus, createVisionCheckpoint, restoreVisionCheckpoint, listVisionCheckpoints } from './state/queries.js';
import { syncProgressHierarchy, completeTaskAndSync } from './state/sync.js';

export {
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
