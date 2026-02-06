/**
 * Create Phase Dev Command
 *
 * Main orchestrator for phased development plan generation.
 * Creates comprehensive documentation with 95%+ success probability.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - create-phase-dev/entry/autonomous.js - Auto-detect mode with minimal prompts
 * - create-phase-dev/entry/forced-scale.js - Forced scale mode (skip wizard)
 * - create-phase-dev/entry/menu.js - Interactive main menu and help display
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';
import { runWizard, promptEnhancements } from './create-phase-dev/wizard.js';
import {
  adjustForEnhancements,
} from './create-phase-dev/scale-calculator.js';
import {
  generatePhaseDevDocumentation,
  displayGenerationResults,
  generateBackendConfig,
  createGitCheckpoint,
} from './create-phase-dev/documentation-generator.js';
import { showPostCompletionHandler } from './create-phase-dev/post-completion.js';
import { runAutonomousMode } from './create-phase-dev/entry/autonomous.js';
import { runWithForcedScale } from './create-phase-dev/entry/forced-scale.js';
import { showPhasDevMainMenu as showMainMenu } from './create-phase-dev/entry/menu.js';

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

  if (parentContext) {
    console.log(chalk.cyan(`Parent Context: ${parentContext.type} - ${parentContext.title}`));
    console.log(chalk.dim(`  ${parentContext.type}_id: ${parentContext.id}\n`));
  }

  if (options.autonomous) {
    return await runAutonomousMode(options, parentContext);
  }

  const enhancements = await promptEnhancements();

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

  if (options.scale) {
    return await runWithForcedScale(options, enhancements, checkpoint, parentContext);
  }

  const wizardResult = await runWizard(options);

  if (!wizardResult) {
    console.log(chalk.yellow('\nPlan generation cancelled.'));
    return null;
  }

  const config = adjustForEnhancements(wizardResult, enhancements);

  if (parentContext) {
    config.parentContext = parentContext;
  }

  config.backendConfig = generateBackendConfig(config.architecture);

  console.log('');
  const results = await generatePhaseDevDocumentation(config, enhancements);

  displayGenerationResults(results);

  await showPostCompletionHandler(config, results);

  return {
    config,
    results,
    checkpoint,
  };
}

/**
 * Show main menu for create-phase-dev
 */
export async function showPhasDevMainMenu() {
  return showMainMenu(runCreatePhaseDev);
}
