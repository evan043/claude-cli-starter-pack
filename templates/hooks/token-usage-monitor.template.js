/**
 * Token Usage Monitor Hook
 *
 * Tracks cumulative token usage across the session.
 * Auto-respawn warning at 90% of context window.
 * Provides real-time token consumption feedback.
 *
 * Event: PostToolUse
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  context_limit: 200000,           // Estimated context window
  warning_threshold: 0.75,         // Warn at 75%
  critical_threshold: 0.90,        // Critical at 90%
  auto_compact_suggestion: true,   // Suggest compaction at critical
  session_timeout_ms: 300000,      // 5 minutes
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const STATE_PATH = path.join(process.cwd(), '.claude', 'config', 'token-usage-state.json');

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.token_usage || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Load state
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch (e) {
    // Fresh state
  }
  return {
    session_id: null,
    session_start: null,
    total_input_chars: 0,
    total_output_chars: 0,
    estimated_tokens: 0,
    tool_calls: 0,
    last_activity: null,
    warnings_shown: 0,
  };
}

/**
 * Save state
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    // Silent
  }
}

/**
 * Estimate tokens from text (rough approximation)
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Average ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Generate session ID
 */
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Main hook handler
 */
module.exports = async function tokenUsageMonitor(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();
    let state = loadState();
    const now = Date.now();

    // Check for new session
    if (!state.session_start || (now - state.last_activity) > config.session_timeout_ms) {
      state = {
        session_id: generateSessionId(),
        session_start: now,
        total_input_chars: 0,
        total_output_chars: 0,
        estimated_tokens: 0,
        tool_calls: 0,
        last_activity: now,
        warnings_shown: 0,
      };
    }

    // Parse hook input
    let inputChars = 0;
    let outputChars = 0;

    try {
      const input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

      // Count input characters
      if (input.tool_input) {
        const inputStr = typeof input.tool_input === 'string'
          ? input.tool_input
          : JSON.stringify(input.tool_input);
        inputChars = inputStr.length;
      }

      // Count output characters
      if (input.tool_output) {
        const outputStr = typeof input.tool_output === 'string'
          ? input.tool_output
          : JSON.stringify(input.tool_output);
        outputChars = outputStr.length;
      }
    } catch (e) {
      // Skip counting on error
    }

    // Update totals
    state.total_input_chars += inputChars;
    state.total_output_chars += outputChars;
    state.tool_calls++;
    state.last_activity = now;

    // Estimate tokens
    const totalChars = state.total_input_chars + state.total_output_chars;
    state.estimated_tokens = estimateTokens(totalChars);

    // Calculate usage percentage
    const usagePercent = state.estimated_tokens / config.context_limit;

    // Check thresholds
    if (usagePercent >= config.critical_threshold) {
      if (state.warnings_shown < 3) { // Don't spam
        console.log(`[token-usage-monitor] CRITICAL: ${(usagePercent * 100).toFixed(1)}% of context used`);
        console.log(`[token-usage-monitor] Estimated tokens: ${formatNumber(state.estimated_tokens)}`);
        if (config.auto_compact_suggestion) {
          console.log('[token-usage-monitor] Consider using /context-audit or starting a new session');
        }
        state.warnings_shown++;
      }
    } else if (usagePercent >= config.warning_threshold) {
      if (state.warnings_shown < 2) {
        console.log(`[token-usage-monitor] WARNING: ${(usagePercent * 100).toFixed(1)}% of context used`);
        state.warnings_shown++;
      }
    }

    saveState(state);

    return approve();
  } catch (error) {
    console.error(`[token-usage-monitor] Error: ${error.message}`);
    return approve();
  }
};
