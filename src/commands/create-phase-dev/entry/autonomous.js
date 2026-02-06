/**
 * Create Phase Dev - Autonomous Mode
 *
 * Auto-detect stack with minimal prompts for non-interactive use.
 */

import chalk from 'chalk';
import {
  adjustForEnhancements,
  forceScale,
} from '../scale-calculator.js';
import {
  generatePhaseDevDocumentation,
  displayGenerationResults,
  generateBackendConfig,
} from '../documentation-generator.js';

/**
 * Run in autonomous mode (auto-detect stack, minimal prompts)
 */
export async function runAutonomousMode(options, parentContext = null) {
  console.log(chalk.yellow('\n\u26a1 Autonomous mode: auto-detecting stack\n'));

  if (!options.name) {
    console.log(chalk.red('Error: --name required for autonomous mode'));
    return null;
  }

  const { analyzeCodebase, generateStackSummary } = await import(
    '../codebase-analyzer.js'
  );

  const projectName = options.name;
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const scale = options.scale || 'M';

  console.log(chalk.dim('Analyzing codebase...'));
  const analysis = await analyzeCodebase(process.cwd());

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

  const enhancements = ['parallel', 'testing', 'hooks'];
  const scaleResult = forceScale(scale, {});

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

  if (parentContext) {
    config.parentContext = parentContext;
  }

  config.backendConfig = generateBackendConfig(architecture);

  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  displayGenerationResults(results);

  console.log(chalk.green('\n\u2705 Plan generated successfully'));
  console.log(chalk.dim(`\nTo start: /phase-dev-${projectSlug}`));
  console.log(chalk.dim(`Progress: .claude/phase-dev/${projectSlug}/PROGRESS.json`));

  return { config, results };
}
