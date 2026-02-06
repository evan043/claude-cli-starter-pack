/**
 * Website Intelligence - Layer 5: Judgment Agent + Priority Engine
 *
 * Analyzes the complete site intelligence (inventory + graph + history)
 * to generate prioritized recommendations for what to work on next.
 */

/**
 * Impact factors and their weights
 */
const IMPACT_WEIGHTS = {
  businessValue: 0.25,
  smellSeverity: 0.20,
  userReach: 0.15,
  architecturalRisk: 0.15,
  effortEfficiency: 0.15,
  driftSeverity: 0.10
};

/**
 * Effort estimation based on issue type
 */
const EFFORT_MAP = {
  'Missing page title': 'S',
  'Missing H1 heading': 'S',
  'Missing meta description': 'S',
  'Page load error': 'M',
  'HTTP error': 'M',
  'Excessive DOM size': 'L',
  'Oversized HTML': 'L',
  'Too many forms': 'M',
  'Non-interactive app page': 'M',
  'Slow First Contentful Paint': 'L',
  'Slow Largest Contentful Paint': 'L',
  'Poor Cumulative Layout Shift': 'M',
  'High Total Blocking Time': 'L',
  'Low Performance Score': 'L',
  'Low SEO Score': 'M',
  'Critical Accessibility Violation': 'M',
  'Moderate Accessibility Violation': 'S'
};

/**
 * Calculate impact score for a page
 * @param {Object} summary - Page summary
 * @param {Object} graphMetrics - Graph metrics for this page
 * @returns {number} Impact score (0-10)
 */
function calculateImpactScore(summary, graphMetrics) {
  let score = 0;

  // Business value contribution
  score += (summary.businessValue?.score || 5) * IMPACT_WEIGHTS.businessValue;

  // Smell severity contribution
  const smellScore = summary.smells?.length > 0
    ? Math.min(10, summary.smells.length * 2 +
        summary.smells.filter(s => s.severity === 'high').length * 3)
    : 0;
  score += smellScore * IMPACT_WEIGHTS.smellSeverity;

  // User reach (based on graph connectivity)
  const connectivity = graphMetrics?.inDegree || 0;
  const reachScore = Math.min(10, connectivity * 2);
  score += reachScore * IMPACT_WEIGHTS.userReach;

  // Architectural risk (shared API count, dependency count)
  const apiCount = summary.dependencies?.apis?.length || 0;
  const riskScore = Math.min(10, apiCount * 2);
  score += riskScore * IMPACT_WEIGHTS.architecturalRisk;

  return Math.round(score * 10) / 10;
}

/**
 * Estimate effort for fixing issues on a page
 * @param {Object} summary - Page summary
 * @returns {string} Effort estimate: S, M, or L
 */
function estimateEffort(summary) {
  if (!summary.smells || summary.smells.length === 0) return 'S';

  const efforts = summary.smells.map(s => EFFORT_MAP[s.smell] || 'M');

  if (efforts.includes('L')) return 'L';
  if (efforts.includes('M')) return 'M';
  return 'S';
}

/**
 * Assess risk level
 * @param {Object} summary - Page summary
 * @param {Object} graphMetrics - Graph metrics
 * @returns {string} Risk level: Low, Medium, High
 */
function assessRisk(summary, graphMetrics) {
  let riskScore = 0;

  // High-value pages are riskier to change
  if (summary.businessValue?.value === 'High') riskScore += 2;

  // Pages with many dependents are riskier
  if ((graphMetrics?.inDegree || 0) > 3) riskScore += 2;

  // Pages with many API calls are riskier
  if ((summary.dependencies?.apis?.length || 0) > 2) riskScore += 1;

  // High severity smells increase risk
  if (summary.smells?.some(s => s.severity === 'high')) riskScore += 2;

  if (riskScore >= 4) return 'High';
  if (riskScore >= 2) return 'Medium';
  return 'Low';
}

/**
 * Generate prioritized recommendations
 * @param {Object} summaryResult - Result from summarizeAllPages()
 * @param {Object} graphResult - Result from buildSiteGraph()
 * @param {Object} options - Options { limit, focus }
 * @returns {Object} Recommendations
 */
