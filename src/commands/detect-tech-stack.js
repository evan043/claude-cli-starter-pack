/**
 * Tech Stack Detection
 *
 * Auto-detects the project's technology stack by scanning:
 * - Package files (package.json, requirements.txt, Cargo.toml, etc.)
 * - Config files (vite.config.ts, next.config.js, etc.)
 * - Source directories and file patterns
 * - Git remote URLs
 * - Existing .claude configurations
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { createLogger } from '../utils/logger.js';

// Import from extracted modules
import { DETECTION_PATTERNS } from './tech-stack/patterns.js';
import {
  readPackageJson,
  readPythonRequirements,
  fileExists,
  hasPackages,
  detectPort,
  detectGitInfo,
  detectDefaultBranch,
  detectSelectors,
  detectTunnelConfig,
} from './tech-stack/detectors.js';
import {
  displayResults,
  displayHeader,
  createResultStructure,
  buildLocalUrls,
  createCommitConfig,
} from './tech-stack/formatters.js';

const log = createLogger('detect');

/**
 * Main detection function
 */
export async function detectTechStack(projectRoot, options = {}) {
  const spinner = options.silent ? null : ora('Detecting tech stack...').start();
  const result = createResultStructure(basename(projectRoot));

  // Read package.json
  const pkgJson = readPackageJson(projectRoot);
  const pythonPackages = readPythonRequirements(projectRoot);

  // --- FRONTEND DETECTION ---
  if (spinner) spinner.text = 'Detecting frontend framework...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.frontend)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.files) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.frontend.framework = framework;
      result._detected.push(`frontend.framework: ${framework}`);
      break;
    }
  }

  // Detect build tool
  for (const [tool, patterns] of Object.entries(DETECTION_PATTERNS.buildTool)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.frontend.buildTool = tool;
      result._detected.push(`frontend.buildTool: ${tool}`);
      break;
    }
  }

  // Detect state manager
  for (const [manager, patterns] of Object.entries(DETECTION_PATTERNS.stateManager)) {
    if (hasPackages(pkgJson, patterns.packages)) {
      result.frontend.stateManager = manager;
      result._detected.push(`frontend.stateManager: ${manager}`);
      break;
    }
  }

  // Detect frontend port
  result.frontend.port = detectPort(projectRoot, 'frontend');
  result._detected.push(`frontend.port: ${result.frontend.port}`);

  // Detect styling
  if (hasPackages(pkgJson, ['tailwindcss'])) {
    result.frontend.styling = 'tailwind';
  } else if (hasPackages(pkgJson, ['styled-components'])) {
    result.frontend.styling = 'styled-components';
  } else if (hasPackages(pkgJson, ['@emotion/react'])) {
    result.frontend.styling = 'emotion';
  }

  // --- BACKEND DETECTION ---
  if (spinner) spinner.text = 'Detecting backend framework...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.backend)) {
    const hasPkg = hasPackages(pkgJson, patterns.packages);
    const hasPyPkg = patterns.pythonPackages?.some((p) =>
      pythonPackages.includes(p)
    );
    const hasFiles = fileExists(projectRoot, patterns.files);

    if (hasPkg || hasPyPkg || hasFiles) {
      result.backend.framework = framework;
      result._detected.push(`backend.framework: ${framework}`);

      // Set language based on framework
      if (['fastapi', 'django', 'flask'].includes(framework)) {
        result.backend.language = 'python';
      } else if (['express', 'nestjs'].includes(framework)) {
        result.backend.language = 'node';
      } else if (framework === 'rails') {
        result.backend.language = 'ruby';
      } else if (framework === 'gin') {
        result.backend.language = 'go';
      }
      break;
    }
  }

  result.backend.port = detectPort(projectRoot, 'backend');
  result.backend.healthEndpoint = '/api/health';

  // --- DATABASE DETECTION ---
  if (spinner) spinner.text = 'Detecting database...';

  for (const [db, patterns] of Object.entries(DETECTION_PATTERNS.database)) {
    if (hasPackages(pkgJson, patterns.packages)) {
      result.database.primary = db;
      result._detected.push(`database.primary: ${db}`);
      break;
    }
  }

  // Detect ORM
  for (const [orm, patterns] of Object.entries(DETECTION_PATTERNS.orm)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.database.orm = orm;
      result._detected.push(`database.orm: ${orm}`);
      break;
    }
  }

  // --- TESTING DETECTION ---
  if (spinner) spinner.text = 'Detecting testing frameworks...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.e2eFramework)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.testing.e2e.framework = framework;
      result._detected.push(`testing.e2e.framework: ${framework}`);

      // Set config file
      if (patterns.configFiles) {
        for (const cfg of patterns.configFiles) {
          if (existsSync(join(projectRoot, cfg))) {
            result.testing.e2e.configFile = cfg;
            break;
          }
        }
      }
      break;
    }
  }

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.unitFramework)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.testing.unit.framework = framework;
      result._detected.push(`testing.unit.framework: ${framework}`);
      break;
    }
  }

  // Detect selectors
  result.testing.selectors = detectSelectors(projectRoot);

  // --- DEPLOYMENT DETECTION ---
  if (spinner) spinner.text = 'Detecting deployment platforms...';

  for (const [platform, patterns] of Object.entries(DETECTION_PATTERNS.deployment)) {
    if (fileExists(projectRoot, patterns.configFiles)) {
      // Determine if frontend or backend
      if (['vercel', 'netlify', 'cloudflare'].includes(platform)) {
        result.deployment.frontend.platform = platform;
        result._detected.push(`deployment.frontend.platform: ${platform}`);
      } else if (platform === 'railway') {
        result.deployment.backend.platform = platform;
        result._detected.push(`deployment.backend.platform: ${platform}`);
      }
    }
  }

  // --- DEV ENVIRONMENT ---
  if (spinner) spinner.text = 'Detecting dev environment...';

  // Detect package manager
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    result.devEnvironment.packageManager = 'pnpm';
  } else if (existsSync(join(projectRoot, 'yarn.lock'))) {
    result.devEnvironment.packageManager = 'yarn';
  } else if (existsSync(join(projectRoot, 'bun.lockb'))) {
    result.devEnvironment.packageManager = 'bun';
  } else if (existsSync(join(projectRoot, 'package-lock.json'))) {
    result.devEnvironment.packageManager = 'npm';
  } else if (existsSync(join(projectRoot, 'requirements.txt'))) {
    result.devEnvironment.packageManager = 'pip';
  } else if (existsSync(join(projectRoot, 'poetry.lock'))) {
    result.devEnvironment.packageManager = 'poetry';
  }

  // Detect tunnel
  result.devEnvironment.tunnel = detectTunnelConfig(projectRoot);

  // Detect container
  if (fileExists(projectRoot, ['Dockerfile', 'docker-compose.yml'])) {
    result.devEnvironment.container = 'docker';
  }

  // --- VERSION CONTROL ---
  if (spinner) spinner.text = 'Detecting version control...';

  const gitInfo = detectGitInfo(projectRoot);
  if (gitInfo) {
    result.versionControl = {
      ...gitInfo,
      defaultBranch: detectDefaultBranch(projectRoot),
      projectBoard: { type: 'none' },
    };
    result._detected.push(`versionControl: ${gitInfo.provider}/${gitInfo.owner}/${gitInfo.repo}`);
  }

  // --- COMMIT CONFIG ---
  result.commit = createCommitConfig();

  // --- BUILD URLs ---
  result.urls.local = buildLocalUrls(result);

  if (spinner) spinner.succeed('Tech stack detection complete');

  return result;
}

/**
 * Run detection and output results
 */
export async function runDetection(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  displayHeader(projectRoot);

  const result = await detectTechStack(projectRoot, options);

  // Display results
  displayResults(result);

  return result;
}

export default { detectTechStack, runDetection };
