/**
 * Smart Site Intel - State Manager
 *
 * Manages persistent state for dev scanning including per-route scores,
 * historical trends, and scan diff tracking.
 */

import fs from 'fs';
import path from 'path';

const STATE_VERSION = '1.0.0';
const MAX_HISTORY_ENTRIES = 20;

/**
 * Get the default state file path
 */
export function getStateFilePath(projectRoot) {
  return path.join(projectRoot, '.claude', 'site-intel', 'dev-app', 'site-intel-state.json');
}

/**
 * Create an initial empty state
 */
export function initializeState(projectRoot, projectName = '') {
  return {
    version: STATE_VERSION,
    projectName: projectName || path.basename(projectRoot),
    projectRoot,
    lastScanTime: null,
    lastScanType: null,
    lastCommitHash: null,
    lastCommitMessage: null,
    totalRoutes: 0,
    overallHealth: {
      score: 0,
      grade: 'N/A',
      testIdCoverage: 0,
      avgA11yViolations: 0,
      avgPerformance: 0,
    },
    routes: {},
    latestDiffs: {
      scanId: null,
      commitRange: null,
      changedFiles: [],
      affectedRoutes: [],
      improvements: [],
      regressions: [],
      unchanged: 0,
    },
    quickCheck: {
      lastRun: null,
      overallCoverage: 0,
      routeResults: {},
    },
  };
}

/**
 * Load the dev scan state from disk
 *
 * @param {string} projectRoot - Project root path
 * @returns {Object|null} State object or null if no state exists
 */
