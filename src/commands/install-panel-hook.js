/**
 * Install Panel Hook Command
 *
 * Installs the panel queue reader hook to Claude Code's hooks directory.
 */

import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { claudeAbsolutePath } from '../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Install the panel queue reader hook
 */
export async function runInstallPanelHook(options = {}) {
  console.log(chalk.cyan('\n  Installing CCASP Panel Hook...\n'));

  // Determine target directory
  const targetDir = options.global
    ? claudeAbsolutePath(homedir(), 'hooks')
    : claudeAbsolutePath(process.cwd(), 'hooks');

  const hookPath = join(targetDir, 'panel-queue-reader.js');
  const settingsPath = options.global
    ? claudeAbsolutePath(homedir(), 'settings.json')
    : claudeAbsolutePath(process.cwd(), 'settings.json');

  // Check if hook already exists
  if (existsSync(hookPath) && !options.force) {
    console.log(chalk.yellow('  Hook already installed.'));
    console.log(chalk.dim(`  Use --force to overwrite\n`));
    return;
  }

  // Ensure hooks directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Read template
  const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'panel-queue-reader.template.js');

  if (!existsSync(templatePath)) {
    console.log(chalk.red('  Template not found.'));
    console.log(chalk.dim(`  Expected: ${templatePath}\n`));
    return;
  }

  // Copy template to hooks directory
  const templateContent = readFileSync(templatePath, 'utf8');
  writeFileSync(hookPath, templateContent, 'utf8');

  console.log(chalk.green(`  ✓ Hook installed: ${hookPath}`));

  // Update settings.json to register the hook
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      settings = {};
    }
  }

  // Ensure hooks object exists (new v2.x format)
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Ensure UserPromptSubmit array exists
  if (!settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = [];
  }

  // Check if hook already registered (new v2.x format)
  const existingHook = settings.hooks.UserPromptSubmit.find(h =>
    h.hooks?.some(hook => hook.command?.includes('panel-queue-reader'))
  );

  if (!existingHook) {
    // New Claude Code v2.x hooks format
    const hookConfig = {
      matcher: '',  // Empty string = match all (NOT empty object!)
      hooks: [
        {
          type: 'command',
          command: `node ${hookPath}`
        }
      ]
    };

    settings.hooks.UserPromptSubmit.push(hookConfig);

    // Ensure settings directory exists
    const settingsDir = dirname(settingsPath);
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
    }

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(chalk.green(`  ✓ Hook registered in settings.json`));
  } else {
    console.log(chalk.dim('  Hook already registered in settings.json'));
  }

  console.log('');
  console.log(chalk.white.bold('  Setup complete!'));
  console.log('');
  console.log(chalk.dim('  How to use:'));
  console.log(chalk.dim('  1. Open a new terminal and run: ccasp panel'));
  console.log(chalk.dim('  2. Select commands from the panel'));
  console.log(chalk.dim('  3. In Claude Code, press Enter to execute'));
  console.log('');
}
