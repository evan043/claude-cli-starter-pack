/**
 * Smart Site Intel - Route Catalog
 *
 * Builds a flat route catalog from the project's router definitions,
 * with a reverse file→route map for git-diff lookups.
 */

import path from 'path';
import { parseRoutes } from '../discovery/route-parser.js';

/**
 * Normalize a file path for cross-platform comparison
 * Git diff uses forward slashes; route-parser may use backslashes on Windows
 */
function normalizePath(filePath) {
  if (!filePath) return '';
  return filePath.replace(/\\/g, '/').toLowerCase();
}

/**
 * Flatten nested route tree into a flat array
 * Concatenates parent paths to build full route paths
 */
function flattenRoutes(routes, parentPath = '') {
  const flat = [];

  for (const route of routes) {
    const routePath = route.path || '';

    // Build full path
    let fullPath;
    if (routePath.startsWith('/')) {
      fullPath = routePath;
    } else if (parentPath && routePath) {
      fullPath = `${parentPath.replace(/\/$/, '')}/${routePath}`;
    } else if (parentPath) {
      fullPath = parentPath;
    } else {
      fullPath = `/${routePath}`;
    }

    // Clean up double slashes
    fullPath = fullPath.replace(/\/+/g, '/') || '/';

    flat.push({
      path: routePath,
      fullPath,
      component: route.component || null,
      componentFile: route.componentFile || null,
      hooks: route.hooks || [],
      apiCalls: route.apiCalls || [],
      hasChildren: (route.children || []).length > 0,
      childPaths: (route.children || []).map(c => c.path).filter(Boolean),
    });

    // Recurse into children
    if (route.children && route.children.length > 0) {
      flat.push(...flattenRoutes(route.children, fullPath));
    }
  }

  return flat;
}

/**
 * Build a reverse map: normalized file path → route full paths
 * Used by git-diff to determine which routes are affected by file changes
 */
function buildReverseMap(flatRoutes, projectRoot) {
  const reverseMap = new Map();

  const addMapping = (filePath, routeFullPath) => {
    if (!filePath) return;
    const normalized = normalizePath(
      path.isAbsolute(filePath)
        ? path.relative(projectRoot, filePath)
        : filePath
    );
    if (!reverseMap.has(normalized)) {
      reverseMap.set(normalized, new Set());
    }
    reverseMap.get(normalized).add(routeFullPath);
  };

  for (const route of flatRoutes) {
    if (route.componentFile) {
      addMapping(route.componentFile, route.fullPath);
    }
  }

  // Convert Sets to arrays for serialization
  const result = new Map();
  for (const [file, routes] of reverseMap) {
    result.set(file, Array.from(routes));
  }

  return result;
}

/**
 * Build a complete route catalog for the project
 *
 * @param {string} projectRoot - Absolute path to the target project root
 * @param {Object} options - Options
 * @param {string} options.srcDir - Source directory to scan (default: 'src')
 * @param {string} options.framework - Router framework (default: 'react-router-v6')
 * @returns {Promise<Object>} Route catalog with flat routes and reverse map
 */
export async function buildRouteCatalog(projectRoot, options = {}) {
  const {
    srcDir = 'src',
    framework = 'react-router-v6',
  } = options;

  // Use the existing parseRoutes from route-parser.js
  const parseResult = await parseRoutes(projectRoot, {
    framework,
    srcDir,
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  });

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
      routes: [],
      reverseMap: new Map(),
      summary: { totalRoutes: 0, totalComponents: 0, totalHooks: 0, totalApiCalls: 0 },
    };
  }

  // Flatten the nested route tree
  const flatRoutes = flattenRoutes(parseResult.routes);

  // Build reverse file→route map
  const reverseMap = buildReverseMap(flatRoutes, projectRoot);

  // Calculate summary
  const summary = {
    totalRoutes: flatRoutes.length,
    totalComponents: flatRoutes.filter(r => r.component).length,
    totalWithFiles: flatRoutes.filter(r => r.componentFile).length,
    totalHooks: flatRoutes.reduce((sum, r) => sum + r.hooks.length, 0),
    totalApiCalls: flatRoutes.reduce((sum, r) => sum + r.apiCalls.length, 0),
    filesInReverseMap: reverseMap.size,
  };

  return {
    success: true,
    routes: flatRoutes,
    reverseMap,
    summary,
    framework: parseResult.framework,
  };
}

/**
 * Given a list of changed files, determine which routes are affected
 *
 * @param {Map} reverseMap - File→route reverse map from buildRouteCatalog
 * @param {string[]} changedFiles - List of changed file paths (relative to project root)
 * @param {Object} options - Options
 * @param {string} options.routesFile - Path to the main routes file (triggers full scan if changed)
 * @param {number} options.totalRoutes - Total number of routes (for threshold calculation)
 * @param {number} options.fullScanThreshold - Percentage threshold to trigger full scan (default: 0.3)
 * @returns {Object} Affected routes info
 */
export function getAffectedRoutes(reverseMap, changedFiles, options = {}) {
  const {
    routesFile = '',
    totalRoutes = 0,
    fullScanThreshold = 0.3,
  } = options;

  const affectedRoutes = new Set();
  const changeMapping = new Map(); // route → [files that changed]
  let isFullScanNeeded = false;

  // Check if the routes file itself changed (structural change = full scan)
  const normalizedRoutesFile = normalizePath(routesFile);

  for (const file of changedFiles) {
    const normalized = normalizePath(file);

    // Routes file changed = full scan
    if (normalizedRoutesFile && normalized.includes(normalizedRoutesFile)) {
      isFullScanNeeded = true;
      break;
    }

    // Check direct mapping
    const routes = reverseMap.get(normalized);
    if (routes) {
      for (const route of routes) {
        affectedRoutes.add(route);
        if (!changeMapping.has(route)) {
          changeMapping.set(route, []);
        }
        changeMapping.get(route).push(file);
      }
      continue;
    }

    // Check partial path matches (for files in same directory as components)
    for (const [mapFile, mapRoutes] of reverseMap) {
      if (normalized.includes(path.dirname(mapFile)) && path.dirname(mapFile) !== '.') {
        for (const route of mapRoutes) {
          affectedRoutes.add(route);
          if (!changeMapping.has(route)) {
            changeMapping.set(route, []);
          }
          changeMapping.get(route).push(file);
        }
      }
    }

    // Check if it's a shared/common file (affects all routes)
    if (normalized.includes('/shared/') ||
        normalized.includes('/common/') ||
        normalized.includes('/utils/') ||
        normalized.includes('/hooks/') ||
        normalized.includes('/store/') ||
        normalized.includes('/stores/')) {
      // Mark as broad change but don't trigger full scan for every shared file
      // Only if multiple shared files changed
    }
  }

  // Check threshold: if too many routes affected, promote to full scan
  if (!isFullScanNeeded && totalRoutes > 0) {
    const affectedRatio = affectedRoutes.size / totalRoutes;
    if (affectedRatio > fullScanThreshold) {
      isFullScanNeeded = true;
    }
  }

  return {
    affectedRoutes: Array.from(affectedRoutes),
    isFullScanNeeded,
    changeMapping: Object.fromEntries(changeMapping),
    totalAffected: affectedRoutes.size,
    totalChanged: changedFiles.length,
  };
}

export default { buildRouteCatalog, getAffectedRoutes };
