/**
 * Feature Audit - Truth Verifier
 *
 * Verifies 6 truth dimensions per feature by inspecting the codebase:
 * 1. UI Exists - Route + component file on disk
 * 2. Backend Exists - API endpoint in backend routers
 * 3. API Wired - Frontend references backend endpoint
 * 4. Data Persists - Database model/migration exists
 * 5. Permissions - Auth middleware on endpoint
 * 6. Error Handling - Error boundaries, try-catch patterns
 */

import fs from 'fs';
import path from 'path';

/**
 * Normalize feature name to keywords for fuzzy matching
 */
function toKeywords(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'add', 'create', 'implement', 'build', 'update', 'fix', 'with'].includes(w));
}

/**
 * Score how well a string matches feature keywords (0 to 1)
 */
function keywordMatchScore(text, keywords) {
  if (!text || keywords.length === 0) return 0;
  const lower = text.toLowerCase();
  const matched = keywords.filter(kw => lower.includes(kw));
  return matched.length / keywords.length;
}

/**
 * Search files in a directory for content matching keywords
 */
function searchFilesForKeywords(dirPath, keywords, extensions = ['.ts', '.tsx', '.js', '.jsx', '.py']) {
  const matches = [];
  if (!fs.existsSync(dirPath)) return matches;

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const score = keywordMatchScore(content, keywords);
          if (score > 0.3) {
            matches.push({ path: fullPath, score, filename: entry.name });
          }
        } catch {
          // File not readable
        }
      }
    }
  }

  walk(dirPath);
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Verify UI Exists - Check route catalog and component files
 */
function verifyUiExists(feature, routeCatalog, projectRoot) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '', route: null, component_file: null };

  // Check route catalog for matching routes
  if (routeCatalog && routeCatalog.length > 0) {
    for (const route of routeCatalog) {
      const routeScore = keywordMatchScore(route.fullPath + ' ' + (route.component || ''), keywords);
      if (routeScore > 0.3) {
        result.route = route.fullPath;
        result.component_file = route.componentFile;

        // Verify the component file actually exists on disk
        if (route.componentFile) {
          const absPath = path.isAbsolute(route.componentFile)
            ? route.componentFile
            : path.join(projectRoot, route.componentFile);
          if (fs.existsSync(absPath)) {
            result.verified = true;
            result.evidence = `Route "${route.fullPath}" found with component ${route.componentFile}`;
            return result;
          }
        }

        result.evidence = `Route "${route.fullPath}" found but component file not verified`;
        return result;
      }
    }
  }

  // Fallback: search src/ for matching component files
  const srcDir = path.join(projectRoot, 'src');
  const matches = searchFilesForKeywords(srcDir, keywords, ['.tsx', '.jsx', '.vue', '.svelte']);
  if (matches.length > 0) {
    result.verified = true;
    result.component_file = path.relative(projectRoot, matches[0].path);
    result.evidence = `Component file found: ${result.component_file}`;
    return result;
  }

  result.evidence = 'No matching UI component or route found';
  return result;
}

/**
 * Verify Backend Exists - Check for API endpoints
 */
