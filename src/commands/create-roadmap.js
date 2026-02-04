/**
 * Create Roadmap Command
 *
 * Main orchestrator for roadmap creation. Supports three modes:
 * - Mode A: Manual builder from natural language description
 * - Mode B: GitHub issue import with table selection
 * - Mode C: Multi-Project builder for complex scopes with L2 exploration
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';
import {
  createRoadmap,
  createPhase,
  generateSlug,
  ROADMAP_SOURCE,
} from '../roadmap/schema.js';
import {
  createNewRoadmap,
  saveRoadmap,
  listRoadmaps,
  getRoadmapsDir,
  generateRoadmapsIndex,
} from '../roadmap/roadmap-manager.js';
import {
  analyzeScope,
  generatePhaseRecommendations,
  suggestAgents,
  groupRelatedItems,
} from '../roadmap/intelligence.js';
import {
  checkGhCli,
  getRepoInfo,
  fetchIssues,
  fetchProjectItems,
  formatIssueTable,
  parseSelection,
  createRoadmapEpic,
  createPhaseIssue,
} from '../roadmap/github-integration.js';
import { batchNormalize } from '../roadmap/issue-normalizer.js';
import { generateAllPhasePlans } from '../roadmap/phase-generator.js';
import { runMultiProjectBuilder } from '../roadmap/multi-project-builder.js';

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
  } else {
    return await runGitHubImport(options);
  }
}

/**
 * Mode A: Manual Roadmap Builder
 */
