/**
 * Website Intelligence System - Orchestrator
 *
 * Coordinates all 5 layers to perform complete site analysis:
 * L1: Discovery -> L2: Summarization -> L3: Graph -> L4: Memory -> L5: Judgment
 */

import { crawlSite } from './discovery/index.js';
import { parseRoutes } from './discovery/route-parser.js';
import { summarizeAllPages } from './summarizer/index.js';
import { buildSiteGraph, addRouteEdges, toMermaid } from './graph/index.js';
import { saveScan, loadLatestScan, listDomains, toChromaDocuments, storeToChroma } from './memory/index.js';
import { generateRecommendations, calculateHealthScore, generateJudgmentPrompt } from './judgment/index.js';

/**
 * Run a full site intelligence scan
 * @param {string} url - URL to scan
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} Complete scan result
 */
export async function runFullScan(url, options = {}) {
  const {
    maxPages = 50,
    depth = 3,
    includeScreenshots = true,
    projectRoot = process.cwd(),
    saveToDisk = true
  } = options;

  const startTime = Date.now();
  const results = { layers: {} };

  // Layer 1: Discovery
  console.log('[L1] Starting discovery crawl...');
  const crawlResult = await crawlSite(url, {
    maxPages,
    depth,
    includeScreenshots
  });

  if (!crawlResult.success) {
    return { success: false, error: `Crawl failed: ${crawlResult.error}`, layer: 'discovery' };
  }

  results.layers.discovery = {
    status: 'complete',
    pagesFound: crawlResult.stats.pagesCrawled,
    routes: crawlResult.routes.length,
    apiEndpoints: crawlResult.apiEndpoints.length,
    duration: crawlResult.stats.duration
  };
  console.log(`[L1] Discovered ${crawlResult.stats.pagesCrawled} pages, ${crawlResult.routes.length} routes`);

  // L1.5: Code Analysis (route parsing via ts-morph)
  let routeData = null;
  try {
    console.log('[L1.5] Parsing codebase routes...');
    routeData = await parseRoutes(projectRoot);
    if (routeData.success) {
      results.layers.codeAnalysis = {
        status: 'complete',
        totalRoutes: routeData.summary.totalRoutes,
        totalComponents: routeData.summary.totalComponents,
        totalHooks: routeData.summary.totalHooks,
        totalApiCalls: routeData.summary.totalApiCalls
      };
      console.log(`[L1.5] Parsed ${routeData.summary.totalRoutes} routes, ${routeData.summary.totalComponents} components`);
    } else {
      results.layers.codeAnalysis = { status: 'skipped', reason: routeData.error || 'No routes found' };
      console.log(`[L1.5] Skipped: ${routeData.error || 'No routes found'}`);
    }
  } catch (err) {
    results.layers.codeAnalysis = { status: 'skipped', reason: err.message };
    console.log(`[L1.5] Skipped: ${err.message}`);
  }

  // Layer 2: Summarization
  console.log('[L2] Generating semantic summaries...');
  const summaryResult = summarizeAllPages(crawlResult);

  if (!summaryResult.success) {
    return { success: false, error: `Summarization failed: ${summaryResult.error}`, layer: 'summarizer' };
  }

  results.layers.summarizer = {
    status: 'complete',
    pagesSummarized: summaryResult.aggregate.totalPages,
    totalSmells: summaryResult.aggregate.totalSmells,
    highValuePages: summaryResult.aggregate.highValuePages,
    pageTypes: summaryResult.aggregate.pageTypes
  };
  console.log(`[L2] Summarized ${summaryResult.aggregate.totalPages} pages, found ${summaryResult.aggregate.totalSmells} issues`);

  // Layer 3: Graph
  console.log('[L3] Building cross-page graph...');
  const graphResult = buildSiteGraph(crawlResult, summaryResult);

  if (!graphResult.success) {
    return { success: false, error: `Graph build failed: ${graphResult.error}`, layer: 'graph' };
  }

  // Merge route edges from code analysis
  if (routeData?.success && routeData.routes.length > 0) {
    addRouteEdges(graphResult, routeData);
    console.log(`[L3] Added route edges: ${graphResult.metrics.routeEdgeCount} route, ${graphResult.metrics.componentEdgeCount} component, ${graphResult.metrics.apiClientEdgeCount} api-client`);
  }

  results.layers.graph = {
    status: 'complete',
    nodes: graphResult.nodes.length,
    edges: graphResult.edges.length,
    userFlows: graphResult.userFlows.length,
    sharedAPIs: graphResult.sharedAPIs.length,
    orphans: graphResult.metrics.orphanCount,
    routeEdges: graphResult.metrics.routeEdgeCount || 0,
    componentEdges: graphResult.metrics.componentEdgeCount || 0,
    apiClientEdges: graphResult.metrics.apiClientEdgeCount || 0
  };
  console.log(`[L3] Graph: ${graphResult.nodes.length} nodes, ${graphResult.edges.length} edges, ${graphResult.userFlows.length} flows`);

  // Layer 4: Memory
  console.log('[L4] Storing to memory...');
  if (saveToDisk) {
    const saveResult = saveScan(projectRoot, crawlResult.domain, crawlResult.scanId, {
      crawl: crawlResult,
      summaries: summaryResult,
      graph: graphResult
    });
    results.layers.memory = { status: 'complete', saved: saveResult.success, scanDir: saveResult.scanDir };
  } else {
    results.layers.memory = { status: 'skipped' };
  }

  // Generate ChromaDB documents (ready for vector storage)
  const chromaDocs = toChromaDocuments(summaryResult, crawlResult.scanId);
  results.layers.memory.chromaDocuments = chromaDocs.documents.length;

  // Store ChromaDB documents for vector search
  if (chromaDocs.documents.length > 0) {
    const chromaResult = storeToChroma(chromaDocs, crawlResult.domain, { projectRoot });
    results.layers.memory.chromaStored = chromaResult.stored;
    if (chromaResult.stored) {
      console.log(`[L4] ChromaDB: ${chromaResult.count} documents stored to ${chromaResult.collection}`);
    }
  }
  console.log(`[L4] Stored scan, prepared ${chromaDocs.documents.length} vector documents`);

  // Layer 5: Judgment
  console.log('[L5] Generating recommendations...');
  const recommendations = generateRecommendations(summaryResult, graphResult);
  const healthScore = calculateHealthScore(summaryResult, graphResult);
  const judgmentPrompt = generateJudgmentPrompt(summaryResult, graphResult, recommendations.recommendations || []);

  results.layers.judgment = {
    status: 'complete',
    recommendations: recommendations.recommendations?.length || 0,
    healthScore: healthScore.score,
    healthGrade: healthScore.grade
  };
  console.log(`[L5] Health: ${healthScore.score}/100 (${healthScore.grade}), ${recommendations.recommendations?.length || 0} recommendations`);

  const totalDuration = Date.now() - startTime;

  return {
    success: true,
    scanId: crawlResult.scanId,
    domain: crawlResult.domain,
    baseUrl: crawlResult.baseUrl,
    layers: results.layers,
    summary: {
      totalPages: crawlResult.stats.pagesCrawled,
      totalRoutes: crawlResult.routes.length,
      totalSmells: summaryResult.aggregate.totalSmells,
      healthScore: healthScore.score,
      healthGrade: healthScore.grade,
      topRecommendations: (recommendations.recommendations || []).slice(0, 3),
      duration: totalDuration
    },
    // Full data for further processing
    data: {
      crawl: crawlResult,
      summaries: summaryResult,
      graph: graphResult,
      recommendations,
      healthScore,
      chromaDocs,
      judgmentPrompt,
      mermaid: toMermaid(graphResult)
    }
  };
}

