/**
 * Completion Verifier Hook
 *
 * Verifies that all assigned tasks are complete before
 * allowing agent termination. Prevents premature exits.
 *
 * Event: Stop
 * Triggers: When agent is about to terminate
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  enforceCompletion: true, // Set to false to allow warnings only
  allowPartialCompletion: 0.8, // Allow stop if 80% complete
};

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
 * Get tasks assigned to an agent
 */
function getAgentTasks(state, agentId) {
  // Check active agents
  const activeAgent = state.activeAgents?.find(a => a.agentId === agentId);
  if (activeAgent) {
    return [activeAgent.taskId];
  }

  // Check completed tasks attributed to this agent
  // (from messages or previous runs)
  const completedByAgent = state.messages
    ?.filter(m =>
      m.sender === agentId &&
      (m.type === 'task_complete' || m.type === 'task_failed' || m.type === 'task_blocked')
    )
    .map(m => m.payload?.taskId)
    .filter(Boolean);

  return completedByAgent || [];
}

/**
 * Check if tasks are complete in orchestrator state
 */
function checkTasksComplete(state, taskIds) {
  const results = {
    complete: [],
    incomplete: [],
    failed: [],
    blocked: [],
  };

  taskIds.forEach(taskId => {
    if (state.completedTasks?.includes(taskId)) {
      results.complete.push(taskId);
    } else if (state.failedTasks?.some(t => t.taskId === taskId)) {
      results.failed.push(taskId);
    } else if (state.blockedTasks?.some(t => t.taskId === taskId)) {
      results.blocked.push(taskId);
    } else if (state.pendingTasks?.includes(taskId)) {
      results.incomplete.push(taskId);
    } else {
      // Check if in active agents
      const active = state.activeAgents?.find(a => a.taskId === taskId);
      if (active) {
        results.incomplete.push(taskId);
      }
    }
  });

  return results;
}

/**
 * Load PROGRESS.json and check task status there
 */
function checkProgressFile(projectRoot, planPath, taskIds) {
  const progressPath = path.isAbsolute(planPath)
    ? planPath
    : path.join(projectRoot, planPath);

  if (!fs.existsSync(progressPath)) {
    return null;
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const results = {
      complete: [],
      incomplete: [],
      failed: [],
      blocked: [],
    };

    taskIds.forEach(taskId => {
      let found = false;
      for (const phase of progress.phases || []) {
        for (const task of phase.tasks || []) {
          if (task.id === taskId) {
            found = true;
            if (task.status === 'completed') {
              results.complete.push(taskId);
            } else if (task.status === 'failed') {
              results.failed.push(taskId);
            } else if (task.status === 'blocked') {
              results.blocked.push(taskId);
            } else {
              results.incomplete.push(taskId);
            }
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        results.incomplete.push(taskId);
      }
    });

    return results;
  } catch {
    return null;
  }
}

/**
 * Calculate completion percentage
 */
function calculateCompletionPercentage(results) {
  const total = results.complete.length + results.incomplete.length +
    results.failed.length + results.blocked.length;

  if (total === 0) return 100;

  // Count completed and "resolved" (failed/blocked are technically resolved)
  const resolved = results.complete.length + results.failed.length + results.blocked.length;

  return Math.round((resolved / total) * 100);
}

/**
 * Format incomplete tasks message
 */
function formatIncompleteMessage(results) {
  let message = '';

  if (results.incomplete.length > 0) {
    message += `**Incomplete Tasks:**\n`;
    results.incomplete.forEach(taskId => {
      message += `- [ ] ${taskId}\n`;
    });
    message += '\n';
  }

  if (results.failed.length > 0) {
    message += `**Failed Tasks:**\n`;
    results.failed.forEach(taskId => {
      message += `- [x] ${taskId} (FAILED)\n`;
    });
    message += '\n';
  }

  if (results.blocked.length > 0) {
    message += `**Blocked Tasks:**\n`;
    results.blocked.forEach(taskId => {
      message += `- [!] ${taskId} (BLOCKED)\n`;
    });
    message += '\n';
  }

  return message;
}

/**
 * Main hook handler
 */
async function completionVerifierHook(context) {
  const { hookType, projectRoot, agentId, stopReason } = context;

  // Only process Stop events
  if (hookType !== 'Stop') {
    return { continue: true };
  }

  // Load orchestrator state
  const state = loadState(projectRoot);

  // If no orchestration active, allow stop
  if (!state || state.status !== 'active') {
    return { continue: true };
  }

  // Get tasks assigned to this agent
  const assignedTasks = getAgentTasks(state, agentId || 'main');

  if (assignedTasks.length === 0) {
    // No tasks assigned, allow stop
    return { continue: true };
  }

  // Check completion status in both state and PROGRESS.json
  const stateResults = checkTasksComplete(state, assignedTasks);
  const progressResults = state.planPath
    ? checkProgressFile(projectRoot, state.planPath, assignedTasks)
    : null;

  // Use progress file results if available, otherwise state
  const results = progressResults || stateResults;

  // Calculate completion
  const completionPct = calculateCompletionPercentage(results);

  // Check if we can allow stop
  const allComplete = results.incomplete.length === 0;
  const aboveThreshold = completionPct / 100 >= CONFIG.allowPartialCompletion;

  // If complete or above threshold, allow
  if (allComplete || aboveThreshold) {
    let message = `Completion verified: ${completionPct}% of assigned tasks resolved.\n`;

    if (results.complete.length > 0) {
      message += `Completed: ${results.complete.join(', ')}\n`;
    }

    return {
      continue: true,
      message,
      metadata: {
        completionVerified: true,
        completionPercentage: completionPct,
        results,
      },
    };
  }

  // Tasks incomplete - handle based on enforcement mode
  const incompleteMessage = formatIncompleteMessage(results);

  if (CONFIG.enforceCompletion) {
    // Block stop
    return {
      continue: false,
      message: `Cannot stop: Assigned tasks not complete (${completionPct}% resolved).\n\n${incompleteMessage}\nComplete remaining tasks or mark them as blocked/failed before stopping.`,
      metadata: {
        completionVerified: false,
        completionPercentage: completionPct,
        results,
        enforced: true,
      },
    };
  }

  // Warning only mode
  return {
    continue: true,
    message: `Warning: Stopping with incomplete tasks (${completionPct}% resolved).\n\n${incompleteMessage}`,
    metadata: {
      completionVerified: false,
      completionPercentage: completionPct,
      results,
      enforced: false,
    },
  };
}

module.exports = completionVerifierHook;

// Export for testing
module.exports.checkTasksComplete = checkTasksComplete;
module.exports.calculateCompletionPercentage = calculateCompletionPercentage;
module.exports.CONFIG = CONFIG;
