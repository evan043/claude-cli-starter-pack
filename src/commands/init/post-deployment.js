/**
 * Post-Deployment Setup
 * Handles INDEX.md, README.md, tech-stack.json, registry, and agent generation
 */

import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { safeWriteJson } from '../../utils/file-ops.js';
import { registerProject } from '../../utils/global-registry.js';
import { getVersion } from '../../utils.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('init:post-deployment');

/**
 * Generate INDEX.md and README.md
 * @param {string} commandsDir - Commands directory
 * @param {Array} installed - Installed command names
 * @param {string} projectName - Project name
 * @param {Function} generateIndexFile - Generator function
 * @param {Function} generateReadmeFile - Generator function
 */
export function generateDocumentation(commandsDir, installed, projectName, generateIndexFile, generateReadmeFile) {
  const indexPath = join(commandsDir, 'INDEX.md');
  const indexContent = generateIndexFile(installed, projectName);
  writeFileSync(indexPath, indexContent, 'utf8');

  const readmePath = join(commandsDir, 'README.md');
  const readmeContent = generateReadmeFile(installed, projectName);
  writeFileSync(readmePath, readmeContent, 'utf8');
}

/**
 * Generate tech-stack.json with enabled features
 * @param {string} claudeDir - .claude directory
 * @param {string} projectName - Project name
 * @param {Array} selectedFeatures - Selected feature names
 * @param {Array} featuresRequiringConfig - Features needing config
 * @param {Object} deployment - Deployment metadata
 */
export function generateTechStack(claudeDir, projectName, selectedFeatures, featuresRequiringConfig, deployment) {
  const techStackPath = join(claudeDir, 'config', 'tech-stack.json');
  const configDir = join(claudeDir, 'config');

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Build tech-stack.json with enabled features
  const techStack = {
    version: '2.0.0',
    project: {
      name: projectName,
      description: '',
      rootPath: '.',
    },
    // Enable features based on user selection
    tokenManagement: {
      enabled: selectedFeatures.includes('tokenManagement'),
      dailyBudget: 200000,
      thresholds: { compact: 0.75, archive: 0.85, respawn: 0.90 },
    },
    happyMode: {
      enabled: selectedFeatures.includes('happyMode'),
      dashboardUrl: null,
      checkpointInterval: 10,
      verbosity: 'condensed',
    },
    agents: {
      enabled: true,
      l1: { model: 'sonnet', tools: ['Task', 'Read', 'Grep', 'Glob', 'WebSearch'], maxTokens: 16000 },
      l2: { model: 'sonnet', tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'], maxTokens: 8000 },
      l3: { model: 'haiku', tools: ['Read', 'Grep'], maxTokens: 500 },
      maxConcurrent: 4,
    },
    phasedDevelopment: {
      enabled: selectedFeatures.includes('phasedDevelopment'),
      defaultScale: 'M',
      successTarget: 0.95,
    },
    hooks: {
      enabled: true,
      priorities: { lifecycle: 100, tools: 1000, automation: 2000 },
      errorBehavior: 'approve',
    },
    devEnvironment: {
      tunnel: {
        service: 'none', // No default - configured via /menu
        url: null,
        subdomain: null,
      },
    },
    deployment: {
      frontend: { platform: 'none' },
      backend: { platform: 'none' },
    },
    versionControl: {
      provider: 'github',
      projectBoard: { type: 'none' },
    },
    // Template sync configuration (always-on symlink sync)
    sync: {
      method: 'symlink',
      enabled: true,
      lastSyncAt: null,
      ccaspVersionAtSync: null,
    },
    // Track which features need post-install configuration
    _pendingConfiguration: featuresRequiringConfig.map((f) => f.name),
    // Track what was deployed for verification
    _deployment: deployment,
  };

  if (!existsSync(techStackPath)) {
    safeWriteJson(techStackPath, techStack);
    log.info(chalk.green('  ✓ Created config/tech-stack.json'));
  } else {
    log.debug(chalk.blue('  ○ config/tech-stack.json exists (preserved)'));
  }
}

/**
 * Update ccasp-state.json with current version
 * @param {string} claudeDir - .claude directory
 */
export function updateCcaspState(claudeDir) {
  const configDir = join(claudeDir, 'config');
  const ccaspStatePath = join(configDir, 'ccasp-state.json');
  const currentVersion = getVersion();

  let ccaspState = { currentVersion, lastCheckTimestamp: 0, updateAvailable: false };

  if (existsSync(ccaspStatePath)) {
    try {
      ccaspState = JSON.parse(readFileSync(ccaspStatePath, 'utf8'));
    } catch {
      // Use default state if parse fails
    }
  }

  // Always update the current version to match installed CCASP
  ccaspState.currentVersion = currentVersion;
  ccaspState.installedAt = new Date().toISOString();

  safeWriteJson(ccaspStatePath, ccaspState);
  log.info(chalk.green(`  ✓ Updated ccasp-state.json (v${currentVersion})`));
}

/**
 * Register project in global registry
 * @param {string} cwd - Current working directory
 * @param {string} projectName - Project name
 * @param {Array} selectedFeatures - Selected features
 * @param {Object} options - Command options
 */
export function registerInGlobalRegistry(cwd, projectName, selectedFeatures, options) {
  if (options.noRegister) {
    return;
  }

  const currentVersion = getVersion();
  const isNewProject = registerProject(cwd, {
    name: projectName,
    version: currentVersion,
    features: selectedFeatures
  });

  if (isNewProject) {
    log.info(chalk.green(`  ✓ Registered project in global CCASP registry`));
  } else {
    log.debug(`  ○ Updated project in global CCASP registry`);
  }
}

/**
 * Auto-generate stack-specific agents if enabled
 * @param {Array} selectedFeatures - Selected features
 * @param {string} cwd - Current working directory
 */
export async function generateStackAgents(selectedFeatures, cwd) {
  if (!selectedFeatures.includes('autoStackAgents')) {
    return;
  }

  console.log('');
  console.log(chalk.bold('Step 8: Generating Stack-Specific Agents\n'));

  try {
    const { generateAgents } = await import('../generate-agents.js');
    await generateAgents({ projectRoot: cwd, auto: true, silent: true });
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ Agent generation skipped: ${err.message}`));
    console.log(chalk.dim('    Run /generate-agents manually after tech stack detection.'));
  }
}
