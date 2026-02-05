/**
 * Roadmap Issue Operations
 */

import fs from 'fs';
import path from 'path';
import { createGitHubIssue, generateCcaspMeta } from './config.js';

/**
 * Create roadmap issue if it doesn't exist
 */
export async function ensureRoadmapIssue(projectRoot, roadmapSlug, roadmapData, githubConfig, epicContext = null) {
  // Check if issue already exists
  if (roadmapData.metadata?.github_epic_number) {
    return {
      success: true,
      issueNumber: roadmapData.metadata.github_epic_number,
      created: false,
    };
  }

  // Generate issue body
  let parentInfo = '';
  if (epicContext) {
    parentInfo = `parent_type: epic
parent_slug: ${epicContext.slug}`;
  }

  const meta = generateCcaspMeta({
    source: '/create-roadmap',
    slug: roadmapSlug,
    issueType: 'roadmap',
    progressFile: `.claude/roadmaps/${roadmapSlug}/ROADMAP.json`,
    parentType: epicContext ? 'epic' : null,
    parentSlug: epicContext?.slug,
  });

  const planList = (roadmapData.phase_dev_plan_refs || [])
    .map((p, i) => `- [ ] **${p.title}** (${p.slug})`)
    .join('\n');

  let breadcrumb = '';
  if (epicContext?.github_issue) {
    breadcrumb = `**Part of Epic:** [#${epicContext.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${epicContext.github_issue})\n\n`;
  }

  const body = `${meta}
${breadcrumb}## Overview

${roadmapData.description || 'N/A'}

## Phase-Dev-Plans

${planList || '_No phase-dev-plans defined yet_'}

---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Roadmap Definition | JSON | \`.claude/roadmaps/${roadmapSlug}/ROADMAP.json\` |
| Exploration Summary | MD | \`.claude/roadmaps/${roadmapSlug}/exploration/EXPLORATION_SUMMARY.md\` |

---
_Auto-created by CCASP GitHub Issue Hierarchy Manager_`;

  const result = createGitHubIssue({
    ...githubConfig,
    title: `[Roadmap] ${roadmapData.title}`,
    body,
    labels: ['roadmap'],
  });

  if (result.success) {
    // Update roadmap with issue number
    roadmapData.metadata = roadmapData.metadata || {};
    roadmapData.metadata.github_epic_number = result.issueNumber;
    roadmapData.metadata.github_issue_url = result.issueUrl;

    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmapData, null, 2), 'utf8');

    return {
      success: true,
      issueNumber: result.issueNumber,
      created: true,
    };
  }

  return { success: false, error: result.error };
}
