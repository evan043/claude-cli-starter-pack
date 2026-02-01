/**
 * Version Check Utility
 *
 * Handles npm version checking, comparison, caching, and update state tracking.
 * Designed for background execution with non-blocking checks.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package name for npm registry lookup
const PACKAGE_NAME = 'claude-cli-advanced-starter-pack';

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// Update notification reminder: Show reminder again after 7 days
// Issue #8: Changed from 1-day suppression to 7-day reminder
const UPDATE_NOTIFICATION_REMINDER = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the current installed version from package.json
 */
export function getCurrentVersion() {
  try {
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

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

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Check npm registry for the latest version
 * Returns null if check fails (network error, etc.)
 * Issue #8: Added npm registry API fallback for Windows compatibility
 */
export async function checkLatestVersion() {
  // Try npm CLI first
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const version = result.trim();
    if (version && /^\d+\.\d+\.\d+/.test(version)) {
      return version;
    }
  } catch {
    // npm CLI failed, try fallback
  }

  // Fallback: Direct npm registry API call (Issue #8 fix)
  try {
    const https = await import('https');
    return new Promise((resolve) => {
      const req = https.default.get(
        `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
        { timeout: 8000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const pkg = JSON.parse(data);
              resolve(pkg.version || null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get detailed package info from npm registry
 */
export async function getPackageInfo() {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} --json`, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Load release notes from the releases.json file
 */
export function loadReleaseNotes() {
  try {
    const releasesPath = join(__dirname, '..', 'data', 'releases.json');
    if (existsSync(releasesPath)) {
      return JSON.parse(readFileSync(releasesPath, 'utf8'));
    }
  } catch {
    // Fall through to default
  }

  return { releases: [] };
}

/**
 * Get release notes for a specific version
 */
export function getReleaseNotes(version) {
  const { releases } = loadReleaseNotes();
  return releases.find((r) => r.version === version) || null;
}

/**
 * Get all release notes since a specific version
 */
export function getReleasesSince(sinceVersion) {
  const { releases } = loadReleaseNotes();

  return releases.filter((r) => compareVersions(r.version, sinceVersion) > 0);
}

/**
 * Get new features available since a specific version
 */
export function getNewFeaturesSince(sinceVersion) {
  const releases = getReleasesSince(sinceVersion);

  const features = {
    commands: [],
    agents: [],
    skills: [],
    hooks: [],
    other: [],
  };

  for (const release of releases) {
    if (release.newFeatures) {
      if (release.newFeatures.commands) {
        features.commands.push(...release.newFeatures.commands);
      }
      if (release.newFeatures.agents) {
        features.agents.push(...release.newFeatures.agents);
      }
      if (release.newFeatures.skills) {
        features.skills.push(...release.newFeatures.skills);
      }
      if (release.newFeatures.hooks) {
        features.hooks.push(...release.newFeatures.hooks);
      }
      if (release.newFeatures.other) {
        features.other.push(...release.newFeatures.other);
      }
    }
  }

  return features;
}

/**
 * Check if update notification should be shown
 * Returns false if:
 * - Update was dismissed and is now more than 1 day old
 * - User has already seen this version
 */
export function shouldShowUpdateNotification(state, latestVersion) {
  const currentVersion = getCurrentVersion();

  // No update available
  if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
    return false;
  }

  // Check if this version was dismissed
  if (state.dismissedVersions?.includes(latestVersion)) {
    return false;
  }

  // Issue #8: Always show notification if update is available
  // The old logic suppressed notifications after 1 day, which was counterproductive
  // Now we always show if there's an update, regardless of cache age
  return true;
}

/**
 * Perform a version check (with caching)
 * This is the main entry point for version checking
 */
export async function performVersionCheck(projectDir = process.cwd(), forceCheck = false) {
  const state = loadUpdateState(projectDir);
  const currentVersion = getCurrentVersion();
  const now = Date.now();

  // Check if we have a recent cached result
  if (!forceCheck && state.lastCheckTimestamp && state.lastCheckResult) {
    const timeSinceCheck = now - state.lastCheckTimestamp;

    if (timeSinceCheck < CACHE_DURATION) {
      // Return cached result
      return {
        currentVersion,
        latestVersion: state.lastCheckResult.latestVersion,
        updateAvailable: compareVersions(state.lastCheckResult.latestVersion, currentVersion) > 0,
        cached: true,
        shouldNotify: shouldShowUpdateNotification(state, state.lastCheckResult.latestVersion),
        newFeatures: getNewFeaturesSince(currentVersion),
        releaseNotes: getReleasesSince(currentVersion),
      };
    }
  }

  // Perform fresh check
  const latestVersion = await checkLatestVersion();

  if (latestVersion) {
    // Update state with new check result
    state.lastCheckTimestamp = now;
    state.lastCheckResult = { latestVersion };
    saveUpdateState(state, projectDir);
  }

  const updateAvailable = latestVersion && compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
    latestVersion: latestVersion || state.lastCheckResult?.latestVersion || currentVersion,
    updateAvailable,
    cached: false,
    shouldNotify: shouldShowUpdateNotification(state, latestVersion),
    newFeatures: updateAvailable ? getNewFeaturesSince(currentVersion) : null,
    releaseNotes: updateAvailable ? getReleasesSince(currentVersion) : [],
  };
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

/**
 * Get features that are available but not yet installed or skipped
 */
export function getAvailableFeatures(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  const currentVersion = getCurrentVersion();
  const allNewFeatures = getNewFeaturesSince('0.0.0'); // Get all features ever added

  const installed = state.installedFeatures || [];
  const skipped = state.skippedFeatures || [];

  const available = {
    commands: allNewFeatures.commands.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    agents: allNewFeatures.agents.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    skills: allNewFeatures.skills.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    hooks: allNewFeatures.hooks.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
    other: allNewFeatures.other.filter((f) => !installed.includes(f.name) && !skipped.includes(f.name)),
  };

  return available;
}

/**
 * Format update notification for terminal display
 */
export function formatUpdateBanner(checkResult) {
  if (!checkResult.updateAvailable || !checkResult.shouldNotify) {
    return null;
  }

  const lines = [
    '',
    `  ┌${'─'.repeat(60)}┐`,
    `  │ ${'🆕 UPDATE AVAILABLE'.padEnd(58)} │`,
    `  │ ${`v${checkResult.currentVersion} → v${checkResult.latestVersion}`.padEnd(58)} │`,
    `  ├${'─'.repeat(60)}┤`,
  ];

  // Add summary of new features
  if (checkResult.newFeatures) {
    const { commands, agents, skills, hooks } = checkResult.newFeatures;
    const featureCounts = [];

    if (commands.length > 0) featureCounts.push(`${commands.length} command(s)`);
    if (agents.length > 0) featureCounts.push(`${agents.length} agent(s)`);
    if (skills.length > 0) featureCounts.push(`${skills.length} skill(s)`);
    if (hooks.length > 0) featureCounts.push(`${hooks.length} hook(s)`);

    if (featureCounts.length > 0) {
      lines.push(`  │ ${`New: ${featureCounts.join(', ')}`.padEnd(58)} │`);
    }
  }

  lines.push(`  │ ${' '.repeat(58)} │`);
  lines.push(`  │ ${'Run: npm update -g claude-cli-advanced-starter-pack'.padEnd(58)} │`);
  lines.push(`  │ ${'Then: ccasp wizard → Prior Releases to add features'.padEnd(58)} │`);
  lines.push(`  └${'─'.repeat(60)}┘`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format update notification for Claude Code CLI (markdown)
 */
export function formatUpdateMarkdown(checkResult) {
  if (!checkResult.updateAvailable) {
    return null;
  }

  let md = `## 🆕 Update Available\n\n`;
  md += `**Current:** v${checkResult.currentVersion} → **Latest:** v${checkResult.latestVersion}\n\n`;

  if (checkResult.releaseNotes && checkResult.releaseNotes.length > 0) {
    md += `### What's New\n\n`;

    for (const release of checkResult.releaseNotes) {
      md += `#### v${release.version} (${release.date})\n`;
      md += `${release.summary}\n\n`;

      if (release.highlights && release.highlights.length > 0) {
        for (const highlight of release.highlights) {
          md += `- ${highlight}\n`;
        }
        md += '\n';
      }
    }
  }

  if (checkResult.newFeatures) {
    const { commands, agents, skills, hooks } = checkResult.newFeatures;
    const hasFeatures = commands.length + agents.length + skills.length + hooks.length > 0;

    if (hasFeatures) {
      md += `### New Features Available\n\n`;

      if (commands.length > 0) {
        md += `**Commands:**\n`;
        for (const cmd of commands) {
          md += `- \`/${cmd.name}\` - ${cmd.description}\n`;
        }
        md += '\n';
      }

      if (agents.length > 0) {
        md += `**Agents:**\n`;
        for (const agent of agents) {
          md += `- \`${agent.name}\` - ${agent.description}\n`;
        }
        md += '\n';
      }

      if (skills.length > 0) {
        md += `**Skills:**\n`;
        for (const skill of skills) {
          md += `- \`${skill.name}\` - ${skill.description}\n`;
        }
        md += '\n';
      }

      if (hooks.length > 0) {
        md += `**Hooks:**\n`;
        for (const hook of hooks) {
          md += `- \`${hook.name}\` - ${hook.description}\n`;
        }
        md += '\n';
      }
    }
  }

  md += `### Update Instructions\n\n`;
  md += `\`\`\`bash\nnpm update -g claude-cli-advanced-starter-pack\n\`\`\`\n\n`;
  md += `After updating, run \`/update-check\` to add new features to your project.\n`;

  return md;
}

// ============================================================================
// AUTO-UPDATE SYSTEM
// Manages automatic update checking and notification scheduling
// ============================================================================

/**
 * Get auto-update settings
 */
export function getAutoUpdateSettings(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  return state.autoUpdate || {
    enabled: false,
    frequency: 'weekly',
    lastAutoCheck: 0,
    notificationMode: 'banner',
    handleCustomizations: 'ask',
    skippedFiles: [],
    backupBeforeUpdate: true,
    dismissedNotifications: [],
  };
}

/**
 * Update auto-update settings
 */
export function updateAutoUpdateSettings(settings, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  state.autoUpdate = {
    ...state.autoUpdate,
    ...settings,
  };
  saveUpdateState(state, projectDir);
}

/**
 * Check if auto-update check is due based on frequency setting
 */
export function isAutoUpdateCheckDue(projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);

  if (!settings.enabled) {
    return false;
  }

  const now = Date.now();
  const lastCheck = settings.lastAutoCheck || 0;
  const timeSinceCheck = now - lastCheck;

  const frequencies = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  const interval = frequencies[settings.frequency] || frequencies.weekly;
  return timeSinceCheck >= interval;
}

/**
 * Record that auto-update check was performed
 */
export function recordAutoUpdateCheck(projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate) {
    state.autoUpdate = {};
  }
  state.autoUpdate.lastAutoCheck = Date.now();
  saveUpdateState(state, projectDir);
}

/**
 * Add a skipped file to the auto-update state
 */
export function addSkippedFile(assetType, assetName, reason, templateVersion, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate) {
    state.autoUpdate = { skippedFiles: [] };
  }
  if (!state.autoUpdate.skippedFiles) {
    state.autoUpdate.skippedFiles = [];
  }

  const skippedEntry = {
    path: `${assetType}/${assetName}`,
    assetType,
    assetName,
    reason,
    templateVersion,
    timestamp: Date.now(),
  };

  // Remove existing entry if present
  state.autoUpdate.skippedFiles = state.autoUpdate.skippedFiles.filter(
    (f) => f.path !== skippedEntry.path
  );

  // Add new entry
  state.autoUpdate.skippedFiles.push(skippedEntry);

  saveUpdateState(state, projectDir);
}

/**
 * Remove a skipped file from the auto-update state
 */
export function removeSkippedFile(assetType, assetName, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);
  if (!state.autoUpdate || !state.autoUpdate.skippedFiles) {
    return;
  }
  const path = `${assetType}/${assetName}`;

  state.autoUpdate.skippedFiles = state.autoUpdate.skippedFiles.filter(
    (f) => f.path !== path
  );

  saveUpdateState(state, projectDir);
}

/**
 * Get all currently skipped files
 */
export function getSkippedFiles(projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);
  return settings.skippedFiles || [];
}

/**
 * Dismiss a notification
 */
export function dismissAutoUpdateNotification(notificationId, projectDir = process.cwd()) {
  const state = loadUpdateState(projectDir);

  if (!state.autoUpdate) {
    state.autoUpdate = {};
  }
  if (!state.autoUpdate.dismissedNotifications) {
    state.autoUpdate.dismissedNotifications = [];
  }

  state.autoUpdate.dismissedNotifications.push({
    id: notificationId,
    timestamp: Date.now(),
  });

  saveUpdateState(state, projectDir);
}

/**
 * Check if notification should be shown
 */
export function shouldShowAutoUpdateNotification(notificationId, projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);
  const dismissed = settings.dismissedNotifications || [];

  // Check if dismissed in last 7 days
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentlyDismissed = dismissed.some(
    (d) => d.id === notificationId && d.timestamp > sevenDaysAgo
  );

  return !recentlyDismissed;
}

export default {
  getCurrentVersion,
  loadUpdateState,
  saveUpdateState,
  compareVersions,
  checkLatestVersion,
  getPackageInfo,
  loadReleaseNotes,
  getReleaseNotes,
  getReleasesSince,
  getNewFeaturesSince,
  shouldShowUpdateNotification,
  performVersionCheck,
  dismissUpdateNotification,
  markFeatureInstalled,
  markFeatureSkipped,
  getAvailableFeatures,
  formatUpdateBanner,
  formatUpdateMarkdown,
  // Usage tracking exports
  loadUsageTracking,
  saveUsageTracking,
  trackAssetUsage,
  markAssetCustomized,
  getUsedAssets,
  getCustomizedUsedAssets,
  isAssetCustomized,
  getUsageStats,
  // Auto-update exports
  getAutoUpdateSettings,
  updateAutoUpdateSettings,
  isAutoUpdateCheckDue,
  recordAutoUpdateCheck,
  addSkippedFile,
  removeSkippedFile,
  getSkippedFiles,
  dismissAutoUpdateNotification,
  shouldShowAutoUpdateNotification,
};
