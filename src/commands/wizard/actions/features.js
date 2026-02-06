/**
 * Feature Management
 *
 * Handles feature addition and Happy.engineering integration.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  loadReleaseNotes,
  markFeatureInstalled,
} from '../../../utils/version-check.js';

import { showRestartReminder } from '../helpers.js';
import { claudeAbsolutePath } from '../../../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Show menu to add available features
 */
export async function showAddFeaturesMenu() {
  const claudeDir = claudeAbsolutePath(process.cwd());
  const commandsDir = claudeAbsolutePath(process.cwd(), 'commands');

  if (!existsSync(claudeDir)) {
    console.log(chalk.yellow('\nNo .claude folder found. Run Quick Start (1) or Full Setup (2) first.\n'));
    return;
  }

  // Get existing commands
  const existingCommands = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md').map((f) => f.replace('.md', ''))
    : [];

  // Get all available features from releases
  const { releases, featureRegistry } = loadReleaseNotes();

  if (!featureRegistry || !featureRegistry.commands) {
    console.log(chalk.yellow('\n  No feature registry available.\n'));
    return;
  }

  // Find commands not yet installed
  const availableCommands = Object.entries(featureRegistry.commands)
    .filter(([name, info]) => !existingCommands.includes(name) && !info.required)
    .map(([name, info]) => {
      // Find description from releases
      let description = 'No description available';
      for (const release of releases) {
        const cmd = release.newFeatures?.commands?.find((c) => c.name === name);
        if (cmd) {
          description = cmd.description;
          break;
        }
      }
      return { name, description, addedIn: info.addedIn };
    });

  if (availableCommands.length === 0) {
    console.log(chalk.green('\nAll available commands are already installed!\n'));
    return;
  }

  console.log(chalk.bold('\nAvailable Commands to Add:\n'));
  console.log(chalk.dim('  Select commands to add to your project:\n'));

  const { selectedCommands } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCommands',
      message: 'Select commands to install:',
      choices: availableCommands.map((cmd) => ({
        name: `/${cmd.name} - ${cmd.description} ${chalk.dim(`(v${cmd.addedIn})`)}`,
        value: cmd.name,
        checked: false,
      })),
      pageSize: 15,
    },
  ]);

  if (selectedCommands.length === 0) {
    console.log(chalk.dim('\n  No commands selected.\n'));
    return;
  }

  // Install selected commands
  const spinner = ora('Installing commands...').start();
  const installed = [];
  const failed = [];

  // Get templates directory path
  const templatesDir = join(__dirname, '..', '..', '..', '..', 'templates', 'commands');

  for (const cmdName of selectedCommands) {
    try {
      // Look for template file
      const templatePath = join(templatesDir, `${cmdName}.template.md`);

      if (existsSync(templatePath)) {
        const content = readFileSync(templatePath, 'utf8');
        const cmdPath = join(commandsDir, `${cmdName}.md`);
        writeFileSync(cmdPath, content, 'utf8');
        installed.push(cmdName);
        markFeatureInstalled(cmdName);
      } else {
        failed.push({ name: cmdName, error: 'Template not found' });
      }
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

  if (installed.length > 0) {
    console.log(chalk.green(`\nInstalled ${installed.length} command(s):`));
    installed.forEach((cmd) => {
      console.log(`  ${chalk.cyan(`/${cmd}`)}`);
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\nFailed to install ${failed.length} command(s):`));
    failed.forEach((f) => {
      console.log(`  ${chalk.red(`/${f.name}`)}: ${f.error}`);
    });
  }

  if (installed.length > 0) {
    showRestartReminder();
  }
}

/**
 * Add features from a specific release
 * @param {Object} release - Release object
 */
export async function addFeaturesFromRelease(release) {
  const claudeDir = claudeAbsolutePath(process.cwd());
  const commandsDir = claudeAbsolutePath(process.cwd(), 'commands');

  if (!existsSync(claudeDir)) {
    console.log(chalk.yellow('\nNo .claude folder found. Run Quick Start (1) or Full Setup (2) first.\n'));
    return;
  }

  if (!release.newFeatures?.commands || release.newFeatures.commands.length === 0) {
    console.log(chalk.yellow('\n  No commands to add from this release.\n'));
    return;
  }

  // Get existing commands
  const existingCommands = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''))
    : [];

  // Filter to commands not yet installed
  const availableCommands = release.newFeatures.commands.filter((cmd) => !existingCommands.includes(cmd.name));

  if (availableCommands.length === 0) {
    console.log(chalk.green('\nAll commands from this release are already installed!\n'));
    return;
  }

  const { selectedCommands } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCommands',
      message: 'Select commands to install:',
      choices: availableCommands.map((cmd) => ({
        name: `/${cmd.name} - ${cmd.description}`,
        value: cmd.name,
        checked: true,
      })),
      pageSize: 10,
    },
  ]);

  if (selectedCommands.length === 0) {
    console.log(chalk.dim('\n  No commands selected.\n'));
    return;
  }

  // Install selected commands
  const spinner = ora('Installing commands...').start();
  const installed = [];
  const failed = [];

  // Get templates directory path
  const templatesDir = join(__dirname, '..', '..', '..', '..', 'templates', 'commands');

  for (const cmdName of selectedCommands) {
    try {
      const templatePath = join(templatesDir, `${cmdName}.template.md`);

      if (existsSync(templatePath)) {
        const content = readFileSync(templatePath, 'utf8');
        const cmdPath = join(commandsDir, `${cmdName}.md`);
        writeFileSync(cmdPath, content, 'utf8');
        installed.push(cmdName);
        markFeatureInstalled(cmdName);
      } else {
        failed.push({ name: cmdName, error: 'Template not found' });
      }
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

  if (installed.length > 0) {
    console.log(chalk.green(`\nInstalled ${installed.length} command(s):`));
    installed.forEach((cmd) => {
      console.log(`  ${chalk.cyan(`/${cmd}`)}`);
    });
    showRestartReminder();
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\nFailed to install ${failed.length} command(s):`));
    failed.forEach((f) => {
      console.log(`  ${chalk.red(`/${f.name}`)}: ${f.error}`);
    });
  }
}

/**
 * Install Happy.engineering - opens website and installs Happy commands/hooks
 */
export async function installHappyEngineering() {
  const cwd = process.cwd();
  const claudeDir = claudeAbsolutePath(cwd);
  const commandsDir = claudeAbsolutePath(cwd, 'commands');
  const hooksDir = claudeAbsolutePath(cwd, 'hooks');

  console.log(boxen(
    chalk.magenta.bold('Happy.engineering Integration\n\n') +
    chalk.white('This will:\n') +
    chalk.dim('  1. Open happy.engineering in your browser\n') +
    chalk.dim('  2. Install Happy commands to .claude/commands/\n') +
    chalk.dim('  3. Install Happy hooks to .claude/hooks/\n') +
    chalk.dim('  4. Optionally install the Happy CLI globally'),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'magenta' }
  ));

  // Confirm installation
  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with Happy.engineering installation?',
      default: true,
    },
  ]);

  if (!proceed) {
    console.log(chalk.dim('\nInstallation cancelled.\n'));
    return;
  }

  // Step 1: Open Happy.engineering in browser
  const spinner = ora('Opening happy.engineering...').start();
  try {
    const { exec } = await import('child_process');
    const url = 'https://happy.engineering';

    // Cross-platform browser open
    const platform = process.platform;
    let cmd;
    if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    await new Promise((resolve, reject) => {
      exec(cmd, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    spinner.succeed('Opened happy.engineering in browser');
  } catch {
    spinner.warn(`Could not open browser automatically. Visit: ${chalk.cyan('https://happy.engineering')}`);
  }

  // Step 2: Ensure .claude directories exist
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
    console.log(chalk.green('  Created .claude/'));
  }
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
    console.log(chalk.green('  Created .claude/commands/'));
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
    console.log(chalk.green('  Created .claude/hooks/'));
  }

  // Step 3: Install Happy commands
  const happyCommands = ['happy-start'];
  const templatesDir = join(__dirname, '..', '..', '..', '..', 'templates', 'commands');
  const installedCommands = [];

  console.log(chalk.bold('\nInstalling Happy commands...\n'));

  for (const cmdName of happyCommands) {
    try {
      const templatePath = join(templatesDir, `${cmdName}.template.md`);
      const destPath = join(commandsDir, `${cmdName}.md`);

      if (existsSync(templatePath)) {
        const content = readFileSync(templatePath, 'utf8');
        writeFileSync(destPath, content, 'utf8');
        installedCommands.push(cmdName);
        console.log(chalk.green(`  commands/${cmdName}.md`));
      } else {
        console.log(chalk.yellow(`  Template not found: ${cmdName}`));
      }
    } catch (error) {
      console.log(chalk.red(`  Failed: ${cmdName} - ${error.message}`));
    }
  }

  // Step 4: Install Happy hooks
  const happyHooks = [
    'happy-checkpoint-manager',
    'happy-title-generator',
    'happy-mode-detector',
    'context-injector',
  ];
  const hooksTemplatesDir = join(__dirname, '..', '..', '..', '..', 'templates', 'hooks');
  const installedHooks = [];

  console.log(chalk.bold('\nInstalling Happy hooks...\n'));

  for (const hookName of happyHooks) {
    try {
      const templatePath = join(hooksTemplatesDir, `${hookName}.template.js`);
      const destPath = join(hooksDir, `${hookName}.js`);

      if (existsSync(templatePath)) {
        const content = readFileSync(templatePath, 'utf8');
        writeFileSync(destPath, content, 'utf8');
        installedHooks.push(hookName);
        console.log(chalk.green(`  hooks/${hookName}.js`));
      } else {
        console.log(chalk.yellow(`  Template not found: ${hookName}`));
      }
    } catch (error) {
      console.log(chalk.red(`  Failed: ${hookName} - ${error.message}`));
    }
  }

  // Step 5: Optionally install Happy CLI globally
  const { installCli } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'installCli',
      message: 'Install Happy Coder CLI globally? (npm i -g happy-coder)',
      default: false,
    },
  ]);

  if (installCli) {
    const npmSpinner = ora('Installing happy-coder CLI...').start();
    try {
      const { execSync } = await import('child_process');
      execSync('npm i -g happy-coder', { stdio: 'pipe' });
      npmSpinner.succeed('Installed happy-coder CLI globally');
    } catch (error) {
      npmSpinner.fail(`Failed to install: ${error.message}`);
      console.log(chalk.dim('  You can install manually: npm i -g happy-coder'));
    }
  }

  // Summary
  console.log(boxen(
    chalk.green.bold('Happy.engineering installed!\n\n') +
    chalk.white(`Commands: ${installedCommands.length} installed\n`) +
    chalk.white(`Hooks: ${installedHooks.length} installed\n\n`) +
    chalk.dim('Use /happy-start to begin a Happy session\n') +
    chalk.dim('Learn more: https://happy.engineering'),
    { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
  ));

  showRestartReminder();
}
