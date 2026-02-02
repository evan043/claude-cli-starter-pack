/**
 * Happy CLI Detection Utility
 *
 * Detects if CCASP is running inside Happy Coder mobile CLI wrapper.
 * Happy CLI sets HAPPY_* environment variables when active.
 *
 * IMPORTANT: Distinguishes between:
 * - Happy CONFIGURED (HAPPY_SERVER_URL set globally) - NOT mobile mode
 * - Happy ACTIVE SESSION (HAPPY_SESSION=true or narrow terminal) - IS mobile mode
 *
 * @see https://github.com/slopus/happy-cli
 */

/**
 * Check if Happy CLI is configured (but not necessarily active)
 * @returns {boolean} True if Happy CLI is configured
 */
export function isHappyConfigured() {
  return !!(
    process.env.HAPPY_HOME_DIR ||
    process.env.HAPPY_SERVER_URL ||
    process.env.HAPPY_WEBAPP_URL
  );
}

/**
 * Check if running inside an ACTIVE Happy CLI session
 * This is more specific than just having Happy configured
 * @returns {boolean} True if actively running from Happy mobile
 */
export function isHappyMode() {
  // HAPPY_SESSION is set only during active Happy sessions
  if (process.env.HAPPY_SESSION === 'true') {
    return true;
  }

  // HAPPY_EXPERIMENTAL is typically set only during active sessions
  if (process.env.HAPPY_EXPERIMENTAL === 'true') {
    return true;
  }

  // Check terminal width - mobile terminals are typically narrow
  // This catches cases where Happy didn't set session vars
  const termWidth = process.stdout.columns || 80;
  if (termWidth <= 50 && isHappyConfigured()) {
    return true;
  }

  // HAPPY_SERVER_URL alone does NOT indicate active session
  // It's often set globally as configuration
  return false;
}

/**
 * Get Happy CLI configuration from environment
 * @returns {object} Happy configuration details
 */
export function getHappyConfig() {
  return {
    detected: isHappyMode(),
    homeDir: process.env.HAPPY_HOME_DIR || null,
    serverUrl: process.env.HAPPY_SERVER_URL || 'https://api.cluster-fluster.com',
    webappUrl: process.env.HAPPY_WEBAPP_URL || 'https://app.happy.engineering',
    experimental: process.env.HAPPY_EXPERIMENTAL === 'true',
    disableCaffeinate: process.env.HAPPY_DISABLE_CAFFEINATE === 'true',
  };
}

/**
 * Get recommended terminal width for mobile display
 * @returns {number} Optimal width for mobile screens
 */
export function getMobileWidth() {
  // Happy mobile UI typically works best at 40 chars
  // to avoid horizontal scrolling on phone screens
  return 40;
}

/**
 * Check if we should use mobile-optimized UI
 *
 * Priority order:
 * 1. techStack.happyMode.forceDesktop = true → ALWAYS desktop
 * 2. techStack.happyMode.forceMobile = true → ALWAYS mobile
 * 3. Active Happy session detected → mobile
 * 4. techStack.happyMode.enabled = true → mobile
 * 5. Default → desktop
 *
 * @param {object} techStack - Optional tech-stack.json config
 * @returns {boolean} True if mobile UI should be used
 */
export function shouldUseMobileUI(techStack = null) {
  // Priority 1: Force desktop mode (overrides everything)
  if (techStack?.happyMode?.forceDesktop === true) {
    return false;
  }

  // Priority 2: Force mobile mode
  if (techStack?.happyMode?.forceMobile === true) {
    return true;
  }

  // Priority 3: Auto-detect active Happy CLI session
  if (isHappyMode()) {
    return true;
  }

  // Priority 4: Check tech-stack.json happyMode.enabled setting
  if (techStack?.happyMode?.enabled) {
    return true;
  }

  // Default: desktop mode
  return false;
}

/**
 * Get detection debug info (useful for troubleshooting)
 * @returns {object} Detection state details
 */
export function getDetectionDebugInfo() {
  const termWidth = process.stdout.columns || 80;
  return {
    happyConfigured: isHappyConfigured(),
    happyActiveSession: isHappyMode(),
    envVars: {
      HAPPY_SESSION: process.env.HAPPY_SESSION || null,
      HAPPY_EXPERIMENTAL: process.env.HAPPY_EXPERIMENTAL || null,
      HAPPY_SERVER_URL: process.env.HAPPY_SERVER_URL ? '(set)' : null,
      HAPPY_HOME_DIR: process.env.HAPPY_HOME_DIR || null,
    },
    terminalWidth: termWidth,
    narrowTerminal: termWidth <= 50,
  };
}
