/**
 * Phase-Dev Completion Reporting
 *
 * Handles reporting phase-dev completion to parent levels (roadmap/epic) and GitHub sync.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getGitHubConfig } from '../../github/issue-hierarchy-manager.js';
import { addIssueComment, closeIssue } from '../../github/client.js';
import {
  postPhaseDevCompletionSummary,
  postRoadmapCompletionSummary,
  postEpicCompletionSummary,
} from '../../github/completion-commenter.js';

/**
 * Report PHASE_DEV_COMPLETE to parent roadmap
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} phaseDevSlug - Phase-dev slug
 * @param {Object} completionMetrics - Completion metrics
 * @returns {Object} Report result
 */
export async function reportPhaseDevComplete(projectRoot, phaseDevSlug, completionMetrics = {}) {
  try {
    // Load PROGRESS.json
    const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');

    if (!fs.existsSync(progressPath)) {
      return {
        success: false,
        error: 'PROGRESS.json not found',
      };
    }

    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const parentContext = progress.parent_context;

    // If no parent, operate in standalone mode
    if (!parentContext) {
      return reportStandaloneComplete(projectRoot, phaseDevSlug, completionMetrics);
    }

    // Report to parent based on type
    if (parentContext.type === 'roadmap') {
      return await reportToRoadmap(projectRoot, parentContext, phaseDevSlug, completionMetrics);
    } else if (parentContext.type === 'epic') {
      return await reportToEpic(projectRoot, parentContext, phaseDevSlug, completionMetrics);
    }

    return {
      success: false,
      error: `Unknown parent type: ${parentContext.type}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Report completion in standalone mode (no parent)
 */
async function reportStandaloneComplete(projectRoot, phaseDevSlug, completionMetrics) {
  const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  // Update PROGRESS.json with completion
  progress.status = 'completed';
  progress.completed_at = new Date().toISOString();
  progress.completion_metrics = completionMetrics;

  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  console.log(chalk.green('\n✅ Phase-Dev completed (standalone mode)'));
  console.log(chalk.dim(`Metrics: ${JSON.stringify(completionMetrics, null, 2)}`));

  // Post completion comment to GitHub issue if configured
  await postPhaseDevCompletionToGitHub(projectRoot, phaseDevSlug, progress, completionMetrics);

  // Close phase-dev GitHub issue if it exists
  if (progress.github_issue) {
    await closePhaseDevGitHubIssue(projectRoot, progress.github_issue, completionMetrics);
  }

  return {
    success: true,
    mode: 'standalone',
    metrics: completionMetrics,
  };
}

/**
 * Report completion to parent roadmap
 */
async function reportToRoadmap(projectRoot, parentContext, phaseDevSlug, completionMetrics) {
  const roadmapPath = path.join(
    projectRoot,
    '.claude',
    'roadmaps',
    parentContext.slug,
    'ROADMAP.json'
  );

  if (!fs.existsSync(roadmapPath)) {
    return {
      success: false,
      error: `Parent roadmap not found: ${roadmapPath}`,
    };
  }

  // Load roadmap
  const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

  // Find the phase-dev entry in roadmap
  const phaseIndex = roadmap.phases.findIndex(p => p.phase_dev_slug === phaseDevSlug);

  if (phaseIndex === -1) {
    return {
      success: false,
      error: `Phase-dev ${phaseDevSlug} not found in roadmap`,
    };
  }

  // Update phase status
  roadmap.phases[phaseIndex].status = 'completed';
  roadmap.phases[phaseIndex].completed_at = new Date().toISOString();
  roadmap.phases[phaseIndex].completion_metrics = completionMetrics;

  // Calculate roadmap completion percentage
  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  roadmap.completion_percentage = Math.round((completedPhases / roadmap.phases.length) * 100);

  // Update last modified
  roadmap.updated = new Date().toISOString();

  // Save roadmap
  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

  console.log(chalk.green(`\n✅ Reported PHASE_DEV_COMPLETE to roadmap: ${parentContext.title}`));
  console.log(chalk.dim(`Roadmap completion: ${roadmap.completion_percentage}%`));

  // Post completion to GitHub
  const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  await postPhaseDevCompletionToGitHub(projectRoot, phaseDevSlug, progress, completionMetrics, parentContext);

  // Close phase-dev GitHub issue if it exists
  if (progress.github_issue) {
    await closePhaseDevGitHubIssue(projectRoot, progress.github_issue, completionMetrics);
  }

  // Update parent roadmap GitHub issue
  await updateRoadmapGitHubIssue(projectRoot, parentContext.slug, roadmap);

  // Trigger parent progress hook if configured
  if (roadmap.hooks?.progress_update) {
    await triggerProgressHook(projectRoot, roadmap, parentContext);
  }

  // If roadmap is complete, report to epic (if exists)
  if (roadmap.completion_percentage === 100 && roadmap.parent_epic) {
    await reportRoadmapCompleteToEpic(projectRoot, roadmap);
  }

  return {
    success: true,
    mode: 'roadmap',
    parent: parentContext,
    roadmap_completion: roadmap.completion_percentage,
    metrics: completionMetrics,
  };
}

/**
 * Report completion to parent epic
 */
async function reportToEpic(projectRoot, parentContext, phaseDevSlug, completionMetrics) {
  const epicPath = path.join(
    projectRoot,
    '.claude',
    'epics',
    parentContext.slug,
    'EPIC.json'
  );

  if (!fs.existsSync(epicPath)) {
    return {
      success: false,
      error: `Parent epic not found: ${epicPath}`,
    };
  }

  // Load epic
  const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

  // Find roadmap containing this phase-dev
  let roadmapIndex = -1;
  let phaseIndex = -1;

  for (let i = 0; i < epic.roadmaps.length; i++) {
    const roadmapSlug = epic.roadmaps[i].slug;
    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');

    if (fs.existsSync(roadmapPath)) {
      const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
      const pIdx = roadmap.phases.findIndex(p => p.phase_dev_slug === phaseDevSlug);

      if (pIdx !== -1) {
        roadmapIndex = i;
        phaseIndex = pIdx;
        break;
      }
    }
  }

  if (roadmapIndex === -1) {
    return {
      success: false,
      error: `Phase-dev ${phaseDevSlug} not found in any roadmap under epic`,
    };
  }

  // Update phase in roadmap
  const roadmapSlug = epic.roadmaps[roadmapIndex].slug;
  const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
  const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

  roadmap.phases[phaseIndex].status = 'completed';
  roadmap.phases[phaseIndex].completed_at = new Date().toISOString();
  roadmap.phases[phaseIndex].completion_metrics = completionMetrics;

  // Calculate roadmap completion
  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  roadmap.completion_percentage = Math.round((completedPhases / roadmap.phases.length) * 100);
  roadmap.updated = new Date().toISOString();

  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), 'utf8');

  // Update epic roadmap status
  epic.roadmaps[roadmapIndex].completion_percentage = roadmap.completion_percentage;
  if (roadmap.completion_percentage === 100) {
    epic.roadmaps[roadmapIndex].status = 'completed';
    epic.roadmaps[roadmapIndex].completed_at = new Date().toISOString();
  }

  // Calculate epic completion
  const totalRoadmaps = epic.roadmaps.length;
  const completedRoadmaps = epic.roadmaps.filter(r => r.status === 'completed').length;
  epic.completion_percentage = Math.round((completedRoadmaps / totalRoadmaps) * 100);
  epic.updated = new Date().toISOString();

  fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

  console.log(chalk.green(`\n✅ Reported PHASE_DEV_COMPLETE to epic: ${parentContext.title}`));
  console.log(chalk.dim(`Roadmap completion: ${roadmap.completion_percentage}%`));
  console.log(chalk.dim(`Epic completion: ${epic.completion_percentage}%`));

  // Post completion to GitHub
  const progressPath = path.join(projectRoot, '.claude', 'phase-dev', phaseDevSlug, 'PROGRESS.json');
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  await postPhaseDevCompletionToGitHub(projectRoot, phaseDevSlug, progress, completionMetrics, parentContext);

  // Close phase-dev GitHub issue if it exists
  if (progress.github_issue) {
    await closePhaseDevGitHubIssue(projectRoot, progress.github_issue, completionMetrics);
  }

  // Update parent epic GitHub issue (and close if complete)
  await updateEpicGitHubIssue(projectRoot, parentContext.slug, epic);

  return {
    success: true,
    mode: 'epic',
    parent: parentContext,
    roadmap_completion: roadmap.completion_percentage,
    epic_completion: epic.completion_percentage,
    metrics: completionMetrics,
  };
}

/**
 * Report roadmap complete to epic
 */
async function reportRoadmapCompleteToEpic(projectRoot, roadmap) {
  if (!roadmap.parent_epic) {
    return;
  }

  const epicPath = path.join(
    projectRoot,
    '.claude',
    'epics',
    roadmap.parent_epic.slug,
    'EPIC.json'
  );

  if (!fs.existsSync(epicPath)) {
    console.warn(chalk.yellow(`Warning: Parent epic not found: ${epicPath}`));
    return;
  }

  const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

  // Update roadmap status in epic
  const roadmapIndex = epic.roadmaps.findIndex(r => r.roadmap_id === roadmap.roadmap_id);
  if (roadmapIndex !== -1) {
    epic.roadmaps[roadmapIndex].status = 'completed';
    epic.roadmaps[roadmapIndex].completed_at = new Date().toISOString();
    epic.roadmaps[roadmapIndex].completion_percentage = 100;

    // Calculate epic completion
    const totalRoadmaps = epic.roadmaps.length;
    const completedRoadmaps = epic.roadmaps.filter(r => r.status === 'completed').length;
    epic.completion_percentage = Math.round((completedRoadmaps / totalRoadmaps) * 100);
    epic.updated = new Date().toISOString();

    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2), 'utf8');

    console.log(chalk.green(`\n✅ Reported ROADMAP_COMPLETE to epic: ${roadmap.parent_epic.title}`));
    console.log(chalk.dim(`Epic completion: ${epic.completion_percentage}%`));
  }
}

/**
 * Trigger progress hook if configured
 */
async function triggerProgressHook(projectRoot, roadmap, parentContext) {
  try {
    const hookPath = path.join(projectRoot, '.claude', 'hooks', 'tools', roadmap.hooks.progress_update);

    if (!fs.existsSync(hookPath)) {
      return;
    }

    console.log(chalk.dim(`Triggering progress hook: ${roadmap.hooks.progress_update}`));

    // Dynamic import of the hook
    const hook = await import(hookPath);

    if (hook.onProgressUpdate) {
      await hook.onProgressUpdate({
        roadmap,
        parentContext,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Failed to trigger progress hook: ${error.message}`));
  }
}

