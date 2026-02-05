/**
 * Create Phase Dev Command
 *
 * Main orchestrator for phased development plan generation.
 * Creates comprehensive documentation with 95%+ success probability.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';
import { runWizard, promptEnhancements } from './create-phase-dev/wizard.js';
import {
  calculateProjectScale,
  adjustForEnhancements,
  forceScale,
} from './create-phase-dev/scale-calculator.js';
import {
  generatePhaseDevDocumentation,
  displayGenerationResults,
  generateBackendConfig,
  createGitCheckpoint,
} from './create-phase-dev/documentation-generator.js';
import { showPostCompletionHandler } from './create-phase-dev/post-completion.js';

/**
 * Run the create-phase-dev command
 *
 * @param {Object} options - CLI options
 * @param {Object} parentContext - Optional parent context (roadmap/epic)
 */
export async function runCreatePhaseDev(options = {}, parentContext = null) {
  showHeader('Phased Development Plan Generator');

  console.log(chalk.dim('Create comprehensive development plans with 95%+ success probability.'));
  console.log(chalk.dim('Generates documentation, RAG agents, and enforcement hooks.\n'));

  // Display parent context if provided
  if (parentContext) {
    console.log(chalk.cyan(`Parent Context: ${parentContext.type} - ${parentContext.title}`));
    console.log(chalk.dim(`  ${parentContext.type}_id: ${parentContext.id}\n`));
  }

  // Check for autonomous mode
  if (options.autonomous) {
    return await runAutonomousMode(options, parentContext);
  }

  // Step 0A: Enhancement options
  const enhancements = await promptEnhancements();

  // Step 0B: Git checkpoint (optional)
  const { createCheckpoint } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createCheckpoint',
      message: 'Create git checkpoint before generation?',
      default: false,
    },
  ]);

  let checkpoint = null;
  if (createCheckpoint) {
    checkpoint = await createGitCheckpoint(options.name || 'unnamed');
  }

  // Check for forced scale
  if (options.scale) {
    return await runWithForcedScale(options, enhancements, checkpoint, parentContext);
  }

  // Steps 1-5: Interactive wizard
  const wizardResult = await runWizard(options);

  if (!wizardResult) {
    console.log(chalk.yellow('\nPlan generation cancelled.'));
    return null;
  }

  // Adjust for enhancements
  const config = adjustForEnhancements(wizardResult, enhancements);

  // Add parent context if provided
  if (parentContext) {
    config.parentContext = parentContext;
  }

  // Add backend configuration
  config.backendConfig = generateBackendConfig(config.architecture);

  // Step 5: Generate documentation
  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  // Display results
  displayGenerationResults(results);

  // Step 6: Post-completion handler (MANDATORY)
  await showPostCompletionHandler(config, results);

  return {
    config,
    results,
    checkpoint,
  };
}

/**
 * Run with forced scale (skip wizard but still auto-detect stack)
 */
async function runWithForcedScale(options, enhancements, checkpoint, parentContext = null) {
  console.log(chalk.yellow(`\n⚡ Using forced scale: ${options.scale.toUpperCase()}\n`));

  // Import codebase analyzer
  const { analyzeCodebase, generateStackSummary, displayAnalysisResults } = await import(
    './create-phase-dev/codebase-analyzer.js'
  );

  // Auto-detect tech stack
  console.log(chalk.dim('Analyzing codebase...\n'));
  const analysis = await analyzeCodebase(process.cwd());
  displayAnalysisResults(analysis);

  // Get minimal project info
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

  // Confirm or override detected stack
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
    // Build architecture from analysis
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
    // Minimal manual prompts
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

  // Generate scale result
  const scaleResult = forceScale(options.scale, {});

  // Build config
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

  // Add parent context if provided
  if (parentContext) {
    config.parentContext = parentContext;
  }

  config.backendConfig = generateBackendConfig(architecture);

  // Generate documentation
  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  displayGenerationResults(results);

  await showPostCompletionHandler(config, results);

  return { config, results, checkpoint };
}

/**
 * Run in autonomous mode (auto-detect stack, minimal prompts)
 */
