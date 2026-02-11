import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES = [
  '/', '/login', '/pricing', '/landing', '/landing/demo', '/landing/features', '/landing/articles',
  '/early-rsvp', '/notifications', '/notifications/geocoding-info', '/vibe-remote', '/vibe-remote/cli',
  '/terminal/connect', '/cli-dashboard', '/app', '/app/home', '/app/dashboard', '/app/campaigns',
  '/app/organizations', '/app/addresses', '/app/routes', '/app/review-routes', '/app/contacts',
  '/app/epg', '/app/epg/events', '/app/epg/presets', '/app/epg/upload', '/app/epg/search',
  '/app/execution-table', '/app/field-management', '/app/pug', '/app/pug/records', '/app/pug/companies',
  '/app/pug/contacts', '/app/pug/deals', '/app/pug/sync', '/app/notes', '/app/notes/all',
  '/app/notes/stickies', '/app/notes/starred', '/app/notes/flashcards', '/app/notes/archive',
  '/app/reports', '/app/reports/weekly', '/app/reports/canvasser', '/app/reports/field',
  '/app/admin', '/app/admin/users', '/app/admin/settings', '/app/admin/field-config',
  '/app/admin/templates', '/app/admin/integrations', '/app/todoist-widget', '/app/weekly-planning',
  '/app/timelines', '/app/settings', '/app/settings/profile', '/app/settings/notifications',
  '/app/settings/theme'
];

const BASE_URL = 'https://eroland.me';
const USERNAME = 'Evan043';
const PASSWORD = 'LagoVista101218';

async function login(page) {
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.fill('[data-testid="username-input"]', USERNAME);
  await page.fill('[data-testid="password-input"]', PASSWORD);
  await page.click('[data-testid="login-submit"]');

  // Wait for navigation to /app
  await page.waitForURL('**/app/**', { timeout: 15000 });
  console.log('✅ Logged in successfully');
}

async function capturePage(page, url, index, total) {
  const fullUrl = `${BASE_URL}${url}`;
  console.log(`[${index}/${total}] Scanning: ${url}`);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const result = {
    url,
    fullUrl,
    finalUrl: null,
    title: null,
    h1: null,
    elementCount: 0,
    textContent: null,
    links: [],
    forms: [],
    imageCount: 0,
    metaDescription: null,
    consoleErrors: [],
    success: false,
    error: null
  };

  try {
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000); // Let JS render

    result.finalUrl = page.url();
    result.success = true;

    // Capture page data
    const pageData = await page.evaluate(() => {
      const data = {
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || null,
        elementCount: document.querySelectorAll('*').length,
        textContent: document.body.innerText.substring(0, 500),
        links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href),
        forms: Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action,
          method: form.method
        })),
        imageCount: document.querySelectorAll('img').length,
        metaDescription: document.querySelector('meta[name="description"]')?.content || null
      };
      return data;
    });

    Object.assign(result, pageData);
    result.consoleErrors = consoleErrors;

    console.log(`  ✓ ${result.h1 || '(no H1)'} - ${result.elementCount} elements`);

  } catch (error) {
    result.error = error.message;
    result.consoleErrors = consoleErrors;
    console.log(`  ✗ Failed: ${error.message}`);

    // Try to capture what we can even on error
    try {
      result.finalUrl = page.url();
      const partialData = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || null,
        elementCount: document.querySelectorAll('*').length
      })).catch(() => ({}));
      Object.assign(result, partialData);
    } catch (e) {
      // Ignore nested errors
    }
  }

  return result;
}

