/**
 * Phase-Dev-Plan Issue Operations
 */

import fs from 'fs';
import path from 'path';
import { createGitHubIssue, generateCcaspMeta } from './config.js';

/**
 * Create phase-dev-plan issue if it doesn't exist
 */
export async function ensurePlanIssue(projectRoot, planSlug, progressData, githubConfig, roadmapContext = null, epicContext = null) {
  // Check if issue already exists
  if (progressData.github_issue) {
    return {
      success: true,
      issueNumber: progressData.github_issue,
      created: false,
    };
  }

  // Generate issue body
  const meta = generateCcaspMeta({
    source: '/phase-dev-plan',
    slug: planSlug,
    issueType: 'feature',
    progressFile: `.claude/phase-plans/${planSlug}/PROGRESS.json`,
    parentType: roadmapContext ? 'roadmap' : (epicContext ? 'epic' : null),
    parentSlug: roadmapContext?.slug || epicContext?.slug,
  });

  // Build breadcrumb
  let breadcrumb = '';
  const breadcrumbParts = [];

  if (epicContext?.github_issue) {
    breadcrumbParts.push(`[Epic #${epicContext.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${epicContext.github_issue})`);
  }
  if (roadmapContext?.github_issue) {
    breadcrumbParts.push(`[Roadmap #${roadmapContext.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${roadmapContext.github_issue})`);
  }

  if (breadcrumbParts.length > 0) {
    breadcrumb = `**Hierarchy:** ${breadcrumbParts.join(' > ')} > This Plan\n\n`;
  }

  // Build phase list
  const phases = progressData.phases || [];
  const phaseList = phases.map((p, i) => {
    const taskCount = p.tasks?.length || 0;
    const completedTasks = p.tasks?.filter(t => t.completed || t.status === 'completed').length || 0;
    return `- [ ] **Phase ${p.id}:** ${p.name} (${completedTasks}/${taskCount} tasks)`;
  }).join('\n');

  const body = `${meta}
${breadcrumb}## Overview

${progressData.description || progressData.project?.name || 'N/A'}

## Phases

${phaseList || '_No phases defined yet_'}

---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Progress Tracking | JSON | \`.claude/phase-plans/${planSlug}/PROGRESS.json\` |
| Executive Summary | MD | \`.claude/phase-plans/${planSlug}/EXECUTIVE_SUMMARY.md\` |
| Exploration Summary | MD | \`.claude/exploration/${planSlug}/EXPLORATION_SUMMARY.md\` |

---
_Auto-created by CCASP GitHub Issue Hierarchy Manager_`;

  const result = createGitHubIssue({
    ...githubConfig,
    title: progressData.project?.name || planSlug,
    body,
    labels: ['phase-dev-plan'],
  });

  if (result.success) {
    // Update progress with issue number
    progressData.github_issue = result.issueNumber;
    progressData.github_issue_url = result.issueUrl;

    const progressPath = path.join(projectRoot, '.claude', 'phase-plans', planSlug, 'PROGRESS.json');
    fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf8');

    return {
      success: true,
      issueNumber: result.issueNumber,
      created: true,
    };
  }

  return { success: false, error: result.error };
}
