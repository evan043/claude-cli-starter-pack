/**
 * Wizard Architecture - Stack Detection & Manual Override
 *
 * Handles architecture confirmation from auto-detection
 * and manual architecture selection when override is needed.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { generateStackSummary } from '../codebase-analyzer.js';

/**
 * Step 2: Confirm or override detected architecture
 */
export async function promptArchitectureConfirmation(analysis) {
  console.log(chalk.cyan.bold('\n\u{1f3d7}\ufe0f Step 2: Architecture Confirmation\n'));

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

  return await promptManualArchitecture(analysis);
}

/**
 * Build architecture config from analysis
 */
export function buildArchitectureFromAnalysis(analysis) {
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
    needsAuth: true,
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
export function getBackendLanguage(framework) {
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
