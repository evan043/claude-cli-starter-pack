/**
 * Smart Site Intel - Dev Scan Scanner
 *
 * Playwright-based per-route scanning engine that navigates to each
 * application route and collects data-testid coverage, accessibility
 * violations, and performance metrics.
 */

import { runAccessibilityAudit, isAxeAvailable } from '../discovery/accessibility.js';
import { runLighthouseAudit, isLighthouseAvailable } from '../discovery/lighthouse.js';

/**
 * Lazy-load playwright to avoid crashing the CLI when it's not installed.
 * Only site-intel commands need playwright — other commands (wizard, init, etc.) should not be affected.
 */
async function getChromium() {
  try {
    const pw = await import('playwright');
    return pw.chromium;
  } catch {
    throw new Error(
      'playwright is not installed. Install it with: npm install -g playwright\n' +
      'This dependency is only required for site-intel dev-scan features.'
    );
  }
}

/**
 * Login to the application using configured selectors
 *
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} config - Dev scan config
 * @returns {Promise<Object>} Login result
 */
export async function loginToApp(page, config) {
  if (!config.credentials.hasCredentials) {
    return { success: true, skipped: true, reason: 'No credentials configured' };
  }

  try {
    // Navigate to login page (usually the root redirects)
    await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: config.timeout });

    // Wait for login form
    const usernameSelector = config.loginSelectors.username;
    const passwordSelector = config.loginSelectors.password;
    const submitSelector = config.loginSelectors.submit;

    // Check if we're already logged in (success indicator visible)
    try {
      const successIndicator = config.loginSelectors.successIndicator;
      if (successIndicator) {
        const isLoggedIn = await page.locator(successIndicator).isVisible({ timeout: 3000 });
        if (isLoggedIn) {
          return { success: true, alreadyLoggedIn: true };
        }
      }
    } catch {
      // Not logged in, proceed with login
    }

    // Fill credentials
    await page.locator(usernameSelector).waitFor({ state: 'visible', timeout: 10000 });
    await page.locator(usernameSelector).fill(config.credentials.username);
    await page.locator(passwordSelector).fill(config.credentials.password);

    // Submit
    await page.locator(submitSelector).click();

    // Wait for navigation/success
    if (config.loginSelectors.successIndicator) {
      await page.locator(config.loginSelectors.successIndicator).waitFor({
        state: 'visible',
        timeout: 15000
      });
    } else {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    return { success: true, loggedIn: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check data-testid coverage on a live page via DOM evaluation
 *
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<Object>} TestID coverage result
 */
async function checkLiveTestIdCoverage(page) {
  return page.evaluate(() => {
    const selectors = 'button, input, select, textarea, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [onclick]';
    const allInteractive = document.querySelectorAll(selectors);
    const withTestId = [...allInteractive].filter(el => el.dataset.testid);
    const missing = [...allInteractive]
      .filter(el => !el.dataset.testid)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().substring(0, 50),
        classes: (typeof el.className === 'string' ? el.className : '').substring(0, 80),
        role: el.getAttribute('role') || '',
        type: el.getAttribute('type') || '',
      }));

    return {
      total: allInteractive.length,
      withTestId: withTestId.length,
      coverage: allInteractive.length > 0 ? withTestId.length / allInteractive.length : 1,
      missingCount: missing.length,
      missing: missing.slice(0, 20), // Limit to first 20 for readability
    };
  });
}

/**
 * Calculate composite component health score
 *
 * @param {Object} metrics - Individual metric scores
 * @returns {number} Composite health score (0-1)
 */
function calculateComponentHealth(metrics) {
  const testIdWeight = 0.3;
  const a11yWeight = 0.3;
  const perfWeight = 0.2;
  const a11yScoreWeight = 0.2;

  const testIdScore = metrics.testIdCoverage || 0;

  // A11y violations: 0 violations = 1.0, 10+ violations = 0.0
  const a11yScore = Math.max(0, 1 - (metrics.a11yViolations || 0) / 10);

  // Performance: normalize to 0-1
  const perfScore = (metrics.lighthousePerf || 0) / 100;

  // Lighthouse accessibility score: already 0-100
  const lighthouseA11y = (metrics.lighthouseA11y || 0) / 100;

  return Math.round((
    testIdScore * testIdWeight +
    a11yScore * a11yWeight +
    perfScore * perfWeight +
    lighthouseA11y * a11yScoreWeight
  ) * 100) / 100;
}

/**
 * Scan a single route and collect all metrics
 *
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} routePath - Route path to scan
 * @param {Object} config - Dev scan config
 * @param {Object} routeInfo - Route catalog info (component, componentFile, etc.)
 * @returns {Promise<Object>} Route scan result
 */
