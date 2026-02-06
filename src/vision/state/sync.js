/**
 * Vision State Synchronization
 *
 * Handles progress propagation up the hierarchy:
 * PROGRESS → ROADMAP → EPIC → VISION
 * Event-driven synchronization system.
 */

import fs from 'fs';
import path from 'path';
import { getVisionPath } from './store.js';
import { VisionStatus } from '../schema.js';

/**
 * Sync progress up the hierarchy: PROGRESS → ROADMAP → EPIC → VISION
 * This is the EVENT-DRIVEN progress propagation system
 * @param {string} projectRoot - Project root directory
 * @param {string} planSlug - Phase-dev-plan slug that was updated
 * @returns {Object} Sync result with updates made at each level
 */
export async function syncProgressHierarchy(projectRoot, planSlug) {
  const result = {
    success: true,
    updates: {
      plan: null,
      roadmap: null,
      epic: null,
      vision: null
    }
  };

  try {
    // Step 1: Load the updated PROGRESS.json
    const planDir = path.join(projectRoot, '.claude', 'phase-plans', planSlug);
    const progressPath = path.join(planDir, 'PROGRESS.json');

    if (!fs.existsSync(progressPath)) {
      return { success: false, error: `Plan not found: ${planSlug}` };
    }

    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    result.updates.plan = {
      slug: planSlug,
      completion: progress.completion_percentage
    };

    // Step 2: Find and update parent ROADMAP
    if (progress.parent_context?.type === 'roadmap' && progress.parent_context?.path) {
      const roadmapPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(roadmapPath)) {
        const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

        // Update the plan reference in roadmap
        const planRef = roadmap.phase_dev_plan_refs?.find(p => p.slug === planSlug);
        if (planRef) {
          planRef.completion_percentage = progress.completion_percentage;
          planRef.status = progress.status;
        }

        // Recalculate roadmap completion from all plans
        if (roadmap.phase_dev_plan_refs?.length > 0) {
          const totalCompletion = roadmap.phase_dev_plan_refs.reduce(
            (sum, p) => sum + (p.completion_percentage || 0),
            0
          );
          roadmap.completion_percentage = Math.round(totalCompletion / roadmap.phase_dev_plan_refs.length);

          // Check if all plans complete
          const allComplete = roadmap.phase_dev_plan_refs.every(p => p.completion_percentage === 100);
          if (allComplete) {
            roadmap.status = 'completed';
          } else if (roadmap.phase_dev_plan_refs.some(p => (p.completion_percentage || 0) > 0)) {
            roadmap.status = 'in_progress';
          }
        }

        roadmap.metadata = roadmap.metadata || {};
        roadmap.metadata.updated = new Date().toISOString();

        fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

        result.updates.roadmap = {
          slug: roadmap.slug,
          completion: roadmap.completion_percentage,
          status: roadmap.status
        };

        // Step 3: Find and update parent EPIC
        if (roadmap.parent_epic?.epic_path) {
          const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
            ? roadmap.parent_epic.epic_path
            : path.join(projectRoot, roadmap.parent_epic.epic_path);

          if (fs.existsSync(epicPath)) {
            const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

            // Update the roadmap reference in epic
            const roadmapRef = epic.roadmaps?.find(r => r.path === roadmap.parent_epic?.path || r.roadmap_id === roadmap.slug);
            if (roadmapRef) {
              roadmapRef.completion_percentage = roadmap.completion_percentage;
              roadmapRef.status = roadmap.status;
            }

            // Recalculate epic completion from all roadmaps
            if (epic.roadmaps?.length > 0) {
              const totalCompletion = epic.roadmaps.reduce(
                (sum, r) => sum + (r.completion_percentage || 0),
                0
              );
              epic.completion_percentage = Math.round(totalCompletion / epic.roadmaps.length);

              // Check if all roadmaps complete
              const allComplete = epic.roadmaps.every(r => r.completion_percentage === 100);
              if (allComplete) {
                epic.status = 'completed';
              } else if (epic.roadmaps.some(r => (r.completion_percentage || 0) > 0)) {
                epic.status = 'in_progress';
              }
            }

            epic.updated = new Date().toISOString();

            fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

            result.updates.epic = {
              slug: epic.slug,
              completion: epic.completion_percentage,
              status: epic.status
            };

            // Step 4: Find and update parent VISION
            const visionSlug = epic.metadata?.vision_slug || progress.metadata?.vision_slug;
            if (visionSlug) {
              const visionPath = getVisionPath(projectRoot, visionSlug);

              if (fs.existsSync(visionPath)) {
                const vision = JSON.parse(fs.readFileSync(visionPath, 'utf8'));

                // Update vision completion from epic
                vision.metadata = vision.metadata || {};
                vision.metadata.completion_percentage = epic.completion_percentage;
                vision.metadata.updated = new Date().toISOString();

                // Update planning section if it exists
                if (vision.planning) {
                  vision.planning.epic_completion = epic.completion_percentage;
                  vision.planning.last_sync = new Date().toISOString();
                }

                // Update status if all complete
                if (epic.status === 'completed') {
                  vision.status = VisionStatus.COMPLETED;
                } else if (epic.status === 'in_progress') {
                  vision.status = VisionStatus.EXECUTING;
                }

                fs.writeFileSync(visionPath, JSON.stringify(vision, null, 2), 'utf8');

                result.updates.vision = {
                  slug: visionSlug,
                  completion: epic.completion_percentage,
                  status: vision.status
                };
              }
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      updates: result.updates
    };
  }
}

/**
 * Mark a task as complete and trigger hierarchy sync
 * @param {string} projectRoot - Project root directory
 * @param {string} planSlug - Phase-dev-plan slug
 * @param {number} phaseId - Phase ID
 * @param {number} taskId - Task ID
 * @returns {Object} Result with updated completion percentages
 */
export async function completeTaskAndSync(projectRoot, planSlug, phaseId, taskId) {
  const planDir = path.join(projectRoot, '.claude', 'phase-plans', planSlug);
  const progressPath = path.join(planDir, 'PROGRESS.json');

  if (!fs.existsSync(progressPath)) {
    return { success: false, error: `Plan not found: ${planSlug}` };
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Find and update the task
    const phase = progress.phases?.find(p => p.id === phaseId);
    if (!phase) {
      return { success: false, error: `Phase not found: ${phaseId}` };
    }

    const task = phase.tasks?.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: `Task not found: ${taskId}` };
    }

    // Mark task complete
    task.completed = true;
    task.status = 'completed';
    task.completed_at = new Date().toISOString();

    // Recalculate phase completion
    const totalTasks = phase.tasks?.length || 0;
    const completedTasks = phase.tasks?.filter(t => t.completed || t.status === 'completed').length || 0;
    phase.completion_percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    if (completedTasks === totalTasks) {
      phase.status = 'completed';
    } else if (completedTasks > 0) {
      phase.status = 'in_progress';
    }

    // Recalculate overall plan completion
    const totalPhases = progress.phases?.length || 0;
    const totalPhaseCompletion = progress.phases?.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) || 0;
    progress.completion_percentage = totalPhases > 0 ? Math.round(totalPhaseCompletion / totalPhases) : 0;

    // Update plan status
    const allPhasesComplete = progress.phases?.every(p => p.status === 'completed');
    if (allPhasesComplete) {
      progress.status = 'completed';
    } else if (progress.phases?.some(p => p.status === 'in_progress')) {
      progress.status = 'in_progress';
    }

    progress.metadata = progress.metadata || {};
    progress.metadata.updated = new Date().toISOString();

    // Save updated progress
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

    // Sync up the hierarchy
    const syncResult = await syncProgressHierarchy(projectRoot, planSlug);

    return {
      success: true,
      task: { phaseId, taskId, completed: true },
      phase: { id: phaseId, completion: phase.completion_percentage, status: phase.status },
      plan: { slug: planSlug, completion: progress.completion_percentage, status: progress.status },
      hierarchySync: syncResult
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
