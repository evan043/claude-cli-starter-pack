/**
 * Tool Output Cacher Hook
 *
 * Caches large tool outputs (>2KB) to reduce context consumption.
 * Monitors cumulative session output and warns at thresholds.
 * Saves ~500 tokens per large output by storing in cache files.
 *
 * Event: PostToolUse
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Default configuration (can be overridden by hooks-config.json)
const DEFAULT_CONFIG = {
  threshold_chars: 2048,           // Cache outputs larger than this
  warning_threshold: 100000,       // Warn when session total exceeds this
  critical_threshold: 150000,      // Critical warning at this level
  session_timeout_ms: 300000,      // 5 minutes - consider new session
  cacheable_tools: ['Bash', 'Read', 'Glob', 'Grep'],
  bypass_tools: ['Task', 'TaskOutput'],
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const CACHE_DIR = path.join(process.cwd(), '.claude', 'cache', 'tool-outputs');
const STATE_FILE = path.join(process.cwd(), '.claude', 'config', 'tool-output-cacher-state.json');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.output_caching || {}) };
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_CONFIG;
}

/**
 * Load session state
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Return fresh state
  }
  return {
    session_id: null,
    session_start: null,
    cumulative_chars: 0,
    cached_count: 0,
    last_activity: null,
  };
}

/**
 * Save session state
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    // Silent failure - don't block tool execution
  }
}

/**
 * Generate cache key for output
 */
function generateCacheKey(toolName, output) {
  const hash = crypto.createHash('md5').update(output.slice(0, 500)).digest('hex').slice(0, 8);
  return `${toolName.toLowerCase()}-${Date.now()}-${hash}`;
}

/**
 * Cache output to file
 */
function cacheOutput(key, output, summary) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cachePath = path.join(CACHE_DIR, `${key}.txt`);
    fs.writeFileSync(cachePath, output, 'utf8');

    return {
      cached: true,
      path: cachePath,
      summary: summary,
    };
  } catch (e) {
    return { cached: false, error: e.message };
  }
}

/**
 * Generate summary of large output
 */
function generateSummary(output, maxLines = 15) {
  const lines = output.split('\n');
  const totalLines = lines.length;
  const totalChars = output.length;

  // Take first N lines as preview
  const preview = lines.slice(0, maxLines).join('\n');

  return {
    preview: preview,
    total_lines: totalLines,
    total_chars: totalChars,
    truncated: totalLines > maxLines,
  };
}

/**
 * Check if tool output should be cached
 */
function shouldCache(toolName, output, config) {
  // Skip bypass tools
  if (config.bypass_tools.includes(toolName)) {
    return false;
  }

  // Check if tool is cacheable
  const isCacheable = config.cacheable_tools.some(t =>
    toolName.startsWith(t) || toolName === t
  );

  if (!isCacheable) {
    return false;
  }

  // Check size threshold
  return output.length > config.threshold_chars;
}

/**
 * Main hook handler
 */
module.exports = async function toolOutputCacher(context) {
  // Always approve - this is a PostToolUse hook for monitoring only
  const approve = () => ({ continue: true });

  try {
    // Parse hook input
    const input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
    const { tool_name, tool_input, tool_output } = input;

    if (!tool_name || !tool_output) {
      return approve();
    }

    const output = typeof tool_output === 'string' ? tool_output : JSON.stringify(tool_output);
    const config = loadConfig();

    // Load and update session state
    let state = loadState();
    const now = Date.now();

    // Check if this is a new session
    if (!state.session_start || (now - state.last_activity) > config.session_timeout_ms) {
      state = {
        session_id: crypto.randomBytes(4).toString('hex'),
        session_start: now,
        cumulative_chars: 0,
        cached_count: 0,
        last_activity: now,
      };
    }

    // Update cumulative tracking
    state.cumulative_chars += output.length;
    state.last_activity = now;

    // Check if we should cache this output
    if (shouldCache(tool_name, output, config)) {
      const summary = generateSummary(output);
      const cacheKey = generateCacheKey(tool_name, output);
      const cacheResult = cacheOutput(cacheKey, output, summary);

      if (cacheResult.cached) {
        state.cached_count++;
        console.log(`[tool-output-cacher] Cached ${tool_name} output (${output.length} chars) -> ${cacheResult.path}`);
      }
    }

    // Check thresholds and warn
    if (state.cumulative_chars >= config.critical_threshold) {
      console.log(`[tool-output-cacher] CRITICAL: Session at ${state.cumulative_chars} chars. Consider compaction.`);
    } else if (state.cumulative_chars >= config.warning_threshold) {
      console.log(`[tool-output-cacher] WARNING: Session at ${state.cumulative_chars} chars.`);
    }

    // Save state
    saveState(state);

    return approve();
  } catch (error) {
    // Always approve even on error
    console.error(`[tool-output-cacher] Error: ${error.message}`);
    return approve();
  }
};
