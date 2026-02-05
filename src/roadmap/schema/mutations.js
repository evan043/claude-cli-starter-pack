/**
 * Roadmap Mutation Functions
 *
 * Functions that modify roadmap state (adding, removing, updating).
 */

/**
 * Update roadmap metadata based on current state
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @returns {Object} Updated roadmap
 */
export function updateRoadmapMetadata(roadmap) {
  if (!roadmap.phases) {
    roadmap.phases = [];
  }

  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  const totalPhases = roadmap.phases.length;

  roadmap.metadata = roadmap.metadata || {};
  roadmap.metadata.total_phases = totalPhases;
  roadmap.metadata.completed_phases = completedPhases;
  roadmap.metadata.completion_percentage = totalPhases > 0
    ? Math.round((completedPhases / totalPhases) * 100)
    : 0;

  roadmap.updated = new Date().toISOString();

  // Update status based on phases
  if (totalPhases === 0) {
    roadmap.status = 'planning';
  } else if (completedPhases === totalPhases) {
    roadmap.status = 'completed';
  } else if (roadmap.phases.some(p => p.status === 'in_progress')) {
    roadmap.status = 'active';
  }

  return roadmap;
}

/**
 * Add a phase-dev-plan reference to a roadmap
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {Object} planRef - Plan reference to add
 * @returns {Object} Updated roadmap
 */
export function addPlanReference(roadmap, planRef) {
  if (!roadmap.phase_dev_plan_refs) {
    roadmap.phase_dev_plan_refs = [];
  }

  // Check for duplicate slug
  const existingIndex = roadmap.phase_dev_plan_refs.findIndex(ref => ref.slug === planRef.slug);
  if (existingIndex !== -1) {
    // Update existing reference
    roadmap.phase_dev_plan_refs[existingIndex] = planRef;
  } else {
    // Add new reference
    roadmap.phase_dev_plan_refs.push(planRef);
  }

  // Update metadata
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Remove a phase-dev-plan reference from a roadmap
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} planSlug - Slug of plan to remove
 * @returns {Object} Updated roadmap
 */
export function removePlanReference(roadmap, planSlug) {
  if (!roadmap.phase_dev_plan_refs) {
    return roadmap;
  }

  roadmap.phase_dev_plan_refs = roadmap.phase_dev_plan_refs.filter(ref => ref.slug !== planSlug);
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.updated = new Date().toISOString();

  // Remove related dependencies
  if (roadmap.cross_plan_dependencies) {
    roadmap.cross_plan_dependencies = roadmap.cross_plan_dependencies.filter(
      dep => dep.dependent_slug !== planSlug && dep.depends_on_slug !== planSlug
    );
  }

  return roadmap;
}

/**
 * Update a plan reference's completion status
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} planSlug - Slug of plan to update
 * @param {Object} updates - Fields to update (status, completion_percentage)
 * @returns {Object} Updated roadmap
 */
export function updatePlanReference(roadmap, planSlug, updates) {
  if (!roadmap.phase_dev_plan_refs) {
    roadmap.phase_dev_plan_refs = [];
  }

  const planIndex = roadmap.phase_dev_plan_refs.findIndex(ref => ref.slug === planSlug);
  if (planIndex === -1) {
    throw new Error(`Plan reference not found: ${planSlug}`);
  }

  const planRef = roadmap.phase_dev_plan_refs[planIndex];
  Object.assign(planRef, updates);
  planRef.updated = new Date().toISOString();

  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Add a cross-plan dependency
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} dependentSlug - Slug of plan that depends
 * @param {string} dependsOnSlug - Slug of plan it depends on
 * @param {string} reason - Reason for dependency
 * @returns {Object} Updated roadmap
 */
export function addCrossPlanDependency(roadmap, dependentSlug, dependsOnSlug, reason = '') {
  if (!roadmap.cross_plan_dependencies) {
    roadmap.cross_plan_dependencies = [];
  }

  // Check for duplicate
  const exists = roadmap.cross_plan_dependencies.some(
    dep => dep.dependent_slug === dependentSlug && dep.depends_on_slug === dependsOnSlug
  );

  if (!exists) {
    roadmap.cross_plan_dependencies.push({
      dependent_slug: dependentSlug,
      depends_on_slug: dependsOnSlug,
      reason,
    });
  }

  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Update multi-project roadmap metadata
 * @param {Object} roadmap - Roadmap object (mutated)
 * @returns {Object} Updated roadmap
 */
export function updateMultiProjectRoadmapMetadata(roadmap) {
  if (!roadmap.projects) {
    roadmap.projects = [];
  }

  const completedProjects = roadmap.projects.filter(p => p.status === 'completed').length;
  const totalProjects = roadmap.projects.length;

  roadmap.metadata = roadmap.metadata || {};
  roadmap.metadata.total_projects = totalProjects;
  roadmap.metadata.completed_projects = completedProjects;
  roadmap.metadata.completion_percentage = totalProjects > 0
    ? Math.round((completedProjects / totalProjects) * 100)
    : 0;

  roadmap.updated = new Date().toISOString();

  // Update status based on projects
  if (totalProjects === 0) {
    roadmap.status = 'planning';
  } else if (completedProjects === totalProjects) {
    roadmap.status = 'completed';
  } else if (roadmap.projects.some(p => p.status === 'in_progress')) {
    roadmap.status = 'active';
  } else if (roadmap.projects.some(p => p.status === 'discovering')) {
    roadmap.status = 'discovering';
  }

  return roadmap;
}
