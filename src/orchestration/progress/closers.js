/**
 * GitHub Issue Closure Functions
 *
 * Automatically close GitHub issues when hierarchy items reach 100% completion.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getGitHubConfig } from '../../github/issue-hierarchy-manager.js';
import { closeIssue } from '../../github/client.js';
import { aggregateEpicProgress, aggregateRoadmapProgress, aggregatePhaseProgress } from './aggregators.js';

/**
 * Close GitHub issue when phase-dev reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} progressPath - Path to PROGRESS.json
 */
export async function closePhaseDevIssueIfComplete(projectRoot, progressPath) {
  try {
    const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
    const phaseCompletion = aggregatePhaseProgress(progressPath);

    if (phaseCompletion.completion === 100 && progress.github_issue) {
      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;
      const issueNumber = progress.github_issue;

      const completionSummary = buildPhaseDevCompletionSummary(progress, phaseCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed phase-dev GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing phase-dev issue: ${error.message}`);
  }
}

/**
 * Close GitHub issue when roadmap reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} roadmapPath - Path to ROADMAP.json
 */
export async function closeRoadmapIssueIfComplete(projectRoot, roadmapPath) {
  try {
    const roadmapCompletion = aggregateRoadmapProgress(roadmapPath);

    if (roadmapCompletion.completion === 100) {
      const roadmap = JSON.parse(readFileSync(
        roadmapPath.endsWith('.json') ? roadmapPath : join(roadmapPath, 'ROADMAP.json'),
        'utf8'
      ));

      const issueNumber = roadmap.metadata?.github_epic_number;
      if (!issueNumber) return;

      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;

      const completionSummary = buildRoadmapCompletionSummary(roadmap, roadmapCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed roadmap GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing roadmap issue: ${error.message}`);
  }
}

/**
 * Close GitHub issue when epic reaches 100%
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} epicPath - Path to epic directory
 */
export async function closeEpicIssueIfComplete(projectRoot, epicPath) {
  try {
    const epicCompletion = aggregateEpicProgress(epicPath);

    if (epicCompletion.completion === 100) {
      const epicFile = join(epicPath, 'EPIC.json');
      const epic = JSON.parse(readFileSync(epicFile, 'utf8'));

      const issueNumber = epic.github_epic_number;
      if (!issueNumber) return;

      const githubConfig = getGitHubConfig(projectRoot);
      if (!githubConfig) return;

      const { owner, repo } = githubConfig;

      const completionSummary = buildEpicCompletionSummary(epic, epicCompletion);
      const success = closeIssue(owner, repo, issueNumber, completionSummary);

      if (success) {
        console.log(`✓ Closed epic GitHub issue #${issueNumber}`);
      }
    }
  } catch (error) {
    console.error(`Error closing epic issue: ${error.message}`);
  }
}

/**
 * Build phase-dev completion summary for GitHub issue
 */
function buildPhaseDevCompletionSummary(progress, phaseCompletion) {
  const duration = progress.completed_at && progress.project?.created
    ? formatDuration(new Date(progress.completed_at) - new Date(progress.project.created))
    : 'N/A';

  let summary = `## ✅ Phase-Dev Plan Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Duration:** ${duration}\n`;
  summary += `**Tasks:** ${phaseCompletion.tasks_completed}/${phaseCompletion.tasks_total}\n`;

  if (progress.completion_metrics?.files_modified?.length > 0) {
    summary += `**Files Modified:** ${progress.completion_metrics.files_modified.length}\n`;
  }

  if (progress.completion_metrics?.tests_added) {
    summary += `**Tests Added:** ${progress.completion_metrics.tests_added}\n`;
  }

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Build roadmap completion summary for GitHub issue
 */
function buildRoadmapCompletionSummary(roadmap, roadmapCompletion) {
  let summary = `## ✅ Roadmap Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Phases Completed:** ${roadmapCompletion.phases_completed}/${roadmapCompletion.phases_total}\n`;

  if (roadmap.updated) {
    summary += `**Last Updated:** ${roadmap.updated}\n`;
  }

  summary += `\n### Completed Phases\n\n`;
  roadmapCompletion.phases.forEach((phase, index) => {
    summary += `${index + 1}. ✓ ${phase.title || 'Phase'} (${phase.completion}%)\n`;
  });

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Build epic completion summary for GitHub issue
 */
function buildEpicCompletionSummary(epic, epicCompletion) {
  let summary = `## ✅ Epic Completed\n\n`;
  summary += `**Completed:** ${new Date().toISOString()}\n`;
  summary += `**Roadmaps Completed:** ${epicCompletion.roadmaps_completed}/${epicCompletion.roadmaps_total}\n`;

  if (epic.updated) {
    summary += `**Last Updated:** ${epic.updated}\n`;
  }

  summary += `\n### Completed Roadmaps\n\n`;
  epicCompletion.roadmaps.forEach((roadmap, index) => {
    summary += `${index + 1}. ✓ ${roadmap.title} (${roadmap.completion}%)\n`;
  });

  summary += `\n---\n_Closed automatically by CCASP Progress Aggregator_`;

  return summary;
}

/**
 * Format duration (milliseconds) to human-readable string
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
  } 
    return `${seconds}s`;
  
}
