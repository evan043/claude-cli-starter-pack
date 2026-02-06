/**
 * Site Intelligence Command
 *
 * CLI interface for CCASP Website Intelligence System.
 * 5-layer agentic system for understanding any website:
 * L1: Discovery, L2: Summarization, L3: Graph, L4: Memory, L5: Judgment
 */

import chalk from 'chalk';
import ora from 'ora';
import { showHeader } from '../cli/menu.js';
import {
  runFullScan,
  getRecommendations,
  getStatus,
  listSites,
  loadLatestScan,
  toMermaid,
  listScans,
  startDashboard,
} from '../site-intel/index.js';

/**
 * Format duration in ms to human-readable string
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Colorize text (try chalk, fallback to plain)
 */
function colorize(text, color) {
  try {
    if (chalk[color]) return chalk[color](text);
    return text;
  } catch {
    return text;
  }
}

/**
 * Display scan summary in ASCII table format
 */
function displayScanSummary(result) {
  console.log('');
  console.log(chalk.bold.cyan('Scan Complete'));
  console.log(chalk.dim('─'.repeat(80)));

  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(`  Domain:        ${chalk.white(result.domain)}`);
  console.log(`  Scan ID:       ${chalk.dim(result.scanId)}`);
  console.log(`  Pages Found:   ${chalk.cyan(result.summary.totalPages)}`);
  console.log(`  Routes:        ${chalk.cyan(result.summary.totalRoutes)}`);
  console.log(`  Issues Found:  ${chalk.yellow(result.summary.totalSmells)}`);
  console.log(`  Duration:      ${chalk.dim(formatDuration(result.summary.duration))}`);
  console.log('');

  // Health score with color
  const scoreColor = result.summary.healthScore >= 80 ? 'green' :
                     result.summary.healthScore >= 60 ? 'yellow' : 'red';
  console.log(chalk.bold('Health Score:'));
  console.log(`  ${colorize(`${result.summary.healthScore}/100`, scoreColor)} (Grade: ${chalk.bold(result.summary.healthGrade)})`);
  console.log('');

  // Top recommendations
  if (result.summary.topRecommendations && result.summary.topRecommendations.length > 0) {
    console.log(chalk.bold('Top Recommendations:'));
    result.summary.topRecommendations.forEach((rec, idx) => {
      const priority = rec.priority || 'medium';
      const priorityColor = priority === 'high' ? 'red' :
                           priority === 'medium' ? 'yellow' : 'dim';
      console.log(`  ${idx + 1}. [${colorize(priority.toUpperCase(), priorityColor)}] ${rec.title}`);
      if (rec.description) {
        console.log(`     ${chalk.dim(rec.description)}`);
      }
    });
    console.log('');
  }

  // Layer status
  console.log(chalk.bold('Layer Status:'));
  Object.entries(result.layers).forEach(([layer, status]) => {
    const statusIcon = status.status === 'complete' ? chalk.green('✓') :
                       status.status === 'skipped' ? chalk.yellow('○') : chalk.red('✗');
    console.log(`  ${statusIcon} ${layer.padEnd(12)} ${chalk.dim(status.status)}`);
  });
  console.log('');
}

/**
 * Display recommendations in table format
 */
function displayRecommendations(result) {
  console.log('');
  console.log(chalk.bold.cyan(`Recommendations for ${result.domain}`));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');

  if (!result.recommendations || result.recommendations.length === 0) {
    console.log(chalk.yellow('No recommendations found.'));
    return;
  }

  result.recommendations.forEach((rec, idx) => {
    const priority = rec.priority || 'medium';
    const priorityColor = priority === 'high' ? 'red' :
                         priority === 'medium' ? 'yellow' : 'dim';

    console.log(`${chalk.bold(`${idx + 1}.`)} [${colorize(priority.toUpperCase(), priorityColor)}] ${chalk.bold(rec.title)}`);

    if (rec.description) {
      console.log(`   ${chalk.dim(rec.description)}`);
    }

    if (rec.affectedPages && rec.affectedPages.length > 0) {
      console.log(`   ${chalk.dim('Affected:')} ${chalk.dim(rec.affectedPages.slice(0, 3).join(', '))}${rec.affectedPages.length > 3 ? chalk.dim(` +${rec.affectedPages.length - 3} more`) : ''}`);
    }

    console.log('');
  });

  // Health score
  if (result.healthScore) {
    const scoreColor = result.healthScore.score >= 80 ? 'green' :
                      result.healthScore.score >= 60 ? 'yellow' : 'red';
    console.log(chalk.bold('Overall Health:'));
    console.log(`  ${colorize(`${result.healthScore.score}/100`, scoreColor)} (${chalk.bold(result.healthScore.grade)})`);
    console.log('');
  }
}

