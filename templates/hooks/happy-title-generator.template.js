/**
 * Happy Title Generator Hook
 *
 * Auto-generates session titles with format: "Issue #XX - Summary"
 * Detects GitHub issue numbers from branch names.
 * Notifies Happy daemon of title updates for mobile display.
 *
 * Event: UserPromptSubmit
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default configuration (can be overridden by hooks-config.json)
const DEFAULT_CONFIG = {
  rate_limit_ms: 30000,           // Throttle title updates to once per 30 sec
  max_summary_words: 4,           // Maximum words in title summary
  issue_pattern: 'issue-(\\d+)',  // Regex to extract issue number from branch
  common_prefixes: [              // Prefixes to remove from summaries
    'implement', 'add', 'fix', 'update', 'create',
    'refactor', 'build', 'remove', 'optimize', 'improve'
  ],
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const STATE_PATH = path.join(process.cwd(), '.claude', 'config', 'title-generator-state.json');
const HAPPY_STATE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.happy', 'daemon.state.json');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.title_generator || {}) };
    }
  } catch (e) {
    // Use defaults on error
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
    // Return fresh state
  }
  return {
    last_update: 0,
    current_title: null,
    issue_number: null,
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
    // Silent failure
  }
}

/**
 * Get current git branch
 */
function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    }).trim();
    return branch;
  } catch (e) {
    return null;
  }
}

/**
 * Extract issue number from branch name
 */
function extractIssueNumber(branch, config) {
  if (!branch) return null;

  try {
    const pattern = new RegExp(config.issue_pattern, 'i');
    const match = branch.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  } catch (e) {
    // Invalid regex pattern
  }

  // Try common patterns as fallback
  const fallbackPatterns = [
    /issue-(\d+)/i,
    /(\d+)-/,
    /#(\d+)/,
  ];

  for (const pattern of fallbackPatterns) {
    const match = branch.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Generate summary from user prompt
 */
function generateSummary(prompt, config) {
  if (!prompt) return 'New Session';

  // Clean the prompt
  let summary = prompt.trim();

  // Remove common prefixes
  const prefixPattern = new RegExp(`^(${config.common_prefixes.join('|')})\\s+`, 'i');
  summary = summary.replace(prefixPattern, '');

  // Take first N words
  const words = summary.split(/\s+/).slice(0, config.max_summary_words);
  summary = words.join(' ');

  // Capitalize first letter
  if (summary.length > 0) {
    summary = summary.charAt(0).toUpperCase() + summary.slice(1);
  }

  // Truncate if too long
  if (summary.length > 50) {
    summary = summary.substring(0, 47) + '...';
  }

  return summary || 'New Session';
}

/**
 * Format title with issue number
 */
function formatTitle(issueNumber, summary, branch) {
  let title = '';

  if (issueNumber) {
    title = `Issue #${issueNumber} - ${summary}`;
  } else {
    title = summary;
  }

  // Add branch info if available
  if (branch && branch !== 'main' && branch !== 'master') {
    const shortBranch = branch.length > 20 ? branch.substring(0, 17) + '...' : branch;
    title = `${title} | ${shortBranch}`;
  }

  return title;
}

/**
 * Notify Happy daemon of title update
 */
function notifyHappyDaemon(title) {
  try {
    if (!fs.existsSync(HAPPY_STATE_PATH)) {
      return false; // Happy daemon not running
    }

    const happyState = JSON.parse(fs.readFileSync(HAPPY_STATE_PATH, 'utf8'));

    // Update session title in daemon state
    happyState.current_session = happyState.current_session || {};
    happyState.current_session.title = title;
    happyState.current_session.updated_at = new Date().toISOString();

    // Write atomically using temp file
    const tempPath = HAPPY_STATE_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(happyState, null, 2), 'utf8');
    fs.renameSync(tempPath, HAPPY_STATE_PATH);

    return true;
  } catch (e) {
    return false; // Silent failure - daemon may not be running
  }
}

/**
 * Main hook handler
 */
module.exports = async function happyTitleGenerator(context) {
  // Always continue - never block
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();
    const state = loadState();
    const now = Date.now();

    // Rate limiting - don't update too frequently
    if (state.last_update && (now - state.last_update) < config.rate_limit_ms) {
      return approve();
    }

    // Parse hook input for user prompt
    let userPrompt = '';
    try {
      const input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
      userPrompt = input.prompt || input.message || '';
    } catch (e) {
      // No prompt available
    }

    // Get git context
    const branch = getCurrentBranch();
    const issueNumber = extractIssueNumber(branch, config);

    // Generate title components
    const summary = generateSummary(userPrompt, config);
    const title = formatTitle(issueNumber, summary, branch);

    // Update state
    state.last_update = now;
    state.current_title = title;
    state.issue_number = issueNumber;
    saveState(state);

    // Notify Happy daemon (if running)
    const notified = notifyHappyDaemon(title);

    if (notified) {
      console.log(`[happy-title-generator] Title updated: ${title}`);
    }

    return approve();
  } catch (error) {
    console.error(`[happy-title-generator] Error: ${error.message}`);
    return approve();
  }
};
