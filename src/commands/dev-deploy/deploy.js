import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadRegistry } from '../../utils/global-registry.js';
import {
  activateDevMode,
  addBackedUpProject
} from '../../utils/dev-mode-state.js';
import { backupProject } from '../../utils/project-backup.js';
import { executeSyncActions } from '../../utils/smart-sync.js';
import { syncProject } from '../../utils/symlink-sync.js';
import { exec, execSilent } from './worktree.js';

/**
 * Deploy worktree locally (npm link)
 */
export async function deployWorktreeLocally(worktreePath) {
  console.log(chalk.cyan('\n  Deploying worktree locally...\n'));

  // Verify worktree has package.json
  const pkgPath = join(worktreePath, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log(chalk.red(`  ✗ No package.json found in worktree`));
    return false;
  }

  // Read version from worktree
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(chalk.dim(`  Package: ${pkg.name}@${pkg.version}`));
  console.log(chalk.dim(`  Worktree: ${worktreePath}\n`));

  // Step 1: Unlink any existing global link
  console.log(chalk.dim('  [1/4] Unlinking existing global package...'));
  exec('npm unlink -g claude-cli-advanced-starter-pack', { ignoreError: true, silent: true });
  console.log(chalk.green('  ✓ Unlinked'));

  // Step 2: Create global link from worktree
  console.log(chalk.dim('  [2/4] Creating global link from worktree...'));
  exec('npm link', { cwd: worktreePath });
  console.log(chalk.green('  ✓ Global link created'));

  // Step 2b: Activate global dev mode
  activateDevMode(worktreePath, pkg.version);
  console.log(chalk.yellow('  ✓ Global dev mode activated'));

  // Step 3: Verify link
  console.log(chalk.dim('  [3/4] Verifying installation...'));
  const ccaspPath = execSilent('npm root -g', worktreePath);
  if (ccaspPath) {
    const linkedPath = join(ccaspPath, 'claude-cli-advanced-starter-pack');
    if (existsSync(linkedPath)) {
      console.log(chalk.green(`  ✓ Linked at ${linkedPath}`));
    }
  }

  // Step 4: Update registered projects using smart sync
  console.log(chalk.dim('  [4/4] Updating registered projects...'));
  await updateRegisteredProjects(worktreePath, { force: false });

  return true;
}

/**
 * Update all registered projects with the local version
 * Uses smart sync by default (preserves user customizations)
 * @param {string} worktreePath - Path to CCASP worktree
 * @param {Object} options - Update options
 * @param {boolean} options.force - Force overwrite (ignore customizations)
 * @param {boolean} options.legacyMode - Use legacy init-based update
 */
export async function updateRegisteredProjects(worktreePath, options = {}) {
  const { force = false, legacyMode = false } = options;
  const registry = loadRegistry();

  if (registry.projects.length === 0) {
    console.log(chalk.dim('       No registered projects to update.'));
    return;
  }

  console.log(chalk.dim(`       Found ${registry.projects.length} registered project(s)`));

  // Use smart sync by default
  if (!legacyMode) {
    console.log(chalk.dim(`       Using smart sync (${force ? 'force mode' : 'preserving customizations'})`));
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let backedUp = 0;
  let preserved = 0;

  for (const project of registry.projects) {
    if (!existsSync(project.path)) {
      skipped++;
      continue;
    }

    const projectClaudeDir = join(project.path, '.claude');
    if (!existsSync(projectClaudeDir)) {
      skipped++;
      continue;
    }

    try {
      // Backup project before updating
      console.log(chalk.dim(`       Backing up ${project.name}...`));
      const backup = backupProject(project.path);
      if (backup) {
        addBackedUpProject({
          path: project.path,
          name: project.name,
          backupPath: backup.backupPath,
          backedUpAt: backup.backedUpAt,
          fileCount: backup.fileCount
        });
        backedUp++;
        console.log(chalk.green(`       ✓ Backed up (${backup.fileCount} files)`));
      }

      if (legacyMode) {
        // Legacy mode: Run ccasp init (overwrites everything)
        const originalCwd = process.cwd();
        process.chdir(project.path);

        const { runInit } = await import('../init.js');
        await runInit({ dev: true, force: true, skipPrompts: true, noRegister: true });

        process.chdir(originalCwd);
        updated++;
      } else {
        // Check if project has symlink sync enabled
        let useSymlinkSync = false;
        try {
          const tsPath = join(project.path, '.claude', 'config', 'tech-stack.json');
          if (existsSync(tsPath)) {
            const ts = JSON.parse(readFileSync(tsPath, 'utf8'));
            useSymlinkSync = ts.sync?.enabled !== false;
          }
        } catch { /* fallback to smart-sync */ }

        if (useSymlinkSync) {
          // Symlink sync: compile from worktree + create symlinks
          const symlinkResult = syncProject(project.path, {
            ccaspRoot: worktreePath,
            force: force
          });

          const fileCount = symlinkResult.symlink?.created?.length || 0;
          if (fileCount > 0) {
            console.log(chalk.green(`       ✓ Symlink-synced ${project.name}: ${fileCount} file(s)`));
            updated++;
          } else if (symlinkResult.success) {
            console.log(chalk.dim(`       ${project.name}: Already synced`));
            updated++;
          }

          const customCount = symlinkResult.symlink?.skipped?.filter(
            f => f.reason === 'User-created file' || f.reason === 'Customized (hash differs)'
          ).length || 0;
          if (customCount > 0) {
            console.log(chalk.yellow(`         Preserved ${customCount} custom file(s)`));
            preserved += customCount;
          }
        } else {
          // Smart sync mode: Preserve user customizations
          const syncResult = await executeSyncActions(
            project.path,
            worktreePath,
            {
              dryRun: false,
              force: force,
              preserveCustomizations: !force
            }
          );

          const syncedCount = syncResult.executed.length;
          const preservedCount = syncResult.skipped.filter(
            f => f.category === 'customized'
          ).length;

          if (syncedCount > 0) {
            console.log(chalk.green(`       ✓ Synced ${project.name}: ${syncedCount} file(s)`));
            updated++;
          }

          if (preservedCount > 0) {
            console.log(chalk.yellow(`         Preserved ${preservedCount} customization(s)`));
            preserved += preservedCount;
          }

          if (syncResult.errors.length > 0) {
            console.log(chalk.red(`         ${syncResult.errors.length} error(s)`));
          }
        }
      }
    } catch (err) {
      console.log(chalk.red(`       ✗ Failed ${project.name}: ${err.message}`));
      failed++;
    }
  }

  console.log('');
  if (backedUp > 0) {
    console.log(chalk.green(`       ✓ Backed up ${backedUp} project(s)`));
  }
  if (updated > 0) {
    console.log(chalk.green(`       ✓ Updated ${updated} project(s)`));
  }
  if (preserved > 0) {
    console.log(chalk.yellow(`       ✓ Preserved ${preserved} customization(s) across projects`));
  }
  if (skipped > 0) {
    console.log(chalk.dim(`       Skipped ${skipped} project(s) (not found)`));
  }
  if (failed > 0) {
    console.log(chalk.yellow(`       ⚠️  Failed ${failed} project(s)`));
  }
}