/**
 * Display layer status
 */
function displayStatus(status) {
  console.log('');
  console.log(chalk.bold.cyan(`Status for ${status.domain}`));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');

  console.log(chalk.bold('Overview:'));
  console.log(`  Scan ID:       ${status.scanId ? chalk.dim(status.scanId) : chalk.yellow('No scans')}`);
  console.log(`  Last Scan:     ${status.lastScan ? chalk.dim(new Date(status.lastScan).toLocaleString()) : chalk.yellow('Never')}`);
  console.log(`  Total Pages:   ${chalk.cyan(status.totalPages)}`);
  console.log('');

  if (status.healthScore > 0) {
    const scoreColor = status.healthScore >= 80 ? 'green' :
                      status.healthScore >= 60 ? 'yellow' : 'red';
    console.log(chalk.bold('Health Score:'));
    console.log(`  ${colorize(`${status.healthScore}/100`, scoreColor)} (${chalk.bold(status.healthGrade)})`);
    console.log('');
  }

  console.log(chalk.bold('Layers:'));
  status.layers.forEach(layer => {
    const statusIcon = layer.status === 'OK' || layer.status === 'READY' ? chalk.green('✓') :
                      layer.status === 'NOT_RUN' ? chalk.yellow('○') : chalk.red('✗');
    const itemsText = layer.itemsProcessed > 0 ? chalk.dim(` (${layer.itemsProcessed} items)`) : '';
    console.log(`  ${statusIcon} ${layer.name.padEnd(20)} ${chalk.dim(layer.status)}${itemsText}`);
  });
  console.log('');
}

/**
 * Display list of all sites
 */
