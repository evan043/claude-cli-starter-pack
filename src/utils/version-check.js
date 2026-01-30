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

// Update notification duration: 1 day (in milliseconds)
const UPDATE_NOTIFICATION_DURATION = 24 * 60 * 60 * 1000;

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
 */
export async function checkLatestVersion() {
  try {
    // Use npm view command to get latest version
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf8',
      timeout: 10000, // 10 second timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return result.trim();
  } catch {
    // Silently fail - network might be unavailable
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

  // Check if we have a cached check result with timestamp
  if (state.lastCheckResult && state.lastCheckTimestamp) {
    const timeSinceCheck = Date.now() - state.lastCheckTimestamp;

    // If check is more than 1 day old, don't show notification
    // (user needs to run check again to see new updates)
    if (timeSinceCheck > UPDATE_NOTIFICATION_DURATION) {
      return false;
    }
  }

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
};
