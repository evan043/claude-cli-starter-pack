/**
 * Delegation Protocol for L0 → L1 → L2 → L3 orchestration
 *
 * Provides standardized messaging for cross-level delegation and completion reporting.
 */

// Message Types
export const MessageTypes = {
  SPAWN: 'SPAWN',
  COMPLETE: 'COMPLETE',
  BLOCKED: 'BLOCKED',
  FAILED: 'FAILED',
  PROGRESS: 'PROGRESS'
};

// Level Identifiers
export const Levels = {
  EPIC: 'L0',
  ROADMAP: 'L1',
  PHASE: 'L2',
  TASK: 'L3'
};

/**
 * Create a spawn message for delegating to child level
 *
 * @param {string} level - Target level (L0, L1, L2, L3)
 * @param {Object} context - Delegation context
 * @param {string} context.parentId - Parent entity ID
 * @param {string} context.childId - Child entity ID
 * @param {string} context.title - Child entity title
 * @param {string} context.scope - Brief description of scope
 * @param {number} [context.tokenBudget] - Allocated token budget
 * @param {Array<string>} [context.dependencies] - Dependency IDs
 * @param {Object} [context.constraints] - Execution constraints
 * @returns {Object} Spawn message
 */
export function createSpawnMessage(level, context) {
  return {
    type: MessageTypes.SPAWN,
    level,
    timestamp: new Date().toISOString(),
    context: {
      parent_id: context.parentId,
      child_id: context.childId,
      title: context.title,
      scope: context.scope,
      token_budget: context.tokenBudget || null,
      dependencies: context.dependencies || [],
      constraints: context.constraints || {},
      tools: context.tools || []
    }
  };
}

/**
 * Create a completion message for reporting to parent level
 *
 * @param {string} level - Reporting level (L0, L1, L2, L3)
 * @param {string} id - Entity ID completing
 * @param {Object} metrics - Completion metrics
 * @param {number} metrics.itemsCompleted - Items completed count
 * @param {number} [metrics.testsPassed] - Tests passed count
 * @param {number} [metrics.tokensUsed] - Tokens consumed
 * @param {number} [metrics.durationMs] - Execution duration
 * @param {string} summary - Brief completion summary
 * @param {Array<string>} [artifacts] - Artifacts produced
 * @returns {Object} Complete message
 */
export function createCompleteMessage(level, id, metrics, summary, artifacts = []) {
  return {
    type: MessageTypes.COMPLETE,
    level,
    id,
    timestamp: new Date().toISOString(),
    status: 'completed',
    metrics: {
      items_completed: metrics.itemsCompleted,
      tests_passed: metrics.testsPassed || 0,
      tokens_used: metrics.tokensUsed || 0,
      duration_ms: metrics.durationMs || 0
    },
    artifacts,
    summary
  };
}

/**
 * Create a blocked message for escalating to parent
 *
 * @param {string} level - Blocked level (L0, L1, L2, L3)
 * @param {string} id - Entity ID that's blocked
 * @param {string} blocker - Description of blocker
 * @param {string} suggestedAction - Suggested resolution action
 * @returns {Object} Blocked message
 */
export function createBlockedMessage(level, id, blocker, suggestedAction) {
  return {
    type: MessageTypes.BLOCKED,
    level,
    id,
    timestamp: new Date().toISOString(),
    status: 'blocked',
    blocker,
    suggested_action: suggestedAction
  };
}

/**
 * Create a failed message for reporting critical failures
 *
 * @param {string} level - Failed level (L0, L1, L2, L3)
 * @param {string} id - Entity ID that failed
 * @param {string} error - Error description
 * @param {Array<string>} attempted - Actions attempted before failure
 * @returns {Object} Failed message
 */
export function createFailedMessage(level, id, error, attempted = []) {
  return {
    type: MessageTypes.FAILED,
    level,
    id,
    timestamp: new Date().toISOString(),
    status: 'failed',
    error,
    attempted
  };
}

/**
 * Parse completion output from agent response
 *
 * Looks for patterns like:
 * - EPIC_COMPLETE: id
 * - ROADMAP_COMPLETE: id
 * - PHASE_COMPLETE: id
 * - TASK_COMPLETE: id
 *
 * @param {string} output - Agent output text
 * @returns {Object|null} Parsed message or null
 */
export function parseCompletionOutput(output) {
  // Pattern: LEVEL_COMPLETE: id
  const completeMatch = output.match(/(EPIC|ROADMAP|PHASE|TASK)_COMPLETE:\s*(\S+)/);
  if (completeMatch) {
    return {
      type: MessageTypes.COMPLETE,
      level: completeMatch[1],
      id: completeMatch[2],
      ...extractMetrics(output),
      ...extractArtifacts(output),
      ...extractSummary(output)
    };
  }

  // Pattern: LEVEL_BLOCKED: id
  const blockedMatch = output.match(/(EPIC|ROADMAP|PHASE|TASK)_BLOCKED:\s*(\S+)/);
  if (blockedMatch) {
    return {
      type: MessageTypes.BLOCKED,
      level: blockedMatch[1],
      id: blockedMatch[2],
      blocker: extractBlocker(output),
      suggested_action: extractSuggestedAction(output)
    };
  }

  // Pattern: LEVEL_FAILED: id
  const failedMatch = output.match(/(EPIC|ROADMAP|PHASE|TASK)_FAILED:\s*(\S+)/);
  if (failedMatch) {
    return {
      type: MessageTypes.FAILED,
      level: failedMatch[1],
      id: failedMatch[2],
      error: extractError(output)
    };
  }

  return null;
}

