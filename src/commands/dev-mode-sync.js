/**
 * Dev Mode Sync Command
 *
 * Fast synchronization of ALL modified/new files from worktree to registered projects.
 * Handles source files, templates, hooks, agents, and deployed commands.
 *
 * Usage: ccasp dev-sync [options]
 *   --dry-run    Preview changes without applying
 *   --force      Overwrite all files (skip customization check)
 *   --project    Sync specific project by name
 *
 * Submodules:
 *   sync/file-ops.js - Git change detection and file synchronization helpers
 */

import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadDevState } from '../utils/dev-mode-state.js';
import { loadRegistry } from '../utils/global-registry.js';
import { getChangedFiles, syncFile, deployTemplate } from './sync/file-ops.js';

/**
 * Run the sync operation
 * @param {Object} options - Command options
 */
export async function runDevModeSync(options = {}) {
  const { dryRun = false, force = false, project: projectFilter = null } = options;

  console.log(chalk.bold('\n🔄 Dev Mode Sync\n'));

  // Step 1: Verify dev mode
  const devState = loadDevState();
  if (!devState.isDevMode) {
    console.log(chalk.red('✗ Dev mode is not active.'));
    console.log(chalk.dim('  Run "ccasp dev-deploy" to activate dev mode first.\n'));
    return { success: false, reason: 'not_dev_mode' };
  }

  const worktreePath = devState.worktreePath;
  console.log(chalk.dim(`  Worktree: ${worktreePath}\n`));

  // Step 2: Get changed files
  console.log(chalk.white('Scanning for changes...'));
  const changes = getChangedFiles(worktreePath);

  if (changes.all.length === 0) {
    console.log(chalk.yellow('  No modified or new files to sync.\n'));
    return { success: true, synced: 0 };
  }

  console.log(chalk.green(`  Found ${changes.modified.length} modified, ${changes.added.length} new files\n`));

  // Categorize files
  const sourceFiles = changes.all.filter(f =>
    f.startsWith('src/') ||
    f.startsWith('bin/') ||
    f.startsWith('config/') ||
    f === 'package.json'
  );

  const templateFiles = changes.all.filter(f =>
    f.startsWith('templates/commands/') && f.endsWith('.template.md')
  );

  const hookTemplates = changes.all.filter(f =>
    f.startsWith('templates/hooks/') && f.endsWith('.template.js')
  );

  const otherFiles = changes.all.filter(f =>
    !sourceFiles.includes(f) &&
    !templateFiles.includes(f) &&
    !hookTemplates.includes(f)
  );

  console.log(chalk.white('Files to sync:'));
  console.log(chalk.dim(`  Source files:     ${sourceFiles.length}`));
  console.log(chalk.dim(`  Command templates: ${templateFiles.length}`));
  console.log(chalk.dim(`  Hook templates:    ${hookTemplates.length}`));
  console.log(chalk.dim(`  Other files:       ${otherFiles.length}\n`));

  // Step 3: Get projects to sync
  const registry = loadRegistry();
  let projects = registry.projects || [];

  // Filter out the worktree itself and parent projects without CCASP
  projects = projects.filter(p => {
    // Skip the worktree itself
    if (p.path === worktreePath) return false;
    // Skip if .claude directory doesn't exist (not a CCASP project)
    if (!existsSync(join(p.path, '.claude'))) return false;
    // Skip parent project (Benefits-Outreach-360) if it's not a CCASP installation
    if (!existsSync(join(p.path, 'src', 'commands'))) return false;
    return true;
  });

  // Apply project filter
  if (projectFilter) {
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(projectFilter.toLowerCase())
    );
  }

  if (projects.length === 0) {
    console.log(chalk.yellow('No projects to sync.\n'));
    return { success: true, synced: 0 };
  }

  console.log(chalk.white(`Projects to sync (${projects.length}):`));
  for (const p of projects) {
    console.log(chalk.dim(`  • ${p.name}`));
  }
  console.log();

  if (dryRun) {
    console.log(chalk.yellow('DRY RUN - No files will be modified.\n'));
  }

  // Step 4: Sync to each project
  const results = {
    totalFiles: 0,
    successCount: 0,
    errorCount: 0,
    projects: []
  };

  for (const proj of projects) {
    const projectResult = {
      name: proj.name,
      path: proj.path,
      sourceFiles: { synced: 0, errors: 0 },
      templates: { deployed: 0, errors: 0 },
      hooks: { deployed: 0, errors: 0 },
      other: { synced: 0, errors: 0 }
    };

    console.log(chalk.cyan(`\n📁 ${proj.name}`));

    // Sync source files
    for (const file of sourceFiles) {
      if (!dryRun) {
        const result = syncFile(worktreePath, proj.path, file);
        if (result.success) {
          projectResult.sourceFiles.synced++;
          results.successCount++;
        } else {
          projectResult.sourceFiles.errors++;
          results.errorCount++;
        }
      }
      results.totalFiles++;
    }

    // Deploy command templates
    for (const file of templateFiles) {
      if (!dryRun) {
        const result = deployTemplate(worktreePath, proj.path, file);
        if (result.success) {
          projectResult.templates.deployed++;
          results.successCount++;
        } else {
          projectResult.templates.errors++;
          results.errorCount++;
        }
      }
      results.totalFiles++;
    }

    // Deploy hook templates
    for (const file of hookTemplates) {
      if (!dryRun) {
        const result = syncFile(worktreePath, proj.path, file);
        if (result.success) {
          projectResult.hooks.deployed++;
          results.successCount++;
        } else {
          projectResult.hooks.errors++;
          results.errorCount++;
        }
      }
      results.totalFiles++;
    }

    // Sync other files
    for (const file of otherFiles) {
      if (!dryRun) {
        const result = syncFile(worktreePath, proj.path, file);
        if (result.success) {
          projectResult.other.synced++;
          results.successCount++;
        } else {
          projectResult.other.errors++;
          results.errorCount++;
        }
      }
      results.totalFiles++;
    }

    // Display project summary
    const srcCount = projectResult.sourceFiles.synced;
    const tplCount = projectResult.templates.deployed;
    const hookCount = projectResult.hooks.deployed;
    const otherCount = projectResult.other.synced;
    const totalSynced = srcCount + tplCount + hookCount + otherCount;

    if (dryRun) {
      console.log(chalk.dim(`   Would sync: ${sourceFiles.length + templateFiles.length + hookTemplates.length + otherFiles.length} files`));
    } else {
      console.log(chalk.dim(`   ├── Source: ${srcCount} files`));
      console.log(chalk.dim(`   ├── Commands: ${tplCount} deployed`));
      console.log(chalk.dim(`   ├── Hooks: ${hookCount} deployed`));
      console.log(chalk.dim(`   └── Other: ${otherCount} files`));
      console.log(chalk.green(`   ✓ Total: ${totalSynced} files synced`));
    }

    results.projects.push(projectResult);
  }

  // Final summary
  console.log(chalk.bold(`\n${  '═'.repeat(50)}`));
  console.log(chalk.bold('  SYNC COMPLETE'));
  console.log('═'.repeat(50));
  console.log(chalk.white(`  Projects: ${projects.length}`));
  console.log(chalk.green(`  Files synced: ${results.successCount}`));
  if (results.errorCount > 0) {
    console.log(chalk.red(`  Errors: ${results.errorCount}`));
  }
  console.log(chalk.dim('\n  Restart Claude Code CLI to see command changes.\n'));

  return { success: true, results };
}

// CLI entry point
export default async function devModeSync(options) {
  return runDevModeSync(options);
}
