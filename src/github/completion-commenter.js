/**
 * GitHub Completion Commenter
 *
 * Posts completion summaries to GitHub issues for:
 * - Phase-Dev Plans
 * - Roadmaps
 * - Epics
 *
 * Each summary includes duration, metrics, and links to parent issues.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getGitHubConfig } from './issue-hierarchy-manager.js';
import { addIssueComment } from './client.js';

/**
 * Post phase-dev completion summary to GitHub issue
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} planSlug - Phase-dev plan slug
 * @param {Object} metrics - Completion metrics
 * @returns {Object} Result with success status
 */
export async function postPhaseDevCompletionSummary(projectRoot, planSlug, metrics = {}) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) {
      return { success: false, error: 'GitHub not configured' };
    }

    // Load progress data
    const progressPath = join(projectRoot, '.claude', 'phase-dev', planSlug, 'PROGRESS.json');
    if (!existsSync(progressPath)) {
      return { success: false, error: 'PROGRESS.json not found' };
    }

    const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
    const issueNumber = progress.github_issue;

    if (!issueNumber) {
      return { success: false, error: 'No GitHub issue linked to this phase-dev plan' };
    }

    const { owner, repo } = githubConfig;

    // Calculate duration
    const duration = progress.completed_at && progress.project?.created
      ? formatDuration(new Date(progress.completed_at) - new Date(progress.project.created))
      : 'N/A';

    // Count phases
    const totalPhases = progress.phases?.length || 0;
    const completedPhases = progress.phases?.filter(p => p.status === 'completed').length || 0;

    // Build summary comment
    let comment = `## ✅ Phase-Dev Plan Completed\n\n`;
    comment += `**Completed At:** ${progress.completed_at || new Date().toISOString()}\n`;
    comment += `**Duration:** ${duration}\n\n`;

    comment += `### Metrics\n\n`;
    comment += `| Metric | Value |\n`;
    comment += `|--------|-------|\n`;
    comment += `| Phases | ${completedPhases}/${totalPhases} |\n`;
    comment += `| Tasks | ${metrics.tasks_completed || 0}/${metrics.tasks_total || 0} |\n`;

    if (metrics.files_modified?.length > 0) {
      comment += `| Files Modified | ${metrics.files_modified.length} |\n`;
    }

    if (metrics.tests_added) {
      comment += `| Tests Added | ${metrics.tests_added} |\n`;
    }

    if (metrics.tokens_used) {
      comment += `| Tokens Used | ${metrics.tokens_used.toLocaleString()} |\n`;
    }

    // Add agent stats if available
    if (metrics.agents_deployed) {
      comment += `| Agents Deployed | ${metrics.agents_deployed} |\n`;
    }

    // Add link to parent if exists
    if (progress.parent_context) {
      comment += `\n### Hierarchy\n\n`;
      comment += `**Parent:** ${progress.parent_context.type} - ${progress.parent_context.title}\n`;

      if (progress.parent_context.github_issue) {
        comment += `**Parent Issue:** #${progress.parent_context.github_issue}\n`;
      }
    }

    // Add modified files section (if not too many)
    if (metrics.files_modified && metrics.files_modified.length > 0 && metrics.files_modified.length <= 10) {
      comment += `\n### Modified Files\n\n`;
      metrics.files_modified.forEach(file => {
        comment += `- \`${file}\`\n`;
      });
    }

    comment += `\n---\n_Posted by CCASP GitHub Completion Commenter_`;

    // Post comment
    const success = addIssueComment(owner, repo, issueNumber, comment);

    if (success) {
      return {
        success: true,
        issueNumber,
        message: `Posted completion summary to issue #${issueNumber}`,
      };
    } 
      return {
        success: false,
        error: `Failed to post comment to issue #${issueNumber}`,
      };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Post roadmap completion summary to GitHub issue
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} roadmapSlug - Roadmap slug
 * @param {Object} metrics - Completion metrics
 * @returns {Object} Result with success status
 */
