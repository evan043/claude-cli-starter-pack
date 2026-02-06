/**
 * Website Intelligence - Lighthouse Performance Auditing
 *
 * Runs Lighthouse audits against pages for performance, accessibility,
 * SEO, and best practices scoring. Degrades gracefully if lighthouse
 * is not installed.
 */

let lighthouse;
let desktopConfig;

try {
  lighthouse = (await import('lighthouse')).default;
  desktopConfig = (await import('lighthouse/core/config/desktop-config.js')).default;
} catch {
  // lighthouse not installed - will use fallback metrics
}

/**
 * Run a Lighthouse audit against a URL using an existing Chrome instance
 * @param {string} url - URL to audit
 * @param {number} port - Chrome DevTools Protocol port
 * @param {Object} options - Audit options
 * @returns {Promise<Object>} Audit results
 */
export async function runLighthouseAudit(url, port, options = {}) {
  if (!lighthouse) {
    return createFallbackResult(url, 'lighthouse not installed');
  }

  const { categories = ['performance', 'accessibility', 'seo', 'best-practices'] } = options;

  try {
    const config = {
      ...desktopConfig,
      settings: {
        ...desktopConfig?.settings,
        onlyCategories: categories,
        output: 'json',
        maxWaitForFcp: 15000,
        maxWaitForLoad: 35000,
        skipAudits: ['screenshot-thumbnails', 'final-screenshot']
      }
    };

    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error'
    }, config);

    if (!result?.lhr) {
      return createFallbackResult(url, 'No Lighthouse result returned');
    }

    const lhr = result.lhr;

    return {
      success: true,
      url,
      scores: {
        performance: Math.round((lhr.categories?.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories?.accessibility?.score || 0) * 100),
        seo: Math.round((lhr.categories?.seo?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories?.['best-practices']?.score || 0) * 100)
      },
      metrics: {
        fcp: lhr.audits?.['first-contentful-paint']?.numericValue || null,
        lcp: lhr.audits?.['largest-contentful-paint']?.numericValue || null,
        cls: lhr.audits?.['cumulative-layout-shift']?.numericValue || null,
        tbt: lhr.audits?.['total-blocking-time']?.numericValue || null,
        si: lhr.audits?.['speed-index']?.numericValue || null,
        tti: lhr.audits?.['interactive']?.numericValue || null
      },
      auditedAt: new Date().toISOString()
    };
  } catch (err) {
    return createFallbackResult(url, err.message);
  }
}

/**
 * Create a fallback result when Lighthouse can't run
 * @param {string} url - URL that was targeted
 * @param {string} reason - Why Lighthouse couldn't run
 * @returns {Object} Fallback result
 */
function createFallbackResult(url, reason) {
  return {
    success: false,
    url,
    scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
    metrics: { fcp: null, lcp: null, cls: null, tbt: null, si: null, tti: null },
    fallbackReason: reason,
    auditedAt: new Date().toISOString()
  };
}

/**
 * Check if Lighthouse is available
 * @returns {boolean}
 */
export function isLighthouseAvailable() {
  return !!lighthouse;
}

export default { runLighthouseAudit, isLighthouseAvailable };
