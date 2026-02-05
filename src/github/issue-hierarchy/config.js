/**
 * GitHub Issue Hierarchy Configuration and Utilities
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Safely execute GitHub CLI commands using execFileSync (no shell injection)
 */
export function safeGhExec(args, options = {}) {
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