async function scanSingleRoute(page, routePath, config, routeInfo = {}) {
  const url = `${config.baseUrl.replace(/\/$/, '')}${routePath}`;
  const result = {
    path: routePath,
    url,
    component: routeInfo.component || null,
    componentFile: routeInfo.componentFile || null,
    hooks: routeInfo.hooks || [],
    apiCalls: routeInfo.apiCalls || [],
    scannedAt: new Date().toISOString(),
    error: null,
  };

  try {
    // Navigate to route
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeout
    });

    result.statusCode = response?.status() || null;

    // Wait for any lazy-loaded content
    await page.waitForTimeout(1000);

    // 1. Check data-testid coverage from live DOM
    const testIdResult = await checkLiveTestIdCoverage(page);
    result.testIdCoverage = Math.round(testIdResult.coverage * 100) / 100;
    result.testIdTotal = testIdResult.total;
    result.testIdWithId = testIdResult.withTestId;
    result.testIdMissing = testIdResult.missing;

    // 2. Run accessibility audit (axe-core)
    if (config.axeEnabled) {
      try {
        const axeAvailable = await isAxeAvailable();
        if (axeAvailable) {
          const a11yResult = await runAccessibilityAudit(page);
          if (a11yResult.success !== false) {
            result.a11yViolations = a11yResult.violationCount || (a11yResult.violations?.length || 0);
            result.a11yCritical = (a11yResult.violations || []).filter(v => v.impact === 'critical').length;
            result.a11ySerious = (a11yResult.violations || []).filter(v => v.impact === 'serious').length;
            result.a11yDetails = (a11yResult.violations || []).slice(0, 10);
          } else {
            result.a11yViolations = 0;
            result.a11yCritical = 0;
            result.a11ySerious = 0;
          }
        }
      } catch {
        result.a11yViolations = 0;
        result.a11yCritical = 0;
        result.a11ySerious = 0;
      }
    }

    // 3. Run Lighthouse audit (performance + accessibility score)
    if (config.lighthouseEnabled) {
      try {
        const lhAvailable = await isLighthouseAvailable();
        if (lhAvailable) {
          const lhResult = await runLighthouseAudit(page, url);
          if (lhResult.success) {
            result.lighthousePerf = lhResult.scores?.performance || 0;
            result.lighthouseA11y = lhResult.scores?.accessibility || 0;
          } else {
            result.lighthousePerf = 0;
            result.lighthouseA11y = 0;
          }
        }
      } catch {
        result.lighthousePerf = 0;
        result.lighthouseA11y = 0;
      }
    }

    // 4. Calculate composite health score
    result.componentHealth = calculateComponentHealth({
      testIdCoverage: result.testIdCoverage,
      a11yViolations: result.a11yViolations || 0,
      lighthousePerf: result.lighthousePerf || 0,
      lighthouseA11y: result.lighthouseA11y || 0,
    });

  } catch (error) {
    result.error = error.message;
    result.testIdCoverage = 0;
    result.a11yViolations = 0;
    result.a11yCritical = 0;
    result.a11ySerious = 0;
    result.lighthousePerf = 0;
    result.lighthouseA11y = 0;
    result.componentHealth = 0;
  }

  return result;
}

/**
 * Scan multiple routes with a shared browser context
 *
 * @param {string[]} routePaths - Array of route paths to scan
 * @param {Object} config - Dev scan config from readDevScanConfig()
 * @param {Object} options - Additional options
 * @param {Object} options.routeInfoMap - Map of routePath → routeInfo from route catalog
 * @param {Function} options.onProgress - Progress callback (routePath, index, total)
 * @returns {Promise<Object>} Scan results for all routes
 */
export async function scanRoutes(routePaths, config, options = {}) {
  const { routeInfoMap = {}, onProgress = null } = options;
  const results = [];
  const startTime = Date.now();

  let browser;
  try {
    // Launch browser
    const chromium = await getChromium();
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });

    const context = await browser.newContext({
      viewport: config.viewport || { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Login if credentials available
    const loginResult = await loginToApp(page, config);
    if (!loginResult.success) {
      await browser.close();
      return {
        success: false,
        error: `Login failed: ${loginResult.error}`,
        results: [],
        loginResult,
      };
    }

    // Save storage state after login for potential reuse
    let storageState = null;
    if (loginResult.loggedIn) {
      storageState = await context.storageState();
    }

    // Scan each route
    for (let i = 0; i < routePaths.length; i++) {
      const routePath = routePaths[i];
      const routeInfo = routeInfoMap[routePath] || {};

      if (onProgress) {
        onProgress(routePath, i, routePaths.length);
      }

      console.log(`[DevScan] Scanning ${i + 1}/${routePaths.length}: ${routePath}`);

      // Skip routes with dynamic parameters (e.g., :id) unless we have sample data
      if (routePath.includes(':') || routePath.includes('*')) {
        results.push({
          path: routePath,
          component: routeInfo.component || null,
          componentFile: routeInfo.componentFile || null,
          skipped: true,
          reason: 'Dynamic route parameter - requires sample data',
          testIdCoverage: 0,
          a11yViolations: 0,
          a11yCritical: 0,
          a11ySerious: 0,
          lighthousePerf: 0,
          lighthouseA11y: 0,
          componentHealth: 0,
        });
        continue;
      }

      const scanResult = await scanSingleRoute(page, routePath, config, routeInfo);
      results.push(scanResult);
    }

    await browser.close();

    const duration = Date.now() - startTime;

    return {
      success: true,
      results,
      summary: {
        totalRoutes: routePaths.length,
        scannedRoutes: results.filter(r => !r.skipped && !r.error).length,
        skippedRoutes: results.filter(r => r.skipped).length,
        errorRoutes: results.filter(r => r.error).length,
        duration,
        avgTestIdCoverage: calculateAverage(results.filter(r => !r.skipped), 'testIdCoverage'),
        avgA11yViolations: calculateAverage(results.filter(r => !r.skipped), 'a11yViolations'),
        avgPerformance: calculateAverage(results.filter(r => !r.skipped), 'lighthousePerf'),
      },
      loginResult,
      storageState,
    };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      error: `Scanner failed: ${error.message}`,
      results,
    };
  }
}

/**
 * Calculate average of a numeric field across results
 */
function calculateAverage(results, field) {
  if (results.length === 0) return 0;
  const sum = results.reduce((s, r) => s + (r[field] || 0), 0);
  return Math.round((sum / results.length) * 100) / 100;
}

export default { scanRoutes, loginToApp };
