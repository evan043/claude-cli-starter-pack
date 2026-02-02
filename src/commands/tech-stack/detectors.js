/**
 * Detection Algorithms for Tech Stack Detection
 *
 * Contains utility functions and detection algorithms for identifying
 * technologies based on file presence, package dependencies, and config files.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Read and parse package.json
 */
export function readPackageJson(projectRoot) {
  const pkgPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read Python requirements
 */
export function readPythonRequirements(projectRoot) {
  const files = ['requirements.txt', 'pyproject.toml', 'Pipfile'];
  const packages = [];

  for (const file of files) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      // Extract package names (simplified)
      const matches = content.match(/^[a-zA-Z][a-zA-Z0-9_-]*/gm);
      if (matches) packages.push(...matches);
    }
  }

  return packages;
}

/**
 * Check if any files match patterns
 */
export function fileExists(projectRoot, patterns) {
  if (!patterns) return false;

  for (const pattern of patterns) {
    const filePath = join(projectRoot, pattern);
    if (existsSync(filePath)) return true;
  }
  return false;
}

/**
 * Check if packages are installed
 */
export function hasPackages(pkgJson, packages) {
  if (!pkgJson || !packages) return false;

  const allDeps = {
    ...(pkgJson.dependencies || {}),
    ...(pkgJson.devDependencies || {}),
  };

  return packages.some((pkg) => allDeps[pkg]);
}

/**
 * Detect port from various config files
 */
export function detectPort(projectRoot, type) {
  // Check vite.config.ts/js
  const viteConfigs = ['vite.config.ts', 'vite.config.js'];
  for (const config of viteConfigs) {
    const configPath = join(projectRoot, config);
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf8');
      const portMatch = content.match(/port:\s*(\d+)/);
      if (portMatch) return parseInt(portMatch[1]);
    }
  }

  // Check package.json scripts
  const pkgJson = readPackageJson(projectRoot);
  if (pkgJson?.scripts?.dev) {
    const portMatch = pkgJson.scripts.dev.match(/--port[=\s]+(\d+)/);
    if (portMatch) return parseInt(portMatch[1]);
  }

  // Default ports
  return type === 'frontend' ? 5173 : 8000;
}

/**
 * Detect Git remote info
 */
export function detectGitInfo(projectRoot) {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    // Parse GitHub URL
    const githubMatch = remoteUrl.match(
      /github\.com[:/]([^/]+)\/([^/.]+)/
    );
    if (githubMatch) {
      return {
        provider: 'github',
        owner: githubMatch[1],
        repo: githubMatch[2].replace('.git', ''),
      };
    }

    // Parse GitLab URL
    const gitlabMatch = remoteUrl.match(
      /gitlab\.com[:/]([^/]+)\/([^/.]+)/
    );
    if (gitlabMatch) {
      return {
        provider: 'gitlab',
        owner: gitlabMatch[1],
        repo: gitlabMatch[2].replace('.git', ''),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect default branch
 */
export function detectDefaultBranch(projectRoot) {
  try {
    // Try to get from git
    const branch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branch.replace('refs/remotes/origin/', '');
  } catch {
    // Check if main or master exists
    try {
      execSync('git rev-parse --verify main', {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return 'main';
    } catch {
      return 'master';
    }
  }
}

/**
 * Detect selectors from existing test files
 */
export function detectSelectors(projectRoot) {
  const testDirs = ['tests', 'test', 'e2e', '__tests__', 'playwright'];
  const defaultSelectors = {
    strategy: 'data-testid',
    username: '[data-testid="username-input"]',
    password: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-submit"]',
    loginSuccess: '[data-testid="dashboard"]',
  };

  // Scan for existing test files
  for (const dir of testDirs) {
    const testDir = join(projectRoot, dir);
    if (!existsSync(testDir)) continue;

    try {
      const files = readdirSync(testDir, { recursive: true });
      for (const file of files) {
        if (!file.toString().match(/\.(ts|js|spec|test)/)) continue;

        const filePath = join(testDir, file.toString());
        if (!statSync(filePath).isFile()) continue;

        const content = readFileSync(filePath, 'utf8');

        // Look for data-testid patterns
        const testIdMatch = content.match(
          /\[data-testid=["']([^"']+)["']\]/
        );
        if (testIdMatch) {
          defaultSelectors.strategy = 'data-testid';
          // Try to find specific patterns
          const usernameMatch = content.match(
            /\[data-testid=["']([^"']*(?:user|login|email)[^"']*)["']\]/i
          );
          const passwordMatch = content.match(
            /\[data-testid=["']([^"']*(?:pass|pwd)[^"']*)["']\]/i
          );
          const submitMatch = content.match(
            /\[data-testid=["']([^"']*(?:submit|login|signin)[^"']*)["']\]/i
          );

          if (usernameMatch) defaultSelectors.username = `[data-testid="${usernameMatch[1]}"]`;
          if (passwordMatch) defaultSelectors.password = `[data-testid="${passwordMatch[1]}"]`;
          if (submitMatch) defaultSelectors.loginButton = `[data-testid="${submitMatch[1]}"]`;

          return defaultSelectors;
        }

        // Look for name attribute patterns
        const nameMatch = content.match(/name=["'](\w+)["']/);
        if (nameMatch) {
          defaultSelectors.strategy = 'name';
        }
      }
    } catch {
      // Continue if directory scan fails
    }
  }

  return defaultSelectors;
}

/**
 * Detect existing ngrok or tunnel configuration
 */
export function detectTunnelConfig(projectRoot) {
  // Check for ngrok.yml
  const ngrokConfig = join(projectRoot, 'ngrok.yml');
  if (existsSync(ngrokConfig)) {
    const content = readFileSync(ngrokConfig, 'utf8');
    const subdomainMatch = content.match(/subdomain:\s*(\S+)/);
    return {
      service: 'ngrok',
      subdomain: subdomainMatch?.[1] || null,
      startCommand: 'ngrok http {{FRONTEND_PORT}}',
      adminPort: 4040,
    };
  }

  // Check for localtunnel in package.json
  const pkgJson = readPackageJson(projectRoot);
  if (pkgJson?.devDependencies?.localtunnel) {
    return {
      service: 'localtunnel',
      startCommand: 'lt --port {{FRONTEND_PORT}}',
    };
  }

  return {
    service: 'none',
    url: null,
    subdomain: null,
  };
}

export default {
  readPackageJson,
  readPythonRequirements,
  fileExists,
  hasPackages,
  detectPort,
  detectGitInfo,
  detectDefaultBranch,
  detectSelectors,
  detectTunnelConfig,
};
