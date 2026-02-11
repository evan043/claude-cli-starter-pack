/**
 * Liveness audit runner - saves results to dashboard data path
 */
import { chromium } from 'playwright';
import { checkLiveness, auditRouteLiveness } from './dev-scan/liveness-checker.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://eroland.me';
const USERNAME = process.env.TEST_USER_USERNAME || 'Evan043';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'LagoVista101218';
const PROJECT_ROOT = path.resolve('.');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="username-input"]').fill(USERNAME);
  await page.locator('[data-testid="password-input"]').fill(PASSWORD);
  await page.locator('[data-testid="login-submit"]').click();

  // Wait for auth
  await page.waitForURL('**/app/**', { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('Logged in successfully.\n');

  // Routes to audit - mix of known-working and problem pages
  const routesToAudit = [
    '/app/timelines',
    '/app/campaigns',
    '/app/contacts',
    '/app/dashboard',
    '/app/organizations',
    '/app/epg',
  ];

  const result = await auditRouteLiveness(page, routesToAudit, BASE_URL, {
    interactionTimeout: 1200,
    skipNavLinks: true,
    verbose: false,
  });

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('  LIVENESS AUDIT SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Routes Scanned:      ${result.summary.routesScanned}`);
  console.log(`  Routes with Dead UI: ${result.summary.routesWithDeadUI}`);
  console.log(`  Total Elements:      ${result.summary.totalInteractiveElements}`);
  console.log(`  Alive:               ${result.summary.totalAlive}`);
  console.log(`  Dead:                ${result.summary.totalDead}`);
  console.log(`  Suspicious:          ${result.summary.totalSuspicious}`);
  console.log(`  Overall Liveness:    ${result.summary.overallLiveness}%`);
  console.log('='.repeat(70));

  // Save to dashboard data path
  const dashboardDir = path.join(PROJECT_ROOT, '.claude', 'site-intel', 'eroland.me');
  fs.mkdirSync(dashboardDir, { recursive: true });
  const outPath = path.join(dashboardDir, 'liveness-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nResults saved to: ${outPath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
