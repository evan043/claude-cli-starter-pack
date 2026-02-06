/**
 * Smart Site Intel - Dev Scan Module
 *
 * Developer-focused application scanning that uses project config
 * to intelligently scan only the developer's own app routes.
 */

// Config
export { readDevScanConfig, validateConfig } from './config-reader.js';

// Route Catalog
export { buildRouteCatalog, getAffectedRoutes } from './route-catalog.js';

// State Management
export { loadState, saveState, initializeState, computeScoreDiffs, getRouteHistory } from './state-manager.js';

// Git Diff
export { getChangedFilesSinceLastScan, mapChangedFilesToRoutes, getCurrentCommitHash } from './git-diff.js';

// TestID Coverage
export { checkTestIdCoverage, checkTestIdCoverageForRoute } from './testid-checker.js';

// Scanner
export { scanRoutes, loginToApp } from './scanner.js';

// Diff Reporter
export { generateDiffReport, formatDiffForDashboard, formatDiffForCli } from './diff-reporter.js';
