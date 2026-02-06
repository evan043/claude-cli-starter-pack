/**
 * Website Intelligence - Layer 2: Semantic Summarization
 *
 * Analyzes crawled page data to generate structured summaries:
 * - Page purpose classification
 * - Primary user identification
 * - Feature detection
 * - Dependency mapping
 * - Code smell detection
 * - Business value estimation
 */

/**
 * Page type classification based on URL patterns and content
 */
const PAGE_TYPE_PATTERNS = [
  { pattern: /^\/$|\/home|\/index/i, type: 'homepage', purpose: 'Main entry point and navigation hub' },
  { pattern: /\/login|\/signin|\/auth/i, type: 'authentication', purpose: 'User authentication and access control' },
  { pattern: /\/register|\/signup|\/join/i, type: 'registration', purpose: 'New user account creation' },
  { pattern: /\/dashboard/i, type: 'dashboard', purpose: 'Primary user workspace with data overview' },
  { pattern: /\/settings|\/preferences|\/config/i, type: 'settings', purpose: 'User or system configuration' },
  { pattern: /\/profile|\/account/i, type: 'profile', purpose: 'User profile management' },
  { pattern: /\/admin/i, type: 'admin', purpose: 'Administrative controls and management' },
  { pattern: /\/report|\/analytics|\/stats/i, type: 'reporting', purpose: 'Data visualization and reporting' },
  { pattern: /\/search|\/find|\/explore/i, type: 'search', purpose: 'Content discovery and search' },
  { pattern: /\/help|\/docs|\/faq|\/support/i, type: 'help', purpose: 'User assistance and documentation' },
  { pattern: /\/about|\/info|\/team/i, type: 'informational', purpose: 'Static informational content' },
  { pattern: /\/contact/i, type: 'contact', purpose: 'Communication and feedback collection' },
  { pattern: /\/pricing|\/plans/i, type: 'pricing', purpose: 'Product pricing and plan selection' },
  { pattern: /\/checkout|\/cart|\/payment/i, type: 'commerce', purpose: 'Purchase and payment processing' },
  { pattern: /\/blog|\/posts|\/articles|\/news/i, type: 'content', purpose: 'Content publishing and consumption' },
  { pattern: /\/api/i, type: 'api-docs', purpose: 'API documentation and reference' },
  { pattern: /\/404|\/error|\/not-found/i, type: 'error', purpose: 'Error handling and recovery' }
];

/**
 * User role patterns based on page type and content
 */
const USER_ROLE_MAP = {
  'homepage': 'All users',
  'authentication': 'All users',
  'registration': 'New users',
  'dashboard': 'Authenticated users',
  'settings': 'Authenticated users',
  'profile': 'Authenticated users',
  'admin': 'Administrators',
  'reporting': 'Managers / Analysts',
  'search': 'All users',
  'help': 'All users',
  'informational': 'Visitors',
  'contact': 'All users',
  'pricing': 'Prospects',
  'commerce': 'Customers',
  'content': 'Readers',
  'api-docs': 'Developers',
  'error': 'All users'
};

/**
 * Classify a page based on URL and metadata
 * @param {string} url - Page URL
 * @param {Object} metadata - Page metadata from crawler
 * @returns {Object} Classification result
 */
export function classifyPage(url, metadata) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }

  // Match against patterns
  for (const { pattern, type, purpose } of PAGE_TYPE_PATTERNS) {
    if (pattern.test(pathname)) {
      return {
        type,
        purpose,
        primaryUser: USER_ROLE_MAP[type] || 'Unknown',
        confidence: 0.8
      };
    }
  }

  // Fallback: infer from metadata
  if (metadata?.forms?.length > 0 && metadata.interactiveElements?.inputs > 3) {
    return { type: 'form-page', purpose: 'Data collection or editing', primaryUser: 'Authenticated users', confidence: 0.6 };
  }
  if (metadata?.headings?.length > 5 && metadata.bodyTextLength > 3000) {
    return { type: 'content', purpose: 'Content consumption', primaryUser: 'Readers', confidence: 0.5 };
  }

  return { type: 'unknown', purpose: 'Purpose unclear - needs manual review', primaryUser: 'Unknown', confidence: 0.3 };
}

/**
 * Detect features present on a page
 * @param {Object} pageData - Full page data from crawler
 * @returns {string[]} List of detected features
 */
