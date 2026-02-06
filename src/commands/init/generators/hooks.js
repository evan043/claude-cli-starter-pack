/**
 * Hook Generators
 *
 * Generate hook files for enforcement, monitoring, and workflow automation.
 */

/**
 * Generate starter hook file
 */
export function generateStarterHook(hookName, eventType = 'PreToolUse') {
  return `/**
 * ${hookName} Hook
 *
 * Event: ${eventType}
 * Description: Add your description here
 */

export default async function ${hookName.replace(/-/g, '_')}(context) {
  const { tool, input, session } = context;

  // Example: Log all tool usage
  console.log(\`[${hookName}] Tool: \${tool}, Input: \${JSON.stringify(input).slice(0, 100)}\`);

  // Return decision
  return {
    continue: true,  // Set to false to block the action
    // message: 'Optional message to show user',
    // modifiedInput: input,  // Optional: modify the input
  };
}
`;
}

/**
 * Generate CCASP update check hook (fallback if template not found)
 */
export function generateUpdateCheckHook() {
  return `/**
 * CCASP Update Check Hook
 *
 * Checks for npm updates when Claude Code starts.
 * Runs on first UserPromptSubmit per session, caches results for 1 hour.
 *
 * Event: UserPromptSubmit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'claude-cli-advanced-starter-pack';
const CACHE_DURATION = 60 * 60 * 1000;
const STATE_FILE = '.claude/config/ccasp-state.json';
const SESSION_MARKER = '.claude/config/.ccasp-session-checked';

function loadState() {
  const statePath = path.join(process.cwd(), STATE_FILE);
  if (fs.existsSync(statePath)) {
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { /* invalid JSON, use defaults */ }
  }
  return { lastCheckTimestamp: 0, updateAvailable: false, projectImplCompleted: false };
}

function saveState(state) {
  const statePath = path.join(process.cwd(), STATE_FILE);
  const stateDir = path.dirname(statePath);
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function hasCheckedThisSession() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);
  if (fs.existsSync(markerPath)) {
    try {
      const timestamp = parseInt(fs.readFileSync(markerPath, 'utf8'), 10);
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) return true;
    } catch { /* corrupted marker, re-check */ }
  }
  return false;
}

function markSessionChecked() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);
  const markerDir = path.dirname(markerPath);
  if (!fs.existsSync(markerDir)) fs.mkdirSync(markerDir, { recursive: true });
  fs.writeFileSync(markerPath, Date.now().toString(), 'utf8');
}

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number), p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    if ((p1[i] || 0) > (p2[i] || 0)) return 1;
    if ((p1[i] || 0) < (p2[i] || 0)) return -1;
  }
  return 0;
}

module.exports = async function ccaspUpdateCheck(context) {
  if (hasCheckedThisSession()) return { continue: true };
  markSessionChecked();

  const state = loadState();
  const now = Date.now();

  if (state.lastCheckTimestamp && (now - state.lastCheckTimestamp) < CACHE_DURATION) {
    return { continue: true };
  }

  try {
    const current = execSync('npm list -g ' + PACKAGE_NAME + ' --json 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    const currentVersion = JSON.parse(current).dependencies?.[PACKAGE_NAME]?.version;

    const latest = execSync('npm view ' + PACKAGE_NAME + ' version', { encoding: 'utf8', timeout: 10000 }).trim();

    state.lastCheckTimestamp = now;
    state.currentVersion = currentVersion;
    state.latestVersion = latest;
    state.updateAvailable = compareVersions(latest, currentVersion) > 0;
    saveState(state);
  } catch { /* network failure or npm not available, skip silently */ }

  return { continue: true };
};
`;
}
