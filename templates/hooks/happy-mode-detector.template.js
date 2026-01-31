/**
 * Happy Mode Detector Hook
 *
 * Auto-detects Happy daemon environment and enables mobile-optimized mode.
 * Sets appropriate verbosity and response formatting for mobile clients.
 * Supports multiple detection methods: env var, daemon state, manual config.
 *
 * Event: UserPromptSubmit (runs once per session)
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');

// Default configuration (can be overridden by hooks-config.json)
const DEFAULT_CONFIG = {
  enabled: false,                     // Manual override
  auto_detect: true,                  // Attempt auto-detection
  verbosity: 'condensed',             // 'verbose', 'condensed', 'compact'
  show_file_stats: true,              // Show file operation statistics
  max_grep_results: 5,                // Limit grep results for mobile
  checkpoint_interval_minutes: 10,    // Auto-checkpoint frequency
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const HAPPY_MODE_PATH = path.join(process.cwd(), '.claude', 'config', 'happy-mode.json');
const HAPPY_STATE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.happy', 'daemon.state.json');
const SESSION_MARKER = path.join(process.cwd(), '.claude', 'config', '.happy-detected');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.happy_mode || {}) };
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_CONFIG;
}

/**
 * Check if we've already detected Happy mode this session
 */
function hasDetectedThisSession() {
  try {
    if (fs.existsSync(SESSION_MARKER)) {
      const content = fs.readFileSync(SESSION_MARKER, 'utf8');
      const data = JSON.parse(content);
      // Session valid for 4 hours
      if (Date.now() - data.timestamp < 4 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (e) {
    // Continue with detection
  }
  return null;
}

/**
 * Mark session as detected
 */
function markSessionDetected(result) {
  try {
    const dir = path.dirname(SESSION_MARKER);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_MARKER, JSON.stringify({
      timestamp: Date.now(),
      ...result,
    }, null, 2), 'utf8');
  } catch (e) {
    // Silent failure
  }
}

/**
 * Detect Happy mode via environment variable
 */
function detectViaEnvVar() {
  return process.env.HAPPY_SESSION === 'true';
}

/**
 * Detect Happy mode via daemon state file
 */
function detectViaDaemonState() {
  try {
    if (fs.existsSync(HAPPY_STATE_PATH)) {
      const state = JSON.parse(fs.readFileSync(HAPPY_STATE_PATH, 'utf8'));
      // Check if daemon is running and has active session
      if (state.running && state.current_session) {
        return true;
      }
    }
  } catch (e) {
    // Daemon not running or state invalid
  }
  return false;
}

/**
 * Detect Happy mode via manual configuration
 */
function detectViaManualConfig() {
  try {
    if (fs.existsSync(HAPPY_MODE_PATH)) {
      const config = JSON.parse(fs.readFileSync(HAPPY_MODE_PATH, 'utf8'));
      return config.enabled === true;
    }
  } catch (e) {
    // No manual config
  }
  return false;
}

/**
 * Get detection method description
 */
function getDetectionMethod(envVar, daemon, manual) {
  if (manual) return 'manual_config';
  if (envVar) return 'env_var';
  if (daemon) return 'daemon_state';
  return 'none';
}

/**
 * Save Happy mode state for other hooks to use
 */
function saveHappyModeState(result) {
  try {
    const dir = path.dirname(HAPPY_MODE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HAPPY_MODE_PATH, JSON.stringify(result, null, 2), 'utf8');
  } catch (e) {
    // Silent failure
  }
}

/**
 * Main hook handler
 */
module.exports = async function happyModeDetector(context) {
  // Always continue - never block
  const approve = () => ({ continue: true });

  try {
    // Check if already detected this session
    const cached = hasDetectedThisSession();
    if (cached) {
      return approve();
    }

    const config = loadConfig();

    // Skip detection if auto-detect is disabled
    if (!config.auto_detect) {
      const result = {
        happy_mode: config.enabled,
        detection_method: config.enabled ? 'manual_override' : 'disabled',
        config: config,
      };
      markSessionDetected(result);
      return approve();
    }

    // Try all detection methods
    const viaEnvVar = detectViaEnvVar();
    const viaDaemon = detectViaDaemonState();
    const viaManual = detectViaManualConfig();

    const isHappyMode = viaEnvVar || viaDaemon || viaManual;
    const detectionMethod = getDetectionMethod(viaEnvVar, viaDaemon, viaManual);

    // Build result object
    const result = {
      happy_mode: isHappyMode,
      detection_method: detectionMethod,
      detected_at: new Date().toISOString(),
      config: {
        verbosity: config.verbosity,
        show_file_stats: config.show_file_stats,
        max_grep_results: config.max_grep_results,
        checkpoint_interval_minutes: config.checkpoint_interval_minutes,
      },
    };

    // Save state for other hooks
    saveHappyModeState(result);
    markSessionDetected(result);

    // Log detection result
    if (isHappyMode) {
      console.log(`[happy-mode-detector] Happy mode ENABLED (via ${detectionMethod})`);
      console.log(`[happy-mode-detector] Verbosity: ${config.verbosity}`);
    } else {
      console.log('[happy-mode-detector] Happy mode not detected');
    }

    return approve();
  } catch (error) {
    console.error(`[happy-mode-detector] Error: ${error.message}`);
    return approve();
  }
};