/**
 * Get recommendations for a previously scanned site
 * @param {string} domain - Website domain
 * @param {Object} options - Options
 * @returns {Object} Recommendations
 */
export function getRecommendations(domain, options = {}) {
  const { projectRoot = process.cwd(), limit = 10, focus = 'all' } = options;

  const scan = loadLatestScan(projectRoot, domain);
  if (!scan) {
    return { success: false, error: `No scans found for domain: ${domain}` };
  }

  if (!scan.summaries || !scan.graph) {
    return { success: false, error: 'Scan data incomplete - missing summaries or graph' };
  }

  const recommendations = generateRecommendations(scan.summaries, scan.graph, { limit, focus });
  const healthScore = calculateHealthScore(scan.summaries, scan.graph);

  return {
    success: true,
    domain,
    scanId: scan.scanId,
    recommendations: recommendations.recommendations || [],
    healthScore,
    total: recommendations.total
  };
}

/**
 * Get the status of all layers for a domain
 * @param {string} domain - Website domain
 * @param {Object} options - Options
 * @returns {Object} Layer status
 */
export function getStatus(domain, options = {}) {
  const { projectRoot = process.cwd() } = options;

  const scan = loadLatestScan(projectRoot, domain);

  const layers = [
    { name: 'L1: Discovery', status: scan?.crawl ? 'OK' : 'NOT_RUN', lastRun: scan?.savedAt || null, itemsProcessed: scan?.crawl?.stats?.pagesCrawled || 0 },
    { name: 'L2: Summaries', status: scan?.summaries ? 'OK' : 'NOT_RUN', lastRun: scan?.savedAt || null, itemsProcessed: scan?.summaries?.aggregate?.totalPages || 0 },
    { name: 'L3: Graph', status: scan?.graph ? 'OK' : 'NOT_RUN', lastRun: scan?.savedAt || null, itemsProcessed: scan?.graph?.nodes?.length || 0 },
    { name: 'L4: Memory', status: scan ? 'OK' : 'NOT_RUN', lastRun: scan?.savedAt || null, itemsProcessed: 0 },
    { name: 'L5: Judgment', status: scan?.summaries && scan?.graph ? 'READY' : 'NOT_RUN', lastRun: null, itemsProcessed: 0 }
  ];

  const healthScore = scan?.summaries && scan?.graph
    ? calculateHealthScore(scan.summaries, scan.graph)
    : { score: 0, grade: 'N/A' };

  return {
    domain,
    scanId: scan?.scanId || null,
    lastScan: scan?.savedAt || null,
    layers,
    totalPages: scan?.crawl?.stats?.pagesCrawled || 0,
    totalComponents: 0, // Would need component extraction data
    healthScore: healthScore.score,
    healthGrade: healthScore.grade
  };
}

