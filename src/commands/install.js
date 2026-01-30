/**
 * Install Command
 *
 * Install Claude Code command integration
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showError, showWarning } from '../cli/menu.js';
import { loadConfigSync } from '../utils.js';
import { generateClaudeCommand, generateMinimalClaudeCommand } from '../templates/claude-command.js';

/**
 * Run the install command
 */
export async function runInstall(options) {
  showHeader('Install Claude Code Integration');

  // Load config if available
  const { config } = loadConfigSync();

  // Determine target path
  let targetPath = options.path;

  if (!targetPath) {
    // Try to find .claude/commands/ directory
    const possiblePaths = [
      join(process.cwd(), '.claude', 'commands'),
      join(process.cwd(), '.claude'),
    ];

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        targetPath = p.endsWith('commands') ? p : join(p, 'commands');
        break;
      }
    }

    if (!targetPath) {
      console.log(chalk.dim('No .claude/commands/ directory found.'));

      const { createDir } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createDir',
          message: 'Create .claude/commands/ directory?',
          default: true,
        },
      ]);

      if (createDir) {
        targetPath = join(process.cwd(), '.claude', 'commands');
        mkdirSync(targetPath, { recursive: true });
        console.log(chalk.green(`✓ Created ${targetPath}`));
      } else {
        showError('No target directory');
        return;
      }
    }
  }

  // Check if command already exists
  const commandFile = join(targetPath, 'github-create-task.md');
  if (existsSync(commandFile) && !options.force) {
    showWarning(`Command already exists: ${commandFile}`);

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite existing command?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  // Generate command content
  let commandContent;

  if (config?.project_board) {
    // Full command with project configuration
    const { commandType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'commandType',
        message: 'Command type:',
        choices: [
          {
            name: 'Full (comprehensive with all features)',
            value: 'full',
          },
          {
            name: 'Minimal (basic issue creation)',
            value: 'minimal',
          },
        ],
      },
    ]);

    const templateConfig = {
      owner: config.project_board.owner,
      repo: config.project_board.repo,
      projectNumber: config.project_board.project_number,
      projectId: config.project_board.project_id,
      fieldIds: config.field_ids,
      statusOptions: config.status_options,
    };

    commandContent =
      commandType === 'full'
        ? generateClaudeCommand(templateConfig)
        : generateMinimalClaudeCommand(templateConfig);
  } else {
    // Prompt for basic info
    showWarning('No gtask configuration found. Creating command with placeholders.');

    const { owner, repo, projectNumber } = await inquirer.prompt([
      {
        type: 'input',
        name: 'owner',
        message: 'GitHub owner (username or org):',
        default: 'YOUR_USERNAME',
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Repository name:',
        default: 'YOUR_REPO',
      },
      {
        type: 'input',
        name: 'projectNumber',
        message: 'Project board number (or Enter to skip):',
        default: '1',
      },
    ]);

    commandContent = generateMinimalClaudeCommand({
      owner,
      repo,
      projectNumber: parseInt(projectNumber, 10) || 1,
    });
  }

  // Write the command file
  const spinner = ora(`Writing ${commandFile}...`).start();

  try {
    // Ensure directory exists
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(commandFile, commandContent, 'utf8');
    spinner.succeed('Command installed');
  } catch (error) {
    spinner.fail(`Failed to write: ${error.message}`);
    return;
  }

  showSuccess('Claude Code Integration Installed!', [
    `Command file: ${commandFile}`,
    '',
    'Usage in Claude Code:',
    '  /github-create-task',
    '',
    'The command will guide you through:',
    '  - Issue title and description',
    '  - Labels and priority selection',
    '  - Codebase analysis (via Claude)',
    '  - Issue creation and project board update',
  ]);

  // Also create config template if not exists
  const configTemplatePath = join(targetPath, '..', 'config', 'github-field-mappings.template.yaml');
  if (!existsSync(configTemplatePath)) {
    const { createTemplate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createTemplate',
        message: 'Create configuration template file?',
        default: true,
      },
    ]);

    if (createTemplate) {
      const configDir = join(targetPath, '..', 'config');
      mkdirSync(configDir, { recursive: true });

      const templateContent = generateConfigTemplate(config);
      writeFileSync(configTemplatePath, templateContent, 'utf8');
      console.log(chalk.green(`✓ Created ${configTemplatePath}`));
    }
  }
}

/**
 * Generate config template content
 */
function generateConfigTemplate(existingConfig) {
  const config = existingConfig?.project_board || {};

  return `# GitHub Project Configuration Template
# Copy this to github-field-mappings.yaml and fill in your values

project_board:
  owner: "${config.owner || 'YOUR_GITHUB_USERNAME'}"
  repo: "${config.repo || 'YOUR_REPO_NAME'}"
  project_number: ${config.project_number || 1}
  project_id: "${config.project_id || 'PVT_YOUR_PROJECT_ID'}"

field_ids:
  # Get field IDs via: gh project field-list <number> --owner <owner> --format json
  status: "${existingConfig?.field_ids?.status || 'PVTSSF_YOUR_STATUS_FIELD_ID'}"
  priority: "${existingConfig?.field_ids?.priority || 'PVTSSF_YOUR_PRIORITY_FIELD_ID'}"

status_options:
  # Get option IDs via GraphQL (see README)
  todo: "${existingConfig?.status_options?.todo || 'YOUR_TODO_OPTION_ID'}"
  in_progress: "${existingConfig?.status_options?.in_progress || 'YOUR_IN_PROGRESS_OPTION_ID'}"
  done: "${existingConfig?.status_options?.done || 'YOUR_DONE_OPTION_ID'}"

priority_options:
  p0: "${existingConfig?.priority_options?.p0 || ''}"
  p1: "${existingConfig?.priority_options?.p1 || ''}"
  p2: "${existingConfig?.priority_options?.p2 || ''}"
  p3: "${existingConfig?.priority_options?.p3 || ''}"

labels:
  type:
    - bug
    - feature
    - feature-update
    - refactor
    - documentation
  stack:
    - frontend
    - backend
  priority:
    - P0-Critical
    - P1-High
    - P2-Medium
    - P3-Low
`;
}