async function main() {
  console.log('🚀 Starting fast authenticated scan of eroland.me');
  console.log(`📋 Scanning ${ROUTES.length} routes with domcontentloaded strategy`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login first
  await login(page);

  // Scan all pages
  const pages = [];
  for (let i = 0; i < ROUTES.length; i++) {
    const pageData = await capturePage(page, ROUTES[i], i + 1, ROUTES.length);
    pages.push(pageData);
  }

  await browser.close();

  // Create output directory
  const outputDir = path.join(__dirname, '.data', 'eroland.me');
  await fs.mkdir(outputDir, { recursive: true });

  // Generate summary
  const summary = {
    totalPages: pages.length,
    successfulPages: pages.filter(p => p.success).length,
    failedPages: pages.filter(p => !p.success).length,
    pagesByH1: {},
    uniqueH1s: [],
    totalElements: pages.reduce((sum, p) => sum + p.elementCount, 0),
    totalLinks: pages.reduce((sum, p) => sum + p.links.length, 0),
    totalForms: pages.reduce((sum, p) => sum + p.forms.length, 0),
    totalImages: pages.reduce((sum, p) => sum + p.imageCount, 0),
    totalConsoleErrors: pages.reduce((sum, p) => sum + p.consoleErrors.length, 0)
  };

  // Group pages by H1
  pages.forEach(page => {
    const h1 = page.h1 || '(no H1)';
    if (!summary.pagesByH1[h1]) {
      summary.pagesByH1[h1] = [];
    }
    summary.pagesByH1[h1].push(page.url);
  });

  summary.uniqueH1s = Object.keys(summary.pagesByH1);

  // Save full results
  const scanData = {
    domain: 'eroland.me',
    timestamp: new Date().toISOString(),
    scanType: 'authenticated-fast',
    waitStrategy: 'domcontentloaded',
    pages
  };

  await fs.writeFile(
    path.join(outputDir, 'scan-auth-fast.json'),
    JSON.stringify(scanData, null, 2)
  );

  await fs.writeFile(
    path.join(outputDir, 'scan-auth-fast-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n📊 Scan Complete:');
  console.log(`  ✅ Successful: ${summary.successfulPages}/${summary.totalPages}`);
  console.log(`  ❌ Failed: ${summary.failedPages}`);
  console.log(`  📝 Unique H1s: ${summary.uniqueH1s.length}`);
  console.log(`  🔗 Total Links: ${summary.totalLinks}`);
  console.log(`  📋 Total Forms: ${summary.totalForms}`);
  console.log(`  🖼️  Total Images: ${summary.totalImages}`);
  console.log(`  ⚠️  Console Errors: ${summary.totalConsoleErrors}`);

  // Now process through site-intel pipeline
  console.log('\n🔄 Processing through site-intel pipeline...');

  try {
    // Import pipeline modules
    const { summarizeAllPages } = await import('./summarizer/index.js');
    const { buildSiteGraph } = await import('./graph/index.js');
    const { saveScan } = await import('./memory/index.js');

    // Run L2: Summarization
    console.log('  📝 L2: Summarizing pages...');
    const summaries = await summarizeAllPages(pages);

    // Run L3: Graph building
    console.log('  🕸️  L3: Building site graph...');
    const graph = await buildSiteGraph(pages);

    // Run L4: Recommendations (basic version)
    console.log('  💡 L4: Generating recommendations...');
    const recommendations = {
      missing_pages: [],
      broken_links: [],
      seo_issues: pages.filter(p => !p.metaDescription || !p.h1).map(p => p.url),
      performance_issues: pages.filter(p => p.elementCount > 5000).map(p => p.url)
    };

    // Run L5: Save to memory
    console.log('  💾 L5: Saving to memory...');
    const finalScanData = {
      domain: 'eroland.me',
      timestamp: scanData.timestamp,
      pages: pages.map((p, i) => ({
        ...p,
        summary: summaries[i]
      })),
      graph,
      recommendations
    };

    await saveScan(finalScanData);

    console.log('✅ Pipeline complete!');
    console.log(`\n📁 Results saved to: ${outputDir}/`);
    console.log(`  - scan-auth-fast.json (full data)`);
    console.log(`  - scan-auth-fast-summary.json (summary)`);

    // Print sample H1s
    console.log('\n🏷️  Sample H1s found:');
    summary.uniqueH1s.slice(0, 10).forEach(h1 => {
      const count = summary.pagesByH1[h1].length;
      console.log(`  - "${h1}" (${count} page${count > 1 ? 's' : ''})`);
    });

  } catch (pipelineError) {
    console.error('\n⚠️  Pipeline processing failed:', pipelineError.message);
    console.log('Raw scan data was still saved successfully.');
  }
}

main().catch(console.error);
