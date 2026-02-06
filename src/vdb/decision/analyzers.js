/**
 * Decision Engine Analyzers
 *
 * Analysis functions for gap detection, balance checks, velocity trends, and failure classification
 */

/**
 * Classify failure type based on error message
 */
export function classifyFailure(error) {
  const errorStr = String(error).toLowerCase();

  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return 'timeout';
  }
  if (errorStr.includes('dependency') || errorStr.includes('not found')) {
    return 'dependency';
  }
  if (errorStr.includes('test') || errorStr.includes('assert')) {
    return 'test_failure';
  }
  if (errorStr.includes('permission') || errorStr.includes('access denied')) {
    return 'permission';
  }
  if (errorStr.includes('network') || errorStr.includes('econnrefused')) {
    return 'network';
  }

  return 'unknown';
}

/**
 * Analyze velocity trend from history
 */
export function analyzeVelocityTrend(velocity) {
  if (!velocity?.history || velocity.history.length < 3) {
    return 'insufficient_data';
  }

  const recent = velocity.history.slice(-7);
  const older = velocity.history.slice(-14, -7);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

  const change = (recentAvg - olderAvg) / olderAvg;

  if (change > 0.1) return 'improving';
  if (change < -0.1) return 'declining';
  return 'stable';
}

/**
 * Calculate feature/platform balance and get recommendation
 */
export function calculateBalanceRatios(epics) {
  const counts = { feature: 0, platform: 0, techDebt: 0, research: 0, other: 0 };

  for (const epic of (epics || [])) {
    if (epic.status !== 'active') continue;
    const type = epic.type || 'feature';
    counts[type] = (counts[type] || 0) + 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { counts, ratios: {}, recommendation: { status: 'empty' } };
  }

  const ratios = {};
  for (const [key, value] of Object.entries(counts)) {
    ratios[key] = value / total;
  }

  return { counts, ratios };
}

export function getBalanceRecommendation(ratios, thresholds) {
  const defaultThresholds = {
    minFeatureRatio: 0.5,
    maxFeatureRatio: 0.8,
    ...thresholds
  };

  const featureRatio = ratios.feature || 0;

  if (featureRatio > defaultThresholds.maxFeatureRatio) {
    return {
      status: 'imbalanced',
      message: 'Too feature-heavy. Consider platform/infrastructure work.',
      suggestedAction: 'prioritize_platform_epic'
    };
  }

  if (featureRatio < defaultThresholds.minFeatureRatio) {
    return {
      status: 'imbalanced',
      message: 'Too platform-heavy. Ship user-facing features.',
      suggestedAction: 'prioritize_feature_epic'
    };
  }

  return { status: 'healthy', message: 'Good balance' };
}

/**
 * Check for gaps in a specific area (testing, documentation, security)
 */
export function checkGapInArea(epic, area) {
  const phases = epic?.phases || [];

  switch (area) {
    case 'testing': {
      const hasTestingPhase = phases.some(p =>
        p.phase_title?.toLowerCase().includes('test') ||
        p.goal?.toLowerCase().includes('test')
      );
      if (!hasTestingPhase) {
        return {
          area: 'testing',
          severity: 'high',
          description: 'No testing phase found in epic',
          suggestedAction: 'add_testing_phase'
        };
      }
      break;
    }

    case 'documentation': {
      const hasDocsPhase = phases.some(p =>
        p.phase_title?.toLowerCase().includes('doc') ||
        p.outputs?.some(o => o.toLowerCase().includes('doc'))
      );
      if (!hasDocsPhase && phases.length > 2) {
        return {
          area: 'documentation',
          severity: 'medium',
          description: 'No documentation phase found',
          suggestedAction: 'add_documentation_phase'
        };
      }
      break;
    }

    case 'security': {
      const hasSecurityReview = phases.some(p =>
        p.phase_title?.toLowerCase().includes('security') ||
        p.goal?.toLowerCase().includes('security')
      );
      if (!hasSecurityReview && epic.type !== 'techDebt') {
        return {
          area: 'security',
          severity: 'medium',
          description: 'No security review phase',
          suggestedAction: 'add_security_review'
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Analyze epic for gaps in development areas
 */
export function analyzeEpicGaps(epic, checkAreas) {
  const gaps = [];
  const areas = checkAreas || ['testing', 'documentation'];

  for (const area of areas) {
    const gapFound = checkGapInArea(epic, area);
    if (gapFound) {
      gaps.push(gapFound);
    }
  }

  return gaps;
}

/**
 * Calculate phase progress
 */
export function calculatePhaseProgress(task, context) {
  // Estimate based on task completion
  return 100; // Simplified - task complete = phase complete for now
}

/**
 * Calculate vision progress
 */
export function calculateVisionProgress(epics) {
  const total = epics.length;
  const completed = epics.filter(e => e.status === 'completed').length;

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Find next executable phase from remaining phases
 */
export function findNextPhase(remainingPhases, epic) {
  const completedIds = (epic.phases || [])
    .filter(p => p.status === 'completed')
    .map(p => p.phase_id);

  return remainingPhases.find(phase => {
    const deps = phase.dependencies || [];
    return deps.every(d => completedIds.includes(d));
  });
}

/**
 * Suggest next epic based on priority
 */
export function suggestNextEpic(epics) {
  const planned = epics.filter(e => e.status === 'planned' || e.status === 'backlog');

  // Sort by priority
  planned.sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  return planned[0];
}

/**
 * Count stale tasks across epics
 */
export function countStaleTasks(epics) {
  return epics.reduce((count, epic) => {
    return count + (epic.phases?.filter(p => p.stale)?.length || 0);
  }, 0);
}
