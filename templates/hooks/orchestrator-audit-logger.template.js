/**
 * Orchestrator Audit Logger Hook
 *
 * Logs all agent actions to an audit file for debugging,
 * compliance, and analysis.
 *
 * Event: All (PreToolUse, PostToolUse, SubagentStart, SubagentStop)
 * Triggers: On all orchestration-related events
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  logDir: '.claude/logs',
  logFile: 'orchestrator-audit.jsonl',
  maxLogSize: 10 * 1024 * 1024, // 10MB
  rotateOnSize: true,
  logEvents: ['PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'UserPromptSubmit'],
  excludeTools: [], // Tools to exclude from logging
  truncateOutput: 5000, // Max chars for outputs
  includeMetadata: true,
};

/**
 * Ensure log directory exists
 */
function ensureLogDir(projectRoot) {
  const logDir = path.join(projectRoot, CONFIG.logDir);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * Get log file path
 */
function getLogPath(projectRoot) {
  const logDir = ensureLogDir(projectRoot);
  return path.join(logDir, CONFIG.logFile);
}

/**
 * Check if log rotation is needed
 */
function needsRotation(logPath) {
  if (!CONFIG.rotateOnSize) return false;
  if (!fs.existsSync(logPath)) return false;

  const stats = fs.statSync(logPath);
  return stats.size >= CONFIG.maxLogSize;
}

/**
 * Rotate log file
 */
function rotateLog(logPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rotatedPath = logPath.replace('.jsonl', `-${timestamp}.jsonl`);

  fs.renameSync(logPath, rotatedPath);

  // Optionally compress old logs
  // Could use zlib here for compression

  return rotatedPath;
}

/**
 * Truncate long strings
 */
function truncate(str, maxLen) {
  if (!str) return str;
  if (typeof str !== 'string') str = JSON.stringify(str);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `... [truncated ${str.length - maxLen} chars]`;
}

/**
 * Build log entry
 */
function buildLogEntry(context) {
  const {
    hookType,
    tool,
    toolInput,
    toolOutput,
    agentId,
    agentPrompt,
    agentDescription,
    agentOutput,
    prompt,
    projectRoot,
  } = context;

  const entry = {
    timestamp: new Date().toISOString(),
    event: hookType,
    sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
  };

  // Add event-specific data
  switch (hookType) {
    case 'PreToolUse':
    case 'PostToolUse':
      entry.tool = tool;
      entry.input = toolInput ? {
        file_path: toolInput.file_path,
        command: truncate(toolInput.command, 500),
        // Omit large content
      } : null;
      if (hookType === 'PostToolUse' && toolOutput) {
        entry.outputPreview = truncate(toolOutput, CONFIG.truncateOutput);
        entry.outputLength = toolOutput?.length;
      }
      break;

    case 'SubagentStart':
      entry.agentId = agentId;
      entry.description = truncate(agentDescription, 200);
      entry.promptPreview = truncate(agentPrompt, 500);
      break;

    case 'SubagentStop':
      entry.agentId = agentId;
      entry.outputPreview = truncate(agentOutput, CONFIG.truncateOutput);
      entry.outputLength = agentOutput?.length;
      // Check for completion signals
      if (agentOutput) {
        entry.completionSignal = agentOutput.match(/TASK_(COMPLETE|FAILED|BLOCKED):\s*\S+/)?.[0];
      }
      break;

    case 'UserPromptSubmit':
      entry.promptPreview = truncate(prompt, 500);
      entry.promptLength = prompt?.length;
      break;
  }

  // Add metadata if configured
  if (CONFIG.includeMetadata) {
    entry.metadata = {
      cwd: process.cwd(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  return entry;
}

/**
 * Write log entry
 */
function writeLog(logPath, entry) {
  // Check for rotation
  if (needsRotation(logPath)) {
    rotateLog(logPath);
  }

  // Append entry as JSON line
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}

/**
 * Load recent logs
 */
function loadRecentLogs(logPath, limit = 100) {
  if (!fs.existsSync(logPath)) return [];

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);

  return lines.slice(-limit).map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Get audit summary
 */
function getAuditSummary(logPath, since = null) {
  const logs = loadRecentLogs(logPath, 1000);

  const filtered = since
    ? logs.filter(l => new Date(l.timestamp) > new Date(since))
    : logs;

  const summary = {
    totalEvents: filtered.length,
    byEvent: {},
    byTool: {},
    completions: {
      completed: 0,
      failed: 0,
      blocked: 0,
    },
    timeRange: {
      start: filtered[0]?.timestamp,
      end: filtered[filtered.length - 1]?.timestamp,
    },
  };

  filtered.forEach(log => {
    // Count by event type
    summary.byEvent[log.event] = (summary.byEvent[log.event] || 0) + 1;

    // Count by tool
    if (log.tool) {
      summary.byTool[log.tool] = (summary.byTool[log.tool] || 0) + 1;
    }

    // Count completions
    if (log.completionSignal) {
      if (log.completionSignal.includes('COMPLETE')) summary.completions.completed++;
      else if (log.completionSignal.includes('FAILED')) summary.completions.failed++;
      else if (log.completionSignal.includes('BLOCKED')) summary.completions.blocked++;
    }
  });

  return summary;
}

/**
 * Main hook handler
 */
async function orchestratorAuditLoggerHook(context) {
  const { hookType, tool, projectRoot } = context;

  // Check if this event should be logged
  if (!CONFIG.logEvents.includes(hookType)) {
    return { continue: true };
  }

  // Check tool exclusions
  if (tool && CONFIG.excludeTools.includes(tool)) {
    return { continue: true };
  }

  // Build and write log entry
  try {
    const logPath = getLogPath(projectRoot);
    const entry = buildLogEntry(context);
    writeLog(logPath, entry);

    // Return with log info (only for debugging, usually omit message)
    return {
      continue: true,
      metadata: {
        auditLogged: true,
        logPath: CONFIG.logFile,
        entryTimestamp: entry.timestamp,
      },
    };
  } catch (error) {
    // Logging should never block operations
    return {
      continue: true,
      metadata: {
        auditLogged: false,
        error: error.message,
      },
    };
  }
}

module.exports = orchestratorAuditLoggerHook;

// Export for testing and utilities
module.exports.loadRecentLogs = loadRecentLogs;
module.exports.getAuditSummary = getAuditSummary;
module.exports.CONFIG = CONFIG;
