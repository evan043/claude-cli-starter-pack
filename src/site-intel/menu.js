/**
 * Site Intelligence - Interactive Menu
 *
 * Single entry point for all site-intel features. Renders an interactive
 * chalk/inquirer menu inside Claude CLI, outputs JSON for action routing.
 *
 * Neovim auto-detection: if NVIM env is set, outputs mode:neovim to
 * signal Claude to open the native floating panel instead.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadState } from './dev-scan/state-manager.js';
import { listDomains } from './memory/index.js';
import { startDashboard } from './dashboard/index.js';

// ── Menu Actions ─────────────────────────────────────────────────────

const MENU_ACTIONS = [
  // Scan & Analyze
  { key: '1', label: 'Full Site Scan',  action: 'scan',          section: 'scan',    duration: '2-5 min',  desc: 'Crawl a website and run full 5-layer analysis (discovery, summarization, graph, memory, judgment)' },
  { key: '2', label: 'Dev Scan (Auto)', action: 'dev-scan',      section: 'scan',    duration: '30-90s',   desc: 'Playwright-based route scanning with health scores, a11y, testid coverage, and diff tracking' },
  { key: '3', label: 'Quick Check',     action: 'quick-check',   section: 'scan',    duration: '<10s',     desc: 'Fast static data-testid coverage check — no Playwright, great for CI' },
  { key: '4', label: 'Feature Audit',   action: 'audit',         section: 'scan',    duration: '20-60s',   desc: 'Verify what was built vs what was planned across 6 truth dimensions' },

  // Review & Explore
  { key: '5', label: 'Recommendations', action: 'recommend',     section: 'review',  duration: 'Instant',  desc: 'AI-powered prioritized "what to work on next" based on latest scan data' },
  { key: '6', label: 'Open Dashboard',  action: 'dashboard',     section: 'review',  duration: 'Instant',  desc: 'Launch web dashboard with interactive graph, route scores, sparklines, and diffs' },
  { key: '7', label: 'View Status',     action: 'status',        section: 'review',  duration: 'Instant',  desc: 'Show 5-layer status report for a scanned domain' },
  { key: '8', label: 'View Graph',      action: 'graph',         section: 'review',  duration: 'Instant',  desc: 'Display dependency graph as Mermaid diagram' },
  { key: '9', label: 'Drift Detection', action: 'drift',         section: 'review',  duration: 'Instant',  desc: 'Compare latest scans to find new, removed, or changed pages' },

  // Advanced
  { key: 'A', label: 'Page Detail',     action: 'page',          section: 'advanced', duration: 'Instant', desc: 'Deep dive into a single page: classification, features, smells, dependencies' },
  { key: 'B', label: 'Semantic Search', action: 'search',        section: 'advanced', duration: 'Instant', desc: 'Search scan data using natural language queries via ChromaDB vectors' },
  { key: 'C', label: 'Contract Tests',  action: 'contract',      section: 'advanced', duration: '10-30s',  desc: 'Generate backend contract tests from feature audit gaps' },
];

// ── Summary Banner ───────────────────────────────────────────────────

function getSiteIntelSummary() {
  const projectRoot = process.cwd();
  const state = loadState(projectRoot);

  if (!state || !state.lastScanTime) {
    return { hasData: false };
  }

  const health = state.overallHealth || {};
  const diffs = state.latestDiffs || {};
  const elapsed = timeSince(state.lastScanTime);

  return {
    hasData: true,
    score: health.score ?? 0,
    grade: health.grade ?? 'N/A',
    totalRoutes: state.totalRoutes ?? 0,
    testIdCoverage: Math.round((health.testIdCoverage ?? 0) * 100),
    improvements: (diffs.improvements || []).length,
    regressions: (diffs.regressions || []).length,
    lastScan: elapsed,
    lastScanType: state.lastScanType ?? 'unknown',
  };
}

function timeSince(isoDate) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function gradeColor(grade) {
  const colors = { A: chalk.green, B: chalk.greenBright, C: chalk.yellow, D: chalk.rgb(255, 165, 0), F: chalk.red };
  return (colors[grade] || chalk.dim)(grade);
}

// ── Render Functions ─────────────────────────────────────────────────

function renderBanner(summary) {
  const W = 74;
  const border = '═'.repeat(W);

  console.log('');
  console.log(chalk.cyan(`  ╔${border}╗`));
  console.log(chalk.cyan('  ║') + chalk.bold('  SITE INTELLIGENCE').padEnd(W) + chalk.cyan('║'));
  console.log(chalk.cyan(`  ╠${border}╣`));

  if (summary.hasData) {
    const scoreLine = `  Health: ${summary.score}/100 (${summary.grade})  |  Routes: ${summary.totalRoutes}  |  TestID: ${summary.testIdCoverage}%`;
    const diffLine = `  Last: ${summary.lastScan} (${summary.lastScanType})  |  Diffs: ${summary.improvements} up, ${summary.regressions} down`;

    console.log(chalk.cyan('  ║') + formatScoreLine(scoreLine, summary, W) + chalk.cyan('║'));
    console.log(chalk.cyan('  ║') + chalk.dim(diffLine.padEnd(W)) + chalk.cyan('║'));
  } else {
    console.log(chalk.cyan('  ║') + chalk.dim('  No scan data yet — run a Dev Scan or Full Scan to get started'.padEnd(W)) + chalk.cyan('║'));
  }

  console.log(chalk.cyan(`  ╚${border}╝`));
  console.log('');
}

function formatScoreLine(line, summary, width) {
  // Build the line with color for the grade
  const prefix = `  Health: ${summary.score}/100 (`;
  const suffix = `)  |  Routes: ${summary.totalRoutes}  |  TestID: ${summary.testIdCoverage}%`;
  const full = prefix + summary.grade + suffix;
  return (
    chalk.white(prefix) +
    gradeColor(summary.grade) +
    chalk.white(suffix) +
    ' '.repeat(Math.max(0, width - full.length))
  );
}

function renderSection(title, items) {
  console.log(chalk.cyan(`  ── ${title} ${'─'.repeat(Math.max(0, 68 - title.length))}`));
  console.log('');
  for (const item of items) {
    const keyStr = chalk.cyan(`  [${item.key}]`);
    const labelStr = chalk.white.bold(item.label.padEnd(18));
    const durationStr = chalk.dim(`(${item.duration})`);
    console.log(`${keyStr} ${labelStr} ${durationStr}`);
    console.log(chalk.dim(`       ${item.desc}`));
  }
  console.log('');
}

// ── Main Menu ────────────────────────────────────────────────────────

async function showSiteIntelMenu() {
  // Neovim auto-detection: if running inside Neovim, signal panel mode
  if (process.env.NVIM) {
    const result = { mode: 'neovim', action: 'open_panel' };
    console.log(JSON.stringify(result));
    return result;
  }

  const summary = getSiteIntelSummary();
  renderBanner(summary);

  const scanItems = MENU_ACTIONS.filter(a => a.section === 'scan');
  const reviewItems = MENU_ACTIONS.filter(a => a.section === 'review');
  const advancedItems = MENU_ACTIONS.filter(a => a.section === 'advanced');

  renderSection('Scan & Analyze', scanItems);
  renderSection('Review & Explore', reviewItems);
  renderSection('Advanced', advancedItems);

  // Build inquirer choices
  const choices = [];
  const addSection = (label, items) => {
    choices.push(new inquirer.Separator(chalk.cyan(` ── ${label} ──`)));
    for (const item of items) {
      choices.push({
        name: `${item.key}. ${item.label.padEnd(18)} ${chalk.dim(`(${item.duration})`)}`,
        value: item.action,
      });
    }
  };

  addSection('Scan & Analyze', scanItems);
  addSection('Review & Explore', reviewItems);
  addSection('Advanced', advancedItems);
  choices.push(new inquirer.Separator());
  choices.push({ name: chalk.dim('Exit'), value: 'exit' });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select an action:',
    choices,
    pageSize: 20,
  }]);

  if (action === 'exit') {
    return null;
  }

  // Special case: dashboard launches directly
  if (action === 'dashboard') {
    console.log(chalk.yellow('\n  Starting Site Intelligence Dashboard...'));
    try {
      await startDashboard({ port: 3847 });
      console.log(chalk.green('  Dashboard running at http://localhost:3847'));
    } catch (err) {
      console.error(chalk.red(`  Failed to start dashboard: ${err.message}`));
    }
    return { action: 'dashboard', args: {}, label: 'Open Dashboard' };
  }

  // Build JSON result for Claude to route
  const menuItem = MENU_ACTIONS.find(a => a.action === action);
  const result = {
    action,
    args: buildDefaultArgs(action),
    label: menuItem?.label || action,
  };

  console.log(JSON.stringify(result));
  return result;
}

function buildDefaultArgs(action) {
  switch (action) {
    case 'scan':        return { scanType: 'full' };
    case 'dev-scan':    return { scanType: 'auto' };
    case 'quick-check': return {};
    case 'audit':       return {};
    case 'recommend':   return { limit: 10 };
    case 'status':      return {};
    case 'graph':       return { format: 'mermaid' };
    case 'drift':       return {};
    case 'page':        return {};
    case 'search':      return {};
    case 'contract':    return {};
    default:            return {};
  }
}

// ── Exports ──────────────────────────────────────────────────────────

function getMenuActions() {
  return MENU_ACTIONS;
}

export { showSiteIntelMenu, getSiteIntelSummary, getMenuActions };

// ── CLI Entry Point ──────────────────────────────────────────────────
// When run directly: node src/site-intel/menu.js

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('src/site-intel/menu.js');
if (isMain) {
  showSiteIntelMenu().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
