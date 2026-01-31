/**
 * Issue Completion Detector Hook
 *
 * Detects natural language indicators of task/issue completion.
 * Auto-triggers deployment pipeline when completion phrases are detected.
 * Integrates with GitHub to update issue status.
 *
 * Event: UserPromptSubmit
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  auto_deploy: false,                    // Auto-trigger deployment on completion
  update_github: true,                   // Update GitHub issue status
  completion_phrases: [
    'task complete',
    'task completed',
    'issue resolved',
    'issue fixed',
    'done with this',
    'finished implementing',
    'ready for review',
    'ready to merge',
    'all tests pass',
    'implementation complete',
  ],
  deploy_command: '/deploy-full',        // Command to trigger on completion
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const STATE_PATH = path.join(process.cwd(), '.claude', 'config', 'completion-detector-state.json');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.issue_completion || {}) };
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
    last_detection: null,
    completions_detected: 0,
    deployments_triggered: 0,
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
 * Check if message contains completion phrase
 */
function detectCompletion(message, config) {
  if (!message) return null;

  const lowerMessage = message.toLowerCase();

  for (const phrase of config.completion_phrases) {
    if (lowerMessage.includes(phrase.toLowerCase())) {
      return phrase;
    }
  }

  return null;
}

/**
 * Get current issue number from branch
 */
function getCurrentIssue() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const match = branch.match(/issue-(\d+)/i) || branch.match(/(\d+)-/);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch (e) {
    // Not in git repo or error
  }
  return null;
}

/**
 * Update GitHub issue (if gh CLI available)
 */
function updateGitHubIssue(issueNumber, message) {
  try {
    // Add comment about completion
    execSync(`gh issue comment ${issueNumber} --body "Task marked as complete via Claude CLI"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });

    console.log(`[issue-completion-detector] Updated GitHub issue #${issueNumber}`);
    return true;
  } catch (e) {
    console.log(`[issue-completion-detector] Could not update GitHub issue: ${e.message}`);
    return false;
  }
}

/**
 * Main hook handler
 */
module.exports = async function issueCompletionDetector(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();

    if (!config.enabled) {
      return approve();
    }

    // Parse hook input
    let userMessage = '';
    try {
      const input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
      userMessage = input.prompt || input.message || '';
    } catch (e) {
      return approve();
    }

    // Check for completion phrase
    const detectedPhrase = detectCompletion(userMessage, config);

    if (!detectedPhrase) {
      return approve();
    }

    // Completion detected!
    console.log(`[issue-completion-detector] Completion detected: "${detectedPhrase}"`);

    const state = loadState();
    state.last_detection = new Date().toISOString();
    state.completions_detected++;

    // Get current issue
    const issueNumber = getCurrentIssue();

    // Update GitHub if configured
    if (config.update_github && issueNumber) {
      updateGitHubIssue(issueNumber, userMessage);
    }

    // Log deployment suggestion
    if (config.auto_deploy) {
      console.log(`[issue-completion-detector] Auto-deploy enabled. Suggested: ${config.deploy_command}`);
      state.deployments_triggered++;
    } else {
      console.log(`[issue-completion-detector] Consider running: ${config.deploy_command}`);
    }

    saveState(state);

    return approve();
  } catch (error) {
    console.error(`[issue-completion-detector] Error: ${error.message}`);
    return approve();
  }
};
