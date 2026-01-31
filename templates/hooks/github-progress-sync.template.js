/**
 * GitHub Progress Sync Hook
 *
 * Syncs phase development progress to linked GitHub issues.
 * Adds comments on task completion, updates labels, and
 * auto-closes issues when plan completes.
 *
 * Event: PostToolUse
 * Triggers: After Write operations on PROGRESS.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  progressFileName: 'PROGRESS.json',
  syncOnTaskComplete: true,
  syncOnPhaseComplete: true,
  updateLabels: true,
  autoCloseOnComplete: true,
  progressLabels: ['progress:0%', 'progress:25%', 'progress:50%', 'progress:75%', 'progress:100%'],
  rateLimitDelay: 1000, // 1 second between API calls
};

/**
 * Check if gh CLI is available
 */
function isGhAvailable() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Update orchestrator state with sync info
 */
function updateSyncState(statePath, syncInfo) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.githubConfig.lastSyncAt = new Date().toISOString();
  state.githubConfig.lastSyncResult = syncInfo;
  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Generate progress bar
 */
function generateProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

/**
 * Generate progress comment for GitHub
 */
function generateProgressComment(progress, completedItem) {
  const { plan_name, phases, completion_percentage } = progress;

  let comment = `## Phase Development Progress Update\n\n`;

  // Progress bar
  const bar = generateProgressBar(completion_percentage || 0);
  comment += `\`\`\`\n[${bar}] ${completion_percentage || 0}%\n\`\`\`\n\n`;

  // What was completed
  if (completedItem.type === 'task') {
    comment += `**Task Completed:** \`${completedItem.taskId}\`\n`;
    if (completedItem.summary) {
      comment += `> ${completedItem.summary}\n`;
    }
    comment += `\n`;
  } else if (completedItem.type === 'phase') {
    comment += `**Phase Completed:** ${completedItem.phaseName} (\`${completedItem.phaseId}\`)\n\n`;
  }

  // Phase summary
  comment += `### Phase Status\n\n`;
  comment += `| Phase | Status | Progress |\n`;
  comment += `|-------|--------|----------|\n`;

  (phases || []).forEach(phase => {
    const status = phase.status || 'pending';
    const emoji = status === 'completed' ? '\u2705' : status === 'in_progress' ? '\u{1F504}' : '\u2B1C';
    const tasksDone = phase.tasks?.filter(t => t.status === 'completed').length || 0;
    const tasksTotal = phase.tasks?.length || 0;
    comment += `| ${emoji} ${phase.name} | ${status} | ${tasksDone}/${tasksTotal} |\n`;
  });

  comment += `\n`;

  // Current phase tasks
  const currentPhase = phases?.find(p => p.status === 'in_progress');
  if (currentPhase && currentPhase.tasks?.length > 0) {
    comment += `### Current Phase: ${currentPhase.name}\n\n`;
    currentPhase.tasks.forEach(task => {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      comment += `- ${checkbox} \`${task.id}\`: ${task.title}\n`;
    });
    comment += `\n`;
  }

  // Footer
  comment += `---\n`;
  comment += `*Automatically synced by CCASP Orchestrator*\n`;
  comment += `*${new Date().toISOString()}*\n`;

  return comment;
}

/**
 * Add comment to GitHub issue
 */
