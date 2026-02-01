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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run dev mode - rapid template testing workflow
 * Loads existing tech-stack.json, processes templates, overwrites commands
 */
async function runDevMode(options = {}) {
  const cwd = process.cwd();
  const projectName = basename(cwd);
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const hooksDir = join(claudeDir, 'hooks');
  const configDir = join(claudeDir, 'config');
  const techStackPath = join(configDir, 'tech-stack.json');

  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.magenta.bold('  🔧 DEV MODE - Template Testing'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.cyan(`  Project: ${chalk.bold(projectName)}`));
  console.log(chalk.cyan(`  Location: ${cwd}`));
  console.log('');

  // Load existing tech-stack.json
  let techStack = {};
  if (existsSync(techStackPath)) {
    try {
      techStack = JSON.parse(readFileSync(techStackPath, 'utf8'));
      console.log(chalk.green('  ✓ Loaded existing tech-stack.json'));
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Could not parse tech-stack.json: ${err.message}`));
    }
  } else {
    console.log(chalk.yellow('  ⚠ No tech-stack.json found - templates will have unprocessed placeholders'));
  }

  // Ensure directories exist
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
    console.log(chalk.green('  ✓ Created .claude/commands/'));
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
    console.log(chalk.green('  ✓ Created .claude/hooks/'));
  }

  // Identify custom commands (no matching template) to preserve
  const templatesDir = join(__dirname, '..', '..', 'templates', 'commands');
  const hooksTemplatesDir = join(__dirname, '..', '..', 'templates', 'hooks');

  const templateCommandNames = existsSync(templatesDir)
    ? readdirSync(templatesDir).filter(f => f.endsWith('.template.md')).map(f => f.replace('.template.md', ''))
    : [];
  const templateHookNames = existsSync(hooksTemplatesDir)
    ? readdirSync(hooksTemplatesDir).filter(f => f.endsWith('.template.js')).map(f => f.replace('.template.js', ''))
    : [];

  // Find existing custom commands (those without matching templates)
  const existingCommands = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
    : [];
  const customCommands = existingCommands.filter(cmd =>
    !templateCommandNames.includes(cmd) &&
    cmd !== 'menu' &&
    cmd !== 'INDEX' &&
    cmd !== 'README'
  );

  if (customCommands.length > 0) {
    console.log(chalk.blue(`  📌 Preserving ${customCommands.length} custom command(s):`));
    for (const cmd of customCommands) {
      console.log(chalk.dim(`    • /${cmd}`));
    }
    console.log('');
  }

  console.log(chalk.bold('Processing and deploying templates...\n'));

  const spinner = ora('Processing templates...').start();
  const deployed = { commands: [], hooks: [], preserved: customCommands };
  const failed = [];

  // Get all command templates
  if (existsSync(templatesDir)) {
    const templateFiles = readdirSync(templatesDir).filter(f => f.endsWith('.template.md'));

    for (const templateFile of templateFiles) {
      const cmdName = templateFile.replace('.template.md', '');
      const templatePath = join(templatesDir, templateFile);
      const outputPath = join(commandsDir, `${cmdName}.md`);

      try {
        const content = readFileSync(templatePath, 'utf8');

        // Process template with tech-stack values
        const { content: processed, warnings } = replacePlaceholders(content, techStack, {
          preserveUnknown: false,
          warnOnMissing: false,
        });

        writeFileSync(outputPath, processed, 'utf8');
        deployed.commands.push(cmdName);
      } catch (err) {
        failed.push({ name: cmdName, type: 'command', error: err.message });
      }
    }
  }

  // Also process hook templates
  if (existsSync(hooksTemplatesDir)) {
    const hookFiles = readdirSync(hooksTemplatesDir).filter(f => f.endsWith('.template.js'));

    for (const hookFile of hookFiles) {
      const hookName = hookFile.replace('.template.js', '');
      const templatePath = join(hooksTemplatesDir, hookFile);
      const outputPath = join(hooksDir, `${hookName}.js`);

      try {
        const content = readFileSync(templatePath, 'utf8');

        // Process template with tech-stack values
        const { content: processed } = replacePlaceholders(content, techStack, {
          preserveUnknown: false,
          warnOnMissing: false,
        });

        writeFileSync(outputPath, processed, 'utf8');
        deployed.hooks.push(hookName);
      } catch (err) {
        failed.push({ name: hookName, type: 'hook', error: err.message });
      }
    }
  }

  // Generate menu command from scratch (uses COMMAND_TEMPLATES)
  const menuTemplate = COMMAND_TEMPLATES['menu'];
  if (menuTemplate) {
    const installedAgents = existsSync(join(claudeDir, 'agents'))
      ? readdirSync(join(claudeDir, 'agents')).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
      : [];
    const installedSkills = existsSync(join(claudeDir, 'skills'))
      ? readdirSync(join(claudeDir, 'skills')).filter(f => !f.startsWith('.'))
      : [];
    const installedHooks = existsSync(hooksDir)
      ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
      : [];

    const menuContent = generateMenuCommand(projectName, deployed.commands, installedAgents, installedSkills, installedHooks);
    writeFileSync(join(commandsDir, 'menu.md'), menuContent, 'utf8');
    deployed.commands.push('menu');
  }

  // Generate INDEX.md
  const indexContent = generateIndexFile(deployed.commands, projectName);
  writeFileSync(join(commandsDir, 'INDEX.md'), indexContent, 'utf8');

  // Generate README.md
  const readmeContent = generateReadmeFile(deployed.commands, projectName);
  writeFileSync(join(commandsDir, 'README.md'), readmeContent, 'utf8');

  spinner.stop();

  // Summary
  console.log('');
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  ✓ DEV MODE: Templates Deployed'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.cyan(`  Commands: ${deployed.commands.length} deployed`));
  console.log(chalk.cyan(`  Hooks: ${deployed.hooks.length} deployed`));
  if (deployed.preserved && deployed.preserved.length > 0) {
    console.log(chalk.blue(`  Custom: ${deployed.preserved.length} preserved`));
  }
  if (failed.length > 0) {
    console.log(chalk.yellow(`  Failed: ${failed.length}`));
    for (const f of failed) {
      console.log(chalk.red(`    • ${f.type}/${f.name}: ${f.error}`));
    }
  }
  console.log('');
  console.log(chalk.dim('  tech-stack.json: Preserved'));
  console.log(chalk.dim('  settings.json: Preserved'));
  if (deployed.preserved && deployed.preserved.length > 0) {
    console.log(chalk.dim(`  Custom commands: ${deployed.preserved.join(', ')}`));
  }
  console.log('');
  console.log(chalk.yellow.bold('  ⚠ Restart Claude Code CLI to use new commands'));
  console.log('');

  return { deployed, failed };
}

/**
 * Run the init wizard
 */
export async function runInit(options = {}) {
  // DEV MODE: Fast path for template testing
  if (options.dev) {
    showHeader('Claude CLI Advanced Starter Pack - DEV MODE');
    return runDevMode(options);
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
        writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf8');
        console.log(chalk.green('  ✓ Updated settings.json (added update check hook)'));
      } else {
        console.log(chalk.blue('  ○ settings.json exists (preserved)'));
      }
    } catch (error) {
      console.log(chalk.blue('  ○ settings.json exists (preserved)'));
    }
  }

  if (!existsSync(settingsLocalPath)) {
    writeFileSync(settingsLocalPath, generateSettingsLocalJson(), 'utf8');
    console.log(chalk.green('  ✓ Created settings.local.json'));
  } else {
    console.log(chalk.blue('  ○ settings.local.json exists (preserved)'));
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
    console.log(chalk.green('  ✓ Created agents/example-agent.md (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ agents/ has ${agentFiles.length} existing agent(s) (preserved)`));
  }

  // Check if skills folder has any skills before adding example
  const skillDirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => !f.startsWith('.')) : [];
  if (skillDirs.length === 0) {
    const starterSkillDir = join(skillsDir, 'example-skill');
    mkdirSync(starterSkillDir, { recursive: true });
    mkdirSync(join(starterSkillDir, 'context'), { recursive: true });
    mkdirSync(join(starterSkillDir, 'workflows'), { recursive: true });
    writeFileSync(join(starterSkillDir, 'skill.md'), generateStarterSkill('example-skill'), 'utf8');
    writeFileSync(join(starterSkillDir, 'context', 'README.md'), '# Context\n\nAdd supporting documentation here.\n', 'utf8');
    writeFileSync(join(starterSkillDir, 'workflows', 'README.md'), '# Workflows\n\nAdd step-by-step procedures here.\n', 'utf8');
    console.log(chalk.green('  ✓ Created skills/example-skill/ (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ skills/ has ${skillDirs.length} existing skill(s) (preserved)`));
  }

  // Check if hooks folder has any files before adding example
  const hookFiles = existsSync(hooksDir) ? readdirSync(hooksDir).filter(f => f.endsWith('.js')) : [];
  if (hookFiles.length === 0) {
    const starterHookPath = join(hooksDir, 'example-hook.js');
    writeFileSync(starterHookPath, generateStarterHook('example-hook', 'PreToolUse'), 'utf8');
    console.log(chalk.green('  ✓ Created hooks/example-hook.js (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ hooks/ has ${hookFiles.length} existing hook(s) (preserved)`));
  }

  // Always deploy the CCASP update check hook (essential for update notifications)
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');
  const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');

  if (!existsSync(updateCheckHookPath)) {
    // Hook doesn't exist - create from template
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      console.log(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    } else {
      // Fallback: create minimal version
      writeFileSync(updateCheckHookPath, generateUpdateCheckHook(), 'utf8');
      console.log(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
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
      console.log(chalk.green('  ✓ Updated hooks/ccasp-update-check.js (fixed state file path)'));
    } else {
      console.log(chalk.blue('  ○ hooks/ccasp-update-check.js exists (preserved)'));
    }
  }

  // Deploy the usage tracking hook (tracks command/skill/agent usage for smart merge)
  const usageTrackingHookPath = join(hooksDir, 'usage-tracking.js');
  if (!existsSync(usageTrackingHookPath)) {
    const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'usage-tracking.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(usageTrackingHookPath, hookContent, 'utf8');
      console.log(chalk.green('  ✓ Created hooks/usage-tracking.js (smart merge tracking)'));
    }
  } else {
    console.log(chalk.blue('  ○ hooks/usage-tracking.js exists (preserved)'));
  }

  console.log('');

  // Step 4: Select optional features
  let selectedFeatures;

  if (options.skipPrompts && options.features) {
    // Use features passed from wizard
    selectedFeatures = options.features;
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
  const finalCommands = [...new Set([...requiredCommands, ...selectedCommands, ...featureCommands])];

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

  // Step 7: Install commands
  console.log(chalk.bold('Step 6: Installing slash commands\n'));

  const spinner = ora('Installing commands...').start();
  const installed = [];
  const failed = [];

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

  for (const cmdName of finalCommands) {
    try {
      // Skip commands that were marked to skip in smart merge
      if (shouldSkipCommand(cmdName)) {
        continue;
      }

      const cmdPath = join(commandsDir, `${cmdName}.md`);

      let content;
      if (cmdName === 'menu') {
        // Generate dynamic menu command
        content = generateMenuCommand(projectName, finalCommands, installedAgents, installedSkills, installedHooks);
      } else {
        const template = COMMAND_TEMPLATES[cmdName];
        if (template) {
          content = template();
        } else {
          // Try to load from templates/commands/ folder
          const templatePath = join(__dirname, '..', '..', 'templates', 'commands', `${cmdName}.template.md`);
          if (existsSync(templatePath)) {
            content = readFileSync(templatePath, 'utf8');
          } else {
            failed.push({ name: cmdName, error: 'No template found' });
            continue;
          }
        }
      }

      // Create backup if overwriting existing file (respects smart merge decisions)
      if (existsSync(cmdPath) && shouldBackupCommand(cmdName)) {
        const backupPath = createBackup(cmdPath);
        if (backupPath) {
          backedUpFiles.push({ original: cmdPath, backup: backupPath });
        }
      }

      writeFileSync(cmdPath, content, 'utf8');
      installed.push(cmdName);
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

  // Show backup summary if any files were backed up
  if (backedUpFiles.length > 0) {
    console.log(chalk.cyan(`\n  📁 Backed up ${backedUpFiles.length} file(s) to .claude/backups/`));
  }

  // Step 6b: Deploy feature-specific hooks
  const deployedHooks = [];
  const failedHooks = [];

  if (featureHooks.length > 0) {
    console.log(chalk.bold('\nStep 6b: Deploying feature hooks\n'));

    for (const hookName of featureHooks) {
      try {
        const hookPath = join(hooksDir, `${hookName}.js`);
        const hookExists = existsSync(hookPath);

        // Respect overwrite setting for hooks (like commands)
        if (hookExists && !overwrite) {
          console.log(chalk.blue(`  ○ hooks/${hookName}.js exists (preserved)`));
          continue;
        }

        // Try to load from templates/hooks/ folder
        const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', `${hookName}.template.js`);
        if (existsSync(templatePath)) {
          // Create backup if overwriting existing hook
          if (hookExists && overwrite) {
            const backupPath = createBackup(hookPath);
            if (backupPath) {
              backedUpFiles.push({ original: hookPath, backup: backupPath });
            }
          }
          const hookContent = readFileSync(templatePath, 'utf8');
          writeFileSync(hookPath, hookContent, 'utf8');
          deployedHooks.push(hookName);
          const action = hookExists ? 'Updated' : 'Created';
          console.log(chalk.green(`  ✓ ${action} hooks/${hookName}.js`));
        } else {
          failedHooks.push({ name: hookName, error: 'No template found' });
          console.log(chalk.yellow(`  ⚠ Skipped hooks/${hookName}.js (no template)`));
        }
      } catch (error) {
        failedHooks.push({ name: hookName, error: error.message });
        console.log(chalk.red(`  ✗ Failed: hooks/${hookName}.js - ${error.message}`));
      }
    }

    if (deployedHooks.length > 0) {
      console.log(chalk.green(`\n  ✓ Deployed ${deployedHooks.length} feature hook(s)`));
    }
  }

  // Step 6c: Deploy feature skills
  const deployedSkills = [];
  const failedSkills = [];

  if (featureSkills.length > 0) {
    console.log(chalk.bold('\nStep 6c: Deploying feature skills\n'));

    for (const skillName of featureSkills) {
      try {
        const skillPath = join(skillsDir, skillName);
        const skillExists = existsSync(skillPath);

        // Respect overwrite setting for skills (like commands)
        if (skillExists && !overwrite) {
          console.log(chalk.blue(`  ○ skills/${skillName}/ exists (preserved)`));
          continue;
        }

        // Try to load from templates/skills/ folder
        const templatePath = join(__dirname, '..', '..', 'templates', 'skills', skillName);
        if (existsSync(templatePath)) {
          // Create backup if overwriting existing skill
          if (skillExists && overwrite) {
            const backupPath = createBackup(skillPath);
            if (backupPath) {
              backedUpFiles.push({ original: skillPath, backup: backupPath });
            }
          }
          // Create skill directory and copy recursively
          mkdirSync(skillPath, { recursive: true });
          const { cpSync } = await import('fs');
          cpSync(templatePath, skillPath, { recursive: true });
          deployedSkills.push(skillName);
          const action = skillExists ? 'Updated' : 'Created';
          console.log(chalk.green(`  ✓ ${action} skills/${skillName}/`));
        } else {
          failedSkills.push({ name: skillName, error: 'No template found' });
          console.log(chalk.yellow(`  ⚠ Skipped skills/${skillName}/ (no template)`));
        }
      } catch (error) {
        failedSkills.push({ name: skillName, error: error.message });
        console.log(chalk.red(`  ✗ Failed: skills/${skillName}/ - ${error.message}`));
      }
    }

    if (deployedSkills.length > 0) {
      console.log(chalk.green(`\n  ✓ Deployed ${deployedSkills.length} feature skill(s)`));
    }
  }

  // Step 6d: Deploy feature binaries (helper scripts)
  const deployedBinaries = [];
  const failedBinaries = [];

  if (featureBinaries.length > 0) {
    console.log(chalk.bold('\nStep 6d: Deploying helper scripts\n'));

    // Create bin directory in project root (alongside .claude)
    const binDir = join(cwd, 'bin');
    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true });
    }

    for (const binaryName of featureBinaries) {
      try {
        const binaryPath = join(binDir, binaryName);
        const binaryExists = existsSync(binaryPath);

        // Respect overwrite setting
        if (binaryExists && !overwrite) {
          console.log(chalk.blue(`  ○ bin/${binaryName} exists (preserved)`));
          continue;
        }

        // Try to load from templates/bin/ folder (remove .template suffix if present)
        const templateName = binaryName.includes('.template.') ? binaryName : binaryName.replace(/(\.[^.]+)$/, '.template$1');
        const templatePath = join(__dirname, '..', '..', 'templates', 'bin', templateName);
        if (existsSync(templatePath)) {
          // Create backup if overwriting
          if (binaryExists && overwrite) {
            const backupPath = createBackup(binaryPath);
            if (backupPath) {
              backedUpFiles.push({ original: binaryPath, backup: backupPath });
            }
          }
          const binaryContent = readFileSync(templatePath, 'utf8');
          writeFileSync(binaryPath, binaryContent, 'utf8');
          deployedBinaries.push(binaryName);
          const action = binaryExists ? 'Updated' : 'Created';
          console.log(chalk.green(`  ✓ ${action} bin/${binaryName}`));
        } else {
          failedBinaries.push({ name: binaryName, error: 'No template found' });
          console.log(chalk.yellow(`  ⚠ Skipped bin/${binaryName} (no template)`));
        }
      } catch (error) {
        failedBinaries.push({ name: binaryName, error: error.message });
        console.log(chalk.red(`  ✗ Failed: bin/${binaryName} - ${error.message}`));
      }
    }

    if (deployedBinaries.length > 0) {
      console.log(chalk.green(`\n  ✓ Deployed ${deployedBinaries.length} helper script(s)`));
    }
  }

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
    writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
    console.log(chalk.green('  ✓ Created config/tech-stack.json'));
  } else {
    console.log(chalk.blue('  ○ config/tech-stack.json exists (preserved)'));
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

  writeFileSync(ccaspStatePath, JSON.stringify(ccaspState, null, 2), 'utf8');
  console.log(chalk.green(`  ✓ Updated ccasp-state.json (v${currentVersion})`));

  // Register project in global registry (unless --no-register flag is set)
  if (!options.noRegister) {
    const isNewProject = registerProject(cwd, {
      name: projectName,
      version: currentVersion,
      features: selectedFeatures
    });
    if (isNewProject) {
      console.log(chalk.green(`  ✓ Registered project in global CCASP registry`));
    } else {
      console.log(chalk.dim(`  ○ Updated project in global CCASP registry`));
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

/**
 * Verify and fix legacy installations (pre-v1.0.8)
 * Issue #8: Ensures update-check hook is properly configured
 *
 * @param {string} projectDir - Project directory to verify
 * @returns {Object} Verification result with fixes applied
 */
export async function verifyLegacyInstallation(projectDir = process.cwd()) {
  const fixes = [];
  const issues = [];

  const claudeDir = join(projectDir, '.claude');
  const hooksDir = join(claudeDir, 'hooks');
  const settingsPath = join(claudeDir, 'settings.json');
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');

  // Check if this is a CCASP installation
  if (!existsSync(claudeDir)) {
    return { isLegacy: false, message: 'No .claude folder found' };
  }

  // Check 1: Does the update-check hook file exist and have correct paths?
  const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');

  if (!existsSync(updateCheckHookPath)) {
    issues.push('Missing ccasp-update-check.js hook file');

    // Fix: Create the hook file
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      fixes.push('Created ccasp-update-check.js hook file');
    }
  } else {
    // Check 1b: Hook exists - verify it has correct state file path (Issue #9 fix)
    const existingHook = readFileSync(updateCheckHookPath, 'utf8');
    const hasBuggyPath = existingHook.includes('.ccasp-dev/ccasp-state.json') ||
                         existingHook.includes("'.ccasp-dev/") ||
                         !existingHook.includes('.claude/config/ccasp-state.json');

    if (hasBuggyPath) {
      issues.push('Update-check hook has incorrect state file path (update notifications broken)');

      if (existsSync(templatePath)) {
        const hookContent = readFileSync(templatePath, 'utf8');
        writeFileSync(updateCheckHookPath, hookContent, 'utf8');
        fixes.push('Fixed ccasp-update-check.js state file path');
      }
    }
  }

  // Check 2: Is the hook registered in settings.json?
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

      // Check if UserPromptSubmit hook exists with update-check
      const hasUpdateHook = settings.hooks?.UserPromptSubmit?.some(
        (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
      );

      if (!hasUpdateHook) {
        issues.push('Update-check hook not registered in settings.json');

        // Fix: Add the hook to settings.json
        if (!settings.hooks) settings.hooks = {};
        if (!settings.hooks.UserPromptSubmit) {
          settings.hooks.UserPromptSubmit = [];
        }

        settings.hooks.UserPromptSubmit.push({
          matcher: '',
          hooks: [{
            type: 'command',
            command: 'node .claude/hooks/ccasp-update-check.js',
          }],
        });

        writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        fixes.push('Registered update-check hook in settings.json');
      }
    } catch {
      issues.push('Could not parse settings.json');
    }
  }

  return {
    isLegacy: issues.length > 0,
    issues,
    fixes,
    message: fixes.length > 0
      ? `Fixed ${fixes.length} legacy installation issue(s)`
      : 'Installation is up to date',
  };
}
