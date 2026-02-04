/**
 * Multi-Project Roadmap Builder (Mode C)
 *
 * Creates roadmaps with multiple independent projects, each getting:
 * - L2 exploration for codebase analysis
 * - Full phase/task breakdown
 * - GitHub issue with complete breakdown
 * - Execution state management
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import {
  createMultiProjectRoadmap,
  createProject,
  validateMultiProjectRoadmap,
  updateMultiProjectRoadmapMetadata,
  generateSlug,
} from './schema.js';
import {
  detectMultiProjectPatterns,
  analyzeProjectForL2Delegation,
  identifyIndependentTracks,
  analyzeScope,
  groupRelatedItems,
} from './intelligence.js';
import {
  saveRoadmap,
  loadRoadmap,
  getRoadmapsDir,
  generateRoadmapsIndex,
} from './roadmap-manager.js';
import {
  checkGhCli,
  getRepoInfo,
  createProjectIssue,
  createRoadmapEpicAfterProjects,
  linkProjectsToEpic,
} from './github-integration.js';
import {
  initProjectOrchestratorState,
  loadProjectState,
  markProjectDiscoveryComplete,
} from '../agents/state-manager.js';
import { runL2Exploration, saveExplorationToMarkdown } from '../commands/create-phase-dev/l2-orchestrator.js';
import { saveAllExplorationDocs } from '../utils/exploration-docs.js';

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

/**
 * Prompt for roadmap info
 */
async function promptRoadmapInfo(options) {
  console.log(chalk.cyan.bold('📝 Step 1: Roadmap Information\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Roadmap title:',
      default: options.title || '',
      validate: v => v.length > 0 || 'Title is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: options.description || '',
    },
  ]);

  return answers;
}

/**
 * Prompt for project scope items
 */
async function promptProjectScope(options) {
  console.log('');
  console.log(chalk.cyan.bold('📋 Step 2: Define Scope\n'));

  const { scopeMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'scopeMethod',
      message: 'How do you want to define the scope?',
      choices: [
        { name: 'Describe in editor', value: 'editor' },
        { name: 'Import from GitHub issues', value: 'github' },
        { name: 'Enter items one by one', value: 'manual' },
      ],
    },
  ]);

  if (scopeMethod === 'editor') {
    const { scope } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'scope',
        message: 'Describe your projects (press Enter to open editor):',
        default: `# Projects to Build

## Project 1: [Name]
- Feature A
- Feature B

## Project 2: [Name]
- Feature C
- Feature D

## Requirements
- Common requirement 1
- Common requirement 2
`,
      },
    ]);

    return parseProjectScope(scope);
  }

  if (scopeMethod === 'github') {
    // Use existing GitHub import flow
    const ghCheck = checkGhCli();
    if (!ghCheck.available || !ghCheck.authenticated) {
      console.log(chalk.yellow('\nGitHub CLI not available. Using editor instead.'));
      return promptProjectScope({ ...options, scopeMethod: 'editor' });
    }

    console.log(chalk.dim('\nFetching issues...'));

    const { fetchIssues, formatIssueTable, parseSelection } = await import('./github-integration.js');

    const issues = fetchIssues({ limit: 50 });
    if (issues.length === 0) {
      console.log(chalk.yellow('\nNo issues found. Using editor instead.'));
      return promptProjectScope({ ...options, scopeMethod: 'editor' });
    }

    console.log(formatIssueTable(issues));

    const { selection } = await inquirer.prompt([
      {
        type: 'input',
        name: 'selection',
        message: 'Select issues (e.g., 1,2,5-7 or "all"):',
        validate: v => v.length > 0 || 'Select at least one issue',
      },
    ]);

    const selectedIndices = parseSelection(selection, issues.length);
    return selectedIndices.map(i => issues[i]);
  }

  if (scopeMethod === 'manual') {
    const items = [];
    let addMore = true;

    while (addMore) {
      const { title, description } = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: `Item ${items.length + 1} title:`,
          validate: v => v.length > 0 || 'Title required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description (optional):',
          default: '',
        },
      ]);

      items.push({
        id: items.length + 1,
        title,
        body: description,
      });

      const { more } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'more',
          message: 'Add another item?',
          default: items.length < 5,
        },
      ]);

      addMore = more;
    }

    return items;
  }

  return [];
}

/**
 * Parse scope text into items grouped by project
 */
function parseProjectScope(scope) {
  const items = [];
  const lines = scope.split('\n');
  let currentProject = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Project header
    if (trimmed.startsWith('## Project') || trimmed.match(/^##\s+\d+[\.:]/)) {
      const titleMatch = trimmed.match(/^##\s+(?:Project\s+\d+:?\s*)?(.+)/);
      currentProject = {
        id: items.length + 1,
        title: titleMatch ? titleMatch[1].replace(/\[|\]/g, '').trim() : `Project ${items.length + 1}`,
        body: '',
        isProject: true,
      };
      items.push(currentProject);
    }
    // Bullet points as features/requirements
    else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-•*]\s*/, '').trim();
      if (text.length > 0) {
        if (currentProject) {
          currentProject.body += `\n- ${text}`;
        } else {
          items.push({
            id: items.length + 1,
            title: text,
            body: '',
          });
        }
      }
    }
  }

  // If no items found, create one from whole scope
  if (items.length === 0 && scope.trim().length > 0) {
    items.push({
      id: 1,
      title: 'Main Project',
      body: scope,
      isProject: true,
    });
  }

  return items;
}