function addIssueComment(owner, repo, issueNumber, comment) {
  try {
    // Escape for shell
    const escapedComment = comment
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    execSync(
      `gh issue comment ${issueNumber} --repo ${owner}/${repo} --body "${escapedComment}"`,
      { stdio: 'pipe', timeout: 30000 }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update issue labels for progress
 */
function updateProgressLabels(owner, repo, issueNumber, percentage) {
  if (!CONFIG.updateLabels) return { success: true };

  try {
    // Remove existing progress labels
    CONFIG.progressLabels.forEach(label => {
      try {
        execSync(
          `gh issue edit ${issueNumber} --repo ${owner}/${repo} --remove-label "${label}"`,
          { stdio: 'pipe', timeout: 10000 }
        );
      } catch {
        // Label might not exist, ignore
      }
    });

    // Add appropriate progress label
    const labelIndex = Math.floor(percentage / 25);
    const newLabel = CONFIG.progressLabels[Math.min(labelIndex, CONFIG.progressLabels.length - 1)];

    execSync(
      `gh issue edit ${issueNumber} --repo ${owner}/${repo} --add-label "${newLabel}"`,
      { stdio: 'pipe', timeout: 10000 }
    );

    return { success: true, label: newLabel };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Close issue with completion message
 */
function closeIssue(owner, repo, issueNumber, completionComment) {
  try {
    // Add final comment
    if (completionComment) {
      addIssueComment(owner, repo, issueNumber, completionComment);
    }

    // Close the issue
    execSync(
      `gh issue close ${issueNumber} --repo ${owner}/${repo}`,
      { stdio: 'pipe', timeout: 10000 }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if file is PROGRESS.json
 */
function isProgressFile(filePath) {
  return filePath && filePath.endsWith(CONFIG.progressFileName);
}

/**
 * Detect what was completed by comparing states
 */
function detectCompletion(oldProgress, newProgress) {
  if (!oldProgress || !newProgress) return null;

  // Check for phase completion
  for (const newPhase of newProgress.phases || []) {
    const oldPhase = oldProgress.phases?.find(p => p.phase_id === newPhase.phase_id);

    if (oldPhase?.status !== 'completed' && newPhase.status === 'completed') {
      return {
        type: 'phase',
        phaseId: newPhase.phase_id,
        phaseName: newPhase.name,
      };
    }

    // Check for task completion within phase
    for (const newTask of newPhase.tasks || []) {
      const oldTask = oldPhase?.tasks?.find(t => t.id === newTask.id);

      if (oldTask?.status !== 'completed' && newTask.status === 'completed') {
        return {
          type: 'task',
          taskId: newTask.id,
          taskTitle: newTask.title,
          summary: newTask.summary,
          phaseId: newPhase.phase_id,
        };
      }
    }
  }

  // Check for plan completion
  if (oldProgress.status !== 'completed' && newProgress.status === 'completed') {
    return {
      type: 'plan',
      planId: newProgress.plan_id,
      planName: newProgress.plan_name,
    };
  }

  return null;
}

/**
 * Main hook handler
 */
async function githubProgressSyncHook(context) {
  const { tool, toolInput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only process Write operations on PROGRESS.json
  if (tool !== 'Write' || !isProgressFile(toolInput?.file_path)) {
    return { continue: true };
  }

  // Check gh CLI availability
  if (!isGhAvailable()) {
    return { continue: true };
  }

  // Load orchestrator state
  const state = loadState(projectRoot);

  // Check if GitHub sync is enabled
  if (!state?.githubConfig?.enabled || !state?.githubConfig?.issueNumber) {
    return { continue: true };
  }

  const { owner, repo, issueNumber } = state.githubConfig;

  if (!owner || !repo) {
    return { continue: true };
  }

  // Load the updated PROGRESS.json
  const progressPath = path.isAbsolute(toolInput.file_path)
    ? toolInput.file_path
    : path.join(projectRoot, toolInput.file_path);

  let progress;
  try {
    progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  } catch {
    return { continue: true };
  }

  // Try to detect what was completed
  // Note: In a real implementation, we'd compare with cached previous state
  // For now, we'll sync on any PROGRESS.json update
  const completion = {
    type: 'update',
    percentage: progress.completion_percentage || 0,
  };

  // Generate and post comment
  const comment = generateProgressComment(progress, completion);
  const commentResult = addIssueComment(owner, repo, issueNumber, comment);

  // Update labels
  const labelResult = updateProgressLabels(owner, repo, issueNumber, progress.completion_percentage || 0);

  // Check for plan completion
  let closeResult = { success: false, skipped: true };
  if (CONFIG.autoCloseOnComplete && progress.status === 'completed') {
    const finalComment = `## Plan Completed!\n\n` +
      `**${progress.plan_name}** has been successfully completed.\n\n` +
      `- Total Phases: ${progress.phases?.length || 0}\n` +
      `- Completion: 100%\n` +
      `- Completed At: ${new Date().toISOString()}\n\n` +
      `Great work! This issue is now closed.`;

    closeResult = closeIssue(owner, repo, issueNumber, finalComment);
  }

  // Update sync state
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  updateSyncState(statePath, {
    commentPosted: commentResult.success,
    labelsUpdated: labelResult.success,
    issueClosed: closeResult.success,
    timestamp: new Date().toISOString(),
  });

  // Build response message
  let message = '';

  if (commentResult.success) {
    message += `GitHub issue #${issueNumber} updated with progress.\n`;
  } else {
    message += `Failed to update GitHub issue: ${commentResult.error}\n`;
  }

  if (closeResult.success) {
    message += `Issue #${issueNumber} closed - plan complete!\n`;
  }

  return {
    continue: true,
    message: message || undefined,
    metadata: {
      githubSync: {
        issueNumber,
        commentPosted: commentResult.success,
        labelsUpdated: labelResult.success,
        issueClosed: closeResult.success,
      },
    },
  };
}

module.exports = githubProgressSyncHook;

// Export for testing
module.exports.generateProgressComment = generateProgressComment;
module.exports.generateProgressBar = generateProgressBar;
module.exports.CONFIG = CONFIG;