export function generateRecommendations(summaryResult, graphResult, options = {}) {
  const { limit = 10, focus = 'all' } = options;

  if (!summaryResult?.summaries || !graphResult?.nodes) {
    return { success: false, error: 'Missing summary or graph data' };
  }

  // Build a metrics lookup from graph
  const graphLookup = new Map();
  if (graphResult.metrics) {
    for (const hub of graphResult.metrics.hubs || []) {
      const existing = graphLookup.get(hub.id) || {};
      graphLookup.set(hub.id, { ...existing, outDegree: hub.outDegree });
    }
    for (const auth of graphResult.metrics.authorities || []) {
      const existing = graphLookup.get(auth.id) || {};
      graphLookup.set(auth.id, { ...existing, inDegree: auth.inDegree });
    }
  }

  const recommendations = [];

  for (const summary of summaryResult.summaries) {
    let pathname;
    try { pathname = new URL(summary.url).pathname; } catch { pathname = summary.url; }

    const graphMetrics = graphLookup.get(pathname) || {};

    // Generate recommendations per smell
    if (summary.smells && summary.smells.length > 0) {
      const impactScore = calculateImpactScore(summary, graphMetrics);
      const effort = estimateEffort(summary);
      const risk = assessRisk(summary, graphMetrics);

      const smellDescriptions = summary.smells.map(s => s.smell).join(', ');

      recommendations.push({
        priority: impactScore >= 7 ? 'HIGH' : impactScore >= 4 ? 'MEDIUM' : 'LOW',
        title: `Fix issues on ${pathname}`,
        description: `${summary.smells.length} issue(s): ${smellDescriptions}`,
        impact_score: impactScore,
        effort,
        risk,
        affected_pages: [summary.url],
        page_type: summary.classification?.type || 'unknown',
        reasoning: `${summary.businessValue?.value || 'Unknown'} business value page with ${summary.smells.length} smell(s). ${graphMetrics.inDegree ? `Linked from ${graphMetrics.inDegree} other pages.` : ''}`,
        category: 'bugs'
      });
    }

    // Check for low-confidence classification (needs manual review)
    if (summary.classification?.confidence < 0.5) {
      recommendations.push({
        priority: 'LOW',
        title: `Review unclear page: ${pathname}`,
        description: `Page purpose unclear (${Math.round(summary.classification.confidence * 100)}% confidence)`,
        impact_score: 3,
        effort: 'S',
        risk: 'Low',
        affected_pages: [summary.url],
        page_type: summary.classification?.type || 'unknown',
        reasoning: 'Page type could not be confidently determined. May indicate poor structure or missing content.',
        category: 'refactor'
      });
    }
  }

  // Add orphan page recommendations
  if (graphResult.metrics?.orphans?.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      title: `${graphResult.metrics.orphans.length} orphan page(s) detected`,
      description: `Pages with no navigation links: ${graphResult.metrics.orphans.join(', ')}`,
      impact_score: 5,
      effort: 'M',
      risk: 'Low',
      affected_pages: graphResult.metrics.orphans,
      page_type: 'orphan',
      reasoning: 'Orphan pages are unreachable through normal navigation. They may be unused or missing from the nav.',
      category: 'refactor'
    });
  }

  // Add shared API consolidation recommendations
  if (graphResult.sharedAPIs?.length > 3) {
    recommendations.push({
      priority: 'LOW',
      title: 'High API coupling detected',
      description: `${graphResult.sharedAPIs.length} APIs shared across multiple pages`,
      impact_score: 4,
      effort: 'L',
      risk: 'Medium',
      affected_pages: [...new Set(graphResult.sharedAPIs.flatMap(a => a.usedBy))],
      page_type: 'architecture',
      reasoning: 'Many shared APIs can indicate tight coupling. Consider if API gateway or state management could reduce direct dependencies.',
      category: 'refactor'
    });
  }

  // Filter by focus
  let filtered = recommendations;
  if (focus !== 'all') {
    filtered = recommendations.filter(r => r.category === focus);
  }

  // Sort by impact score (descending)
  filtered.sort((a, b) => b.impact_score - a.impact_score);

  // Limit results
  const limited = filtered.slice(0, limit);

  return {
    success: true,
    recommendations: limited,
    total: filtered.length,
    shown: limited.length,
    focus,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate a Claude-ready prompt for deeper judgment analysis
 * @param {Object} summaryResult - Summary data
 * @param {Object} graphResult - Graph data
 * @param {Object[]} recommendations - Basic recommendations
 * @returns {string} Claude prompt
 */
export function generateJudgmentPrompt(summaryResult, graphResult, recommendations) {
  const pageTypes = summaryResult?.aggregate?.pageTypes || {};
  const totalSmells = summaryResult?.aggregate?.totalSmells || 0;
  const orphans = graphResult?.metrics?.orphanCount || 0;

  return `You are a staff engineer and product manager analyzing a website. Based on the intelligence gathered, provide prioritized recommendations.

## Site Overview
- Total Pages: ${summaryResult?.aggregate?.totalPages || 0}
- Page Types: ${Object.entries(pageTypes).map(([t, c]) => `${t}(${c})`).join(', ')}
- Total Issues Found: ${totalSmells}
- Orphan Pages: ${orphans}
- Shared APIs: ${graphResult?.sharedAPIs?.length || 0}
- Average Business Value: ${summaryResult?.aggregate?.averageBusinessValue || 'N/A'}/10

## Top Issues Detected
${recommendations.slice(0, 5).map((r, i) => `${i + 1}. [${r.priority}] ${r.title} (Impact: ${r.impact_score}, Effort: ${r.effort}, Risk: ${r.risk})`).join('\n')}

## User Flows
${graphResult?.userFlows?.slice(0, 5).map(f => `- ${f.name} (${f.length} steps)`).join('\n') || 'None detected'}

## Hub Pages (most outgoing links)
${graphResult?.metrics?.hubs?.map(h => `- ${h.id} (${h.outDegree} outgoing)`).join('\n') || 'None'}

## Authority Pages (most incoming links)
${graphResult?.metrics?.authorities?.map(a => `- ${a.id} (${a.inDegree} incoming)`).join('\n') || 'None'}

Based on this analysis, answer:
1. What is the single highest-leverage improvement to make right now?
2. What user flow is most at risk of breaking?
3. Are there pages that should be consolidated or removed?
4. What architectural concern should be addressed before adding new features?
5. Rate the overall site health (1-10) with reasoning.

Respond in JSON format with these 5 answers.`;
}

/**
 * Calculate overall site health score
 * @param {Object} summaryResult - Summary data
 * @param {Object} graphResult - Graph data
 * @returns {Object} Health score and breakdown
 */
export function calculateHealthScore(summaryResult, graphResult) {
  let score = 100;
  const deductions = [];

  if (!summaryResult?.summaries) return { score: 0, deductions: ['No data'] };

  // Deduct for smells
  const totalSmells = summaryResult.aggregate?.totalSmells || 0;
  const smellDeduction = Math.min(30, totalSmells * 2);
  if (smellDeduction > 0) {
    score -= smellDeduction;
    deductions.push(`-${smellDeduction} for ${totalSmells} issue(s)`);
  }

  // Deduct for orphan pages
  const orphanCount = graphResult?.metrics?.orphanCount || 0;
  const orphanDeduction = Math.min(15, orphanCount * 5);
  if (orphanDeduction > 0) {
    score -= orphanDeduction;
    deductions.push(`-${orphanDeduction} for ${orphanCount} orphan page(s)`);
  }

  // Deduct for low-confidence pages
  const lowConfidence = summaryResult.summaries.filter(s => s.classification?.confidence < 0.5).length;
  const confDeduction = Math.min(10, lowConfidence * 3);
  if (confDeduction > 0) {
    score -= confDeduction;
    deductions.push(`-${confDeduction} for ${lowConfidence} unclear page(s)`);
  }

  // Deduct for error pages
  const errorPages = summaryResult.summaries.filter(s => s.smells?.some(sm => sm.severity === 'high')).length;
  const errorDeduction = Math.min(20, errorPages * 5);
  if (errorDeduction > 0) {
    score -= errorDeduction;
    deductions.push(`-${errorDeduction} for ${errorPages} page(s) with high-severity issues`);
  }

  return {
    score: Math.max(0, score),
    deductions,
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F'
  };
}

export default { generateRecommendations, generateJudgmentPrompt, calculateHealthScore };
