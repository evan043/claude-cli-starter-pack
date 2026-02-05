/**
 * GitHub Issue Hierarchy Manager
 *
 * Ensures GitHub issues exist at all levels of the hierarchy:
 * - Epic → Roadmap → Phase-Dev-Plan
 *
 * When starting from a lower level (e.g., Phase-Dev-Plan without Roadmap),
 * this module auto-creates the missing parent issues.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Safely execute GitHub CLI commands using execFileSync (no shell injection)
 */
function safeGhExec(args, options = {}) {
  const defaultOptions = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  };
  return execFileSync('gh', args, defaultOptions);
}

/**
 * Get GitHub config from tech stack
 */
export function getGitHubConfig(projectRoot) {
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) {
    return null;
  }

  try {
    const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));

    // Support multiple configuration formats
    let owner, repo;

    if (techStack.versionControl?.owner && techStack.versionControl?.repo) {
      owner = techStack.versionControl.owner;
      repo = techStack.versionControl.repo;
    } else if (techStack.versionControl?.projectBoard?.owner && techStack.versionControl?.projectBoard?.repo) {
      owner = techStack.versionControl.projectBoard.owner;
      repo = techStack.versionControl.projectBoard.repo;
    } else if (techStack.github?.owner && techStack.github?.repo) {
      owner = techStack.github.owner;
      repo = techStack.github.repo;
    }

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

/**
 * Create a GitHub issue and return the issue number
 */
export function createGitHubIssue({ owner, repo, title, body, labels = [] }) {
  try {
    const args = [
      'issue', 'create',
      '--repo', `${owner}/${repo}`,
      '--title', title,
      '--body', body,
    ];

    for (const label of labels) {
      args.push('--label', label);
    }

    const result = safeGhExec(args);
    // Parse issue URL to get number
    const match = result.match(/\/issues\/(\d+)/);
    if (match) {
      return {
        success: true,
        issueNumber: parseInt(match[1], 10),
        issueUrl: result.trim(),
      };
    }
    return { success: false, error: 'Could not parse issue URL' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate CCASP-META header for issue body
 */
export function generateCcaspMeta({ source, slug, issueType, progressFile, parentType, parentSlug }) {
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

  meta += '\n-->\n';
  return meta;
}

/**
 * Generate breadcrumb navigation for issue body
 */
export function generateBreadcrumb(context, githubConfig) {
  const parts = [];

  if (context.epic?.github_issue) {
    parts.push(`[Epic #${context.epic.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${context.epic.github_issue})`);
  }

  if (context.roadmap?.github_issue) {
    parts.push(`[Roadmap #${context.roadmap.github_issue}](https://github.com/${githubConfig.owner}/${githubConfig.repo}/issues/${context.roadmap.github_issue})`);
  }

  if (context.plan?.github_issue) {
    parts.push(`Plan #${context.plan.github_issue}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `**Hierarchy:** ${parts.join(' > ')}\n\n---\n`;
}

/**
 * Create epic issue if it doesn't exist
 */
export async function ensureEpicIssue(projectRoot, epicSlug, epicData, githubConfig) {
  // Check if issue already exists
  if (epicData.github_epic_number) {
    return {
      success: true,
      issueNumber: epicData.github_epic_number,
      created: false,
    };
  }

  // Generate issue body
  const meta = generateCcaspMeta({
    source: '/create-github-epic',
    slug: epicSlug,
    issueType: 'epic',
    progressFile: `.claude/epics/${epicSlug}/EPIC.json`,
  });

  const roadmapList = (epicData.roadmaps || [])
    .map((r, i) => `- [ ] **Roadmap ${i + 1}:** ${r.title}`)
    .join('\n');

  const body = `${meta}
## Business Objective

${epicData.business_objective || 'N/A'}

## Roadmaps

${roadmapList || '_No roadmaps defined yet_'}

## Success Criteria

${(epicData.success_criteria || []).map(c => `- [ ] ${c}`).join('\n') || '_No success criteria defined_'}

---

**Generated Files:**
| File | Type | Path |
|------|------|------|
| Epic Definition | JSON | \`.claude/epics/${epicSlug}/EPIC.json\` |

---
_Auto-created by CCASP GitHub Issue Hierarchy Manager_`;

  const result = createGitHubIssue({
    ...githubConfig,
    title: `[Epic] ${epicData.title}`,
    body,
    labels: ['epic'],
  });

  if (result.success) {
    // Update epic with issue number
    epicData.github_epic_number = result.issueNumber;
    epicData.github_epic_url = result.issueUrl;

    const epicPath = path.join(projectRoot, '.claude', 'epics', epicSlug, 'EPIC.json');
    fs.writeFileSync(epicPath, JSON.stringify(epicData, null, 2), 'utf8');

    return {
      success: true,
      issueNumber: result.issueNumber,
      created: true,
    };
  }

  return { success: false, error: result.error };
}

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

export default {
  getGitHubConfig,
  createGitHubIssue,
  generateCcaspMeta,
  generateBreadcrumb,
  ensureEpicIssue,
  ensureRoadmapIssue,
  ensurePlanIssue,
  ensureHierarchyIssues,
};
