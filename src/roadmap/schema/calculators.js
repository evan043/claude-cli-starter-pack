/**
 * Roadmap Calculators and Query Functions
 *
 * Functions for calculating completion, finding available phases, etc.
 */

/**
 * Calculate roadmap completion percentage
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletion(roadmap) {
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return 0;
  }

  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  return Math.round((completedPhases / roadmap.phases.length) * 100);
}

/**
 * Calculate overall completion from all plan references
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {number} Overall completion percentage (0-100)
 */
export function calculateOverallCompletion(roadmap) {
  if (!roadmap.phase_dev_plan_refs || roadmap.phase_dev_plan_refs.length === 0) {
    // Fallback to legacy phase-based calculation
    return calculateCompletion(roadmap);
  }

  const totalPlans = roadmap.phase_dev_plan_refs.length;
  const totalCompletion = roadmap.phase_dev_plan_refs.reduce(
    (sum, ref) => sum + (ref.completion_percentage || 0),
    0
  );

  return Math.round(totalCompletion / totalPlans);
}

/**
 * Calculate multi-project roadmap completion
 * @param {Object} roadmap - Multi-project roadmap
 * @returns {number} Completion percentage (0-100)
 */
export function calculateMultiProjectCompletion(roadmap) {
  if (!roadmap.projects || roadmap.projects.length === 0) {
    return 0;
  }

  const completedProjects = roadmap.projects.filter(p => p.status === 'completed').length;
  return Math.round((completedProjects / roadmap.projects.length) * 100);
}

/**
 * Get next available phases (no unmet dependencies)
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {Array} Array of phases that can be started
 */
export function getNextAvailablePhases(roadmap) {
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return [];
  }

  const completedIds = new Set(
    roadmap.phases
      .filter(p => p.status === 'completed')
      .map(p => p.phase_id)
  );

  return roadmap.phases.filter(phase => {
    // Already completed or in progress
    if (phase.status === 'completed' || phase.status === 'in_progress') {
      return false;
    }

    // Check all dependencies are completed
    const deps = phase.dependencies || [];
    return deps.every(depId => completedIds.has(depId));
  });
}

/**
 * Get next available projects (no unmet dependencies)
 * @param {Object} roadmap - Multi-project roadmap
 * @returns {Array} Array of projects that can be started
 */
export function getNextAvailableProjects(roadmap) {
  if (!roadmap.projects || roadmap.projects.length === 0) {
    return [];
  }

  // For now, return all pending projects with status 'ready'
  // In future, we could add inter-project dependencies
  return roadmap.projects.filter(project => {
    return project.status === 'ready' ||
           (project.status === 'pending' && roadmap.execution_config?.parallel_discovery);
  });
}
