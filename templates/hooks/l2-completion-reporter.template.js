/**
 * L2 Completion Reporter Hook
 *
 * Captures completion reports from L2 specialist agents and
 * writes them to the orchestrator state for tracking.
 *
 * Event: SubagentStop
 * Triggers: When any L2 agent finishes execution
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  completionPatterns: {
    completed: /TASK_COMPLETE:\s*(\S+)/,
    blocked: /TASK_BLOCKED:\s*(\S+)/,
    failed: /TASK_FAILED:\s*(\S+)/,
    l3Result: /L3_RESULT:\s*(\S+)/,
  },
  extractors: {
    status: /STATUS:\s*(\w+)/,
    artifacts: /ARTIFACTS:\s*\[([^\]]*)\]/,
    summary: /SUMMARY:\s*(.+?)(?:\n|$)/,
    blocker: /BLOCKER:\s*(.+?)(?:\n|$)/,
    error: /ERROR:\s*(.+?)(?:\n|$)/,
    data: /DATA:\s*(.+?)(?:\n|$)/s,
  },
};

/**
 * Parse completion report from agent output
 */
function parseCompletionReport(output) {
  if (!output) return null;

  // Check for TASK_COMPLETE
  const completeMatch = output.match(CONFIG.completionPatterns.completed);
  if (completeMatch) {
    const artifactsMatch = output.match(CONFIG.extractors.artifacts);
    const summaryMatch = output.match(CONFIG.extractors.summary);

    return {
      type: 'completed',
      taskId: completeMatch[1],
      artifacts: artifactsMatch
        ? artifactsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
        : [],
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      timestamp: new Date().toISOString(),
    };
  }

  // Check for TASK_BLOCKED
  const blockedMatch = output.match(CONFIG.completionPatterns.blocked);
  if (blockedMatch) {
    const blockerMatch = output.match(CONFIG.extractors.blocker);

    return {
      type: 'blocked',
      taskId: blockedMatch[1],
      blocker: blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker',
      timestamp: new Date().toISOString(),
    };
  }

  // Check for TASK_FAILED
  const failedMatch = output.match(CONFIG.completionPatterns.failed);
  if (failedMatch) {
    const errorMatch = output.match(CONFIG.extractors.error);

    return {
      type: 'failed',
      taskId: failedMatch[1],
      error: errorMatch ? errorMatch[1].trim() : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }

  // Check for L3_RESULT
  const l3Match = output.match(CONFIG.completionPatterns.l3Result);
  if (l3Match) {
    const dataMatch = output.match(CONFIG.extractors.data);

    return {
      type: 'l3_completed',
      subtaskId: l3Match[1],
      data: dataMatch ? dataMatch[1].trim() : '',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return {
      data: JSON.parse(fs.readFileSync(statePath, 'utf8')),
      path: statePath,
    };
  } catch {
    return null;
  }
}

/**
 * Update orchestrator state with completion report
 */
function updateState(statePath, report, agentId) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Find agent in activeAgents
  const agentIndex = state.activeAgents.findIndex(
    a => a.agentId === agentId || a.taskId === report.taskId || a.subtaskId === report.subtaskId
  );

  if (agentIndex >= 0) {
    const agent = state.activeAgents[agentIndex];
    agent.completedAt = report.timestamp;

    switch (report.type) {
      case 'completed':
        agent.status = 'completed';
        agent.result = {
          artifacts: report.artifacts,
          summary: report.summary,
        };
        state.completedTasks.push(agent.taskId);
        state.metrics.tasksCompleted++;

        // Remove from pending
        const pendingIndex = state.pendingTasks.indexOf(agent.taskId);
        if (pendingIndex >= 0) {
          state.pendingTasks.splice(pendingIndex, 1);
        }
        break;

      case 'blocked':
        agent.status = 'blocked';
        state.blockedTasks.push({
          taskId: agent.taskId,
          blocker: report.blocker,
          blockedAt: report.timestamp,
        });
        state.metrics.tasksBlocked++;
        break;

      case 'failed':
        agent.status = 'failed';
        state.failedTasks.push({
          taskId: agent.taskId,
          error: report.error,
          retryCount: (agent.retryCount || 0) + 1,
          failedAt: report.timestamp,
        });
        state.metrics.tasksFailed++;
        break;

      case 'l3_completed':
        agent.status = 'completed';
        agent.result = { data: report.data };
        break;
    }

    // Remove from active agents
    state.activeAgents.splice(agentIndex, 1);
  }

  // Update metrics
  const now = Date.now();
  const started = state.initialized ? new Date(state.initialized).getTime() : now;
  state.metrics.totalDuration = now - started;

  if (state.metrics.tasksCompleted > 0) {
    state.metrics.averageTaskDuration = state.metrics.totalDuration / state.metrics.tasksCompleted;
  }

  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Add message to orchestrator queue
 */
function addMessage(statePath, message) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...message,
    timestamp: new Date().toISOString(),
    processed: false,
  });

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Check if all tasks in current phase are complete
 */
