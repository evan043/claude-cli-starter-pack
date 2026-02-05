/**
 * Dev Mode for Init
 *
 * Fast path for template testing - loads existing tech-stack.json,
 * processes templates, and overwrites commands without prompts.
 *
 * Extracted from init.js for maintainability.
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { replacePlaceholders } from '../../utils/template-engine.js';
import { createLogger } from '../../utils/logger.js';
import { COMMAND_TEMPLATES } from './command-templates.js';
import { generateMenuCommand, generateIndexFile, generateReadmeFile } from './generators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = createLogger('init:dev-mode');

/**
 * Run dev mode - rapid template testing workflow
 * Loads existing tech-stack.json, processes templates, overwrites commands
 */
export async function runDevMode(options = {}) {
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
      log.info(chalk.green('  ✓ Loaded existing tech-stack.json'));
    } catch (err) {
      log.warn(`  ⚠ Could not parse tech-stack.json: ${err.message}`);
    }
  } else {
    log.warn('  ⚠ No tech-stack.json found - templates will have unprocessed placeholders');
  }

  // Ensure directories exist
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
    log.info(chalk.green('  ✓ Created .claude/commands/'));
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
    log.info(chalk.green('  ✓ Created .claude/hooks/'));
  }

  // Identify custom commands (no matching template) to preserve
  const templatesDir = join(__dirname, '..', '..', '..', 'templates', 'commands');
  const hooksTemplatesDir = join(__dirname, '..', '..', '..', 'templates', 'hooks');

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
    const agentsDir = join(claudeDir, 'agents');
    const skillsDir = join(claudeDir, 'skills');

    const installedAgents = existsSync(agentsDir)
      ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
      : [];
    const installedSkills = existsSync(skillsDir)
      ? readdirSync(skillsDir).filter(f => !f.startsWith('.'))
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
