#!/usr/bin/env node

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = 'F:/1 - Benefits-Outreach-360 (Web)';
const DOMAIN = 'eroland.me';
const BASE_URL = `https://${DOMAIN}`;

const SEED_ROUTES = [
  '/', '/login', '/pricing', '/landing', '/landing/demo', '/landing/features', '/landing/articles',
  '/early-rsvp', '/notifications', '/notifications/geocoding-info',
  '/vibe-remote', '/vibe-remote/cli', '/terminal/connect', '/cli-dashboard',
  '/app', '/app/home', '/app/dashboard', '/app/campaigns', '/app/organizations',
  '/app/addresses', '/app/routes', '/app/review-routes', '/app/contacts',
  '/app/labels', '/app/execution', '/app/handwrytten', '/app/epg',
  '/app/pug-records', '/app/expenses', '/app/planka', '/app/calendar',
  '/app/hmc-events', '/app/timelines', '/app/flashcards', '/app/availability',
  '/app/report-generator', '/app/file-inbox', '/app/email-invitations',
  '/app/usi-events', '/app/file-manager', '/app/boards', '/app/opportunities-analyzer',
  '/app/business-plan', '/app/ops-monitor', '/app/inbox',
  '/app/notes', '/app/notes/dashboard', '/app/notes/search', '/app/notes/templates',
  '/app/notes/tasks', '/app/notes/weekly-board', '/app/notes/orphans', '/app/notes/graph',
  '/app/follow-ups', '/app/reports/drop-report', '/app/reports/call-status',
  '/app/admin/field-management'
];

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
      action: f.action || '', method: f.method || 'GET',
      inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.type || i.tagName.toLowerCase(), name: i.name || '', id: i.id || ''
      }))
    }));
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]').length;
    const inputs = document.querySelectorAll('input, textarea, select').length;
    const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]').length;
    const navLinks = Array.from(document.querySelectorAll('nav a, [role="navigation"] a')).map(a => ({
      text: a.textContent?.trim() || '', href: a.href || ''
    }));
    const images = document.querySelectorAll('img').length;
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    const hasReact = !!document.querySelector('[data-reactroot], #root, #__next');
    const hasVue = !!document.querySelector('[data-v-], #app[data-v-app]');
    const hasAngular = !!document.querySelector('[ng-app], [_nghost], [_ngcontent]');
    return {
      title, metaDescription, h1, headings, forms,
      interactiveElements: { buttons, inputs, modals },
      navLinks, images, scripts,
      frameworkHints: { react: hasReact, vue: hasVue, angular: hasAngular },
      bodyTextLength: document.body?.textContent?.length || 0,
      elementCount: document.querySelectorAll('*').length
    };
  });
}

async function login(context) {
  console.log('🔐 Starting authentication...');
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });

    // Fill in credentials
    await page.fill('[data-testid="username-input"]', 'Evan043');
    await page.fill('[data-testid="password-input"]', 'LagoVista101218');

    // Click submit and wait for navigation
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30000 }),
      page.click('[data-testid="login-submit"]')
    ]);

    console.log('✅ Authentication successful');
    console.log(`   Redirected to: ${page.url()}`);

    await page.close();
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    await page.close();
    return false;
  }
}

