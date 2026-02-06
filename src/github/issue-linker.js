/**
 * GitHub Issue Linker
 *
 * Manages parent/child relationships between GitHub issues in the hierarchy.
 * Ensures all issues are properly linked for navigation.
 *
 * Hierarchy structure:
 * - Epic (parent) → Roadmap (child)
 * - Roadmap (parent) → Phase-Dev-Plan (child)
 * - Epic → Roadmap → Phase-Dev-Plan (full chain)
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
function getGitHubConfig(projectRoot) {
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) {
    return null;
  }

  try {
    const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
    const owner = techStack.versionControl?.owner;
    const repo = techStack.versionControl?.repo;

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

/**
 * Get issue body from GitHub
 */
function getIssueBody(owner, repo, issueNumber) {
  try {
    const result = safeGhExec([
      'issue', 'view', String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--json', 'body',
    ]);
    const data = JSON.parse(result);
    return data.body || '';
  } catch {
    return null;
  }
}

/**
 * Update issue body on GitHub
 */
function updateIssueBody(owner, repo, issueNumber, body) {
  try {
    safeGhExec([
      'issue', 'edit', String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--body', body,
    ]);
    return true;
  } catch (error) {
    console.error(`Failed to update issue #${issueNumber}:`, error.message);
    return false;
  }
}

/**
 * Extract CCASP-META section from issue body
 */
function extractCcaspMeta(body) {
  const match = body.match(/<!-- CCASP-META\n([\s\S]*?)\n-->/);
  if (!match) {
    return null;
  }

  const metaText = match[1];
  const meta = {};

  metaText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      meta[key.trim()] = valueParts.join(':').trim();
    }
  });

  return meta;
}

/**
 * Update CCASP-META section in issue body
 */
function updateCcaspMeta(body, newMeta) {
  const metaLines = Object.entries(newMeta)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const metaBlock = `<!-- CCASP-META\n${metaLines}\n-->`;

  // Replace existing CCASP-META or add at beginning
  if (body.includes('<!-- CCASP-META')) {
    return body.replace(/<!-- CCASP-META\n[\s\S]*?\n-->/, metaBlock);
  } 
    return `${metaBlock}\n\n${body}`;
  
}

/**
 * Add child issue reference to parent issue
 *
 * @param {Object} parentIssue - { number, owner, repo }
 * @param {Object} childIssue - { number, owner, repo, title, type }
 * @param {Object} config - GitHub config
 * @returns {boolean} Success status
 */
export function linkParentToChild(parentIssue, childIssue, config) {
  const body = getIssueBody(config.owner, config.repo, parentIssue.number);
  if (!body) {
    return false;
  }

  // Check if child already linked
  const childRef = `#${childIssue.number}`;
  if (body.includes(childRef)) {
    return true; // Already linked
  }

  // Add child reference in appropriate section
  const childType = childIssue.type || 'child';
  let sectionHeader;

  if (childType === 'roadmap') {
    sectionHeader = '## Roadmaps';
  } else if (childType === 'phase-dev-plan') {
    sectionHeader = '## Phase-Dev-Plans';
  } else {
    sectionHeader = '## Child Items';
  }

  let updatedBody;
  if (body.includes(sectionHeader)) {
    // Add to existing section
    const sectionRegex = new RegExp(`(${sectionHeader}[\\s\\S]*?)\\n\\n`, 'm');
    updatedBody = body.replace(sectionRegex, (match, section) => {
      return `${section}\n- [ ] [${childIssue.title}](#${childIssue.number})\n\n`;
    });
  } else {
    // Create new section before first --- separator
    const separatorIndex = body.indexOf('\n---\n');
    if (separatorIndex !== -1) {
      updatedBody = `${body.slice(0, separatorIndex) 
        }\n\n${sectionHeader}\n\n- [ ] [${childIssue.title}](#${childIssue.number})\n${ 
        body.slice(separatorIndex)}`;
    } else {
      // Add at end
      updatedBody = `${body}\n\n${sectionHeader}\n\n- [ ] [${childIssue.title}](#${childIssue.number})\n`;
    }
  }

  return updateIssueBody(config.owner, config.repo, parentIssue.number, updatedBody);
}

/**
 * Add parent issue reference to child issue
 *
 * @param {Object} childIssue - { number, owner, repo }
 * @param {Object} parentIssue - { number, owner, repo, title, type }
 * @param {Object} config - GitHub config
 * @returns {boolean} Success status
 */
