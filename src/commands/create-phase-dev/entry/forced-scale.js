/**
 * Create Phase Dev - Forced Scale Mode
 *
 * Skip wizard but still auto-detect stack. Uses forced scale parameter.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  adjustForEnhancements,
  forceScale,
} from '../scale-calculator.js';
import {
  generatePhaseDevDocumentation,
  displayGenerationResults,
  generateBackendConfig,
} from '../documentation-generator.js';
import { showPostCompletionHandler } from '../post-completion.js';

/**
 * Run with forced scale (skip wizard but still auto-detect stack)
 */
export async function runWithForcedScale(options, enhancements, checkpoint, parentContext = null) {
  console.log(chalk.yellow(`\n\u26a1 Using forced scale: ${options.scale.toUpperCase()}\n`));

  const { analyzeCodebase, generateStackSummary, displayAnalysisResults } = await import(
    '../codebase-analyzer.js'
  );

  console.log(chalk.dim('Analyzing codebase...\n'));
  const analysis = await analyzeCodebase(process.cwd());
  displayAnalysisResults(analysis);

  const { projectName, projectSlug, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: options.name || '',
      validate: (input) => input.length > 0 || 'Required',
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
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description:',
      default: 'Phased development project',
    },
  ]);

  const { useDetected } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDetected',
      message: 'Use detected tech stack?',
      default: analysis.confidence !== 'low',
    },
  ]);

  let architecture;
  if (useDetected && analysis.confidence !== 'low') {
    architecture = {
      frontend: analysis.frontend.detected
        ? { framework: analysis.frontend.framework, language: analysis.frontend.language }
        : null,
      backend: analysis.backend.detected
        ? { framework: analysis.backend.framework, language: analysis.backend.language }
        : null,
      database: analysis.database.detected
        ? { type: analysis.database.type, orm: analysis.database.orm }
        : null,
      deployment: analysis.deployment.detected
        ? { platform: analysis.deployment.platform }
        : null,
      needsAuth: true,
      needsRealtime: false,
      summary: generateStackSummary(analysis),
      autoDetected: true,
    };
  } else {
    const manualArch = await inquirer.prompt([
      {
        type: 'list',
        name: 'frontend',
        message: 'Frontend:',
        choices: [
          { name: 'React', value: 'react' },
          { name: 'Vue', value: 'vue' },
          { name: 'Angular', value: 'angular' },
          { name: 'Next.js', value: 'nextjs' },
          { name: 'None', value: 'none' },
          { name: 'Other', value: 'other' },
        ],
      },
      {
        type: 'list',
        name: 'backend',
        message: 'Backend:',
        choices: [
          { name: 'Express (Node)', value: 'express' },
          { name: 'FastAPI (Python)', value: 'fastapi' },
          { name: 'Django (Python)', value: 'django' },
          { name: 'Rails (Ruby)', value: 'rails' },
          { name: 'None', value: 'none' },
          { name: 'Other', value: 'other' },
        ],
      },
      {
        type: 'list',
        name: 'database',
        message: 'Database:',
        choices: [
          { name: 'PostgreSQL', value: 'postgresql' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'SQLite', value: 'sqlite' },
          { name: 'None', value: 'none' },
        ],
      },
      {
        type: 'confirm',
        name: 'needsAuth',
        message: 'Requires auth?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'needsRealtime',
        message: 'Requires WebSocket?',
        default: false,
      },
    ]);

    const parts = [];
    if (manualArch.frontend !== 'none') parts.push(manualArch.frontend);
    if (manualArch.backend !== 'none') parts.push(manualArch.backend);
    if (manualArch.database !== 'none') parts.push(manualArch.database);

    architecture = {
      frontend: manualArch.frontend !== 'none' ? { framework: manualArch.frontend } : null,
      backend: manualArch.backend !== 'none' ? { framework: manualArch.backend } : null,
      database: manualArch.database !== 'none' ? { type: manualArch.database } : null,
      deployment: null,
      needsAuth: manualArch.needsAuth,
      needsRealtime: manualArch.needsRealtime,
      summary: parts.join(' | ') || 'Minimal stack',
      autoDetected: false,
    };
  }

  const scaleResult = forceScale(options.scale, {});

  const config = adjustForEnhancements(
    {
      projectName,
      projectSlug,
      description,
      architecture,
      analysis,
      scope: { linesOfCode: 'medium', components: 'several' },
      ...scaleResult,
    },
    enhancements
  );

  if (parentContext) {
    config.parentContext = parentContext;
  }

  config.backendConfig = generateBackendConfig(architecture);

  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  displayGenerationResults(results);

  await showPostCompletionHandler(config, results);

  return { config, results, checkpoint };
}