export function detectFeatures(pageData) {
  const features = [];
  const { metadata, apiCalls, links, htmlLength } = pageData;

  if (!metadata) return features;

  // Navigation features
  if (metadata.navLinks?.length > 0) features.push('Navigation menu');

  // Form features
  if (metadata.forms?.length > 0) {
    const hasLogin = metadata.forms.some(f =>
      f.inputs.some(i => i.type === 'password')
    );
    if (hasLogin) features.push('Login form');
    else features.push(`Form (${metadata.forms[0].inputs.length} fields)`);
  }

  // Data display
  if (metadata.interactiveElements?.buttons > 3) features.push('Action buttons');
  if (metadata.interactiveElements?.modals > 0) features.push('Modal dialogs');

  // Content features
  if (metadata.headings?.length > 3) features.push('Structured content');
  if (metadata.images > 5) features.push('Image gallery');

  // Interactive features
  const hasSearch = metadata.forms?.some(f =>
    f.inputs.some(i => i.type === 'search' || i.name?.includes('search') || i.name?.includes('query'))
  );
  if (hasSearch) features.push('Search');

  // API integration
  if (apiCalls?.length > 0) {
    features.push(`API integration (${apiCalls.length} endpoints)`);
  }

  // External links
  if (pageData.externalLinks?.length > 3) features.push('External links');

  // Framework detection
  if (metadata.frameworkHints?.react) features.push('React components');
  if (metadata.frameworkHints?.vue) features.push('Vue components');
  if (metadata.frameworkHints?.angular) features.push('Angular components');

  return features;
}

/**
 * Map dependencies for a page
 * @param {Object} pageData - Full page data from crawler
 * @returns {Object} Dependencies map
 */
export function mapDependencies(pageData) {
  const dependencies = {
    apis: [],
    internalPages: [],
    externalServices: [],
    scripts: []
  };

  // API dependencies
  if (pageData.apiCalls) {
    dependencies.apis = pageData.apiCalls.map(a => a.url);
  }

  // Internal page dependencies (links to other pages)
  if (pageData.links) {
    dependencies.internalPages = pageData.links.slice(0, 20); // Cap at 20
  }

  // External service dependencies
  if (pageData.externalLinks) {
    dependencies.externalServices = pageData.externalLinks
      .map(url => { try { return new URL(url).hostname; } catch { return null; } })
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) // Unique
      .slice(0, 10);
  }

  // Script dependencies
  if (pageData.metadata?.scripts) {
    dependencies.scripts = pageData.metadata.scripts
      .filter(s => !s.includes('chunk') && !s.includes('vendor'))
      .slice(0, 10);
  }

  return dependencies;
}

/**
 * Detect code smells and issues
 * @param {Object} pageData - Full page data from crawler
 * @returns {Object[]} Detected smells with severity
 */
