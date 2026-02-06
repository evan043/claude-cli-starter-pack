/**
 * Smart Site Intel - Git Diff Engine
 *
 * Determines which files changed since the last dev scan and maps
 * them to affected application routes using the route catalog's
 * reverse file→route map.
 */

import { execSync } from 'child_process';
import path from 'path';
import { getAffectedRoutes } from './route-catalog.js';

/**
 * Get the current HEAD commit hash
 *
 * @param {string} projectRoot - Project root path
 * @returns {string|null} Current commit hash or null
 */
export function getCurrentCommitHash(projectRoot) {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get the current commit message (short)
 *
 * @param {string} projectRoot - Project root path
 * @returns {string|null} Current commit message or null
 */
export function getCurrentCommitMessage(projectRoot) {
  try {
    return execSync('git log -1 --format=%s', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get list of files changed between two commits
 *
 * @param {string} projectRoot - Project root path
 * @param {string} fromCommit - Starting commit hash
 * @param {string} toCommit - Ending commit hash (default: HEAD)
 * @returns {Object} Changed files info
 */
export function getChangedFilesSinceLastScan(projectRoot, fromCommit, toCommit = 'HEAD') {
  if (!fromCommit) {
    return {
      success: false,
      error: 'No previous commit hash to diff from',
      files: [],
      isFirstRun: true,
    };
  }

  try {
    // Check if fromCommit exists
    try {
      execSync(`git cat-file -t ${fromCommit}`, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      return {
        success: false,
        error: `Previous commit ${fromCommit} not found in git history`,
        files: [],
        isFirstRun: true,
      };
    }

    const output = execSync(`git diff --name-only ${fromCommit}..${toCommit}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const files = output.trim().split('\n').filter(Boolean);

    // Also include uncommitted changes (staged + unstaged)
    const uncommitted = execSync('git diff --name-only HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim().split('\n').filter(Boolean);

    const staged = execSync('git diff --name-only --cached', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim().split('\n').filter(Boolean);

    // Combine and deduplicate
    const allFiles = [...new Set([...files, ...uncommitted, ...staged])];

    // Filter to only source files (not config, lock files, etc.)
    const sourceFiles = allFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.html'].includes(ext);
    });

    return {
      success: true,
      files: sourceFiles,
      allFiles,
      totalChanged: allFiles.length,
      sourceChanged: sourceFiles.length,
      commitRange: `${fromCommit.substring(0, 7)}..${toCommit === 'HEAD' ? 'HEAD' : toCommit.substring(0, 7)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Git diff failed: ${error.message}`,
      files: [],
    };
  }
}

/**
 * Full pipeline: get changed files and map to affected routes
 *
 * @param {string} projectRoot - Project root path
 * @param {string} lastCommitHash - Last scanned commit hash
 * @param {Map} reverseMap - File→route reverse map from buildRouteCatalog
 * @param {Object} options - Options
 * @returns {Object} Affected routes with change info
 */
export function mapChangedFilesToRoutes(projectRoot, lastCommitHash, reverseMap, options = {}) {
  // Get changed files
  const diffResult = getChangedFilesSinceLastScan(projectRoot, lastCommitHash);

  if (!diffResult.success) {
    return {
      ...diffResult,
      affectedRoutes: [],
      isFullScanNeeded: diffResult.isFirstRun || false,
    };
  }

  if (diffResult.files.length === 0) {
    return {
      success: true,
      affectedRoutes: [],
      isFullScanNeeded: false,
      noChanges: true,
      commitRange: diffResult.commitRange,
    };
  }

  // Map files to routes
  const routeResult = getAffectedRoutes(reverseMap, diffResult.files, {
    routesFile: options.routesFile || '',
    totalRoutes: options.totalRoutes || 0,
    fullScanThreshold: options.fullScanThreshold || 0.3,
  });

  return {
    success: true,
    ...routeResult,
    changedFiles: diffResult.files,
    commitRange: diffResult.commitRange,
    totalChanged: diffResult.totalChanged,
    sourceChanged: diffResult.sourceChanged,
  };
}

export default {
  getCurrentCommitHash,
  getCurrentCommitMessage,
  getChangedFilesSinceLastScan,
  mapChangedFilesToRoutes,
};
