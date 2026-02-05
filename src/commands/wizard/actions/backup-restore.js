/**
 * Backup and Restore Operations
 *
 * Handles backup restoration and CCASP removal functionality.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';

import {
  copyDirRecursive,
  findExistingBackups,
} from '../helpers.js';

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