export function detectSmells(pageData) {
  const smells = [];
  const { metadata, statusCode, htmlLength, error } = pageData;

  // Error page
  if (error) {
    smells.push({ smell: 'Page load error', severity: 'high', detail: error });
    return smells;
  }

  // HTTP errors
  if (statusCode >= 400) {
    smells.push({ smell: `HTTP ${statusCode} error`, severity: 'high', detail: `Page returns ${statusCode}` });
  }

  // No title
  if (!metadata?.title) {
    smells.push({ smell: 'Missing page title', severity: 'medium', detail: 'No <title> tag found' });
  }

  // No h1
  if (!metadata?.h1) {
    smells.push({ smell: 'Missing H1 heading', severity: 'low', detail: 'No <h1> found - poor SEO/accessibility' });
  }

  // No meta description
  if (!metadata?.metaDescription) {
    smells.push({ smell: 'Missing meta description', severity: 'low', detail: 'No meta description tag' });
  }

  // Excessive DOM size
  if (metadata?.elementCount > 1500) {
    smells.push({ smell: 'Excessive DOM size', severity: 'medium', detail: `${metadata.elementCount} elements (recommended < 1500)` });
  }

  // Very large HTML
  if (htmlLength > 500000) {
    smells.push({ smell: 'Oversized HTML', severity: 'medium', detail: `${Math.round(htmlLength / 1024)}KB HTML` });
  }

  // Too many forms
  if (metadata?.forms?.length > 3) {
    smells.push({ smell: 'Too many forms', severity: 'low', detail: `${metadata.forms.length} forms on single page` });
  }

  // No interactive elements on a dashboard/app page
  if (metadata?.interactiveElements?.buttons === 0 && metadata?.interactiveElements?.inputs === 0) {
    const pathname = (() => { try { return new URL(pageData.url).pathname; } catch { return ''; } })();
    if (/dashboard|app|admin/i.test(pathname)) {
      smells.push({ smell: 'Non-interactive app page', severity: 'medium', detail: 'App page with no buttons or inputs' });
    }
  }

  // Performance smells (from Lighthouse data)
  if (pageData.lighthouse?.success) {
    const lh = pageData.lighthouse;
    if (lh.metrics.fcp > 3000) {
      smells.push({ smell: 'Slow First Contentful Paint', severity: 'high', detail: `FCP: ${Math.round(lh.metrics.fcp)}ms (target < 3000ms)` });
    }
    if (lh.metrics.lcp > 4000) {
      smells.push({ smell: 'Slow Largest Contentful Paint', severity: 'high', detail: `LCP: ${Math.round(lh.metrics.lcp)}ms (target < 4000ms)` });
    }
    if (lh.metrics.cls > 0.25) {
      smells.push({ smell: 'Poor Cumulative Layout Shift', severity: 'medium', detail: `CLS: ${lh.metrics.cls.toFixed(3)} (target < 0.25)` });
    }
    if (lh.metrics.tbt > 600) {
      smells.push({ smell: 'High Total Blocking Time', severity: 'medium', detail: `TBT: ${Math.round(lh.metrics.tbt)}ms (target < 600ms)` });
    }
    if (lh.scores.performance !== null && lh.scores.performance < 50) {
      smells.push({ smell: 'Low Performance Score', severity: 'high', detail: `Lighthouse performance: ${lh.scores.performance}/100` });
    }
    if (lh.scores.seo !== null && lh.scores.seo < 50) {
      smells.push({ smell: 'Low SEO Score', severity: 'medium', detail: `Lighthouse SEO: ${lh.scores.seo}/100` });
    }
  }

  // Accessibility smells (from axe-core data)
  if (pageData.accessibility?.success) {
    const a11y = pageData.accessibility;
    if (a11y.criticalCount > 0 || a11y.seriousCount > 0) {
      const count = a11y.criticalCount + a11y.seriousCount;
      const details = a11y.violations
        .filter(v => v.impact === 'critical' || v.impact === 'serious')
        .slice(0, 3)
        .map(v => v.id)
        .join(', ');
      smells.push({ smell: 'Critical Accessibility Violation', severity: 'high', detail: `${count} critical/serious: ${details}` });
    }
    if (a11y.moderateCount > 0) {
      smells.push({ smell: 'Moderate Accessibility Violation', severity: 'medium', detail: `${a11y.moderateCount} moderate violation(s)` });
    }
  }

  return smells;
}

/**
 * Estimate business value of a page
 * @param {Object} classification - Page classification result
 * @param {Object} pageData - Full page data from crawler
 * @returns {Object} Business value estimate
 */
export function estimateBusinessValue(classification, pageData) {
  const highValueTypes = ['dashboard', 'commerce', 'authentication', 'reporting'];
  const mediumValueTypes = ['search', 'profile', 'settings', 'admin', 'registration'];
  const lowValueTypes = ['informational', 'help', 'contact', 'error', 'content'];

  let value = 'Medium';
  let score = 5;

  if (highValueTypes.includes(classification.type)) {
    value = 'High';
    score = 8;
  } else if (lowValueTypes.includes(classification.type)) {
    value = 'Low';
    score = 3;
  }

  // Boost if page has many API calls (data-heavy)
  if (pageData.apiCalls?.length > 3) score = Math.min(10, score + 1);

  // Boost if page is an entry point (many incoming links would show this, but we estimate from features)
  if (pageData.metadata?.interactiveElements?.buttons > 5) score = Math.min(10, score + 1);

  return { value, score, reasoning: `${classification.type} page with ${pageData.apiCalls?.length || 0} API calls` };
}

/**
 * Generate a complete page summary
 * @param {Object} pageData - Full page data from crawler
 * @returns {Object} Complete page summary
 */
