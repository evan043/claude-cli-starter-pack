/**
 * Vision State Store
 *
 * Handles CRUD operations for Vision files with locked access.
 * Manages Vision directory structure and file persistence.
 */

import fs from 'fs';
import path from 'path';
import { acquireLock, releaseLock } from './locking.js';
import {
  createVision,
  validateVision
} from '../schema.js';
import { generateUniqueSlug } from '../schema/factories.js';
import { registerVision, deregisterVision, updateRegistryEntry, getRegisteredVisions } from './registry.js';

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

    // Update registry entry
    await updateRegistryEntry(projectRoot, vision.slug, {
      status: vision.status,
      completion_percentage: vision.metadata?.completion_percentage || 0
    }).catch(() => {}); // Non-fatal if registry update fails

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
  // Ensure slug uniqueness via registry
  const existingSlugs = getRegisteredVisions(projectRoot).map(v => v.slug);
  if (options.title && !options.slug) {
    options.slug = generateUniqueSlug(options.title, existingSlugs);
  }

  const vision = createVision(options);

  const result = await saveVision(projectRoot, vision);

  if (result.success) {
    // Register in the centralized registry
    await registerVision(projectRoot, vision);
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
  // Use registry for fast listing (auto-rebuilds from filesystem if needed)
  const registryEntries = getRegisteredVisions(projectRoot);

  if (registryEntries.length > 0) {
    return registryEntries.map(entry => ({
      vision_id: entry.vision_id,
      slug: entry.slug,
      title: entry.title,
      status: entry.status,
      plan_type: entry.plan_type,
      completion_percentage: entry.completion_percentage || 0,
      created: entry.created,
      updated: entry.updated
    }));
  }

  // Fallback: scan filesystem directly (registry was empty/missing)
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
            plan_type: vision.plan_type || 'vision-full',
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

    // Remove from registry
    await deregisterVision(projectRoot, visionSlug).catch(() => {});

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
