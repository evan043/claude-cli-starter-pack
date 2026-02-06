/**
 * Documentation Generator
 *
 * Generates all phased development documentation:
 * - PROGRESS.json
 * - EXECUTIVE_SUMMARY.md
 * - API specifications
 * - RAG execution agent
 * - Interactive command
 * - Enforcement hooks
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - docs-gen/github-issue.js - GitHub issue creation with phase/task breakdown
 * - docs-gen/backend-config.js - Backend config generation (middleware, DB, API)
 * - docs-gen/l2-integration.js - L2 exploration integration and PROGRESS updates
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  generateProgressJson,
  generateExecutiveSummary,
  generateMiddlewareSpec,
  generateApiEndpoints,
  generateDatabaseSchema,
  generateDeploymentConfig,
  generatePhaseExecutorAgent,
  generatePhaseDevCommand,
  generateTestDefinitions,
  generatePhaseDevEnforcerHook,
} from '../../agents/phase-dev-templates.js';

/**
 * Load agent registry if available
 */
function loadAgentRegistry(projectRoot = process.cwd()) {
  const registryPath = join(projectRoot, '.claude', 'config', 'agents.json');
  if (!existsSync(registryPath)) {
    return null;
  }
  try {
    const content = readFileSync(registryPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Generate all documentation for a phased development plan
 *
 * @param {Object} config - Project configuration
 * @param {Array} enhancements - Enabled enhancements
 * @returns {Object} Generation results
 */
export async function generatePhaseDevDocumentation(config, enhancements = []) {
  const spinner = ora('Generating documentation...').start();
  const results = { files: [], errors: [] };

  const { projectSlug } = config;
  const cwd = process.cwd();

  const agentRegistry = loadAgentRegistry(cwd);
  if (agentRegistry) {
    spinner.text = 'Agent registry found - enabling agent assignments...';
  }

  const docsDir = join(cwd, '.claude', 'phase-dev', projectSlug);
  const agentsDir = join(cwd, '.claude', 'agents');
  const commandsDir = join(cwd, '.claude', 'commands');
  const hooksDir = join(cwd, '.claude', 'hooks', 'tools');

  [docsDir, agentsDir, commandsDir, hooksDir].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  try {
    spinner.text = 'Creating PROGRESS.json...';
    const progressPath = join(docsDir, 'PROGRESS.json');
    const progressContent = generateProgressJson({
      ...config,
      enhancements,
      agentRegistry,
      parentContext: config.parentContext || null,
    });
    writeFileSync(progressPath, progressContent, 'utf8');
    results.files.push({ name: 'PROGRESS.json', path: progressPath });

    spinner.text = 'Creating EXECUTIVE_SUMMARY.md...';
    const summaryPath = join(docsDir, 'EXECUTIVE_SUMMARY.md');
    const summaryContent = generateExecutiveSummary(config);
    writeFileSync(summaryPath, summaryContent, 'utf8');
    results.files.push({ name: 'EXECUTIVE_SUMMARY.md', path: summaryPath });

    if (config.architecture?.backend !== 'none') {
      spinner.text = 'Creating API specifications...';

      const middlewarePath = join(docsDir, 'MIDDLEWARE_SPEC.md');
      writeFileSync(middlewarePath, generateMiddlewareSpec(config), 'utf8');
      results.files.push({ name: 'MIDDLEWARE_SPEC.md', path: middlewarePath });

      const apiPath = join(docsDir, 'API_ENDPOINTS.md');
      writeFileSync(apiPath, generateApiEndpoints(config), 'utf8');
      results.files.push({ name: 'API_ENDPOINTS.md', path: apiPath });

      const schemaPath = join(docsDir, 'DATABASE_SCHEMA.md');
      writeFileSync(schemaPath, generateDatabaseSchema(config), 'utf8');
      results.files.push({ name: 'DATABASE_SCHEMA.md', path: schemaPath });

      const deployPath = join(docsDir, 'DEPLOYMENT_CONFIG.md');
      writeFileSync(deployPath, generateDeploymentConfig(config), 'utf8');
      results.files.push({ name: 'DEPLOYMENT_CONFIG.md', path: deployPath });
    }

    spinner.text = 'Creating phase executor agent...';
    const agentPath = join(agentsDir, `${projectSlug}-phase-executor-agent.md`);
    const agentContent = generatePhaseExecutorAgent(config);
    writeFileSync(agentPath, agentContent, 'utf8');
    results.files.push({
      name: `${projectSlug}-phase-executor-agent.md`,
      path: agentPath,
    });

    spinner.text = 'Creating slash command...';
    const commandPath = join(commandsDir, `phase-dev-${projectSlug}.md`);
    const commandContent = generatePhaseDevCommand(config);
    writeFileSync(commandPath, commandContent, 'utf8');
    results.files.push({
      name: `phase-dev-${projectSlug}.md`,
      path: commandPath,
    });

    if (enhancements.includes('testing')) {
      spinner.text = 'Creating test definitions...';
      const testPath = join(docsDir, 'TEST_DEFINITIONS.json');
      const testContent = generateTestDefinitions(config);
      writeFileSync(testPath, testContent, 'utf8');
      results.files.push({ name: 'TEST_DEFINITIONS.json', path: testPath });
    }

    if (enhancements.includes('hooks')) {
      spinner.text = 'Creating enforcement hook...';
      const hookPath = join(hooksDir, `${projectSlug}-enforcer.js`);
      const hookContent = generatePhaseDevEnforcerHook(config);
      writeFileSync(hookPath, hookContent, 'utf8');
      results.files.push({
        name: `${projectSlug}-enforcer.js`,
        path: hookPath,
      });
    }

    spinner.succeed(`Generated ${results.files.length} files`);
  } catch (error) {
    spinner.fail('Error generating documentation');
    results.errors.push(error.message);
    throw error;
  }

  return results;
}

/**
 * Display generation results
 */
export function displayGenerationResults(results) {
  console.log('');
  console.log(chalk.green.bold('\u{1f4c1} Generated Files:'));
  console.log('');

  results.files.forEach((file) => {
    const relativePath = file.path.replace(process.cwd(), '.');
    console.log(`  ${chalk.green('\u2713')} ${file.name}`);
    console.log(`    ${chalk.dim(relativePath)}`);
  });

  if (results.errors.length > 0) {
    console.log('');
    console.log(chalk.red.bold('\u26a0\ufe0f Errors:'));
    results.errors.forEach((err) => {
      console.log(`  ${chalk.red('\u2717')} ${err}`);
    });
  }

  console.log('');
}

/**
 * Create a git checkpoint before generation
 */
export async function createGitCheckpoint(projectSlug) {
  const spinner = ora('Creating git checkpoint...').start();

  try {
    const { execSync } = await import('child_process');

    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      spinner.info('Not a git repository, skipping checkpoint');
      return null;
    }

    const status = execSync('git status --porcelain', {
      encoding: 'utf8',
    }).trim();

    if (status) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const stashName = `gtask-phase-dev-${projectSlug}-${timestamp}`;

      execSync(`git stash push -m "${stashName}"`, { stdio: 'ignore' });
      spinner.succeed(`Created checkpoint: ${stashName}`);

      return stashName;
    } else {
      spinner.info('No uncommitted changes to checkpoint');
      return null;
    }
  } catch (error) {
    spinner.warn(`Checkpoint skipped: ${error.message}`);
    return null;
  }
}

// Re-export submodule functions
export { generateBackendConfig } from './docs-gen/backend-config.js';
export { createPhaseDevGitHubIssue } from './docs-gen/github-issue.js';
export { generatePhaseDevDocumentationWithL2, updateProgressWithExploration } from './docs-gen/l2-integration.js';
