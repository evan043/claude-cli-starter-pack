/**
 * Wizard Action Handlers
 *
 * Action handlers for wizard steps including install flows,
 * restore operations, remove functionality, and feature management.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

import { runInit } from '../init.js';
import { runList } from '../list.js';
import {
  loadReleaseNotes,
  markFeatureInstalled,
  getCurrentVersion,
} from '../../utils/version-check.js';

import {
  copyDirRecursive,
  findExistingBackups,
  showRestartReminder,
  launchClaudeCLI,
} from './helpers.js';

import {
  getAllFeatures,
  mapFeaturesToInit,
  getDefaultFeatures,
  getAllInitFeatures,
} from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Restore from a backup
 * @param {Array} backups - Array of backup objects
 * @returns {boolean} True if restore succeeded
 */
export async function runRestore(backups) {
  if (backups.length === 0) {
    console.log(chalk.yellow('\nNo backups found in .claude-backup/\n'));
    return false;
  }

  console.log(chalk.bold('\nAvailable backups:\n'));

  const choices = backups.map((backup, index) => {
    const contents = [];
    if (backup.hasClaudeDir) contents.push('.claude/');
    if (backup.hasClaudeMd) contents.push('CLAUDE.md');

    return {
      name: `${chalk.yellow(`${index + 1}.`)} ${backup.date} ${chalk.dim(`(${contents.join(', ')})`)}`,
      value: backup,
      short: backup.date,
    };
  });

  choices.push({
    name: `${chalk.green('0.')} Cancel`,
    value: null,
    short: 'Cancel',
  });

  const { selectedBackup } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedBackup',
      message: 'Select a backup to restore:',
      choices,
    },
  ]);

  if (!selectedBackup) {
    console.log(chalk.dim('\nCancelled. No changes made.\n'));
    return false;
  }

  // Confirm restore
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
  const willOverwrite = [];

  if (existsSync(claudeDir) && selectedBackup.hasClaudeDir) {
    willOverwrite.push('.claude/');
  }
  if (existsSync(claudeMdPath) && selectedBackup.hasClaudeMd) {
    willOverwrite.push('CLAUDE.md');
  }

  if (willOverwrite.length > 0) {
    console.log(chalk.yellow(`\nThis will overwrite: ${willOverwrite.join(', ')}`));
  }

  const { confirmRestore } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmRestore',
      message: `Restore from backup "${selectedBackup.date}"?`,
      default: true,
    },
  ]);

  if (!confirmRestore) {
    console.log(chalk.dim('\nCancelled. No changes made.\n'));
    return false;
  }

  const spinner = ora('Restoring from backup...').start();

  try {
    // Restore .claude folder
    if (selectedBackup.hasClaudeDir) {
      const backupClaudeDir = join(selectedBackup.path, '.claude');
      if (existsSync(claudeDir)) {
        rmSync(claudeDir, { recursive: true, force: true });
      }
      copyDirRecursive(backupClaudeDir, claudeDir);
      spinner.text = 'Restored .claude folder...';
    }

    // Restore CLAUDE.md
    if (selectedBackup.hasClaudeMd) {
      const backupClaudeMd = join(selectedBackup.path, 'CLAUDE.md');
      copyFileSync(backupClaudeMd, claudeMdPath);
      spinner.text = 'Restored CLAUDE.md...';
    }

    spinner.succeed('Backup restored successfully!');

    console.log(
      boxen(
        chalk.green('Restored from backup\n\n') +
          `Backup date: ${chalk.cyan(selectedBackup.date)}\n` +
          (selectedBackup.hasClaudeDir ? `  - ${chalk.cyan('.claude/')} restored\n` : '') +
          (selectedBackup.hasClaudeMd ? `  - ${chalk.cyan('CLAUDE.md')} restored\n` : '') +
          '\n' +
          chalk.dim('Restart Claude Code CLI to use restored configuration.'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
        }
      )
    );

    return true;
  } catch (error) {
    spinner.fail('Restore failed');
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Remove CCASP from a project
 * @returns {boolean} True if removal succeeded
 */
export async function runRemove() {
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
  const existingBackups = findExistingBackups();

  // Check if there's anything to work with
  const hasClaudeDir = existsSync(claudeDir);
  const hasClaudeMd = existsSync(claudeMdPath);

  if (!hasClaudeDir && existingBackups.length === 0) {
    console.log(chalk.yellow('\nNo .claude folder found in this project.\n'));
    if (!hasClaudeMd) {
      return false;
    }
  }

  // Show what will be removed
  console.log(chalk.bold('\nCCASP files found in this project:\n'));

  const itemsToRemove = [];

  // Check for commands
  const commandsDir = join(claudeDir, 'commands');
  if (existsSync(commandsDir)) {
    const commands = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
    if (commands.length > 0) {
      console.log(`  ${chalk.cyan('commands/')} - ${commands.length} command(s)`);
      itemsToRemove.push({ type: 'dir', path: commandsDir, label: 'commands/' });
    }
  }

  // Check for agents
  const agentsDir = join(claudeDir, 'agents');
  if (existsSync(agentsDir)) {
    const agents = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    if (agents.length > 0) {
      console.log(`  ${chalk.cyan('agents/')} - ${agents.length} agent(s)`);
      itemsToRemove.push({ type: 'dir', path: agentsDir, label: 'agents/' });
    }
  }

  // Check for skills
  const skillsDir = join(claudeDir, 'skills');
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir).filter(f => !f.startsWith('.'));
    if (skills.length > 0) {
      console.log(`  ${chalk.cyan('skills/')} - ${skills.length} skill(s)`);
      itemsToRemove.push({ type: 'dir', path: skillsDir, label: 'skills/' });
    }
  }

  // Check for hooks
  const hooksDir = join(claudeDir, 'hooks');
  if (existsSync(hooksDir)) {
    const hooks = readdirSync(hooksDir).filter(f => f.endsWith('.js'));
    if (hooks.length > 0) {
      console.log(`  ${chalk.cyan('hooks/')} - ${hooks.length} hook(s)`);
      itemsToRemove.push({ type: 'dir', path: hooksDir, label: 'hooks/' });
    }
  }

  // Check for docs
  const docsDir = join(claudeDir, 'docs');
  if (existsSync(docsDir)) {
    console.log(`  ${chalk.cyan('docs/')} - documentation`);
    itemsToRemove.push({ type: 'dir', path: docsDir, label: 'docs/' });
  }

  // Check for config files
  const configFiles = ['settings.json', 'settings.local.json', 'tech-stack.json'];
  for (const file of configFiles) {
    const filePath = join(claudeDir, file);
    if (existsSync(filePath)) {
      console.log(`  ${chalk.cyan(file)}`);
      itemsToRemove.push({ type: 'file', path: filePath, label: file });
    }
  }

  // Check for CLAUDE.md in project root
  if (hasClaudeMd) {
    console.log(`  ${chalk.cyan('CLAUDE.md')} ${chalk.dim('(project root)')}`);
    itemsToRemove.push({ type: 'file', path: claudeMdPath, label: 'CLAUDE.md', isRoot: true });
  }

  if (itemsToRemove.length === 0 && existingBackups.length === 0) {
    console.log(chalk.yellow('  No CCASP items found.\n'));
    return false;
  }

  // Show existing backups count
  if (existingBackups.length > 0) {
    console.log(chalk.dim(`\n  ${existingBackups.length} backup(s) available in .claude-backup/`));
  }

  console.log('');

  // Removal options - dynamically build based on what exists
  const removeChoices = [];

  if (itemsToRemove.length > 0) {
    removeChoices.push(
      {
        name: `${chalk.red('1.')} Remove ALL ${chalk.dim('- Delete .claude/ and CLAUDE.md')}`,
        value: 'all',
        short: 'Remove All',
      },
      {
        name: `${chalk.yellow('2.')} Remove with backup ${chalk.dim('- Full backup to .claude-backup/ first')}`,
        value: 'backup',
        short: 'Backup & Remove',
      },
      {
        name: `${chalk.cyan('3.')} Selective removal ${chalk.dim('- Choose what to remove')}`,
        value: 'selective',
        short: 'Selective',
      }
    );
  }

  if (existingBackups.length > 0) {
    removeChoices.push({
      name: `${chalk.green('4.')} Restore from backup ${chalk.dim(`- ${existingBackups.length} backup(s) available`)}`,
      value: 'restore',
      short: 'Restore',
    });
  }

  removeChoices.push({
    name: `${chalk.dim('0.')} Cancel ${chalk.dim('- Keep everything')}`,
    value: 'cancel',
    short: 'Cancel',
  });

  const { removeAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'removeAction',
      message: 'What would you like to do?',
      choices: removeChoices,
    },
  ]);

  if (removeAction === 'cancel') {
    console.log(chalk.dim('\nCancelled. No changes made.\n'));
    return false;
  }

  // Handle restore action
  if (removeAction === 'restore') {
    return await runRestore(existingBackups);
  }

  if (removeAction === 'backup' || removeAction === 'all') {
    // Confirm dangerous action
    const { confirmRemove } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmRemove',
        message: chalk.red(`Are you sure you want to ${removeAction === 'all' ? 'DELETE' : 'backup and delete'} all CCASP files?`),
        default: false,
      },
    ]);

    if (!confirmRemove) {
      console.log(chalk.dim('\nCancelled. No changes made.\n'));
      return false;
    }
  }

  const spinner = ora('Processing...').start();

  try {
    if (removeAction === 'backup') {
      // Create backup first - include timestamp folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupDir = join(process.cwd(), '.claude-backup', timestamp);
      mkdirSync(backupDir, { recursive: true });

      // Copy entire .claude folder to backup (nested under .claude/)
      if (hasClaudeDir) {
        const backupClaudeDir = join(backupDir, '.claude');
        copyDirRecursive(claudeDir, backupClaudeDir);
        spinner.text = 'Backed up .claude folder...';
      }

      // Also backup CLAUDE.md if it exists
      if (hasClaudeMd) {
        copyFileSync(claudeMdPath, join(backupDir, 'CLAUDE.md'));
        spinner.text = 'Backed up CLAUDE.md...';
      }

      spinner.succeed(`Backed up to ${chalk.cyan(backupDir)}`);

      // Then remove .claude folder
      if (hasClaudeDir) {
        spinner.start('Removing .claude folder...');
        rmSync(claudeDir, { recursive: true, force: true });
        spinner.succeed('.claude folder removed');
      }

      // Remove CLAUDE.md
      if (hasClaudeMd) {
        spinner.start('Removing CLAUDE.md...');
        rmSync(claudeMdPath, { force: true });
        spinner.succeed('CLAUDE.md removed');
      }

      console.log(
        boxen(
          chalk.green('CCASP removed with full backup\n\n') +
            `Backup location:\n${chalk.cyan(backupDir)}\n\n` +
            chalk.bold('Contents backed up:\n') +
            (hasClaudeDir ? `  - ${chalk.cyan('.claude/')} folder\n` : '') +
            (hasClaudeMd ? `  - ${chalk.cyan('CLAUDE.md')} file\n` : '') +
            '\n' +
            chalk.dim('To restore: run ') + chalk.cyan('ccasp wizard') + chalk.dim(' -> Remove CCASP -> Restore'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } else if (removeAction === 'all') {
      // Remove without backup
      if (hasClaudeDir) {
        rmSync(claudeDir, { recursive: true, force: true });
        spinner.text = '.claude folder removed...';
      }

      if (hasClaudeMd) {
        rmSync(claudeMdPath, { force: true });
        spinner.text = 'CLAUDE.md removed...';
      }

      spinner.succeed('CCASP files removed');

      console.log(
        boxen(
          chalk.green('CCASP removed\n\n') +
            chalk.yellow('No backup was created.\n\n') +
            chalk.dim('Run ') + chalk.cyan('ccasp wizard') + chalk.dim(' to set up again.'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } else if (removeAction === 'selective') {
      spinner.stop();

      // Let user select what to remove
      const { itemsToDelete } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'itemsToDelete',
          message: 'Select items to remove:',
          choices: itemsToRemove.map((item) => ({
            name: item.isRoot ? `${item.label} ${chalk.dim('(project root)')}` : item.label,
            value: item,
            checked: false,
          })),
        },
      ]);

      if (itemsToDelete.length === 0) {
        console.log(chalk.dim('\nNo items selected. No changes made.\n'));
        return false;
      }

      // Create backups for selected items in .claude-backup/ (not .claude/backups/)
      // This ensures backups survive if user removes entire .claude folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupDir = join(process.cwd(), '.claude-backup', `selective-${timestamp}`);
      const backupClaudeDir = join(backupDir, '.claude');
      mkdirSync(backupClaudeDir, { recursive: true });

      for (const item of itemsToDelete) {
        // Determine backup destination - CLAUDE.md goes to backup root, others under .claude/
        const backupDest = item.isRoot ? join(backupDir, basename(item.path)) : join(backupClaudeDir, basename(item.path));

        if (item.type === 'dir') {
          copyDirRecursive(item.path, backupDest);
          rmSync(item.path, { recursive: true, force: true });
        } else {
          // Ensure parent directory exists
          const parentDir = dirname(backupDest);
          if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
          }
          copyFileSync(item.path, backupDest);
          rmSync(item.path, { force: true });
        }
        console.log(`  ${chalk.red('x')} Removed ${item.label}`);
      }

      console.log(
        boxen(
          chalk.green('Selected items removed\n\n') +
            `Backup location:\n${chalk.cyan(backupDir)}\n\n` +
            chalk.dim('To restore: run ') + chalk.cyan('ccasp wizard') + chalk.dim(' -> Remove CCASP -> Restore'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    }

    return true;
  } catch (error) {
    spinner.fail('Removal failed');
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Run auto-install - installs ALL features without any prompts
 * This is the recommended path for most users
 * @returns {boolean} True if installation succeeded
 */
export async function runAutoInstall() {
  // Display header
  console.log(
    boxen(
      chalk.bold.cyan('CCASP Auto-Install\n\n') +
        chalk.white('Installing ALL features automatically.\n') +
        chalk.dim('No prompts - full feature set'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  // Get all default features (all features are checked by default)
  const allFeatures = getDefaultFeatures();

  // Map to init.js features - use ALL optional features
  const initFeatures = getAllInitFeatures();

  console.log(chalk.dim(`\nInstalling: ${allFeatures.length} features (all categories)`));

  // Check if .claude folder exists and handle backup
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
  const hasExisting = existsSync(claudeDir) || existsSync(claudeMdPath);

  let installStrategy = 'backup'; // Default: backup then overwrite

  if (hasExisting) {
    const existing = [];
    if (existsSync(claudeDir)) existing.push('.claude/');
    if (existsSync(claudeMdPath)) existing.push('CLAUDE.md');

    console.log(chalk.yellow(`\nExisting files found: ${existing.join(', ')}`));
    console.log(chalk.dim('Creating backup before overwriting...\n'));
    installStrategy = 'backup';
  }

  // Run init with ALL features
  const spinner = ora('Installing ALL CCASP features...').start();

  try {
    await runInit({
      features: initFeatures,
      skipPrompts: true,
      preset: 'full',
      backup: installStrategy === 'backup',
      force: false,
      skipExisting: false,
    });

    spinner.succeed('CCASP fully installed!');

    // Show summary
    console.log(
      boxen(
        chalk.bold.green('Auto-Install Complete\n\n') +
          chalk.white('All features installed:\n\n') +
          `Commands:  ${chalk.cyan('23+')} ${chalk.dim('(GitHub, planning, testing, deploy, refactor...)')}\n` +
          `Agents:    ${chalk.cyan('4')} ${chalk.dim('(example, creator templates)')}\n` +
          `Hooks:     ${chalk.cyan('20')} ${chalk.dim('(token, happy, advanced suite...)')}\n` +
          `Skills:    ${chalk.cyan('4')} ${chalk.dim('(agent-creator, hook-creator, rag-agent...)')}\n` +
          `Docs:      ${chalk.cyan('4')} ${chalk.dim('(INDEX, README, gotchas, constitution)')}\n\n` +
          chalk.bold('Next Steps:\n') +
          chalk.dim('1. Launch Claude Code CLI\n') +
          chalk.dim('2. Run ') + chalk.yellow('/project-implementation-for-ccasp') + chalk.dim(' for full setup'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
        }
      )
    );

    // Offer to launch Claude CLI
    const { launchClaude } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'launchClaude',
        message: 'Launch Claude Code CLI now?',
        default: true,
      },
    ]);

    if (launchClaude) {
      await launchClaudeCLI();
    } else {
      showRestartReminder();
    }

    return true;
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Run custom install with organized checkbox deselection
 * Shows checkbox UI for users who want to customize feature selection
 * @returns {boolean} True if installation succeeded
 */
export async function runCustomInstall() {
  // Display header
  console.log(
    boxen(
      chalk.bold.cyan('CCASP Custom Install\n\n') +
        chalk.white('All features selected by default.\n') +
        chalk.dim('Space to toggle - Enter to install'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );

  // Get feature selection with organized categories
  const { selectedFeatures } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedFeatures',
      message: 'Select features to install:',
      choices: getAllFeatures(),
      pageSize: 25, // Show all without scrolling
      loop: false,
    },
  ]);

  // Map to init.js features
  const initFeatures = mapFeaturesToInit(selectedFeatures);

  // Count selections by category for summary
  const summary = {
    commands: selectedFeatures.filter((f) => ['githubIntegration', 'phasedDevelopment', 'testing', 'deploymentAutomation', 'refactoring', 'mcpExplorer', 'analysis'].includes(f)).length,
    agents: selectedFeatures.filter((f) => ['exampleAgent', 'createAgent'].includes(f)).length,
    hooks: selectedFeatures.filter((f) => ['updateChecker', 'advancedHooks'].includes(f)).length,
    skills: selectedFeatures.filter((f) => ['exampleSkill', 'skillTemplates'].includes(f)).length,
    extras: selectedFeatures.filter((f) => ['tokenManagement', 'tunnelServices', 'happyMode'].includes(f)).length,
    docs: selectedFeatures.filter((f) => ['indexMd', 'readmeMd'].includes(f)).length,
  };

  console.log(chalk.dim(`\nSelected: ${Object.values(summary).reduce((a, b) => a + b, 0)} features`));

  // Check if .claude folder exists and ask about backup/overwrite strategy
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
  const hasExisting = existsSync(claudeDir) || existsSync(claudeMdPath);

  let installStrategy = 'backup'; // Default: backup then overwrite

  if (hasExisting) {
    const existing = [];
    if (existsSync(claudeDir)) existing.push('.claude/');
    if (existsSync(claudeMdPath)) existing.push('CLAUDE.md');

    console.log(chalk.yellow(`\nExisting files found: ${existing.join(', ')}`));

    const { strategy } = await inquirer.prompt([
      {
        type: 'list',
        name: 'strategy',
        message: 'How should existing files be handled?',
        choices: [
          {
            name: `${chalk.green('1.')} Backup + Overwrite ${chalk.dim('- Create backup, then replace (recommended)')}`,
            value: 'backup',
            short: 'Backup + Overwrite',
          },
          {
            name: `${chalk.yellow('2.')} Skip Existing ${chalk.dim('- Only add new files, keep existing')}`,
            value: 'skip',
            short: 'Skip Existing',
          },
          {
            name: `${chalk.red('3.')} Overwrite All ${chalk.dim('- Replace everything without backup')}`,
            value: 'force',
            short: 'Overwrite All',
          },
          {
            name: `${chalk.dim('0.')} Cancel`,
            value: 'cancel',
            short: 'Cancel',
          },
        ],
        pageSize: 5,
      },
    ]);

    if (strategy === 'cancel') {
      console.log(chalk.dim('\nInstallation cancelled. No changes made.\n'));
      return false;
    }

    installStrategy = strategy;
  }

  // Run init with selected features and strategy
  const spinner = ora('Installing CCASP features...').start();

  try {
    await runInit({
      features: initFeatures,
      skipPrompts: true,
      preset: 'full',
      backup: installStrategy === 'backup',
      force: installStrategy === 'force',
      skipExisting: installStrategy === 'skip',
    });

    spinner.succeed('CCASP features installed!');

    // Show summary
    console.log(
      boxen(
        chalk.bold.green('Installation Complete\n\n') +
          `Commands:  ${chalk.cyan(summary.commands)}\n` +
          `Agents:    ${chalk.cyan(summary.agents)}\n` +
          `Hooks:     ${chalk.cyan(summary.hooks)}\n` +
          `Skills:    ${chalk.cyan(summary.skills)}\n` +
          `Extras:    ${chalk.cyan(summary.extras)}\n` +
          `Docs:      ${chalk.cyan(summary.docs)}\n\n` +
          chalk.bold('Next Steps:\n') +
          chalk.dim('1. Restart Claude Code CLI\n') +
          chalk.dim('2. Run ') + chalk.yellow('/project-implementation-for-ccasp') + chalk.dim(' for full setup'),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green',
        }
      )
    );

    // Offer to launch Claude CLI
    const { launchClaude } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'launchClaude',
        message: 'Launch Claude Code CLI now?',
        default: true,
      },
    ]);

    if (launchClaude) {
      await launchClaudeCLI();
    } else {
      showRestartReminder();
    }

    return true;
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Show available templates
 */
export async function showTemplates() {
  console.log(chalk.bold('\nAvailable Templates:\n'));

  const templates = [
    { name: 'Agent Template', desc: 'L1/L2/L3 agent hierarchy', cmd: 'ccasp create agent' },
    { name: 'Hook Template', desc: 'Pre/Post tool hooks', cmd: 'ccasp create hook' },
    { name: 'Skill Template', desc: 'RAG-enhanced skills', cmd: 'ccasp create skill' },
    { name: 'Command Template', desc: 'Slash commands', cmd: 'ccasp create command' },
    { name: 'Phase Dev Plan', desc: 'Phased development', cmd: 'ccasp create phase' },
  ];

  templates.forEach((t, i) => {
    console.log(`  ${chalk.yellow(i + 1 + '.')} ${chalk.cyan(t.name)}`);
    console.log(`     ${chalk.dim(t.desc)}`);
    console.log(`     ${chalk.dim('$')} ${t.cmd}\n`);
  });

  // Offer to run list command
  const { viewMore } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'viewMore',
      message: 'View all available items?',
      default: false,
    },
  ]);

  if (viewMore) {
    await runList();
  }
}

/**
 * Show prior releases and allow adding features
 */
export async function showPriorReleases() {
  console.log(chalk.bold('\nPrior Releases\n'));

  const { releases } = loadReleaseNotes();
  const currentVersion = getCurrentVersion();

  if (!releases || releases.length === 0) {
    console.log(chalk.yellow('  No release history available.\n'));
    return;
  }

  // Show release list
  console.log(chalk.dim('  Select a release to view details and available features:\n'));

  releases.forEach((release, i) => {
    const isCurrent = release.version === currentVersion;
    const marker = isCurrent ? chalk.green('[current]') : chalk.dim('o');
    const currentLabel = isCurrent ? chalk.green(' (current)') : '';
    console.log(`  ${chalk.yellow(i + 1 + '.')} ${marker} v${release.version}${currentLabel} ${chalk.dim(`(${release.date})`)}`);
    console.log(`     ${chalk.dim(release.summary)}`);
  });

  console.log('');

  const { releaseChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'releaseChoice',
      message: 'Select a release to view details:',
      choices: [
        ...releases.map((r, i) => ({
          name: `${i + 1}. v${r.version} - ${r.summary}`,
          value: i,
          short: `v${r.version}`,
        })),
        {
          name: `${chalk.cyan('A.')} Add available features to project`,
          value: 'add',
          short: 'Add Features',
        },
        {
          name: `${chalk.dim('0.')} Back to menu`,
          value: 'back',
          short: 'Back',
        },
      ],
      pageSize: 12,
    },
  ]);

  if (releaseChoice === 'back') {
    return;
  }

  if (releaseChoice === 'add') {
    await showAddFeaturesMenu();
    return;
  }

  // Show release details
  const release = releases[releaseChoice];
  await showReleaseDetails(release);
}

