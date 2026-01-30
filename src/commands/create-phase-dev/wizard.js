/**
 * Phased Development Wizard
 *
 * Interactive flow for gathering project information.
 * Auto-detects tech stack - works with ANY codebase.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { analyzeCodebase, generateStackSummary, displayAnalysisResults } from './codebase-analyzer.js';
import { calculateProjectScale } from './scale-calculator.js';

/**
 * Run the interactive wizard
 */
export async function runWizard(options = {}) {
  // Step 1: Project Identification
  const projectInfo = await promptProjectInfo(options);

  // Step 2: Auto-detect tech stack
  const analysis = await analyzeCodebase(process.cwd());
  displayAnalysisResults(analysis);

  // Step 3: Confirm or override detected stack
  const architecture = await promptArchitectureConfirmation(analysis);

  // Step 4: Scope Assessment
  const scope = await promptScopeAssessment();

  // Step 5: Calculate Scale
  const scaleResult = calculateProjectScale(scope);

  // Step 6: Review and Confirm
  const confirmed = await reviewAndConfirm({
    ...projectInfo,
    scope,
    architecture,
    analysis,
    ...scaleResult,
  });

  if (!confirmed) {
    return null;
  }

  return {
    ...projectInfo,
    scope,
    architecture,
    analysis,
    ...scaleResult,
  };
}

/**
 * Step 1: Project Identification
 */
async function promptProjectInfo(options) {
  console.log(chalk.cyan.bold('\n📋 Step 1: Project Identification\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name (human-readable):',
      default: options.name || '',
      validate: (input) => input.length > 0 || 'Project name is required',
    },
    {
      type: 'input',
      name: 'projectSlug',
      message: 'Project slug (kebab-case):',
      default: (answers) =>
        answers.projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      validate: (input) => {
        if (!/^[a-z][a-z0-9-]*$/.test(input)) {
          return 'Use kebab-case (lowercase letters, numbers, hyphens)';
        }
        return true;
      },
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Project description (opens editor):',
      default: 'Describe your project goals and requirements...',
    },
  ]);

  return answers;
}

/**
 * Step 2: Confirm or override detected architecture
 */
async function promptArchitectureConfirmation(analysis) {
  console.log(chalk.cyan.bold('\n🏗️ Step 2: Architecture Confirmation\n'));

  const { useDetected } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDetected',
      message: 'Use detected tech stack?',
      default: analysis.confidence !== 'low',
    },
  ]);

  if (useDetected && analysis.confidence !== 'low') {
    return buildArchitectureFromAnalysis(analysis);
  }

  // Manual override
  return await promptManualArchitecture(analysis);
}

/**
 * Build architecture config from analysis
 */
function buildArchitectureFromAnalysis(analysis) {
  return {
    frontend: analysis.frontend.detected
      ? {
          framework: analysis.frontend.framework,
          language: analysis.frontend.language,
          bundler: analysis.frontend.bundler,
          styling: analysis.frontend.styling,
        }
      : null,
    backend: analysis.backend.detected
      ? {
          framework: analysis.backend.framework,
          language: analysis.backend.language,
        }
      : null,
    database: analysis.database.detected
      ? {
          type: analysis.database.type,
          orm: analysis.database.orm,
        }
      : null,
    testing: analysis.testing.detected
      ? {
          framework: analysis.testing.framework,
          e2e: analysis.testing.e2e,
        }
      : null,
    deployment: analysis.deployment.detected
      ? {
          platform: analysis.deployment.platform,
          containerized: analysis.deployment.containerized,
        }
      : null,
    needsAuth: true, // Will ask separately
    needsRealtime: false,
    summary: generateStackSummary(analysis),
    autoDetected: true,
  };
}

/**
 * Manual architecture selection (when auto-detect fails or user wants to override)
 */