export function summarizePage(pageData) {
  const classification = classifyPage(pageData.url, pageData.metadata);
  const features = detectFeatures(pageData);
  const dependencies = mapDependencies(pageData);
  const smells = detectSmells(pageData);
  const businessValue = estimateBusinessValue(classification, pageData);

  return {
    url: pageData.url,
    title: pageData.title || pageData.metadata?.title || 'Untitled',
    classification,
    purpose: classification.purpose,
    primaryUser: classification.primaryUser,
    businessValue,
    features,
    dependencies,
    smells,
    stats: {
      htmlLength: pageData.htmlLength,
      elementCount: pageData.metadata?.elementCount || 0,
      linkCount: pageData.links?.length || 0,
      apiCallCount: pageData.apiCalls?.length || 0,
      imageCount: pageData.metadata?.images || 0,
      formCount: pageData.metadata?.forms?.length || 0
    },
    summarizedAt: new Date().toISOString()
  };
}

/**
 * Generate a Claude-ready prompt for deeper page analysis
 * @param {Object} pageData - Page data from crawler
 * @param {Object} pageSummary - Basic summary from summarizePage
 * @returns {string} Prompt for Claude
 */
export function generateDeepAnalysisPrompt(pageData, pageSummary) {
  return `Analyze this web page and provide a detailed assessment:

URL: ${pageData.url}
Title: ${pageData.title || 'None'}
Page Type: ${pageSummary.classification.type}
H1: ${pageData.metadata?.h1 || 'None'}

Detected Features: ${pageSummary.features.join(', ') || 'None detected'}
API Calls: ${pageData.apiCalls?.map(a => a.url).join(', ') || 'None'}
Forms: ${pageData.metadata?.forms?.length || 0}
Interactive Elements: Buttons(${pageData.metadata?.interactiveElements?.buttons || 0}), Inputs(${pageData.metadata?.interactiveElements?.inputs || 0}), Modals(${pageData.metadata?.interactiveElements?.modals || 0})
Framework: ${Object.entries(pageData.metadata?.frameworkHints || {}).filter(([,v]) => v).map(([k]) => k).join(', ') || 'Unknown'}

Navigation Links: ${pageData.metadata?.navLinks?.map(l => l.text).join(', ') || 'None'}
Headings: ${pageData.metadata?.headings?.map(h => `H${h.level}: ${h.text}`).join(' | ') || 'None'}

Please provide:
1. **Purpose** (1 sentence): What is this page for?
2. **Primary User**: Who is the main audience?
3. **Business Value** (High/Medium/Low): How important is this to the product?
4. **UX Assessment**: Is the page well-structured? Any UX concerns?
5. **Missing Features**: What would you expect on this type of page that's missing?
6. **Improvement Priority** (1-10): How urgently should this page be improved?
7. **Improvement Suggestion**: The single highest-impact change to make.

Respond in JSON format.`;
}

/**
 * Summarize all pages from a crawl result
 * @param {Object} crawlResult - Result from crawlSite()
 * @returns {Object} All page summaries
 */
export function summarizeAllPages(crawlResult) {
  if (!crawlResult?.success || !crawlResult.pages) {
    return { success: false, error: 'Invalid crawl result' };
  }

  const summaries = crawlResult.pages
    .filter(p => !p.error)
    .map(pageData => summarizePage(pageData));

  // Aggregate stats
  const totalSmells = summaries.reduce((sum, s) => sum + s.smells.length, 0);
  const avgBusinessValue = summaries.reduce((sum, s) => sum + s.businessValue.score, 0) / summaries.length;
  const pageTypes = {};
  for (const s of summaries) {
    pageTypes[s.classification.type] = (pageTypes[s.classification.type] || 0) + 1;
  }

  return {
    success: true,
    scanId: crawlResult.scanId,
    summaries,
    aggregate: {
      totalPages: summaries.length,
      totalSmells,
      averageBusinessValue: Math.round(avgBusinessValue * 10) / 10,
      pageTypes,
      highValuePages: summaries.filter(s => s.businessValue.value === 'High').length,
      pagesWithSmells: summaries.filter(s => s.smells.length > 0).length
    },
    summarizedAt: new Date().toISOString()
  };
}

export default {
  classifyPage,
  detectFeatures,
  mapDependencies,
  detectSmells,
  estimateBusinessValue,
  summarizePage,
  summarizeAllPages,
  generateDeepAnalysisPrompt
};
