/**
 * Roadmap Manager
 *
 * CRUD operations for roadmaps. Handles file I/O, validation, and
 * roadmap lifecycle management.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import chalk from 'chalk';
import {
  createRoadmap,
  createPhase,
  validateRoadmap,
  updateRoadmapMetadata,
  generateSlug,
  calculateCompletion,
  getNextAvailablePhases,
} from './schema.js';

/**
 * Default roadmap storage directory
 */
const DEFAULT_ROADMAP_DIR = '.claude/roadmaps';

/**
 * Get the roadmaps directory path
 *
 * @param {string} cwd - Current working directory
 * @returns {string} Path to roadmaps directory
 */
export function getRoadmapsDir(cwd = process.cwd()) {
  return join(cwd, DEFAULT_ROADMAP_DIR);
}

/**
 * Ensure roadmaps directory exists
 *
 * @param {string} cwd - Current working directory
 * @returns {string} Path to roadmaps directory
 */
export function ensureRoadmapsDir(cwd = process.cwd()) {
  const dir = getRoadmapsDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get the path to a specific roadmap file
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {string} Path to roadmap JSON file
 */
export function getRoadmapPath(roadmapName, cwd = process.cwd()) {
  const slug = generateSlug(roadmapName);
  return join(getRoadmapsDir(cwd), `${slug}.json`);
}

/**
 * List all roadmaps in the project
 *
 * @param {string} cwd - Current working directory
 * @returns {Array} Array of roadmap objects with path info
 */
export function listRoadmaps(cwd = process.cwd()) {
  const roadmapsDir = getRoadmapsDir(cwd);

  if (!existsSync(roadmapsDir)) {
    return [];
  }

  const roadmaps = [];

  try {
    const files = readdirSync(roadmapsDir);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'README.json') {
        const filePath = join(roadmapsDir, file);
        try {
          const content = readFileSync(filePath, 'utf8');
          const roadmap = JSON.parse(content);
          roadmaps.push({
            ...roadmap,
            _path: filePath,
            _filename: file,
          });
        } catch (e) {
          // Skip invalid JSON files
          console.error(chalk.dim(`Skipping invalid roadmap file: ${file}`));
        }
      }
    }
  } catch (e) {
    // Directory read error
  }

  // Sort by updated date (most recent first)
  roadmaps.sort((a, b) => {
    const dateA = new Date(a.updated || a.created || 0);
    const dateB = new Date(b.updated || b.created || 0);
    return dateB - dateA;
  });

  return roadmaps;
}

/**
 * Load a roadmap by name/slug
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
    const roadmap = JSON.parse(content);
    roadmap._path = roadmapPath;
    return roadmap;
  } catch (e) {
    console.error(chalk.red(`Error loading roadmap: ${e.message}`));
    return null;
  }
}

/**
 * Save a roadmap to disk
 *
 * @param {Object} roadmap - Roadmap object
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, path: string, error?: string }
 */
export function saveRoadmap(roadmap, cwd = process.cwd()) {
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

  // Ensure directory exists
  ensureRoadmapsDir(cwd);

  // Get path
  const roadmapPath = getRoadmapPath(roadmap.slug || roadmap.title, cwd);

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
 * Reorder phases in a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} phaseId - Phase ID to move
 * @param {number} newPosition - New position (0-indexed)
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function reorderPhase(roadmapName, phaseId, newPosition, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const currentIndex = roadmap.phases.findIndex(p => p.phase_id === phaseId);

  if (currentIndex === -1) {
    return {
      success: false,
      error: `Phase not found: ${phaseId}`,
    };
  }

  // Clamp new position
  newPosition = Math.max(0, Math.min(newPosition, roadmap.phases.length - 1));

  // Move phase
  const [phase] = roadmap.phases.splice(currentIndex, 1);
  roadmap.phases.splice(newPosition, 0, phase);

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    error: saveResult.error,
  };
}

/**
 * Merge two phases into one
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} phaseId1 - First phase ID (will be kept)
 * @param {string} phaseId2 - Second phase ID (will be merged into first)
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, phase: Object, error?: string }
 */
export function mergePhases(roadmapName, phaseId1, phaseId2, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      phase: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phase1 = roadmap.phases.find(p => p.phase_id === phaseId1);
  const phase2 = roadmap.phases.find(p => p.phase_id === phaseId2);

  if (!phase1 || !phase2) {
    return {
      success: false,
      phase: null,
      error: `One or both phases not found: ${phaseId1}, ${phaseId2}`,
    };
  }

  // Merge phase2 into phase1
  phase1.goal = `${phase1.goal}\n\n${phase2.goal}`.trim();
  phase1.inputs.issues = [...new Set([...phase1.inputs.issues, ...phase2.inputs.issues])];
  phase1.inputs.docs = [...new Set([...phase1.inputs.docs, ...phase2.inputs.docs])];
  phase1.inputs.prompts = [...phase1.inputs.prompts, ...phase2.inputs.prompts];
  phase1.outputs = [...phase1.outputs, ...phase2.outputs];
  phase1.agents_assigned = [...new Set([...phase1.agents_assigned, ...phase2.agents_assigned])];

  // Update complexity (use larger)
  const complexityOrder = { S: 1, M: 2, L: 3 };
  if (complexityOrder[phase2.complexity] > complexityOrder[phase1.complexity]) {
    phase1.complexity = phase2.complexity;
  }

  // Transfer phase2's dependencies to phase1 (except self-reference)
  phase1.dependencies = [
    ...new Set([
      ...phase1.dependencies.filter(d => d !== phaseId2),
      ...phase2.dependencies.filter(d => d !== phaseId1),
    ]),
  ];

  // Remove phase2
  roadmap.phases = roadmap.phases.filter(p => p.phase_id !== phaseId2);

  // Update references to phase2 in other phases
  for (const phase of roadmap.phases) {
    if (phase.dependencies) {
      phase.dependencies = phase.dependencies.map(d => d === phaseId2 ? phaseId1 : d);
      phase.dependencies = [...new Set(phase.dependencies)]; // Remove duplicates
    }
  }

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    phase: saveResult.success ? phase1 : null,
    error: saveResult.error,
  };
}