export function linkChildToParent(childIssue, parentIssue, config) {
  const body = getIssueBody(config.owner, config.repo, childIssue.number);
  if (!body) {
    return false;
  }

  // Update CCASP-META with parent reference
  const meta = extractCcaspMeta(body) || {};
  meta.parent_issue = `#${parentIssue.number}`;
  meta.parent_type = parentIssue.type || 'parent';

  const updatedBody = updateCcaspMeta(body, meta);

  // Also add parent link in body if not already present
  const parentRef = `#${parentIssue.number}`;
  let finalBody = updatedBody;

  if (!finalBody.includes(parentRef)) {
    const parentLabel = parentIssue.type === 'epic' ? 'Epic' :
                       parentIssue.type === 'roadmap' ? 'Roadmap' : 'Parent';

    // Add after CCASP-META, before rest of content
    const metaEndIndex = finalBody.indexOf('-->') + 3;
    const beforeMeta = finalBody.slice(0, metaEndIndex);
    const afterMeta = finalBody.slice(metaEndIndex);

    finalBody = `${beforeMeta 
      }\n\n**Part of ${parentLabel}:** [${parentIssue.title}](https://github.com/${config.owner}/${config.repo}/issues/${parentIssue.number})${ 
      afterMeta}`;
  }

  return updateIssueBody(config.owner, config.repo, childIssue.number, finalBody);
}

/**
 * Update epic issue with all child roadmap links
 *
 * @param {string} epicSlug - Epic slug
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result with success status and updated count
 */