/**
 * List all scanned sites
 * @param {Object} options - Options
 * @returns {Object[]} Domain list
 */
export function listSites(options = {}) {
  const { projectRoot = process.cwd() } = options;
  return listDomains(projectRoot);
}

// ============================================================
// Dev Scan Mode - Developer-focused application scanning
// ============================================================

import { readDevScanConfig, validateConfig } from './dev-scan/config-reader.js';
import { buildRouteCatalog } from './dev-scan/route-catalog.js';
import { loadState, saveState, initializeState, updateStateWithResults, computeScoreDiffs } from './dev-scan/state-manager.js';
import { getCurrentCommitHash, getCurrentCommitMessage, mapChangedFilesToRoutes } from './dev-scan/git-diff.js';
import { scanRoutes } from './dev-scan/scanner.js';
import { checkTestIdCoverage } from './dev-scan/testid-checker.js';
import { generateDiffReport, formatDiffForCli } from './dev-scan/diff-reporter.js';

/**
 * Run a developer-focused scan of the application
 * Automatically determines full vs incremental based on state
 *
 * @param {Object} options - Scan options
 * @param {string} options.projectRoot - Target project root (not CCASP root)
 * @param {string} options.scanType - Force 'full' or 'incremental' (auto-detected if omitted)
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Object>} Complete dev scan result
 */
