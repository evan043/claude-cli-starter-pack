/**
 * Website Intelligence - Layer 1: Discovery Engine
 *
 * Playwright-based headless crawler that discovers pages,
 * captures screenshots, and extracts DOM structure.
 */

import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { runLighthouseAudit, isLighthouseAvailable } from './lighthouse.js';
import { runAccessibilityAudit, isAxeAvailable } from './accessibility.js';

/**
 * Default crawl options
 */
const DEFAULT_OPTIONS = {
  maxPages: 50,
  depth: 3,
  includeScreenshots: true,
  timeout: 30000,
  waitForNetworkIdle: true,
  screenshotDir: null,
  userAgent: 'CCASP-SiteIntel/1.0 (Website Intelligence Crawler)',
  viewport: { width: 1280, height: 720 },
  auditPerformance: false,
  ignorePatterns: [
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz)$/i,
    /^(mailto:|tel:|javascript:|data:)/i,
    /#$/
  ]
};

/**
 * Normalize a URL by removing trailing slashes, fragments, and sorting query params
 * @param {string} urlStr - URL to normalize
 * @param {string} baseUrl - Base URL for resolving relative URLs
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizeUrl(urlStr, baseUrl) {
  try {
    const url = new URL(urlStr, baseUrl);
    url.hash = '';
    let normalized = url.href;
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is internal (same origin)
 * @param {string} urlStr - URL to check
 * @param {string} baseOrigin - Base origin to compare against
 * @returns {boolean}
 */
export function isInternalUrl(urlStr, baseOrigin) {
  try {
    const url = new URL(urlStr);
    return url.origin === baseOrigin;
  } catch {
    return false;
  }
}

/**
 * Check if URL should be ignored based on patterns
 * @param {string} urlStr - URL to check
 * @param {RegExp[]} patterns - Patterns to match against
 * @returns {boolean}
 */
export function shouldIgnoreUrl(urlStr, patterns) {
  return patterns.some(pattern => pattern.test(urlStr));
}

/**
 * Extract all links from a page
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<string[]>} Array of href values
 */
async function extractLinks(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links.map(a => a.href).filter(Boolean);
  });
}

/**
 * Extract page metadata from DOM
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<Object>} Page metadata
 */
async function extractPageMetadata(page) {
  return page.evaluate(() => {
    const title = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent?.trim() || ''
    }));

    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action || '',
      method: f.method || 'GET',
      inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.type || i.tagName.toLowerCase(),
        name: i.name || '',
        id: i.id || ''
      }))
    }));

    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]').length;
    const inputs = document.querySelectorAll('input, textarea, select').length;
    const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]').length;

    const navLinks = Array.from(document.querySelectorAll('nav a, [role="navigation"] a')).map(a => ({
      text: a.textContent?.trim() || '',
      href: a.href || ''
    }));

    const images = document.querySelectorAll('img').length;

    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);

    const hasReact = !!document.querySelector('[data-reactroot], #root, #__next');
    const hasVue = !!document.querySelector('[data-v-], #app[data-v-app]');
    const hasAngular = !!document.querySelector('[ng-app], [_nghost], [_ngcontent]');

    return {
      title,
      metaDescription,
      h1,
      headings,
      forms,
      interactiveElements: { buttons, inputs, modals },
      navLinks,
      images,
      scripts,
      frameworkHints: { react: hasReact, vue: hasVue, angular: hasAngular },
      bodyTextLength: document.body?.textContent?.length || 0,
      elementCount: document.querySelectorAll('*').length
    };
  });
}

/**
 * Extract API calls detected on the page
 * @param {string[]} networkRequests - Captured network requests
 * @param {string} baseOrigin - Base origin for comparison
 * @returns {Object[]} Detected API endpoints
 */
