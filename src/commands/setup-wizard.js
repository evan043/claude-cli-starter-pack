/**
 * CCASP Setup Wizard
 *
 * Vibe-code friendly setup wizard with minimal typing.
 * Designed for mobile/remote use with numbered options.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, renameSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runInit } from './init.js';
import { detectTechStack } from './detect-tech-stack.js';
import { runEnhancement } from './claude-audit.js';
import { runSetup as runGitHubSetup } from './setup.js';
import { runList } from './list.js';
import {
  performVersionCheck,
  formatUpdateBanner,
  loadReleaseNotes,
  getReleasesSince,
  getAvailableFeatures,
  markFeatureInstalled,
  markFeatureSkipped,
  dismissUpdateNotification,
  getCurrentVersion,
} from '../utils/version-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create backup of a file before overwriting
 * @param {string} filePath - Path to file to backup
 * @returns {string|null} - Path to backup file, or null if no backup needed
 */
export function createBackup(filePath) {
  if (!existsSync(filePath)) return null;

  const backupDir = join(process.cwd(), '.claude', 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = basename(filePath);
  const backupPath = join(backupDir, `${fileName}.${timestamp}.bak`);

  copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Find existing CCASP backups in the project
 */
function findExistingBackups() {
  const backupDir = join(process.cwd(), '.claude-backup');
  const backups = [];

  if (!existsSync(backupDir)) {
    return backups;
  }

  try {
    const entries = readdirSync(backupDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const backupPath = join(backupDir, entry.name);
        const hasClaudeDir = existsSync(join(backupPath, '.claude'));
        const hasClaudeMd = existsSync(join(backupPath, 'CLAUDE.md'));

        if (hasClaudeDir || hasClaudeMd) {
          // Parse timestamp from folder name (format: 2025-01-30T12-30-45)
          let date = entry.name;
          try {
            const isoDate = entry.name.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
            date = new Date(isoDate).toLocaleString();
          } catch {
            // Keep original name if parsing fails
          }

          backups.push({
            name: entry.name,
            path: backupPath,
            date,
            hasClaudeDir,
            hasClaudeMd,
          });
        }
      }
    }
  } catch {
    // Silently fail
  }

  // Sort by name (newest first)
  return backups.sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * Restore from a backup
 */
async function runRestore(backups) {
  if (backups.length === 0) {
    console.log(chalk.yellow('\n⚠️  No backups found in .claude-backup/\n'));
    return false;
  }

  console.log(chalk.bold('\n📦 Available backups:\n'));

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
    console.log(chalk.yellow(`\n⚠️  This will overwrite: ${willOverwrite.join(', ')}`));
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
        chalk.green('✅ Restored from backup\n\n') +
          `Backup date: ${chalk.cyan(selectedBackup.date)}\n` +
          (selectedBackup.hasClaudeDir ? `  • ${chalk.cyan('.claude/')} restored\n` : '') +
          (selectedBackup.hasClaudeMd ? `  • ${chalk.cyan('CLAUDE.md')} restored\n` : '') +
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
 */
async function runRemove() {
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
  const existingBackups = findExistingBackups();

  // Check if there's anything to work with
  const hasClaudeDir = existsSync(claudeDir);
  const hasClaudeMd = existsSync(claudeMdPath);

  if (!hasClaudeDir && existingBackups.length === 0) {
    console.log(chalk.yellow('\n⚠️  No .claude folder found in this project.\n'));
    if (!hasClaudeMd) {
      return false;
    }
  }

  // Show what will be removed
  console.log(chalk.bold('\n📁 CCASP files found in this project:\n'));

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
    console.log(chalk.dim(`\n  📦 ${existingBackups.length} backup(s) available in .claude-backup/`));
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
          chalk.green('✅ CCASP removed with full backup\n\n') +
            `Backup location:\n${chalk.cyan(backupDir)}\n\n` +
            chalk.bold('Contents backed up:\n') +
            (hasClaudeDir ? `  • ${chalk.cyan('.claude/')} folder\n` : '') +
            (hasClaudeMd ? `  • ${chalk.cyan('CLAUDE.md')} file\n` : '') +
            '\n' +
            chalk.dim('To restore: run ') + chalk.cyan('ccasp wizard') + chalk.dim(' → Remove CCASP → Restore'),
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
          chalk.green('✅ CCASP removed\n\n') +
            chalk.yellow('⚠️  No backup was created.\n\n') +
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
        console.log(`  ${chalk.red('✗')} Removed ${item.label}`);
      }

      console.log(
        boxen(
          chalk.green('✅ Selected items removed\n\n') +
            `Backup location:\n${chalk.cyan(backupDir)}\n\n` +
            chalk.dim('To restore: run ') + chalk.cyan('ccasp wizard') + chalk.dim(' → Remove CCASP → Restore'),
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
 * Recursively copy a directory
 */
function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Display setup header
 */
function showSetupHeader() {
  console.log(
    boxen(
      chalk.bold.cyan('🚀 CCASP Setup Wizard\n\n') +
        chalk.dim('Vibe-code friendly • Minimal typing • Mobile-ready'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

/**
 * Quick setup options - numbered for easy mobile input
 */
const SETUP_OPTIONS = [
  {
    name: `${chalk.yellow('1.')} Quick Start ${chalk.dim('- Detect stack + init .claude')}`,
    value: 'quick',
    short: 'Quick Start',
  },
  {
    name: `${chalk.yellow('2.')} Full Setup ${chalk.dim('- All features + customization')}`,
    value: 'full',
    short: 'Full Setup',
  },
  {
    name: `${chalk.yellow('3.')} GitHub Setup ${chalk.dim('- Connect project board')}`,
    value: 'github',
    short: 'GitHub',
  },
  {
    name: `${chalk.yellow('4.')} View Templates ${chalk.dim('- Browse available items')}`,
    value: 'templates',
    short: 'Templates',
  },
  {
    name: `${chalk.yellow('5.')} Prior Releases ${chalk.dim('- Review & add features from past versions')}`,
    value: 'releases',
    short: 'Releases',
  },
  {
    name: `${chalk.yellow('6.')} Remove CCASP ${chalk.dim('- Uninstall from this project')}`,
    value: 'remove',
    short: 'Remove',
  },
  {
    name: `${chalk.yellow('0.')} Exit`,
    value: 'exit',
    short: 'Exit',
  },
];

/**
 * Feature selection for quick setup - simplified for vibe coding
 */
const QUICK_FEATURE_PRESETS = [
  {
    name: `${chalk.green('A.')} Minimal ${chalk.dim('- Menu + help only')}`,
    value: 'minimal',
    features: [], // Essential commands always included
  },
  {
    name: `${chalk.green('B.')} Standard ${chalk.dim('- GitHub + phased dev (recommended)')}`,
    value: 'standard',
    features: ['githubIntegration', 'phasedDevelopment'],
  },
  {
    name: `${chalk.green('C.')} Full ${chalk.dim('- All features including deployment')}`,
    value: 'full',
    features: ['githubIntegration', 'phasedDevelopment', 'deploymentAutomation', 'tunnelServices', 'tokenManagement'],
  },
  {
    name: `${chalk.green('D.')} Custom ${chalk.dim('- Pick individual features')}`,
    value: 'custom',
    features: [],
  },
];

/**
 * Individual features for custom selection
 * NOTE: These values MUST match the feature names in init.js OPTIONAL_FEATURES
 */
const INDIVIDUAL_FEATURES = [
  { name: 'Essential commands (menu, help)', value: 'essential', checked: true },
  { name: 'GitHub Project Board integration (*)', value: 'githubIntegration', checked: false },
  { name: 'Token Budget Management', value: 'tokenManagement', checked: false },
  { name: 'Phased Development System', value: 'phasedDevelopment', checked: false },
  { name: 'Deployment Automation (*)', value: 'deploymentAutomation', checked: false },
  { name: 'Tunnel Services (*)', value: 'tunnelServices', checked: false },
  { name: 'Happy Mode Integration (*)', value: 'happyMode', checked: false },
];

/**
 * Map generic preset feature names to init.js OPTIONAL_FEATURES names
 */
const FEATURE_NAME_MAP = {
  essential: 'essential',
  github: 'githubIntegration',
  testing: 'phasedDevelopment', // Testing uses phased dev for Ralph loop
  deployment: 'deploymentAutomation',
  agents: 'agents', // Not a direct feature, handled separately
  hooks: 'hooks', // Not a direct feature, handled separately
  tunnel: 'tunnelServices',
  token: 'tokenManagement',
  happy: 'happyMode',
  phasedDev: 'phasedDevelopment',
};

/**
 * Translate preset features to init.js compatible feature names
 */
function translateFeatures(presetFeatures) {
  return presetFeatures
    .map((f) => FEATURE_NAME_MAP[f] || f)
    .filter((f) => f !== 'essential'); // essential is always included
}

/**
 * Run quick setup with auto-detection
 */
async function runQuickSetup() {
  const spinner = ora('Detecting tech stack...').start();

  try {
    const techStack = await detectTechStack(process.cwd());
    spinner.succeed('Tech stack detected!');

    // Show detected stack
    console.log('\n' + chalk.bold('Detected:'));
    if (techStack.frontend?.framework) {
      console.log(`  ${chalk.cyan('Frontend:')} ${techStack.frontend.framework}`);
    }
    if (techStack.backend?.framework) {
      console.log(`  ${chalk.cyan('Backend:')} ${techStack.backend.framework}`);
    }
    if (techStack.database?.type) {
      console.log(`  ${chalk.cyan('Database:')} ${techStack.database.type}`);
    }
    if (techStack.testing?.framework) {
      console.log(`  ${chalk.cyan('Testing:')} ${techStack.testing.framework}`);
    }
    if (techStack.deployment?.platform) {
      console.log(`  ${chalk.cyan('Deploy:')} ${techStack.deployment.platform}`);
    }
    console.log('');

    // Preset selection - vibe-code friendly (single letter/number)
    const { preset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'preset',
        message: 'Select feature preset:',
        choices: QUICK_FEATURE_PRESETS,
        pageSize: 10,
      },
    ]);

    let features;
    const selectedPreset = QUICK_FEATURE_PRESETS.find((p) => p.value === preset);

    if (preset === 'custom') {
      const { customFeatures } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'customFeatures',
          message: 'Select features (Space to toggle):',
          choices: INDIVIDUAL_FEATURES,
          pageSize: 10,
        },
      ]);
      features = customFeatures;
    } else {
      features = selectedPreset.features;
    }

    // Run init with selected features
    // Features are already in init.js-compatible format (INDIVIDUAL_FEATURES uses correct names)
    // Note: Don't use spinner here since runInit has its own console output
    console.log('');

    // Check if any features require post-configuration
    const featuresRequiringConfig = features.filter((f) =>
      ['githubIntegration', 'deploymentAutomation', 'tunnelServices', 'happyMode'].includes(f)
    );

    await runInit({
      techStack,
      features,
      minimal: preset === 'minimal',
      skipPrompts: true,
    });

    console.log(chalk.green('\n✓ .claude folder setup complete!'));

    // Show which features need post-configuration
    if (featuresRequiringConfig.length > 0) {
      console.log(
        chalk.yellow('\n⚠️  Some features require additional configuration:')
      );
      featuresRequiringConfig.forEach((f) => {
        const labels = {
          githubIntegration: 'GitHub Project Board',
          deploymentAutomation: 'Deployment Platforms',
          tunnelServices: 'Tunnel Service',
          happyMode: 'Happy Mode',
        };
        console.log(`   • ${labels[f] || f}`);
      });
      console.log(chalk.dim('\n   Configure via: npx ccasp menu → Project Settings'));
    }

    // Offer to generate CLAUDE.md
    const { generateClaudeMd } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generateClaudeMd',
        message: 'Generate CLAUDE.md from detected stack?',
        default: true,
      },
    ]);

    if (generateClaudeMd) {
      await runEnhancement({ techStack, mode: 'generate' });
    }

    showCompletionMessage();
    return true;
  } catch (error) {
    console.error(chalk.red('\n✗ Setup failed'));
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Show session restart reminder
 */
function showRestartReminder() {
  console.log(
    boxen(
      chalk.bold.yellow('⚠️  RESTART REQUIRED\n\n') +
        chalk.white('Changes to .claude/ require a new session.\n\n') +
        chalk.dim('To apply changes:\n') +
        `  ${chalk.cyan('1.')} Exit Claude Code CLI (${chalk.yellow('Ctrl+C')} or ${chalk.yellow('/exit')})\n` +
        `  ${chalk.cyan('2.')} Restart: ${chalk.yellow('claude')} or ${chalk.yellow('claude .')}\n` +
        `  ${chalk.cyan('3.')} New commands will be available`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
      }
    )
  );
}

/**
 * Show completion message
 */
function showCompletionMessage() {
  console.log(
    boxen(
      chalk.bold.green('✅ Setup Complete!\n\n') +
        chalk.white('Your .claude folder is ready.\n\n') +
        chalk.dim('Next steps:\n') +
        `  ${chalk.cyan('1.')} ${chalk.bold.yellow('RESTART')} Claude Code CLI for changes to take effect\n` +
        `  ${chalk.cyan('2.')} Type ${chalk.yellow('/menu')} to see commands\n` +
        `  ${chalk.cyan('3.')} Or type ${chalk.yellow('/ccasp-setup')} for this menu`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );

  // Show restart reminder
  showRestartReminder();
}

/**
 * Show available templates
 */
async function showTemplates() {
  console.log(chalk.bold('\n📦 Available Templates:\n'));

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
async function showPriorReleases() {
  console.log(chalk.bold('\n📜 Prior Releases\n'));

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
    const marker = isCurrent ? chalk.green('●') : chalk.dim('○');
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
 */
async function showReleaseDetails(release) {
  console.log(
    boxen(
      chalk.bold.cyan(`v${release.version}\n`) +
        chalk.dim(`Released: ${release.date}\n\n`) +
        chalk.white(release.summary),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: '📦 Release Details',
        titleAlignment: 'center',
      }
    )
  );

  // Show highlights
  if (release.highlights && release.highlights.length > 0) {
    console.log(chalk.bold('\n✨ Highlights:\n'));
    release.highlights.forEach((h) => {
      console.log(`  • ${h}`);
    });
  }

  // Show new features
  if (release.newFeatures) {
    const { commands, agents, skills, hooks, other } = release.newFeatures;

    if (commands && commands.length > 0) {
      console.log(chalk.bold('\n📝 New Commands:\n'));
      commands.forEach((cmd) => {
        console.log(`  ${chalk.cyan(`/${cmd.name}`)} - ${cmd.description}`);
      });
    }

    if (agents && agents.length > 0) {
      console.log(chalk.bold('\n🤖 New Agents:\n'));
      agents.forEach((agent) => {
        console.log(`  ${chalk.cyan(agent.name)} - ${agent.description}`);
      });
    }

    if (skills && skills.length > 0) {
      console.log(chalk.bold('\n🎯 New Skills:\n'));
      skills.forEach((skill) => {
        console.log(`  ${chalk.cyan(skill.name)} - ${skill.description}`);
      });
    }

    if (hooks && hooks.length > 0) {
      console.log(chalk.bold('\n🪝 New Hooks:\n'));
      hooks.forEach((hook) => {
        console.log(`  ${chalk.cyan(hook.name)} - ${hook.description}`);
      });
    }

    if (other && other.length > 0) {
      console.log(chalk.bold('\n🔧 Other Improvements:\n'));
      other.forEach((item) => {
        console.log(`  ${chalk.cyan(item.name)} - ${item.description}`);
      });
    }
  }

  // Show breaking changes
  if (release.breaking && release.breaking.length > 0) {
    console.log(chalk.bold.red('\n⚠️  Breaking Changes:\n'));
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
async function showAddFeaturesMenu() {
  const claudeDir = join(process.cwd(), '.claude');
  const commandsDir = join(claudeDir, 'commands');

  if (!existsSync(claudeDir)) {
    console.log(chalk.yellow('\n⚠️  No .claude folder found. Run Quick Start (1) or Full Setup (2) first.\n'));
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
    console.log(chalk.green('\n✓ All available commands are already installed!\n'));
    return;
  }

  console.log(chalk.bold('\n📦 Available Commands to Add:\n'));
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

  for (const cmdName of selectedCommands) {
    try {
      // Look for template file
      const templatePath = join(__dirname, '..', '..', 'templates', 'commands', `${cmdName}.template.md`);

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
    console.log(chalk.green(`\n✓ Installed ${installed.length} command(s):`));
    installed.forEach((cmd) => {
      console.log(`  ${chalk.cyan(`/${cmd}`)}`);
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed to install ${failed.length} command(s):`));
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
 */
async function addFeaturesFromRelease(release) {
  const claudeDir = join(process.cwd(), '.claude');
  const commandsDir = join(claudeDir, 'commands');

  if (!existsSync(claudeDir)) {
    console.log(chalk.yellow('\n⚠️  No .claude folder found. Run Quick Start (1) or Full Setup (2) first.\n'));
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
    console.log(chalk.green('\n✓ All commands from this release are already installed!\n'));
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

  for (const cmdName of selectedCommands) {
    try {
      const templatePath = join(__dirname, '..', '..', 'templates', 'commands', `${cmdName}.template.md`);

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
    console.log(chalk.green(`\n✓ Installed ${installed.length} command(s):`));
    installed.forEach((cmd) => {
      console.log(`  ${chalk.cyan(`/${cmd}`)}`);
    });
    showRestartReminder();
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed to install ${failed.length} command(s):`));
    failed.forEach((f) => {
      console.log(`  ${chalk.red(`/${f.name}`)}: ${f.error}`);
    });
  }
}

/**
 * Check for updates and show banner if available
 */
async function checkAndShowUpdateBanner() {
  try {
    const checkResult = await performVersionCheck(process.cwd(), false);

    if (checkResult.updateAvailable && checkResult.shouldNotify) {
      const banner = formatUpdateBanner(checkResult);
      if (banner) {
        console.log(chalk.yellow(banner));
      }
    }

    return checkResult;
  } catch {
    // Silently fail - network might be unavailable
    return null;
  }
}

/**
 * Main setup wizard - entry point
 */
export async function runSetupWizard(options = {}) {
  showSetupHeader();

  // Check for updates in background (non-blocking display)
  await checkAndShowUpdateBanner();

  // Check if .claude already exists
  const claudeDir = join(process.cwd(), '.claude');
  const claudeMd = join(process.cwd(), 'CLAUDE.md');

  if (existsSync(claudeDir)) {
    console.log(chalk.yellow('\n⚠️  .claude folder exists in this project.\n'));
  }
  if (existsSync(claudeMd)) {
    console.log(chalk.green('✓ CLAUDE.md exists\n'));
  }

  // Main menu loop
  let running = true;
  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: SETUP_OPTIONS,
        pageSize: 12,
      },
    ]);

    switch (action) {
      case 'quick':
        const quickSuccess = await runQuickSetup();
        if (quickSuccess) running = false;
        break;

      case 'full':
        await runInit({ interactive: true });
        showRestartReminder();
        running = false;
        break;

      case 'github':
        await runGitHubSetup({});
        // GitHub setup modifies .claude/ config
        showRestartReminder();
        break;

      case 'templates':
        await showTemplates();
        break;

      case 'releases':
        await showPriorReleases();
        break;

      case 'remove':
        const removed = await runRemove();
        if (removed) {
          running = false; // Exit wizard after removal
        }
        break;

      case 'exit':
        running = false;
        console.log(chalk.dim('\nRun `ccasp wizard` anytime to return.\n'));
        break;
    }
  }
}

/**
 * Generate slash command content for /ccasp-setup
 */
export function generateSlashCommand() {
  return `# CCASP Setup

Run the Claude CLI Advanced Starter Pack setup wizard.

## Usage

This command launches the interactive setup wizard for configuring:
- .claude folder structure
- GitHub project integration
- Agents, hooks, and skills

## Quick Options

Reply with a number to jump to that option:
1. Quick Start - Auto-detect and initialize
2. Full Setup - All features with customization
3. GitHub Setup - Connect to project board
4. View Templates - Browse available templates
5. Prior Releases - Review & add features from past versions
6. Remove CCASP - Uninstall from this project

## Related Commands

- \`/project-impl\` - Agent-powered project implementation (audit, enhance, detect, configure)
- \`/update-check\` - Check for updates and add new features

## From Terminal

\`\`\`bash
npx ccasp wizard
\`\`\`
`;
}

export default runSetupWizard;
