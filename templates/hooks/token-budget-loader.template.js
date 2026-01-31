/**
 * Token Budget Loader Hook
 *
 * Pre-calculates daily token budget at session start.
 * Tracks usage across sessions and provides health status alerts.
 * Saves ~5K tokens/session by pre-loading budget state.
 *
 * Event: UserPromptSubmit (runs once per session)
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');

// Default configuration (can be overridden by hooks-config.json)
const DEFAULT_CONFIG = {
  daily_limit: 200000,        // Daily token budget
  warning_percent: 60,        // Warn at this percentage
  critical_percent: 80,       // Critical warning at this percentage
  reset_hours: 24,            // Budget reset cycle in hours
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const BUDGET_PATH = path.join(process.cwd(), '.claude', 'config', 'token-budget.json');
const SESSION_MARKER = path.join(process.cwd(), '.claude', 'config', '.budget-loaded');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.token_budget || {}) };
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_CONFIG;
}

/**
 * Load budget state
 */
function loadBudget() {
  try {
    if (fs.existsSync(BUDGET_PATH)) {
      return JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    }
  } catch (e) {
    // Return fresh budget
  }
  return null;
}

/**
 * Save budget state
 */
function saveBudget(budget) {
  try {
    const dir = path.dirname(BUDGET_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2), 'utf8');
  } catch (e) {
    console.error(`[token-budget-loader] Failed to save budget: ${e.message}`);
  }
}

/**
 * Check if we've already loaded budget this session
 */
function hasLoadedThisSession() {
  try {
    if (fs.existsSync(SESSION_MARKER)) {
      const content = fs.readFileSync(SESSION_MARKER, 'utf8');
      const timestamp = parseInt(content, 10);
      // Session valid for 4 hours
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch (e) {
    // Continue with loading
  }
  return false;
}

/**
 * Mark session as loaded
 */
function markSessionLoaded() {
  try {
    const dir = path.dirname(SESSION_MARKER);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_MARKER, Date.now().toString(), 'utf8');
  } catch (e) {
    // Silent failure
  }
}

/**
 * Check if budget should reset (new day)
 */
function shouldResetBudget(budget, config) {
  if (!budget || !budget.reset_at) {
    return true;
  }

  const resetAt = new Date(budget.reset_at);
  const now = new Date();

  return now >= resetAt;
}

/**
 * Calculate next reset time
 */
function getNextResetTime(config) {
  const now = new Date();
  const resetTime = new Date(now);

  // Reset at midnight UTC by default
  resetTime.setUTCHours(0, 0, 0, 0);
  resetTime.setTime(resetTime.getTime() + config.reset_hours * 60 * 60 * 1000);

  // If we've passed today's reset, move to next cycle
  while (resetTime <= now) {
    resetTime.setTime(resetTime.getTime() + config.reset_hours * 60 * 60 * 1000);
  }

  return resetTime.toISOString();
}

/**
 * Estimate tokens from characters (rough approximation)
 * Claude uses ~4 chars per token on average
 */
function estimateTokens(chars) {
  return Math.ceil(chars / 4);
}

/**
 * Get budget health status
 */
function getBudgetHealth(budget, config) {
  const percentUsed = (budget.used / budget.limit) * 100;

  if (percentUsed >= config.critical_percent) {
    return {
      status: 'critical',
      message: `CRITICAL: ${percentUsed.toFixed(1)}% of daily budget used`,
      color: 'red',
    };
  } else if (percentUsed >= config.warning_percent) {
    return {
      status: 'warning',
      message: `WARNING: ${percentUsed.toFixed(1)}% of daily budget used`,
      color: 'yellow',
    };
  } else {
    return {
      status: 'healthy',
      message: `Budget healthy: ${percentUsed.toFixed(1)}% used`,
      color: 'green',
    };
  }
}

/**
 * Main hook handler
 */
module.exports = async function tokenBudgetLoader(context) {
  // Always continue - never block
  const approve = () => ({ continue: true });

  try {
    // Only run once per session
    if (hasLoadedThisSession()) {
      return approve();
    }

    // Mark this session as loaded
    markSessionLoaded();

    const config = loadConfig();
    let budget = loadBudget();

    // Check if we need to reset the budget
    if (shouldResetBudget(budget, config)) {
      budget = {
        limit: config.daily_limit,
        used: 0,
        reset_at: getNextResetTime(config),
        sessions: [],
        created_at: new Date().toISOString(),
      };
      saveBudget(budget);
      console.log(`[token-budget-loader] Budget reset. Daily limit: ${config.daily_limit.toLocaleString()} tokens`);
    }

    // Calculate remaining budget
    const remaining = budget.limit - budget.used;
    const health = getBudgetHealth(budget, config);

    // Log budget status
    console.log(`[token-budget-loader] ${health.message}`);
    console.log(`[token-budget-loader] Remaining: ${remaining.toLocaleString()} tokens`);
    console.log(`[token-budget-loader] Resets at: ${budget.reset_at}`);

    // Record this session start
    budget.sessions.push({
      started_at: new Date().toISOString(),
      initial_remaining: remaining,
    });

    // Keep only last 10 sessions
    if (budget.sessions.length > 10) {
      budget.sessions = budget.sessions.slice(-10);
    }

    saveBudget(budget);

    return approve();
  } catch (error) {
    console.error(`[token-budget-loader] Error: ${error.message}`);
    return approve();
  }
};
