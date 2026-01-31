/**
 * Happy CLI Detection Utility
 *
 * Detects if CCASP is running inside Happy Coder mobile CLI wrapper.
 * Happy CLI sets HAPPY_* environment variables when active.
 *
 * @see https://github.com/slopus/happy-cli
 */

/**
 * Check if running inside Happy CLI environment
 * @returns {boolean} True if Happy CLI detected
 */
export function isHappyMode() {
  return !!(
    process.env.HAPPY_HOME_DIR ||
    process.env.HAPPY_SERVER_URL ||
    process.env.HAPPY_WEBAPP_URL ||
    process.env.HAPPY_EXPERIMENTAL
  );
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
 * Respects both Happy CLI detection and tech-stack.json happyMode.enabled
 * @param {object} techStack - Optional tech-stack.json config
 * @returns {boolean} True if mobile UI should be used
 */
export function shouldUseMobileUI(techStack = null) {
  // Auto-detect Happy CLI environment
  if (isHappyMode()) {
    return true;
  }

  // Check tech-stack.json happyMode.enabled setting
  if (techStack?.happyMode?.enabled) {
    return true;
  }

  return false;
}
