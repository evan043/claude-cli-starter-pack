/**
 * Existing Installation Detection
 * Handles detection and user prompts for existing .claude folders
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, readdirSync } from 'fs';

/**
 * Check if .claude directory exists with content
 * @param {string} claudeDir - Path to .claude directory
 * @param {Object} paths - Directory paths object
 * @returns {Object} Detection result with counts
 */
export function detectExistingInstallation(claudeDir, paths) {
  const hasExistingClaudeDir = existsSync(claudeDir);

  if (!hasExistingClaudeDir) {
    return { exists: false };
  }

  const existingCommands = existsSync(paths.commandsDir)
    ? readdirSync(paths.commandsDir).filter(f => f.endsWith('.md')).length
    : 0;
  const existingAgents = existsSync(paths.agentsDir)
    ? readdirSync(paths.agentsDir).filter(f => f.endsWith('.md')).length
    : 0;
  const existingSkills = existsSync(paths.skillsDir)
    ? readdirSync(paths.skillsDir).filter(f => !f.startsWith('.')).length
    : 0;
  const existingHooks = existsSync(paths.hooksDir)
    ? readdirSync(paths.hooksDir).filter(f => f.endsWith('.js')).length
    : 0;
  const hasSettings = existsSync(paths.settingsPath);

  return {
    exists: true,
    existingCommands,
    existingAgents,
    existingSkills,
    existingHooks,
    hasSettings,
  };
}

/**
 * Display existing installation info
 * @param {Object} detection - Detection result
 */
export function displayExistingInstallation(detection) {
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  ✓ Existing .claude/ folder detected'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.dim('  Current contents:'));

  if (detection.existingCommands > 0) {
    console.log(chalk.dim(`    • ${detection.existingCommands} command(s) in commands/`));
  }
  if (detection.existingAgents > 0) {
    console.log(chalk.dim(`    • ${detection.existingAgents} agent(s) in agents/`));
  }
  if (detection.existingSkills > 0) {
    console.log(chalk.dim(`    • ${detection.existingSkills} skill(s) in skills/`));
  }
  if (detection.existingHooks > 0) {
    console.log(chalk.dim(`    • ${detection.existingHooks} hook(s) in hooks/`));
  }
  if (detection.hasSettings) {
    console.log(chalk.dim(`    • settings.json configured`));
  }

  console.log('');
  console.log(chalk.yellow.bold('  ⚠ Your existing files will NOT be overwritten'));
  console.log(chalk.dim('    New commands will be added alongside your existing setup.'));
  console.log(chalk.dim('    Use --force flag to overwrite specific commands if needed.'));
  console.log('');
}

/**
 * Prompt user to proceed with installation
 * @param {Object} options - Command options
 * @returns {Promise<boolean>} True if user confirms
 */
export async function promptProceed(options) {
  if (options.skipPrompts) {
    return true;
  }

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
    return false;
  }

  console.log('');
  return true;
}

/**
 * Handle existing installation detection and prompts
 * @param {string} claudeDir - Path to .claude directory
 * @param {Object} paths - Directory paths object
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Detection result or null if cancelled
 */
export async function handleExistingInstallation(claudeDir, paths, options) {
  const detection = detectExistingInstallation(claudeDir, paths);

  if (!detection.exists) {
    return { ...detection, shouldProceed: true };
  }

  displayExistingInstallation(detection);
  const shouldProceed = await promptProceed(options);

  return { ...detection, shouldProceed };
}
