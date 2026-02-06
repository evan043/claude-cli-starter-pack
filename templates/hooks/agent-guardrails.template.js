/**
 * Agent Guardrails Hook
 *
 * PreToolUse hook that enforces two hard limits on the Task tool:
 *
 * 1. PARALLEL AGENT LIMIT — Blocks Task tool if N+ agents are already active.
 *    Reads .claude/orchestrator/state.json to get the deterministic count.
 *    When blocked, instructs Claude to compact context before retrying.
 *
 * 2. BACKGROUND TASK BLOCKER — Blocks any Task call with run_in_background: true.
 *    Background agents are invisible to the orchestrator state tracker
 *    and cannot be reliably monitored, so they are unconditionally blocked.
 *
 * WHY PreToolUse:
 *   - SubagentStart/SubagentStop are observational — they CANNOT block execution.
 *   - PreToolUse is the ONLY hook type that can return { continue: false }
 *     to prevent a tool from running.
 *   - We match on tool_name "Task" to intercept agent spawning before it happens.
 *
 * STATE FILE: .claude/orchestrator/state.json
 *   This is the same state file used by hierarchy-validator, agent-error-recovery,
 *   subagent-context-injector, and orchestrator-enforcer. The activeAgents[] array
 *   is maintained by those hooks on SubagentStart/SubagentStop events.
 *
 * FALLBACK: If the state file doesn't exist or can't be read, the hook
 *   allows the operation (fail-open). This avoids blocking legitimate work
 *   when orchestration isn't active.
 *
 * Event: PreToolUse
 * Matcher: Task
 * Priority: {{hooks.priorities.enforcement}}
 */

const fs = require('fs');
const path = require('path');

// ── Configuration (populated from tech-stack.json) ─────────────────────────────

const CONFIG = {
  // Maximum number of concurrent agents before blocking
  maxParallelAgents: {{agentGuardrails.maxParallelAgents}},

  // Path to orchestrator state (relative to project root)
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',

  // Path to guardrails-specific tracking file
  trackingFile: '.claude/hooks/cache/agent-guardrails-state.json',

  // Whether to block background tasks unconditionally
  blockBackgroundTasks: {{agentGuardrails.blockBackgroundTasks}},
};

// ── State Management ───────────────────────────────────────────────────────────

/**
 * Load orchestrator state from disk.
 * Returns null if file doesn't exist or is unreadable (fail-open).
 */
