/**
 * Autonomous Decision Logger Hook
 *
 * Creates JSONL audit trail for all agent decisions.
 * Tracks tool calls, file modifications, and agent spawns.
 * Essential for debugging and compliance.
 *
 * Event: PostToolUse
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  log_tools: ['Edit', 'Write', 'Bash', 'Task'],  // Tools to log
  log_all_tools: false,                           // Override: log everything
  include_output: false,                          // Include tool output (can be large)
  max_output_chars: 500,                          // Truncate output to this length
  rotate_size_mb: 10,                             // Rotate log at this size
  retention_days: 30,                             // Keep logs for N days
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const LOG_DIR = path.join(process.cwd(), '.claude', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'decisions.jsonl');

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.decision_logger || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Check if log needs rotation
 */
function checkRotation(config) {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB >= config.rotate_size_mb) {
        // Rotate: rename current to timestamped backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(LOG_DIR, `decisions-${timestamp}.jsonl`);
        fs.renameSync(LOG_FILE, backupPath);
        console.log(`[decision-logger] Rotated log to ${path.basename(backupPath)}`);
      }
    }
  } catch (e) {
    // Continue without rotation
  }
}

/**
 * Clean old logs
 */
function cleanOldLogs(config) {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const cutoff = Date.now() - (config.retention_days * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.startsWith('decisions-') && file.endsWith('.jsonl')) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          console.log(`[decision-logger] Cleaned old log: ${file}`);
        }
      }
    }
  } catch (e) {
    // Continue without cleaning
  }
}

/**
 * Should this tool be logged?
 */
function shouldLog(toolName, config) {
  if (config.log_all_tools) return true;

  return config.log_tools.some(t =>
    toolName === t || toolName.startsWith(t)
  );
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLen) {
  if (!str) return str;
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + `... [truncated ${str.length - maxLen} chars]`;
}

/**
 * Write log entry
 */
function writeLog(entry) {
  try {
    ensureLogDir();
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {
    console.error(`[decision-logger] Failed to write log: ${e.message}`);
  }
}

/**
 * Main hook handler
 */
module.exports = async function autonomousDecisionLogger(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();

    if (!config.enabled) {
      return approve();
    }

    // Parse hook input
    let input;
    try {
      input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
    } catch (e) {
      return approve();
    }

    const { tool_name, tool_input, tool_output } = input;

    if (!tool_name) {
      return approve();
    }

    // Check if we should log this tool
    if (!shouldLog(tool_name, config)) {
      return approve();
    }

    // Check rotation periodically
    if (Math.random() < 0.1) { // 10% chance to check
      checkRotation(config);
      cleanOldLogs(config);
    }

    // Build log entry
    const entry = {
      timestamp: new Date().toISOString(),
      tool: tool_name,
      input: tool_input,
      success: true, // PostToolUse means it succeeded
      session: process.env.CLAUDE_SESSION_ID || 'unknown',
    };

    // Optionally include output
    if (config.include_output && tool_output) {
      const outputStr = typeof tool_output === 'string'
        ? tool_output
        : JSON.stringify(tool_output);
      entry.output = truncate(outputStr, config.max_output_chars);
    }

    // Add file path for file operations
    if (tool_input) {
      if (tool_input.file_path) {
        entry.file = tool_input.file_path;
      } else if (tool_input.path) {
        entry.file = tool_input.path;
      }
    }

    // Write log
    writeLog(entry);

    return approve();
  } catch (error) {
    console.error(`[decision-logger] Error: ${error.message}`);
    return approve();
  }
};
