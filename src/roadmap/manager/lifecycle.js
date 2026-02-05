/**
 * Roadmap Manager - Lifecycle Operations
 *
 * Status transitions, phase progression, completion logic, and lifecycle
 * transformations (merge, split, reorder).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createPhase } from '../schema.js';
import { loadRoadmap, saveRoadmap, updatePhaseDevPlanRef } from './crud.js';

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
 * Sync a plan reference from its PROGRESS.json file
 *
 * Reads the PROGRESS.json for a plan and updates the roadmap reference
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {string} planSlug - Slug of plan to sync
 * @param {string} cwd - Current working directory
 * @returns {Object} Result { success: boolean, planRef: Object, error?: string }
 */
export function syncPhaseDevPlanRef(roadmapName, planSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      planRef: null,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const planRef = roadmap.phase_dev_plan_refs?.find(ref => ref.slug === planSlug);
  if (!planRef) {
    return {
      success: false,
      planRef: null,
      error: `Plan reference not found: ${planSlug}`,
    };
  }

  // Load PROGRESS.json
  const progressPath = join(cwd, planRef.path);
  if (!existsSync(progressPath)) {
    return {
      success: false,
      planRef: null,
      error: `PROGRESS.json not found: ${progressPath}`,
    };
  }

  try {
    const progressContent = readFileSync(progressPath, 'utf8');
    const progress = JSON.parse(progressContent);

    // Update reference from progress
    const updates = {
      status: progress.status || 'pending',
      completion_percentage: progress.completion_percentage || 0,
    };

    return updatePhaseDevPlanRef(roadmapName, planSlug, updates, cwd);
  } catch (e) {
    return {
      success: false,
      planRef: null,
      error: `Failed to sync plan reference: ${e.message}`,
    };
  }
}
