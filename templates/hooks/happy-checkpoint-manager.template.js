/**
 * Happy Checkpoint Manager Hook
 *
 * Manages automatic checkpoints for Happy Engineering mobile app integration.
 * Creates periodic snapshots of session state for mobile viewing and control.
 *
 * Event: PostToolUse
 * Priority: {{hooks.priorities.automation}}
 */

const fs = require('fs');
const path = require('path');

// Configuration from tech-stack.json
const CONFIG = {
  enabled: {{happyMode.enabled}},
  checkpointInterval: {{happyMode.checkpointInterval}}, // minutes
  verbosity: '{{happyMode.verbosity}}',
  notifications: {
    onTaskComplete: {{happyMode.notifications.onTaskComplete}},
    onError: {{happyMode.notifications.onError}},
    onCheckpoint: {{happyMode.notifications.onCheckpoint}},
  },
};

const CHECKPOINT_DIR = '.claude/self-hosted-happy/checkpoints';
const STATE_FILE = '.claude/self-hosted-happy/EXECUTION_STATE.json';

let lastCheckpointTime = Date.now();
let taskHistory = [];
let currentSessionId = null;

/**
 * Generate session ID
 */
function getSessionId() {
  if (!currentSessionId) {
    currentSessionId = `happy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  return currentSessionId;
}

/**
 * Load execution state
 */
function loadState() {
  const statePath = path.join(process.cwd(), STATE_FILE);

  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (error) {
      console.warn('[happy-checkpoint] Could not parse state file');
    }
  }

  return {
    sessionId: getSessionId(),
    mode: 'happy',
    status: 'active',
    tasksCompleted: 0,
    tasksRemaining: 0,
    currentTask: null,
    lastCheckpoint: null,
    history: [],
  };
}

/**
 * Save execution state
 */
function saveState(state) {
  const statePath = path.join(process.cwd(), STATE_FILE);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Create a checkpoint
 */
function createCheckpoint(state, context) {
  const checkpointDir = path.join(process.cwd(), CHECKPOINT_DIR);

  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const checkpointPath = path.join(checkpointDir, `checkpoint-${timestamp}.json`);

  const checkpoint = {
    timestamp: new Date().toISOString(),
    sessionId: state.sessionId,
    progress: {
      tasksCompleted: state.tasksCompleted,
      tasksRemaining: state.tasksRemaining,
      currentTask: state.currentTask,
    },
    context: {
      recentTools: taskHistory.slice(-5).map((t) => t.tool),
      verbosity: CONFIG.verbosity,
    },
  };

  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');

  return checkpointPath;
}

/**
 * Check if checkpoint is due
 */
function isCheckpointDue() {
  const elapsed = (Date.now() - lastCheckpointTime) / 1000 / 60; // minutes
  return elapsed >= CONFIG.checkpointInterval;
}

/**
 * Format response for mobile based on verbosity
 */
function formatForMobile(message, verbosity) {
  if (verbosity === 'minimal') {
    // Strip to essentials
    return message.split('\n')[0].substring(0, 100);
  }

  if (verbosity === 'condensed') {
    // Convert to bullet points, truncate
    const lines = message.split('\n').filter((l) => l.trim());
    return lines
      .slice(0, 5)
      .map((l) => `• ${l.trim().substring(0, 80)}`)
      .join('\n');
  }

  // Full verbosity
  return message;
}

/**
 * Main hook handler
 */
module.exports = async function happyCheckpointManager(context) {
  // Skip if disabled
  if (!CONFIG.enabled) {
    return { continue: true };
  }

  const { tool, input, output, error } = context;

  // Load current state
  const state = loadState();

  // Track tool usage
  taskHistory.push({
    tool,
    timestamp: new Date().toISOString(),
    success: !error,
  });

  // Keep history manageable
  if (taskHistory.length > 100) {
    taskHistory = taskHistory.slice(-50);
  }

  // Update state based on tool
  if (tool === 'TaskUpdate' || tool === 'TodoWrite') {
    // Track task progress
    if (input && input.status === 'completed') {
      state.tasksCompleted += 1;

      if (CONFIG.notifications.onTaskComplete) {
        // In a real implementation, this would send to mobile app
        console.log(`[Happy] Task completed: ${state.tasksCompleted} total`);
      }
    }
  }

  // Handle errors
  if (error && CONFIG.notifications.onError) {
    state.lastError = {
      tool,
      message: error.message || String(error),
      timestamp: new Date().toISOString(),
    };
  }

  // Check if checkpoint is due
  let checkpointPath = null;
  if (isCheckpointDue()) {
    checkpointPath = createCheckpoint(state, context);
    lastCheckpointTime = Date.now();
    state.lastCheckpoint = checkpointPath;

    if (CONFIG.notifications.onCheckpoint) {
      console.log(`[Happy] Checkpoint created: ${checkpointPath}`);
    }
  }

  // Save updated state
  saveState(state);

  return {
    continue: true,
    // Add checkpoint info if one was created
    metadata: checkpointPath
      ? {
          happyCheckpoint: {
            path: checkpointPath,
            sessionId: state.sessionId,
            tasksCompleted: state.tasksCompleted,
          },
        }
      : undefined,
  };
};
