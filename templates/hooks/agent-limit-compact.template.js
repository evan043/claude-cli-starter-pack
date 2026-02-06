/**
 * Hook: Limit parallel agents and auto-compact context
 *
 * Prevents runaway agent spawning and forces context compaction
 * when too many agents are active or context grows large.
 *
 * Rules:
 * - Maximum 3 parallel agents at any time
 * - If agent count >= 3, block new agent spawning
 * - Log active agent count for monitoring
 *
 * This ships with the CCASP NPM package.
 *
 * Configuration in .claude/settings.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [{
 *       "matcher": "Task",
 *       "hooks": [".claude/hooks/agent-limit-compact.js"]
 *     }]
 *   }
 * }
 */

// Track active agents (in-memory, resets on CLI restart)
let activeAgentCount = 0;
const MAX_AGENTS = 3;

export default {
  name: 'agent-limit-compact',
  event: 'PreToolUse',
  matcher: /Task/,

  async handler(event) {
    // Check if this is spawning a new agent (not resuming)
    const isNewAgent = !event?.input?.resume;

    if (isNewAgent) {
      activeAgentCount++;

      if (activeAgentCount > MAX_AGENTS) {
        activeAgentCount--; // Revert the increment
        console.warn(
          `[agent-limit] Blocked: ${activeAgentCount}/${MAX_AGENTS} agents active. ` +
          `Wait for an agent to complete before starting a new one.`
        );
        return {
          block: true,
          message: `Maximum ${MAX_AGENTS} parallel agents allowed. ${activeAgentCount} currently active. Wait for completion or use /ui-test to run tests directly.`,
        };
      }

      console.log(`[agent-limit] Agent ${activeAgentCount}/${MAX_AGENTS} starting`);
    }

    return { allow: true };
  },

  // Called when an agent completes (if supported)
  async onComplete() {
    if (activeAgentCount > 0) {
      activeAgentCount--;
    }
    console.log(`[agent-limit] Agent completed. ${activeAgentCount}/${MAX_AGENTS} active.`);
  },
};
