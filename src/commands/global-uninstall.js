/**
 * Global Uninstall Command
 *
 * Removes CCASP from ALL registered projects and cleans up global configuration.
 * - Restores backups in each project
 * - Removes CCASP files from each project
 * - Clears the global registry
 * - Removes global CCASP cache/config files
 */

import chalk from 'chalk';
import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import {
  loadRegistry,
  clearRegistry,
  getRegistryStats,
  getGlobalClaudeDir,
  getRegistryPath
} from '../utils/global-registry.js';
import { runUninstall } from './uninstall.js';

/**
 * Prompt user for confirmation
 */
function confirm(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Run uninstall in a specific project directory
 */
async function uninstallProject(projectPath, options = {}) {
  const originalCwd = process.cwd();

  try {
    // Change to project directory
    process.chdir(projectPath);

    // Run uninstall with force flag to skip prompts
    await runUninstall({ force: true, ...options });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    // Restore original cwd
    process.chdir(originalCwd);
  }
}

/**
 * Get global CCASP files/directories to clean up
 */
function getGlobalCcaspFiles() {
  const globalClaudeDir = getGlobalClaudeDir();
  const files = [];

  if (!existsSync(globalClaudeDir)) {
    return files;
  }

  // CCASP-specific files in ~/.claude/
  const ccaspFiles = [
    'ccasp-registry.json',
    'ccasp-panel',  // Panel queue directory
  ];

  for (const file of ccaspFiles) {
    const filePath = join(globalClaudeDir, file);
    if (existsSync(filePath)) {
      files.push({
        path: filePath,
        name: file,
        type: statSync(filePath).isDirectory() ? 'directory' : 'file'
      });
    }
  }

  return files;
}

/**
 * Main global uninstall function
 */
export async function runGlobalUninstall(options = {}) {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.bold.white('             CCASP Global Uninstall                         ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  // Get registry stats
  const stats = getRegistryStats();
  const registry = loadRegistry();
  const globalFiles = getGlobalCcaspFiles();

  // Show what will be affected
  console.log(chalk.bold('  What will be removed:\n'));

  // Projects
  if (stats.total > 0) {
    console.log(chalk.yellow(`  📁 ${stats.total} registered project(s):`));
    for (const project of registry.projects) {
      const exists = existsSync(project.path);
      const statusIcon = exists ? chalk.green('✓') : chalk.red('✗');
      const statusText = exists ? '' : chalk.dim(' (not found)');
      console.log(`     ${statusIcon} ${project.name} - ${chalk.dim(project.path)}${statusText}`);
    }
    console.log('');
  } else {
    console.log(chalk.dim('  📁 No projects registered\n'));
  }

  // Global files
  if (globalFiles.length > 0) {
    console.log(chalk.yellow('  🗂️  Global CCASP files:'));
    for (const file of globalFiles) {
      console.log(`     • ~/.claude/${file.name}`);
    }
    console.log('');
  }

  // npm package note
  console.log(chalk.dim('  📦 Note: The npm package itself is NOT uninstalled.'));
  console.log(chalk.dim('     To fully remove: npm uninstall -g claude-cli-advanced-starter-pack\n'));

  // Nothing to do?
  if (stats.total === 0 && globalFiles.length === 0) {
    console.log(chalk.green('  ✓ Nothing to uninstall - CCASP is not configured globally.\n'));
    return;
  }

  // Confirm unless --force
  if (!options.force) {
    console.log(chalk.red.bold('  ⚠️  This will:'));
    if (stats.existing > 0) {
      console.log(chalk.red(`     • Uninstall CCASP from ${stats.existing} project(s)`));
      console.log(chalk.red('     • Restore any backed-up files'));
    }
    if (globalFiles.length > 0) {
      console.log(chalk.red('     • Delete global CCASP configuration'));
    }
    console.log('');

    const shouldContinue = await confirm(chalk.yellow('  Proceed with global uninstall? (y/N): '));
    if (!shouldContinue) {
      console.log(chalk.dim('\n  Cancelled. No changes made.\n'));
      return;
    }
    console.log('');
  }

  // Track results
  const results = {
    projectsUninstalled: 0,
    projectsFailed: 0,
    projectsSkipped: 0,
    globalFilesRemoved: 0
  };

  // Uninstall from each project
  if (stats.total > 0) {
    console.log(chalk.bold('  Uninstalling from projects...\n'));

    for (const project of registry.projects) {
      process.stdout.write(`  ${chalk.dim('○')} ${project.name}... `);

      if (!existsSync(project.path)) {
        console.log(chalk.yellow('skipped (not found)'));
        results.projectsSkipped++;
        continue;
      }

      const result = await uninstallProject(project.path, { all: options.all });

      if (result.success) {
        console.log(chalk.green('✓'));
        results.projectsUninstalled++;
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
        results.projectsFailed++;
      }
    }
    console.log('');
  }

  // Clear global registry
  clearRegistry();
  console.log(chalk.green('  ✓ Cleared global project registry'));

  // Remove global CCASP files
  for (const file of globalFiles) {
    try {
      rmSync(file.path, { recursive: true, force: true });
      console.log(chalk.green(`  ✓ Removed ~/.claude/${file.name}`));
      results.globalFilesRemoved++;
    } catch (err) {
      console.log(chalk.red(`  ✗ Failed to remove ~/.claude/${file.name}: ${err.message}`));
    }
  }

  // Summary
  console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.green.bold('  ✓ Global uninstall complete!\n'));

  if (results.projectsUninstalled > 0) {
    console.log(chalk.dim(`  Projects uninstalled: ${results.projectsUninstalled}`));
  }
  if (results.projectsSkipped > 0) {
    console.log(chalk.dim(`  Projects skipped (not found): ${results.projectsSkipped}`));
  }
  if (results.projectsFailed > 0) {
    console.log(chalk.yellow(`  Projects failed: ${results.projectsFailed}`));
  }

  console.log('');
  console.log(chalk.dim('  To reinstall globally: ccasp global-reinstall'));
  console.log(chalk.dim('  To reinstall in a project: cd /path/to/project && ccasp init\n'));
}
