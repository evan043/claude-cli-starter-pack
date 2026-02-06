/**
 * Create Roadmap Command
 *
 * Main orchestrator for roadmap creation. Supports three modes:
 * - Mode A: Manual builder from natural language description
 * - Mode B: GitHub issue import with table selection
 * - Mode C: Multi-Project builder for complex scopes with L2 exploration
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - create-roadmap/manual-builder.js - Mode A: Manual builder with scope parsing
 * - create-roadmap/github-import.js - Mode B: GitHub issue import and normalization
 * - create-roadmap/display.js - Phase table display, editing, summary, and help
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';
import { listRoadmaps } from '../roadmap/roadmap-manager.js';
import { runMultiProjectBuilder } from '../roadmap/multi-project-builder.js';
import { runManualBuilder } from './create-roadmap/manual-builder.js';
import { runGitHubImport } from './create-roadmap/github-import.js';
import { showRoadmapHelp } from './create-roadmap/display.js';

/**
 * Run create-roadmap command
 *
 * @param {Object} options - CLI options
 */
export async function runCreateRoadmap(options = {}) {
  showHeader('Roadmap Orchestration Framework');

  console.log(chalk.dim('Transform project ideas into executable development plans.'));
  console.log('');

  // Show existing roadmaps
  const existingRoadmaps = listRoadmaps();
  if (existingRoadmaps.length > 0) {
    console.log(chalk.cyan('Existing Roadmaps:'));
    for (const rm of existingRoadmaps.slice(0, 3)) {
      const pct = rm.metadata?.completion_percentage || 0;
      console.log(`  ${chalk.dim('•')} ${rm.title} (${pct}% complete)`);
    }
    if (existingRoadmaps.length > 3) {
      console.log(chalk.dim(`  ... and ${existingRoadmaps.length - 3} more`));
    }
    console.log('');
  }

  // Determine mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to create your roadmap?',
      choices: [
        {
          name: `${chalk.green('A)')} Manual Builder - Describe what you want to build`,
          value: 'manual',
          short: 'Manual',
        },
        {
          name: `${chalk.cyan('B)')} From GitHub Issues - Import and organize existing issues`,
          value: 'github',
          short: 'GitHub',
        },
        {
          name: `${chalk.magenta('C)')} Multi-Project Builder - Complex scope with L2 exploration`,
          value: 'multiproject',
          short: 'Multi-Project',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('?)')} Help - Learn about roadmap planning`,
          value: 'help',
          short: 'Help',
        },
        {
          name: `${chalk.dim('Q)')} Back`,
          value: 'back',
          short: 'Back',
        },
      ],
    },
  ]);

  if (mode === 'back') return null;
  if (mode === 'help') {
    showRoadmapHelp();
    return await runCreateRoadmap(options);
  }

  if (mode === 'manual') {
    return await runManualBuilder(options);
  } else if (mode === 'multiproject') {
    return await runMultiProjectBuilder(options);
  } 
    return await runGitHubImport(options);
  
}