async function promptManualArchitecture(analysis) {
  console.log(chalk.dim('\nPlease specify your tech stack:\n'));

  // Frontend
  const { frontendType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'frontendType',
      message: 'Frontend framework:',
      choices: [
        { name: 'React', value: 'react' },
        { name: 'Vue', value: 'vue' },
        { name: 'Angular', value: 'angular' },
        { name: 'Svelte', value: 'svelte' },
        { name: 'Next.js', value: 'nextjs' },
        { name: 'Nuxt', value: 'nuxt' },
        { name: 'Plain HTML/JS', value: 'vanilla' },
        { name: 'No frontend', value: 'none' },
        { name: 'Other', value: 'other' },
      ],
      default: analysis.frontend.framework || 'react',
    },
  ]);

  let frontendLang = 'javascript';
  if (frontendType !== 'none' && frontendType !== 'vanilla') {
    const { lang } = await inquirer.prompt([
      {
        type: 'list',
        name: 'lang',
        message: 'Frontend language:',
        choices: [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'JavaScript', value: 'javascript' },
        ],
        default: analysis.frontend.language || 'typescript',
      },
    ]);
    frontendLang = lang;
  }

  // Backend
  const { backendType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'backendType',
      message: 'Backend framework:',
      choices: [
        { name: 'Express.js (Node)', value: 'express' },
        { name: 'Fastify (Node)', value: 'fastify' },
        { name: 'NestJS (Node)', value: 'nestjs' },
        { name: 'FastAPI (Python)', value: 'fastapi' },
        { name: 'Django (Python)', value: 'django' },
        { name: 'Flask (Python)', value: 'flask' },
        { name: 'Rails (Ruby)', value: 'rails' },
        { name: 'Gin (Go)', value: 'gin' },
        { name: 'Actix (Rust)', value: 'actix' },
        { name: 'No backend', value: 'none' },
        { name: 'Other', value: 'other' },
      ],
      default: analysis.backend.framework || 'express',
    },
  ]);

  // Database
  const { databaseType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'databaseType',
      message: 'Database:',
      choices: [
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'MySQL/MariaDB', value: 'mysql' },
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'SQLite', value: 'sqlite' },
        { name: 'Redis (cache/primary)', value: 'redis' },
        { name: 'No database', value: 'none' },
        { name: 'Other', value: 'other' },
      ],
      default: analysis.database.type || 'postgresql',
    },
  ]);

  // Deployment
  const { deploymentPlatform } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deploymentPlatform',
      message: 'Deployment platform:',
      choices: [
        { name: 'Vercel', value: 'vercel' },
        { name: 'Netlify', value: 'netlify' },
        { name: 'Railway', value: 'railway' },
        { name: 'Fly.io', value: 'fly' },
        { name: 'Render', value: 'render' },
        { name: 'Heroku', value: 'heroku' },
        { name: 'AWS', value: 'aws' },
        { name: 'Google Cloud', value: 'gcp' },
        { name: 'Azure', value: 'azure' },
        { name: 'Cloudflare', value: 'cloudflare' },
        { name: 'Docker/Kubernetes', value: 'kubernetes' },
        { name: 'Self-hosted', value: 'self' },
        { name: 'Not decided yet', value: 'tbd' },
      ],
      default: analysis.deployment.platform || 'vercel',
    },
  ]);

  // Additional options
  const additionalOptions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'needsAuth',
      message: 'Requires authentication?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'needsRealtime',
      message: 'Requires real-time updates (WebSocket/SSE)?',
      default: false,
    },
  ]);

  // Build summary
  const parts = [];
  if (frontendType !== 'none') {
    parts.push(`${frontendType}${frontendLang === 'typescript' ? ' + TS' : ''}`);
  }
  if (backendType !== 'none') {
    parts.push(backendType);
  }
  if (databaseType !== 'none') {
    parts.push(databaseType);
  }

  return {
    frontend:
      frontendType !== 'none'
        ? { framework: frontendType, language: frontendLang }
        : null,
    backend:
      backendType !== 'none'
        ? {
            framework: backendType,
            language: getBackendLanguage(backendType),
          }
        : null,
    database: databaseType !== 'none' ? { type: databaseType } : null,
    deployment:
      deploymentPlatform !== 'tbd' ? { platform: deploymentPlatform } : null,
    needsAuth: additionalOptions.needsAuth,
    needsRealtime: additionalOptions.needsRealtime,
    summary: parts.join(' | ') || 'Minimal stack',
    autoDetected: false,
  };
}

/**
 * Get backend language from framework
 */
function getBackendLanguage(framework) {
  const map = {
    express: 'node',
    fastify: 'node',
    nestjs: 'node',
    fastapi: 'python',
    django: 'python',
    flask: 'python',
    rails: 'ruby',
    gin: 'go',
    actix: 'rust',
    axum: 'rust',
  };
  return map[framework] || 'unknown';
}