/**
 * Extract metrics block from output
 * @private
 */
function extractMetrics(output) {
  const metricsMatch = output.match(/METRICS:\s*(\{[\s\S]*?\})/);
  if (metricsMatch) {
    try {
      return { metrics: JSON.parse(metricsMatch[1]) };
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Extract artifacts block from output
 * @private
 */
function extractArtifacts(output) {
  const artifactsMatch = output.match(/ARTIFACTS:\s*(\[[\s\S]*?\])/);
  if (artifactsMatch) {
    try {
      return { artifacts: JSON.parse(artifactsMatch[1]) };
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Extract summary from output
 * @private
 */
function extractSummary(output) {
  const summaryMatch = output.match(/SUMMARY:\s*(.+?)(?:\n|$)/);
  if (summaryMatch) {
    return { summary: summaryMatch[1].trim() };
  }
  return {};
}

/**
 * Extract blocker from output
 * @private
 */
function extractBlocker(output) {
  const blockerMatch = output.match(/BLOCKER:\s*(.+?)(?:\n|$)/);
  return blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker';
}

/**
 * Extract suggested action from output
 * @private
 */
function extractSuggestedAction(output) {
  const actionMatch = output.match(/SUGGESTED_ACTION:\s*(.+?)(?:\n|$)/);
  return actionMatch ? actionMatch[1].trim() : 'Manual intervention required';
}

/**
 * Extract error from output
 * @private
 */
function extractError(output) {
  const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);
  return errorMatch ? errorMatch[1].trim() : 'Unknown error';
}

/**
 * Format spawn message for agent prompt
 *
 * @param {Object} spawnMessage - Spawn message object
 * @returns {string} Formatted prompt text
 */
export function formatSpawnPrompt(spawnMessage) {
  const { context } = spawnMessage;

  let prompt = `SPAWN_${spawnMessage.level}: ${context.child_id}\n`;
  prompt += `TITLE: ${context.title}\n`;
  prompt += `SCOPE: ${context.scope}\n`;

  if (context.parent_id) {
    prompt += `PARENT: ${context.parent_id}\n`;
  }

  if (context.token_budget) {
    prompt += `TOKEN_BUDGET: ${context.token_budget}\n`;
  }

  if (context.dependencies && context.dependencies.length > 0) {
    prompt += `DEPENDENCIES: ${context.dependencies.join(', ')}\n`;
  }

  if (Object.keys(context.constraints).length > 0) {
    prompt += `CONSTRAINTS: ${JSON.stringify(context.constraints, null, 2)}\n`;
  }

  return prompt;
}

/**
 * Format completion message for output
 *
 * @param {Object} completeMessage - Complete message object
 * @returns {string} Formatted output text
 */
export function formatCompleteOutput(completeMessage) {
  const levelName = completeMessage.level.toUpperCase();

  let output = `${levelName}_COMPLETE: ${completeMessage.id}\n`;
  output += `STATUS: ${completeMessage.status}\n`;

  if (completeMessage.metrics) {
    output += `METRICS: ${JSON.stringify(completeMessage.metrics, null, 2)}\n`;
  }

  if (completeMessage.artifacts && completeMessage.artifacts.length > 0) {
    output += `ARTIFACTS: ${JSON.stringify(completeMessage.artifacts, null, 2)}\n`;
  }

  if (completeMessage.summary) {
    output += `SUMMARY: ${completeMessage.summary}\n`;
  }

  return output;
}

/**
 * Format blocked message for output
 *
 * @param {Object} blockedMessage - Blocked message object
 * @returns {string} Formatted output text
 */
export function formatBlockedOutput(blockedMessage) {
  const levelName = blockedMessage.level.toUpperCase();

  let output = `${levelName}_BLOCKED: ${blockedMessage.id}\n`;
  output += `STATUS: ${blockedMessage.status}\n`;
  output += `BLOCKER: ${blockedMessage.blocker}\n`;
  output += `SUGGESTED_ACTION: ${blockedMessage.suggested_action}\n`;

  return output;
}

/**
 * Format failed message for output
 *
 * @param {Object} failedMessage - Failed message object
 * @returns {string} Formatted output text
 */
export function formatFailedOutput(failedMessage) {
  const levelName = failedMessage.level.toUpperCase();

  let output = `${levelName}_FAILED: ${failedMessage.id}\n`;
  output += `STATUS: ${failedMessage.status}\n`;
  output += `ERROR: ${failedMessage.error}\n`;

  if (failedMessage.attempted && failedMessage.attempted.length > 0) {
    output += `ATTEMPTED: ${failedMessage.attempted.join(', ')}\n`;
  }

  return output;
}