/**
 * Show detailed release information
 * @param {Object} release - Release object with version, date, summary, etc.
 */
export async function showReleaseDetails(release) {
  console.log(
    boxen(
      chalk.bold.cyan(`v${release.version}\n`) +
        chalk.dim(`Released: ${release.date}\n\n`) +
        chalk.white(release.summary),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: 'Release Details',
        titleAlignment: 'center',
      }
    )
  );

  // Show highlights
  if (release.highlights && release.highlights.length > 0) {
    console.log(chalk.bold('\nHighlights:\n'));
    release.highlights.forEach((h) => {
      console.log(`  - ${h}`);
    });
  }

  // Show new features
  if (release.newFeatures) {
    const { commands, agents, skills, hooks, other } = release.newFeatures;

    if (commands && commands.length > 0) {
      console.log(chalk.bold('\nNew Commands:\n'));
      commands.forEach((cmd) => {
        console.log(`  ${chalk.cyan(`/${cmd.name}`)} - ${cmd.description}`);
      });
    }

    if (agents && agents.length > 0) {
      console.log(chalk.bold('\nNew Agents:\n'));
      agents.forEach((agent) => {
        console.log(`  ${chalk.cyan(agent.name)} - ${agent.description}`);
      });
    }

    if (skills && skills.length > 0) {
      console.log(chalk.bold('\nNew Skills:\n'));
      skills.forEach((skill) => {
        console.log(`  ${chalk.cyan(skill.name)} - ${skill.description}`);
      });
    }

    if (hooks && hooks.length > 0) {
      console.log(chalk.bold('\nNew Hooks:\n'));
      hooks.forEach((hook) => {
        console.log(`  ${chalk.cyan(hook.name)} - ${hook.description}`);
      });
    }

    if (other && other.length > 0) {
      console.log(chalk.bold('\nOther Improvements:\n'));
      other.forEach((item) => {
        console.log(`  ${chalk.cyan(item.name)} - ${item.description}`);
      });
    }
  }

  // Show breaking changes
  if (release.breaking && release.breaking.length > 0) {
    console.log(chalk.bold.red('\nBreaking Changes:\n'));
    release.breaking.forEach((b) => {
      console.log(`  ${chalk.red('!')} ${b}`);
    });
  }

  console.log('');

  // Offer to add features from this release
  const hasNewFeatures =
    release.newFeatures &&
    (release.newFeatures.commands?.length > 0 ||
      release.newFeatures.agents?.length > 0 ||
      release.newFeatures.skills?.length > 0 ||
      release.newFeatures.hooks?.length > 0);

  if (hasNewFeatures) {
    const { addFeatures } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addFeatures',
        message: 'Would you like to add features from this release to your project?',
        default: false,
      },
    ]);

    if (addFeatures) {
      await addFeaturesFromRelease(release);
    }
  }
}

/**
 * Show menu to add available features
 */
export async function showAddFeaturesMenu() {
  const claudeDir = join(process.cwd(), '.claude');
  const commandsDir = join(claudeDir, 'commands');

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
  const templatesDir = join(__dirname, '..', '..', '..', 'templates', 'commands');

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
  const claudeDir = join(process.cwd(), '.claude');
  const commandsDir = join(claudeDir, 'commands');

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
  const templatesDir = join(__dirname, '..', '..', '..', 'templates', 'commands');

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
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const hooksDir = join(claudeDir, 'hooks');

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
  const templatesDir = join(__dirname, '..', '..', '..', 'templates', 'commands');
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
  const hooksTemplatesDir = join(__dirname, '..', '..', '..', 'templates', 'hooks');
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

export default {
  runRestore,
  runRemove,
  runAutoInstall,
  runCustomInstall,
  showTemplates,
  showPriorReleases,
  showReleaseDetails,
  showAddFeaturesMenu,
  addFeaturesFromRelease,
  installHappyEngineering,
};
