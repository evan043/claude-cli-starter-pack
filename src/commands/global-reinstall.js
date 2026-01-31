/**
 * Global Reinstall Command
 *
 * Reinstalls CCASP globally:
 * - Without --projects: Just refreshes the npm package (user must run manually)
 * - With --projects: Uninstalls from all projects, then re-runs init on each
 *
 * Useful for:
 * - Upgrading to a new version across all projects
 * - Resetting CCASP configuration to defaults
 * - Recovering from corrupted installations
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { createInterface } from 'readline';
import {
  loadRegistry,
  getRegistryStats,
  saveRegistry
} from '../utils/global-registry.js';
import { runGlobalUninstall } from './global-uninstall.js';
import { runInit } from './init.js';
import { getVersion } from '../utils.js';

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
 * Run init in a specific project directory
 */
async function initProject(projectPath, options = {}) {
  const originalCwd = process.cwd();

  try {
    // Change to project directory
    process.chdir(projectPath);

    // Run init with skipPrompts to avoid interactive questions
    await runInit({ skipPrompts: true, force: true, ...options });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    // Restore original cwd
    process.chdir(originalCwd);
  }
}

/**
 * Main global reinstall function
 */
export async function runGlobalReinstall(options = {}) {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.bold.white('             CCASP Global Reinstall                         ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  const version = getVersion();
  console.log(chalk.dim(`  CCASP Version: ${version}\n`));

  // Get current registry state
  const stats = getRegistryStats();
  const registry = loadRegistry();

  // Store project list before uninstall (for --projects mode)
  const projectsToReinstall = registry.projects.map(p => ({
    path: p.path,
    name: p.name,
    features: p.features || []
  }));

  // Check if --projects flag is set
  if (!options.projects) {
    console.log(chalk.bold('  Reinstall Mode: Package Only\n'));
    console.log(chalk.dim('  This mode refreshes the npm package but does NOT touch project installations.'));
    console.log(chalk.dim('  Use --projects flag to reinstall CCASP in all registered projects.\n'));

    if (stats.total > 0) {
      console.log(chalk.yellow(`  📁 ${stats.total} project(s) currently registered:`));
      for (const project of registry.projects) {
        const exists = existsSync(project.path);
        const statusIcon = exists ? chalk.green('✓') : chalk.red('✗');
        console.log(`     ${statusIcon} ${project.name}`);
      }
      console.log('');
    }

    console.log(chalk.bold('  To reinstall the npm package:\n'));
    console.log(chalk.cyan('    npm uninstall -g claude-cli-advanced-starter-pack'));
    console.log(chalk.cyan('    npm install -g claude-cli-advanced-starter-pack@latest\n'));

    console.log(chalk.dim('  Or use --projects to reinstall in all projects:'));
    console.log(chalk.cyan('    ccasp global-reinstall --projects\n'));

    return;
  }

  // --projects mode: Full reinstall
  console.log(chalk.bold('  Reinstall Mode: Full (Projects)\n'));

  if (stats.total === 0) {
    console.log(chalk.yellow('  No projects registered in global registry.\n'));
    console.log(chalk.dim('  To register a project, run: cd /path/to/project && ccasp init\n'));
    return;
  }

  console.log(chalk.yellow(`  📁 ${stats.total} project(s) will be reinstalled:`));
  for (const project of projectsToReinstall) {
    const exists = existsSync(project.path);
    const statusIcon = exists ? chalk.green('✓') : chalk.red('✗');
    const statusText = exists ? '' : chalk.dim(' (will be skipped)');
    console.log(`     ${statusIcon} ${project.name}${statusText}`);
  }
  console.log('');

  // Count existing projects
  const existingProjects = projectsToReinstall.filter(p => existsSync(p.path));

  if (existingProjects.length === 0) {
    console.log(chalk.red('  No project directories found. Nothing to reinstall.\n'));
    return;
  }

  // Confirm unless --force
  if (!options.force) {
    console.log(chalk.yellow.bold('  ⚠️  This will:'));
    console.log(chalk.yellow(`     1. Uninstall CCASP from ${existingProjects.length} project(s)`));
    console.log(chalk.yellow('     2. Restore any backed-up files'));
    console.log(chalk.yellow(`     3. Reinstall CCASP v${version} in each project`));
    console.log('');

    const shouldContinue = await confirm(chalk.yellow('  Proceed with global reinstall? (y/N): '));
    if (!shouldContinue) {
      console.log(chalk.dim('\n  Cancelled. No changes made.\n'));
      return;
    }
    console.log('');
  }

  // Track results
  const results = {
    uninstalled: 0,
    reinstalled: 0,
    failed: [],
    skipped: 0
  };

  // Phase 1: Uninstall from all projects
  console.log(chalk.bold('  Phase 1: Uninstalling from all projects...\n'));

  // Run global uninstall but preserve project list for reinstall
  // We don't call runGlobalUninstall directly because it clears the registry
  for (const project of projectsToReinstall) {
    process.stdout.write(`  ${chalk.dim('○')} Uninstalling from ${project.name}... `);

    if (!existsSync(project.path)) {
      console.log(chalk.yellow('skipped'));
      results.skipped++;
      continue;
    }

    const originalCwd = process.cwd();
    try {
      process.chdir(project.path);

      // Import and run uninstall dynamically to avoid circular dependency issues
      const { runUninstall } = await import('./uninstall.js');
      await runUninstall({ force: true });

      console.log(chalk.green('✓'));
      results.uninstalled++;
    } catch (err) {
      console.log(chalk.red(`✗ ${err.message}`));
      results.failed.push({ project: project.name, phase: 'uninstall', error: err.message });
    } finally {
      process.chdir(originalCwd);
    }
  }

  console.log('');

  // Phase 2: Reinstall in all projects
  console.log(chalk.bold('  Phase 2: Reinstalling CCASP in all projects...\n'));

  for (const project of projectsToReinstall) {
    process.stdout.write(`  ${chalk.dim('○')} Installing in ${project.name}... `);

    if (!existsSync(project.path)) {
      console.log(chalk.yellow('skipped'));
      continue;
    }

    const result = await initProject(project.path, { skipPrompts: true });

    if (result.success) {
      console.log(chalk.green('✓'));
      results.reinstalled++;
    } else {
      console.log(chalk.red(`✗ ${result.error}`));
      results.failed.push({ project: project.name, phase: 'reinstall', error: result.error });
    }
  }

  // Summary
  console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  if (results.failed.length === 0) {
    console.log(chalk.green.bold('  ✓ Global reinstall complete!\n'));
  } else {
    console.log(chalk.yellow.bold('  ⚠️  Global reinstall completed with errors\n'));
  }

  console.log(chalk.dim(`  Projects reinstalled: ${results.reinstalled}`));
  if (results.skipped > 0) {
    console.log(chalk.dim(`  Projects skipped (not found): ${results.skipped}`));
  }

  if (results.failed.length > 0) {
    console.log(chalk.yellow(`  Projects with errors: ${results.failed.length}`));
    for (const failure of results.failed) {
      console.log(chalk.red(`    • ${failure.project} (${failure.phase}): ${failure.error}`));
    }
  }

  console.log('');
  console.log(chalk.dim('  Each project now has the latest CCASP commands.'));
  console.log(chalk.dim('  Restart Claude Code CLI to use the updated commands.\n'));
}
