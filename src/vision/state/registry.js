/**
 * Vision Registry
 *
 * Centralized index of all visions with cross-process safety.
 * Maintains VISION_REGISTRY.json in .claude/visions/ for fast lookups
 * and slug uniqueness enforcement.
 */

import fs from 'fs';
import path from 'path';
import { getVisionDir } from './store.js';
import { acquireFileLock, releaseFileLock } from './locking.js';

const REGISTRY_FILENAME = 'VISION_REGISTRY.json';

/**
 * Get path to the registry file
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to VISION_REGISTRY.json
 */
export function getRegistryPath(projectRoot) {
  return path.join(getVisionDir(projectRoot), REGISTRY_FILENAME);
}

/**
 * Create an empty registry structure
 * @returns {Object} Empty registry
 */
function createEmptyRegistry() {
  return {
    version: 1,
    visions: {},
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      last_rebuild: null
    }
  };
}

/**
 * Load registry from disk, rebuilding if missing or corrupt
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Registry object
 */
export function loadRegistry(projectRoot) {
  const registryPath = getRegistryPath(projectRoot);

  if (fs.existsSync(registryPath)) {
    try {
      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);
      if (registry.version && registry.visions) {
        return registry;
      }
    } catch {
      // Corrupt file - rebuild
    }
  }

  // Registry missing or corrupt - rebuild from filesystem
  return rebuildRegistry(projectRoot);
}

/**
 * Save registry to disk atomically (write to temp, then rename)
 * @param {string} projectRoot - Project root directory
 * @param {Object} registry - Registry object to save
 */
export function saveRegistry(projectRoot, registry) {
  const registryPath = getRegistryPath(projectRoot);
  const visionDir = getVisionDir(projectRoot);

  if (!fs.existsSync(visionDir)) {
    fs.mkdirSync(visionDir, { recursive: true });
  }

  registry.metadata.updated = new Date().toISOString();

  // Atomic write: temp file + rename
  const tempPath = registryPath + '.tmp.' + process.pid;
  fs.writeFileSync(tempPath, JSON.stringify(registry, null, 2), 'utf8');

  try {
    fs.renameSync(tempPath, registryPath);
  } catch {
    // On Windows, rename can fail if target exists - fallback to write
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  }
}

/**
 * Rebuild registry by scanning all VISION.json files on disk
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Rebuilt registry
 */
export function rebuildRegistry(projectRoot) {
  const visionDir = getVisionDir(projectRoot);
  const registry = createEmptyRegistry();
  registry.metadata.last_rebuild = new Date().toISOString();

  if (!fs.existsSync(visionDir)) {
    return registry;
  }

  const entries = fs.readdirSync(visionDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const visionPath = path.join(visionDir, entry.name, 'VISION.json');
    if (!fs.existsSync(visionPath)) continue;

    try {
      const vision = JSON.parse(fs.readFileSync(visionPath, 'utf8'));
      registry.visions[vision.slug || entry.name] = {
        slug: vision.slug || entry.name,
        title: vision.title || 'Untitled',
        status: vision.status || 'unknown',
        plan_type: vision.plan_type || 'vision-full',
        vision_id: vision.vision_id || null,
        created: vision.metadata?.created || null,
        updated: vision.metadata?.updated || null,
        completion_percentage: vision.metadata?.completion_percentage || 0
      };
    } catch {
      // Skip corrupt vision files
    }
  }

  saveRegistry(projectRoot, registry);
  return registry;
}

/**
 * Register a vision in the registry
 * @param {string} projectRoot - Project root directory
 * @param {Object} vision - Vision object to register
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function registerVision(projectRoot, vision) {
  const registryPath = getRegistryPath(projectRoot);

  try {
    await acquireFileLock(registryPath);

    const registry = loadRegistry(projectRoot);

    registry.visions[vision.slug] = {
      slug: vision.slug,
      title: vision.title || 'Untitled',
      status: vision.status || 'planning',
      plan_type: vision.plan_type || 'vision-full',
      vision_id: vision.vision_id || null,
      created: vision.metadata?.created || new Date().toISOString(),
      updated: vision.metadata?.updated || new Date().toISOString(),
      completion_percentage: vision.metadata?.completion_percentage || 0
    };

    saveRegistry(projectRoot, registry);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    releaseFileLock(registryPath);
  }
}

/**
 * Deregister a vision from the registry
 * @param {string} projectRoot - Project root directory
 * @param {string} slug - Vision slug to remove
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function deregisterVision(projectRoot, slug) {
  const registryPath = getRegistryPath(projectRoot);

  try {
    await acquireFileLock(registryPath);

    const registry = loadRegistry(projectRoot);
    delete registry.visions[slug];
    saveRegistry(projectRoot, registry);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    releaseFileLock(registryPath);
  }
}

/**
 * Update a vision entry in the registry
 * @param {string} projectRoot - Project root directory
 * @param {string} slug - Vision slug
 * @param {Object} updates - Fields to update
 * @returns {Object} Result { success: boolean }
 */
export async function updateRegistryEntry(projectRoot, slug, updates) {
  const registryPath = getRegistryPath(projectRoot);

  try {
    await acquireFileLock(registryPath);

    const registry = loadRegistry(projectRoot);

    if (!registry.visions[slug]) {
      return { success: false, error: `Vision not in registry: ${slug}` };
    }

    Object.assign(registry.visions[slug], updates, {
      updated: new Date().toISOString()
    });

    saveRegistry(projectRoot, registry);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    releaseFileLock(registryPath);
  }
}

/**
 * Check if a slug is already taken
 * @param {string} projectRoot - Project root directory
 * @param {string} slug - Slug to check
 * @returns {boolean} True if slug is taken
 */
export function isSlugTaken(projectRoot, slug) {
  const registry = loadRegistry(projectRoot);
  return slug in registry.visions;
}

/**
 * Get all registered visions
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of vision registry entries
 */
export function getRegisteredVisions(projectRoot) {
  const registry = loadRegistry(projectRoot);
  return Object.values(registry.visions)
    .sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
}

/**
 * Get active (non-completed, non-failed) visions
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of active vision entries
 */
export function getActiveVisions(projectRoot) {
  return getRegisteredVisions(projectRoot)
    .filter(v => v.status !== 'completed' && v.status !== 'failed');
}

/**
 * Get count of registered visions
 * @param {string} projectRoot - Project root directory
 * @returns {number} Vision count
 */
export function getVisionCount(projectRoot) {
  const registry = loadRegistry(projectRoot);
  return Object.keys(registry.visions).length;
}
