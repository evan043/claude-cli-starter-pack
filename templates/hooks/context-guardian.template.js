/**
 * Context Guardian Hook
 *
 * Monitors token usage and triggers appropriate actions at configured thresholds.
 * Configured via tech-stack.json tokenManagement settings.
 *
 * Event: PostToolUse (monitors after each tool execution)
 * Priority: {{hooks.priorities.lifecycle}}
 */

const fs = require('fs');
const path = require('path');

// Configuration from tech-stack.json
const CONFIG = {
  enabled: {{tokenManagement.enabled}},
  dailyBudget: {{tokenManagement.dailyBudget}},
  thresholds: {
    compact: {{tokenManagement.thresholds.compact}},
    archive: {{tokenManagement.thresholds.archive}},
    respawn: {{tokenManagement.thresholds.respawn}},
  },
  trackingFile: '{{tokenManagement.trackingFile}}',
};

/**
 * Load current token usage data
 */
function loadUsageData() {
  const trackingPath = path.join(process.cwd(), CONFIG.trackingFile);

  if (fs.existsSync(trackingPath)) {
    try {
      return JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
    } catch (error) {
      console.warn('[context-guardian] Could not parse tracking file:', error.message);
    }
  }

  // Return default usage data
  return {
    date: new Date().toISOString().split('T')[0],
    sessions: [],
    totalTokens: 0,
    currentSession: {
      id: generateSessionId(),
      startTime: new Date().toISOString(),
      tokens: 0,
      toolCalls: 0,
    },
  };
}

/**
 * Save usage data
 */
function saveUsageData(data) {
  const trackingPath = path.join(process.cwd(), CONFIG.trackingFile);
  const trackingDir = path.dirname(trackingPath);

  if (!fs.existsSync(trackingDir)) {
    fs.mkdirSync(trackingDir, { recursive: true });
  }

  fs.writeFileSync(trackingPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Generate a simple session ID
 */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate tokens from tool output
 * Rough estimation: ~4 chars per token
 */
function estimateTokens(text) {
  if (!text) return 0;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return Math.ceil(str.length / 4);
}

/**
 * Get usage percentage
 */
function getUsagePercentage(usedTokens) {
  return usedTokens / CONFIG.dailyBudget;
}

/**
 * Main hook handler
 */
module.exports = async function contextGuardian(context) {
  // Skip if disabled
  if (!CONFIG.enabled) {
    return { continue: true };
  }

  const { tool, output, error } = context;

  // Load current usage
  const usage = loadUsageData();

  // Check if we need to reset for a new day
  const today = new Date().toISOString().split('T')[0];
  if (usage.date !== today) {
    // Archive previous day
    usage.sessions.push(usage.currentSession);
    usage.date = today;
    usage.totalTokens = 0;
    usage.currentSession = {
      id: generateSessionId(),
      startTime: new Date().toISOString(),
      tokens: 0,
      toolCalls: 0,
    };
  }

  // Estimate tokens from this tool call
  const outputTokens = estimateTokens(output);
  const errorTokens = estimateTokens(error);
  const callTokens = outputTokens + errorTokens;

  // Update usage
  usage.currentSession.tokens += callTokens;
  usage.currentSession.toolCalls += 1;
  usage.totalTokens += callTokens;

  // Save updated usage
  saveUsageData(usage);

  // Calculate usage percentage
  const usagePercent = getUsagePercentage(usage.totalTokens);

  // Check thresholds and add warnings
  let message = null;

  if (usagePercent >= CONFIG.thresholds.respawn) {
    message = `⚠️ CRITICAL: Token usage at ${(usagePercent * 100).toFixed(1)}% of daily budget!
    Consider respawning session to preserve budget.
    Run /context-audit for details.`;
  } else if (usagePercent >= CONFIG.thresholds.archive) {
    message = `⚠️ WARNING: Token usage at ${(usagePercent * 100).toFixed(1)}% of daily budget.
    Consider archiving this session.
    Run /context-audit for recommendations.`;
  } else if (usagePercent >= CONFIG.thresholds.compact) {
    message = `ℹ️ Token usage at ${(usagePercent * 100).toFixed(1)}% of daily budget.
    Consider compacting context soon.`;
  }

  return {
    continue: true,
    message: message,
    // Add metadata for other hooks/tools to use
    metadata: {
      tokenUsage: {
        session: usage.currentSession.tokens,
        daily: usage.totalTokens,
        budget: CONFIG.dailyBudget,
        percentUsed: usagePercent,
        status: usagePercent >= CONFIG.thresholds.respawn
          ? 'critical'
          : usagePercent >= CONFIG.thresholds.archive
          ? 'warning'
          : usagePercent >= CONFIG.thresholds.compact
          ? 'attention'
          : 'ok',
      },
    },
  };
};
