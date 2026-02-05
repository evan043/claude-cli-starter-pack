/**
 * State Management Module
 *
 * Handles update state and usage tracking persistence.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Get the state file path for the current project
 */
function getStateFilePath(projectDir = process.cwd()) {
  return join(projectDir, '.claude', 'config', 'ccasp-state.json');
}

/**
 * Load the update state from the project's .claude folder
 */
export function loadUpdateState(projectDir = process.cwd()) {
  const statePath = getStateFilePath(projectDir);

  if (!existsSync(statePath)) {
    return {
      lastCheckTimestamp: 0,
      lastCheckResult: null,
      lastSeenVersion: null,
      dismissedVersions: [],
      installedFeatures: [],
      skippedFeatures: [],
    };
  }

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return {
      lastCheckTimestamp: 0,
      lastCheckResult: null,
      lastSeenVersion: null,
      dismissedVersions: [],
      installedFeatures: [],
      skippedFeatures: [],
    };
  }
}

/**
 * Save the update state to the project's .claude folder
 */
export function saveUpdateState(state, projectDir = process.cwd()) {
  const statePath = getStateFilePath(projectDir);
  const configDir = dirname(statePath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Dismiss update notification for a specific version
 */
export function dismissUpdateNotification(version, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);

  if (!state.dismissedVersions) {
    state.dismissedVersions = [];
  }

  if (!state.dismissedVersions.includes(version)) {
    state.dismissedVersions.push(version);
  }

  state.lastSeenVersion = version;
  saveUpdateState(state, projectDir);
}

/**
 * Mark a feature as installed
 */
export function markFeatureInstalled(featureName, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);

  if (!state.installedFeatures) {
    state.installedFeatures = [];
  }

  if (!state.installedFeatures.includes(featureName)) {
    state.installedFeatures.push(featureName);
  }

  // Remove from skipped if it was there
  if (state.skippedFeatures) {
    state.skippedFeatures = state.skippedFeatures.filter((f) => f !== featureName);
  }

  saveUpdateState(state, projectDir);
}

/**
 * Mark a feature as skipped (user chose not to install)
 */
export function markFeatureSkipped(featureName, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);

  if (!state.skippedFeatures) {
    state.skippedFeatures = [];
  }

  if (!state.skippedFeatures.includes(featureName)) {
    state.skippedFeatures.push(featureName);
  }

  saveUpdateState(state, projectDir);
}

// ============================================================================
// USAGE TRACKING SYSTEM
// Tracks which commands, skills, agents, and hooks the user has used
// ============================================================================

/**
 * Get the usage tracking file path
 */
function getUsageTrackingPath(projectDir = process.cwd()) {
  return join(projectDir, '.claude', 'config', 'usage-tracking.json');
}

/**
 * Default usage tracking structure
 */
function getDefaultUsageTracking() {
  return {
    version: '1.0.0',
    assets: {
      commands: {},
      skills: {},
      agents: {},
      hooks: {},
    },
    _lastModified: new Date().toISOString(),
  };
}

/**
 * Load the usage tracking data
 */
export function loadUsageTracking(projectDir = process.cwd()) {
  const trackingPath = getUsageTrackingPath(projectDir);

  if (!existsSync(trackingPath)) {
    return getDefaultUsageTracking();
  }

  try {
    const data = JSON.parse(readFileSync(trackingPath, 'utf8'));
    // Ensure all required keys exist
    return {
      ...getDefaultUsageTracking(),
      ...data,
      assets: {
        commands: {},
        skills: {},
        agents: {},
        hooks: {},
        ...data.assets,
      },
    };
  } catch {
    return getDefaultUsageTracking();
  }
}

/**
 * Save the usage tracking data
 */
export function saveUsageTracking(tracking, projectDir = process.cwd()) {
  const trackingPath = getUsageTrackingPath(projectDir);
  const configDir = dirname(trackingPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  tracking._lastModified = new Date().toISOString();
  writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf8');
}

/**
 * Track usage of an asset (command, skill, agent, or hook)
 * @param {string} assetType - 'commands' | 'skills' | 'agents' | 'hooks'
 * @param {string} assetName - Name of the asset (e.g., 'create-task-list')
 * @param {object} options - Additional options
 * @param {boolean} options.customized - Whether the asset has been customized by user
 * @param {string} projectDir - Project directory
 */
export function trackAssetUsage(assetType, assetName, options = {}, projectDir = process.cwd()) {
  const tracking = loadUsageTracking(projectDir);

  if (!tracking.assets[assetType]) {
    tracking.assets[assetType] = {};
  }

  const existing = tracking.assets[assetType][assetName] || {
    firstUsed: new Date().toISOString(),
    useCount: 0,
    customized: false,
  };

  tracking.assets[assetType][assetName] = {
    ...existing,
    lastUsed: new Date().toISOString(),
    useCount: existing.useCount + 1,
    customized: options.customized !== undefined ? options.customized : existing.customized,
  };

  saveUsageTracking(tracking, projectDir);

  return tracking.assets[assetType][assetName];
}

/**
 * Mark an asset as customized (user has modified it from the template)
 */
export function markAssetCustomized(assetType, assetName, projectDir = process.cwd()) {
  const tracking = loadUsageTracking(projectDir);

  if (!tracking.assets[assetType]) {
    tracking.assets[assetType] = {};
  }

  if (!tracking.assets[assetType][assetName]) {
    tracking.assets[assetType][assetName] = {
      firstUsed: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 0,
      customized: true,
    };
  } else {
    tracking.assets[assetType][assetName].customized = true;
  }

  saveUsageTracking(tracking, projectDir);
}

/**
 * Get all assets that have been used
 * @param {object} options - Filter options
 * @param {boolean} options.customizedOnly - Only return customized assets
 * @param {string[]} options.assetTypes - Filter by asset types
 */
export function getUsedAssets(options = {}, projectDir = process.cwd()) {
  const tracking = loadUsageTracking(projectDir);
  const { customizedOnly = false, assetTypes = ['commands', 'skills', 'agents', 'hooks'] } = options;

  const result = {};

  for (const type of assetTypes) {
    if (!tracking.assets[type]) continue;

    result[type] = {};

    for (const [name, data] of Object.entries(tracking.assets[type])) {
      if (customizedOnly && !data.customized) continue;
      result[type][name] = data;
    }
  }

  return result;
}

/**
 * Get assets that are both used AND customized (for smart merge detection)
 */
export function getCustomizedUsedAssets(projectDir = process.cwd()) {
  return getUsedAssets({ customizedOnly: true }, projectDir);
}

/**
 * Check if an asset has been customized
 */
export function isAssetCustomized(assetType, assetName, projectDir = process.cwd()) {
  const tracking = loadUsageTracking(projectDir);
  return tracking.assets[assetType]?.[assetName]?.customized === true;
}

/**
 * Get usage statistics summary
 */
export function getUsageStats(projectDir = process.cwd()) {
  const tracking = loadUsageTracking(projectDir);

  const stats = {
    totalAssets: 0,
    totalUsage: 0,
    customizedCount: 0,
    byType: {},
  };

  for (const [type, assets] of Object.entries(tracking.assets)) {
    const typeStats = {
      count: Object.keys(assets).length,
      totalUsage: 0,
      customized: 0,
    };

    for (const data of Object.values(assets)) {
      typeStats.totalUsage += data.useCount || 0;
      if (data.customized) typeStats.customized++;
    }

    stats.byType[type] = typeStats;
    stats.totalAssets += typeStats.count;
    stats.totalUsage += typeStats.totalUsage;
    stats.customizedCount += typeStats.customized;
  }

  return stats;
}