export function updateEpicWithRoadmapLinks(epicSlug, projectRoot) {
  const config = getGitHubConfig(projectRoot);
  if (!config) {
    return { success: false, error: 'GitHub not configured' };
  }

  // Load epic data
  const epicPath = path.join(projectRoot, '.claude', 'epics', epicSlug, 'EPIC.json');
  if (!fs.existsSync(epicPath)) {
    return { success: false, error: `Epic not found: ${epicSlug}` };
  }

  const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
  const epicIssue = epic.github_epic_number;

  if (!epicIssue) {
    return { success: false, error: 'Epic has no GitHub issue' };
  }

  // Find all roadmaps for this epic
  const roadmapsDir = path.join(projectRoot, '.claude', 'roadmaps');
  if (!fs.existsSync(roadmapsDir)) {
    return { success: true, linkedCount: 0 };
  }

  const roadmapDirs = fs.readdirSync(roadmapsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let linkedCount = 0;

  for (const roadmapDir of roadmapDirs) {
    const roadmapPath = path.join(roadmapsDir, roadmapDir, 'ROADMAP.json');
    if (!fs.existsSync(roadmapPath)) {
      continue;
    }

    const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

    // Check if this roadmap belongs to our epic
    if (roadmap.parent_epic?.slug === epicSlug) {
      const roadmapIssue = roadmap.metadata?.github_epic_number;

      if (roadmapIssue) {
        const linked = linkParentToChild(
          { number: epicIssue },
          { number: roadmapIssue, title: roadmap.title, type: 'roadmap' },
          config
        );

        if (linked) {
          linkedCount++;
        }
      }
    }
  }

  return { success: true, linkedCount };
}

/**
 * Update roadmap issue with all child phase-dev-plan links
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result with success status and updated count
 */
export function updateRoadmapWithPlanLinks(roadmapSlug, projectRoot) {
  const config = getGitHubConfig(projectRoot);
  if (!config) {
    return { success: false, error: 'GitHub not configured' };
  }

  // Load roadmap data
  const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', roadmapSlug, 'ROADMAP.json');
  if (!fs.existsSync(roadmapPath)) {
    return { success: false, error: `Roadmap not found: ${roadmapSlug}` };
  }

  const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
  const roadmapIssue = roadmap.metadata?.github_epic_number;

  if (!roadmapIssue) {
    return { success: false, error: 'Roadmap has no GitHub issue' };
  }

  // Get all phase-dev-plans for this roadmap
  const plans = roadmap.phase_dev_plan_refs || [];
  let linkedCount = 0;

  for (const planRef of plans) {
    const planPath = path.join(projectRoot, '.claude', 'phase-plans', planRef.slug, 'PROGRESS.json');
    if (!fs.existsSync(planPath)) {
      continue;
    }

    const progress = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const planIssue = progress.github_issue;

    if (planIssue) {
      const linked = linkParentToChild(
        { number: roadmapIssue },
        { number: planIssue, title: planRef.title, type: 'phase-dev-plan' },
        config
      );

      if (linked) {
        linkedCount++;
      }
    }
  }

  return { success: true, linkedCount };
}

/**
 * Ensure all issues in the hierarchy are properly linked
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} level - Starting level (epic, roadmap, plan)
 * @param {string} slug - Item slug
 * @returns {Object} Result with success status and link counts
 */
export async function ensureAllIssuesLinked(projectRoot, level, slug) {
  const config = getGitHubConfig(projectRoot);
  if (!config) {
    return { success: false, error: 'GitHub not configured' };
  }

  const results = {
    success: true,
    epicToRoadmaps: 0,
    roadmapsToPlans: 0,
    plansToParents: 0,
  };

  if (level === 'epic') {
    // Link epic → roadmaps
    const epicResult = updateEpicWithRoadmapLinks(slug, projectRoot);
    if (epicResult.success) {
      results.epicToRoadmaps = epicResult.linkedCount;

      // Also link each roadmap → plans
      const roadmapsDir = path.join(projectRoot, '.claude', 'roadmaps');
      if (fs.existsSync(roadmapsDir)) {
        const roadmapDirs = fs.readdirSync(roadmapsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const roadmapDir of roadmapDirs) {
          const roadmapPath = path.join(roadmapsDir, roadmapDir, 'ROADMAP.json');
          if (fs.existsSync(roadmapPath)) {
            const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
            if (roadmap.parent_epic?.slug === slug) {
              const roadmapResult = updateRoadmapWithPlanLinks(roadmapDir, projectRoot);
              if (roadmapResult.success) {
                results.roadmapsToPlans += roadmapResult.linkedCount;
              }
            }
          }
        }
      }
    }
  } else if (level === 'roadmap') {
    // Link roadmap → plans
    const roadmapResult = updateRoadmapWithPlanLinks(slug, projectRoot);
    if (roadmapResult.success) {
      results.roadmapsToPlans = roadmapResult.linkedCount;
    }

    // Link roadmap → parent epic if exists
    const roadmapPath = path.join(projectRoot, '.claude', 'roadmaps', slug, 'ROADMAP.json');
    if (fs.existsSync(roadmapPath)) {
      const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

      if (roadmap.parent_epic?.slug) {
        const epicPath = path.join(projectRoot, '.claude', 'epics', roadmap.parent_epic.slug, 'EPIC.json');
        if (fs.existsSync(epicPath)) {
          const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

          if (epic.github_epic_number && roadmap.metadata?.github_epic_number) {
            linkChildToParent(
              { number: roadmap.metadata.github_epic_number },
              { number: epic.github_epic_number, title: epic.title, type: 'epic' },
              config
            );
          }
        }
      }
    }
  } else if (level === 'plan') {
    // Link plan → parent roadmap/epic
    const planPath = path.join(projectRoot, '.claude', 'phase-plans', slug, 'PROGRESS.json');
    if (!fs.existsSync(planPath)) {
      return { success: false, error: `Plan not found: ${slug}` };
    }

    const progress = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    const planIssue = progress.github_issue;

    if (!planIssue) {
      return { success: false, error: 'Plan has no GitHub issue' };
    }

    if (progress.parent_context?.type === 'roadmap') {
      const roadmapPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(roadmapPath)) {
        const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
        const roadmapIssue = roadmap.metadata?.github_epic_number;

        if (roadmapIssue) {
          linkChildToParent(
            { number: planIssue },
            { number: roadmapIssue, title: roadmap.title, type: 'roadmap' },
            config
          );
          results.plansToParents++;
        }
      }
    } else if (progress.parent_context?.type === 'epic') {
      const epicPath = path.isAbsolute(progress.parent_context.path)
        ? progress.parent_context.path
        : path.join(projectRoot, progress.parent_context.path);

      if (fs.existsSync(epicPath)) {
        const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
        const epicIssue = epic.github_epic_number;

        if (epicIssue) {
          linkChildToParent(
            { number: planIssue },
            { number: epicIssue, title: epic.title, type: 'epic' },
            config
          );
          results.plansToParents++;
        }
      }
    }
  }

  return results;
}

export default {
  linkParentToChild,
  linkChildToParent,
  updateEpicWithRoadmapLinks,
  updateRoadmapWithPlanLinks,
  ensureAllIssuesLinked,
};
