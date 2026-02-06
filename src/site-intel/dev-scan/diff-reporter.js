/**
 * Smart Site Intel - Diff Reporter
 *
 * Generates formatted reports from score diffs, showing improvements
 * and regressions in a human-readable format for both CLI and dashboard.
 */

/**
 * Get a human-friendly name for a metric
 */
function getMetricName(metric) {
  const names = {
    testIdCoverage: 'TestID Coverage',
    a11yViolations: 'A11y Violations',
    lighthousePerf: 'Performance',
    lighthouseA11y: 'Lighthouse A11y',
    componentHealth: 'Component Health',
  };
  return names[metric] || metric;
}

/**
 * Format a metric value for display
 */
function formatMetricValue(metric, value) {
  if (metric === 'testIdCoverage' || metric === 'componentHealth') {
    return `${Math.round(value * 100)}%`;
  }
  if (metric.includes('lighthouse')) {
    return `${Math.round(value)}/100`;
  }
  if (metric === 'a11yViolations') {
    return `${value} violations`;
  }
  return String(value);
}

/**
 * Format a delta value with direction indicator
 */
function formatDelta(metric, delta) {
  const isPositive = metric === 'a11yViolations' ? delta < 0 : delta > 0;
  const arrow = isPositive ? '+' : '';

  if (metric === 'testIdCoverage' || metric === 'componentHealth') {
    return `${arrow}${Math.round(delta * 100)}%`;
  }
  if (metric.includes('lighthouse')) {
    return `${arrow}${Math.round(delta)}`;
  }
  return `${arrow}${delta}`;
}

/**
 * Generate a structured diff report from score comparisons
 *
 * @param {Object} diffs - Output from computeScoreDiffs()
 * @param {Object} options - Additional info (commitRange, changedFiles, etc.)
 * @returns {Object} Structured diff report
 */
export function generateDiffReport(diffs, options = {}) {
  const { commitRange = '', changedFiles = [], affectedRoutes = [], scanType = 'incremental' } = options;

  const report = {
    generatedAt: new Date().toISOString(),
    scanType,
    commitRange,
    summary: {
      totalImprovements: diffs.improvements.length,
      totalRegressions: diffs.regressions.length,
      unchanged: diffs.unchanged,
      totalCompared: diffs.totalCompared,
      changedFiles: changedFiles.length,
      affectedRoutes: affectedRoutes.length,
      overallTrend: diffs.improvements.length > diffs.regressions.length ? 'improving'
        : diffs.regressions.length > diffs.improvements.length ? 'regressing'
        : 'stable',
    },
    improvements: diffs.improvements.map(imp => ({
      ...imp,
      metricName: getMetricName(imp.metric),
      fromFormatted: formatMetricValue(imp.metric, imp.from),
      toFormatted: formatMetricValue(imp.metric, imp.to),
      deltaFormatted: formatDelta(imp.metric, imp.delta),
    })),
    regressions: diffs.regressions.map(reg => ({
      ...reg,
      metricName: getMetricName(reg.metric),
      fromFormatted: formatMetricValue(reg.metric, reg.from),
      toFormatted: formatMetricValue(reg.metric, reg.to),
      deltaFormatted: formatDelta(reg.metric, reg.delta),
    })),
  };

  return report;
}

/**
 * Format diff report for the web dashboard
 *
 * @param {Object} diffs - Output from computeScoreDiffs()
 * @param {Object} options - Additional context
 * @returns {Object} Dashboard-friendly format with HTML-safe data
 */
export function formatDiffForDashboard(diffs, options = {}) {
  const report = generateDiffReport(diffs, options);

  // Group improvements and regressions by route
  const byRoute = new Map();

  for (const item of [...report.improvements, ...report.regressions]) {
    if (!byRoute.has(item.route)) {
      byRoute.set(item.route, { route: item.route, improvements: [], regressions: [] });
    }
    const routeGroup = byRoute.get(item.route);
    const isImprovement = report.improvements.includes(item);
    if (isImprovement) {
      routeGroup.improvements.push(item);
    } else {
      routeGroup.regressions.push(item);
    }
  }

  return {
    ...report,
    byRoute: Array.from(byRoute.values()),
    hasData: diffs.hasChanges,
  };
}

/**
 * Format diff report for CLI terminal output
 *
 * @param {Object} diffs - Output from computeScoreDiffs()
 * @param {Object} options - Additional context
 * @returns {string} Formatted CLI output
 */
export function formatDiffForCli(diffs, options = {}) {
  const report = generateDiffReport(diffs, options);
  const lines = [];

  // Header
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════╗');
  lines.push('║  DEV SCAN DIFF REPORT                                ║');
  lines.push('╠══════════════════════════════════════════════════════╣');

  if (report.commitRange) {
    lines.push(`║  Commits: ${report.commitRange.padEnd(42)}║`);
  }

  const trend = report.summary.overallTrend === 'improving' ? 'IMPROVING'
    : report.summary.overallTrend === 'regressing' ? 'REGRESSING'
    : 'STABLE';
  lines.push(`║  Trend: ${trend.padEnd(44)}║`);
  lines.push(`║  Routes compared: ${String(report.summary.totalCompared).padEnd(34)}║`);
  lines.push(`║  Files changed: ${String(report.summary.changedFiles).padEnd(36)}║`);
  lines.push('╠══════════════════════════════════════════════════════╣');

  // Improvements
  if (report.improvements.length > 0) {
    lines.push('║  IMPROVEMENTS                                        ║');
    lines.push('╠══════════════════════════════════════════════════════╣');
    for (const imp of report.improvements.slice(0, 10)) {
      const route = imp.route.length > 25 ? '...' + imp.route.slice(-22) : imp.route;
      lines.push(`║  + ${route.padEnd(25)} ${imp.metricName.padEnd(16)} ${imp.fromFormatted} -> ${imp.toFormatted}`);
    }
    if (report.improvements.length > 10) {
      lines.push(`║  ... and ${report.improvements.length - 10} more improvements`);
    }
    lines.push('╠══════════════════════════════════════════════════════╣');
  }

  // Regressions
  if (report.regressions.length > 0) {
    lines.push('║  REGRESSIONS                                         ║');
    lines.push('╠══════════════════════════════════════════════════════╣');
    for (const reg of report.regressions.slice(0, 10)) {
      const route = reg.route.length > 25 ? '...' + reg.route.slice(-22) : reg.route;
      lines.push(`║  - ${route.padEnd(25)} ${reg.metricName.padEnd(16)} ${reg.fromFormatted} -> ${reg.toFormatted}`);
    }
    if (report.regressions.length > 10) {
      lines.push(`║  ... and ${report.regressions.length - 10} more regressions`);
    }
    lines.push('╠══════════════════════════════════════════════════════╣');
  }

  // No changes
  if (!diffs.hasChanges) {
    lines.push('║  No score changes detected.                          ║');
    lines.push('╠══════════════════════════════════════════════════════╣');
  }

  lines.push(`║  Unchanged routes: ${String(report.summary.unchanged).padEnd(33)}║`);
  lines.push('╚══════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}

export default { generateDiffReport, formatDiffForDashboard, formatDiffForCli };