export async function runDevScan(options = {}) {
  const { projectRoot = process.cwd(), scanType: forceScanType, onProgress } = options;
  const startTime = Date.now();

  console.log('[DevScan] Starting developer scan...');

  // 1. Read config
  console.log('[DevScan] Reading project configuration...');
  const config = readDevScanConfig(projectRoot);
  const validation = validateConfig(config);

  if (!validation.valid) {
    return { success: false, error: `Config validation failed: ${validation.issues.join('; ')}`, config };
  }

  if (validation.warnings.length > 0) {
    for (const warning of validation.warnings) {
      console.log(`[DevScan] Warning: ${warning}`);
    }
  }

  // 2. Build route catalog
  console.log('[DevScan] Building route catalog...');
  const catalog = await buildRouteCatalog(projectRoot, {
    srcDir: config.srcDir,
    framework: config.routerFramework,
  });

  if (!catalog.success) {
    return { success: false, error: `Route catalog failed: ${catalog.error}`, config };
  }

  console.log(`[DevScan] Found ${catalog.summary.totalRoutes} routes, ${catalog.summary.totalComponents} components`);

  // 3. Load existing state
  let state = loadState(projectRoot);
  const isFirstRun = !state;

  if (isFirstRun) {
    console.log('[DevScan] First run detected - initializing state');
    state = initializeState(projectRoot, config.techStack?.projectName);
  }

  // 4. Determine scan type
  let determinedScanType = forceScanType || (isFirstRun ? 'full' : 'incremental');
  let affectedRoutes = [];
  let diffInfo = null;

  if (determinedScanType === 'incremental' && state.lastCommitHash) {
    console.log('[DevScan] Running incremental scan (git diff analysis)...');
    diffInfo = mapChangedFilesToRoutes(projectRoot, state.lastCommitHash, catalog.reverseMap, {
      routesFile: config.routesFile,
      totalRoutes: catalog.summary.totalRoutes,
      fullScanThreshold: config.fullScanThreshold,
    });

    if (diffInfo.isFullScanNeeded) {
      console.log('[DevScan] Promoting to full scan (structural changes or threshold exceeded)');
      determinedScanType = 'full';
    } else if (diffInfo.noChanges) {
      console.log('[DevScan] No changes detected since last scan');
      return {
        success: true,
        noChanges: true,
        state,
        config,
        catalog: catalog.summary,
        duration: Date.now() - startTime,
      };
    } else {
      affectedRoutes = diffInfo.affectedRoutes;
      console.log(`[DevScan] ${affectedRoutes.length} routes affected by ${diffInfo.sourceChanged} changed files`);
    }
  }

  // 5. Determine which routes to scan
  const routesToScan = determinedScanType === 'full'
    ? catalog.routes.map(r => r.fullPath)
    : affectedRoutes;

  console.log(`[DevScan] Scanning ${routesToScan.length} routes (${determinedScanType} scan)...`);

  // Build route info map for the scanner
  const routeInfoMap = {};
  for (const route of catalog.routes) {
    routeInfoMap[route.fullPath] = route;
  }

  // 6. Run Playwright scan
  const scanResult = await scanRoutes(routesToScan, config, {
    routeInfoMap,
    onProgress,
  });

  if (!scanResult.success) {
    return { success: false, error: scanResult.error, config, catalog: catalog.summary };
  }

  // 7. Compute diffs (before updating state)
  const currentCommit = getCurrentCommitHash(projectRoot);
  const currentMessage = getCurrentCommitMessage(projectRoot);

  const scoreDiffs = computeScoreDiffs(state, scanResult.results);

  // 8. Update state with new results
  updateStateWithResults(state, scanResult.results, {
    scanType: determinedScanType,
    commitHash: currentCommit,
    commitMessage: currentMessage,
  });

  // Update diff info in state
  state.latestDiffs = {
    scanId: `dev-scan-${Date.now()}`,
    commitRange: diffInfo?.commitRange || `${(state.lastCommitHash || '').substring(0, 7)}..${(currentCommit || '').substring(0, 7)}`,
    changedFiles: diffInfo?.changedFiles || [],
    affectedRoutes: routesToScan,
    improvements: scoreDiffs.improvements,
    regressions: scoreDiffs.regressions,
    unchanged: scoreDiffs.unchanged,
  };

  // 9. Save state
  const saveResult = saveState(projectRoot, state);
  if (!saveResult.success) {
    console.error(`[DevScan] Warning: Failed to save state: ${saveResult.error}`);
  }

  // 10. Generate CLI diff report
  let diffReport = null;
  if (scoreDiffs.hasChanges) {
    diffReport = formatDiffForCli(scoreDiffs, {
      commitRange: state.latestDiffs.commitRange,
      changedFiles: state.latestDiffs.changedFiles,
      affectedRoutes: routesToScan,
      scanType: determinedScanType,
    });
    console.log(diffReport);
  }

  const duration = Date.now() - startTime;

  console.log(`[DevScan] Complete in ${duration}ms - Health: ${state.overallHealth.score}/100 (${state.overallHealth.grade})`);

  return {
    success: true,
    scanType: determinedScanType,
    state,
    config: { baseUrl: config.baseUrl, framework: config.framework },
    catalog: catalog.summary,
    scanSummary: scanResult.summary,
    diffs: scoreDiffs,
    diffReport,
    duration,
  };
}