/**
 * Prompt for execution configuration
 */
async function promptExecutionConfig() {
  console.log('');
  console.log(chalk.cyan.bold('⚙️ Step 3: Execution Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'parallel_discovery',
      message: 'Run L2 discovery in parallel for all projects?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'sequential_execution',
      message: 'Execute projects sequentially (safer) vs parallel?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'ralph_loop_enabled',
      message: 'Enable Ralph Loop (iterative test-fix cycles)?',
      default: false,
    },
    {
      type: 'list',
      name: 'testing_strategy',
      message: 'Testing strategy:',
      choices: [
        { name: 'Test per project completion', value: 'per-project' },
        { name: 'Test only at final completion', value: 'final-only' },
        { name: 'No automated testing', value: 'none' },
      ],
      default: 'per-project',
    },
  ]);

  return answers;
}

/**
 * Display projects in a table
 * @param {Array} projects - Projects to display
 */
export function displayProjectTable(projects) {
  console.log(chalk.dim('┌────┬────────────────────────────────────┬────────────┬─────────────┬────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Project                            ') + chalk.dim('│') + chalk.bold(' Domain     ') + chalk.dim('│') + chalk.bold(' Complexity  ') + chalk.dim('│') + chalk.bold(' Items  ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼────────────────────────────────────┼────────────┼─────────────┼────────┤'));

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const num = String(i + 1).padStart(2);
    const title = (project.project_title || '').substring(0, 34).padEnd(34);
    const domain = (project.domain || 'general').padEnd(10);
    const complexity = (project.complexity || 'M').padEnd(11);
    const items = String(project.itemCount || 0).padEnd(6);

    console.log(chalk.dim('│') + ` ${num} ` + chalk.dim('│') + ` ${title} ` + chalk.dim('│') + ` ${domain} ` + chalk.dim('│') + ` ${complexity} ` + chalk.dim('│') + ` ${items} ` + chalk.dim('│'));
  }

  console.log(chalk.dim('└────┴────────────────────────────────────┴────────────┴─────────────┴────────┘'));
}

/**
 * Edit projects interactively
 * @param {Array} projects - Projects to edit
 * @returns {Array} Edited projects
 */
export async function editProjects(projects) {
  console.log('');
  console.log(chalk.dim('Edit projects (leave blank to keep current value):'));
  console.log('');

  const editedProjects = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(chalk.cyan(`Project ${i + 1}: ${project.project_title}`));

    const { title, domain, complexity, action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        default: project.project_title,
      },
      {
        type: 'list',
        name: 'domain',
        message: 'Domain:',
        choices: ['frontend', 'backend', 'database', 'testing', 'deployment', 'general'],
        default: project.domain || 'general',
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
        default: project.complexity || 'M',
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
      editedProjects.push({
        ...project,
        project_title: title,
        domain,
        complexity,
      });
    }
  }

  // Option to add new projects
  const { addNew } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addNew',
      message: 'Add a new project?',
      default: false,
    },
  ]);

  if (addNew) {
    const { title, domain, complexity, description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'New project title:',
        validate: v => v.length > 0 || 'Required',
      },
      {
        type: 'list',
        name: 'domain',
        message: 'Domain:',
        choices: ['frontend', 'backend', 'database', 'testing', 'deployment', 'general'],
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: '',
      },
    ]);

    editedProjects.push({
      project_id: `project-${editedProjects.length + 1}`,
      project_title: title,
      domain,
      complexity,
      description,
      items: [],
      itemCount: 0,
      project_number: editedProjects.length + 1,
    });
  }

  return editedProjects;
}

/**
 * Run L2 discovery phase for all projects
 * @param {Object} roadmap - Multi-project roadmap
 * @param {Object} options - Options
 */
