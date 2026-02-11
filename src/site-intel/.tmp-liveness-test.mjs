/**
 * Liveness audit runner - tests /app/timelines to detect dead UI
 */
import { chromium } from 'playwright';
import { checkLiveness, auditRouteLiveness } from './dev-scan/liveness-checker.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://eroland.me';
const USERNAME = 'Evan043';
const PASSWORD = 'LagoVista101218';

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

  // Run liveness audit on timelines and a few comparison pages
  const routesToAudit = [
    '/app/timelines',
    '/app/campaigns',    // known working page for comparison
    '/app/contacts',     // known working page for comparison
  ];

  const result = await auditRouteLiveness(page, routesToAudit, BASE_URL, {
    interactionTimeout: 1200,
    skipNavLinks: true,
    verbose: false,
  });

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('  LIVENESS AUDIT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  Routes Scanned:      ${result.summary.routesScanned}`);
  console.log(`  Routes with Dead UI: ${result.summary.routesWithDeadUI}`);
  console.log(`  Total Elements:      ${result.summary.totalInteractiveElements}`);
  console.log(`  Alive:               ${result.summary.totalAlive}`);
  console.log(`  Dead:                ${result.summary.totalDead}`);
  console.log(`  Suspicious:          ${result.summary.totalSuspicious}`);
  console.log(`  Overall Liveness:    ${result.summary.overallLiveness}%`);
  console.log('═'.repeat(70));

  // Per-route detail
  for (const route of result.routes) {
    console.log(`\n┌─ ${route.route} ─────────────────────`);
    console.log(`│  Liveness Score: ${route.livenessScore}%`);
    console.log(`│  Interactive Elements: ${route.totalInteractive}`);
    console.log(`│  Alive: ${route.alive} | Dead: ${route.dead} | Suspicious: ${route.suspicious}`);

    if (route.dead > 0 || route.suspicious > 0) {
      console.log(`│`);
      console.log(`│  DEAD ELEMENTS BY SECTION:`);
      for (const [section, elements] of Object.entries(route.deadBySection || {})) {
        console.log(`│  ┌─ Section: ${section}`);
        for (const el of elements) {
          console.log(`│  │  ❌ ${el.selector} (${el.type}) "${el.text}"`);
          console.log(`│  │     signals: listeners=${el.signals.hasEventListeners}, dom=${el.signals.domMutated}, network=${el.signals.networkFired}`);
        }
        console.log(`│  └─`);
      }

      if (Object.keys(route.suspiciousBySection || {}).length > 0) {
        console.log(`│`);
        console.log(`│  SUSPICIOUS ELEMENTS:`);
        for (const [section, elements] of Object.entries(route.suspiciousBySection || {})) {
          console.log(`│  ┌─ Section: ${section}`);
          for (const el of elements) {
            console.log(`│  │  ⚠️  ${el.selector} (${el.type}) "${el.text}"`);
          }
          console.log(`│  └─`);
        }
      }
    }
    console.log(`└─────────────────────────────────────`);
  }

  // Save results
  const outDir = path.join('tools/claude-cli-advanced-starter-pack/src/site-intel/.data/eroland.me');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'liveness-audit.json'),
    JSON.stringify(result, null, 2)
  );
  console.log(`\nResults saved to: ${outDir}/liveness-audit.json`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
