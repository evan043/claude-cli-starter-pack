/**
 * CCASP Website Intelligence System
 *
 * 5-layer agentic system for understanding any website:
 * L1: Discovery (Playwright crawler)
 * L2: Semantic Summarization (Claude)
 * L3: Cross-Page Graph
 * L4: Semantic Memory (ChromaDB)
 * L5: Judgment Agent (Priority Engine)
 *
 * Dual interface: CLI commands + MCP server
 */

// Orchestrator (main entry point)
export { runFullScan, getRecommendations, getStatus, listSites, runDevScan, runQuickCheck } from './orchestrator.js';

// Layer 1: Discovery
export { crawlSite, normalizeUrl, isInternalUrl } from './discovery/index.js';
export { extractComponents, detectSharedComponents } from './discovery/component-extractor.js';
export { parseRoutes, isTsMorphAvailable } from './discovery/route-parser.js';

// Layer 2: Summarization
export { classifyPage, detectFeatures, mapDependencies, detectSmells, summarizePage, summarizeAllPages, generateDeepAnalysisPrompt } from './summarizer/index.js';

// Layer 3: Graph
export { buildSiteGraph, addRouteEdges, toMermaid } from './graph/index.js';

// Layer 4: Memory
export { saveScan, loadLatestScan, loadScan, listScans, listDomains, toChromaDocuments, storeToChroma, loadChromaPending } from './memory/index.js';

// Layer 5: Judgment
export { generateRecommendations, generateJudgmentPrompt, calculateHealthScore } from './judgment/index.js';

// Dashboard
export { startDashboard, SiteIntelDashboardServer } from './dashboard/index.js';

// Dev Scan (developer-focused application scanning)
export { readDevScanConfig, validateConfig } from './dev-scan/config-reader.js';
export { buildRouteCatalog, getAffectedRoutes } from './dev-scan/route-catalog.js';
export { loadState, saveState, initializeState, computeScoreDiffs, getRouteHistory } from './dev-scan/state-manager.js';
export { getChangedFilesSinceLastScan, mapChangedFilesToRoutes, getCurrentCommitHash } from './dev-scan/git-diff.js';
export { checkTestIdCoverage, checkTestIdCoverageForRoute } from './dev-scan/testid-checker.js';
export { scanRoutes, loginToApp } from './dev-scan/scanner.js';
export { generateDiffReport, formatDiffForDashboard, formatDiffForCli } from './dev-scan/diff-reporter.js';

export const VERSION = '0.1.0';
export const LAYERS = ['discovery', 'summarizer', 'graph', 'memory', 'judgment'];
