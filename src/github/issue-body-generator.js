/**
 * GitHub Issue Body Generator
 *
 * Generates standardized issue bodies for different hierarchy levels:
 * - Epic issues
 * - Roadmap issues
 * - Phase-Dev-Plan issues
 *
 * All bodies include:
 * - CCASP-META header (for machine parsing)
 * - Hierarchy breadcrumb (for navigation)
 * - Content sections (phases, tasks, etc.)
 * - Generated files table
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate CCASP-META header for issue body
 *
 * @param {Object} options - Metadata options
 * @param {string} options.source - Command that created this issue
 * @param {string} options.slug - Item slug
 * @param {string} options.issueType - Type of issue (epic, roadmap, feature)
 * @param {string} options.progressFile - Path to progress tracking file
 * @param {string} [options.parentType] - Parent type (epic, roadmap)
 * @param {string} [options.parentSlug] - Parent slug
 * @param {number} [options.parentIssue] - Parent GitHub issue number
 * @returns {string} CCASP-META comment block
 */
export function generateCcaspMeta(options) {
  const {
    source,
    slug,
    issueType,
    progressFile,
    parentType,
    parentSlug,
    parentIssue,
  } = options;

  let meta = `<!-- CCASP-META
source: ${source}
slug: ${slug}
issue_type: ${issueType}
progress_file: ${progressFile}
created_at: ${new Date().toISOString()}`;

  if (parentType && parentSlug) {
    meta += `
parent_type: ${parentType}
parent_slug: ${parentSlug}`;
  }

  if (parentIssue) {
    meta += `
parent_issue: #${parentIssue}`;
  }

  meta += '\n-->\n';
  return meta;
}

/**
 * Generate hierarchy breadcrumb for navigation
 *
 * @param {Object} context - Hierarchy context
 * @param {Object} [context.epic] - Epic info { slug, title, github_issue }
 * @param {Object} [context.roadmap] - Roadmap info { slug, title, github_issue }
 * @param {Object} [context.plan] - Plan info { slug, name, github_issue }
 * @param {Object} githubConfig - GitHub config { owner, repo }
 * @returns {string} Formatted breadcrumb string
 */