async function runManualBuilder(options) {
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
 * Mode B: GitHub Issue Import
 */
async function runGitHubImport(options) {
  console.log('');
  console.log(chalk.cyan.bold('GitHub Issue Import'));
  console.log(chalk.dim('Select issues to include in your roadmap.'));
  console.log('');

  // Check gh CLI
  const ghCheck = checkGhCli();
  if (!ghCheck.available) {
    console.log(chalk.red(ghCheck.error));
    return null;
  }
  if (!ghCheck.authenticated) {
    console.log(chalk.yellow(ghCheck.error));
    return null;
  }

  // Get repo info
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    console.log(chalk.red('Could not determine repository. Run `ccasp setup` first.'));
    return null;
  }

  console.log(chalk.dim(`Repository: ${repoInfo.owner}/${repoInfo.repo}`));
  console.log('');

  // Choose source
  const { source } = await inquirer.prompt([
    {
      type: 'list',
      name: 'source',
      message: 'Import from:',
      choices: [
        { name: 'Open Issues', value: 'issues' },
        { name: 'Project Board', value: 'project' },
      ],
    },
  ]);

  const spinner = ora('Fetching issues...').start();

  let items = [];
  if (source === 'issues') {
    items = fetchIssues({ limit: 50 });
  } else {
    // Get project number
    spinner.stop();
    const { projectNumber } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectNumber',
        message: 'Project board number:',
        validate: v => !isNaN(parseInt(v)) || 'Enter a number',
      },
    ]);
    spinner.start();
    items = fetchProjectItems({ projectNumber: parseInt(projectNumber) });
  }

  spinner.stop();

  if (items.length === 0) {
    console.log(chalk.yellow('\nNo issues found.'));
    return null;
  }

  // Display table
  console.log(formatIssueTable(items));
  console.log('');

  // Get selection
  const { selection } = await inquirer.prompt([
    {
      type: 'input',
      name: 'selection',
      message: 'Select rows (e.g., 1,2,5-7 or "all"):',
      validate: v => v.length > 0 || 'Enter at least one selection',
    },
  ]);

  const selectedIndices = parseSelection(selection, items.length);
  const selectedItems = selectedIndices.map(i => items[i]);

  if (selectedItems.length === 0) {
    console.log(chalk.yellow('\nNo items selected.'));
    return null;
  }

  console.log(chalk.green(`\n✓ Selected ${selectedItems.length} items`));

  // Normalize issues
  const { normalizeIssues } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'normalizeIssues',
      message: 'Normalize issues with roadmap metadata? (additive only)',
      default: true,
    },
  ]);

  let processedItems = selectedItems;
  if (normalizeIssues) {
    const spinner2 = ora('Normalizing issues...').start();
    const normResult = batchNormalize(selectedItems);
    spinner2.succeed(`Normalized ${normResult.stats.normalizedCount} issues`);
    processedItems = [...normResult.normalized, ...normResult.skipped];
  }

  // Analyze and generate phases
  const spinner3 = ora('Analyzing scope...').start();
  const analysis = analyzeScope(processedItems);
  const recommendedPhases = generatePhaseRecommendations(analysis, processedItems);
  spinner3.succeed(`Identified ${recommendedPhases.length} phases`);

  // Get roadmap details
  console.log('');
  const { title, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Roadmap title:',
      default: `GitHub Import ${new Date().toLocaleDateString()}`,
      validate: v => v.length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: `Imported from ${selectedItems.length} GitHub issues`,
    },
  ]);

  // Display phases
  console.log('');
  console.log(chalk.cyan.bold('Proposed Phases:'));
  displayPhaseTable(recommendedPhases);

  const { approve } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'approve',
      message: 'Create this roadmap?',
      default: true,
    },
  ]);

  if (!approve) return null;

  // Create roadmap
  const slug = generateSlug(title);
  const roadmapResult = createNewRoadmap({
    title,
    description,
    source: ROADMAP_SOURCE.github_issues,
    phases: recommendedPhases.map((p, i) => ({
      phase_title: p.phase_title,
      goal: p.goal,
      complexity: p.complexity,
      dependencies: p.dependencies || [],
      outputs: p.outputs || [],
      inputs: {
        issues: (p.items || []).map(id => `#${id}`),
      },
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

  // Mark GitHub integrated
  roadmapResult.roadmap.metadata = roadmapResult.roadmap.metadata || {};
  roadmapResult.roadmap.metadata.github_integrated = true;
  saveRoadmap(roadmapResult.roadmap);

  // Update roadmaps index
  generateRoadmapsIndex();

  // Show summary
  displayRoadmapSummary(roadmapResult.roadmap, roadmapResult.path, phasePlansResult);

  return roadmapResult;
}

/**
 * Parse scope text into pseudo-issues
 */
function parseScope(scope) {
  const items = [];
  const lines = scope.split('\n');
  let currentItem = null;

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

/**
 * Display phase table
 */
function displayPhaseTable(phases) {
  console.log(chalk.dim('┌────┬────────────────────────────────────┬────────────┬─────────────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Phase                              ') + chalk.dim('│') + chalk.bold(' Complexity ') + chalk.dim('│') + chalk.bold(' Dependencies   ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼────────────────────────────────────┼────────────┼─────────────────┤'));

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const num = String(i + 1).padStart(2);
    const title = (phase.phase_title || '').substring(0, 34).padEnd(34);
    const complexity = (phase.complexity || 'M').padEnd(10);
    const deps = (phase.dependencies || []).join(', ').substring(0, 13).padEnd(13) || '-'.padEnd(13);

    console.log(chalk.dim('│') + ` ${num} ` + chalk.dim('│') + ` ${title} ` + chalk.dim('│') + ` ${complexity} ` + chalk.dim('│') + ` ${deps} ` + chalk.dim('│'));
  }

  console.log(chalk.dim('└────┴────────────────────────────────────┴────────────┴─────────────────┘'));
}

/**
 * Edit phases interactively
 */
async function editPhases(phases) {
  console.log('');
  console.log(chalk.dim('Edit phases (leave blank to keep current value):'));
  console.log('');

  const editedPhases = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    console.log(chalk.cyan(`Phase ${i + 1}: ${phase.phase_title}`));

    const { title, complexity, action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        default: phase.phase_title,
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
        default: phase.complexity,
      },
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: 'Keep', value: 'keep' },
          { name: 'Remove', value: 'remove' },
        ],
      },
    ]);

    if (action === 'keep') {
      editedPhases.push({
        ...phase,
        phase_title: title,
        complexity,
      });
    }
  }

  // Update dependencies to point to new indices
  return editedPhases.map((phase, i) => ({
    ...phase,
    phase_id: `phase-${i + 1}`,
    dependencies: phase.dependencies
      .filter(dep => editedPhases.some(p => p.phase_id === dep))
      .map(dep => {
        const newIdx = editedPhases.findIndex(p => p.phase_id === dep);
        return newIdx >= 0 ? `phase-${newIdx + 1}` : dep;
      }),
  }));
}

