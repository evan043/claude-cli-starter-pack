/**
 * Website Intelligence - Accessibility Auditing (axe-core)
 *
 * Runs WCAG 2.1 accessibility audits against Playwright pages using axe-core.
 * Degrades gracefully if @axe-core/playwright is not installed.
 */

let AxeBuilder;

try {
  AxeBuilder = (await import('@axe-core/playwright')).default;
} catch {
  // @axe-core/playwright not installed - will use fallback
}

/**
 * Run an accessibility audit on a Playwright page
 * @param {import('playwright').Page} page - Playwright page (already navigated)
 * @param {Object} options - Audit options
 * @returns {Promise<Object>} Accessibility audit results
 */
export async function runAccessibilityAudit(page, options = {}) {
  if (!AxeBuilder) {
    return createFallbackResult('axe-core not installed');
  }

  const { tags = ['wcag2a', 'wcag2aa', 'wcag21aa'] } = options;

  try {
    const results = await new AxeBuilder({ page })
      .withTags(tags)
      .analyze();

    const violations = results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.slice(0, 5).map(n => ({
        target: n.target.join(', '),
        html: (n.html || '').substring(0, 200),
        failureSummary: n.failureSummary
      }))
    }));

    return {
      success: true,
      violations,
      violationCount: violations.length,
      criticalCount: violations.filter(v => v.impact === 'critical').length,
      seriousCount: violations.filter(v => v.impact === 'serious').length,
      moderateCount: violations.filter(v => v.impact === 'moderate').length,
      minorCount: violations.filter(v => v.impact === 'minor').length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      auditedAt: new Date().toISOString()
    };
  } catch (err) {
    return createFallbackResult(err.message);
  }
}

/**
 * Create a fallback result when axe-core can't run
 * @param {string} reason - Why axe couldn't run
 * @returns {Object} Fallback result
 */
function createFallbackResult(reason) {
  return {
    success: false,
    violations: [],
    violationCount: 0,
    criticalCount: 0,
    seriousCount: 0,
    moderateCount: 0,
    minorCount: 0,
    passes: 0,
    incomplete: 0,
    fallbackReason: reason,
    auditedAt: new Date().toISOString()
  };
}

/**
 * Check if axe-core is available
 * @returns {boolean}
 */
export function isAxeAvailable() {
  return !!AxeBuilder;
}

export default { runAccessibilityAudit, isAxeAvailable };
