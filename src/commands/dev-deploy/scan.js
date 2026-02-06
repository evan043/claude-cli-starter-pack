import chalk from 'chalk';
import { isDevMode, getDevModeInfo } from '../../utils/dev-mode-state.js';
import { compareAllProjects, getSummaryStats } from '../../utils/project-diff.js';

/**
 * Scan connected projects for customizations
 */
export async function scanProjectCustomizations() {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║') + chalk.bold.white('           Project Customization Scanner                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════════════╝\n'));

  // Check if dev mode is active
  if (!isDevMode()) {
    console.log(chalk.yellow('  ⚠️  Dev mode is not active.\n'));
    console.log(chalk.dim('  This command scans connected projects for customizations'));
    console.log(chalk.dim('  that could be imported back into CCASP.\n'));
    console.log(chalk.dim('  Activate dev mode first:'));
    console.log(chalk.cyan('    ccasp dev-deploy --create <name>'));
    console.log(chalk.cyan('    ccasp dev-deploy\n'));
    return;
  }

  const devInfo = getDevModeInfo();
  if (!devInfo || !devInfo.worktreePath) {
    console.log(chalk.red('  ✗ Could not determine worktree path'));
    return;
  }

  console.log(chalk.dim(`  Worktree: ${devInfo.worktreePath}`));
  console.log(chalk.dim(`  Scanning ${devInfo.projectCount} connected project(s)...\n`));

  try {
    const comparisons = await compareAllProjects(devInfo.worktreePath);

    if (comparisons.length === 0) {
      console.log(chalk.yellow('  No connected projects found with .claude/ directories.\n'));
      return;
    }

    const stats = getSummaryStats(comparisons);

    // Summary header
    console.log(chalk.bold('  ──────────────────────────────────────'));
    console.log(chalk.bold('  Summary'));
    console.log(chalk.bold('  ──────────────────────────────────────\n'));

    console.log(`  Projects scanned: ${chalk.cyan(stats.projectCount)}`);
    console.log(`  Projects with customizations: ${chalk.cyan(stats.projectsWithCustomizations)}`);
    console.log(`  Custom files (not in CCASP): ${chalk.green(stats.totalCustomFiles)}`);
    console.log(`  Modified files (differ from CCASP): ${chalk.yellow(stats.totalModifiedFiles)}`);
    console.log('');

    // Show details for each project with customizations
    for (const comparison of comparisons) {
      if (comparison.customFiles.length === 0 && comparison.modifiedFiles.length === 0) {
        continue;
      }

      console.log(chalk.bold(`  ──────────────────────────────────────`));
      console.log(chalk.bold(`  ${comparison.projectName}`));
      console.log(chalk.bold(`  ──────────────────────────────────────\n`));

      if (comparison.customFiles.length > 0) {
        console.log(chalk.green('  Custom Files (not in CCASP):'));
        for (const file of comparison.customFiles) {
          console.log(chalk.dim(`    • ${file.relativePath}`));
          console.log(chalk.dim(`      ${file.description}`));
        }
        console.log('');
      }

      if (comparison.modifiedFiles.length > 0) {
        console.log(chalk.yellow('  Modified Files (differ from CCASP):'));
        for (const file of comparison.modifiedFiles) {
          const diffStr = file.linesAdded || file.linesRemoved
            ? `+${file.linesAdded}/-${file.linesRemoved} lines`
            : '';
          console.log(chalk.dim(`    • ${file.relativePath} ${diffStr}`));
          console.log(chalk.dim(`      ${file.description}`));
        }
        console.log('');
      }
    }

    // Next steps
    if (stats.totalCustomFiles > 0 || stats.totalModifiedFiles > 0) {
      console.log(chalk.bold('  ──────────────────────────────────────'));
      console.log(chalk.bold('  Next Steps'));
      console.log(chalk.bold('  ──────────────────────────────────────\n'));

      console.log(chalk.dim('  To import customizations before merging:'));
      console.log(chalk.cyan('    /dev-mode-merge → [1] Scan → [I] Import\n'));
    }

  } catch (error) {
    console.log(chalk.red(`  ✗ Scan failed: ${error.message}\n`));
  }
}
