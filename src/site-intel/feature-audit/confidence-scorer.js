/**
 * Feature Audit - Confidence Scorer
 *
 * Calculates confidence scores per feature based on truth table verification
 * and recency multiplier. Rolls up scores for phase, roadmap, epic, and system.
 *
 * Scoring Model:
 *   UI Exists        = 20 pts
 *   Backend Exists   = 20 pts
 *   API Wired        = 20 pts
 *   Data Persists    = 15 pts
 *   Permissions      = 15 pts
 *   Error Handling   = 15 pts
 *   Smoke Test Bonus = +5 pts
 *   Contract Test    = +5 pts
 *   Max Base         = 115
 *
 * Recency Multiplier:
 *   0-7 days   = 1.2x
 *   8-14 days  = 1.1x
 *   15-30 days = 1.0x
 *   31+ days   = 0.9x
 *
 * Confidence Levels:
 *   High   >= 85
 *   Medium 60-84
 *   Low    < 60
 */

import { getRecencyMultiplier } from './feature-mapper.js';

const SCORING = {
  ui_exists: 20,
  backend_exists: 20,
  api_wired: 20,
  data_persists: 15,
  permissions: 15,
  error_handling: 15,
  bonus_smoke_test: 5,
  bonus_contract_test: 5,
};

const MAX_SCORE = Object.values(SCORING).reduce((sum, v) => sum + v, 0);

/**
 * Get confidence level from a score
 */
function getConfidenceLevel(score) {
  if (score >= 85) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}

/**
 * Calculate confidence score for a single feature
 */
export function calculateConfidence(feature) {
  const tt = feature.truth_table || {};
  const tests = feature.tests || {};
  const recency = feature.recency || {};

  const breakdown = {
    ui_exists: tt.ui_exists?.verified ? SCORING.ui_exists : 0,
    backend_exists: tt.backend_exists?.verified ? SCORING.backend_exists : 0,
    api_wired: tt.api_wired?.verified ? SCORING.api_wired : 0,
    data_persists: tt.data_persists?.verified ? SCORING.data_persists : 0,
    permissions: tt.permissions?.verified ? SCORING.permissions : 0,
    error_handling: tt.error_handling?.verified ? SCORING.error_handling : 0,
    bonus_smoke_test: tests.has_smoke_test ? SCORING.bonus_smoke_test : 0,
    bonus_contract_test: tests.has_contract_test ? SCORING.bonus_contract_test : 0,
  };

  const baseScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const multiplier = getRecencyMultiplier(recency.days_since_completion);
  const finalScore = Math.round(baseScore * multiplier);

  return {
    score: baseScore,
    max_possible: MAX_SCORE,
    breakdown,
    recency_multiplier: multiplier,
    final_score: finalScore,
    level: getConfidenceLevel(finalScore),
  };
}

/**
 * Apply confidence scoring to all features
 */
export function scoreAllFeatures(features) {
  return features.map(feature => {
    feature.confidence = calculateConfidence(feature);
    return feature;
  });
}

/**
 * Calculate rollup averages for a group of features
 */
export function calculateRollup(features) {
  if (features.length === 0) {
    return { average_confidence: 0, level: 'Low', feature_count: 0 };
  }

  const total = features.reduce((sum, f) => sum + (f.confidence?.final_score || 0), 0);
  const avg = Math.round(total / features.length);

  return {
    average_confidence: avg,
    level: getConfidenceLevel(avg),
    feature_count: features.length,
    high_count: features.filter(f => f.confidence?.level === 'High').length,
    medium_count: features.filter(f => f.confidence?.level === 'Medium').length,
    low_count: features.filter(f => f.confidence?.level === 'Low').length,
  };
}

/**
 * Calculate rollups grouped by roadmap
 */
export function calculateRoadmapRollups(features) {
  const grouped = {};

  for (const feature of features) {
    const slug = feature.source_task?.roadmap_slug || 'unknown';
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(feature);
  }

  const rollups = {};
  for (const [slug, group] of Object.entries(grouped)) {
    rollups[slug] = calculateRollup(group);
  }

  return rollups;
}

/**
 * Calculate rollups grouped by phase
 */
export function calculatePhaseRollups(features) {
  const grouped = {};

  for (const feature of features) {
    const key = `${feature.source_task?.roadmap_slug || 'unknown'}-phase-${feature.source_task?.phase_id || 0}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(feature);
  }

  const rollups = {};
  for (const [key, group] of Object.entries(grouped)) {
    rollups[key] = calculateRollup(group);
  }

  return rollups;
}

export { SCORING, MAX_SCORE };

export default {
  calculateConfidence,
  scoreAllFeatures,
  calculateRollup,
  calculateRoadmapRollups,
  calculatePhaseRollups,
  SCORING,
  MAX_SCORE,
};