/**
 * Step 3: Scope Assessment
 */
async function promptScopeAssessment() {
  console.log(chalk.cyan.bold('\n📊 Step 3: Scope Assessment\n'));
  console.log(chalk.dim('Answer these to help estimate project scale.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'linesOfCode',
      message: 'Estimated lines of code to write/modify:',
      choices: [
        { name: '< 500 lines (small feature)', value: 'small' },
        { name: '500-2000 lines (medium feature)', value: 'medium' },
        { name: '2000-5000 lines (large feature)', value: 'large' },
        { name: '5000+ lines (major overhaul)', value: 'xlarge' },
      ],
    },
    {
      type: 'list',
      name: 'components',
      message: 'Number of components/modules affected:',
      choices: [
        { name: '1-3 components', value: 'few' },
        { name: '4-8 components', value: 'several' },
        { name: '9-15 components', value: 'many' },
        { name: '15+ components', value: 'extensive' },
      ],
    },
    {
      type: 'list',
      name: 'integrations',
      message: 'External integrations required:',
      choices: [
        { name: 'None', value: 'none' },
        { name: '1-2 APIs/services', value: 'few' },
        { name: '3-5 APIs/services', value: 'several' },
        { name: '5+ APIs/services', value: 'many' },
      ],
    },
    {
      type: 'list',
      name: 'familiarity',
      message: 'Familiarity with the codebase area:',
      choices: [
        { name: 'Very familiar (worked on it recently)', value: 'high' },
        { name: 'Somewhat familiar', value: 'medium' },
        { name: 'New area (need to learn)', value: 'low' },
      ],
    },
  ]);

  return answers;
}

/**
 * Step 4: Review and Confirm
 */
async function reviewAndConfirm(config) {
  console.log(chalk.cyan.bold('\n📝 Step 4: Review Plan\n'));

  // Display summary
  console.log(chalk.white.bold('Project:'));
  console.log(`  Name: ${chalk.cyan(config.projectName)}`);
  console.log(`  Slug: ${chalk.cyan(config.projectSlug)}`);
  console.log('');

  console.log(chalk.white.bold('Scale Assessment:'));
  console.log(`  Scale: ${chalk.yellow(config.scale)} (${config.scaleName})`);
  console.log(`  Phases: ${chalk.yellow(config.phases.length)}`);
  console.log(`  Estimated Tasks: ${chalk.yellow(config.taskEstimate)}`);
  console.log('');

  console.log(chalk.white.bold('Phases:'));
  config.phases.forEach((phase, i) => {
    console.log(`  ${i + 1}. ${chalk.green(phase.name)} - ${phase.description}`);
  });
  console.log('');

  console.log(chalk.white.bold('Architecture:'));
  console.log(`  Stack: ${chalk.dim(config.architecture.summary)}`);
  console.log(
    `  Auth: ${config.architecture.needsAuth ? chalk.green('Yes') : chalk.dim('No')}`
  );
  console.log(
    `  Realtime: ${config.architecture.needsRealtime ? chalk.green('Yes') : chalk.dim('No')}`
  );
  if (config.architecture.autoDetected) {
    console.log(`  ${chalk.dim('(auto-detected from codebase)')}`);
  }
  console.log('');

  // Confirmation
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Generate phased development plan with these settings?',
      default: true,
    },
  ]);

  return confirmed;
}

/**
 * Prompt for enhancements
 */
export async function promptEnhancements() {
  console.log(chalk.cyan.bold('\n⚡ Enhancement Options\n'));
  console.log(chalk.dim('Select optional enhancements for your plan.\n'));

  const { enhancements } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'enhancements',
      message: 'Enable enhancements:',
      choices: [
        {
          name: 'Parallel Execution - Deploy multiple agents for file generation',
          value: 'parallel',
          checked: true,
        },
        {
          name: 'E2E Testing - Generate test definitions for your framework',
          value: 'testing',
          checked: true,
        },
        {
          name: 'Per-Phase Commits - Auto-commit after each phase',
          value: 'commits',
          checked: false,
        },
        {
          name: 'Enforcement Hooks - Generate pattern enforcers',
          value: 'hooks',
          checked: false,
        },
        {
          name: 'GitHub Integration - Create issues for each phase',
          value: 'github',
          checked: false,
        },
      ],
    },
  ]);

  return enhancements;
}
