/**
 * Issue Hierarchy Orchestration
 */

import fs from 'fs';
import path from 'path';
import { getGitHubConfig } from './config.js';
import { ensureEpicIssue } from './epic.js';
import { ensureRoadmapIssue } from './roadmap.js';
import { ensurePlanIssue } from './plan.js';

/**
 * Ensure all parent issues exist when starting from a lower level
 *
 * This is the main entry point for auto-creating parent issues.
 */
export async function ensureHierarchyIssues(projectRoot, level, slug) {
  const githubConfig = getGitHubConfig(projectRoot);
  if (!githubConfig) {
    return { success: false, error: 'GitHub not configured' };
  }

  const results = {
    epic: null,
    roadmap: null,
    plan: null,
    created: [],
  };

  if (level === 'plan') {
    // Load plan progress
    const progressPath = path.join(projectRoot, '.claude', 'phase-plans', slug, 'PROGRESS.json');
    if (!fs.existsSync(progressPath)) {
      return { success: false, error: `Plan not found: ${slug}` };
    }

    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Check for parent roadmap
    let roadmapContext = null;
    let epicContext = null;

    if (progress.parent_context?.type === 'roadmap') {
      const roadmapPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(roadmapPath)) {
        const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
        const roadmapSlug = roadmap.slug;

        // Ensure roadmap issue exists
        const roadmapResult = await ensureRoadmapIssue(projectRoot, roadmapSlug, roadmap, githubConfig);
        if (roadmapResult.success) {
          results.roadmap = roadmapResult;
          if (roadmapResult.created) {
            results.created.push(`Roadmap #${roadmapResult.issueNumber}`);
          }
          roadmapContext = {
            slug: roadmapSlug,
            github_issue: roadmapResult.issueNumber,
          };
        }

        // Check for parent epic
        if (roadmap.parent_epic) {
          const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
            ? roadmap.parent_epic.epic_path
            : path.join(projectRoot, roadmap.parent_epic.epic_path);

          if (fs.existsSync(epicPath)) {
            const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
            const epicSlug = epic.slug;

            // Ensure epic issue exists
            const epicResult = await ensureEpicIssue(projectRoot, epicSlug, epic, githubConfig);
            if (epicResult.success) {
              results.epic = epicResult;
              if (epicResult.created) {
                results.created.push(`Epic #${epicResult.issueNumber}`);
              }
              epicContext = {
                slug: epicSlug,
                github_issue: epicResult.issueNumber,
              };
            }
          }
        }
      }
    } else if (progress.parent_context?.type === 'epic') {
      const epicPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(epicPath)) {
        const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
        const epicSlug = epic.slug;

        // Ensure epic issue exists
        const epicResult = await ensureEpicIssue(projectRoot, epicSlug, epic, githubConfig);
        if (epicResult.success) {
          results.epic = epicResult;
          if (epicResult.created) {
            results.created.push(`Epic #${epicResult.issueNumber}`);
          }
          epicContext = {
            slug: epicSlug,
            github_issue: epicResult.issueNumber,
          };
        }
      }
    }

    // Ensure plan issue exists
    const planResult = await ensurePlanIssue(projectRoot, slug, progress, githubConfig, roadmapContext, epicContext);
    if (planResult.success) {
      results.plan = planResult;
      if (planResult.created) {
        results.created.push(`Plan #${planResult.issueNumber}`);
      }
    }
  } else if (level === 'roadmap') {
    // Load roadmap
    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', slug, 'ROADMAP.json');
    if (!fs.existsSync(roadmapPath)) {
      return { success: false, error: `Roadmap not found: ${slug}` };
    }

    const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

    // Check for parent epic
    let epicContext = null;

    if (roadmap.parent_epic) {
      const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
        ? roadmap.parent_epic.epic_path
        : path.join(projectRoot, roadmap.parent_epic.epic_path);

      if (fs.existsSync(epicPath)) {
        const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
        const epicSlug = epic.slug;

        // Ensure epic issue exists
        const epicResult = await ensureEpicIssue(projectRoot, epicSlug, epic, githubConfig);
        if (epicResult.success) {
          results.epic = epicResult;
          if (epicResult.created) {
            results.created.push(`Epic #${epicResult.issueNumber}`);
          }
          epicContext = {
            slug: epicSlug,
            github_issue: epicResult.issueNumber,
          };
        }
      }
    }

    // Ensure roadmap issue exists
    const roadmapResult = await ensureRoadmapIssue(projectRoot, slug, roadmap, githubConfig, epicContext);
    if (roadmapResult.success) {
      results.roadmap = roadmapResult;
      if (roadmapResult.created) {
        results.created.push(`Roadmap #${roadmapResult.issueNumber}`);
      }
    }
  } else if (level === 'epic') {
    // Load epic
    const epicPath = path.join(projectRoot, '.claude', 'epics', slug, 'EPIC.json');
    if (!fs.existsSync(epicPath)) {
      return { success: false, error: `Epic not found: ${slug}` };
    }

    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

    // Ensure epic issue exists
    const epicResult = await ensureEpicIssue(projectRoot, slug, epic, githubConfig);
    if (epicResult.success) {
      results.epic = epicResult;
      if (epicResult.created) {
        results.created.push(`Epic #${epicResult.issueNumber}`);
      }
    }
  }

  results.success = true;
  return results;
}