export function generateBreadcrumb(context, githubConfig) {
  const parts = [];

  if (context.epic?.github_issue) {
    const url = `https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${context.epic.github_issue}`;
    parts.push(`[Epic #${context.epic.github_issue}](${url})`);
  }

  if (context.roadmap?.github_issue) {
    const url = `https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${context.roadmap.github_issue}`;
    parts.push(`[Roadmap #${context.roadmap.github_issue}](${url})`);
  }

  if (context.plan?.github_issue) {
    parts.push(`Plan #${context.plan.github_issue}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `**Hierarchy:** ${parts.join(' > ')}\n\n`;
}

/**
 * Generate epic issue body
 *
 * @param {Object} epicData - Epic data from EPIC.json
 * @param {Object} context - Context with githubConfig
 * @returns {string} Complete epic issue body
 */
export function generateEpicBody(epicData, context) {
  const { githubConfig } = context;

  // CCASP-META header
  const meta = generateCcaspMeta({
    source: '/create-github-epic',
    slug: epicData.slug,
    issueType: 'epic',
    progressFile: `.claude/epics/${epicData.slug}/EPIC.json`,
  });

  // Business objective section
  let body = `${meta}
## Business Objective

${epicData.business_objective || 'N/A'}

## Success Criteria

${(epicData.success_criteria || []).map(c => `- [ ] ${c}`).join('\n') || '_No success criteria defined_'}

`;

  // Roadmaps section
  body += `## Roadmaps

`;

  if (epicData.roadmaps && epicData.roadmaps.length > 0) {
    // Generate Mermaid dependency graph
    body += `### Dependency Graph

\`\`\`mermaid
graph TD
`;

    epicData.roadmaps.forEach((roadmap, index) => {
      const nodeId = `R${index + 1}`;
      body += `  ${nodeId}["${roadmap.title}"]\n`;
    });

    body += `\`\`\`

### Roadmap List

`;

    epicData.roadmaps.forEach((roadmap, index) => {
      const statusEmoji = roadmap.status === 'completed' ? '✅' :
                         roadmap.status === 'in_progress' ? '🔄' : '⬜';
      body += `${index + 1}. ${statusEmoji} **${roadmap.title}**`;

      if (roadmap.github_issue) {
        body += ` ([#${roadmap.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${roadmap.github_issue}))`;
      }

      if (roadmap.description) {
        body += ` - ${roadmap.description}`;
      }

      body += '\n';
    });
  } else {
    body += '_No roadmaps defined yet_\n';
  }

  // Progress section
  const completedRoadmaps = (epicData.roadmaps || []).filter(r => r.status === 'completed').length;
  const totalRoadmaps = (epicData.roadmaps || []).length;
  const percentage = epicData.completion_percentage || 0;

  body += `
---

## Progress

**Completion:** ${percentage}% (${completedRoadmaps}/${totalRoadmaps} roadmaps complete)

`;

  // Files table
  body += `---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Epic Definition | JSON | \`.claude/epics/${epicData.slug}/EPIC.json\` |
| Roadmap Index | JSON | \`.claude/epics/${epicData.slug}/roadmaps.json\` |

---
_Auto-generated by CCASP GitHub Issue Hierarchy Manager_`;

  return body;
}

/**
 * Generate roadmap issue body
 *
 * @param {Object} roadmapData - Roadmap data from ROADMAP.json
 * @param {Object} context - Context with epic, githubConfig
 * @returns {string} Complete roadmap issue body
 */
export function generateRoadmapBody(roadmapData, context) {
  const { epic, githubConfig } = context;

  // CCASP-META header
  const meta = generateCcaspMeta({
    source: '/create-roadmap',
    slug: roadmapData.slug,
    issueType: 'roadmap',
    progressFile: `.claude/roadmaps/${roadmapData.slug}/ROADMAP.json`,
    parentType: epic ? 'epic' : null,
    parentSlug: epic?.slug,
    parentIssue: epic?.github_issue,
  });

  // Breadcrumb
  let breadcrumb = '';
  if (epic?.github_issue) {
    breadcrumb = generateBreadcrumb({ epic, roadmap: { github_issue: null } }, githubConfig);
  }

  // Build body
  let body = `${meta}
${breadcrumb}## Overview

${roadmapData.description || 'N/A'}

## Phase-Dev-Plans

`;

  // Phase-dev-plan list
  if (roadmapData.phase_dev_plan_refs && roadmapData.phase_dev_plan_refs.length > 0) {
    roadmapData.phase_dev_plan_refs.forEach((plan, index) => {
      const statusEmoji = plan.status === 'completed' ? '✅' :
                         plan.status === 'in_progress' ? '🔄' : '⬜';
      body += `${index + 1}. ${statusEmoji} **${plan.title}**`;

      if (plan.github_issue) {
        body += ` ([#${plan.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${plan.github_issue}))`;
      }

      body += ` (${plan.slug})\n`;
    });
  } else {
    body += '_No phase-dev-plans defined yet_\n';
  }

  // Progress section
  const percentage = roadmapData.metadata?.overall_completion_percentage || 0;
  const completedPlans = (roadmapData.phase_dev_plan_refs || []).filter(p => p.status === 'completed').length;
  const totalPlans = (roadmapData.phase_dev_plan_refs || []).length;

  body += `
---

## Progress

**Completion:** ${percentage}% (${completedPlans}/${totalPlans} plans complete)

`;

  // Files table
  body += `---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Roadmap Definition | JSON | \`.claude/roadmaps/${roadmapData.slug}/ROADMAP.json\` |
| Exploration Summary | MD | \`.claude/roadmaps/${roadmapData.slug}/exploration/EXPLORATION_SUMMARY.md\` |
| Dependency Graph | Mermaid | \`.claude/roadmaps/${roadmapData.slug}/dependency-graph.md\` |

---
_Auto-generated by CCASP GitHub Issue Hierarchy Manager_`;

  return body;
}

/**
 * Generate phase-dev-plan issue body
 *
 * @param {Object} progressData - Progress data from PROGRESS.json
 * @param {Object} context - Context with epic, roadmap, githubConfig
 * @returns {string} Complete plan issue body
 */
export function generatePlanBody(progressData, context) {
  const { epic, roadmap, githubConfig } = context;

  // Determine parent
  let parentType = null;
  let parentSlug = null;
  let parentIssue = null;

  if (roadmap) {
    parentType = 'roadmap';
    parentSlug = roadmap.slug;
    parentIssue = roadmap.github_issue;
  } else if (epic) {
    parentType = 'epic';
    parentSlug = epic.slug;
    parentIssue = epic.github_issue;
  }

  const planSlug = progressData.plan_id || progressData.project?.slug;

  // CCASP-META header
  const meta = generateCcaspMeta({
    source: '/phase-dev-plan',
    slug: planSlug,
    issueType: 'feature',
    progressFile: `.claude/phase-plans/${planSlug}/PROGRESS.json`,
    parentType,
    parentSlug,
    parentIssue,
  });

  // Breadcrumb
  const breadcrumbContext = {
    epic: epic || null,
    roadmap: roadmap || null,
    plan: { github_issue: null },
  };
  const breadcrumb = generateBreadcrumb(breadcrumbContext, githubConfig);

  // Build body
  let body = `${meta}
${breadcrumb}## Overview

${progressData.description || progressData.project?.name || 'N/A'}

**Scale:** ${progressData.scale || 'Auto'}
**Target Success Rate:** ${Math.round((progressData.target_success || 0.95) * 100)}%

## Phases

`;

  // Phase list
  if (progressData.phases && progressData.phases.length > 0) {
    progressData.phases.forEach((phase, index) => {
      const taskCount = phase.tasks?.length || 0;
      const completedTasks = phase.tasks?.filter(t => t.completed || t.status === 'completed').length || 0;
      const phasePercentage = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

      const statusEmoji = phase.status === 'completed' ? '✅' :
                         phase.status === 'in_progress' ? '🔄' : '⬜';

      body += `### ${statusEmoji} Phase ${phase.id}: ${phase.name}

${phase.description || ''}

**Progress:** ${phasePercentage}% (${completedTasks}/${taskCount} tasks complete)

`;

      if (phase.success_criteria && phase.success_criteria.length > 0) {
        body += `**Success Criteria:**
${phase.success_criteria.map(c => `- [ ] ${c}`).join('\n')}

`;
      }
    });
  } else {
    body += '_No phases defined yet_\n\n';
  }

  // Overall progress
  let totalTasks = 0;
  let completedTasks = 0;

  if (progressData.phases) {
    for (const phase of progressData.phases) {
      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter(t => t.completed || t.status === 'completed').length;
      }
    }
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  body += `---

## Overall Progress

**Completion:** ${percentage}% (${completedTasks}/${totalTasks} tasks complete)

`;

  // Files table
  body += `---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Progress Tracking | JSON | \`.claude/phase-plans/${planSlug}/PROGRESS.json\` |
| Executive Summary | MD | \`.claude/phase-plans/${planSlug}/EXECUTIVE_SUMMARY.md\` |
| Exploration Summary | MD | \`.claude/exploration/${planSlug}/EXPLORATION_SUMMARY.md\` |

---

## Commands

\`\`\`bash
# Track progress
/phase-track ${planSlug}

# Execute next phase
/phase-execute ${planSlug} --phase <phase-number>
\`\`\`

---
_Auto-generated by CCASP GitHub Issue Hierarchy Manager_`;

  return body;
}

/**
 * Update issue body with new content
 *
 * @param {Object} options - Update options
 * @param {string} options.issueType - Type (epic, roadmap, plan)
 * @param {Object} options.data - Data object (epic/roadmap/progress)
 * @param {Object} options.context - Context with epic, roadmap, githubConfig
 * @returns {string} Updated issue body
 */
export function updateIssueBody(options) {
  const { issueType, data, context } = options;

  switch (issueType) {
    case 'epic':
      return generateEpicBody(data, context);
    case 'roadmap':
      return generateRoadmapBody(data, context);
    case 'plan':
    case 'feature':
      return generatePlanBody(data, context);
    default:
      throw new Error(`Unknown issue type: ${issueType}`);
  }
}

export default {
  generateCcaspMeta,
  generateBreadcrumb,
  generateEpicBody,
  generateRoadmapBody,
  generatePlanBody,
  updateIssueBody,
};
