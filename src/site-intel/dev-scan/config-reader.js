/**
 * Smart Site Intel - Config Reader
 *
 * Reads tech-stack.json, .env credentials, and playwright.config
 * to auto-configure dev scanning for the developer's own application.
 */

import fs from 'fs';
import path from 'path';

/**
 * Locate tech-stack.json in the target project
 * Searches: .claude/config/tech-stack.json, .claude/tech-stack.json, tech-stack.json
 */
function findTechStack(projectRoot) {
  const candidates = [
    path.join(projectRoot, '.claude', 'config', 'tech-stack.json'),
    path.join(projectRoot, '.claude', 'tech-stack.json'),
    path.join(projectRoot, 'tech-stack.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return null;
}

/**
 * Extract baseURL from playwright.config.ts/.js via regex
 */
function extractPlaywrightBaseUrl(projectRoot) {
  const candidates = [
    'playwright.config.ts',
    'playwright.config.js',
    'apps/web/playwright.config.ts',
    'apps/web/playwright.config.js',
  ];
  for (const rel of candidates) {
    const fp = path.join(projectRoot, rel);
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      // Match: baseURL: 'http://...' or baseURL: "http://..."
      const match = content.match(/baseURL\s*:\s*['"`]([^'"`]+)['"`]/);
      if (match) return match[1];
      // Also check process.env fallback pattern: process.env.BASE_URL || 'http://...'
      const envMatch = content.match(/process\.env\.\w+\s*\|\|\s*['"`]([^'"`]+)['"`]/);
      if (envMatch) return envMatch[1];
    }
  }
  return null;
}

/**
 * Read .env file and parse key-value pairs
 */
function readEnvFile(projectRoot) {
  const envPaths = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const env = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
          let value = match[2];
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[match[1]] = value;
        }
      }
      return env;
    }
  }
  return {};
}

/**
 * Find the routes file in the project
 */
function findRoutesFile(projectRoot, techStack) {
  // Check tech-stack.json first
  if (techStack?.frontend?.routesFile) {
    const fp = path.join(projectRoot, techStack.frontend.routesFile);
    if (fs.existsSync(fp)) return fp;
  }

  // Auto-detect common locations
  const candidates = [
    'src/app/routes.tsx',
    'src/routes.tsx',
    'src/router.tsx',
    'src/App.tsx',
    'apps/web/src/app/routes.tsx',
    'apps/web/src/routes.tsx',
    'src/app/router.tsx',
    'src/pages/_app.tsx',
  ];
  for (const rel of candidates) {
    const fp = path.join(projectRoot, rel);
    if (fs.existsSync(fp)) {
      // Verify it contains route definitions
      const content = fs.readFileSync(fp, 'utf8');
      if (content.includes('createBrowserRouter') ||
          content.includes('createHashRouter') ||
          content.includes('<Route') ||
          content.includes('<Routes>')) {
        return fp;
      }
    }
  }
  return null;
}

/**
 * Read and normalize all project configuration into a unified dev scan config
 *
 * @param {string} projectRoot - Absolute path to the target project root
 * @returns {Object} Normalized dev scan configuration
 */
export function readDevScanConfig(projectRoot) {
  const techStack = findTechStack(projectRoot);
  const env = readEnvFile(projectRoot);
  const playwrightBaseUrl = extractPlaywrightBaseUrl(projectRoot);

  // Determine base URL (priority: playwright config > tech-stack urls > default)
  const baseUrl = playwrightBaseUrl
    || techStack?.urls?.local
    || techStack?.devEnvironment?.tunnel?.url
    || `http://localhost:${techStack?.frontend?.port || 5173}`;

  // Determine routes file path
  const routesFile = findRoutesFile(projectRoot, techStack);

  // Determine src directory for route parsing
  const srcDir = routesFile
    ? path.relative(projectRoot, path.dirname(routesFile)).split(path.sep)[0] || 'src'
    : 'src';

  // Login selectors from tech-stack testing config
  const selectors = techStack?.testing?.selectors || {
    strategy: 'data-testid',
    username: '[data-testid="username-input"]',
    password: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-submit"]',
    loginSuccess: '[data-testid="dashboard"]',
  };

  // Credentials from .env
  const usernameVar = techStack?.testing?.credentials?.usernameEnvVar || 'TEST_USER_USERNAME';
  const passwordVar = techStack?.testing?.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD';
  const credentials = {
    username: env[usernameVar] || process.env[usernameVar] || null,
    password: env[passwordVar] || process.env[passwordVar] || null,
    usernameVar,
    passwordVar,
    hasCredentials: !!(env[usernameVar] || process.env[usernameVar]),
  };

  // Framework detection
  const framework = techStack?.frontend?.framework || 'react';
  const routerFramework = framework.includes('react') ? 'react-router-v6' : framework;

  // State file path
  const stateFilePath = path.join(projectRoot, '.claude', 'site-intel', 'dev-app', 'site-intel-state.json');

  return {
    projectRoot,
    baseUrl,
    routesFile,
    srcDir,
    framework,
    routerFramework,
    selectorStrategy: selectors.strategy || 'data-testid',
    loginSelectors: {
      username: selectors.username,
      password: selectors.password,
      submit: selectors.loginButton,
      successIndicator: selectors.loginSuccess,
    },
    credentials,
    lighthouseEnabled: true,
    axeEnabled: true,
    stateFilePath,
    techStack,
    // Scan behavior
    maxPagesPerRoute: 1,
    timeout: 30000,
    viewport: { width: 1280, height: 720 },
    fullScanThreshold: 0.3, // If >30% routes affected, do full scan
  };
}

/**
 * Validate that the config has enough info to run a dev scan
 */
export function validateConfig(config) {
  const issues = [];

  if (!config.routesFile) {
    issues.push('No routes file found. Ensure your project has a React Router config file.');
  }
  if (!config.baseUrl) {
    issues.push('No base URL configured. Set it in playwright.config or tech-stack.json.');
  }
  if (!config.credentials.hasCredentials) {
    issues.push(`No test credentials found. Set ${config.credentials.usernameVar} and ${config.credentials.passwordVar} in .env (optional for public routes).`);
  }

  return {
    valid: issues.length === 0 || (issues.length === 1 && !config.credentials.hasCredentials),
    issues,
    warnings: !config.credentials.hasCredentials
      ? ['No credentials configured - only public routes will be scanned']
      : [],
  };
}

export default { readDevScanConfig, validateConfig };