function checkPhaseCompletion(state, progressPath) {
  if (!fs.existsSync(progressPath)) return null;

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const currentPhase = progress.phases?.find(p => p.phase_id === state.currentPhase);

    if (!currentPhase) return null;

    const allTasksComplete = currentPhase.tasks?.every(t =>
      state.completedTasks.includes(t.id) || t.status === 'completed'
    );

    return {
      phaseId: state.currentPhase,
      complete: allTasksComplete,
      totalTasks: currentPhase.tasks?.length || 0,
      completedTasks: currentPhase.tasks?.filter(t =>
        state.completedTasks.includes(t.id) || t.status === 'completed'
      ).length || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Main hook handler
 */
async function l2CompletionReporterHook(context) {
  const { hookType, projectRoot, agentId, agentOutput } = context;

  // Only process SubagentStop events
  if (hookType !== 'SubagentStop') {
    return { continue: true };
  }

  // Load orchestrator state
  const stateInfo = loadState(projectRoot);
  if (!stateInfo || stateInfo.data.status !== 'active') {
    return { continue: true };
  }

  // Parse completion report from agent output
  const report = parseCompletionReport(agentOutput);
  if (!report) {
    return { continue: true };
  }

  // Update orchestrator state
  const updatedState = updateState(stateInfo.path, report, agentId);

  // Add completion message
  addMessage(stateInfo.path, {
    type: `task_${report.type}`,
    sender: agentId || 'l2-agent',
    recipient: 'orchestrator',
    payload: report,
  });

  // Check phase completion
  const phaseStatus = checkPhaseCompletion(updatedState, updatedState.planPath);

  // Build response message
  let message = '';

  switch (report.type) {
    case 'completed':
      message = `Task ${report.taskId} completed by L2 agent.\n`;
      message += `Artifacts: ${report.artifacts.join(', ') || 'none'}\n`;
      message += `Summary: ${report.summary}`;

      if (phaseStatus?.complete) {
        message += `\n\nPhase ${phaseStatus.phaseId} complete! (${phaseStatus.completedTasks}/${phaseStatus.totalTasks} tasks)`;
      }
      break;

    case 'blocked':
      message = `Task ${report.taskId} blocked.\n`;
      message += `Blocker: ${report.blocker}\n`;
      message += `Action needed: Resolve blocker or reassign task.`;
      break;

    case 'failed':
      message = `Task ${report.taskId} failed.\n`;
      message += `Error: ${report.error}\n`;
      message += `Consider: Retry, escalate, or abort.`;
      break;

    case 'l3_completed':
      message = `L3 worker completed subtask ${report.subtaskId}.`;
      break;
  }

  return {
    continue: true,
    message,
    metadata: {
      l2CompletionReport: report,
      phaseStatus,
      orchestratorState: {
        completedTasks: updatedState.completedTasks.length,
        pendingTasks: updatedState.pendingTasks.length,
        activeAgents: updatedState.activeAgents.length,
      },
    },
  };
}

module.exports = l2CompletionReporterHook;

// Export for testing
module.exports.parseCompletionReport = parseCompletionReport;
module.exports.checkPhaseCompletion = checkPhaseCompletion;
module.exports.CONFIG = CONFIG;
