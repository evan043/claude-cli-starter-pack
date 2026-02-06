/**
 * Setup Command
 *
 * Interactive wizard to configure GitHub project connection
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { stringify as yamlStringify } from 'yaml';
import { showHeader, showSuccess, showError, showWarning } from '../cli/menu.js';
import { createLogger } from '../utils/logger.js';
import {
  getCurrentUser,
  listRepos,
  repoExists,
  listProjects,
  getProject,
  listProjectFields,
  getAllFieldOptions,
} from '../github/client.js';

const log = createLogger('setup');

/**
 * Run the setup wizard
 */
export async function runSetup(options) {
  showHeader('GitHub Project Setup');

  const config = {
    project_board: {},
    field_ids: {},
    status_options: {},
    priority_options: {},
    labels: {
      type: ['bug', 'feature', 'feature-update', 'refactor', 'documentation'],
      stack: ['frontend', 'backend'],
      priority: ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'],
    },
  };

  // Step 1: Get current user
  const spinner = ora('Checking GitHub authentication...').start();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    spinner.fail('Not authenticated with GitHub');
    console.log('');
    console.log(chalk.yellow('Run: gh auth login'));
    return;
  }

  spinner.succeed(`Authenticated as ${chalk.bold(currentUser)}`);
  console.log('');

  // Step 2: Select owner (user or org)
  let owner = options.owner;

  if (!owner) {
    const { ownerChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'ownerChoice',
        message: 'GitHub owner (user or organization):',
        choices: [
          { name: `${currentUser} (your account)`, value: currentUser },
          { name: 'Enter different owner...', value: '_other' },
        ],
      },
    ]);

    if (ownerChoice === '_other') {
      const { customOwner } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customOwner',
          message: 'Enter GitHub username or organization:',
          validate: (input) => (input.trim() ? true : 'Owner is required'),
        },
      ]);
      owner = customOwner.trim();
    } else {
      owner = ownerChoice;
    }
  }

  config.project_board.owner = owner;
  console.log('');

  // Step 3: Select repository
  let repo = options.repo;

  if (!repo) {
    const repoSpinner = ora(`Fetching repositories for ${owner}...`).start();
    const repos = listRepos(owner, { limit: 50 });
    repoSpinner.stop();

    if (repos.length === 0) {
      showWarning(`No repositories found for ${owner}`);
      const { customRepo } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customRepo',
          message: 'Enter repository name:',
          validate: (input) => (input.trim() ? true : 'Repository is required'),
        },
      ]);
      repo = customRepo.trim();
    } else {
      const repoChoices = repos.map((r) => ({
        name: `${r.name}${r.isPrivate ? chalk.dim(' (private)') : ''} ${
          r.description ? chalk.dim(`- ${  r.description.slice(0, 40)}`) : ''
        }`,
        value: r.name,
      }));
      repoChoices.push({ name: 'Enter manually...', value: '_other' });

      const { repoChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'repoChoice',
          message: 'Select repository:',
          choices: repoChoices,
          pageSize: 15,
        },
      ]);

      if (repoChoice === '_other') {
        const { customRepo } = await inquirer.prompt([
          {
            type: 'input',
            name: 'customRepo',
            message: 'Enter repository name:',
            validate: (input) => (input.trim() ? true : 'Repository is required'),
          },
        ]);
        repo = customRepo.trim();
      } else {
        repo = repoChoice;
      }
    }
  }

  // Verify repo access
  const verifySpinner = ora(`Verifying access to ${owner}/${repo}...`).start();
  if (!repoExists(owner, repo)) {
    verifySpinner.fail(`Cannot access ${owner}/${repo}`);
    console.log(
      chalk.yellow('Check that the repository exists and you have access.')
    );
    return;
  }
  verifySpinner.succeed(`Repository ${owner}/${repo} accessible`);

  config.project_board.repo = repo;
  console.log('');

  // Step 4: Select project board
  let projectNumber = options.project ? parseInt(options.project, 10) : null;

  if (!projectNumber) {
    const projectSpinner = ora(`Fetching projects for ${owner}...`).start();
    const projects = listProjects(owner);
    projectSpinner.stop();

    if (projects.length === 0) {
      showWarning(`No projects found for ${owner}`);
      console.log(
        chalk.dim(`Create a project at: https://github.com/users/${  owner  }/projects`)
      );

      const { customProject } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customProject',
          message: 'Enter project number (or press Enter to skip):',
        },
      ]);

      if (customProject.trim()) {
        projectNumber = parseInt(customProject.trim(), 10);
      }
    } else {
      const projectChoices = projects.map((p) => ({
        name: `#${p.number} - ${p.title}`,
        value: p.number,
      }));
      projectChoices.push({ name: 'Skip project board setup', value: null });

      const { projectChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectChoice',
          message: 'Select project board:',
          choices: projectChoices,
        },
      ]);

      projectNumber = projectChoice;
    }
  }

  if (projectNumber) {
    config.project_board.project_number = projectNumber;

    // Get project ID
    const projectSpinner = ora('Fetching project details...').start();
    const project = getProject(owner, projectNumber);

    if (project) {
      config.project_board.project_id = project.id;
      projectSpinner.succeed(`Project: ${project.title}`);

      // Step 5: Get field IDs
      console.log('');
      const fieldSpinner = ora('Analyzing project fields...').start();
      const fields = listProjectFields(owner, projectNumber);
      fieldSpinner.stop();

      if (fields.length > 0) {
        log.debug('Found fields:');
        for (const field of fields) {
          log.debug(`  - ${field.name} (${field.id})`);
        }
        console.log('');

        // Auto-detect common fields
        const statusField = fields.find(
          (f) => f.name.toLowerCase() === 'status'
        );
        const priorityField = fields.find(
          (f) =>
            f.name.toLowerCase() === 'priority' ||
            f.name.toLowerCase().includes('priority')
        );

        if (statusField) {
          config.field_ids.status = statusField.id;
          log.info(chalk.green(`✓ Status field: ${statusField.id}`));
        }

        if (priorityField) {
          config.field_ids.priority = priorityField.id;
          log.info(chalk.green(`✓ Priority field: ${priorityField.id}`));
        }

        // Get field options via GraphQL
        console.log('');
        const optionsSpinner = ora('Fetching field options...').start();
        const allFieldOptions = getAllFieldOptions(project.id);
        optionsSpinner.stop();

        for (const field of allFieldOptions) {
          if (field.options && field.options.length > 0) {
            log.debug(`\n${field.name} options:`);
            for (const opt of field.options) {
              log.debug(`  - ${opt.name}: ${opt.id}`);
            }

            // Auto-map status options
            if (field.name.toLowerCase() === 'status') {
              for (const opt of field.options) {
                const optLower = opt.name.toLowerCase();
                if (optLower === 'todo' || optLower === 'to do') {
                  config.status_options.todo = opt.id;
                } else if (
                  optLower === 'in progress' ||
                  optLower === 'in_progress'
                ) {
                  config.status_options.in_progress = opt.id;
                } else if (optLower === 'done' || optLower === 'completed') {
                  config.status_options.done = opt.id;
                }
              }
            }

            // Auto-map priority options
            if (
              field.name.toLowerCase() === 'priority' ||
              field.name.toLowerCase().includes('priority')
            ) {
              for (const opt of field.options) {
                const optLower = opt.name.toLowerCase();
                if (optLower.includes('p0') || optLower.includes('critical')) {
                  config.priority_options.p0 = opt.id;
                } else if (optLower.includes('p1') || optLower.includes('high')) {
                  config.priority_options.p1 = opt.id;
                } else if (optLower.includes('p2') || optLower.includes('medium')) {
                  config.priority_options.p2 = opt.id;
                } else if (optLower.includes('p3') || optLower.includes('low')) {
                  config.priority_options.p3 = opt.id;
                }
              }
            }
          }
        }
      }
    } else {
      projectSpinner.warn('Could not fetch project details');
    }
  }

  console.log('');

  // Step 6: Choose config location
  const { configLocation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'configLocation',
      message: 'Where should we save the configuration?',
      choices: [
        {
          name: `${process.cwd()}/.gtaskrc ${chalk.dim('(project-local)')}`,
          value: 'local',
        },
        {
          name: `~/.gtaskrc ${chalk.dim('(global, all projects)')}`,
          value: 'global',
        },
      ],
    },
  ]);

  // Determine path
  const configPath =
    configLocation === 'global'
      ? join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc')
      : join(process.cwd(), '.gtaskrc');

  // Write config
  const saveSpinner = ora(`Saving configuration to ${configPath}...`).start();

  try {
    const yamlContent = yamlStringify(config);
    writeFileSync(configPath, yamlContent, 'utf8');
    saveSpinner.succeed('Configuration saved');
  } catch (error) {
    saveSpinner.fail(`Failed to save: ${error.message}`);
    return;
  }

  // Summary
  showSuccess('Setup Complete!', [
    `Owner: ${config.project_board.owner}`,
    `Repo: ${config.project_board.repo}`,
    `Project: #${config.project_board.project_number || 'none'}`,
    `Config: ${configPath}`,
    '',
    'Run "gtask create" to create your first task!',
  ]);
}