function loadOrchestratorState() {
  const statePath = path.join(process.cwd(), CONFIG.stateDir, CONFIG.stateFile);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load guardrails tracking state.
 * This is our own tracking that persists across sessions where
 * orchestrator state may not be initialized.
 */
function loadTrackingState() {
  const trackingPath = path.join(process.cwd(), CONFIG.trackingFile);

  if (!fs.existsSync(trackingPath)) {
    return {
      activeAgentCount: 0,
      blockedAttempts: [],
      lastUpdated: null,
    };
  }

  try {
    return JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
  } catch {
    return {
      activeAgentCount: 0,
      blockedAttempts: [],
      lastUpdated: null,
    };
  }
}

/**
 * Save guardrails tracking state.
 */
function saveTrackingState(state) {
  const trackingPath = path.join(process.cwd(), CONFIG.trackingFile);
  const trackingDir = path.dirname(trackingPath);

  if (!fs.existsSync(trackingDir)) {
    fs.mkdirSync(trackingDir, { recursive: true });
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(trackingPath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Count active agents from orchestrator state.
 * Only counts agents with status 'running' or without an explicit status.
 */
function countActiveAgents(orchState) {
  if (!orchState || !Array.isArray(orchState.activeAgents)) {
    return 0;
  }

  return orchState.activeAgents.filter(
    (a) => !a.status || a.status === 'running' || a.status === 'active'
  ).length;
}

// ── Hook Logic ─────────────────────────────────────────────────────────────────

/**
 * Check if the Task tool input requests a background task.
 *
 * The Task tool accepts run_in_background as a boolean parameter.
 * We inspect the raw tool_input from stdin to detect this.
 */
function isBackgroundRequest(toolInput) {
  if (!toolInput) return false;
  return toolInput.run_in_background === true;
}

/**
 * Format the block message for parallel limit exceeded.
 */
function formatParallelLimitMessage(activeCount, maxAllowed) {
  return `[AGENT GUARDRAIL] Parallel agent limit reached.

Active agents: ${activeCount}/${maxAllowed}
Action: BLOCKED — cannot spawn additional agent.

To proceed, you must:
1. Wait for existing agents to complete (check with /phase-track or read .claude/orchestrator/state.json)
2. Or compact/reduce context to free capacity

Do NOT retry this Task call until active agent count drops below ${maxAllowed}.
Current active agents are tracked in .claude/orchestrator/state.json → activeAgents[]`;
}

/**
 * Format the block message for background task requests.
 */
function formatBackgroundBlockMessage() {
  return `[AGENT GUARDRAIL] Background tasks are blocked.

run_in_background: true is not allowed.
Background agents cannot be tracked by the orchestrator state system,
which means their completion, errors, and resource usage are invisible.

To proceed:
- Remove run_in_background: true from the Task call
- Run the agent in the foreground so its lifecycle is tracked
- If you need parallelism, use multiple foreground Task calls (up to ${CONFIG.maxParallelAgents} concurrent)`;
}

/**
 * Record a blocked attempt for audit trail.
 */
function recordBlockedAttempt(tracking, reason, toolInput) {
  tracking.blockedAttempts.push({
    timestamp: new Date().toISOString(),
    reason,
    description: toolInput?.description || 'unknown',
    subagentType: toolInput?.subagent_type || 'unknown',
  });

  // Keep only the last 20 blocked attempts to avoid unbounded growth
  if (tracking.blockedAttempts.length > 20) {
    tracking.blockedAttempts = tracking.blockedAttempts.slice(-20);
  }
}

// ── Main Entry Point ───────────────────────────────────────────────────────────

/**
 * Main hook handler.
 *
 * Claude Code hooks receive tool context via stdin as JSON:
 * {
 *   tool_name: "Task",
 *   tool_input: { description, prompt, subagent_type, run_in_background, ... }
 * }
 *
 * To BLOCK: write JSON to stdout with { "decision": "block", "reason": "..." }
 * To ALLOW: exit silently (exit code 0, no stdout) or write { "decision": "allow" }
 */
async function main() {
  // Read stdin
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    // No stdin — allow (fail-open)
    return;
  }

  let toolData;
  try {
    toolData = JSON.parse(input);
  } catch {
    // Invalid JSON — allow (fail-open)
    return;
  }

  // Only process Task tool calls
  const toolName = toolData.tool_name || toolData.name;
  if (toolName !== 'Task') {
    return;
  }

  const toolInput = toolData.tool_input || toolData.input || {};
  const tracking = loadTrackingState();

  // ── Check 1: Background task blocker ──────────────────────────────────────

  if (CONFIG.blockBackgroundTasks && isBackgroundRequest(toolInput)) {
    recordBlockedAttempt(tracking, 'background_task', toolInput);
    saveTrackingState(tracking);

    const result = {
      decision: 'block',
      reason: formatBackgroundBlockMessage(),
    };
    process.stdout.write(JSON.stringify(result));
    return;
  }

  // ── Check 2: Parallel agent limit ─────────────────────────────────────────

  const orchState = loadOrchestratorState();
  const activeCount = countActiveAgents(orchState);

  // Update tracking with current count from orchestrator
  tracking.activeAgentCount = activeCount;

  if (activeCount >= CONFIG.maxParallelAgents) {
    recordBlockedAttempt(tracking, 'parallel_limit', toolInput);
    saveTrackingState(tracking);

    const result = {
      decision: 'block',
      reason: formatParallelLimitMessage(activeCount, CONFIG.maxParallelAgents),
    };
    process.stdout.write(JSON.stringify(result));
    return;
  }

  // ── All checks passed — allow ─────────────────────────────────────────────

  saveTrackingState(tracking);
  // Exit silently to allow the operation
}

main().catch((err) => {
  // On any unexpected error, fail-open (allow the operation)
  // Log to stderr so it doesn't interfere with stdout protocol
  process.stderr.write(`[agent-guardrails] Error: ${err.message}\n`);
});