function extractAPICalls(networkRequests, baseOrigin) {
  const apiPatterns = [/\/api\//, /\/graphql/, /\/rest\//, /\/v[0-9]+\//];

  return networkRequests
    .filter(url => {
      try {
        const parsed = new URL(url);
        return apiPatterns.some(p => p.test(parsed.pathname));
      } catch {
        return false;
      }
    })
    .map(url => {
      try {
        const parsed = new URL(url);
        return {
          url: parsed.pathname,
          origin: parsed.origin,
          isInternal: parsed.origin === baseOrigin,
          fullUrl: url
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Crawl a website and build a page inventory
 * @param {string} startUrl - URL to start crawling from
 * @param {Object} options - Crawl options
 * @returns {Promise<Object>} Crawl result with pages, routes, etc.
 */
export async function crawlSite(startUrl, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  let baseUrl;
  try {
    baseUrl = new URL(startUrl);
  } catch {
    return { success: false, error: `Invalid URL: ${startUrl}` };
  }

  const baseOrigin = baseUrl.origin;
  const visited = new Map();
  const queue = [{ url: normalizeUrl(startUrl, startUrl), depth: 0 }];
  const discoveredUrls = new Set();
  discoveredUrls.add(queue[0].url);

  const domain = baseUrl.hostname.replace(/[^a-z0-9.-]/gi, '_');
  const screenshotDir = opts.screenshotDir ||
    path.join(process.cwd(), '.claude', 'site-intel', domain, 'screenshots');

  if (opts.includeScreenshots) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });

    // Get CDP port for Lighthouse (if audit enabled)
    let cdpPort = null;
    if (opts.auditPerformance && isLighthouseAvailable()) {
      try {
        const cdpUrl = browser.contexts()[0]?._browser?.wsEndpoint?.() || '';
        const portMatch = cdpUrl.match(/:(\d+)\//);
        cdpPort = portMatch ? parseInt(portMatch[1]) : null;
      } catch {
        // CDP port extraction failed, Lighthouse will be skipped
      }
    }

    const context = await browser.newContext({
      userAgent: opts.userAgent,
      viewport: opts.viewport
    });

    while (queue.length > 0 && visited.size < opts.maxPages) {
      const { url, depth } = queue.shift();

      if (visited.has(url) || depth > opts.depth) continue;

      const page = await context.newPage();
      const networkRequests = [];

      page.on('request', request => {
        networkRequests.push(request.url());
      });

      try {
        const response = await page.goto(url, {
          waitUntil: opts.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
          timeout: opts.timeout
        });

        const statusCode = response?.status() || 0;
        const finalUrl = page.url();

        const metadata = await extractPageMetadata(page);

        const links = await extractLinks(page);

        const html = await page.content();

        let screenshotPath = null;
        if (opts.includeScreenshots) {
          const safePath = url.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
          screenshotPath = path.join(screenshotDir, `${safePath}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }

        // Performance & accessibility audits (optional)
        let lighthouseResult = null;
        let accessibilityResult = null;

        if (opts.auditPerformance) {
          if (cdpPort && isLighthouseAvailable()) {
            lighthouseResult = await runLighthouseAudit(finalUrl, cdpPort);
          }
          if (isAxeAvailable()) {
            accessibilityResult = await runAccessibilityAudit(page);
          }
        }

        const apiCalls = extractAPICalls(networkRequests, baseOrigin);

        const pageRecord = {
          url: finalUrl,
          originalUrl: url,
          statusCode,
          title: metadata.title,
          h1: metadata.h1,
          metaDescription: metadata.metaDescription,
          depth,
          metadata,
          apiCalls,
          links: links.filter(l => isInternalUrl(l, baseOrigin)).map(l => normalizeUrl(l, url)).filter(Boolean),
          externalLinks: links.filter(l => !isInternalUrl(l, baseOrigin)),
          screenshotPath,
          htmlLength: html.length,
          elementCount: metadata.elementCount,
          lighthouse: lighthouseResult,
          accessibility: accessibilityResult,
          crawledAt: new Date().toISOString()
        };

        visited.set(url, pageRecord);

        for (const link of links) {
          const normalized = normalizeUrl(link, url);
          if (normalized &&
              isInternalUrl(normalized, baseOrigin) &&
              !discoveredUrls.has(normalized) &&
              !shouldIgnoreUrl(normalized, opts.ignorePatterns)) {
            discoveredUrls.add(normalized);
            queue.push({ url: normalized, depth: depth + 1 });
          }
        }

      } catch (err) {
        visited.set(url, {
          url,
          originalUrl: url,
          statusCode: 0,
          error: err.message,
          depth,
          crawledAt: new Date().toISOString()
        });
      } finally {
        await page.close();
      }
    }

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return { success: false, error: `Crawler error: ${err.message}` };
  }

  const pages = Array.from(visited.values());
  const routes = [...new Set(pages.filter(p => !p.error).map(p => {
    try { return new URL(p.url).pathname; } catch { return null; }
  }).filter(Boolean))].sort();

  const allApiCalls = pages
    .filter(p => p.apiCalls)
    .flatMap(p => p.apiCalls)
    .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);

  const duration = Date.now() - startTime;

  return {
    success: true,
    scanId: `scan-${Date.now()}-${domain}`,
    domain,
    baseUrl: baseOrigin,
    pages,
    routes,
    apiEndpoints: allApiCalls,
    stats: {
      pagesDiscovered: discoveredUrls.size,
      pagesCrawled: visited.size,
      pagesSuccessful: pages.filter(p => !p.error).length,
      pagesFailed: pages.filter(p => p.error).length,
      routesFound: routes.length,
      apiEndpointsFound: allApiCalls.length,
      duration,
      screenshotDir: opts.includeScreenshots ? screenshotDir : null
    }
  };
}

export default { crawlSite, normalizeUrl, isInternalUrl, shouldIgnoreUrl };
