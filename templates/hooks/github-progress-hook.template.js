/**
 * GitHub Progress Hook
 *
 * Automatically updates GitHub issues as tasks are completed.
 * Monitors TodoWrite/TaskUpdate calls and syncs progress to linked GitHub issues.
 *
 * Event: PostToolUse
 * Priority: {{hooks.priorities.automation}}
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration from tech-stack.json
const CONFIG = {
  owner: '{{versionControl.owner}}',
  repo: '{{versionControl.repo}}',
  projectNumber: {{versionControl.projectBoard.number}},
  enabled: '{{versionControl.projectBoard.type}}' === 'github-projects',
};

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
      console.warn('[github-progress] Could not parse progress file');
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
 * Update GitHub issue with progress
 */
function updateGitHubIssue(issueNumber, completedTasks, totalTasks, latestTask) {
  if (!hasGhCli()) {
    console.warn('[github-progress] gh CLI not available');
    return false;
  }

  try {
    // Create progress comment
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));

    const comment = `### Progress Update

${progressBar} ${percentage}% (${completedTasks}/${totalTasks} tasks)

**Latest completed:** ${latestTask || 'N/A'}

---
*Auto-updated by Claude Code github-progress-hook*`;

    // Add comment to issue
    execSync(
      `gh issue comment ${issueNumber} --repo ${CONFIG.owner}/${CONFIG.repo} --body "${comment.replace(/"/g, '\\"')}"`,
      { stdio: 'ignore' }
    );

    return true;
  } catch (error) {
    console.warn('[github-progress] Failed to update GitHub:', error.message);
    return false;
  }
}

/**
 * Extract linked issue from task metadata or context
 */
function findLinkedIssue(input, progress) {
  // Check if issue is already linked
  if (progress.linkedIssue) {
    return progress.linkedIssue;
  }

  // Try to extract from task description
  if (input && input.description) {
    const issueMatch = input.description.match(/#(\d+)/);
    if (issueMatch) {
      return parseInt(issueMatch[1], 10);
    }
  }

  // Try to extract from subject
  if (input && input.subject) {
    const issueMatch = input.subject.match(/#(\d+)/);
    if (issueMatch) {
      return parseInt(issueMatch[1], 10);
    }
  }

  return null;
}

/**
 * Main hook handler
 */
module.exports = async function githubProgressHook(context) {
  // Skip if not configured
  if (!CONFIG.enabled || !CONFIG.owner || !CONFIG.repo) {
    return { continue: true };
  }

  const { tool, input } = context;

  // Only process task-related tools
  if (!['TodoWrite', 'TaskUpdate', 'TaskCreate'].includes(tool)) {
    return { continue: true };
  }

  // Load progress tracking
  const progress = loadProgress();

  // Check for linked issue
  const issueNumber = findLinkedIssue(input, progress);

  if (issueNumber && !progress.linkedIssue) {
    progress.linkedIssue = issueNumber;
    console.log(`[github-progress] Linked to issue #${issueNumber}`);
  }

  // Track task completion
  if (tool === 'TaskUpdate' && input && input.status === 'completed') {
    const taskId = input.taskId;
    if (taskId && !progress.completedTasks.includes(taskId)) {
      progress.completedTasks.push(taskId);

      // Update GitHub if we have a linked issue
      if (progress.linkedIssue) {
        const totalTasks = progress.tasks.length || progress.completedTasks.length;
        updateGitHubIssue(
          progress.linkedIssue,
          progress.completedTasks.length,
          totalTasks,
          input.subject || `Task ${taskId}`
        );
      }
    }
  }

  // Track new tasks
  if (tool === 'TaskCreate' && input && input.subject) {
    progress.tasks.push({
      id: Date.now().toString(),
      subject: input.subject,
      created: new Date().toISOString(),
    });
  }

  // Save updated progress
  saveProgress(progress);

  return { continue: true };
};
