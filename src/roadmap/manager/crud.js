/**
 * Roadmap Manager - CRUD Operations
 *
 * Create, read, update, delete operations for roadmaps and phases.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import {
  createRoadmap,
  createPhase,
  validateRoadmap,
  updateRoadmapMetadata,
  generateSlug,
  createPlanReference,
  addPlanReference,
  removePlanReference,
  updatePlanReference,
  calculateOverallCompletion,
  addCrossPlanDependency,
  migrateLegacyRoadmap,
} from '../schema.js';
import { getRoadmapPath, ensureRoadmapDir, getRoadmapsDir, getRoadmapDir } from './queries.js';

/**
 * List all roadmaps in the project
 * Supports both new consolidated structure and legacy flat structure
 *
 * @param {string} cwd - Current working directory
 * @returns {Array} Array of roadmap objects with path info
 */
function listRoadmaps(cwd) {
  const { listRoadmaps: listRoadmapsQuery } = require('./queries.js');
  return listRoadmapsQuery(cwd);
}

/**
 * Load a roadmap by name/slug
 *
 * Supports backwards compatibility: automatically migrates legacy format
 * to new epic-hierarchy format if needed.
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Roadmap object or null if not found
 */
export function loadRoadmap(roadmapName, cwd = process.cwd()) {
  const roadmapPath = getRoadmapPath(roadmapName, cwd);

  if (!existsSync(roadmapPath)) {
    // Try to find by searching all roadmaps
    const allRoadmaps = listRoadmaps(cwd);
    const match = allRoadmaps.find(
      r => r.slug === roadmapName ||
           r.title.toLowerCase() === roadmapName.toLowerCase() ||
           r.roadmap_id === roadmapName
    );
    if (match) {
      return match;
    }
    return null;
  }

  try {
    const content = readFileSync(roadmapPath, 'utf8');
    let roadmap = JSON.parse(content);
    roadmap._path = roadmapPath;

    // Backwards compatibility: migrate legacy format
    roadmap = migrateLegacyRoadmap(roadmap);

    return roadmap;
  } catch (e) {
    console.error(chalk.red(`Error loading roadmap: ${e.message}`));
    return null;
  }
}

/**
 * Save a roadmap to disk
 * Uses new consolidated structure: .claude/roadmaps/{slug}/ROADMAP.json
 *
 * @param {Object} roadmap - Roadmap object
 * @param {string} cwd - Current working directory
 * @param {Object} options - Save options
 * @param {boolean} options.useConsolidated - Use new consolidated structure (default: true)
 * @returns {Object} Result { success: boolean, path: string, error?: string }
 */
export function saveRoadmap(roadmap, cwd = process.cwd(), options = {}) {
  const { useConsolidated = true } = options;

  // Validate first
  const validation = validateRoadmap(roadmap);
  if (!validation.valid) {
    return {
      success: false,
      path: null,
      error: `Validation failed: ${validation.errors.join('; ')}`,
    };
  }

  // Update metadata
  updateRoadmapMetadata(roadmap);

  const slug = generateSlug(roadmap.slug || roadmap.title);

  // Determine path based on structure preference
  let roadmapPath;
  if (useConsolidated) {
    // New consolidated structure: .claude/roadmaps/{slug}/ROADMAP.json
    const roadmapDir = ensureRoadmapDir(slug, cwd);
    roadmapPath = join(roadmapDir, 'ROADMAP.json');
  } else {
    // Legacy flat structure: .claude/roadmaps/{slug}.json
    const { ensureRoadmapsDir } = require('./queries.js');
    ensureRoadmapsDir(cwd);
    roadmapPath = join(getRoadmapsDir(cwd), `${slug}.json`);
  }

  try {
    // Remove internal properties before saving
    const toSave = { ...roadmap };
    delete toSave._path;
    delete toSave._filename;

    writeFileSync(roadmapPath, JSON.stringify(toSave, null, 2));

    return {
      success: true,
      path: roadmapPath,
    };
  } catch (e) {
    return {
      success: false,
      path: roadmapPath,
      error: e.message,
    };
  }
}

/**
 * Create a new roadmap with the given options
 *
 * @param {Object} options - Roadmap creation options
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, roadmap: Object, path: string, error?: string }
 */
export function createNewRoadmap(options, cwd = process.cwd()) {
  const roadmap = createRoadmap(options);

  // Add initial phases if provided
  if (options.phases && Array.isArray(options.phases)) {
    for (let i = 0; i < options.phases.length; i++) {
      const phaseOptions = {
        ...options.phases[i],
        phase_number: i + 1,
      };
      roadmap.phases.push(createPhase(phaseOptions));
    }
  }

  // Save
  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    roadmap: saveResult.success ? roadmap : null,
    path: saveResult.path,
    error: saveResult.error,
  };
}

