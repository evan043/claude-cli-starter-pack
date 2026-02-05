/**
 * Environment Detection and Setup
 * Handles CI detection, dev mode checks, and basic directory setup
 */

import { basename, join } from 'path';

/**
 * Detect if running in CI environment
 * @returns {boolean} True if in CI
 */
export function isCI() {
  return process.env.CI === 'true' ||
         process.env.CI === '1' ||
         process.env.GITHUB_ACTIONS === 'true';
}

/**
 * Setup CI mode options
 * @param {Object} options - Command options
 * @param {Function} getDefaultFeatures - Function to get default features
 * @returns {Object} Modified options
 */
export function setupCIMode(options, getDefaultFeatures) {
  if (isCI() && !options.skipPrompts) {
    options.skipPrompts = true;
    // Use default features in CI if not specified
    if (!options.features) {
      options.features = getDefaultFeatures().map(f => f.name);
    }
  }
  return options;
}

/**
 * Get project metadata
 * @param {string} cwd - Current working directory
 * @returns {Object} Project metadata
 */
export function getProjectMetadata(cwd) {
  const projectName = basename(cwd);
  return { projectName };
}

/**
 * Get directory paths for .claude folder structure
 * @param {string} claudeDir - Base .claude directory
 * @returns {Object} Directory paths
 */
export function getDirectoryPaths(claudeDir) {
  return {
    claudeDir,
    commandsDir: join(claudeDir, 'commands'),
    skillsDir: join(claudeDir, 'skills'),
    agentsDir: join(claudeDir, 'agents'),
    hooksDir: join(claudeDir, 'hooks'),
    docsDir: join(claudeDir, 'docs'),
    configDir: join(claudeDir, 'config'),
    settingsPath: join(claudeDir, 'settings.json'),
    settingsLocalPath: join(claudeDir, 'settings.local.json'),
  };
}
