import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  generateSlug,
  ROADMAP_SOURCE,
} from '../../roadmap/schema.js';
import {
  createNewRoadmap,
  saveRoadmap,
  generateRoadmapsIndex,
} from '../../roadmap/roadmap-manager.js';
import {
  analyzeScope,
  generatePhaseRecommendations,
} from '../../roadmap/intelligence.js';
import {
  checkGhCli,
} from '../../roadmap/github-integration.js';
import { generateAllPhasePlans } from '../../roadmap/phase-generator.js';
import { displayPhaseTable, editPhases, displayRoadmapSummary } from './display.js';
import { createGitHubIssues } from './github-import.js';

/**
 * Mode A: Manual Roadmap Builder
 */
export async function runManualBuilder(options) {
  console.log('');
  console.log(chalk.cyan.bold('Manual Roadmap Builder'));
  console.log(chalk.dim('Describe your project and Claude will structure it into phases.'));
  console.log('');

  // Gather roadmap info
  const { title, description, scope } = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Roadmap title:',
      validate: v => v.length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description (1-2 sentences):',
      default: '',
    },
    {
      type: 'editor',
      name: 'scope',
      message: 'Describe what you want to build (press Enter to open editor):',
      default: `# What I Want to Build

## Features
-

## Requirements
-

## Technical Notes
-
`,
    },
  ]);

  const spinner = ora('Analyzing scope...').start();

  // Parse scope into pseudo-issues for analysis
  const scopeItems = parseScope(scope);
  const analysis = analyzeScope(scopeItems);

  spinner.text = 'Generating phase recommendations...';

  // Check if roadmap is needed
  if (analysis.recommendation.shouldBeSinglePhase) {
    spinner.warn('Scope is small enough for a single phase-dev-plan');
    console.log('');

    const { proceed } = await inquirer.prompt([
      {
        type: 'list',
        name: 'proceed',
        message: 'Would you like to:',
        choices: [
          { name: 'Create roadmap anyway (for future expansion)', value: 'roadmap' },
          { name: 'Create single phase-dev-plan instead', value: 'phase-dev' },
          { name: 'Go back', value: 'back' },
        ],
      },
    ]);

    if (proceed === 'back') return null;
    if (proceed === 'phase-dev') {
      console.log(chalk.yellow('\nRun /create-phase-dev to create a single phase plan.'));
      return null;
    }
  }

  // Generate phase recommendations
  const recommendedPhases = generatePhaseRecommendations(analysis, scopeItems);

  spinner.succeed(`Identified ${recommendedPhases.length} phases`);
  console.log('');

  // Display proposed phases
  console.log(chalk.cyan.bold('Proposed Phases:'));
  console.log('');
  displayPhaseTable(recommendedPhases);
  console.log('');

  // Confirm or edit
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Approve this roadmap structure?',
      choices: [
        { name: 'Yes, create roadmap', value: 'approve' },
        { name: 'Edit phases', value: 'edit' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (action === 'cancel') return null;

  let phases = recommendedPhases;

  if (action === 'edit') {
    phases = await editPhases(recommendedPhases);
  }

  // Create roadmap
  const slug = generateSlug(title);
  const roadmapResult = createNewRoadmap({
    title,
    description,
    source: ROADMAP_SOURCE.manual,
    phases: phases.map((p, i) => ({
      phase_title: p.phase_title,
      goal: p.goal,
      complexity: p.complexity,
      dependencies: p.dependencies || [],
      outputs: p.outputs || [],
    })),
  });

  if (!roadmapResult.success) {
    console.log(chalk.red(`\nFailed to create roadmap: ${roadmapResult.error}`));
    return null;
  }

  console.log(chalk.green(`\n✓ Roadmap created: ${roadmapResult.path}`));

  // Generate phase plans
  const phasePlansResult = await generateAllPhasePlans(slug);

  if (phasePlansResult.success) {
    console.log(chalk.green(`✓ Generated ${phasePlansResult.generated.length} phase plans`));
  }

  // Offer GitHub integration
  const ghCheck = checkGhCli();
  if (ghCheck.available && ghCheck.authenticated) {
    const { createGitHub } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createGitHub',
        message: 'Create GitHub issues for this roadmap?',
        default: false,
      },
    ]);

    if (createGitHub) {
      await createGitHubIssues(roadmapResult.roadmap, phasePlansResult);
    }
  }

  // Update roadmaps index
  generateRoadmapsIndex();

  // Show summary
  displayRoadmapSummary(roadmapResult.roadmap, roadmapResult.path, phasePlansResult);

  return roadmapResult;
}

/**
 * Parse scope text into pseudo-issues
 */
export function parseScope(scope) {
  const items = [];
  const lines = scope.split('\n');
  const currentItem = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip headers and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      continue;
    }

    // Bullet points become items
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-•*]\s*/, '').trim();
      if (text.length > 0) {
        items.push({
          id: items.length + 1,
          title: text,
          body: '',
        });
      }
    }
  }

  // If no items found, create one from whole scope
  if (items.length === 0 && scope.trim().length > 0) {
    items.push({
      id: 1,
      title: 'Complete implementation',
      body: scope,
    });
  }

  return items;
}
