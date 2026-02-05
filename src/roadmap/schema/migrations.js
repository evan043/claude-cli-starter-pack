/**
 * Roadmap Migration Functions
 *
 * Functions for migrating between schema versions.
 */

import { generateSlug } from './generators.js';
import { createPlanReference } from './generators.js';
import { addCrossPlanDependency } from './mutations.js';
import { calculateOverallCompletion } from './calculators.js';

/**
 * Migrate legacy roadmap format to new epic-hierarchy format
 *
 * Converts direct phase tracking to phase-dev-plan references.
 * This is a one-way migration for backwards compatibility.
 *
 * @param {Object} roadmap - Legacy roadmap object
 * @returns {Object} Migrated roadmap
 */
export function migrateLegacyRoadmap(roadmap) {
  // Check if already migrated
  if (roadmap.phase_dev_plan_refs && roadmap.phase_dev_plan_refs.length > 0) {
    return roadmap; // Already in new format
  }

  // Check if has legacy phases
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return roadmap; // Nothing to migrate
  }

  console.log(`Migrating legacy roadmap: ${roadmap.title}`);

  // Initialize new fields
  roadmap.phase_dev_plan_refs = roadmap.phase_dev_plan_refs || [];
  roadmap.cross_plan_dependencies = roadmap.cross_plan_dependencies || [];

  // Convert each phase to a phase-dev-plan reference
  for (const phase of roadmap.phases) {
    const planSlug = generateSlug(phase.phase_title);
    const planRef = createPlanReference({
      slug: planSlug,
      title: phase.phase_title,
      status: phase.status,
      completion_percentage: phase.metadata?.completed_tasks && phase.metadata?.total_tasks
        ? Math.round((phase.metadata.completed_tasks / phase.metadata.total_tasks) * 100)
        : 0,
    });

    roadmap.phase_dev_plan_refs.push(planRef);

    // Convert phase dependencies to cross-plan dependencies
    if (phase.dependencies && phase.dependencies.length > 0) {
      for (const depPhaseId of phase.dependencies) {
        const depPhase = roadmap.phases.find(p => p.phase_id === depPhaseId);
        if (depPhase) {
          const depSlug = generateSlug(depPhase.phase_title);
          addCrossPlanDependency(roadmap, planSlug, depSlug, 'Migrated from phase dependency');
        }
      }
    }
  }

  // Update metadata
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);

  // Keep legacy phases for reference, but mark as deprecated
  roadmap._legacy_phases_deprecated = true;

  return roadmap;
}