/**
 * Create GitHub issues for roadmap
 */
async function createGitHubIssues(roadmap, phasePlansResult) {
  const spinner = ora('Creating GitHub issues...').start();

  try {
    // Create epic
    spinner.text = 'Creating roadmap epic...';
    const epicResult = await createRoadmapEpic(roadmap);

    if (epicResult.success) {
      roadmap.metadata = roadmap.metadata || {};
      roadmap.metadata.github_epic_number = epicResult.number;
      roadmap.metadata.github_epic_url = epicResult.url;
      roadmap.metadata.github_integrated = true;

      console.log(chalk.green(`  ✓ Epic created: #${epicResult.number}`));

      // Create phase issues
      let created = 0;
      for (const phase of roadmap.phases) {
        spinner.text = `Creating issue for ${phase.phase_title}...`;
        const phaseResult = await createPhaseIssue(phase, roadmap);

        if (phaseResult.success) {
          phase.github_issue_number = phaseResult.number;
          phase.github_issue_url = phaseResult.url;
          created++;
        }
      }

      saveRoadmap(roadmap);
      spinner.succeed(`Created ${created + 1} GitHub issues`);
    } else {
      spinner.fail(`Failed to create epic: ${epicResult.error}`);
    }
  } catch (e) {
    spinner.fail(`GitHub integration failed: ${e.message}`);
  }
}

/**
 * Display roadmap summary
 */
function displayRoadmapSummary(roadmap, path, phasePlansResult) {
  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.green.bold('  ✓ Roadmap Created Successfully!                                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + `  Roadmap: ${(roadmap.title || '').substring(0, 50).padEnd(58)}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  Phases: ${String(roadmap.phases?.length || 0).padEnd(59)}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  Location: ${path.substring(0, 56).padEnd(57)}` + chalk.cyan('║'));

  if (roadmap.metadata?.github_epic_number) {
    console.log(chalk.cyan('║') + chalk.dim(`  GitHub Epic: #${roadmap.metadata.github_epic_number}`.padEnd(69)) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Next Steps:'.padEnd(69)) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  1. Review: /roadmap-status ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  2. Start: /phase-track ${roadmap.slug}/phase-1`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  3. Edit: /roadmap-edit ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Show roadmap help
 */
function showRoadmapHelp() {
  console.log('');
  console.log(chalk.cyan.bold('📚 Roadmap Planning Guide'));
  console.log('');

  console.log(chalk.white.bold('When to Create a Roadmap:'));
  console.log(chalk.dim(`
  Create a roadmap instead of a single phase-dev-plan when:
  • 30+ tasks are identified
  • 3+ domains involved (frontend, backend, database, testing)
  • Multiple features that could conflict
  • Long duration (> 2 weeks)
`));

  console.log(chalk.white.bold('Roadmap Modes:'));
  console.log(chalk.dim(`
  ${chalk.green('A) Manual Builder')}
     Describe what you want to build and Claude structures it into phases.
     Best for: New features, greenfield projects, clear requirements.

  ${chalk.cyan('B) GitHub Import')}
     Import existing GitHub issues and organize them into a roadmap.
     Best for: Backlog organization, sprint planning, issue triage.

  ${chalk.magenta('C) Multi-Project Builder')}
     Complex scope decomposed into multiple independent projects.
     Features L2 agent exploration for code analysis and file references.
     Best for: Large refactors, multi-domain features, platform migrations.
`));

  console.log(chalk.white.bold('Phase Patterns:'));
  console.log(chalk.dim(`
  Foundation Pattern (new features):
    1. Foundation → 2. API Layer → 3. UI Layer → 4. Integration → 5. Polish

  Migration Pattern (refactoring):
    1. Analysis → 2. Preparation → 3. Core Migration → 4. Validation → 5. Cleanup

  Feature Pattern (adding capabilities):
    1. Design → 2. Backend → 3. Frontend → 4. Testing → 5. Deploy
`));

  console.log(chalk.white.bold('Commands:'));
  console.log(chalk.dim(`
  /create-roadmap          Create new roadmap (Modes A, B, or C)
  /roadmap-status          View roadmap progress
  /roadmap-edit            Edit phases and structure
  /roadmap-track           Track execution
  /phase-track             Track individual phase
`));

  console.log('');
}