async function crawlRoute(context, route, index, total) {
  const page = await context.newPage();
  const fullUrl = `${BASE_URL}${route}`;
  const apiEndpoints = new Set();

  console.log(`\n[${index + 1}/${total}] Crawling: ${route}`);

  // Track API requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/') || url.includes('api.')) {
      apiEndpoints.add(url);
    }
  });

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for React lazy loading
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const metadata = await extractPageMetadata(page);

    // Take screenshot
    const screenshotDir = join(PROJECT_ROOT, 'src', 'site-intel', 'scans', DOMAIN, 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });

    const screenshotName = route === '/' ? 'home' : route.replace(/\//g, '_').substring(1);
    const screenshotPath = join(screenshotDir, `${screenshotName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await page.close();

    console.log(`   ✓ Title: ${metadata.title}`);
    console.log(`   ✓ H1: ${metadata.h1}`);
    console.log(`   ✓ Elements: ${metadata.elementCount}`);
    console.log(`   ✓ API calls: ${apiEndpoints.size}`);

    return {
      url: route, // Use original requested URL
      finalUrl,
      metadata,
      apiEndpoints: Array.from(apiEndpoints),
      screenshot: screenshotPath,
      scannedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    await page.close();

    return {
      url: route,
      finalUrl: fullUrl,
      error: error.message,
      scannedAt: new Date().toISOString()
    };
  }
}

async function runPipeline(scanData) {
  console.log('\n🔧 Running L2-L5 pipeline...');

  try {
    // Import pipeline modules
    const { summarizeAllPages } = await import('./src/site-intel/summarizer/index.js');
    const { buildSiteGraph } = await import('./src/site-intel/graph/index.js');
    const { saveScan, toChromaDocuments, storeToChroma } = await import('./src/site-intel/memory/index.js');
    const { generateRecommendations, calculateHealthScore } = await import('./src/site-intel/judgment/index.js');

    // L2: Summarize
    console.log('   L2: Summarizing pages...');
    const summaries = await summarizeAllPages(scanData);

    // L3: Build graph
    console.log('   L3: Building site graph...');
    const graph = await buildSiteGraph(scanData);

    // L4: Save and store
    console.log('   L4: Saving scan data...');
    await saveScan(scanData, PROJECT_ROOT, DOMAIN);

    const chromaDocs = toChromaDocuments(scanData, DOMAIN);
    await storeToChroma(chromaDocs, DOMAIN);

    // L5: Generate recommendations
    console.log('   L5: Generating recommendations...');
    const recommendations = await generateRecommendations(scanData, graph);
    const healthScore = calculateHealthScore(scanData, graph);

    return {
      summaries,
      graph,
      recommendations,
      healthScore
    };
  } catch (error) {
    console.error('   ✗ Pipeline error:', error.message);
    return {
      error: error.message,
      stack: error.stack
    };
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting authenticated route scan for eroland.me');
  console.log(`   Total routes: ${SEED_ROUTES.length}`);

  const browser = await chromium.launch({
    headless: true,
    timeout: 600000
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  try {
    // Step 1: Authenticate
    const authenticated = await login(context);
    if (!authenticated) {
      throw new Error('Authentication failed');
    }

    // Step 2: Crawl all routes
    console.log('\n📊 Starting route crawl...');
    const pages = [];

    for (let i = 0; i < SEED_ROUTES.length; i++) {
      const pageData = await crawlRoute(context, SEED_ROUTES[i], i, SEED_ROUTES.length);
      pages.push(pageData);
    }

    const scanData = {
      domain: DOMAIN,
      baseUrl: BASE_URL,
      timestamp: new Date().toISOString(),
      authenticated: true,
      totalRoutes: SEED_ROUTES.length,
      successfulScans: pages.filter(p => !p.error).length,
      failedScans: pages.filter(p => p.error).length,
      pages
    };

    // Step 3: Run pipeline
    const pipelineResults = await runPipeline(scanData);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const finalResults = {
      ...scanData,
      pipeline: pipelineResults,
      scanDuration: `${duration}s`
    };

    // Save results
    const resultsPath = join(PROJECT_ROOT, 'src', 'site-intel', 'scans', DOMAIN, 'scan-results.json');
    await fs.mkdir(dirname(resultsPath), { recursive: true });
    await fs.writeFile(resultsPath, JSON.stringify(finalResults, null, 2));

    console.log('\n✅ Scan complete!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Successful: ${scanData.successfulScans}/${scanData.totalRoutes}`);
    console.log(`   Results saved to: ${resultsPath}`);

    // Print full JSON
    console.log('\n📄 FULL RESULTS:');
    console.log(JSON.stringify(finalResults, null, 2));

    return finalResults;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
