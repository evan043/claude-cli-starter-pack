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
import { join, basename } from 'path';
import { runInit } from './init.js';
import { detectTechStack } from './detect-tech-stack.js';
import { runClaudeAudit, runEnhancement } from './claude-audit.js';
import { runSetup as runGitHubSetup } from './setup.js';
import { runList } from './list.js';
import { showProjectSettingsMenu } from '../cli/menu.js';

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
 * Remove CCASP from a project
 */
async function runRemove() {
  const claudeDir = join(process.cwd(), '.claude');

  if (!existsSync(claudeDir)) {
    console.log(chalk.yellow('\n⚠️  No .claude folder found in this project.\n'));
    return false;
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

  if (itemsToRemove.length === 0) {
    console.log(chalk.yellow('  No CCASP items found.\n'));
    return false;
  }

  console.log('');

  // Removal options
  const { removeAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'removeAction',
      message: 'What would you like to do?',
      choices: [
        {
          name: `${chalk.red('1.')} Remove ALL ${chalk.dim('- Delete entire .claude folder')}`,
          value: 'all',
          short: 'Remove All',
        },
        {
          name: `${chalk.yellow('2.')} Remove with backup ${chalk.dim('- Backup to .claude-backup/ first')}`,
          value: 'backup',
          short: 'Backup & Remove',
        },
        {
          name: `${chalk.cyan('3.')} Selective removal ${chalk.dim('- Choose what to remove')}`,
          value: 'selective',
          short: 'Selective',
        },
        {
          name: `${chalk.green('0.')} Cancel ${chalk.dim('- Keep everything')}`,
          value: 'cancel',
          short: 'Cancel',
        },
      ],
    },
  ]);

  if (removeAction === 'cancel') {
    console.log(chalk.dim('\nCancelled. No changes made.\n'));
    return false;
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
      // Create backup first
      const backupDir = join(process.cwd(), '.claude-backup', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
      mkdirSync(backupDir, { recursive: true });

      // Copy entire .claude folder to backup
      copyDirRecursive(claudeDir, backupDir);
      spinner.succeed(`Backed up to ${chalk.cyan(backupDir)}`);

      // Then remove
      spinner.start('Removing .claude folder...');
      rmSync(claudeDir, { recursive: true, force: true });
      spinner.succeed('.claude folder removed');

      console.log(
        boxen(
          chalk.green('✅ CCASP removed with backup\n\n') +
            `Backup location:\n${chalk.cyan(backupDir)}\n\n` +
            chalk.dim('To restore: copy backup contents to .claude/'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } else if (removeAction === 'all') {
      // Remove without backup
      rmSync(claudeDir, { recursive: true, force: true });
      spinner.succeed('.claude folder removed');

      console.log(
        boxen(
          chalk.green('✅ CCASP removed\n\n') +
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
          choices: itemsToRemove.map(item => ({
            name: item.label,
            value: item,
            checked: false,
          })),
        },
      ]);

      if (itemsToDelete.length === 0) {
        console.log(chalk.dim('\nNo items selected. No changes made.\n'));
        return false;
      }

      // Create backups for selected items
      const backupDir = join(process.cwd(), '.claude', 'backups', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
      mkdirSync(backupDir, { recursive: true });

      for (const item of itemsToDelete) {
        if (item.type === 'dir') {
          copyDirRecursive(item.path, join(backupDir, basename(item.path)));
          rmSync(item.path, { recursive: true, force: true });
        } else {
          copyFileSync(item.path, join(backupDir, basename(item.path)));
          rmSync(item.path, { force: true });
        }
        console.log(`  ${chalk.red('✗')} Removed ${item.label}`);
      }

      console.log(chalk.dim(`\nBackups saved to: ${backupDir}\n`));
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
    name: `${chalk.yellow('4.')} Audit CLAUDE.md ${chalk.dim('- Check existing config')}`,
    value: 'audit',
    short: 'Audit',
  },
  {
    name: `${chalk.yellow('5.')} Enhance CLAUDE.md ${chalk.dim('- Generate/improve docs')}`,
    value: 'enhance',
    short: 'Enhance',
  },
  {
    name: `${chalk.yellow('6.')} Detect Tech Stack ${chalk.dim('- Auto-detect project')}`,
    value: 'detect',
    short: 'Detect',
  },
  {
    name: `${chalk.yellow('7.')} View Templates ${chalk.dim('- Browse available items')}`,
    value: 'templates',
    short: 'Templates',
  },
  {
    name: `${chalk.yellow('8.')} Project Settings ${chalk.dim('- Configure deployment, tunnels, etc.')}`,
    value: 'settings',
    short: 'Settings',
  },
  {
    name: `${chalk.yellow('9.')} Remove CCASP ${chalk.dim('- Uninstall from this project')}`,
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
    spinner.start('Initializing .claude folder...');

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

    spinner.succeed('.claude folder created!');

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
    spinner.fail('Setup failed');
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
 * Main setup wizard - entry point
 */
export async function runSetupWizard(options = {}) {
  showSetupHeader();

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
        pageSize: 10,
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

      case 'audit':
        await runClaudeAudit();
        // Audit doesn't modify files, no restart needed
        break;

      case 'enhance':
        await runEnhancement();
        // Enhancement modifies CLAUDE.md which requires restart
        showRestartReminder();
        break;

      case 'detect':
        const spinner = ora('Detecting tech stack...').start();
        try {
          const techStack = await detectTechStack(process.cwd());
          spinner.succeed('Detection complete!');
          console.log(chalk.bold('\nDetected Tech Stack:'));
          console.log(JSON.stringify(techStack, null, 2));
        } catch (error) {
          spinner.fail('Detection failed');
          console.error(chalk.red(error.message));
        }
        console.log('');
        break;

      case 'templates':
        await showTemplates();
        break;

      case 'settings':
        // Check if .claude folder exists first
        if (!existsSync(join(process.cwd(), '.claude'))) {
          console.log(chalk.yellow('\n⚠️  No .claude folder found. Run Quick Start (1) or Full Setup (2) first.\n'));
        } else {
          await showProjectSettingsMenu();
          // Settings modify tech-stack.json which may require restart
          showRestartReminder();
        }
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
- CLAUDE.md generation
- Tech stack detection
- GitHub project integration
- Agents, hooks, and skills

## Quick Options

Reply with a number to jump to that option:
1. Quick Start - Auto-detect and initialize
2. Full Setup - All features with customization
3. GitHub Setup - Connect to project board
4. Audit - Check existing CLAUDE.md
5. Enhance - Generate/improve CLAUDE.md
6. Detect - Show detected tech stack
7. Templates - Browse available templates

## From Terminal

\`\`\`bash
npx ccasp wizard
\`\`\`
`;
}

export default runSetupWizard;
