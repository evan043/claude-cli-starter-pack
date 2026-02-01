/**
 * Dev Mode State Management
 *
 * Centralized detection and management of CCASP development mode.
 * When dev-deploy links a worktree globally, this state is activated
 * so all CCASP instances can detect they're running a dev version.
 *
 * State file: ~/.claude/ccasp-dev-state.json
 */

import { existsSync, readFileSync, writeFileSync, lstatSync } from 'fs';
import { join } from 'path';
import { globalClaudePath } from './paths.js';
import { execSync } from 'child_process';

const DEV_STATE_FILE = 'ccasp-dev-state.json';

/**
 * Get global dev state file path
 * @returns {string} Path to ~/.claude/ccasp-dev-state.json
 */
export function getDevStatePath() {
  return globalClaudePath(DEV_STATE_FILE);
}

/**
 * Default dev state structure
 * @returns {Object} Empty dev state
 */
function defaultDevState() {
  return {
    isDevMode: false,
    worktreePath: null,
    linkedAt: null,
    version: null,
    projects: []
  };
}

/**
 * Load global dev mode state
 * @returns {Object} Dev mode state
 */
export function loadDevState() {
  const statePath = getDevStatePath();
  if (!existsSync(statePath)) {
    return defaultDevState();
  }
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    return { ...defaultDevState(), ...state };
  } catch {
    return defaultDevState();
  }
}

/**
 * Save global dev mode state
 * @param {Object} state - State to save
 */
export function saveDevState(state) {
  const statePath = getDevStatePath();
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Activate dev mode globally
 * @param {string} worktreePath - Path to the active worktree
 * @param {string} version - Dev version string
 */
export function activateDevMode(worktreePath, version) {
  const existingState = loadDevState();
  saveDevState({
    isDevMode: true,
    worktreePath,
    linkedAt: new Date().toISOString(),
    version,
    projects: existingState.projects || []
  });
}

/**
 * Deactivate dev mode globally
 * Preserves projects list for potential restoration
 */
export function deactivateDevMode() {
  const existingState = loadDevState();
  saveDevState({
    isDevMode: false,
    worktreePath: null,
    linkedAt: null,
    version: null,
    // Keep projects list for restoration prompt
    projects: existingState.projects || [],
    deactivatedAt: new Date().toISOString()
  });
}

/**
 * Clear pending restore projects
 */
export function clearPendingProjects() {
  const state = loadDevState();
  state.projects = [];
  delete state.deactivatedAt;
  saveDevState(state);
}

/**
 * Add a project to the backup list
 * @param {Object} projectInfo - Project backup info
 */
export function addBackedUpProject(projectInfo) {
  const state = loadDevState();
  state.projects = state.projects || [];

  // Avoid duplicates by path
  const existingIndex = state.projects.findIndex(p => p.path === projectInfo.path);
  if (existingIndex >= 0) {
    state.projects[existingIndex] = projectInfo;
  } else {
    state.projects.push(projectInfo);
  }

  saveDevState(state);
}

/**
 * Check if running in dev mode (fast check)
 * Also validates that the worktree still exists
 * @returns {boolean}
 */
export function isDevMode() {
  const state = loadDevState();

  if (!state.isDevMode) {
    return false;
  }

  // Verify the worktree still exists
  if (state.worktreePath && !existsSync(state.worktreePath)) {
    // Worktree was deleted, auto-cleanup
    deactivateDevMode();
    return false;
  }

  return true;
}

/**
 * Check if there are pending restore projects
 * (dev mode was deactivated but projects haven't been restored)
 * @returns {boolean}
 */
export function hasPendingRestore() {
  const state = loadDevState();
  return !state.isDevMode && state.projects && state.projects.length > 0;
}

/**
 * Get dev mode info for display
 * @returns {Object|null} Dev mode info or null if not in dev mode
 */
export function getDevModeInfo() {
  if (!isDevMode()) {
    return null;
  }

  const state = loadDevState();
  return {
    worktreePath: state.worktreePath,
    linkedAt: state.linkedAt,
    version: state.version,
    projectCount: state.projects?.length || 0
  };
}

/**
 * Alternative detection: Check if ccasp is a symlink (npm link)
 * Useful as a fallback if state file is missing
 * @returns {boolean}
 */
export function isSymlinkInstall() {
  try {
    const globalPath = execSync('npm root -g', { encoding: 'utf8', stdio: 'pipe' }).trim();
    const ccaspPath = join(globalPath, 'claude-cli-advanced-starter-pack');
    if (!existsSync(ccaspPath)) {
      return false;
    }
    return lstatSync(ccaspPath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Get the linked worktree path from npm (if linked)
 * @returns {string|null} Path to worktree or null
 */
export function getLinkedWorktreePath() {
  try {
    const output = execSync('npm ls -g claude-cli-advanced-starter-pack --json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const data = JSON.parse(output);
    const resolved = data.dependencies?.['claude-cli-advanced-starter-pack']?.resolved;
    if (resolved && resolved.startsWith('file:')) {
      return resolved.replace('file:', '');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Synchronize state with actual npm link status
 * Call this on startup to ensure state matches reality
 */
export function syncDevModeState() {
  const state = loadDevState();
  const isLinked = isSymlinkInstall();

  if (state.isDevMode && !isLinked) {
    // State says dev mode but not actually linked - fix state
    deactivateDevMode();
    return false;
  }

  if (!state.isDevMode && isLinked) {
    // Actually linked but state doesn't reflect it - update state
    const worktreePath = getLinkedWorktreePath();
    if (worktreePath) {
      activateDevMode(worktreePath, 'unknown');
      return true;
    }
  }

  return state.isDevMode;
}
