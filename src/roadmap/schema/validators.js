/**
 * Roadmap Validation Functions
 *
 * Functions for validating roadmap structures and detecting issues.
 */

import { ROADMAP_SOURCE, PHASE_STATUS } from './constants.js';

/**
 * Validate a roadmap object
 *
 * @param {Object} roadmap - Roadmap to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateRoadmap(roadmap) {
  const errors = [];

  // Required fields
  if (!roadmap.roadmap_id) {
    errors.push('Missing required field: roadmap_id');
  }
  if (!roadmap.title || roadmap.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (!roadmap.source || !Object.values(ROADMAP_SOURCE).includes(roadmap.source)) {
    errors.push(`Invalid source: ${roadmap.source}. Must be one of: ${Object.values(ROADMAP_SOURCE).join(', ')}`);
  }

  // Validate phases
  if (roadmap.phases && Array.isArray(roadmap.phases)) {
    const phaseIds = new Set();
    for (const phase of roadmap.phases) {
      const phaseValidation = validatePhase(phase, phaseIds);
      errors.push(...phaseValidation.errors);
      if (phase.phase_id) {
        phaseIds.add(phase.phase_id);
      }
    }

    // Check for dependency cycles
    const cycleCheck = detectDependencyCycles(roadmap.phases);
    if (cycleCheck.hasCycle) {
      errors.push(`Circular dependency detected: ${cycleCheck.cycle.join(' -> ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a phase object
 *
 * @param {Object} phase - Phase to validate
 * @param {Set} existingIds - Set of existing phase IDs (for dependency validation)
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validatePhase(phase, existingIds = new Set()) {
  const errors = [];

  if (!phase.phase_id) {
    errors.push('Phase missing required field: phase_id');
  }
  if (!phase.phase_title || phase.phase_title.trim() === '') {
    errors.push(`Phase ${phase.phase_id || '?'}: missing required field: phase_title`);
  }
  if (phase.complexity && !['S', 'M', 'L'].includes(phase.complexity)) {
    errors.push(`Phase ${phase.phase_id || '?'}: invalid complexity ${phase.complexity}. Must be S, M, or L`);
  }
  if (phase.status && !Object.keys(PHASE_STATUS).includes(phase.status)) {
    errors.push(`Phase ${phase.phase_id || '?'}: invalid status ${phase.status}`);
  }

  // Validate dependencies reference existing phases
  if (phase.dependencies && Array.isArray(phase.dependencies)) {
    for (const depId of phase.dependencies) {
      if (!existingIds.has(depId)) {
        // This is a forward reference - might be valid if phase appears later
        // We'll handle this at the roadmap level
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a multi-project roadmap
 * @param {Object} roadmap - Roadmap to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateMultiProjectRoadmap(roadmap) {
  const errors = [];

  // Basic validation
  if (!roadmap.roadmap_id) {
    errors.push('Missing required field: roadmap_id');
  }
  if (!roadmap.title || roadmap.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (roadmap.decomposition_type !== 'projects') {
    errors.push('decomposition_type must be "projects" for multi-project roadmaps');
  }

  // Validate projects
  if (roadmap.projects && Array.isArray(roadmap.projects)) {
    const projectIds = new Set();

    for (const project of roadmap.projects) {
      if (!project.project_id) {
        errors.push('Project missing required field: project_id');
      } else if (projectIds.has(project.project_id)) {
        errors.push(`Duplicate project_id: ${project.project_id}`);
      } else {
        projectIds.add(project.project_id);
      }

      if (!project.project_title || project.project_title.trim() === '') {
        errors.push(`Project ${project.project_id || '?'}: missing project_title`);
      }

      // Validate project phases
      if (project.phases && Array.isArray(project.phases)) {
        for (const phase of project.phases) {
          if (!phase.name) {
            errors.push(`Project ${project.project_id}: phase missing name`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detect dependency cycles in phases
 *
 * @param {Array} phases - Array of phases
 * @returns {Object} { hasCycle: boolean, cycle: string[] }
 */
export function detectDependencyCycles(phases) {
  const graph = new Map();

  // Build adjacency list
  for (const phase of phases) {
    graph.set(phase.phase_id, phase.dependencies || []);
  }

  const visited = new Set();
  const recursionStack = new Set();
  const cyclePath = [];

  function hasCycleDFS(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor, path)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cyclePath.push(...path.slice(cycleStart), neighbor);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  for (const phase of phases) {
    if (!visited.has(phase.phase_id)) {
      if (hasCycleDFS(phase.phase_id, [])) {
        return { hasCycle: true, cycle: cyclePath };
      }
    }
  }

  return { hasCycle: false, cycle: [] };
}

/**
 * Check if a plan's dependencies are satisfied
 *
 * @param {Object} roadmap - Roadmap object
 * @param {string} planSlug - Slug of plan to check
 * @returns {Object} { satisfied: boolean, missing: string[] }
 */
export function checkPlanDependencies(roadmap, planSlug) {
  if (!roadmap.cross_plan_dependencies || roadmap.cross_plan_dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const dependencies = roadmap.cross_plan_dependencies.filter(
    dep => dep.dependent_slug === planSlug
  );

  if (dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const missing = [];

  for (const dep of dependencies) {
    const dependsOnPlan = roadmap.phase_dev_plan_refs?.find(ref => ref.slug === dep.depends_on_slug);
    if (!dependsOnPlan || dependsOnPlan.status !== 'completed') {
      missing.push(dep.depends_on_slug);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}