/**
 * Delete a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function deleteRoadmap(roadmapName, cwd = process.cwd()) {
  const roadmapPath = getRoadmapPath(roadmapName, cwd);

  if (!existsSync(roadmapPath)) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  try {
    unlinkSync(roadmapPath);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Add a phase to a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {Object} phaseOptions - Phase creation options
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, phase: Object, error?: string }
 */
export function addPhase(roadmapName, phaseOptions, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      phase: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phaseNumber = roadmap.phases.length + 1;
  const phase = createPhase({
    ...phaseOptions,
    phase_number: phaseNumber,
    phase_id: phaseOptions.phase_id || `phase-${phaseNumber}`,
  });

  // Set progress JSON path
  phase.phase_dev_config.progress_json_path =
    `.claude/phase-plans/${roadmap.slug}/${phase.phase_id}.json`;

  roadmap.phases.push(phase);

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    phase: saveResult.success ? phase : null,
    error: saveResult.error,
  };
}

/**
 * Update a phase in a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} phaseId - Phase ID to update
 * @param {Object} updates - Fields to update
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, phase: Object, error?: string }
 */
export function updatePhase(roadmapName, phaseId, updates, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      phase: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phaseIndex = roadmap.phases.findIndex(p => p.phase_id === phaseId);

  if (phaseIndex === -1) {
    return {
      success: false,
      phase: null,
      error: `Phase not found: ${phaseId}`,
    };
  }

  // Apply updates
  const phase = roadmap.phases[phaseIndex];
  Object.assign(phase, updates);

  // Update completion timestamp if completed
  if (updates.status === 'completed' && !phase.metadata.completed_at) {
    phase.metadata.completed_at = new Date().toISOString();
  }

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    phase: saveResult.success ? phase : null,
    error: saveResult.error,
  };
}

/**
 * Remove a phase from a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} phaseId - Phase ID to remove
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function removePhase(roadmapName, phaseId, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phaseIndex = roadmap.phases.findIndex(p => p.phase_id === phaseId);

  if (phaseIndex === -1) {
    return {
      success: false,
      error: `Phase not found: ${phaseId}`,
    };
  }

  // Remove phase
  roadmap.phases.splice(phaseIndex, 1);

  // Update dependencies in other phases
  for (const phase of roadmap.phases) {
    if (phase.dependencies) {
      phase.dependencies = phase.dependencies.filter(d => d !== phaseId);
    }
  }

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    error: saveResult.error,
  };
}

/**
 * Add a phase-dev-plan reference to a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {Object} planRefOptions - Plan reference options { slug, title, status, completion_percentage }
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, planRef: Object, error?: string }
 */
export function addPhaseDevPlanRef(roadmapName, planRefOptions, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      planRef: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  try {
    const planRef = createPlanReference(planRefOptions);
    addPlanReference(roadmap, planRef);

    const saveResult = saveRoadmap(roadmap, cwd);

    return {
      success: saveResult.success,
      planRef: saveResult.success ? planRef : null,
      error: saveResult.error,
    };
  } catch (e) {
    return {
      success: false,
      planRef: null,
      error: e.message,
    };
  }
}

/**
 * Remove a phase-dev-plan reference from a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} planSlug - Slug of plan to remove
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function removePhaseDevPlanRef(roadmapName, planSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  removePlanReference(roadmap, planSlug);

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    error: saveResult.error,
  };
}

/**
 * Update a phase-dev-plan reference's status/completion
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} planSlug - Slug of plan to update
 * @param {Object} updates - Fields to update { status, completion_percentage }
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, planRef: Object, error?: string }
 */
export function updatePhaseDevPlanRef(roadmapName, planSlug, updates, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      planRef: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  try {
    updatePlanReference(roadmap, planSlug, updates);

    // Recalculate overall completion
    roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);

    // Update roadmap status
    const allComplete = roadmap.phase_dev_plan_refs.every(ref => ref.status === 'completed');
    if (allComplete) {
      roadmap.status = 'completed';
    } else if (roadmap.phase_dev_plan_refs.some(ref => ref.status === 'in_progress')) {
      roadmap.status = 'active';
    }

    const saveResult = saveRoadmap(roadmap, cwd);

    const planRef = roadmap.phase_dev_plan_refs.find(ref => ref.slug === planSlug);

    return {
      success: saveResult.success,
      planRef: saveResult.success ? planRef : null,
      error: saveResult.error,
    };
  } catch (e) {
    return {
      success: false,
      planRef: null,
      error: e.message,
    };
  }
}

/**
 * Add a cross-plan dependency to a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} dependentSlug - Slug of plan that depends
 * @param {string} dependsOnSlug - Slug of plan it depends on
 * @param {string} reason - Reason for dependency
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function addCrossPlanDep(roadmapName, dependentSlug, dependsOnSlug, reason, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  addCrossPlanDependency(roadmap, dependentSlug, dependsOnSlug, reason);

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    error: saveResult.error,
  };
}
