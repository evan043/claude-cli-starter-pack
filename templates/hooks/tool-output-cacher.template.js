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
// UPDATED: More aggressive context safety thresholds
const DEFAULT_CONFIG = {
  threshold_chars: 1500,           // Cache outputs larger than this (lowered from 2048)
  warning_threshold: 80000,        // Warn at 80K (lowered from 100K) - ~40% of safe zone
  critical_threshold: 120000,      // Critical at 120K (lowered from 150K) - ~60% of safe zone
  compact_suggestion_threshold: 140000, // Strongly suggest /compact at this level
  session_timeout_ms: 300000,      // 5 minutes - consider new session
  cacheable_tools: ['Bash', 'Read', 'Glob', 'Grep', 'Task', 'TaskOutput'], // Added Task tools
  bypass_tools: [],                // No bypasses - monitor everything
  truncate_task_output: true,      // Truncate TaskOutput returns
  max_task_summary_chars: 500,     // Max chars from Task tool returns
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
  // Skip bypass tools (now empty by default - monitor everything)
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
 * Extract AOP summary from Task output (Context Safety)
 * If output follows AOP format, extract only the summary
 */
function extractAOPSummary(output, maxChars) {
  // Check for AOP format
  const summaryMatch = output.match(/\[AOP:SUMMARY\]([\s\S]*?)\[AOP:/);
  const fileMatch = output.match(/\[AOP:DETAILS_FILE\]\s*(\S+)/);
  const statusMatch = output.match(/\[AOP:STATUS\]\s*(\w+)/);

  if (summaryMatch) {
    // AOP-compliant output - extract summary only
    let summary = summaryMatch[1].trim().slice(0, maxChars);
    if (fileMatch) {
      summary += `\n[Details: ${fileMatch[1]}]`;
    }
    if (statusMatch) {
      summary += `\n[Status: ${statusMatch[1]}]`;
    }
    return {
      isAOP: true,
      summary: summary,
      detailsFile: fileMatch ? fileMatch[1] : null
    };
  }

  // Not AOP format - truncate with indicator
  if (output.length > maxChars) {
    return {
      isAOP: false,
      summary: output.slice(0, maxChars) + `\n\n[...truncated ${output.length - maxChars} chars. Full output cached.]`,
      detailsFile: null
    };
  }

  return {
    isAOP: false,
    summary: output,
    detailsFile: null
  };
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

    // Check thresholds and warn with actionable guidance
    if (state.cumulative_chars >= config.compact_suggestion_threshold) {
      console.log(`\n[tool-output-cacher] ⛔ CONTEXT LIMIT APPROACHING`);
      console.log(`   Session output: ${(state.cumulative_chars / 1000).toFixed(1)}KB`);
      console.log(`   STRONGLY RECOMMEND: Run /compact now to prevent context overflow`);
      console.log(`   Cached outputs: ${state.cached_count} (saved from context)\n`);
    } else if (state.cumulative_chars >= config.critical_threshold) {
      console.log(`\n[tool-output-cacher] 🔴 CRITICAL: ${(state.cumulative_chars / 1000).toFixed(1)}KB output`);
      console.log(`   Consider running /compact soon. Progress is saved to files.\n`);
    } else if (state.cumulative_chars >= config.warning_threshold) {
      console.log(`[tool-output-cacher] ⚠️ Context: ${(state.cumulative_chars / 1000).toFixed(1)}KB (cached: ${state.cached_count})`);
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
