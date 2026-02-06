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
  getRepoInfo,
  fetchIssues,
  fetchProjectItems,
  formatIssueTable,
  parseSelection,
  createRoadmapEpic,
  createPhaseIssue,
} from '../../roadmap/github-integration.js';
import { batchNormalize } from '../../roadmap/issue-normalizer.js';
import { generateAllPhasePlans } from '../../roadmap/phase-generator.js';
import { displayPhaseTable, displayRoadmapSummary } from './display.js';

/**
 * Mode B: GitHub Issue Import
 */
export async function runGitHubImport(options) {
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
 * Create GitHub issues for roadmap
 */
export async function createGitHubIssues(roadmap, phasePlansResult) {
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
