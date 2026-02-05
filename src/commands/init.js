/**
 * Init Command
 *
 * Deploy Claude CLI Advanced Starter Pack to a project's .claude/ folder
 * Creates complete folder structure with commands, skills, agents, hooks
 * Generates a sophisticated /menu command for project navigation
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { getVersion } from '../utils.js';
import { createLogger } from '../utils/logger.js';
import { createBackup } from './setup-wizard.js';
import {
  loadUsageTracking,
  getCustomizedUsedAssets,
  isAssetCustomized,
} from '../utils/version-check.js';
import {
  getAssetsNeedingMerge,
  compareAssetVersions,
  getLocalAsset,
  getTemplateAsset,
  generateMergeExplanation,
  formatMergeOptions,
} from '../utils/smart-merge.js';
import { registerProject } from '../utils/global-registry.js';
import { replacePlaceholders } from '../utils/template-engine.js';
import { safeWriteFile, safeWriteJson } from '../utils/file-ops.js';

// Import from extracted modules
import {
  OPTIONAL_FEATURES,
  AVAILABLE_COMMANDS,
  getFeatureByName,
  getCommandsForFeature,
  getDefaultFeatures,
} from './init/features.js';
import {
  COMMAND_TEMPLATES,
  getCommandTemplate,
  hasCommandTemplate,
} from './init/command-templates.js';
import {
  generateMenuCommand,
  generateStarterAgent,
  generateStarterSkill,
  generateStarterHook,
  generateUpdateCheckHook,
  generateSettingsJson,
  generateSettingsLocalJson,
  generateIndexFile,
  generateReadmeFile,
} from './init/generators.js';
import { runDevMode } from './init/dev-mode.js';
import { verifyLegacyInstallation } from './init/legacy-verify.js';
import { deployCommands, deployHooks, deploySkills, deployBinaries } from './init/deploy-assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = createLogger('init');

// Re-export for backwards compatibility
export { verifyLegacyInstallation };

/**
 * Run dev mode - rapid template testing workflow
 * (Delegated to init/dev-mode.js)
 */
async function runDevModeWrapper(options = {}) {
  return runDevMode(options);
}

/**
 * Run the init wizard
 */
