/**
 * gtask-init - Global Project Initialization
 *
 * This command can be run from any Claude Code session to initialize
 * the advanced starter pack in the current project directory.
 *
 * Features:
 * - Auto-detects tech stack from codebase
 * - Creates tech-stack.json with detected values
 * - Generates templated .claude files
 * - Sets up GitHub integration
 * - Configures testing framework
 *
 * SUBMODULES:
 * - gtask-init/detection.js - displayDetectedStack, customizeSettings, fullSetup
 * - gtask-init/integrations.js - configureIntegrations
 * - gtask-init/templates.js - generateCommandTemplates, generateTestingRules
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectTechStack } from './detect-tech-stack.js';
import { showHeader, showSuccess, showError } from '../cli/menu.js';
import { displayDetectedStack, customizeSettings, fullSetup } from './gtask-init/detection.js';
import { configureIntegrations } from './gtask-init/integrations.js';
import { generateCommandTemplates } from './gtask-init/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main initialization wizard
 */
export async function runGtaskInit(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  showHeader('Claude CLI Advanced Starter Pack - Project Setup');

  console.log(chalk.dim('This wizard will configure the advanced starter pack for your project.\n'));

  // Check if already initialized
  const techStackPath = join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (existsSync(techStackPath)) {
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: chalk.yellow('Project already initialized. Re-run setup?'),
        default: false,
      },
    ]);
    if (!proceed) {
      console.log(chalk.dim('Setup cancelled.'));
      return null;
    }
  }

  // Step 1: Detect tech stack
  console.log(chalk.cyan('\n📦 Step 1: Detecting Tech Stack\n'));

  const spinner = ora('Scanning codebase...').start();
  let detected;

  try {
    detected = await detectTechStack(projectRoot, { silent: true });
    delete detected._detected;
    spinner.succeed('Codebase analysis complete');
  } catch (err) {
    spinner.fail('Detection failed');
    showError('Could not analyze codebase', err.message);
    detected = { version: '1.0.0', project: { name: '', rootPath: '.' } };
  }

  // Display detected values
  console.log('');
  displayDetectedStack(detected);

  // Step 2: Confirm and customize
  console.log(chalk.cyan('\n📝 Step 2: Review & Customize\n'));

  const { customize } = await inquirer.prompt([
    {
      type: 'list',
      name: 'customize',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Accept detected values', value: 'accept' },
        { name: 'Customize settings', value: 'customize' },
        { name: 'Start from scratch', value: 'scratch' },
      ],
    },
  ]);

  let techStack = detected;

  if (customize === 'customize') {
    techStack = await customizeSettings(detected);
  } else if (customize === 'scratch') {
    techStack = await fullSetup();
  }

  // Step 3: Configure integrations
  console.log(chalk.cyan('\n🔗 Step 3: Configure Integrations\n'));

  techStack = await configureIntegrations(techStack);

  // Step 4: Save configuration
  console.log(chalk.cyan('\n💾 Step 4: Save Configuration\n'));

  // Ensure directories exist
  const configDir = join(projectRoot, '.claude', 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Save tech-stack.json
  writeFileSync(
    join(configDir, 'tech-stack.json'),
    JSON.stringify(techStack, null, 2),
    'utf8'
  );

  console.log(chalk.green('✓ Saved: .claude/config/tech-stack.json'));

  // Step 5: Generate templates
  const { generateTemplates } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generateTemplates',
      message: 'Generate .claude command templates?',
      default: true,
    },
  ]);

  if (generateTemplates) {
    await generateCommandTemplates(projectRoot, techStack);
  }

  // Step 6: Complete
  console.log(chalk.cyan('\n✅ Setup Complete!\n'));

  showSuccess('Project Initialized', [
    'Tech stack: .claude/config/tech-stack.json',
    generateTemplates ? 'Commands: .claude/commands/' : '',
    '',
    'Next steps:',
    '  1. Review generated files',
    '  2. Run "gtask claude-settings" to fine-tune',
    '  3. Use "/create-task-list" to start working',
  ].filter(Boolean));

  return techStack;
}

export default { runGtaskInit };