function verifyBackendExists(feature, projectRoot, techStack) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '', endpoint: null, method: null };

  // Determine backend directories based on tech stack
  const backendDirs = [];
  const backendFramework = techStack?.backend?.framework || '';

  if (backendFramework.includes('fastapi') || backendFramework.includes('flask') || backendFramework.includes('django')) {
    backendDirs.push(
      path.join(projectRoot, 'backend', 'routers'),
      path.join(projectRoot, 'backend', 'routes'),
      path.join(projectRoot, 'backend', 'api'),
      path.join(projectRoot, 'backend', 'views'),
      path.join(projectRoot, 'app', 'routers'),
      path.join(projectRoot, 'app', 'api'),
    );
  }

  if (backendFramework.includes('express') || backendFramework.includes('nest') || backendFramework.includes('fastify')) {
    backendDirs.push(
      path.join(projectRoot, 'server', 'routes'),
      path.join(projectRoot, 'server', 'controllers'),
      path.join(projectRoot, 'routes'),
      path.join(projectRoot, 'api'),
      path.join(projectRoot, 'src', 'routes'),
      path.join(projectRoot, 'src', 'api'),
    );
  }

  // Also check common patterns if no tech stack detected
  if (backendDirs.length === 0) {
    backendDirs.push(
      path.join(projectRoot, 'backend'),
      path.join(projectRoot, 'server'),
      path.join(projectRoot, 'api'),
    );
  }

  // Search backend files for endpoint definitions
  const endpointPatterns = [
    // FastAPI
    /@(router|app)\.(get|post|put|patch|delete)\(/i,
    // Express
    /router\.(get|post|put|patch|delete)\(/i,
    // Django
    /path\(['"]([^'"]+)['"]/i,
    // NestJS
    /@(Get|Post|Put|Patch|Delete)\(/i,
  ];

  for (const dir of backendDirs) {
    const matches = searchFilesForKeywords(dir, keywords, ['.py', '.ts', '.js', '.tsx', '.jsx']);
    if (matches.length > 0) {
      const bestMatch = matches[0];
      try {
        const content = fs.readFileSync(bestMatch.path, 'utf8');
        for (const pattern of endpointPatterns) {
          const match = content.match(pattern);
          if (match) {
            result.verified = true;
            result.endpoint = bestMatch.filename;
            result.method = match[2] || match[1] || 'unknown';
            result.evidence = `API endpoint found in ${path.relative(projectRoot, bestMatch.path)}`;
            return result;
          }
        }
      } catch {
        // File not readable
      }

      result.evidence = `Backend file found (${path.relative(projectRoot, bestMatch.path)}) but no endpoint pattern detected`;
      return result;
    }
  }

  result.evidence = 'No matching backend endpoint found';
  return result;
}

/**
 * Verify API Wired - Frontend references backend endpoint
 */
function verifyApiWired(feature, routeCatalog, projectRoot) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '' };

  // Check route catalog apiCalls
  if (routeCatalog) {
    for (const route of routeCatalog) {
      const routeScore = keywordMatchScore(route.fullPath + ' ' + (route.component || ''), keywords);
      if (routeScore > 0.3 && route.apiCalls && route.apiCalls.length > 0) {
        result.verified = true;
        result.evidence = `Route "${route.fullPath}" has ${route.apiCalls.length} API call(s): ${route.apiCalls.slice(0, 3).join(', ')}`;
        return result;
      }
    }
  }

  // Fallback: search for fetch/axios patterns in related component files
  const srcDir = path.join(projectRoot, 'src');
  const matches = searchFilesForKeywords(srcDir, keywords, ['.tsx', '.jsx', '.ts', '.js']);
  if (matches.length > 0) {
    try {
      const content = fs.readFileSync(matches[0].path, 'utf8');
      const apiPatterns = [
        /fetch\s*\(\s*[`'"]/,
        /axios\.(get|post|put|patch|delete)\s*\(/,
        /api\.(get|post|put|patch|delete)\s*\(/,
        /useQuery|useMutation|useSWR/,
        /apiClient/i,
      ];
      for (const pattern of apiPatterns) {
        if (pattern.test(content)) {
          result.verified = true;
          result.evidence = `API call pattern found in ${path.relative(projectRoot, matches[0].path)}`;
          return result;
        }
      }
    } catch {
      // File not readable
    }
  }

  result.evidence = 'No API wiring found in frontend code';
  return result;
}

/**
 * Verify Data Persists - Database model/migration exists
 */
function verifyDataPersists(feature, projectRoot, techStack) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '' };

  const modelDirs = [
    path.join(projectRoot, 'backend', 'models'),
    path.join(projectRoot, 'backend', 'database', 'models'),
    path.join(projectRoot, 'prisma'),
    path.join(projectRoot, 'server', 'models'),
    path.join(projectRoot, 'src', 'models'),
    path.join(projectRoot, 'app', 'models'),
  ];

  // Check for model files
  for (const dir of modelDirs) {
    const matches = searchFilesForKeywords(dir, keywords, ['.py', '.ts', '.js', '.prisma']);
    if (matches.length > 0) {
      result.verified = true;
      result.evidence = `Database model found: ${path.relative(projectRoot, matches[0].path)}`;
      return result;
    }
  }

  // Check for Prisma schema
  const prismaSchema = path.join(projectRoot, 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaSchema)) {
    try {
      const content = fs.readFileSync(prismaSchema, 'utf8');
      if (keywordMatchScore(content, keywords) > 0.3) {
        result.verified = true;
        result.evidence = 'Matching model found in Prisma schema';
        return result;
      }
    } catch {
      // File not readable
    }
  }

  // Check for SQLAlchemy patterns
  const backendModels = path.join(projectRoot, 'backend', 'models');
  if (fs.existsSync(backendModels)) {
    const matches = searchFilesForKeywords(backendModels, keywords, ['.py']);
    if (matches.length > 0) {
      try {
        const content = fs.readFileSync(matches[0].path, 'utf8');
        if (/class\s+\w+.*Base\)|Column\(|relationship\(/i.test(content)) {
          result.verified = true;
          result.evidence = `SQLAlchemy model found: ${path.relative(projectRoot, matches[0].path)}`;
          return result;
        }
      } catch {
        // File not readable
      }
    }
  }

  result.evidence = 'No database model or migration found for this feature';
  return result;
}

/**
 * Verify Permissions Enforced - Auth middleware present
 */
function verifyPermissions(feature, projectRoot, techStack) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '' };

  const authPatterns = [
    // FastAPI
    /Depends\s*\(\s*(get_current_user|require_auth|verify_token)/i,
    // Express
    /(requireAuth|isAuthenticated|authMiddleware|passport\.authenticate)/i,
    // NestJS
    /@UseGuards\s*\(\s*(Auth|Jwt|Role)/i,
    // Django
    /@(login_required|permission_required)/i,
    // Generic
    /(authorize|protected|auth_required|verify_session)/i,
  ];

  // Search backend files
  const backendDirs = [
    path.join(projectRoot, 'backend'),
    path.join(projectRoot, 'server'),
    path.join(projectRoot, 'api'),
    path.join(projectRoot, 'src', 'api'),
  ];

  for (const dir of backendDirs) {
    const matches = searchFilesForKeywords(dir, keywords, ['.py', '.ts', '.js']);
    if (matches.length > 0) {
      try {
        const content = fs.readFileSync(matches[0].path, 'utf8');
        for (const pattern of authPatterns) {
          if (pattern.test(content)) {
            result.verified = true;
            result.evidence = `Auth middleware found in ${path.relative(projectRoot, matches[0].path)}`;
            return result;
          }
        }
      } catch {
        // File not readable
      }
    }
  }

  result.evidence = 'No authentication/authorization middleware found on related endpoints';
  return result;
}

/**
 * Verify Error Handling - Error boundaries, try-catch, error toasts
 */
function verifyErrorHandling(feature, routeCatalog, projectRoot) {
  const keywords = toKeywords(feature.name);
  const result = { verified: false, evidence: '' };

  const errorPatterns = [
    /ErrorBoundary/,
    /try\s*\{[\s\S]*?catch/,
    /\.catch\s*\(/,
    /onError|handleError|error\s*Toast|showError|toast\.error/i,
    /error\s*Message|errorState|setError/i,
  ];

  // Search in component files
  const srcDir = path.join(projectRoot, 'src');
  const matches = searchFilesForKeywords(srcDir, keywords, ['.tsx', '.jsx', '.ts', '.js', '.vue']);
  if (matches.length > 0) {
    try {
      const content = fs.readFileSync(matches[0].path, 'utf8');
      for (const pattern of errorPatterns) {
        if (pattern.test(content)) {
          result.verified = true;
          result.evidence = `Error handling found in ${path.relative(projectRoot, matches[0].path)}`;
          return result;
        }
      }
    } catch {
      // File not readable
    }
  }

  result.evidence = 'No error handling patterns found in related component files';
  return result;
}

/**
 * Check if a test file exists for this feature
 */
function checkTestExists(feature, projectRoot, testType) {
  const keywords = toKeywords(feature.name);
  const testDirs = testType === 'smoke'
    ? [
      path.join(projectRoot, 'tests', 'smoke'),
      path.join(projectRoot, 'e2e', 'smoke'),
      path.join(projectRoot, 'e2e'),
      path.join(projectRoot, 'tests', 'e2e'),
    ]
    : [
      path.join(projectRoot, 'tests', 'contracts'),
      path.join(projectRoot, 'tests', 'api'),
      path.join(projectRoot, 'tests', 'integration'),
    ];

  for (const dir of testDirs) {
    const matches = searchFilesForKeywords(dir, keywords, ['.ts', '.js', '.spec.ts', '.test.ts', '.spec.js', '.test.js']);
    if (matches.length > 0) {
      return {
        exists: true,
        file: path.relative(projectRoot, matches[0].path),
      };
    }
  }

  return { exists: false, file: null };
}

/**
 * Verify all 6 truth dimensions for a single feature
 *
 * @param {Object} feature - Feature from feature-mapper
 * @param {Object} config - Verification config
 * @param {string} config.projectRoot - Project root path
 * @param {Array} config.routeCatalog - Route catalog from dev-scan
 * @param {Object} config.techStack - Tech stack detection result
 * @returns {Object} Feature with truth_table and tests populated
 */
export function verifyFeature(feature, config) {
  const { projectRoot, routeCatalog, techStack } = config;

  // Verify all 6 dimensions
  feature.truth_table = {
    ui_exists: verifyUiExists(feature, routeCatalog, projectRoot),
    backend_exists: verifyBackendExists(feature, projectRoot, techStack),
    api_wired: verifyApiWired(feature, routeCatalog, projectRoot),
    data_persists: verifyDataPersists(feature, projectRoot, techStack),
    permissions: verifyPermissions(feature, projectRoot, techStack),
    error_handling: verifyErrorHandling(feature, routeCatalog, projectRoot),
  };

  // Check for existing tests
  const smokeTest = checkTestExists(feature, projectRoot, 'smoke');
  const contractTest = checkTestExists(feature, projectRoot, 'contract');

  feature.tests = {
    has_smoke_test: smokeTest.exists,
    has_contract_test: contractTest.exists,
    smoke_test_file: smokeTest.file,
    contract_test_file: contractTest.file,
  };

  return feature;
}

/**
 * Verify all features in a list
 */
export function verifyAllFeatures(features, config) {
  return features.map(feature => verifyFeature(feature, config));
}

export default {
  verifyFeature,
  verifyAllFeatures,
};
