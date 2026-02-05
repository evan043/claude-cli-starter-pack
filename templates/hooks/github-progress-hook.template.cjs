/**
 * GitHub Progress Hook
 *
 * Automatically updates GitHub issues as tasks are completed.
 * Monitors TodoWrite calls and syncs progress to linked GitHub issues.
 * Now hierarchy-aware: detects parent roadmap/epic from PROGRESS.json parent_context.
 *
 * Event: PostToolUse
 * Matcher: TodoWrite
 *
 * This hook reads from stdin (Claude Code passes tool info there)
 * and updates the linked GitHub issue with progress comments.
 * Also updates parent roadmap/epic issues when in hierarchy context.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - parse from tech-stack.json dynamically
function loadConfig() {
  try {
    const techStackPath = path.join(process.cwd(), '.claude', 'config', 'tech-stack.json');
    if (fs.existsSync(techStackPath)) {
      const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
      const vc = techStack.versionControl || {};
      const repo = vc.repository || '';
      const [owner, repoName] = repo.includes('/') ? repo.split('/') : ['', ''];

      return {
        owner: owner,
        repo: repoName,
        projectNumber: vc.projectBoard?.number || null,
        enabled: !!vc.projectBoard?.type && !!owner && !!repoName,
      };
    }
  } catch (e) {
    // Silent fail - config not available
  }
  return { owner: '', repo: '', projectNumber: null, enabled: false };
}

const PROGRESS_FILE = '.claude/hooks/cache/github-progress.json';

/**
 * Load progress tracking data
 */
function loadProgress() {
  const progressPath = path.join(process.cwd(), PROGRESS_FILE);

  if (fs.existsSync(progressPath)) {
    try {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    } catch (error) {
      // Could not parse, return default
    }
  }

  return {
    linkedIssue: null,
    tasks: [],
    completedTasks: [],
    lastUpdate: null,
  };
}

/**
 * Save progress tracking data
 */
function saveProgress(progress) {
  const progressPath = path.join(process.cwd(), PROGRESS_FILE);
  const progressDir = path.dirname(progressPath);

  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }

  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
}

/**
 * Check if gh CLI is available
 */
function hasGhCli() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update GitHub issue with progress comment
 */
function updateGitHubIssue(issueNumber, completedCount, totalCount, latestTask, config) {
  if (!hasGhCli()) {
    return false;
  }

  try {
    // Create progress comment
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

    const comment = `### Progress Update

${progressBar} ${percentage}% (${completedCount}/${totalCount} tasks)

**Latest completed:** ${latestTask || 'N/A'}

---
*Auto-updated by Claude Code github-progress-hook*`;

    // Add comment to issue - use file to avoid escaping issues
    const cacheDir = path.join(process.cwd(), '.claude', 'hooks', 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const tmpFile = path.join(cacheDir, 'tmp-comment.md');
    fs.writeFileSync(tmpFile, comment, 'utf8');

    execSync(
      `gh issue comment ${issueNumber} --repo ${config.owner}/${config.repo} --body-file "${tmpFile}"`,
      { stdio: 'pipe' }
    );

    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}

    console.log(`[github-progress] Updated issue #${issueNumber}: ${percentage}% complete`);
    return true;
  } catch (error) {
    // Silent fail
    return false;
  }
}

/**
 * Extract linked issue number from todos
 */