/**
 * Run a quick data-testid coverage check (no Playwright needed)
 *
 * @param {Object} options - Options
 * @param {string} options.projectRoot - Target project root
 * @param {number} options.maxDepth - Import resolution depth (default: 2)
 * @returns {Promise<Object>} Quick check result
 */
export async function runQuickCheck(options = {}) {
  const { projectRoot = process.cwd(), maxDepth = 2 } = options;
  const startTime = Date.now();

  console.log('[QuickCheck] Running static data-testid coverage analysis...');

  // 1. Read config
  const config = readDevScanConfig(projectRoot);

  // 2. Build route catalog
  const catalog = await buildRouteCatalog(projectRoot, {
    srcDir: config.srcDir,
    framework: config.routerFramework,
  });

  if (!catalog.success) {
    return { success: false, error: `Route catalog failed: ${catalog.error}` };
  }

  // 3. Run static testid coverage check
  const coverageResult = checkTestIdCoverage(catalog.routes, { maxDepth });

  // 4. Update state with quick check results
  let state = loadState(projectRoot);
  if (!state) {
    state = initializeState(projectRoot);
  }

  state.quickCheck = {
    lastRun: new Date().toISOString(),
    overallCoverage: coverageResult.overallCoverage,
    routeResults: coverageResult.routeResults,
  };

  // Also populate route catalog info in state
  for (const route of catalog.routes) {
    if (!state.routes[route.fullPath]) {
      state.routes[route.fullPath] = {
        component: route.component,
        componentFile: route.componentFile,
        hooks: route.hooks,
        apiCalls: route.apiCalls,
        scores: null,
        lastScanned: null,
        history: [],
      };
    }
  }
  state.totalRoutes = Object.keys(state.routes).length;

  saveState(projectRoot, state);

  const duration = Date.now() - startTime;

  console.log(`[QuickCheck] Complete in ${duration}ms - Coverage: ${Math.round(coverageResult.overallCoverage * 100)}%`);
  console.log(`[QuickCheck] Routes: ${coverageResult.routesGood} good, ${coverageResult.routesWarning} warning, ${coverageResult.routesCritical} critical, ${coverageResult.routesSkipped} skipped`);

  return {
    success: true,
    ...coverageResult,
    catalog: catalog.summary,
    duration,
  };
}

export default { runFullScan, getRecommendations, getStatus, listSites, runDevScan, runQuickCheck };
