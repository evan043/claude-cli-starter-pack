/**
 * CCASP Update Check Hook
 *
 * Automatically checks for npm updates when Claude Code starts.
 * Runs on first UserPromptSubmit per session, caches results for 1 hour.
 *
 * Event: UserPromptSubmit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'claude-cli-advanced-starter-pack';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const STATE_FILE = '.claude/config/ccasp-state.json';
const SESSION_MARKER = '.claude/config/.ccasp-session-checked';

/**
 * Load state from file
 */
function loadState() {
  const statePath = path.join(process.cwd(), STATE_FILE);

  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      // Return default state
    }
  }

  return {
    lastCheckTimestamp: 0,
    lastCheckResult: null,
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    updateHighlights: [],
    updateFirstDisplayed: false,
    dismissedUntil: 0,
    projectImplCompleted: false,
  };
}

/**
 * Save state to file
 */
function saveState(state) {
  const statePath = path.join(process.cwd(), STATE_FILE);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Get installed version
 */
function getCurrentVersion() {
  try {
    // Try global install first (Windows-compatible: use stdio to suppress stderr)
    const result = execSync(`npm list -g ${PACKAGE_NAME} --json`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const data = JSON.parse(result);
    return data.dependencies?.[PACKAGE_NAME]?.version || null;
  } catch {
    // Try local install
    try {
      const pkgPath = path.join(process.cwd(), 'node_modules', PACKAGE_NAME, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version;
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

/**
 * Check npm for latest version
 */
function checkLatestVersion() {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Get release highlights from releases.json
 */
function getReleaseHighlights(fromVersion, toVersion) {
  try {
    // Try to read from global install
    const globalPath = execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
    const releasesPath = path.join(globalPath, PACKAGE_NAME, 'src', 'data', 'releases.json');

    if (fs.existsSync(releasesPath)) {
      const releases = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
      const highlights = [];

      for (const release of releases) {
        if (compareVersions(release.version, fromVersion) > 0 &&
            compareVersions(release.version, toVersion) <= 0) {
          highlights.push({
            version: release.version,
            summary: release.summary,
            highlights: release.highlights || [],
          });
        }
      }

      return highlights;
    }
  } catch {
    // Ignore
  }
  return [];
}

/**
 * Compare semantic versions
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
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
 * Check if we've already run this session
 */
function hasCheckedThisSession() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);

  if (fs.existsSync(markerPath)) {
    try {
      const content = fs.readFileSync(markerPath, 'utf8');
      const timestamp = parseInt(content, 10);
      // Consider session valid for 4 hours
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
        return true;
      }
    } catch {
      // Ignore
    }
  }
  return false;
}

/**
 * Mark session as checked
 */
function markSessionChecked() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);
  const markerDir = path.dirname(markerPath);

  if (!fs.existsSync(markerDir)) {
    fs.mkdirSync(markerDir, { recursive: true });
  }

  fs.writeFileSync(markerPath, Date.now().toString(), 'utf8');
}

/**
 * Main hook handler
 */
module.exports = async function ccaspUpdateCheck(context) {
  // Only run once per session
  if (hasCheckedThisSession()) {
    return { continue: true };
  }

  // Mark this session as checked
  markSessionChecked();

  // Load current state
  const state = loadState();
  const now = Date.now();

  // Check if cache is still valid
  if (state.lastCheckTimestamp && (now - state.lastCheckTimestamp) < CACHE_DURATION) {
    return { continue: true };
  }

  // Get current version
  const currentVersion = getCurrentVersion();
  if (!currentVersion) {
    return { continue: true };
  }

  // Check for latest version
  const latestVersion = checkLatestVersion();
  if (!latestVersion) {
    return { continue: true };
  }

  // Update state
  state.lastCheckTimestamp = now;
  state.currentVersion = currentVersion;
  state.latestVersion = latestVersion;
  state.updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

  // Get release highlights if update available
  if (state.updateAvailable) {
    state.updateHighlights = getReleaseHighlights(currentVersion, latestVersion);
    // Reset first displayed flag for new updates
    if (state.lastSeenUpdateVersion !== latestVersion) {
      state.updateFirstDisplayed = false;
      state.lastSeenUpdateVersion = latestVersion;
    }
  } else {
    state.updateHighlights = [];
  }

  // Save state
  saveState(state);

  return { continue: true };
};
