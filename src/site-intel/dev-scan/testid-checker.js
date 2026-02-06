/**
 * Smart Site Intel - TestID Coverage Checker
 *
 * Static analysis of React component source files to check data-testid
 * coverage on interactive elements. Runs without Playwright for fast
 * CI/pre-commit checks.
 */

import fs from 'fs';
import path from 'path';

/**
 * Patterns that identify interactive elements in JSX source code
 * Each pattern matches an opening tag or attribute that indicates user interaction
 */
const INTERACTIVE_PATTERNS = [
  { pattern: /<button\b/gi, name: 'button' },
  { pattern: /<input\b/gi, name: 'input' },
  { pattern: /<select\b/gi, name: 'select' },
  { pattern: /<textarea\b/gi, name: 'textarea' },
  { pattern: /<a\s+[^>]*href/gi, name: 'anchor' },
  { pattern: /role\s*=\s*["']button["']/gi, name: 'role-button' },
  { pattern: /role\s*=\s*["']link["']/gi, name: 'role-link' },
  { pattern: /role\s*=\s*["']tab["']/gi, name: 'role-tab' },
  { pattern: /role\s*=\s*["']menuitem["']/gi, name: 'role-menuitem' },
  { pattern: /role\s*=\s*["']checkbox["']/gi, name: 'role-checkbox' },
  { pattern: /role\s*=\s*["']switch["']/gi, name: 'role-switch' },
];

/**
 * Pattern to match data-testid attributes
 */
const TESTID_PATTERN = /data-testid\s*=\s*["'{\`]/gi;

/**
 * Count interactive elements in JSX source code
 *
 * @param {string} source - JSX/TSX source code
 * @returns {Object} Counts of interactive elements by type
 */
function countInteractiveElements(source) {
  const counts = {};
  let total = 0;

  for (const { pattern, name } of INTERACTIVE_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = source.match(pattern);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      counts[name] = count;
      total += count;
    }
  }

  return { counts, total };
}

/**
 * Count data-testid attributes in source code
 *
 * @param {string} source - JSX/TSX source code
 * @returns {number} Number of data-testid attributes
 */
function countTestIds(source) {
  TESTID_PATTERN.lastIndex = 0;
  const matches = source.match(TESTID_PATTERN);
  return matches ? matches.length : 0;
}

/**
 * Extract data-testid values from source code
 *
 * @param {string} source - JSX/TSX source code
 * @returns {string[]} Array of testid values found
 */
function extractTestIdValues(source) {
  const valuePattern = /data-testid\s*=\s*["']([^"']+)["']/gi;
  const values = [];
  let match;
  while ((match = valuePattern.exec(source)) !== null) {
    values.push(match[1]);
  }
  return values;
}

/**
 * Resolve import paths from a component file to find child components
 * Returns absolute file paths for locally imported components
 *
 * @param {string} filePath - Absolute path to the component file
 * @param {string} source - Source code content
 * @returns {string[]} Absolute paths to imported component files
 */
function resolveLocalImports(filePath, source) {
  const imports = [];
  const dir = path.dirname(filePath);

  // Match relative import statements
  const importPattern = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"](\.[^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    const importPath = match[1];
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

    for (const ext of extensions) {
      const resolved = path.resolve(dir, importPath + ext);
      if (fs.existsSync(resolved)) {
        imports.push(resolved);
        break;
      }
    }

    // Try without adding extension (may already have one)
    const direct = path.resolve(dir, importPath);
    if (fs.existsSync(direct) && !imports.includes(direct)) {
      imports.push(direct);
    }
  }

  return imports;
}

/**
 * Check data-testid coverage for a single component file
 * Optionally checks imported child components (up to maxDepth levels)
 *
 * @param {string} filePath - Absolute path to the component file
 * @param {Object} options - Options
 * @param {number} options.maxDepth - Max import resolution depth (default: 2)
 * @param {Set} options.visited - Set of already-visited files (to prevent cycles)
 * @returns {Object} Coverage result for this file
 */
export function checkTestIdCoverageForFile(filePath, options = {}) {
  const { maxDepth = 2, visited = new Set() } = options;

  if (!filePath || !fs.existsSync(filePath) || visited.has(filePath)) {
    return {
      filePath,
      totalInteractive: 0,
      withTestId: 0,
      coverage: 1, // No elements = 100% coverage (nothing to check)
      testIds: [],
      breakdown: {},
      childResults: [],
    };
  }

  visited.add(filePath);

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {
      filePath,
      totalInteractive: 0,
      withTestId: 0,
      coverage: 1,
      error: 'Could not read file',
      testIds: [],
      breakdown: {},
      childResults: [],
    };
  }

  const interactive = countInteractiveElements(source);
  const testIdCount = countTestIds(source);
  const testIds = extractTestIdValues(source);

  // Check child components if depth allows
  const childResults = [];
  if (maxDepth > 0) {
    const childImports = resolveLocalImports(filePath, source);
    for (const childPath of childImports) {
      const childResult = checkTestIdCoverageForFile(childPath, {
        maxDepth: maxDepth - 1,
        visited,
      });
      if (childResult.totalInteractive > 0) {
        childResults.push(childResult);
      }
    }
  }

  // Aggregate: this file + children
  const childInteractive = childResults.reduce((sum, c) => sum + c.totalInteractive, 0);
  const childTestIds = childResults.reduce((sum, c) => sum + c.withTestId, 0);

  const totalInteractive = interactive.total + childInteractive;
  const totalWithTestId = testIdCount + childTestIds;

  return {
    filePath,
    totalInteractive,
    withTestId: totalWithTestId,
    coverage: totalInteractive > 0 ? Math.round((totalWithTestId / totalInteractive) * 100) / 100 : 1,
    testIds,
    breakdown: interactive.counts,
    childResults: childResults.map(c => ({
      filePath: c.filePath,
      totalInteractive: c.totalInteractive,
      withTestId: c.withTestId,
      coverage: c.coverage,
    })),
    // Self-only stats (without children)
    self: {
      totalInteractive: interactive.total,
      withTestId: testIdCount,
      coverage: interactive.total > 0 ? Math.round((testIdCount / interactive.total) * 100) / 100 : 1,
    },
  };
}

/**
 * Check data-testid coverage for a single route entry
 *
 * @param {Object} routeEntry - Route entry from route catalog
 * @param {Object} options - Options
 * @returns {Object} Coverage result for this route
 */
export function checkTestIdCoverageForRoute(routeEntry, options = {}) {
  if (!routeEntry.componentFile) {
    return {
      route: routeEntry.fullPath || routeEntry.path,
      component: routeEntry.component,
      totalInteractive: 0,
      withTestId: 0,
      coverage: 1,
      status: 'no-component-file',
      testIds: [],
    };
  }

  const fileResult = checkTestIdCoverageForFile(routeEntry.componentFile, options);

  return {
    route: routeEntry.fullPath || routeEntry.path,
    component: routeEntry.component,
    componentFile: routeEntry.componentFile,
    totalInteractive: fileResult.totalInteractive,
    withTestId: fileResult.withTestId,
    coverage: fileResult.coverage,
    status: fileResult.coverage >= 0.8 ? 'good' : fileResult.coverage >= 0.5 ? 'warning' : 'critical',
    testIds: fileResult.testIds,
    breakdown: fileResult.breakdown,
    childCount: fileResult.childResults.length,
  };
}

/**
 * Check data-testid coverage across all routes in a route catalog
 *
 * @param {Object[]} routeCatalog - Flat array of route entries from buildRouteCatalog
 * @param {Object} options - Options
 * @param {number} options.maxDepth - Max import resolution depth (default: 2)
 * @returns {Object} Full coverage report
 */
export function checkTestIdCoverage(routeCatalog, options = {}) {
  const results = [];
  let totalInteractive = 0;
  let totalWithTestId = 0;
  let routesChecked = 0;
  let routesCritical = 0;
  let routesWarning = 0;
  let routesGood = 0;
  let routesSkipped = 0;

  for (const route of routeCatalog) {
    // Skip routes without component files
    if (!route.componentFile) {
      routesSkipped++;
      continue;
    }

    const result = checkTestIdCoverageForRoute(route, {
      maxDepth: options.maxDepth || 2,
      visited: new Set(), // Fresh visited set per route
    });

    results.push(result);
    totalInteractive += result.totalInteractive;
    totalWithTestId += result.withTestId;
    routesChecked++;

    if (result.status === 'critical') routesCritical++;
    else if (result.status === 'warning') routesWarning++;
    else routesGood++;
  }

  const overallCoverage = totalInteractive > 0
    ? Math.round((totalWithTestId / totalInteractive) * 100) / 100
    : 1;

  // Sort results: worst coverage first
  results.sort((a, b) => a.coverage - b.coverage);

  return {
    success: true,
    overallCoverage,
    totalInteractive,
    totalWithTestId,
    routesChecked,
    routesCritical,
    routesWarning,
    routesGood,
    routesSkipped,
    results,
    // Quick summary for state file
    routeResults: Object.fromEntries(
      results.map(r => [r.route, {
        totalInteractive: r.totalInteractive,
        withTestId: r.withTestId,
        coverage: r.coverage,
        status: r.status,
      }])
    ),
  };
}

export default {
  checkTestIdCoverage,
  checkTestIdCoverageForRoute,
  checkTestIdCoverageForFile,
};