/**
 * Post phase-dev completion comment to GitHub issue
 */
async function postPhaseDevCompletionToGitHub(projectRoot, phaseDevSlug, progress, completionMetrics, parentContext = null) {
  try {
    // Use the dedicated completion commenter module
    const result = await postPhaseDevCompletionSummary(projectRoot, phaseDevSlug, completionMetrics);

    if (result.success) {
      console.log(chalk.green(`✓ Posted completion summary to GitHub issue #${result.issueNumber}`));
    } else {
      console.log(chalk.yellow(`⚠ ${result.error || 'Failed to post completion comment'}`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error posting to GitHub: ${error.message}`));
  }
}

/**
 * Update roadmap GitHub issue with phase completion
 */
async function updateRoadmapGitHubIssue(projectRoot, roadmapSlug, roadmap) {
  try {
    const issueNumber = roadmap.metadata?.github_epic_number;
    if (!issueNumber) return;

    // If roadmap is complete, post full completion summary and close
    if (roadmap.completion_percentage === 100) {
      await closeRoadmapGitHubIssue(projectRoot, roadmapSlug, issueNumber);
      return;
    }

    // Otherwise, post progress update
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) return;

    const { owner, repo } = githubConfig;

    const completedPhases = roadmap.phases?.filter(p => p.status === 'completed').length || 0;
    const totalPhases = roadmap.phases?.length || 0;

    let comment = `## 📊 Roadmap Progress Update\n\n`;
    comment += `**Completion:** ${roadmap.completion_percentage || 0}%\n`;
    comment += `**Phases:** ${completedPhases}/${totalPhases} completed\n`;
    comment += `**Updated:** ${new Date().toISOString()}\n`;
    comment += `\n---\n_Posted by CCASP Phase-Dev Completion Reporter_`;

    addIssueComment(owner, repo, issueNumber, comment);
    console.log(chalk.green(`✓ Updated roadmap issue #${issueNumber}`));
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error updating roadmap GitHub issue: ${error.message}`));
  }
}

/**
 * Update epic GitHub issue with roadmap/phase completion
 */
async function updateEpicGitHubIssue(projectRoot, epicSlug, epic) {
  try {
    const issueNumber = epic.github_epic_number;
    if (!issueNumber) return;

    // If epic is complete, post full completion summary and close
    if (epic.completion_percentage === 100) {
      await closeEpicGitHubIssue(projectRoot, epicSlug, issueNumber);
      return;
    }

    // Otherwise, post progress update
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) return;

    const { owner, repo } = githubConfig;

    const completedRoadmaps = epic.roadmaps?.filter(r => r.status === 'completed').length || 0;
    const totalRoadmaps = epic.roadmaps?.length || 0;

    let comment = `## 📊 Epic Progress Update\n\n`;
    comment += `**Completion:** ${epic.completion_percentage || 0}%\n`;
    comment += `**Roadmaps:** ${completedRoadmaps}/${totalRoadmaps} completed\n`;
    comment += `**Updated:** ${new Date().toISOString()}\n`;
    comment += `\n---\n_Posted by CCASP Phase-Dev Completion Reporter_`;

    addIssueComment(owner, repo, issueNumber, comment);
    console.log(chalk.green(`✓ Updated epic issue #${issueNumber}`));
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error updating epic GitHub issue: ${error.message}`));
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Close phase-dev GitHub issue with completion summary
 */
async function closePhaseDevGitHubIssue(projectRoot, issueNumber, completionMetrics) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) return;

    const { owner, repo } = githubConfig;

    // Build completion summary for closure
    const duration = completionMetrics.duration_ms
      ? formatDuration(completionMetrics.duration_ms)
      : 'N/A';

    let closureComment = `## ✅ Closing - Phase-Dev Complete\n\n`;
    closureComment += `**Duration:** ${duration}\n`;
    closureComment += `**Tasks:** ${completionMetrics.tasks_completed || 0}/${completionMetrics.tasks_total || 0}\n`;

    if (completionMetrics.files_modified?.length > 0) {
      closureComment += `**Files Modified:** ${completionMetrics.files_modified.length}\n`;
    }

    closureComment += `\n---\n_Closed automatically by CCASP Completion Reporter_`;

    const success = closeIssue(owner, repo, issueNumber, closureComment);

    if (success) {
      console.log(chalk.green(`✓ Closed phase-dev GitHub issue #${issueNumber}`));
    } else {
      console.log(chalk.yellow(`⚠ Failed to close GitHub issue #${issueNumber}`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error closing GitHub issue: ${error.message}`));
  }
}

/**
 * Close roadmap GitHub issue with completion summary
 */
async function closeRoadmapGitHubIssue(projectRoot, roadmapSlug, issueNumber) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) return;

    const { owner, repo } = githubConfig;

    // Post completion summary first (handled by completion-commenter)
    await postRoadmapCompletionSummary(projectRoot, roadmapSlug);

    // Then close the issue
    const success = closeIssue(owner, repo, issueNumber);

    if (success) {
      console.log(chalk.green(`✓ Closed roadmap GitHub issue #${issueNumber}`));
    } else {
      console.log(chalk.yellow(`⚠ Failed to close roadmap GitHub issue #${issueNumber}`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error closing roadmap GitHub issue: ${error.message}`));
  }
}

/**
 * Close epic GitHub issue with completion summary
 */
async function closeEpicGitHubIssue(projectRoot, epicSlug, issueNumber) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) return;

    const { owner, repo } = githubConfig;

    // Post completion summary first (handled by completion-commenter)
    await postEpicCompletionSummary(projectRoot, epicSlug);

    // Then close the issue
    const success = closeIssue(owner, repo, issueNumber);

    if (success) {
      console.log(chalk.green(`✓ Closed epic GitHub issue #${issueNumber}`));
    } else {
      console.log(chalk.yellow(`⚠ Failed to close epic GitHub issue #${issueNumber}`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠ Error closing epic GitHub issue: ${error.message}`));
  }
}
