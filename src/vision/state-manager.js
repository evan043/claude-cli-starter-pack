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
import { loadRegistry, saveRegistry, rebuildRegistry, registerVision, deregisterVision, updateRegistryEntry, isSlugTaken, getRegisteredVisions, getActiveVisions, getVisionCount } from './state/registry.js';
import { acquireFileLock, releaseFileLock, cleanStaleLocks } from './state/locking.js';

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
  completeTaskAndSync,
  // Registry
  loadRegistry,
  saveRegistry,
  rebuildRegistry,
  registerVision,
  deregisterVision,
  updateRegistryEntry,
  isSlugTaken,
  getRegisteredVisions,
  getActiveVisions,
  getVisionCount,
  // File locking
  acquireFileLock,
  releaseFileLock,
  cleanStaleLocks
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
  completeTaskAndSync,
  // Registry
  loadRegistry,
  saveRegistry,
  rebuildRegistry,
  registerVision,
  deregisterVision,
  updateRegistryEntry,
  isSlugTaken,
  getRegisteredVisions,
  getActiveVisions,
  getVisionCount,
  // File locking
  acquireFileLock,
  releaseFileLock,
  cleanStaleLocks
};
