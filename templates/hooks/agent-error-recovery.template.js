/**
 * Agent Error Recovery Hook
 *
 * Detects agent failures and triggers recovery strategies:
 * retry, escalate, or abort.
 *
 * Event: SubagentStop
 * Triggers: When any subagent finishes (success or failure)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
  errorPatterns: {
    transient: [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate limit/i,
      /temporarily unavailable/i,
    ],
    fatal: [
      /permission denied/i,
      /not found/i,
      /syntax error/i,
      /invalid/i,
    ],
    recoverable: [
      /lint error/i,
      /test fail/i,
      /type error/i,
    ],
  },
  strategies: {
    transient: 'retry',
    recoverable: 'retry',
    fatal: 'escalate',
    unknown: 'escalate',
  },
};

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) return null;

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
 * Update agent state with failure info
 */
function updateAgentFailure(statePath, agentId, errorInfo) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Find agent
  const agentIndex = state.activeAgents?.findIndex(a => a.agentId === agentId);

  if (agentIndex >= 0) {
    const agent = state.activeAgents[agentIndex];

    // Update retry count
    agent.retryCount = (agent.retryCount || 0) + 1;
    agent.lastError = errorInfo.error;
    agent.lastErrorAt = new Date().toISOString();
    agent.errorType = errorInfo.type;

    // If max retries exceeded or fatal, move to failed
    if (agent.retryCount >= CONFIG.maxRetries || errorInfo.type === 'fatal') {
      state.activeAgents.splice(agentIndex, 1);
      state.failedTasks.push({
        taskId: agent.taskId,
        agentId: agent.agentId,
        error: errorInfo.error,
        errorType: errorInfo.type,
        retryCount: agent.retryCount,
        failedAt: new Date().toISOString(),
      });
      state.metrics.tasksFailed++;
    }
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Record escalation in state
 */
function recordEscalation(statePath, taskId, reason) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.blockedTasks.push({
    taskId,
    blocker: reason,
    blockedAt: new Date().toISOString(),
    escalated: true,
  });

  state.metrics.tasksBlocked++;
  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Classify error type
 */
function classifyError(errorMessage) {
  if (!errorMessage) return 'unknown';

  for (const [type, patterns] of Object.entries(CONFIG.errorPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        return type;
      }
    }
  }

  return 'unknown';
}

/**
 * Detect failure from agent output
 */
function detectFailure(output) {
  if (!output) return null;

  // Check for explicit failure signal
  const failMatch = output.match(/TASK_FAILED:\s*(\S+)/);
  if (failMatch) {
    const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);
    return {
      taskId: failMatch[1],
      error: errorMatch ? errorMatch[1].trim() : 'Unknown error',
      explicit: true,
    };
  }

  // Check for blocked signal
  const blockedMatch = output.match(/TASK_BLOCKED:\s*(\S+)/);
  if (blockedMatch) {
    const blockerMatch = output.match(/BLOCKER:\s*(.+?)(?:\n|$)/);
    return {
      taskId: blockedMatch[1],
      error: blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker',
      blocked: true,
    };
  }

  // Check for error patterns in output
  const errorIndicators = [
    /error:/i,
    /exception:/i,
    /failed:/i,
    /fatal:/i,
  ];

  for (const indicator of errorIndicators) {
    if (indicator.test(output)) {
      const errorLine = output.split('\n').find(line => indicator.test(line));
      return {
        taskId: null, // Unknown task
        error: errorLine?.slice(0, 200) || 'Error detected in output',
        implicit: true,
      };
    }
  }

  return null;
}

/**
 * Determine recovery strategy
 */
function determineStrategy(errorType, retryCount) {
  // If max retries exceeded, always escalate
  if (retryCount >= CONFIG.maxRetries) {
    return 'abort';
  }

  return CONFIG.strategies[errorType] || 'escalate';
}

/**
 * Format recovery message
 */
function formatRecoveryMessage(failure, errorType, strategy, retryCount) {
  let message = `## Agent Error Detected\n\n`;
  message += `**Task:** ${failure.taskId || 'Unknown'}\n`;
  message += `**Error Type:** ${errorType}\n`;
  message += `**Retry Count:** ${retryCount}/${CONFIG.maxRetries}\n\n`;

  message += `### Error\n\`\`\`\n${failure.error}\n\`\`\`\n\n`;

  message += `### Recovery Strategy: ${strategy.toUpperCase()}\n\n`;

  switch (strategy) {
    case 'retry':
      message += `The task will be retried automatically.\n`;
      message += `Waiting ${CONFIG.retryDelay / 1000}s before retry...\n`;
      break;

    case 'escalate':
      message += `This error requires human intervention.\n`;
      message += `Please review the error and either:\n`;
      message += `- Fix the issue and restart the task\n`;
      message += `- Skip this task and continue\n`;
      message += `- Abort the orchestration\n`;
      break;

    case 'abort':
      message += `Maximum retries exceeded. Task aborted.\n`;
      message += `The orchestrator will continue with other tasks.\n`;
      break;
  }

  return message;
}

/**
 * Main hook handler
 */
async function agentErrorRecoveryHook(context) {
  const { hookType, projectRoot, agentOutput, agentId } = context;

  // Only process SubagentStop events
  if (hookType !== 'SubagentStop') {
    return { continue: true };
  }

  // Detect failure in output
  const failure = detectFailure(agentOutput);

  // No failure detected
  if (!failure) {
    return { continue: true };
  }

  // Load orchestrator state
  const stateInfo = loadState(projectRoot);

  // If no orchestration, just report
  if (!stateInfo || stateInfo.data.status !== 'active') {
    return {
      continue: true,
      message: `Error detected: ${failure.error}`,
      metadata: { errorDetected: true, failure },
    };
  }

  // Classify the error
  const errorType = failure.blocked ? 'blocked' : classifyError(failure.error);

  // Get current retry count
  const agent = stateInfo.data.activeAgents?.find(a => a.agentId === agentId);
  const retryCount = (agent?.retryCount || 0) + 1;

  // Determine strategy
  const strategy = failure.blocked ? 'escalate' : determineStrategy(errorType, retryCount);

  // Update state
  updateAgentFailure(stateInfo.path, agentId, {
    error: failure.error,
    type: errorType,
  });

  // Handle escalation
  if (strategy === 'escalate' && failure.taskId) {
    recordEscalation(stateInfo.path, failure.taskId, failure.error);
  }

  // Format message
  const message = formatRecoveryMessage(failure, errorType, strategy, retryCount);

  return {
    continue: true,
    message,
    metadata: {
      errorRecovery: {
        taskId: failure.taskId,
        errorType,
        strategy,
        retryCount,
        maxRetries: CONFIG.maxRetries,
      },
    },
  };
}

module.exports = agentErrorRecoveryHook;

// Export for testing
module.exports.classifyError = classifyError;
module.exports.detectFailure = detectFailure;
module.exports.determineStrategy = determineStrategy;
module.exports.CONFIG = CONFIG;
