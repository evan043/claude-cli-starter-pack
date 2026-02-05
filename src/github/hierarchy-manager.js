/**
 * GitHub Hierarchy Manager
 *
 * Manages adoption of orphan roadmaps and phase-dev-plans into parent hierarchies.
 * Supports late-stage integration of standalone items into epic/roadmap structures.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getGitHubConfig, createGitHubIssue } from './issue-hierarchy-manager.js';
import { addIssueComment, updateIssueBody, getIssue } from './client.js';

/**
 * Adopt an orphan roadmap into an epic
 *
 * @param {string} roadmapSlug - Slug of roadmap to adopt
 * @param {string} epicSlug - Slug of parent epic
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, updates: Object, error?: string }
 */
export async function adoptRoadmapToEpic(roadmapSlug, epicSlug, projectRoot) {
  try {
    // Load roadmap
    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
    if (!fs.existsSync(roadmapPath)) {
      return {
        success: false,
        error: `Roadmap not found: ${roadmapPath}`,
      };
    }

    const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

    // Check if already has a parent
    if (roadmap.parent_epic) {
      return {
        success: false,
        error: `Roadmap already has parent epic: ${roadmap.parent_epic.epic_slug}`,
      };
    }

    // Load epic
    const epicPath = path.join(projectRoot, '.claude', 'epics', epicSlug, 'EPIC.json');
    if (!fs.existsSync(epicPath)) {
      return {
        success: false,
        error: `Epic not found: ${epicPath}`,
      };
    }

    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

    // Update roadmap with parent epic reference
    roadmap.parent_epic = {
      epic_id: epic.epic_id,
      epic_slug: epicSlug,
      epic_path: `.claude/epics/${epicSlug}/EPIC.json`,
    };
    roadmap.updated = new Date().toISOString();

    // Save updated roadmap
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

    // Update epic with new roadmap reference
    if (!epic.roadmaps) {
      epic.roadmaps = [];
    }

    const roadmapRef = {
      roadmap_id: roadmap.roadmap_id,
      slug: roadmapSlug,
      title: roadmap.title,
      status: roadmap.status || 'planning',
      completion_percentage: roadmap.metadata?.overall_completion_percentage || 0,
      created: roadmap.created,
      updated: roadmap.updated,
    };

    epic.roadmaps.push(roadmapRef);
    epic.updated = new Date().toISOString();

    // Recalculate epic completion
    epic.completion_percentage = calculateEpicCompletion(epic);

    // Save updated epic
    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

    // Update GitHub issues if they exist
    const githubUpdates = await updateGitHubIssuesForAdoption(
      projectRoot,
      'roadmap',
      roadmapSlug,
      roadmap,
      epicSlug,
      epic
    );

    console.log(chalk.green(`✅ Adopted roadmap "${roadmap.title}" into epic "${epic.title}"`));

    return {
      success: true,
      updates: {
        roadmap: {
          slug: roadmapSlug,
          parent_epic: roadmap.parent_epic,
        },
        epic: {
          slug: epicSlug,
          roadmap_count: epic.roadmaps.length,
          completion: epic.completion_percentage,
        },
        github: githubUpdates,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Adopt an orphan phase-dev-plan into a roadmap
 *
 * @param {string} planSlug - Slug of plan to adopt
 * @param {string} roadmapSlug - Slug of parent roadmap
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, updates: Object, error?: string }
 */
export async function adoptPlanToRoadmap(planSlug, roadmapSlug, projectRoot) {
  try {
    // Load plan progress
    const progressPath = path.join(projectRoot, '.claude', 'phase-plans', planSlug, 'PROGRESS.json');
    if (!fs.existsSync(progressPath)) {
      return {
        success: false,
        error: `Plan not found: ${progressPath}`,
      };
    }

    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Check if already has a parent
    if (progress.parent_context) {
      return {
        success: false,
        error: `Plan already has parent: ${progress.parent_context.type} - ${progress.parent_context.slug}`,
      };
    }

    // Load roadmap
    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
    if (!fs.existsSync(roadmapPath)) {
      return {
        success: false,
        error: `Roadmap not found: ${roadmapPath}`,
      };
    }

    const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

    // Update plan with parent context
    progress.parent_context = {
      type: 'roadmap',
      slug: roadmapSlug,
      title: roadmap.title,
      path: `.claude/roadmaps/${roadmapSlug}/ROADMAP.json`,
    };
    progress.project.lastUpdated = new Date().toISOString();

    // Save updated progress
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

    // Update roadmap with new plan reference
    if (!roadmap.phase_dev_plan_refs) {
      roadmap.phase_dev_plan_refs = [];
    }

    // Calculate plan completion
    const totalTasks = progress.phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const completedTasks = progress.phases.reduce(
      (sum, p) => sum + (p.tasks?.filter(t => t.completed || t.status === 'completed').length || 0),
      0
    );
    const planCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const planRef = {
      slug: planSlug,
      path: `.claude/phase-plans/${planSlug}/PROGRESS.json`,
      title: progress.project?.name || planSlug,
      status: progress.status || 'pending',
      completion_percentage: planCompletion,
      created: progress.project?.created || new Date().toISOString(),
      updated: progress.project?.lastUpdated || new Date().toISOString(),
    };

    roadmap.phase_dev_plan_refs.push(planRef);
    roadmap.updated = new Date().toISOString();

    // Recalculate roadmap completion
    roadmap.metadata = roadmap.metadata || {};
    roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
    roadmap.metadata.overall_completion_percentage = calculateRoadmapCompletion(roadmap);

    // Save updated roadmap
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

    // Update GitHub issues if they exist
    const githubUpdates = await updateGitHubIssuesForAdoption(
      projectRoot,
      'plan',
      planSlug,
      progress,
      roadmapSlug,
      roadmap
    );

    console.log(chalk.green(`✅ Adopted plan "${progress.project?.name}" into roadmap "${roadmap.title}"`));

    return {
      success: true,
      updates: {
        plan: {
          slug: planSlug,
          parent_context: progress.parent_context,
        },
        roadmap: {
          slug: roadmapSlug,
          plan_count: roadmap.phase_dev_plan_refs.length,
          completion: roadmap.metadata.overall_completion_percentage,
        },
        github: githubUpdates,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List all orphan roadmaps (roadmaps without parent_epic)
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of orphan roadmap objects
 */
export function listOrphanRoadmaps(projectRoot) {
  const roadmapsDir = path.join(projectRoot, '.claude', 'roadmaps');

  if (!fs.existsSync(roadmapsDir)) {
    return [];
  }

  const orphans = [];

  try {
    const entries = fs.readdirSync(roadmapsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const roadmapPath = path.join(roadmapsDir, entry.name, 'ROADMAP.json');
        if (fs.existsSync(roadmapPath)) {
          try {
            const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

            // Check if orphan (no parent_epic or parent_epic is null/empty)
            if (!roadmap.parent_epic || !roadmap.parent_epic.epic_slug) {
              orphans.push({
                slug: roadmap.slug || entry.name,
                title: roadmap.title,
                status: roadmap.status,
                plan_count: roadmap.phase_dev_plan_refs?.length || 0,
                completion: roadmap.metadata?.overall_completion_percentage || 0,
                created: roadmap.created,
                updated: roadmap.updated,
                _path: roadmapPath,
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (e) {
    // Directory read error
  }

  return orphans;
}

/**
 * List all orphan phase-dev-plans (plans without parent_context)
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Array} Array of orphan plan objects
 */
export function listOrphanPlans(projectRoot) {
  const plansDir = path.join(projectRoot, '.claude', 'phase-plans');

  if (!fs.existsSync(plansDir)) {
    return [];
  }

  const orphans = [];

  try {
    const entries = fs.readdirSync(plansDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const progressPath = path.join(plansDir, entry.name, 'PROGRESS.json');
        if (fs.existsSync(progressPath)) {
          try {
            const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

            // Check if orphan (no parent_context or parent_context is null)
            if (!progress.parent_context || progress.parent_context === null) {
              // Calculate completion
              const totalTasks = progress.phases?.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) || 0;
              const completedTasks = progress.phases?.reduce(
                (sum, p) => sum + (p.tasks?.filter(t => t.completed || t.status === 'completed').length || 0),
                0
              ) || 0;
              const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              orphans.push({
                slug: progress.plan_id || entry.name,
                title: progress.project?.name || entry.name,
                status: progress.status || 'pending',
                scale: progress.scale,
                phase_count: progress.phases?.length || 0,
                completion: completion,
                created: progress.project?.created,
                updated: progress.project?.lastUpdated,
                _path: progressPath,
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (e) {
    // Directory read error
  }

  return orphans;
}

/**
 * Calculate epic completion percentage
 */
function calculateEpicCompletion(epic) {
  if (!epic.roadmaps || epic.roadmaps.length === 0) {
    return 0;
  }

  const totalCompletion = epic.roadmaps.reduce(
    (sum, roadmap) => sum + (roadmap.completion_percentage || 0),
    0
  );

  return Math.round(totalCompletion / epic.roadmaps.length);
}

/**
 * Calculate roadmap completion percentage
 */
function calculateRoadmapCompletion(roadmap) {
  if (!roadmap.phase_dev_plan_refs || roadmap.phase_dev_plan_refs.length === 0) {
    return 0;
  }

  const totalCompletion = roadmap.phase_dev_plan_refs.reduce(
    (sum, plan) => sum + (plan.completion_percentage || 0),
    0
  );

  return Math.round(totalCompletion / roadmap.phase_dev_plan_refs.length);
}

/**
 * Update GitHub issues after adoption
 */
async function updateGitHubIssuesForAdoption(projectRoot, itemType, itemSlug, itemData, parentSlug, parentData) {
  const githubConfig = getGitHubConfig(projectRoot);
  if (!githubConfig) {
    return { updated: false, reason: 'GitHub not configured' };
  }

  const { owner, repo } = githubConfig;
  const updates = {
    item_updated: false,
    parent_updated: false,
    errors: [],
  };

  try {
    // Update item issue (roadmap or plan)
    const itemIssueNumber = itemType === 'roadmap'
      ? itemData.metadata?.github_epic_number
      : itemData.github_issue;

    if (itemIssueNumber) {
      try {
        // Get current issue
        const issue = getIssue(owner, repo, itemIssueNumber);
        if (issue) {
          // Add adoption comment
          const parentType = itemType === 'roadmap' ? 'epic' : 'roadmap';
          const parentIssueNumber = itemType === 'roadmap'
            ? parentData.github_epic_number
            : parentData.metadata?.github_epic_number;

          let comment = `## 🔗 Adopted into ${parentType.charAt(0).toUpperCase() + parentType.slice(1)}\n\n`;
          comment += `This ${itemType} has been adopted into ${parentType}: **${parentData.title}**\n\n`;

          if (parentIssueNumber) {
            comment += `**Parent Issue:** #${parentIssueNumber}\n`;
            comment += `**Hierarchy:** [${parentType.charAt(0).toUpperCase() + parentType.slice(1)} #${parentIssueNumber}](https://github.com/${owner}/${repo}/issues/${parentIssueNumber})`;
            comment += ` > This ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}\n`;
          }

          comment += `\n---\n_Posted by CCASP Hierarchy Manager_`;

          addIssueComment(owner, repo, itemIssueNumber, comment);
          updates.item_updated = true;
        }
      } catch (error) {
        updates.errors.push(`Failed to update ${itemType} issue: ${error.message}`);
      }
    }

    // Update parent issue
    const parentIssueNumber = itemType === 'roadmap'
      ? parentData.github_epic_number
      : parentData.metadata?.github_epic_number;

    if (parentIssueNumber) {
      try {
        let comment = `## ✨ New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Adopted\n\n`;
        comment += `Added ${itemType}: **${itemData.title || itemSlug}**\n\n`;

        if (itemIssueNumber) {
          comment += `**Issue:** #${itemIssueNumber}\n`;
        }

        if (itemType === 'plan') {
          comment += `**Status:** ${itemData.status || 'pending'}\n`;
          const totalTasks = itemData.phases?.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) || 0;
          const completedTasks = itemData.phases?.reduce(
            (sum, p) => sum + (p.tasks?.filter(t => t.completed || t.status === 'completed').length || 0),
            0
          ) || 0;
          comment += `**Tasks:** ${completedTasks}/${totalTasks}\n`;
        } else if (itemType === 'roadmap') {
          comment += `**Plans:** ${itemData.phase_dev_plan_refs?.length || 0}\n`;
          comment += `**Completion:** ${itemData.metadata?.overall_completion_percentage || 0}%\n`;
        }

        comment += `\n---\n_Posted by CCASP Hierarchy Manager_`;

        addIssueComment(owner, repo, parentIssueNumber, comment);
        updates.parent_updated = true;
      } catch (error) {
        updates.errors.push(`Failed to update parent issue: ${error.message}`);
      }
    }
  } catch (error) {
    updates.errors.push(`GitHub update error: ${error.message}`);
  }

  return updates;
}

export default {
  adoptRoadmapToEpic,
  adoptPlanToRoadmap,
  listOrphanRoadmaps,
  listOrphanPlans,
};