function findLinkedIssue(todos, progress) {
  // Check if issue is already linked
  if (progress.linkedIssue) {
    return progress.linkedIssue;
  }

  // Look for issue reference in todo content (e.g., "Issue #11" or "#11")
  for (const todo of todos) {
    const content = todo.content || '';
    const issueMatch = content.match(/(?:Issue\s*)?#(\d+)/i);
    if (issueMatch) {
      return parseInt(issueMatch[1], 10);
    }
  }

  return null;
}

/**
 * Find PROGRESS.json in current directory or parent directories
 */
function findProgressJson() {
  let currentDir = process.cwd();
  const maxDepth = 5;
  let depth = 0;

  while (depth < maxDepth) {
    const progressPath = path.join(currentDir, 'PROGRESS.json');
    if (fs.existsSync(progressPath)) {
      return progressPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached root
    }
    currentDir = parentDir;
    depth++;
  }

  return null;
}

/**
 * Load hierarchy context from PROGRESS.json
 */
function loadHierarchyContext() {
  const progressPath = findProgressJson();
  if (!progressPath) {
    return null;
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const context = {
      plan: {
        slug: progress.plan_id || progress.project?.slug,
        name: progress.project?.name,
        github_issue: progress.github_issue,
      },
      roadmap: null,
      epic: null,
    };

    // Check for parent context
    if (progress.parent_context) {
      if (progress.parent_context.type === 'roadmap') {
        const roadmapPath = path.isAbsolute(progress.parent_context.path)
          ? progress.parent_context.path
          : path.join(path.dirname(progressPath), progress.parent_context.path);

        if (fs.existsSync(roadmapPath)) {
          const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
          context.roadmap = {
            slug: roadmap.slug,
            title: roadmap.title,
            github_issue: roadmap.metadata?.github_epic_number,
          };

          // Check for parent epic
          if (roadmap.parent_epic) {
            const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
              ? roadmap.parent_epic.epic_path
              : path.join(path.dirname(roadmapPath), roadmap.parent_epic.epic_path);

            if (fs.existsSync(epicPath)) {
              const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
              context.epic = {
                slug: epic.slug,
                title: epic.title,
                github_issue: epic.github_epic_number,
              };
            }
          }
        }
      } else if (progress.parent_context.type === 'epic') {
        const epicPath = path.isAbsolute(progress.parent_context.path)
          ? progress.parent_context.path
          : path.join(path.dirname(progressPath), progress.parent_context.path);

        if (fs.existsSync(epicPath)) {
          const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
          context.epic = {
            slug: epic.slug,
            title: epic.title,
            github_issue: epic.github_epic_number,
          };
        }
      }
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * Update parent issues with child progress
 */
function updateParentIssues(context, completedCount, totalCount, config) {
  if (!context) {
    return;
  }

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

  // Update roadmap issue if exists
  if (context.roadmap?.github_issue) {
    try {
      const roadmapComment = `### Child Plan Progress Update

**Plan:** ${context.plan.name || context.plan.slug}
${progressBar} ${percentage}% (${completedCount}/${totalCount} tasks)

---
*Auto-updated by Claude Code github-progress-hook*`;

      const cacheDir = path.join(process.cwd(), '.claude', 'hooks', 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      const tmpFile = path.join(cacheDir, 'tmp-roadmap-comment.md');
      fs.writeFileSync(tmpFile, roadmapComment, 'utf8');

      execSync(
        `gh issue comment ${context.roadmap.github_issue} --repo ${config.owner}/${config.repo} --body-file "${tmpFile}"`,
        { stdio: 'pipe' }
      );

      try { fs.unlinkSync(tmpFile); } catch {}

      console.log(`[github-progress] Updated roadmap issue #${context.roadmap.github_issue}`);
    } catch {
      // Silent fail
    }
  }

  // Update epic issue if exists
  if (context.epic?.github_issue) {
    try {
      const breadcrumb = context.roadmap
        ? `${context.roadmap.title} > ${context.plan.name || context.plan.slug}`
        : context.plan.name || context.plan.slug;

      const epicComment = `### Deep Progress Update

**Path:** ${breadcrumb}
${progressBar} ${percentage}% (${completedCount}/${totalCount} tasks)

---
*Auto-updated by Claude Code github-progress-hook*`;

      const cacheDir = path.join(process.cwd(), '.claude', 'hooks', 'cache');
      const tmpFile = path.join(cacheDir, 'tmp-epic-comment.md');
      fs.writeFileSync(tmpFile, epicComment, 'utf8');

      execSync(
        `gh issue comment ${context.epic.github_issue} --repo ${config.owner}/${config.repo} --body-file "${tmpFile}"`,
        { stdio: 'pipe' }
      );

      try { fs.unlinkSync(tmpFile); } catch {}

      console.log(`[github-progress] Updated epic issue #${context.epic.github_issue}`);
    } catch {
      // Silent fail
    }
  }
}

/**
 * Main function - reads from stdin and processes TodoWrite
 */
async function main() {
  const config = loadConfig();

  // Skip if not configured
  if (!config.enabled) {
    return;
  }

  // Read stdin to get tool information
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    // No stdin available
    return;
  }

  let toolData;
  try {
    toolData = JSON.parse(input);
  } catch {
    // Invalid JSON
    return;
  }

  // Check if this is a TodoWrite tool
  const toolName = toolData.tool_name || toolData.name;
  if (toolName !== 'TodoWrite') {
    return;
  }

  // Get todos from input
  const todos = toolData.tool_input?.todos || toolData.input?.todos || [];
  if (todos.length === 0) {
    return;
  }

  // Load progress tracking
  const progress = loadProgress();

  // Check for linked issue
  const issueNumber = findLinkedIssue(todos, progress);

  if (issueNumber && !progress.linkedIssue) {
    progress.linkedIssue = issueNumber;
    console.log(`[github-progress] Linked to issue #${issueNumber}`);
  }

  // Skip if no linked issue
  if (!progress.linkedIssue) {
    saveProgress(progress);
    return;
  }

  // Count completed vs total tasks (excluding CONTEXT task)
  const actualTodos = todos.filter(t => !t.content?.startsWith('CONTEXT:'));
  const completedTodos = actualTodos.filter(t => t.status === 'completed');
  const totalCount = actualTodos.length;
  const completedCount = completedTodos.length;

  // Find latest completed task
  const latestCompleted = completedTodos[completedTodos.length - 1];
  const latestTask = latestCompleted?.content || null;

  // Check if progress changed (more tasks completed than before)
  const previousCompleted = progress.completedTasks?.length || 0;

  if (completedCount > previousCompleted) {
    // Update GitHub issue
    updateGitHubIssue(progress.linkedIssue, completedCount, totalCount, latestTask, config);

    // Load hierarchy context and update parent issues
    const hierarchyContext = loadHierarchyContext();
    if (hierarchyContext) {
      updateParentIssues(hierarchyContext, completedCount, totalCount, config);
    }

    // Update progress tracking
    progress.completedTasks = completedTodos.map(t => t.content);
    progress.tasks = actualTodos.map(t => ({ content: t.content, status: t.status }));
  }

  // Save progress
  saveProgress(progress);
}

// Run the hook
main().catch(err => {
  // Silently fail - don't break Claude Code
  if (process.env.DEBUG) {
    console.error('github-progress hook error:', err);
  }
});