/**
 * Split a phase into multiple phases
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} phaseId - Phase ID to split
 * @param {Array} splitConfig - Array of { title, goal } for new phases
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, phases: Array, error?: string }
 */
export function splitPhase(roadmapName, phaseId, splitConfig, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      phases: [],
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phaseIndex = roadmap.phases.findIndex(p => p.phase_id === phaseId);

  if (phaseIndex === -1) {
    return {
      success: false,
      phases: [],
      error: `Phase not found: ${phaseId}`,
    };
  }

  const originalPhase = roadmap.phases[phaseIndex];
  const newPhases = [];

  // Create new phases
  for (let i = 0; i < splitConfig.length; i++) {
    const config = splitConfig[i];
    const newPhaseId = `${phaseId}-${i + 1}`;
    const newPhase = createPhase({
      phase_id: newPhaseId,
      phase_title: config.title || `${originalPhase.phase_title} (Part ${i + 1})`,
      goal: config.goal || '',
      complexity: config.complexity || 'S',
      phase_number: phaseIndex + i + 1,
    });

    // First new phase inherits original dependencies
    if (i === 0) {
      newPhase.dependencies = [...originalPhase.dependencies];
    } else {
      // Subsequent phases depend on previous split
      newPhase.dependencies = [newPhases[i - 1].phase_id];
    }

    newPhases.push(newPhase);
  }

  // Remove original phase and insert new ones
  roadmap.phases.splice(phaseIndex, 1, ...newPhases);

  // Update references to original phase in other phases
  for (const phase of roadmap.phases) {
    if (phase.dependencies && phase.dependencies.includes(phaseId)) {
      // Replace with last split phase
      phase.dependencies = phase.dependencies.map(d =>
        d === phaseId ? newPhases[newPhases.length - 1].phase_id : d
      );
    }
  }

  const saveResult = saveRoadmap(roadmap, cwd);

  return {
    success: saveResult.success,
    phases: saveResult.success ? newPhases : [],
    error: saveResult.error,
  };
}

/**
 * Get roadmap summary statistics
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Summary stats
 */
export function getRoadmapSummary(roadmapName, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return null;
  }

  const phases = roadmap.phases || [];
  const completedPhases = phases.filter(p => p.status === 'completed');
  const inProgressPhases = phases.filter(p => p.status === 'in_progress');
  const pendingPhases = phases.filter(p => p.status === 'pending');
  const blockedPhases = phases.filter(p => p.status === 'blocked');

  return {
    roadmap_id: roadmap.roadmap_id,
    title: roadmap.title,
    slug: roadmap.slug,
    status: roadmap.status,
    total_phases: phases.length,
    completed_phases: completedPhases.length,
    in_progress_phases: inProgressPhases.length,
    pending_phases: pendingPhases.length,
    blocked_phases: blockedPhases.length,
    completion_percentage: calculateCompletion(roadmap),
    next_available: getNextAvailablePhases(roadmap).map(p => p.phase_id),
    github_integrated: roadmap.metadata?.github_integrated || false,
    created: roadmap.created,
    updated: roadmap.updated,
  };
}

/**
 * Generate a README.md for the roadmaps directory
 *
 * @param {string} cwd - Current working directory
 */
export function generateRoadmapsIndex(cwd = process.cwd()) {
  const roadmaps = listRoadmaps(cwd);
  const roadmapsDir = getRoadmapsDir(cwd);

  let content = `# Roadmaps

This directory contains project roadmaps created with CCASP.

## Active Roadmaps

`;

  if (roadmaps.length === 0) {
    content += `_No roadmaps found. Create one with \`/create-roadmap\`._\n`;
  } else {
    content += `| Roadmap | Status | Phases | Progress |\n`;
    content += `|---------|--------|--------|----------|\n`;

    for (const roadmap of roadmaps) {
      const summary = getRoadmapSummary(roadmap.slug, cwd);
      if (summary) {
        content += `| [${summary.title}](./${roadmap.slug}.json) | ${summary.status} | ${summary.completed_phases}/${summary.total_phases} | ${summary.completion_percentage}% |\n`;
      }
    }
  }

  content += `
## Commands

- \`/create-roadmap\` - Create a new roadmap
- \`/roadmap-status\` - View roadmap status
- \`/roadmap-edit\` - Edit a roadmap
- \`/roadmap-track\` - Track roadmap progress

---
*Generated by CCASP*
`;

  try {
    writeFileSync(join(roadmapsDir, 'README.md'), content);
  } catch (e) {
    // Ignore write errors
  }
}
