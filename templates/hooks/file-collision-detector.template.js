/**
 * File Collision Detector Hook
 *
 * Detects when multiple agents edit the same file within a short time window.
 * Warns about potential conflicts from concurrent agent operations.
 *
 * Cherry-picked from aannoo/hcom patterns, adapted to CCASP hook template format.
 *
 * Event: PostToolUse (after Edit/Write/MultiEdit tools)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateFile: '.claude/hooks/cache/file-edits.json',
  collisionWindowMs: 20000, // 20 seconds
  orchestratorStateFile: '.claude/orchestrator/state.json',
  trackedTools: ['Edit', 'Write', 'MultiEdit'],
  maxTrackedFiles: 200,
  cleanupIntervalMs: 60000, // Clean old entries every 60s
};

/**
 * Load file edit tracking state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return { edits: {}, lastCleanup: Date.now() };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { edits: {}, lastCleanup: Date.now() };
  }
}

/**
 * Save file edit tracking state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Get current agent ID from orchestrator state or environment
 */
function getAgentId(projectRoot) {
  // Try orchestrator state first
  const orchPath = path.join(projectRoot, CONFIG.orchestratorStateFile);
  if (fs.existsSync(orchPath)) {
    try {
      const orchState = JSON.parse(fs.readFileSync(orchPath, 'utf8'));
      if (orchState.currentAgentId) {
        return orchState.currentAgentId;
      }
    } catch {
      // Fall through
    }
  }

  // Fall back to environment or session
  return process.env.CLAUDE_AGENT_ID || process.env.CLAUDE_SESSION_ID || 'main';
}

/**
 * Clean up old edit records outside the collision window
 */
function cleanupOldEdits(state) {
  const now = Date.now();
  const cutoff = now - CONFIG.collisionWindowMs * 3; // Keep 3x the window for history

  for (const [filePath, edits] of Object.entries(state.edits)) {
    state.edits[filePath] = edits.filter((e) => e.timestamp > cutoff);
    if (state.edits[filePath].length === 0) {
      delete state.edits[filePath];
    }
  }

  // Limit total tracked files
  const keys = Object.keys(state.edits);
  if (keys.length > CONFIG.maxTrackedFiles) {
    const sortedKeys = keys.sort((a, b) => {
      const aLatest = Math.max(...state.edits[a].map((e) => e.timestamp));
      const bLatest = Math.max(...state.edits[b].map((e) => e.timestamp));
      return bLatest - aLatest;
    });

    for (const key of sortedKeys.slice(CONFIG.maxTrackedFiles)) {
      delete state.edits[key];
    }
  }

  state.lastCleanup = now;
  return state;
}

/**
 * Check for collisions on a file
 */
function detectCollisions(state, filePath, currentAgentId, now) {
  const edits = state.edits[filePath] || [];
  const windowStart = now - CONFIG.collisionWindowMs;

  // Find recent edits by OTHER agents
  const recentByOthers = edits.filter(
    (e) => e.agentId !== currentAgentId && e.timestamp > windowStart
  );

  return recentByOthers;
}

/**
 * Main hook handler - PostToolUse
 */
module.exports = async function fileCollisionDetectorHook(context) {
  const { tool, toolInput, projectRoot } = context;

  // Only track file modification tools
  if (!CONFIG.trackedTools.includes(tool)) {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || toolInput?.filePath || '';
  if (!filePath) {
    return { continue: true };
  }

  // Normalize path for consistent tracking
  const normalizedPath = path.relative(projectRoot, path.resolve(projectRoot, filePath));
  const now = Date.now();
  const agentId = getAgentId(projectRoot);

  // Load and potentially clean state
  let state = loadState(projectRoot);
  if (now - (state.lastCleanup || 0) > CONFIG.cleanupIntervalMs) {
    state = cleanupOldEdits(state);
  }

  // Check for collisions BEFORE recording this edit
  const collisions = detectCollisions(state, normalizedPath, agentId, now);

  // Record this edit
  if (!state.edits[normalizedPath]) {
    state.edits[normalizedPath] = [];
  }
  state.edits[normalizedPath].push({
    agentId,
    timestamp: now,
    tool,
  });

  saveState(projectRoot, state);

  // Report collisions
  if (collisions.length > 0) {
    const otherAgents = [...new Set(collisions.map((c) => c.agentId))];
    const timeDiffs = collisions.map((c) => Math.round((now - c.timestamp) / 1000));
    const minTimeDiff = Math.min(...timeDiffs);

    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  File Collision Detected                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  File: ${path.basename(normalizedPath).substring(0, 50).padEnd(50)}   ║
║  Current agent: ${agentId.substring(0, 40).padEnd(40)}       ║
║  Also edited by: ${otherAgents.join(', ').substring(0, 38).padEnd(38)}     ║
║  Time gap: ${String(minTimeDiff).padEnd(3)}s (window: ${CONFIG.collisionWindowMs / 1000}s)                       ║
║                                                               ║
║  Multiple agents editing the same file may cause conflicts.   ║
║  Consider coordinating edits or checking for overwritten      ║
║  changes.                                                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        collision: true,
        file: normalizedPath,
        currentAgent: agentId,
        otherAgents,
        timeDiffSeconds: minTimeDiff,
      },
    };
  }

  return { continue: true };
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.detectCollisions = detectCollisions;
module.exports.cleanupOldEdits = cleanupOldEdits;
module.exports.getAgentId = getAgentId;
