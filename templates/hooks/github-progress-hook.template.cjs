/**
 * GitHub Progress Hook
 *
 * Automatically updates GitHub issues as tasks are completed.
 * Monitors TodoWrite calls and syncs progress to linked GitHub issues.
 *
 * Event: PostToolUse
 * Matcher: TodoWrite
 *
 * This hook reads from stdin (Claude Code passes tool info there)
 * and updates the linked GitHub issue with progress comments.
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