export async function postRoadmapCompletionSummary(projectRoot, roadmapSlug, metrics = {}) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) {
      return { success: false, error: 'GitHub not configured' };
    }

    // Load roadmap data
    const roadmapPath = join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
    if (!existsSync(roadmapPath)) {
      return { success: false, error: 'ROADMAP.json not found' };
    }

    const roadmap = JSON.parse(readFileSync(roadmapPath, 'utf8'));
    const issueNumber = roadmap.metadata?.github_epic_number;

    if (!issueNumber) {
      return { success: false, error: 'No GitHub issue linked to this roadmap' };
    }

    const { owner, repo } = githubConfig;

    // Calculate duration
    const duration = roadmap.updated && roadmap.created
      ? formatDuration(new Date(roadmap.updated) - new Date(roadmap.created))
      : 'N/A';

    // Count phases
    const totalPhases = roadmap.phases?.length || 0;
    const completedPhases = roadmap.phases?.filter(p => p.status === 'completed').length || 0;
    const completionPercentage = roadmap.completion_percentage || 100;

    // Build summary comment
    let comment = `## ✅ Roadmap Completed\n\n`;
    comment += `**Completed At:** ${roadmap.updated || new Date().toISOString()}\n`;
    comment += `**Duration:** ${duration}\n`;
    comment += `**Completion:** ${completionPercentage}%\n\n`;

    comment += `### Metrics\n\n`;
    comment += `| Metric | Value |\n`;
    comment += `|--------|-------|\n`;
    comment += `| Phase-Dev Plans | ${completedPhases}/${totalPhases} |\n`;

    // Count total tasks across all phases
    let totalTasks = 0;
    let completedTasks = 0;

    roadmap.phases?.forEach(phase => {
      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter(t => t.status === 'completed').length;
      }
    });

    if (totalTasks > 0) {
      comment += `| Total Tasks | ${completedTasks}/${totalTasks} |\n`;
    }

    // Add link to parent epic if exists
    if (roadmap.parent_epic) {
      comment += `\n### Hierarchy\n\n`;
      comment += `**Parent Epic:** ${roadmap.parent_epic.title}\n`;

      if (roadmap.parent_epic.github_issue) {
        comment += `**Parent Issue:** #${roadmap.parent_epic.github_issue}\n`;
      }
    }

    // List completed phases
    if (roadmap.phases && roadmap.phases.length > 0) {
      comment += `\n### Completed Phase-Dev Plans\n\n`;
      roadmap.phases.forEach((phase, index) => {
        const statusIcon = phase.status === 'completed' ? '✅' : '🔄';
        comment += `${index + 1}. ${statusIcon} ${phase.title || phase.phase_dev_slug}\n`;

        if (phase.github_issue) {
          comment += `   - Issue: #${phase.github_issue}\n`;
        }
      });
    }

    comment += `\n---\n_Posted by CCASP GitHub Completion Commenter_`;

    // Post comment
    const success = addIssueComment(owner, repo, issueNumber, comment);

    if (success) {
      return {
        success: true,
        issueNumber,
        message: `Posted completion summary to issue #${issueNumber}`,
      };
    } 
      return {
        success: false,
        error: `Failed to post comment to issue #${issueNumber}`,
      };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Post epic completion summary to GitHub issue
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} epicSlug - Epic slug
 * @param {Object} metrics - Completion metrics
 * @returns {Object} Result with success status
 */
export async function postEpicCompletionSummary(projectRoot, epicSlug, metrics = {}) {
  try {
    const githubConfig = getGitHubConfig(projectRoot);
    if (!githubConfig) {
      return { success: false, error: 'GitHub not configured' };
    }

    // Load epic data
    const epicPath = join(projectRoot, '.claude', 'epics', epicSlug, 'EPIC.json');
    if (!existsSync(epicPath)) {
      return { success: false, error: 'EPIC.json not found' };
    }

    const epic = JSON.parse(readFileSync(epicPath, 'utf8'));
    const issueNumber = epic.github_epic_number;

    if (!issueNumber) {
      return { success: false, error: 'No GitHub issue linked to this epic' };
    }

    const { owner, repo } = githubConfig;

    // Calculate duration
    const duration = epic.updated && epic.created
      ? formatDuration(new Date(epic.updated) - new Date(epic.created))
      : 'N/A';

    // Count roadmaps
    const totalRoadmaps = epic.roadmaps?.length || 0;
    const completedRoadmaps = epic.roadmaps?.filter(r => r.status === 'completed').length || 0;
    const completionPercentage = epic.completion_percentage || 100;

    // Build summary comment
    let comment = `## ✅ Epic Completed\n\n`;
    comment += `**Completed At:** ${epic.updated || new Date().toISOString()}\n`;
    comment += `**Duration:** ${duration}\n`;
    comment += `**Completion:** ${completionPercentage}%\n\n`;

    comment += `### Metrics\n\n`;
    comment += `| Metric | Value |\n`;
    comment += `|--------|-------|\n`;
    comment += `| Roadmaps | ${completedRoadmaps}/${totalRoadmaps} |\n`;

    // Add business objective if exists
    if (epic.business_objective) {
      comment += `\n### Business Objective\n\n`;
      comment += `${epic.business_objective}\n`;
    }

    // List completed roadmaps
    if (epic.roadmaps && epic.roadmaps.length > 0) {
      comment += `\n### Completed Roadmaps\n\n`;
      epic.roadmaps.forEach((roadmap, index) => {
        const statusIcon = roadmap.status === 'completed' ? '✅' : '🔄';
        comment += `${index + 1}. ${statusIcon} ${roadmap.title}\n`;

        if (roadmap.github_issue) {
          comment += `   - Issue: #${roadmap.github_issue}\n`;
        }

        if (roadmap.completion_percentage !== undefined) {
          comment += `   - Completion: ${roadmap.completion_percentage}%\n`;
        }
      });
    }

    // Add success criteria status if exists
    if (epic.success_criteria && epic.success_criteria.length > 0) {
      comment += `\n### Success Criteria\n\n`;
      epic.success_criteria.forEach(criteria => {
        comment += `- ✅ ${criteria}\n`;
      });
    }

    comment += `\n---\n_Posted by CCASP GitHub Completion Commenter_`;

    // Post comment
    const success = addIssueComment(owner, repo, issueNumber, comment);

    if (success) {
      return {
        success: true,
        issueNumber,
        message: `Posted completion summary to issue #${issueNumber}`,
      };
    } 
      return {
        success: false,
        error: `Failed to post comment to issue #${issueNumber}`,
      };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format duration (milliseconds or date difference) to human-readable string
 *
 * @param {number|Date} duration - Duration in ms or date difference
 * @returns {string} Formatted duration string
 */
function formatDuration(duration) {
  const ms = typeof duration === 'number' ? duration : duration.getTime();
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

export default {
  postPhaseDevCompletionSummary,
  postRoadmapCompletionSummary,
  postEpicCompletionSummary,
};
