/**
 * Phase Plan Tracking
 *
 * Loading, updating, task completion, and progress tracking for phase plans.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadRoadmap } from '../roadmap-manager.js';
import { getPhasePlansDir } from './generator.js';

/**
 * Load a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Phase plan or null
 */
export function loadPhasePlan(roadmapSlug, phaseId, cwd = process.cwd()) {
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  if (!existsSync(planPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(planPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Update a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {Object} updates - Updates to apply
 * @param {string} cwd - Current working directory
 * @returns {Object} Update result
 */
export function updatePhasePlan(roadmapSlug, phaseId, updates, cwd = process.cwd()) {
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);

  if (!plan) {
    return {
      success: false,
      error: `Phase plan not found: ${roadmapSlug}/${phaseId}`,
    };
  }

  // Apply updates
  Object.assign(plan, updates);
  plan.updated_at = new Date().toISOString();

  // Recalculate metrics if phases updated
  if (updates.phases) {
    const allTasks = plan.phases.flatMap(p => p.tasks || []);
    plan.metrics.totalTasks = allTasks.length;
    plan.metrics.completedTasks = allTasks.filter(t => t.completed).length;
  }

  // Save
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  try {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    return { success: true, plan };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Mark a task as completed in a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {string} taskId - Task ID (e.g., "1.2")
 * @param {string} cwd - Current working directory
 * @returns {Object} Update result
 */
export function completeTask(roadmapSlug, phaseId, taskId, cwd = process.cwd()) {
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);

  if (!plan) {
    return {
      success: false,
      error: `Phase plan not found: ${roadmapSlug}/${phaseId}`,
    };
  }

  // Find and update task
  let found = false;
  for (const phase of plan.phases) {
    const task = (phase.tasks || []).find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      found = true;
      break;
    }
  }

  if (!found) {
    return {
      success: false,
      error: `Task not found: ${taskId}`,
    };
  }

  // Update metrics
  const allTasks = plan.phases.flatMap(p => p.tasks || []);
  plan.metrics.completedTasks = allTasks.filter(t => t.completed).length;
  plan.updated_at = new Date().toISOString();

  // Check if plan is complete
  if (plan.metrics.completedTasks === plan.metrics.totalTasks) {
    plan.completed_at = new Date().toISOString();
  }

  // Save
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  try {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    return {
      success: true,
      plan,
      isComplete: plan.completed_at !== null,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get progress summary for all phases in a roadmap
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Progress summary
 */
export function getRoadmapProgress(roadmapSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return null;
  }

  const phases = [];
  let totalTasks = 0;
  let completedTasks = 0;

  for (const phase of roadmap.phases || []) {
    const plan = loadPhasePlan(roadmapSlug, phase.phase_id, cwd);

    if (plan) {
      totalTasks += plan.metrics.totalTasks || 0;
      completedTasks += plan.metrics.completedTasks || 0;

      phases.push({
        phase_id: phase.phase_id,
        title: phase.phase_title,
        status: phase.status,
        tasks: plan.metrics.totalTasks || 0,
        completed: plan.metrics.completedTasks || 0,
        percentage: plan.metrics.totalTasks > 0
          ? Math.round((plan.metrics.completedTasks / plan.metrics.totalTasks) * 100)
          : 0,
      });
    } else {
      phases.push({
        phase_id: phase.phase_id,
        title: phase.phase_title,
        status: phase.status,
        tasks: 0,
        completed: 0,
        percentage: 0,
        noPlan: true,
      });
    }
  }

  return {
    roadmap_id: roadmap.roadmap_id,
    title: roadmap.title,
    slug: roadmap.slug,
    phases,
    totalTasks,
    completedTasks,
    overallPercentage: totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0,
  };
}
