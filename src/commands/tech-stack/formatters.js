/**
 * Output Formatting for Tech Stack Detection
 *
 * Contains functions for displaying detection results in a formatted,
 * user-friendly manner.
 */

import chalk from 'chalk';

/**
 * Display detection results in formatted output
 * @param {object} result - The detection result object
 */
export function displayResults(result) {
  console.log(chalk.green('\n✓ Detected Technologies:\n'));

  if (result.frontend.framework) {
    console.log(chalk.white(`  Frontend: ${chalk.cyan(result.frontend.framework)}`));
    if (result.frontend.buildTool) {
      console.log(chalk.dim(`    Build: ${result.frontend.buildTool}`));
    }
    if (result.frontend.stateManager) {
      console.log(chalk.dim(`    State: ${result.frontend.stateManager}`));
    }
    console.log(chalk.dim(`    Port: ${result.frontend.port}`));
  }

  if (result.backend.framework) {
    console.log(chalk.white(`  Backend: ${chalk.cyan(result.backend.framework)} (${result.backend.language})`));
    console.log(chalk.dim(`    Port: ${result.backend.port}`));
  }

  if (result.database.primary) {
    console.log(chalk.white(`  Database: ${chalk.cyan(result.database.primary)}`));
    if (result.database.orm) {
      console.log(chalk.dim(`    ORM: ${result.database.orm}`));
    }
  }

  if (result.testing.e2e.framework) {
    console.log(chalk.white(`  E2E Tests: ${chalk.cyan(result.testing.e2e.framework)}`));
  }

  if (result.testing.unit.framework) {
    console.log(chalk.white(`  Unit Tests: ${chalk.cyan(result.testing.unit.framework)}`));
  }

  if (result.versionControl.provider) {
    console.log(chalk.white(`  Git: ${chalk.cyan(`${result.versionControl.owner}/${result.versionControl.repo}`)}`));
  }

  if (result.devEnvironment.packageManager) {
    console.log(chalk.white(`  Package Manager: ${chalk.cyan(result.devEnvironment.packageManager)}`));
  }

  console.log('');
}

/**
 * Display detection header
 * @param {string} projectRoot - The project root path
 */
export function displayHeader(projectRoot) {
  console.log(chalk.cyan('\n📦 Tech Stack Detection\n'));
  console.log(chalk.dim(`Project: ${projectRoot}\n`));
}

/**
 * Create initial result structure
 * @param {string} projectName - The project name
 * @returns {object} Initial result structure
 */
export function createResultStructure(projectName) {
  return {
    version: '1.0.0',
    project: {
      name: projectName,
      rootPath: '.',
    },
    frontend: {},
    backend: {},
    database: {},
    mobile: {},
    deployment: { frontend: {}, backend: {} },
    devEnvironment: {},
    testing: { e2e: {}, unit: {}, selectors: {}, credentials: {} },
    versionControl: {},
    urls: { local: {}, tunnel: {}, production: {} },
    _detected: [], // Track what was auto-detected
  };
}

/**
 * Build local URLs from detected ports
 * @param {object} result - The result object with port info
 * @returns {object} URLs object
 */
export function buildLocalUrls(result) {
  return {
    frontend: `http://localhost:${result.frontend.port || 5173}`,
    backend: `http://localhost:${result.backend.port || 8000}`,
    api: `http://localhost:${result.backend.port || 8000}/api`,
  };
}

/**
 * Create default commit configuration
 * @returns {object} Commit configuration
 */
export function createCommitConfig() {
  return {
    coAuthors: {
      enabled: false,
      authors: [],
    },
  };
}

export default {
  displayResults,
  displayHeader,
  createResultStructure,
  buildLocalUrls,
  createCommitConfig,
};
