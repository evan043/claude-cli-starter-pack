/**
 * Feature Audit - Gap Analyzer
 *
 * Identifies gaps in feature coverage and prioritizes them by recency,
 * missing coverage, and feature importance.
 *
 * Gap Types:
 *   recently-completed-untested - Completed task, no test coverage (HIGHEST priority)
 *   partially-verified - Some truth table cells unverified
 *   regression-risk - Modified after completion without updated tests
 *   stale-unverified - Old feature, never verified
 */

/**
 * Classify a feature into a gap type
 */
function classifyGap(feature) {
  const tt = feature.truth_table || {};
  const tests = feature.tests || {};
  const recency = feature.recency || {};
  const sourceTask = feature.source_task || {};
  const confidence = feature.confidence || {};

  const isCompleted = sourceTask.status === 'completed' || sourceTask.status === 'done';
  const isRecent = recency.days_since_completion !== null && recency.days_since_completion <= 14;
  const hasAnyTest = tests.has_smoke_test || tests.has_contract_test;

  const dimensions = ['ui_exists', 'backend_exists', 'api_wired', 'data_persists', 'permissions', 'error_handling'];
  const verifiedCount = dimensions.filter(d => tt[d]?.verified === true).length;
  const unknownCount = dimensions.filter(d => !tt[d] || tt[d].verified === undefined).length;

  // Recently completed but no tests
  if (isCompleted && isRecent && !hasAnyTest) {
    return {
      is_gap: true,
      gap_type: 'recently-completed-untested',
      priority: 'high',
      reason: `Feature completed ${recency.days_since_completion} day(s) ago with ${recency.git_commits_since} commits since, but no tests cover it`,
    };
  }

  // Completed and recent with low confidence
  if (isCompleted && isRecent && confidence.final_score < 60) {
    return {
      is_gap: true,
      gap_type: 'partially-verified',
      priority: 'high',
      reason: `Recently completed feature has low confidence (${confidence.final_score}). ${dimensions.length - verifiedCount} verification dimensions missing.`,
    };
  }

  // Has commits since completion, potentially modified without test updates
  if (isCompleted && recency.git_commits_since > 10 && !hasAnyTest) {
    return {
      is_gap: true,
      gap_type: 'regression-risk',
      priority: 'medium',
      reason: `${recency.git_commits_since} commits since feature was completed, no test coverage to catch regressions`,
    };
  }

  // Partially verified (some dimensions missing)
  if (verifiedCount > 0 && verifiedCount < dimensions.length && confidence.final_score < 70) {
    return {
      is_gap: true,
      gap_type: 'partially-verified',
      priority: isRecent ? 'high' : 'medium',
      reason: `${verifiedCount}/${dimensions.length} dimensions verified, confidence ${confidence.final_score}`,
    };
  }

  // Old, never verified
  if (!isRecent && verifiedCount === 0 && unknownCount > 0) {
    return {
      is_gap: true,
      gap_type: 'stale-unverified',
      priority: 'low',
      reason: 'Feature has never been verified against the codebase',
    };
  }

  // No tests but otherwise OK
  if (isCompleted && !hasAnyTest && verifiedCount >= 3) {
    return {
      is_gap: true,
      gap_type: 'recently-completed-untested',
      priority: isRecent ? 'high' : 'medium',
      reason: `Feature is verified but has no automated tests`,
    };
  }

  // Not a gap
  return {
    is_gap: false,
    gap_type: null,
    priority: null,
    reason: null,
  };
}

/**
 * Analyze gaps across all features
 */
export function analyzeGaps(features) {
  const analyzed = features.map(feature => {
    feature.gap_analysis = classifyGap(feature);
    return feature;
  });

  return analyzed;
}

/**
 * Get sorted gap list (highest priority first)
 */
export function getGapsSorted(features) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return features
    .filter(f => f.gap_analysis?.is_gap)
    .sort((a, b) => {
      const aPri = priorityOrder[a.gap_analysis.priority] ?? 3;
      const bPri = priorityOrder[b.gap_analysis.priority] ?? 3;
      if (aPri !== bPri) return aPri - bPri;

      // Within same priority, sort by recency (most recent first)
      const aDays = a.recency?.days_since_completion ?? 9999;
      const bDays = b.recency?.days_since_completion ?? 9999;
      return aDays - bDays;
    });
}

/**
 * Generate recommended actions for gaps
 */
export function generateRecommendations(gaps) {
  return gaps.map(feature => {
    const actions = [];
    const tt = feature.truth_table || {};
    const tests = feature.tests || {};

    if (!tests.has_smoke_test) {
      actions.push({
        type: 'generate-smoke-test',
        description: `Generate Playwright smoke test for "${feature.name}"`,
        command: `/create-smoke-test --feature "${feature.name}"`,
      });
    }

    if (!tests.has_contract_test && tt.backend_exists?.verified) {
      actions.push({
        type: 'generate-contract-test',
        description: `Generate backend contract test for "${feature.name}"`,
        command: `/feature-audit --generate-tests --feature "${feature.name}"`,
      });
    }

    if (!tt.error_handling?.verified) {
      actions.push({
        type: 'add-error-handling',
        description: `Add error handling to "${feature.name}" component`,
        suggestion: tt.ui_exists?.component_file
          ? `Add ErrorBoundary or try-catch in ${tt.ui_exists.component_file}`
          : 'Add error handling to the feature component',
      });
    }

    if (!tt.permissions?.verified && tt.backend_exists?.verified) {
      actions.push({
        type: 'add-auth-middleware',
        description: `Add authentication/authorization to "${feature.name}" endpoint`,
        suggestion: 'Add auth middleware (Depends(get_current_user) or requireAuth) to the API endpoint',
      });
    }

    return {
      feature_id: feature.id,
      feature_name: feature.name,
      gap_type: feature.gap_analysis.gap_type,
      priority: feature.gap_analysis.priority,
      reason: feature.gap_analysis.reason,
      confidence: feature.confidence?.final_score || 0,
      actions,
    };
  });
}

export default {
  analyzeGaps,
  getGapsSorted,
  generateRecommendations,
};
