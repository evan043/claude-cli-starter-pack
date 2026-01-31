#!/usr/bin/env node
/**
 * Session ID Generator Hook
 *
 * Generates unique session IDs with PID-keyed registry for parallel session isolation.
 * Enables multiple Claude Code sessions without interference.
 *
 * Event: SessionStart
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 *
 * Features:
 * - UUID session generation
 * - PID-keyed registry (handles PID reuse)
 * - Stale session cleanup
 * - Cross-platform process detection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  retention_hours: 24,       // Keep session records for 24 hours
  cleanup_on_start: true,    // Clean stale sessions on startup
  registry_enabled: true,    // Enable PID-keyed registry
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const CONFIG_DIR = path.join(process.cwd(), '.claude', 'hooks', 'config');
const SESSION_FILE = path.join(CONFIG_DIR, 'current-session.json');
const REGISTRY_FILE = path.join(CONFIG_DIR, 'session-registry.json');
const SESSIONS_DIR = path.join(process.cwd(), '.claude', 'sessions');

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.session_generator || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Check if a process is still running (cross-platform)
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means process exists but we don't have permission
    // ESRCH means process doesn't exist
    return error.code === 'EPERM';
  }
}

/**
 * Clean stale entries from the session registry
 */
function cleanStaleRegistryEntries(registry) {
  const cleaned = {};
  for (const [key, data] of Object.entries(registry)) {
    if (isProcessRunning(data.pid)) {
      cleaned[key] = data;
    }
  }
  return cleaned;
}

/**
 * Read the session registry
 */
function readRegistry() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    }
  } catch (e) {
    // Registry corrupt or unreadable - start fresh
  }
  return {};
}

/**
 * Write the session registry atomically
 */
function writeRegistry(registry) {
  const tempFile = REGISTRY_FILE + '.tmp';
  try {
    fs.writeFileSync(tempFile, JSON.stringify(registry, null, 2));
    fs.renameSync(tempFile, REGISTRY_FILE);
  } catch (e) {
    // Fallback: direct write if rename fails (Windows)
    try {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
    } catch (err) {
      // Silent fail - registry is not critical
    }
  }
}

/**
 * Cleanup old session files
 */
function cleanupOldSessions(config) {
  const retentionMs = config.retention_hours * 60 * 60 * 1000;

  try {
    if (!fs.existsSync(SESSIONS_DIR)) return;

    const now = Date.now();
    const files = fs.readdirSync(SESSIONS_DIR);

    for (const file of files) {
      if (!file.endsWith('-task.json') && !file.endsWith('-session.json')) continue;

      const filePath = path.join(SESSIONS_DIR, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > retentionMs) {
        fs.unlinkSync(filePath);
        console.log(`[session-generator] Cleaned old session: ${file}`);
      }
    }
  } catch (e) {
    // Silent fail - cleanup is non-critical
  }
}

/**
 * Main hook handler
 */
module.exports = async function sessionIdGenerator(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();

    if (!config.enabled) {
      return approve();
    }

    // Cleanup on start if enabled
    if (config.cleanup_on_start) {
      cleanupOldSessions(config);
    }

    // Generate UUID for this session
    const sessionId = crypto.randomUUID();
    const startTime = Date.now();
    const pid = process.pid;

    // Create session data
    const sessionData = {
      session_id: sessionId,
      pid: pid,
      start_time: startTime,
      started_at: new Date().toISOString(),
      cwd: process.cwd(),
      node_version: process.version,
      platform: process.platform,
    };

    // Ensure config directory exists
    fs.mkdirSync(CONFIG_DIR, { recursive: true });

    // Update session registry if enabled
    if (config.registry_enabled) {
      let registry = readRegistry();
      registry = cleanStaleRegistryEntries(registry);

      // Create composite key: pid-startTime (handles PID reuse)
      const registryKey = `${pid}-${startTime}`;
      registry[registryKey] = sessionData;

      writeRegistry(registry);
    }

    // Write current-session.json (backwards compatibility)
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

    // Set environment variable for downstream hooks
    process.env.CLAUDE_SESSION_ID = sessionId;

    console.log(`[session-generator] Session started: ${sessionId.substring(0, 8)}...`);

    return approve();
  } catch (error) {
    console.error(`[session-generator] Error: ${error.message}`);
    return approve();
  }
};

// Direct execution support
if (require.main === module) {
  const config = loadConfig();

  if (config.cleanup_on_start) {
    cleanupOldSessions(config);
  }

  const sessionId = crypto.randomUUID();
  const startTime = Date.now();
  const pid = process.pid;

  const sessionData = {
    session_id: sessionId,
    pid: pid,
    start_time: startTime,
    started_at: new Date().toISOString(),
    cwd: process.cwd(),
  };

  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  if (config.registry_enabled) {
    let registry = readRegistry();
    registry = cleanStaleRegistryEntries(registry);
    registry[`${pid}-${startTime}`] = sessionData;
    writeRegistry(registry);
  }

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

  console.log(JSON.stringify({ result: 'continue' }));
}
