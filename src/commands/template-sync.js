/**
 * Template Sync Command
 *
 * CLI command for managing always-on symlink sync between CCASP
 * templates and project .claude/ directories.
 *
 * Usage:
 *   ccasp template-sync              # Run sync (compile if needed + verify symlinks)
 *   ccasp template-sync --enable     # Enable auto-sync for current project
 *   ccasp template-sync --disable    # Disable auto-sync, replace symlinks with copies
 *   ccasp template-sync --status     # Show sync state
 *   ccasp template-sync --recompile  # Force recompile of compiled cache
 *   ccasp template-sync --repair     # Fix broken symlinks
 */

import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import {
  syncProject,
  compileTemplates,
  removeSymlinks,
  getSyncStatus,
  repairBrokenSymlinks,
  testSymlinkCapability,
  detectCustomFiles,
  projectSlugFromPath,
  loadCacheMeta,
} from '../utils/symlink-sync.js';
import { getRegisteredProjects } from '../utils/global-registry.js';

/**
 * Load and update sync config in tech-stack.json
 */
function loadTechStack(projectPath) {
  const tsPath = join(projectPath, '.claude', 'config', 'tech-stack.json');
  if (!existsSync(tsPath)) return null;
  try {
    return JSON.parse(readFileSync(tsPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveTechStack(projectPath, techStack) {
  const tsPath = join(projectPath, '.claude', 'config', 'tech-stack.json');
  writeFileSync(tsPath, JSON.stringify(techStack, null, 2), 'utf8');
}

function ensureSyncConfig(techStack) {
  if (!techStack.sync) {
    techStack.sync = {
      method: 'symlink',
      enabled: true,
      lastSyncAt: null,
      ccaspVersionAtSync: null,
    };
  }
  return techStack;
}

/**
 * Main template-sync command handler
 */
export async function runTemplateSync(options = {}) {
  const cwd = process.cwd();
  const claudeDir = join(cwd, '.claude');
  const projectName = basename(cwd);

  if (!existsSync(claudeDir)) {
    console.log(chalk.red('  No .claude/ directory found. Run `ccasp init` first.'));
    return;
  }

  // Handle --status
  if (options.status) {
    return showStatus(cwd, projectName);
  }

  // Handle --enable
  if (options.enable) {
    return enableSync(cwd, projectName);
  }

  // Handle --disable
  if (options.disable) {
    return disableSync(cwd, projectName);
  }

  // Handle --recompile
  if (options.recompile) {
    return recompile(cwd, projectName);
  }

  // Handle --repair
  if (options.repair) {
    return repair(cwd, projectName);
  }

  // Handle --all (sync all registered projects)
  if (options.all) {
    return syncAllProjects(options);
  }

  // Default: run sync for current project
  return runSync(cwd, projectName, options);
}

/**
 * Run sync for current project
 */
function runSync(projectPath, projectName, options = {}) {
  const techStack = loadTechStack(projectPath);
  if (!techStack) {
    console.log(chalk.red('  No tech-stack.json found. Run `ccasp init` first.'));
    return;
  }

  ensureSyncConfig(techStack);

  if (!techStack.sync.enabled) {
    console.log(chalk.yellow('  Template sync is disabled for this project.'));
    console.log(chalk.dim('  Run `ccasp template-sync --enable` to enable.'));
    return;
  }

  console.log(chalk.bold(`\n  Template Sync: ${projectName}\n`));

  const canSymlink = testSymlinkCapability();
  if (!canSymlink) {
    console.log(chalk.yellow('  ⚠ Symlinks unavailable — using file copies.'));
    console.log(chalk.dim('  Enable Developer Mode in Windows Settings for symlink sync.\n'));
  }

  const result = syncProject(projectPath, {
    force: options.force,
    dryRun: options.dryRun,
    ccaspRoot: options.ccaspRoot,
  });

  if (!result.success) {
    console.log(chalk.red('  Sync failed.'));
    if (result.compile && !result.compile.success) {
      console.log(chalk.red(`  Compile error: ${JSON.stringify(result.compile)}`));
    }
    return;
  }

  // Display compile results
  const c = result.compile;
  if (c.skipped) {
    console.log(chalk.dim(`  Cache: Fresh (${c.reason})`));
  } else {
    console.log(chalk.green(`  Compiled: ${c.fileCount} templates`));
    for (const [cat, info] of Object.entries(c.categories)) {
      if (info.compiled > 0) {
        console.log(chalk.dim(`    ${cat}: ${info.compiled} files`));
      }
    }
  }

  // Display symlink results
  const s = result.symlink;
  if (s) {
    if (s.created.length > 0) {
      const method = s.fallbackToCopy ? 'copied' : 'symlinked';
      console.log(chalk.green(`  ${method}: ${s.created.length} files`));
    }
    if (s.skipped.length > 0) {
      const custom = s.skipped.filter(f => f.reason === 'User-created file');
      const unchanged = s.skipped.filter(f => f.reason === 'Already symlinked correctly');
      const customized = s.skipped.filter(f => f.reason === 'Customized (hash differs)');

      if (unchanged.length > 0) console.log(chalk.dim(`  Already synced: ${unchanged.length}`));
      if (custom.length > 0) console.log(chalk.blue(`  Custom files preserved: ${custom.length}`));
      if (customized.length > 0) console.log(chalk.yellow(`  Customized files preserved: ${customized.length}`));
    }
    if (s.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${s.errors.length}`));
      for (const e of s.errors) {
        console.log(chalk.red(`    ${e.file}: ${e.error}`));
      }
    }
  }

  // Update tech stack
  techStack.sync.lastSyncAt = new Date().toISOString();
  techStack.sync.ccaspVersionAtSync = c.skipped ? techStack.sync.ccaspVersionAtSync : getCcaspVersionFromMeta(projectPath);
  techStack.sync.method = s?.fallbackToCopy ? 'copy' : 'symlink';
  saveTechStack(projectPath, techStack);

  console.log(chalk.green('\n  Sync complete.\n'));
}

function getCcaspVersionFromMeta(projectPath) {
  const slug = projectSlugFromPath(projectPath);
  const meta = loadCacheMeta(slug);
  return meta?.ccaspVersion || 'unknown';
}

/**
 * Show sync status
 */
function showStatus(projectPath, projectName) {
  console.log(chalk.bold(`\n  Template Sync Status: ${projectName}\n`));

  const status = getSyncStatus(projectPath);

  console.log(`  Enabled:         ${status.enabled ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  Method:          ${status.method === 'symlink' ? chalk.green('Symlinks') : chalk.yellow('File copies')}`);
  console.log(`  Cached:          ${status.cached ? chalk.green('Yes') : chalk.dim('No')}`);
  console.log(`  CCASP Version:   ${status.ccaspVersion || chalk.dim('unknown')}`);
  console.log(`  Compiled At:     ${status.compiledAt ? new Date(status.compiledAt).toLocaleString() : chalk.dim('never')}`);
  console.log(`  Needs Recompile: ${status.needsRecompile ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Symlinked Files: ${status.symlinkCount}`);
  console.log(`  Real Files:      ${status.realFileCount}`);
  console.log(`  Broken Symlinks: ${status.brokenSymlinks > 0 ? chalk.red(status.brokenSymlinks) : chalk.green('0')}`);
  console.log(`  Custom Files:    ${status.customFileCount}`);

  if (status.brokenSymlinks > 0) {
    console.log(chalk.yellow(`\n  Run \`ccasp template-sync --repair\` to fix broken symlinks.`));
  }
  if (status.needsRecompile) {
    console.log(chalk.yellow(`\n  Run \`ccasp template-sync --recompile\` to update cache.`));
  }
  console.log('');
}

/**
 * Enable sync for project
 */
function enableSync(projectPath, projectName) {
  const techStack = loadTechStack(projectPath);
  if (!techStack) {
    console.log(chalk.red('  No tech-stack.json found.'));
    return;
  }

  ensureSyncConfig(techStack);
  techStack.sync.enabled = true;
  saveTechStack(projectPath, techStack);

  console.log(chalk.green(`\n  Template sync enabled for ${projectName}.`));

  // Run initial sync
  runSync(projectPath, projectName);
}

/**
 * Disable sync for project
 */
function disableSync(projectPath, projectName) {
  const techStack = loadTechStack(projectPath);
  if (!techStack) {
    console.log(chalk.red('  No tech-stack.json found.'));
    return;
  }

  // Replace symlinks with real files before disabling
  console.log(chalk.bold(`\n  Disabling template sync for ${projectName}...\n`));

  const result = removeSymlinks(projectPath);
  console.log(chalk.green(`  Replaced ${result.removed.length} symlinks with file copies.`));
  if (result.errors.length > 0) {
    console.log(chalk.red(`  Errors: ${result.errors.length}`));
  }

  ensureSyncConfig(techStack);
  techStack.sync.enabled = false;
  saveTechStack(projectPath, techStack);

  console.log(chalk.green(`  Template sync disabled.\n`));
}

/**
 * Force recompile
 */
function recompile(projectPath, projectName) {
  console.log(chalk.bold(`\n  Recompiling templates for ${projectName}...\n`));

  const result = compileTemplates(projectPath, { force: true });

  if (result.success) {
    console.log(chalk.green(`  Compiled ${result.fileCount} templates.`));
    for (const [cat, info] of Object.entries(result.categories)) {
      if (info.compiled > 0) {
        console.log(chalk.dim(`    ${cat}: ${info.compiled} files`));
      }
    }
  }

  // Update symlinks to point to new cache
  const techStack = loadTechStack(projectPath);
  if (techStack?.sync?.enabled !== false) {
    runSync(projectPath, projectName, { force: true });
    return; // runSync already prints completion
  }

  console.log(chalk.green('\n  Recompile complete.\n'));
}

/**
 * Repair broken symlinks
 */
function repair(projectPath, projectName) {
  console.log(chalk.bold(`\n  Repairing symlinks for ${projectName}...\n`));

  const result = repairBrokenSymlinks(projectPath);

  if (result.fixed > 0) {
    console.log(chalk.green(`  Fixed ${result.fixed} broken symlinks.`));
  } else {
    console.log(chalk.green(`  No broken symlinks found.`));
  }

  if (result.errors.length > 0) {
    console.log(chalk.red(`  Errors: ${result.errors.length}`));
    for (const e of result.errors) {
      console.log(chalk.red(`    ${e.file || ''}: ${e.error}`));
    }
  }

  console.log('');
}

/**
 * Sync all registered projects
 */
function syncAllProjects(options) {
  const projects = getRegisteredProjects({ existsOnly: true });

  if (projects.length === 0) {
    console.log(chalk.yellow('\n  No registered projects found.\n'));
    return;
  }

  console.log(chalk.bold(`\n  Syncing ${projects.length} registered projects...\n`));

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const project of projects) {
    const name = project.name || basename(project.path);
    const techStack = loadTechStack(project.path);

    if (!techStack) {
      console.log(chalk.dim(`  ${name}: No tech-stack.json, skipping`));
      skipped++;
      continue;
    }

    ensureSyncConfig(techStack);
    if (!techStack.sync.enabled && !options.force) {
      console.log(chalk.dim(`  ${name}: Sync disabled, skipping`));
      skipped++;
      continue;
    }

    try {
      const result = syncProject(project.path, { force: options.force });
      if (result.success) {
        const fileCount = result.symlink?.created?.length || 0;
        console.log(chalk.green(`  ${name}: ${fileCount} files synced`));
        synced++;
      } else {
        console.log(chalk.red(`  ${name}: Sync failed`));
        errors++;
      }

      // Update last sync timestamp
      techStack.sync.lastSyncAt = new Date().toISOString();
      saveTechStack(project.path, techStack);
    } catch (err) {
      console.log(chalk.red(`  ${name}: ${err.message}`));
      errors++;
    }
  }

  console.log(chalk.bold(`\n  Done: ${synced} synced, ${skipped} skipped, ${errors} errors\n`));
}

export default { runTemplateSync };
