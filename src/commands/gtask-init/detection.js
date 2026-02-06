/**
 * gtask-init/detection.js - Tech Stack Detection & Customization
 *
 * Handles:
 * - Display of detected tech stack
 * - Quick customization wizard
 * - Full setup from scratch
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { generateTechStack } from '../../utils/template-engine.js';

/**
 * Display detected stack summary
 */
export function displayDetectedStack(stack) {
  const items = [];

  if (stack.frontend?.framework) {
    items.push(`Frontend: ${chalk.cyan(stack.frontend.framework)}${
      stack.frontend.buildTool ? ` (${stack.frontend.buildTool})` : ''
      } on port ${stack.frontend.port || 5173}`);
  }

  if (stack.backend?.framework) {
    items.push(`Backend: ${chalk.cyan(stack.backend.framework)}${
      stack.backend.language ? ` (${stack.backend.language})` : ''
      } on port ${stack.backend.port || 8000}`);
  }

  if (stack.database?.primary) {
    items.push(`Database: ${chalk.cyan(stack.database.primary)}${
      stack.database.orm ? ` with ${stack.database.orm}` : ''}`);
  }

  if (stack.testing?.e2e?.framework) {
    items.push(`E2E Testing: ${chalk.cyan(stack.testing.e2e.framework)}`);
  }

  if (stack.testing?.unit?.framework) {
    items.push(`Unit Testing: ${chalk.cyan(stack.testing.unit.framework)}`);
  }

  if (stack.versionControl?.provider) {
    items.push(`Repository: ${chalk.cyan(`${stack.versionControl.owner}/${stack.versionControl.repo}`)}`);
  }

  if (stack.devEnvironment?.packageManager) {
    items.push(`Package Manager: ${chalk.cyan(stack.devEnvironment.packageManager)}`);
  }

  if (items.length === 0) {
    console.log(chalk.dim('  No technologies detected automatically.'));
  } else {
    items.forEach((item) => console.log(`  ${item}`));
  }
}

/**
 * Quick customize essential settings
 */
export async function customizeSettings(detected) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: detected.project?.name || '',
    },
    {
      type: 'list',
      name: 'frontendFramework',
      message: 'Frontend framework:',
      choices: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vanilla', 'none'],
      default: detected.frontend?.framework || 'none',
    },
    {
      type: 'number',
      name: 'frontendPort',
      message: 'Frontend port:',
      default: detected.frontend?.port || 5173,
    },
    {
      type: 'list',
      name: 'backendFramework',
      message: 'Backend framework:',
      choices: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'rails', 'none'],
      default: detected.backend?.framework || 'none',
    },
    {
      type: 'number',
      name: 'backendPort',
      message: 'Backend port:',
      default: detected.backend?.port || 8000,
    },
    {
      type: 'list',
      name: 'e2eFramework',
      message: 'E2E testing framework:',
      choices: ['playwright', 'cypress', 'puppeteer', 'none'],
      default: detected.testing?.e2e?.framework || 'none',
    },
  ]);

  // Merge answers into detected
  return generateTechStack(detected, {
    project: { name: answers.projectName },
    frontend: {
      framework: answers.frontendFramework,
      port: answers.frontendPort,
    },
    backend: {
      framework: answers.backendFramework,
      port: answers.backendPort,
    },
    testing: {
      e2e: { framework: answers.e2eFramework },
    },
  });
}

/**
 * Full setup from scratch
 */
export async function fullSetup() {
  const techStack = {
    version: '1.0.0',
    project: {},
    frontend: {},
    backend: {},
    database: {},
    deployment: { frontend: {}, backend: {} },
    devEnvironment: { tunnel: {} },
    testing: { e2e: {}, unit: {}, selectors: {}, credentials: {} },
    versionControl: { projectBoard: {} },
    urls: { local: {}, tunnel: {}, production: {} },
  };

  // Project
  const projectAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: '',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: '',
    },
  ]);
  techStack.project = projectAnswers;

  // Frontend
  const frontendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Frontend framework:',
      choices: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vanilla', 'none'],
    },
    {
      type: 'list',
      name: 'buildTool',
      message: 'Build tool:',
      choices: ['vite', 'webpack', 'esbuild', 'parcel', 'none'],
      default: 'vite',
    },
    {
      type: 'number',
      name: 'port',
      message: 'Dev server port:',
      default: 5173,
    },
  ]);
  techStack.frontend = frontendAnswers;

  // Backend
  const backendAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Backend language:',
      choices: ['python', 'node', 'typescript', 'go', 'rust', 'none'],
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Backend framework:',
      choices: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'gin', 'none'],
    },
    {
      type: 'number',
      name: 'port',
      message: 'Backend port:',
      default: 8000,
    },
  ]);
  techStack.backend = backendAnswers;

  // Database
  const dbAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'primary',
      message: 'Database:',
      choices: ['postgresql', 'mysql', 'mongodb', 'sqlite', 'none'],
    },
    {
      type: 'list',
      name: 'orm',
      message: 'ORM:',
      choices: ['prisma', 'drizzle', 'typeorm', 'sqlalchemy', 'none'],
    },
  ]);
  techStack.database = dbAnswers;

  // Testing
  const testingAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'e2e',
      message: 'E2E testing framework:',
      choices: ['playwright', 'cypress', 'puppeteer', 'none'],
    },
    {
      type: 'list',
      name: 'unit',
      message: 'Unit testing framework:',
      choices: ['vitest', 'jest', 'mocha', 'pytest', 'none'],
    },
  ]);
  techStack.testing.e2e.framework = testingAnswers.e2e;
  techStack.testing.unit.framework = testingAnswers.unit;

  // URLs
  techStack.urls.local = {
    frontend: `http://localhost:${frontendAnswers.port}`,
    backend: `http://localhost:${backendAnswers.port}`,
    api: `http://localhost:${backendAnswers.port}/api`,
  };

  return techStack;
}