export async function runInit(options = {}) {
  // CI MODE: Auto-detect and skip prompts in CI environments
  const isCI = process.env.CI === 'true' || process.env.CI === '1' || process.env.GITHUB_ACTIONS === 'true';
  if (isCI && !options.skipPrompts) {
    options.skipPrompts = true;
    // Use default features in CI if not specified
    if (!options.features) {
      options.features = getDefaultFeatures().map(f => f.name);
    }
  }

  // DEV MODE: Fast path for template testing
  if (options.dev) {
    showHeader('Claude CLI Advanced Starter Pack - DEV MODE');
    return runDevModeWrapper(options);
  }

  showHeader('Claude CLI Advanced Starter Pack - Project Setup');

  const cwd = process.cwd();
  const projectName = basename(cwd);
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const skillsDir = join(claudeDir, 'skills');
  const agentsDir = join(claudeDir, 'agents');
  const hooksDir = join(claudeDir, 'hooks');
  const docsDir = join(claudeDir, 'docs');

  console.log(chalk.cyan(`  Project: ${chalk.bold(projectName)}`));
  console.log(chalk.cyan(`  Location: ${cwd}`));
  console.log('');

  // Check for existing .claude folder
  const hasExistingClaudeDir = existsSync(claudeDir);

  if (hasExistingClaudeDir) {
    // Count existing content
    const existingCommands = existsSync(commandsDir) ? readdirSync(commandsDir).filter(f => f.endsWith('.md')).length : 0;
    const existingAgents = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length : 0;
    const existingSkills = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => !f.startsWith('.')).length : 0;
    const existingHooks = existsSync(hooksDir) ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).length : 0;
    const hasSettings = existsSync(join(claudeDir, 'settings.json'));

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('  ✓ Existing .claude/ folder detected'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.dim('  Current contents:'));
    if (existingCommands > 0) console.log(chalk.dim(`    • ${existingCommands} command(s) in commands/`));
    if (existingAgents > 0) console.log(chalk.dim(`    • ${existingAgents} agent(s) in agents/`));
    if (existingSkills > 0) console.log(chalk.dim(`    • ${existingSkills} skill(s) in skills/`));
    if (existingHooks > 0) console.log(chalk.dim(`    • ${existingHooks} hook(s) in hooks/`));
    if (hasSettings) console.log(chalk.dim(`    • settings.json configured`));
    console.log('');
    console.log(chalk.yellow.bold('  ⚠ Your existing files will NOT be overwritten'));
    console.log(chalk.dim('    New commands will be added alongside your existing setup.'));
    console.log(chalk.dim('    Use --force flag to overwrite specific commands if needed.'));
    console.log('');

    // Skip prompt if called non-interactively (e.g., from wizard)
    if (!options.skipPrompts) {
      const { confirmProceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmProceed',
          message: 'Continue with installation? (existing files are safe)',
          default: true,
        },
      ]);

      if (!confirmProceed) {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }
      console.log('');
    }
  }

  // Step 1: Check and create folder structure
  console.log(chalk.bold('Step 1: Setting up .claude/ folder structure\n'));
  console.log(chalk.dim('  (Only creates missing folders - existing content preserved)\n'));

  const foldersToCreate = [
    { path: claudeDir, name: '.claude' },
    { path: commandsDir, name: '.claude/commands' },
    { path: skillsDir, name: '.claude/skills' },
    { path: agentsDir, name: '.claude/agents' },
    { path: hooksDir, name: '.claude/hooks' },
    { path: docsDir, name: '.claude/docs' },
  ];

  for (const folder of foldersToCreate) {
    if (!existsSync(folder.path)) {
      mkdirSync(folder.path, { recursive: true });
      console.log(chalk.green(`  ✓ Created ${folder.name}/`));
    } else {
      console.log(chalk.dim(`  ○ ${folder.name}/ exists`));
    }
  }

  console.log('');

  // Step 2: Create settings files if they don't exist
  console.log(chalk.bold('Step 2: Configuring settings\n'));
  console.log(chalk.dim('  (Skips existing files - your settings are preserved)\n'));

  const settingsPath = join(claudeDir, 'settings.json');
  const settingsLocalPath = join(claudeDir, 'settings.local.json');

  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, generateSettingsJson(projectName), 'utf8');
    console.log(chalk.green('  ✓ Created settings.json'));
  } else {
    // Merge update check hook into existing settings.json
    try {
      const existingSettings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      let settingsUpdated = false;

      // Ensure hooks object exists
      if (!existingSettings.hooks) {
        existingSettings.hooks = {};
      }

      // Add UserPromptSubmit hook for update checking if not present
      if (!existingSettings.hooks.UserPromptSubmit) {
        existingSettings.hooks.UserPromptSubmit = [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/ccasp-update-check.js',
              },
            ],
          },
        ];
        settingsUpdated = true;
      } else {
        // Check if update check hook already exists
        const hasUpdateHook = existingSettings.hooks.UserPromptSubmit.some(
          (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
        );
        if (!hasUpdateHook) {
          existingSettings.hooks.UserPromptSubmit.push({
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/ccasp-update-check.js',
              },
            ],
          });
          settingsUpdated = true;
        }
      }

      if (settingsUpdated) {
        safeWriteJson(settingsPath, existingSettings);
        log.info(chalk.green('  ✓ Updated settings.json (added update check hook)'));
      } else {
        log.debug(chalk.blue('  ○ settings.json exists (preserved)'));
      }
    } catch (error) {
      log.debug(chalk.blue('  ○ settings.json exists (preserved)'));
    }
  }

  if (!existsSync(settingsLocalPath)) {
    writeFileSync(settingsLocalPath, generateSettingsLocalJson(), 'utf8');
    log.info(chalk.green('  ✓ Created settings.local.json'));
  } else {
    log.debug(chalk.blue('  ○ settings.local.json exists (preserved)'));
  }

  console.log('');

  // Step 3: Create starter files for each folder (only if folder is empty)
  console.log(chalk.bold('Step 3: Creating starter files\n'));
  console.log(chalk.dim('  (Only creates examples in empty folders)\n'));

  // Check if agents folder has any files before adding example
  const agentFiles = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md')) : [];
  if (agentFiles.length === 0) {
    const starterAgentPath = join(agentsDir, 'example-agent.md');
    writeFileSync(starterAgentPath, generateStarterAgent('example-agent'), 'utf8');
    log.info(chalk.green('  ✓ Created agents/example-agent.md (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ agents/ has ${agentFiles.length} existing agent(s) (preserved)`));
  }

  // Check if skills folder has any skills before adding example
  const skillDirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => !f.startsWith('.')) : [];
  if (skillDirs.length === 0) {
    const starterSkillDir = join(skillsDir, 'example-skill');
    safeWriteFile(join(starterSkillDir, 'skill.md'), generateStarterSkill('example-skill'));
    safeWriteFile(join(starterSkillDir, 'context', 'README.md'), '# Context\n\nAdd supporting documentation here.\n');
    safeWriteFile(join(starterSkillDir, 'workflows', 'README.md'), '# Workflows\n\nAdd step-by-step procedures here.\n');
    log.info(chalk.green('  ✓ Created skills/example-skill/ (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ skills/ has ${skillDirs.length} existing skill(s) (preserved)`));
  }

  // Check if hooks folder has any files before adding example
  const hookFiles = existsSync(hooksDir) ? readdirSync(hooksDir).filter(f => f.endsWith('.js')) : [];
  if (hookFiles.length === 0) {
    const starterHookPath = join(hooksDir, 'example-hook.js');
    writeFileSync(starterHookPath, generateStarterHook('example-hook', 'PreToolUse'), 'utf8');
    log.info(chalk.green('  ✓ Created hooks/example-hook.js (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ hooks/ has ${hookFiles.length} existing hook(s) (preserved)`));
  }

  // Always deploy the CCASP update check hook (essential for update notifications)
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');
  const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');

  if (!existsSync(updateCheckHookPath)) {
    // Hook doesn't exist - create from template
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    } else {
      // Fallback: create minimal version
      writeFileSync(updateCheckHookPath, generateUpdateCheckHook(), 'utf8');
      log.info(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    }
  } else {
    // Hook exists - check if it has the buggy path (Issue #9: state file mismatch)
    const existingHook = readFileSync(updateCheckHookPath, 'utf8');
    const hasBuggyPath = existingHook.includes('.ccasp-dev/ccasp-state.json') ||
                         existingHook.includes("'.ccasp-dev/") ||
                         !existingHook.includes('.claude/config/ccasp-state.json');

    if (hasBuggyPath && existsSync(templatePath)) {
      // Replace with fixed template version
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Updated hooks/ccasp-update-check.js (fixed state file path)'));
    } else {
      log.debug(chalk.blue('  ○ hooks/ccasp-update-check.js exists (preserved)'));
    }
  }

  // Deploy the usage tracking hook (tracks command/skill/agent usage for smart merge)
  const usageTrackingHookPath = join(hooksDir, 'usage-tracking.js');
  if (!existsSync(usageTrackingHookPath)) {
    const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'usage-tracking.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(usageTrackingHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Created hooks/usage-tracking.js (smart merge tracking)'));
    }
  } else {
    log.debug(chalk.blue('  ○ hooks/usage-tracking.js exists (preserved)'));
  }

  console.log('');

  // Step 4: Select optional features
  let selectedFeatures;

  if (options.skipPrompts) {
    // Use features passed from wizard, or default features in CI mode
    selectedFeatures = options.features || getDefaultFeatures().map(f => f.name);
    console.log(chalk.bold('Step 4: Using pre-selected features\n'));
    if (selectedFeatures.length > 0) {
      console.log(chalk.dim(`  Features: ${selectedFeatures.join(', ')}`));
    } else {
      console.log(chalk.dim('  Minimal mode - essential commands only'));
    }
    console.log('');
  } else {
    console.log(chalk.bold('Step 4: Select optional features\n'));
    console.log(chalk.dim('  Each feature adds commands and hooks to your project.'));
    console.log(chalk.dim('  Features marked with (*) require additional configuration via /menu after installation.\n'));

    // Display feature descriptions in a nice format
    for (const feature of OPTIONAL_FEATURES) {
      const marker = feature.default ? chalk.green('●') : chalk.dim('○');
      const postConfig = feature.requiresPostConfig ? chalk.yellow(' (*)') : '';
      console.log(`  ${marker} ${chalk.bold(feature.label)}${postConfig}`);
      console.log(chalk.dim(`     ${feature.description}`));
      if (feature.commands.length > 0) {
        console.log(chalk.dim(`     Adds: ${feature.commands.map(c => '/' + c).join(', ')}`));
      }
      console.log('');
    }

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFeatures',
        message: 'Select features to enable:',
        choices: OPTIONAL_FEATURES.map((feature) => ({
          name: `${feature.label}${feature.requiresPostConfig ? ' (*)' : ''} - ${feature.commands.length} commands, ${feature.hooks.length} hooks`,
          value: feature.name,
          checked: feature.default,
        })),
        pageSize: 10,
      },
    ]);
    selectedFeatures = result.selectedFeatures;
  }

  // Store selected features for later use
  const enabledFeatures = OPTIONAL_FEATURES.filter((f) => selectedFeatures.includes(f.name));
  const featuresRequiringConfig = enabledFeatures.filter((f) => f.requiresPostConfig);

  // Collect feature-specific commands, hooks, skills, and binaries to deploy
  const featureCommands = [];
  const featureHooks = [];
  const featureSkills = [];
  const featureBinaries = [];
  for (const feature of enabledFeatures) {
    featureCommands.push(...feature.commands);
    featureHooks.push(...(feature.hooks || []));
    featureSkills.push(...(feature.skills || []));
    featureBinaries.push(...(feature.binaries || []));
  }

  if (featureCommands.length > 0) {
    console.log('');
    console.log(chalk.green(`  ✓ Selected features will add ${featureCommands.length} command(s):`));
    console.log(chalk.dim(`    ${featureCommands.map(c => '/' + c).join(', ')}`));
  }

  if (featureHooks.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureHooks.length} hook(s):`));
    console.log(chalk.dim(`    ${featureHooks.join(', ')}`));
  }

  if (featureSkills.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureSkills.length} skill(s):`));
    console.log(chalk.dim(`    ${featureSkills.join(', ')}`));
  }

  if (featuresRequiringConfig.length > 0) {
    console.log('');
    console.log(chalk.yellow('  ℹ The following features require configuration after installation:'));
    for (const feature of featuresRequiringConfig) {
      console.log(chalk.yellow(`    • ${feature.label}`));
    }
    console.log(chalk.dim('    Run /menu → Project Settings after installation to complete setup.'));
  }

  // Check for optional npm package installs from selected features
  const featuresWithNpm = enabledFeatures.filter((f) => f.npmPackage);
  if (featuresWithNpm.length > 0 && !options.skipPrompts) {
    console.log('');
    console.log(chalk.bold('  Optional Package Installation\n'));

    for (const feature of featuresWithNpm) {
      const { installPackage } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installPackage',
          message: feature.npmInstallPrompt || `Install ${feature.npmPackage} globally?`,
          default: true,
        },
      ]);

      if (installPackage) {
        const npmSpinner = ora(`Installing ${feature.npmPackage}...`).start();
        try {
          const { execSync } = await import('child_process');
          execSync(`npm install -g ${feature.npmPackage}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000, // 2 minutes timeout
          });
          npmSpinner.succeed(`Installed ${feature.npmPackage} globally`);
        } catch (error) {
          npmSpinner.fail(`Failed to install ${feature.npmPackage}`);
          console.log(chalk.dim(`    Run manually: npm install -g ${feature.npmPackage}`));
        }
      } else {
        console.log(chalk.dim(`  Skipped. Install later with: npm install -g ${feature.npmPackage}`));
      }
    }
  } else if (featuresWithNpm.length > 0) {
    // In skipPrompts mode, just inform about optional packages
    console.log(chalk.dim(`  ℹ Optional packages available: ${featuresWithNpm.map(f => f.npmPackage).join(', ')}`));
    console.log(chalk.dim('    Install manually if needed.'));
  }

  console.log('');

  // Step 5: Select slash commands to install
  console.log(chalk.bold('Step 5: Select slash commands to install\n'));

  // Check for existing commands first
  const existingCmdFiles = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md')
    : [];
  const existingCmdNames = existingCmdFiles.map(f => f.replace('.md', ''));

  if (existingCmdNames.length > 0 && !options.skipPrompts) {
    console.log(chalk.blue(`  ℹ Found ${existingCmdNames.length} existing command(s) in your project:`));
    console.log(chalk.dim(`    ${existingCmdNames.map(c => '/' + c).join(', ')}`));
    console.log(chalk.dim('    These will be preserved unless you choose to overwrite.\n'));
  }

  let selectedCommands;

  if (options.skipPrompts) {
    // Use default selections when called non-interactively
    selectedCommands = AVAILABLE_COMMANDS.filter(c => c.selected).map(c => c.name);
    console.log(chalk.dim(`  Auto-selecting ${selectedCommands.length} default command(s)`));
  } else {
    const categories = [...new Set(AVAILABLE_COMMANDS.map((c) => c.category))];

    for (const category of categories) {
      console.log(chalk.cyan(`  ${category}:`));
      const cmds = AVAILABLE_COMMANDS.filter((c) => c.category === category);
      for (const cmd of cmds) {
        const isExisting = existingCmdNames.includes(cmd.name);
        const marker = cmd.selected ? chalk.green('●') : chalk.dim('○');
        const required = cmd.required ? chalk.yellow(' (required)') : '';
        const existing = isExisting ? chalk.blue(' [exists]') : '';
        console.log(`    ${marker} /${cmd.name}${required}${existing} - ${chalk.dim(cmd.description)}`);
      }
      console.log('');
    }

    // Ask which commands to install
    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCommands',
        message: 'Select commands to install (existing commands marked with [exists]):',
        choices: AVAILABLE_COMMANDS.map((cmd) => {
          const isExisting = existingCmdNames.includes(cmd.name);
          return {
            name: `/${cmd.name}${isExisting ? ' [exists]' : ''} - ${cmd.description}`,
            value: cmd.name,
            checked: cmd.selected,
            disabled: cmd.required ? 'Required' : false,
          };
        }),
        pageSize: 15,
      },
    ]);
    selectedCommands = result.selectedCommands;
  }

  // Always include required commands AND feature-specific commands
  const requiredCommands = AVAILABLE_COMMANDS.filter(c => c.required).map(c => c.name);
  // Critical commands for upgrade system - always include these
  const criticalCommands = ['update-check', '__ccasp-sync-marker'];
  const finalCommands = [...new Set([...requiredCommands, ...criticalCommands, ...selectedCommands, ...featureCommands])];

  if (finalCommands.length === 0) {
    showWarning('No commands selected. Nothing to install.');
    return;
  }

  // Show what feature commands were auto-added
  const autoAddedCommands = featureCommands.filter(c => !selectedCommands.includes(c) && !requiredCommands.includes(c));
  if (autoAddedCommands.length > 0) {
    console.log(chalk.cyan(`  ℹ Auto-including ${autoAddedCommands.length} feature command(s): ${autoAddedCommands.map(c => '/' + c).join(', ')}`));
  }

  console.log('');

  // Step 6: Check for existing commands that would be overwritten
  const commandsToOverwrite = finalCommands.filter(cmd => existingCmdNames.includes(cmd));

  // Track commands that need smart merge handling
  const smartMergeDecisions = {};

  let overwrite = options.force || false;
  if (commandsToOverwrite.length > 0 && !overwrite) {
    // In skipPrompts mode, preserve all existing commands (no overwrite)
    if (options.skipPrompts) {
      for (const cmd of commandsToOverwrite) {
        smartMergeDecisions[cmd] = 'skip';
      }
      // Filter out skipped commands
      const filtered = finalCommands.filter((c) => !commandsToOverwrite.includes(c) || requiredCommands.includes(c));
      finalCommands.length = 0;
      finalCommands.push(...filtered);
      console.log(chalk.dim(`  Preserving ${commandsToOverwrite.length} existing command(s), installing ${finalCommands.length} new`));
    } else {
    // Check for customized assets that have been used
    const assetsNeedingMerge = getAssetsNeedingMerge(process.cwd());
    const customizedCommands = commandsToOverwrite.filter(cmd =>
      assetsNeedingMerge.commands?.some(a => a.name === cmd)
    );

    // Show smart merge prompt for customized commands
    if (customizedCommands.length > 0) {
      console.log(chalk.cyan.bold('\n  🔀 Smart Merge Available'));
      console.log(chalk.dim('  The following commands have been customized and used:\n'));

      for (const cmd of customizedCommands) {
        const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
        console.log(chalk.cyan(`    • /${cmd}`));
        console.log(chalk.dim(`      Used ${assetInfo.usageData.useCount} time(s), last: ${new Date(assetInfo.usageData.lastUsed).toLocaleDateString()}`));
        console.log(chalk.dim(`      Change: ${assetInfo.comparison.significance.level} significance - ${assetInfo.comparison.summary}`));
      }
      console.log('');

      const { smartMergeAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'smartMergeAction',
          message: 'How would you like to handle your customized commands?',
          choices: [
            { name: '🔍 Explore each one - Let Claude explain the changes', value: 'explore' },
            { name: '📋 Skip all customized - Keep your versions', value: 'skip-customized' },
            { name: '🔄 Replace all - Use new versions (lose customizations)', value: 'replace-all' },
            { name: '❌ Cancel installation', value: 'cancel' },
          ],
        },
      ]);

      if (smartMergeAction === 'cancel') {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }

      if (smartMergeAction === 'explore') {
        // Individual exploration for each customized command
        console.log(chalk.cyan('\n  Exploring customized commands...\n'));

        for (const cmd of customizedCommands) {
          const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
          const local = getLocalAsset('commands', cmd, process.cwd());
          const template = getTemplateAsset('commands', cmd);

          // Show merge explanation
          console.log(chalk.bold(`\n  ┌${'─'.repeat(60)}┐`));
          console.log(chalk.bold(`  │ /${cmd.padEnd(58)} │`));
          console.log(chalk.bold(`  └${'─'.repeat(60)}┘`));

          const explanation = generateMergeExplanation(
            'commands',
            cmd,
            assetInfo.comparison,
            local?.content,
            template?.content
          );

          // Display condensed explanation
          console.log(chalk.dim('\n  ' + explanation.split('\n').slice(0, 15).join('\n  ')));

          const { decision } = await inquirer.prompt([
            {
              type: 'list',
              name: 'decision',
              message: `What would you like to do with /${cmd}?`,
              choices: [
                { name: 'Skip - Keep your customized version', value: 'skip' },
                { name: 'Backup & Replace - Save yours, use new version', value: 'backup' },
                { name: 'Replace - Use new version (no backup)', value: 'replace' },
                { name: 'Show full diff', value: 'diff' },
              ],
            },
          ]);

          if (decision === 'diff') {
            // Show full diff
            console.log(chalk.dim('\n--- Your Version ---'));
            console.log(local?.content?.slice(0, 500) + (local?.content?.length > 500 ? '\n...(truncated)' : ''));
            console.log(chalk.dim('\n--- Update Version ---'));
            console.log(template?.content?.slice(0, 500) + (template?.content?.length > 500 ? '\n...(truncated)' : ''));

            // Re-prompt after showing diff
            const { finalDecision } = await inquirer.prompt([
              {
                type: 'list',
                name: 'finalDecision',
                message: `Final decision for /${cmd}?`,
                choices: [
                  { name: 'Skip - Keep your version', value: 'skip' },
                  { name: 'Backup & Replace', value: 'backup' },
                  { name: 'Replace without backup', value: 'replace' },
                ],
              },
            ]);
            smartMergeDecisions[cmd] = finalDecision;
          } else {
            smartMergeDecisions[cmd] = decision;
          }
        }
      } else if (smartMergeAction === 'skip-customized') {
        // Mark all customized commands as skip
        for (const cmd of customizedCommands) {
          smartMergeDecisions[cmd] = 'skip';
        }
        console.log(chalk.green(`\n  ✓ Will preserve ${customizedCommands.length} customized command(s)`));
      } else if (smartMergeAction === 'replace-all') {
        // Mark all customized commands as replace with backup
        for (const cmd of customizedCommands) {
          smartMergeDecisions[cmd] = 'backup';
        }
        console.log(chalk.yellow(`\n  ⚠ Will backup and replace ${customizedCommands.length} customized command(s)`));
      }

      // Remove customized commands from the standard overwrite flow
      // (they're handled by smart merge decisions)
      const nonCustomizedToOverwrite = commandsToOverwrite.filter(c => !customizedCommands.includes(c));

      if (nonCustomizedToOverwrite.length > 0) {
        console.log(chalk.yellow.bold('\n  ⚠ The following non-customized commands also exist:'));
        for (const cmd of nonCustomizedToOverwrite) {
          console.log(chalk.yellow(`    • /${cmd}`));
        }
      }
    }

    // Standard overwrite prompt for non-customized commands
    const remainingToOverwrite = commandsToOverwrite.filter(c => !smartMergeDecisions[c]);

    if (remainingToOverwrite.length > 0) {
      if (!customizedCommands || customizedCommands.length === 0) {
        console.log(chalk.yellow.bold('  ⚠ The following commands already exist:'));
        for (const cmd of remainingToOverwrite) {
          console.log(chalk.yellow(`    • /${cmd}`));
        }
      }
      console.log('');

      const { overwriteChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'overwriteChoice',
          message: 'How would you like to handle these existing commands?',
          choices: [
            { name: 'Skip existing - only install new commands (recommended)', value: 'skip' },
            { name: 'Overwrite with backup - save existing to .claude/backups/ first', value: 'backup' },
            { name: 'Overwrite all - replace existing (no backup)', value: 'overwrite' },
            { name: 'Cancel installation', value: 'cancel' },
          ],
        },
      ]);

      if (overwriteChoice === 'cancel') {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }

      overwrite = overwriteChoice === 'overwrite' || overwriteChoice === 'backup';

      // Apply decision to remaining commands
      for (const cmd of remainingToOverwrite) {
        smartMergeDecisions[cmd] = overwriteChoice === 'skip' ? 'skip' : (overwriteChoice === 'backup' ? 'backup' : 'replace');
      }

      if (!overwrite) {
        // Filter out skipped commands
        const skippedCommands = Object.entries(smartMergeDecisions)
          .filter(([, decision]) => decision === 'skip')
          .map(([cmd]) => cmd);
        const filtered = finalCommands.filter((c) => !skippedCommands.includes(c) || requiredCommands.includes(c));
        finalCommands.length = 0;
        finalCommands.push(...filtered);
        console.log(chalk.green(`\n  ✓ Will install ${finalCommands.length} new command(s), preserving ${skippedCommands.length} existing`));
      } else if (overwriteChoice === 'backup') {
        console.log(chalk.cyan(`\n  ✓ Will backup and overwrite ${remainingToOverwrite.length} existing command(s)`));
      } else {
        console.log(chalk.yellow(`\n  ⚠ Will overwrite ${remainingToOverwrite.length} existing command(s)`));
      }
    } else if (Object.keys(smartMergeDecisions).length > 0) {
      // All commands handled by smart merge
      const skippedCommands = Object.entries(smartMergeDecisions)
        .filter(([, decision]) => decision === 'skip')
        .map(([cmd]) => cmd);

      if (skippedCommands.length > 0) {
        const filtered = finalCommands.filter((c) => !skippedCommands.includes(c) || requiredCommands.includes(c));
        finalCommands.length = 0;
        finalCommands.push(...filtered);
      }
    }
    } // end else (!options.skipPrompts)
  }

  // Track if we should create backups (set outside the if block for use later)
  // Now also considers smart merge decisions
  const createBackups = options.backup || (typeof overwrite !== 'undefined' && commandsToOverwrite.length > 0 && !options.force);
  const backedUpFiles = [];

  // Helper to check if a command should be backed up based on smart merge decisions
  const shouldBackupCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'backup';
    }
    return createBackups;
  };

  // Helper to check if a command should be skipped based on smart merge decisions
  const shouldSkipCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'skip';
    }
    return false;
  };

  // Step 6: Install commands (delegated to deploy-assets.js)
  // Get installed agents, skills, hooks for menu
  const installedAgents = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
    : [];
  const installedSkills = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter(f => !f.startsWith('.'))
    : [];
  const installedHooks = existsSync(hooksDir)
    ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
    : [];

  // Critical commands that should ALWAYS be updated (never skipped)
  const alwaysUpdateCommands = ['update-check', '__ccasp-sync-marker'];

  const commandResult = await deployCommands({
    commandsDir,
    finalCommands,
    projectName,
    installedAgents,
    installedSkills,
    installedHooks,
    alwaysUpdateCommands,
    shouldBackupCommand,
    shouldSkipCommand,
    COMMAND_TEMPLATES,
    generateMenuCommand,
    createBackup,
  });

  const installed = commandResult.installed;
  const failed = commandResult.failed;
  backedUpFiles.push(...commandResult.backedUpFiles);

  // Step 6b: Deploy feature-specific hooks (delegated to deploy-assets.js)
  const hooksResult = await deployHooks({
    hooksDir,
    featureHooks,
    overwrite,
    createBackup,
  });

  const deployedHooks = hooksResult.deployed;
  const failedHooks = hooksResult.failed;
  backedUpFiles.push(...hooksResult.backedUpFiles);

  // Step 6c: Deploy feature skills (delegated to deploy-assets.js)
  const skillsResult = await deploySkills({
    skillsDir,
    featureSkills,
    overwrite,
    createBackup,
  });

  const deployedSkills = skillsResult.deployed;
  const failedSkills = skillsResult.failed;
  backedUpFiles.push(...skillsResult.backedUpFiles);

  // Step 6d: Deploy feature binaries (helper scripts) - delegated to deploy-assets.js
  const binariesResult = await deployBinaries({
    cwd,
    featureBinaries,
    overwrite,
    createBackup,
  });

  const deployedBinaries = binariesResult.deployed;
  const failedBinaries = binariesResult.failed;
  backedUpFiles.push(...binariesResult.backedUpFiles);

  // Step 7: Generate INDEX.md
  const indexPath = join(commandsDir, 'INDEX.md');
  const indexContent = generateIndexFile(installed, projectName);
  writeFileSync(indexPath, indexContent, 'utf8');

  // Step 8: Generate README.md
  const readmePath = join(commandsDir, 'README.md');
  const readmeContent = generateReadmeFile(installed, projectName);
  writeFileSync(readmePath, readmeContent, 'utf8');

  // Summary
  console.log('');

  // Count what was preserved
  const preservedCommands = existingCmdNames.filter(c => !installed.includes(c) || !overwrite);
  const newCommands = installed.filter(c => !existingCmdNames.includes(c));
  const updatedCommands = installed.filter(c => existingCmdNames.includes(c) && overwrite);

  if (installed.length > 0) {
    const summaryLines = [
      '',
      `Project: ${projectName}`,
      '',
    ];

    // Show what happened
    if (hasExistingClaudeDir) {
      summaryLines.push('Integration Summary:');
      if (newCommands.length > 0) {
        summaryLines.push(`  ✓ ${newCommands.length} new command(s) added`);
      }
      if (updatedCommands.length > 0) {
        summaryLines.push(`  ↻ ${updatedCommands.length} command(s) updated`);
      }
      if (preservedCommands.length > 0) {
        summaryLines.push(`  ○ ${preservedCommands.length} existing command(s) preserved`);
      }
      summaryLines.push('');
    }

    summaryLines.push('Folder Structure:');
    summaryLines.push('  .claude/');
    summaryLines.push('  ├── commands/     (slash commands)');
    summaryLines.push('  ├── agents/       (custom agents)');
    summaryLines.push('  ├── skills/       (skill packages)');
    summaryLines.push('  ├── hooks/        (enforcement hooks)');
    summaryLines.push('  ├── docs/         (documentation)');
    summaryLines.push('  ├── settings.json');
    summaryLines.push('  └── settings.local.json');
    summaryLines.push('');
    summaryLines.push(`Commands Available: ${installed.length + preservedCommands.length}`);
    summaryLines.push(...installed.slice(0, 6).map((c) => `  /${c}${newCommands.includes(c) ? ' (new)' : ''}`));
    if (installed.length > 6) {
      summaryLines.push(`  ... and ${installed.length - 6} more`);
    }

    showSuccess('Claude CLI Advanced Starter Pack Deployed!', summaryLines);
  }

  if (failed.length > 0) {
    showError('Some commands failed to install:');
    for (const f of failed) {
      console.log(chalk.red(`  /${f.name}: ${f.error}`));
    }
  }

  // Generate tech-stack.json with enabled features
  const techStackPath = join(claudeDir, 'config', 'tech-stack.json');
  const configDir = join(claudeDir, 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Build tech-stack.json with enabled features
  const techStack = {
    version: '2.0.0',
    project: {
      name: projectName,
      description: '',
      rootPath: '.',
    },
    // Enable features based on user selection
    tokenManagement: {
      enabled: selectedFeatures.includes('tokenManagement'),
      dailyBudget: 200000,
      thresholds: { compact: 0.75, archive: 0.85, respawn: 0.90 },
    },
    happyMode: {
      enabled: selectedFeatures.includes('happyMode'),
      dashboardUrl: null,
      checkpointInterval: 10,
      verbosity: 'condensed',
    },
    agents: {
      enabled: true,
      l1: { model: 'sonnet', tools: ['Task', 'Read', 'Grep', 'Glob', 'WebSearch'], maxTokens: 16000 },
      l2: { model: 'sonnet', tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'], maxTokens: 8000 },
      l3: { model: 'haiku', tools: ['Read', 'Grep'], maxTokens: 500 },
      maxConcurrent: 4,
    },
    phasedDevelopment: {
      enabled: selectedFeatures.includes('phasedDevelopment'),
      defaultScale: 'M',
      successTarget: 0.95,
    },
    hooks: {
      enabled: true,
      priorities: { lifecycle: 100, tools: 1000, automation: 2000 },
      errorBehavior: 'approve',
    },
    devEnvironment: {
      tunnel: {
        service: 'none', // No default - configured via /menu
        url: null,
        subdomain: null,
      },
    },
    deployment: {
      frontend: { platform: 'none' },
      backend: { platform: 'none' },
    },
    versionControl: {
      provider: 'github',
      projectBoard: { type: 'none' },
    },
    // Track which features need post-install configuration
    _pendingConfiguration: featuresRequiringConfig.map((f) => f.name),
    // Track what was deployed for verification
    _deployment: {
      commands: installed,
      featureCommands: featureCommands.filter(c => installed.includes(c)),
      hooks: deployedHooks,
      featureHooks: featureHooks,
      skills: deployedSkills,
      featureSkills: featureSkills,
      enabledFeatures: selectedFeatures,
      timestamp: new Date().toISOString(),
    },
  };

  if (!existsSync(techStackPath)) {
    safeWriteJson(techStackPath, techStack);
    log.info(chalk.green('  ✓ Created config/tech-stack.json'));
  } else {
    log.debug(chalk.blue('  ○ config/tech-stack.json exists (preserved)'));
  }

  // Update ccasp-state.json with current version (fixes version display in /menu)
  const ccaspStatePath = join(configDir, 'ccasp-state.json');
  const currentVersion = getVersion();
  let ccaspState = { currentVersion, lastCheckTimestamp: 0, updateAvailable: false };

  if (existsSync(ccaspStatePath)) {
    try {
      ccaspState = JSON.parse(readFileSync(ccaspStatePath, 'utf8'));
    } catch {
      // Use default state if parse fails
    }
  }

  // Always update the current version to match installed CCASP
  ccaspState.currentVersion = currentVersion;
  ccaspState.installedAt = new Date().toISOString();

  safeWriteJson(ccaspStatePath, ccaspState);
  log.info(chalk.green(`  ✓ Updated ccasp-state.json (v${currentVersion})`));

  // Register project in global registry (unless --no-register flag is set)
  if (!options.noRegister) {
    const isNewProject = registerProject(cwd, {
      name: projectName,
      version: currentVersion,
      features: selectedFeatures
    });
    if (isNewProject) {
      log.info(chalk.green(`  ✓ Registered project in global CCASP registry`));
    } else {
      log.debug(`  ○ Updated project in global CCASP registry`);
    }
  }

  // Auto-generate stack-specific agents if feature is enabled
  if (selectedFeatures.includes('autoStackAgents')) {
    console.log('');
    console.log(chalk.bold('Step 8: Generating Stack-Specific Agents\n'));
    try {
      const { generateAgents } = await import('./generate-agents.js');
      await generateAgents({ projectRoot: cwd, auto: true, silent: true });
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Agent generation skipped: ${err.message}`));
      console.log(chalk.dim('    Run /generate-agents manually after tech stack detection.'));
    }
  }

  // Show next steps
  console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.bold('Next Steps:\n'));
  console.log(chalk.cyan('  1.') + ' Launch Claude Code CLI in this project');
  console.log(chalk.cyan('  2.') + ` Type ${chalk.bold('/menu')} to see the interactive project menu`);

  // Show post-config reminder if features need it
  if (featuresRequiringConfig.length > 0) {
    console.log(chalk.cyan('  3.') + chalk.yellow(' Configure enabled features via /menu → Project Settings'));
    console.log(chalk.dim(`       Features pending configuration: ${featuresRequiringConfig.map((f) => f.label).join(', ')}`));
    console.log(chalk.cyan('  4.') + ' Use any installed command by typing its name (e.g., /e2e-test)');
  } else {
    console.log(chalk.cyan('  3.') + ' Use any installed command by typing its name (e.g., /e2e-test)');
  }

  console.log('');
  console.log(chalk.dim('  Customize your setup:'));
  console.log(chalk.dim('    • Edit agents in .claude/agents/'));
  console.log(chalk.dim('    • Create skills in .claude/skills/'));
  console.log(chalk.dim('    • Add hooks in .claude/hooks/'));
  console.log(chalk.dim('    • Configure tech stack in .claude/config/tech-stack.json'));
  console.log('');
  console.log(chalk.dim(`  To update: ${chalk.bold('npx claude-cli-advanced-starter-pack init --force')}`));
  console.log('');
}

// verifyLegacyInstallation is now in init/legacy-verify.js and re-exported at the top