async function runAutonomousMode(options, parentContext = null) {
  console.log(chalk.yellow('\n⚡ Autonomous mode: auto-detecting stack\n'));

  if (!options.name) {
    console.log(chalk.red('Error: --name required for autonomous mode'));
    return null;
  }

  // Import codebase analyzer
  const { analyzeCodebase, generateStackSummary } = await import(
    './create-phase-dev/codebase-analyzer.js'
  );

  const projectName = options.name;
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Default scale is Medium
  const scale = options.scale || 'M';

  // Auto-detect tech stack
  console.log(chalk.dim('Analyzing codebase...'));
  const analysis = await analyzeCodebase(process.cwd());

  // Build architecture from analysis (use whatever is detected)
  const architecture = {
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

  console.log(chalk.dim(`Detected: ${architecture.summary}\n`));

  // Default enhancements
  const enhancements = ['parallel', 'testing', 'hooks'];

  // Generate scale result
  const scaleResult = forceScale(scale, {});

  // Build config
  const config = adjustForEnhancements(
    {
      projectName,
      projectSlug,
      description: `Autonomous phased development for ${projectName}`,
      architecture,
      analysis,
      scope: { linesOfCode: 'medium', components: 'several' },
      ...scaleResult,
    },
    enhancements
  );

  // Add parent context if provided
  if (parentContext) {
    config.parentContext = parentContext;
  }

  config.backendConfig = generateBackendConfig(architecture);

  // Generate documentation
  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  displayGenerationResults(results);

  // Show summary (but skip interactive menu in autonomous mode)
  console.log(chalk.green('\n✅ Plan generated successfully'));
  console.log(chalk.dim(`\nTo start: /phase-dev-${projectSlug}`));
  console.log(chalk.dim(`Progress: .claude/phase-dev/${projectSlug}/PROGRESS.json`));

  return { config, results };
}

/**
 * Show main menu for create-phase-dev
 */
export async function showPhasDevMainMenu() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.green('1)')} Create New Plan       Full interactive wizard`,
          value: 'new',
          short: 'Create New',
        },
        {
          name: `${chalk.cyan('2)')} Quick Plan (S)        Small project (2 phases)`,
          value: 'quick-s',
          short: 'Quick S',
        },
        {
          name: `${chalk.cyan('3)')} Quick Plan (M)        Medium project (3-4 phases)`,
          value: 'quick-m',
          short: 'Quick M',
        },
        {
          name: `${chalk.cyan('4)')} Quick Plan (L)        Large project (5+ phases)`,
          value: 'quick-l',
          short: 'Quick L',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('H)')} Help & Examples`,
          value: 'help',
          short: 'Help',
        },
        {
          name: `${chalk.dim('Q)')} Back to main menu`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  switch (mode) {
    case 'new':
      return await runCreatePhaseDev({});
    case 'quick-s':
      return await runCreatePhaseDev({ scale: 'S' });
    case 'quick-m':
      return await runCreatePhaseDev({ scale: 'M' });
    case 'quick-l':
      return await runCreatePhaseDev({ scale: 'L' });
    case 'help':
      showPhaseDevHelp();
      return await showPhasDevMainMenu();
    case 'back':
      return null;
    default:
      return null;
  }
}

/**
 * Show help for phase-dev
 */
function showPhaseDevHelp() {
  console.log(chalk.cyan.bold('\n📚 Phased Development Help\n'));

  console.log(chalk.white.bold('What is Phased Development?'));
  console.log(
    chalk.dim(`
  A structured approach to complex projects that:
  - Breaks work into sequential phases
  - Tracks progress with PROGRESS.json
  - Generates RAG agents for autonomous execution
  - Creates enforcement hooks for quality
  - Achieves 95%+ success rate
`)
  );

  console.log(chalk.white.bold('Scales:'));
  console.log(
    chalk.dim(`
  S (Small)   - 2 phases, 10-30 tasks
                Focused features or bug fixes

  M (Medium)  - 3-4 phases, 30-80 tasks
                Multi-component features

  L (Large)   - 5-8 phases, 80-200 tasks
                Major overhauls or new modules
`)
  );

  console.log(chalk.white.bold('Generated Files:'));
  console.log(
    chalk.dim(`
  .claude/phase-dev/{slug}/
    PROGRESS.json        - Task tracking and state
    EXECUTIVE_SUMMARY.md - Project overview
    API_ENDPOINTS.md     - Backend endpoints (if backend detected)
    DATABASE_SCHEMA.md   - Database schema (adapts to your DB)
    exploration/         - L2 exploration documents

  .claude/agents/{slug}-phase-executor-agent.md
    RAG agent for autonomous execution

  .claude/commands/phase-dev-{slug}.md
    Dynamic slash command (removed when completed)
`)
  );

  console.log(chalk.white.bold('CLI Usage:'));
  console.log(
    chalk.dim(`
  gtask create-phase-dev              # Interactive wizard
  gtask create-phase-dev --scale M    # Force medium scale
  gtask create-phase-dev --autonomous --name "My Project"
`)
  );

  console.log('');
}