function displaySiteList(sites) {
  console.log('');
  console.log(chalk.bold.cyan('Scanned Sites'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');

  if (!sites || sites.length === 0) {
    console.log(chalk.yellow('No sites have been scanned yet.'));
    console.log('');
    console.log(chalk.dim('Run: ccasp site-intel scan <url>'));
    return;
  }

  // Table header
  console.log(
    chalk.bold(
      `${chalk.white('Domain'.padEnd(30))} ${chalk.dim('Last Scan'.padEnd(20))} ${chalk.dim('Pages')}`
    )
  );
  console.log(chalk.dim('─'.repeat(80)));

  sites.forEach(site => {
    const domain = site.domain.padEnd(30);
    const lastScan = site.lastScan ? new Date(site.lastScan).toLocaleDateString().padEnd(20) : 'Never'.padEnd(20);
    const pages = site.totalPages || 0;

    console.log(`${chalk.white(domain)} ${chalk.dim(lastScan)} ${chalk.cyan(pages)}`);
  });

  console.log('');
  console.log(chalk.dim(`Total: ${sites.length} site${sites.length !== 1 ? 's' : ''}`));
  console.log('');
}

/**
 * Display page detail
 */
function displayPageDetail(page, domain) {
  console.log('');
  console.log(chalk.bold.cyan(`Page Detail: ${page.url}`));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');

  console.log(chalk.bold('Classification:'));
  console.log(`  Type:          ${chalk.cyan(page.classification?.type || 'unknown')}`);
  console.log(`  Purpose:       ${chalk.dim(page.classification?.purpose || 'N/A')}`);
  console.log(`  Business Value: ${chalk.dim(page.classification?.businessValue || 'N/A')}`);
  console.log('');

  if (page.features && page.features.length > 0) {
    console.log(chalk.bold('Features:'));
    page.features.forEach(feature => {
      console.log(`  • ${feature}`);
    });
    console.log('');
  }

  if (page.smells && page.smells.length > 0) {
    console.log(chalk.bold.yellow('Issues Found:'));
    page.smells.forEach(smell => {
      const severityColor = smell.severity === 'high' ? 'red' :
                           smell.severity === 'medium' ? 'yellow' : 'dim';
      console.log(`  [${colorize(smell.severity?.toUpperCase() || 'LOW', severityColor)}] ${smell.type}`);
      if (smell.description) {
        console.log(`      ${chalk.dim(smell.description)}`);
      }
    });
    console.log('');
  }

  if (page.dependencies && (page.dependencies.apiEndpoints?.length > 0 || page.dependencies.sharedComponents?.length > 0)) {
    console.log(chalk.bold('Dependencies:'));
    if (page.dependencies.apiEndpoints?.length > 0) {
      console.log(`  APIs: ${chalk.dim(page.dependencies.apiEndpoints.join(', '))}`);
    }
    if (page.dependencies.sharedComponents?.length > 0) {
      console.log(`  Components: ${chalk.dim(page.dependencies.sharedComponents.slice(0, 5).join(', '))}${page.dependencies.sharedComponents.length > 5 ? chalk.dim(` +${page.dependencies.sharedComponents.length - 5} more`) : ''}`);
    }
    console.log('');
  }
}

/**
 * Scan command handler
 */
export async function handleScan(url, options) {
  showHeader('Site Intelligence - Scan');

  console.log(chalk.dim(`Scanning: ${url}`));
  console.log('');

  const spinner = ora('Running full site scan...').start();

  try {
    const result = await runFullScan(url, {
      maxPages: options.maxPages ? parseInt(options.maxPages, 10) : 50,
      depth: options.depth ? parseInt(options.depth, 10) : 3,
      includeScreenshots: !options.noScreenshots,
      projectRoot: process.cwd()
    });

    spinner.stop();

    if (!result.success) {
      console.log(chalk.red(`✗ Scan failed: ${result.error}`));
      console.log(chalk.dim(`Failed at layer: ${result.layer}`));
      return;
    }

    displayScanSummary(result);

    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  ccasp site-intel recommend ${result.domain}`));
    console.log(chalk.dim(`  ccasp site-intel graph ${result.domain}`));
    console.log(chalk.dim(`  ccasp site-intel page ${result.domain} <path>`));
    console.log('');

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Recommend command handler
 */
export async function handleRecommend(domain, options) {
  showHeader('Site Intelligence - Recommendations');

  const spinner = ora('Loading recommendations...').start();

  try {
    const result = getRecommendations(domain, {
      projectRoot: process.cwd(),
      limit: options.limit ? parseInt(options.limit, 10) : 10,
      focus: options.focus || 'all'
    });

    spinner.stop();

    if (!result.success) {
      console.log(chalk.red(`✗ ${result.error}`));
      console.log(chalk.dim('Run: ccasp site-intel scan <url>'));
      return;
    }

    displayRecommendations(result);

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Status command handler
 */
export async function handleStatus(domain, options) {
  showHeader('Site Intelligence - Status');

  if (!domain) {
    // List all sites
    const sites = listSites({ projectRoot: process.cwd() });
    displaySiteList(sites);
    return;
  }

  const spinner = ora('Loading status...').start();

  try {
    const status = getStatus(domain, { projectRoot: process.cwd() });
    spinner.stop();
    displayStatus(status);

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Page command handler
 */
export async function handlePage(domain, pagePath, options) {
  showHeader('Site Intelligence - Page Detail');

  const spinner = ora('Loading page data...').start();

  try {
    const scan = loadLatestScan(process.cwd(), domain);
    spinner.stop();

    if (!scan || !scan.summaries) {
      console.log(chalk.red(`✗ No scan data found for domain: ${domain}`));
      console.log(chalk.dim('Run: ccasp site-intel scan <url>'));
      return;
    }

    // Find matching page
    const page = scan.summaries.pages.find(p =>
      p.url.includes(pagePath) || p.path === pagePath
    );

    if (!page) {
      console.log(chalk.red(`✗ Page not found: ${pagePath}`));
      console.log(chalk.dim(`Available pages: ${scan.summaries.pages.length}`));
      console.log('');
      console.log(chalk.dim('Try:'));
      scan.summaries.pages.slice(0, 5).forEach(p => {
        console.log(chalk.dim(`  ccasp site-intel page ${domain} ${p.path || p.url}`));
      });
      return;
    }

    displayPageDetail(page, domain);

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Graph command handler
 */
export async function handleGraph(domain, options) {
  showHeader('Site Intelligence - Dependency Graph');

  const spinner = ora('Loading graph...').start();

  try {
    const scan = loadLatestScan(process.cwd(), domain);
    spinner.stop();

    if (!scan || !scan.graph) {
      console.log(chalk.red(`✗ No graph data found for domain: ${domain}`));
      console.log(chalk.dim('Run: ccasp site-intel scan <url>'));
      return;
    }

    const format = options.format || 'mermaid';

    if (format === 'json') {
      console.log('');
      console.log(JSON.stringify(scan.graph, null, 2));
      console.log('');
    } else {
      // Mermaid format
      const mermaid = toMermaid(scan.graph);
      console.log('');
      console.log(chalk.bold('Dependency Graph (Mermaid):'));
      console.log(chalk.dim('─'.repeat(80)));
      console.log('');
      console.log(mermaid);
      console.log('');
      console.log(chalk.dim('Copy the above diagram to: https://mermaid.live'));
      console.log('');
    }

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Drift command handler
 */
export async function handleDrift(domain, options) {
  showHeader('Site Intelligence - Drift Detection');

  const spinner = ora('Analyzing drift...').start();

  try {
    const scans = listScans(process.cwd(), domain);
    spinner.stop();

    if (!scans || scans.length < 2) {
      console.log(chalk.yellow('Need at least 2 scans to detect drift.'));
      console.log(chalk.dim(`Current scans: ${scans?.length || 0}`));
      return;
    }

    // Compare last two scans
    const latest = loadLatestScan(process.cwd(), domain);
    const previous = scans[scans.length - 2];

    console.log('');
    console.log(chalk.bold('Drift Analysis'));
    console.log(chalk.dim('─'.repeat(80)));
    console.log('');
    console.log(chalk.bold('Comparing:'));
    console.log(`  Previous: ${chalk.dim(previous.scanId)} (${new Date(previous.timestamp).toLocaleString()})`);
    console.log(`  Latest:   ${chalk.dim(latest.scanId)} (${new Date(latest.savedAt).toLocaleString()})`);
    console.log('');

    // Compare page counts
    const prevPages = previous.crawl?.stats?.pagesCrawled || 0;
    const currPages = latest.crawl?.stats?.pagesCrawled || 0;
    const pageDiff = currPages - prevPages;

    console.log(chalk.bold('Changes:'));
    console.log(`  Pages:  ${prevPages} → ${currPages} ${pageDiff > 0 ? chalk.green(`(+${pageDiff})`) : pageDiff < 0 ? chalk.red(`(${pageDiff})`) : chalk.dim('(no change)')}`);

    // Compare health scores
    if (latest.summaries && previous.summaries) {
      const { calculateHealthScore } = await import('../site-intel/judgment/index.js');
      const prevScore = calculateHealthScore(previous.summaries, previous.graph);
      const currScore = calculateHealthScore(latest.summaries, latest.graph);
      const scoreDiff = currScore.score - prevScore.score;

      console.log(`  Health: ${prevScore.score} → ${currScore.score} ${scoreDiff > 0 ? chalk.green(`(+${scoreDiff})`) : scoreDiff < 0 ? chalk.red(`(${scoreDiff})`) : chalk.dim('(no change)')}`);
    }

    console.log('');
    console.log(chalk.dim('Full drift analysis coming in future versions.'));
    console.log('');

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * List command handler
 */
export async function handleList(options) {
  showHeader('Site Intelligence - Scanned Sites');

  try {
    const sites = listSites({ projectRoot: process.cwd() });
    displaySiteList(sites);
  } catch (error) {
    console.log(chalk.red(`✗ Error: ${error.message}`));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
}

/**
 * Dashboard command handler
 */
export async function handleDashboard(options) {
  showHeader('Site Intelligence - Dashboard');

  const port = options.port ? parseInt(options.port, 10) : 3847;
  const spinner = ora(`Starting dashboard server on port ${port}...`).start();

  try {
    const server = await startDashboard({
      port,
      projectRoot: process.cwd()
    });

    spinner.stop();
    console.log('');
    console.log(chalk.green(`✓ Dashboard started successfully`));
    console.log('');
    console.log(chalk.bold('Access the dashboard:'));
    console.log(`  ${chalk.cyan(`http://localhost:${port}`)}`);
    console.log('');
    console.log(chalk.dim('Press Ctrl+C to stop the server'));
    console.log('');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('');
      console.log(chalk.yellow('Shutting down dashboard...'));
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Failed to start dashboard: ${error.message}`));
    if (error.message.includes('already in use')) {
      console.log(chalk.dim(`Try a different port: ccasp site-intel dashboard --port ${port + 1}`));
    }
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Register site-intel commands with Commander
 */
export function registerSiteIntelCommands(program) {
  const siteIntel = program
    .command('site-intel')
    .description('Website Intelligence System - 5-layer agentic site analysis');

  // Scan command
  siteIntel
    .command('scan <url>')
    .description('Run full site intelligence scan (L1-L5)')
    .option('--max-pages <n>', 'Maximum pages to crawl', '50')
    .option('--depth <n>', 'Maximum crawl depth', '3')
    .option('--no-screenshots', 'Skip screenshot capture')
    .action(async (url, options) => {
      await handleScan(url, options);
    });

  // Recommend command
  siteIntel
    .command('recommend <domain>')
    .description('Get prioritized recommendations for a scanned site')
    .option('--limit <n>', 'Maximum recommendations to show', '10')
    .option('--focus <type>', 'Focus area (all, ux, performance, accessibility)')
    .action(async (domain, options) => {
      await handleRecommend(domain, options);
    });

  // Status command
  siteIntel
    .command('status [domain]')
    .description('Show layer status for a domain (or list all sites)')
    .action(async (domain, options) => {
      await handleStatus(domain, options);
    });

  // Page command
  siteIntel
    .command('page <domain> <path>')
    .description('Show detailed page analysis')
    .action(async (domain, path, options) => {
      await handlePage(domain, path, options);
    });

  // Graph command
  siteIntel
    .command('graph <domain>')
    .description('Show dependency graph')
    .option('--format <type>', 'Output format: mermaid or json', 'mermaid')
    .action(async (domain, options) => {
      await handleGraph(domain, options);
    });

  // Drift command
  siteIntel
    .command('drift <domain>')
    .description('Detect changes between scans')
    .action(async (domain, options) => {
      await handleDrift(domain, options);
    });

  // List command
  siteIntel
    .command('list')
    .description('List all scanned sites')
    .action(async (options) => {
      await handleList(options);
    });

  // Dashboard command
  siteIntel
    .command('dashboard')
    .description('Start web dashboard for visual exploration')
    .option('--port <n>', 'Port to run dashboard on', '3847')
    .action(async (options) => {
      await handleDashboard(options);
    });
}

/**
 * Main command export (for direct invocation)
 */
export async function runSiteIntel(subcommand, args, options = {}) {
  switch (subcommand) {
    case 'scan':
      return await handleScan(args[0], options);
    case 'recommend':
      return await handleRecommend(args[0], options);
    case 'status':
      return await handleStatus(args[0], options);
    case 'page':
      return await handlePage(args[0], args[1], options);
    case 'graph':
      return await handleGraph(args[0], options);
    case 'drift':
      return await handleDrift(args[0], options);
    case 'list':
      return await handleList(options);
    case 'dashboard':
      return await handleDashboard(options);
    default:
      console.log(chalk.yellow('Unknown subcommand. Available: scan, recommend, status, page, graph, drift, list, dashboard'));
  }
}