export async function runDiscoveryPhase(roadmap, options = {}) {
  const cwd = options.cwd || process.cwd();
  const spinner = ora('Running L2 discovery for all projects...').start();

  roadmap.status = 'discovering';

  for (let i = 0; i < roadmap.projects.length; i++) {
    const project = roadmap.projects[i];
    spinner.text = `L2 Discovery: ${project.project_title} (${i + 1}/${roadmap.projects.length})`;

    project.status = 'discovering';
    project.metadata.discovery_started = new Date().toISOString();

    try {
      // Initialize project orchestrator state
      await initProjectOrchestratorState(cwd, {
        projectId: project.project_id,
        projectTitle: project.project_title,
        roadmapId: roadmap.roadmap_id,
        explorationPath: project.exploration_path,
        phases: project.phases,
      });

      // Run L2 exploration
      const explorationConfig = {
        projectName: project.project_title,
        projectSlug: project.slug || generateSlug(project.project_title),
        description: project.description,
        architecture: {
          // Infer from domain
          frontend: project.domain === 'frontend' ? { framework: 'react' } : null,
          backend: project.domain === 'backend' ? { framework: 'express' } : null,
        },
        phases: [],
      };

      const explorationResult = await runL2Exploration(explorationConfig, {
        cwd,
        spinner: { text: '', succeed: () => {}, warn: () => {} }, // Suppress inner spinner
      });

      // Update project with exploration findings
      if (explorationResult) {
        project.l2_findings = {
          code_snippets: explorationResult.snippets || [],
          reference_files: explorationResult.files || { modify: [], reference: [], tests: [] },
          agent_delegation: explorationResult.delegation || { primary_agent: null, task_assignments: [], execution_sequence: [] },
        };

        project.phases = explorationResult.phases || [];
      }

      // Analyze for L2 delegation
      const delegation = analyzeProjectForL2Delegation(project);
      project.l2_findings.agent_delegation = {
        primary_agent: delegation.primaryAgent,
        task_assignments: delegation.taskAssignments,
        execution_sequence: delegation.executionSequence,
      };

      project.status = 'ready';
      project.metadata.discovery_completed = new Date().toISOString();

      // Mark discovery complete in state
      await markProjectDiscoveryComplete(cwd, project.project_id);

    } catch (error) {
      spinner.warn(`Discovery failed for ${project.project_title}: ${error.message}`);
      project.status = 'pending'; // Reset to pending
    }
  }

  // Update roadmap status
  const allReady = roadmap.projects.every(p => p.status === 'ready');
  roadmap.status = allReady ? 'active' : 'discovering';

  spinner.succeed(`L2 Discovery complete: ${roadmap.projects.filter(p => p.status === 'ready').length}/${roadmap.projects.length} projects ready`);
}

/**
 * Create GitHub issues for all projects in roadmap
 * @param {Object} roadmap - Multi-project roadmap
 */
async function createGitHubIssuesForRoadmap(roadmap) {
  const spinner = ora('Creating GitHub issues...').start();

  try {
    // Create project issues first
    let created = 0;
    for (const project of roadmap.projects) {
      spinner.text = `Creating issue for ${project.project_title}...`;

      const result = await createProjectIssue(project, roadmap);
      if (result.success) {
        project.github_issue_number = result.number;
        project.github_issue_url = result.url;
        created++;
      }
    }

    // Create Epic after all project issues
    spinner.text = 'Creating roadmap Epic...';
    const epicResult = await createRoadmapEpicAfterProjects(roadmap);

    if (epicResult.success) {
      roadmap.metadata.github_epic_number = epicResult.number;
      roadmap.metadata.github_epic_url = epicResult.url;
      roadmap.metadata.github_integrated = true;

      // Link projects to Epic
      spinner.text = 'Linking projects to Epic...';
      await linkProjectsToEpic(roadmap.projects, epicResult.number);
    }

    spinner.succeed(`Created ${created} project issues + 1 Epic`);
  } catch (error) {
    spinner.fail(`GitHub integration failed: ${error.message}`);
  }
}

/**
 * Display roadmap summary
 * @param {Object} roadmap - Created roadmap
 */
function displayRoadmapSummary(roadmap) {
  const totalTasks = roadmap.projects.reduce(
    (sum, p) => sum + (p.phases || []).reduce((s, ph) => s + (ph.tasks?.length || 0), 0),
    0
  );

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.green.bold('  ✓ Multi-Project Roadmap Created Successfully!                        ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + `  Roadmap: ${(roadmap.title || '').substring(0, 50).padEnd(58)}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  Projects: ${String(roadmap.projects.length).padEnd(57)}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  Total Tasks: ${String(totalTasks).padEnd(54)}` + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  Status: ${(roadmap.status || 'planning').padEnd(59)}` + chalk.cyan('║'));

  if (roadmap.metadata?.github_epic_number) {
    console.log(chalk.cyan('║') + chalk.dim(`  GitHub Epic: #${roadmap.metadata.github_epic_number}`.padEnd(69)) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Projects:'.padEnd(69)) + chalk.cyan('║'));

  for (const project of roadmap.projects) {
    const statusIcon = project.status === 'ready' ? '✓' : project.status === 'discovering' ? '…' : '○';
    const issueRef = project.github_issue_number ? ` (#${project.github_issue_number})` : '';
    console.log(chalk.cyan('║') + `    ${statusIcon} ${project.project_title}${issueRef}`.substring(0, 67).padEnd(67) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Next Steps:'.padEnd(69)) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  1. Review: /roadmap-status ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  2. Execute: /roadmap-execute ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

export default {
  runMultiProjectBuilder,
  runDiscoveryPhase,
  displayProjectTable,
  editProjects,
};
