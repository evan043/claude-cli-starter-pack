/**
 * Feature Audit - State Manager
 *
 * Manages persistent state for feature truth verification.
 * Follows the same pattern as dev-scan/state-manager.js.
 */

import fs from 'fs';
import path from 'path';

const STATE_VERSION = '1.0.0';
const MAX_HISTORY_ENTRIES = 10;

/**
 * Get the default state file path
 */
export function getStateFilePath(projectRoot) {
  return path.join(projectRoot, '.claude', 'site-intel', 'dev-app', 'feature-truth-state.json');
}

/**
 * Create an initial empty state
 */
export function initializeState(projectRoot) {
  return {
    version: STATE_VERSION,
    generated_at: new Date().toISOString(),
    source: {
      epic_slug: null,
      roadmap_slugs: [],
      progress_files_read: 0,
      vision_slug: null,
    },
    features: [],
    summary: {
      total_features: 0,
      fully_verified: 0,
      partially_verified: 0,
      unverified: 0,
      average_confidence: 0,
      gaps_found: 0,
      high_priority_gaps: 0,
      tests_recommended: {
        smoke_tests: 0,
        contract_tests: 0,
      },
    },
    history: [],
  };
}

/**
 * Load the feature audit state from disk
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
    console.error(`[FeatureAudit] Failed to load state: ${error.message}`);
    return null;
  }
}

/**
 * Save the feature audit state to disk
 */
export function saveState(projectRoot, state) {
  const statePath = getStateFilePath(projectRoot);
  const stateDir = path.dirname(statePath);

  try {
    fs.mkdirSync(stateDir, { recursive: true });

    state.version = STATE_VERSION;
    state.generated_at = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return { success: true, path: statePath };
  } catch (error) {
    console.error(`[FeatureAudit] Failed to save state: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Push current state to history before updating
 */
export function pushHistory(state) {
  if (state.features.length > 0) {
    const snapshot = {
      timestamp: state.generated_at,
      total_features: state.summary.total_features,
      average_confidence: state.summary.average_confidence,
      gaps_found: state.summary.gaps_found,
      fully_verified: state.summary.fully_verified,
    };

    if (!state.history) state.history = [];
    state.history.unshift(snapshot);

    if (state.history.length > MAX_HISTORY_ENTRIES) {
      state.history.length = MAX_HISTORY_ENTRIES;
    }
  }

  return state;
}

/**
 * Calculate summary from features
 */
export function calculateSummary(features) {
  const total = features.length;
  if (total === 0) {
    return {
      total_features: 0,
      fully_verified: 0,
      partially_verified: 0,
      unverified: 0,
      average_confidence: 0,
      gaps_found: 0,
      high_priority_gaps: 0,
      tests_recommended: { smoke_tests: 0, contract_tests: 0 },
    };
  }

  let fullyVerified = 0;
  let partiallyVerified = 0;
  let unverified = 0;
  let totalConfidence = 0;
  let gapsFound = 0;
  let highPriorityGaps = 0;
  let smokeTestsNeeded = 0;
  let contractTestsNeeded = 0;

  for (const feature of features) {
    const tt = feature.truth_table;
    const dimensions = ['ui_exists', 'backend_exists', 'api_wired', 'data_persists', 'permissions', 'error_handling'];
    const verifiedCount = dimensions.filter(d => tt[d]?.verified === true).length;

    if (verifiedCount === dimensions.length) fullyVerified++;
    else if (verifiedCount > 0) partiallyVerified++;
    else unverified++;

    totalConfidence += feature.confidence?.final_score || 0;

    if (feature.gap_analysis?.is_gap) {
      gapsFound++;
      if (feature.gap_analysis.priority === 'high') highPriorityGaps++;
    }

    if (!feature.tests?.has_smoke_test) smokeTestsNeeded++;
    if (!feature.tests?.has_contract_test && tt.backend_exists?.verified) contractTestsNeeded++;
  }

  return {
    total_features: total,
    fully_verified: fullyVerified,
    partially_verified: partiallyVerified,
    unverified,
    average_confidence: Math.round(totalConfidence / total),
    gaps_found: gapsFound,
    high_priority_gaps: highPriorityGaps,
    tests_recommended: {
      smoke_tests: smokeTestsNeeded,
      contract_tests: contractTestsNeeded,
    },
  };
}

export default {
  loadState,
  saveState,
  initializeState,
  pushHistory,
  calculateSummary,
  getStateFilePath,
};