export function loadState(projectRoot) {
  const statePath = getStateFilePath(projectRoot);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[DevScan] Failed to load state: ${error.message}`);
    return null;
  }
}

/**
 * Save the dev scan state to disk
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} state - State object to save
 * @returns {Object} Result with success status
 */
export function saveState(projectRoot, state) {
  const statePath = getStateFilePath(projectRoot);
  const stateDir = path.dirname(statePath);

  try {
    fs.mkdirSync(stateDir, { recursive: true });

    state.version = STATE_VERSION;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return { success: true, path: statePath };
  } catch (error) {
    console.error(`[DevScan] Failed to save state: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate overall health metrics from route scores
 */
export function calculateOverallHealth(routes) {
  const routeEntries = Object.values(routes).filter(r => r.scores);

  if (routeEntries.length === 0) {
    return { score: 0, grade: 'N/A', testIdCoverage: 0, avgA11yViolations: 0, avgPerformance: 0 };
  }

  const avgTestId = routeEntries.reduce((sum, r) => sum + (r.scores.testIdCoverage || 0), 0) / routeEntries.length;
  const avgA11y = routeEntries.reduce((sum, r) => sum + (r.scores.a11yViolations || 0), 0) / routeEntries.length;
  const avgPerf = routeEntries.reduce((sum, r) => sum + (r.scores.lighthousePerf || 0), 0) / routeEntries.length;

  // Composite score: weighted average (testId 30%, a11y 30%, perf 20%, component health 20%)
  const avgHealth = routeEntries.reduce((sum, r) => sum + (r.scores.componentHealth || 0), 0) / routeEntries.length;
  const score = Math.round(
    (avgTestId * 30) +
    (Math.max(0, 1 - avgA11y / 10) * 30) +
    ((avgPerf / 100) * 20) +
    (avgHealth * 20)
  );

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return {
    score,
    grade,
    testIdCoverage: Math.round(avgTestId * 100) / 100,
    avgA11yViolations: Math.round(avgA11y * 10) / 10,
    avgPerformance: Math.round(avgPerf),
  };
}

/**
 * Update state with new scan results
 *
 * @param {Object} state - Current state
 * @param {Object[]} scanResults - Array of per-route scan results
 * @param {Object} scanMeta - Scan metadata (commitHash, scanType, etc.)
 * @returns {Object} Updated state
 */
export function updateStateWithResults(state, scanResults, scanMeta) {
  const now = new Date().toISOString();

  for (const result of scanResults) {
    const routePath = result.path;

    // Preserve history from existing route entry
    const existing = state.routes[routePath];
    const history = existing?.history || [];

    // If there's an existing score, push it to history before overwriting
    if (existing?.scores && existing?.lastScanned) {
      history.unshift({
        timestamp: existing.lastScanned,
        commitHash: state.lastCommitHash,
        scores: { ...existing.scores },
      });

      // Trim history to max entries
      if (history.length > MAX_HISTORY_ENTRIES) {
        history.length = MAX_HISTORY_ENTRIES;
      }
    }

    state.routes[routePath] = {
      component: result.component || existing?.component || null,
      componentFile: result.componentFile || existing?.componentFile || null,
      hooks: result.hooks || existing?.hooks || [],
      apiCalls: result.apiCalls || existing?.apiCalls || [],
      scores: {
        testIdCoverage: result.testIdCoverage ?? 0,
        a11yViolations: result.a11yViolations ?? 0,
        a11yCritical: result.a11yCritical ?? 0,
        a11ySerious: result.a11ySerious ?? 0,
        lighthousePerf: result.lighthousePerf ?? 0,
        lighthouseA11y: result.lighthouseA11y ?? 0,
        componentHealth: result.componentHealth ?? 0,
      },
      lastScanned: now,
      scanType: scanMeta.scanType || 'full',
      history,
    };
  }

  // Update top-level metadata
  state.lastScanTime = now;
  state.lastScanType = scanMeta.scanType || 'full';
  state.lastCommitHash = scanMeta.commitHash || state.lastCommitHash;
  state.lastCommitMessage = scanMeta.commitMessage || state.lastCommitMessage;
  state.totalRoutes = Object.keys(state.routes).length;
  state.overallHealth = calculateOverallHealth(state.routes);

  return state;
}

/**
 * Compute score diffs between old state and new scan results
 *
 * @param {Object} state - Current state (with old scores)
 * @param {Object[]} newResults - New scan results
 * @returns {Object} Diff report with improvements, regressions, unchanged
 */
export function computeScoreDiffs(state, newResults) {
  const improvements = [];
  const regressions = [];
  let unchanged = 0;

  const metrics = ['testIdCoverage', 'a11yViolations', 'lighthousePerf', 'lighthouseA11y', 'componentHealth'];

  for (const result of newResults) {
    const routePath = result.path;
    const oldRoute = state.routes[routePath];

    if (!oldRoute?.scores) {
      // New route, no diff possible
      continue;
    }

    let routeChanged = false;

    for (const metric of metrics) {
      const oldVal = oldRoute.scores[metric] ?? 0;
      const newVal = result[metric] ?? 0;
      const delta = newVal - oldVal;

      // For a11yViolations, lower is better (invert comparison)
      const isImprovement = metric === 'a11yViolations' ? delta < 0 : delta > 0;
      const isRegression = metric === 'a11yViolations' ? delta > 0 : delta < 0;

      // Only report meaningful changes (>= 0.01 for ratios, >= 1 for counts)
      const threshold = metric === 'a11yViolations' ? 1 : metric.includes('lighthouse') ? 1 : 0.01;

      if (Math.abs(delta) >= threshold) {
        routeChanged = true;
        const entry = {
          route: routePath,
          metric,
          from: oldVal,
          to: newVal,
          delta: Math.round(delta * 100) / 100,
        };

        if (isImprovement) {
          improvements.push(entry);
        } else if (isRegression) {
          regressions.push(entry);
        }
      }
    }

    if (!routeChanged) {
      unchanged++;
    }
  }

  // Sort by absolute delta (biggest changes first)
  improvements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  regressions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    improvements,
    regressions,
    unchanged,
    totalCompared: newResults.length,
    hasChanges: improvements.length > 0 || regressions.length > 0,
  };
}

/**
 * Get score history for a specific route
 *
 * @param {Object} state - Current state
 * @param {string} routePath - Route path
 * @returns {Object[]} Array of historical score snapshots
 */
export function getRouteHistory(state, routePath) {
  const route = state?.routes?.[routePath];
  if (!route) return [];

  // Current scores + history
  const current = {
    timestamp: route.lastScanned,
    commitHash: state.lastCommitHash,
    scores: { ...route.scores },
    isCurrent: true,
  };

  return [current, ...(route.history || [])];
}

export default {
  loadState,
  saveState,
  initializeState,
  calculateOverallHealth,
  updateStateWithResults,
  computeScoreDiffs,
  getRouteHistory,
};
