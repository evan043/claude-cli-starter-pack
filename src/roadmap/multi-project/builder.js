/**
 * Multi-Project Builder - Main Orchestrator
 *
 * Main orchestration function that coordinates all builder phases.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  createMultiProjectRoadmap,
  createProject,
  validateMultiProjectRoadmap,
  updateMultiProjectRoadmapMetadata,
  generateSlug,
} from '../schema.js';
import { detectMultiProjectPatterns } from '../intelligence.js';
import {
  saveRoadmap,
  getRoadmapsDir,
  generateRoadmapsIndex,
} from '../roadmap-manager.js';
import { checkGhCli } from '../github-integration.js';
import {
  promptRoadmapInfo,
  promptProjectScope,
  promptExecutionConfig,
} from './wizard.js';
import { displayProjectTable, editProjects } from './display.js';
import { runDiscoveryPhase } from './discovery.js';
import {
  createGitHubIssuesForRoadmap,
  displayRoadmapSummary,
} from './github.js';

/**
 * Run Multi-Project Builder (Mode C)
 * @param {Object} options - CLI options
 * @returns {Object} Created roadmap result
 */
export async function runMultiProjectBuilder(options = {}) {
  console.log('');
  console.log(chalk.cyan.bold('🚀 Multi-Project Roadmap Builder'));
  console.log(chalk.dim('Create roadmaps spanning multiple independent projects.'));
  console.log('');

  // Step 1: Gather roadmap info
  const roadmapInfo = await promptRoadmapInfo(options);
  if (!roadmapInfo) return null;

  // Step 2: Gather project scope
  const scopeItems = await promptProjectScope(options);
  if (!scopeItems || scopeItems.length === 0) return null;

  // Step 3: Analyze for multi-project patterns
  const spinner = ora('Analyzing scope for multi-project patterns...').start();
  const analysis = detectMultiProjectPatterns(scopeItems);

  if (!analysis.shouldDecompose) {
    spinner.warn('Scope may be simple enough for a single roadmap');
    console.log(chalk.dim(`Reason: ${analysis.reason}`));
    console.log('');

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Create multi-project roadmap anyway?',
        default: false,
      },
    ]);

    if (!proceed) {
      console.log(chalk.yellow('\nConsider using Mode A or /create-phase-dev instead.'));
      return null;
    }
  } else {
    spinner.succeed(`Identified ${analysis.projects.length} potential projects`);
  }

  // Step 4: Display and edit projects
  console.log('');
  console.log(chalk.cyan.bold('Proposed Projects:'));
  console.log('');
  displayProjectTable(analysis.projects);

  const { editProjects: shouldEdit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'editProjects',
      message: 'Edit projects before creating roadmap?',
      default: false,
    },
  ]);

  let projects = analysis.projects;
  if (shouldEdit) {
    projects = await editProjects(projects);
  }

  // Step 5: Configure execution options
  const executionConfig = await promptExecutionConfig();

  // Step 6: Create the roadmap
  spinner.start('Creating multi-project roadmap...');

  const roadmap = createMultiProjectRoadmap({
    title: roadmapInfo.title,
    description: roadmapInfo.description,
    source: 'multi-project',
  });

  // Add projects to roadmap
  for (let i = 0; i < projects.length; i++) {
    const projectData = projects[i];
    const project = createProject({
      project_title: projectData.project_title,
      description: projectData.description || `Implementation of ${projectData.project_title}`,
      domain: projectData.domain,
      complexity: projectData.complexity,
      project_number: i + 1,
      slug: generateSlug(projectData.project_title),
    });

    roadmap.projects.push(project);
  }

  roadmap.execution_config = executionConfig;
  updateMultiProjectRoadmapMetadata(roadmap);

  // Validate
  const validation = validateMultiProjectRoadmap(roadmap);
  if (!validation.valid) {
    spinner.fail('Roadmap validation failed');
    validation.errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
    return null;
  }

  // Save roadmap
  const cwd = process.cwd();
  try {
    saveRoadmap(roadmap);
    spinner.succeed(`Roadmap created: ${roadmap.slug}`);
  } catch (e) {
    spinner.fail(`Failed to save roadmap: ${e.message}`);
    return null;
  }

  // Step 7: Run L2 Discovery (if parallel discovery enabled)
  if (executionConfig.parallel_discovery) {
    const { runDiscovery } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runDiscovery',
        message: 'Run L2 exploration for all projects now?',
        default: true,
      },
    ]);

    if (runDiscovery) {
      await runDiscoveryPhase(roadmap, { cwd });
      saveRoadmap(roadmap);
    }
  }

  // Step 8: GitHub integration
  const ghCheck = checkGhCli();
  if (ghCheck.available && ghCheck.authenticated) {
    const { createGitHub } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createGitHub',
        message: 'Create GitHub issues for projects?',
        default: false,
      },
    ]);

    if (createGitHub) {
      await createGitHubIssuesForRoadmap(roadmap);
      saveRoadmap(roadmap);
    }
  }

  // Update roadmaps index
  generateRoadmapsIndex();

  // Display summary
  displayRoadmapSummary(roadmap);

  return {
    success: true,
    roadmap,
    path: `${getRoadmapsDir()}/${roadmap.slug}.json`,
  };
}
