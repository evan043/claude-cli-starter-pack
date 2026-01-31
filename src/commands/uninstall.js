/**
 * Uninstall Command
 *
 * Fully removes CCASP from a project directory and restores backups.
 */

import chalk from 'chalk';
import { existsSync, readFileSync, readdirSync, unlinkSync, rmdirSync, copyFileSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { createInterface } from 'readline';
import { unregisterProject } from '../utils/global-registry.js';

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
 * Find all backup files in .claude/backups/
 * Returns map of original filename -> most recent backup path
 */
function findBackups(projectDir) {
  const backupDir = join(projectDir, '.claude', 'backups');
  const backups = new Map();

  if (!existsSync(backupDir)) {
    return backups;
  }

  try {
    const files = readdirSync(backupDir);

    for (const file of files) {
      if (!file.endsWith('.bak')) continue;

      // Parse filename: original.YYYY-MM-DDTHH-MM-SS.bak
      const match = file.match(/^(.+)\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.bak$/);
      if (!match) continue;

      const [, originalName, timestamp] = match;
      const backupPath = join(backupDir, file);

      // Keep only the most recent backup for each file
      if (!backups.has(originalName) || backups.get(originalName).timestamp < timestamp) {
        backups.set(originalName, {
          path: backupPath,
          timestamp,
          originalName
        });
      }
    }
  } catch (err) {
    console.log(chalk.yellow(`  Warning: Could not read backups directory: ${err.message}`));
  }

  return backups;
}

/**
 * Get list of CCASP-installed files by checking ccasp-state.json or common patterns
 */
function findCcaspFiles(projectDir) {
  const files = {
    commands: [],
    hooks: [],
    skills: [],
    config: [],
    docs: [],
    agents: []
  };

  const claudeDir = join(projectDir, '.claude');
  if (!existsSync(claudeDir)) {
    return files;
  }

  // Commands
  const commandsDir = join(claudeDir, 'commands');
  if (existsSync(commandsDir)) {
    try {
      const entries = readdirSync(commandsDir);
      files.commands = entries
        .filter(f => f.endsWith('.md'))
        .map(f => join(commandsDir, f));
    } catch {}
  }

  // Hooks
  const hooksDir = join(claudeDir, 'hooks');
  if (existsSync(hooksDir)) {
    try {
      const entries = readdirSync(hooksDir);
      files.hooks = entries
        .filter(f => f.endsWith('.js'))
        .map(f => join(hooksDir, f));
    } catch {}
  }

  // Skills (directories)
  const skillsDir = join(claudeDir, 'skills');
  if (existsSync(skillsDir)) {
    try {
      const entries = readdirSync(skillsDir, { withFileTypes: true });
      files.skills = entries
        .filter(e => e.isDirectory())
        .map(e => join(skillsDir, e.name));
    } catch {}
  }

  // Config
  const configDir = join(claudeDir, 'config');
  if (existsSync(configDir)) {
    try {
      const entries = readdirSync(configDir);
      files.config = entries.map(f => join(configDir, f));
    } catch {}
  }

  // Docs
  const docsDir = join(claudeDir, 'docs');
  if (existsSync(docsDir)) {
    files.docs.push(docsDir);
  }

  // Agents
  const agentsDir = join(claudeDir, 'agents');
  if (existsSync(agentsDir)) {
    try {
      const entries = readdirSync(agentsDir);
      files.agents = entries
        .filter(f => f.endsWith('.md'))
        .map(f => join(agentsDir, f));
    } catch {}
  }

  return files;
}

/**
 * Recursively remove a directory
 */
function removeDir(dirPath) {
  if (!existsSync(dirPath)) return;

  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removeDir(fullPath);
    } else {
      unlinkSync(fullPath);
    }
  }
  rmdirSync(dirPath);
}

/**
 * Check if CCASP is installed in the project
 */
function isCcaspInstalled(projectDir) {
  const markers = [
    join(projectDir, '.claude', 'config', 'ccasp-state.json'),
    join(projectDir, '.claude', 'commands', 'menu.md'),
    join(projectDir, '.claude', 'commands', 'ccasp-setup.md')
  ];

  return markers.some(m => existsSync(m));
}

/**
 * Run the uninstall command
 */
export async function runUninstall(options = {}) {
  const projectDir = process.cwd();

  console.log(chalk.cyan('\n  CCASP Uninstall\n'));
  console.log(chalk.dim(`  Project: ${projectDir}\n`));

  // Check if CCASP is installed
  if (!isCcaspInstalled(projectDir)) {
    console.log(chalk.yellow('  CCASP does not appear to be installed in this directory.'));
    console.log(chalk.dim('  No .claude/config/ccasp-state.json or CCASP commands found.\n'));
    return;
  }

  // Find what's installed
  const ccaspFiles = findCcaspFiles(projectDir);
  const backups = findBackups(projectDir);

  // Show what will be affected
  console.log(chalk.white.bold('  Found CCASP Installation:\n'));

  const totalCommands = ccaspFiles.commands.length;
  const totalHooks = ccaspFiles.hooks.length;
  const totalSkills = ccaspFiles.skills.length;
  const totalConfig = ccaspFiles.config.length;
  const totalAgents = ccaspFiles.agents.length;

  if (totalCommands > 0) {
    console.log(chalk.white(`  Commands: ${totalCommands}`));
  }
  if (totalHooks > 0) {
    console.log(chalk.white(`  Hooks: ${totalHooks}`));
  }
  if (totalSkills > 0) {
    console.log(chalk.white(`  Skills: ${totalSkills}`));
  }
  if (totalConfig > 0) {
    console.log(chalk.white(`  Config files: ${totalConfig}`));
  }
  if (totalAgents > 0) {
    console.log(chalk.white(`  Agents: ${totalAgents}`));
  }

  if (backups.size > 0) {
    console.log(chalk.green(`\n  Backups found: ${backups.size} (will be restored)`));
    for (const [name, backup] of backups) {
      console.log(chalk.dim(`    - ${name} (${backup.timestamp})`));
    }
  }

  console.log('');

  // Confirm unless --force
  if (!options.force) {
    const shouldContinue = await confirm(chalk.yellow('  Remove CCASP and restore backups? (y/N): '));
    if (!shouldContinue) {
      console.log(chalk.dim('\n  Uninstall cancelled.\n'));
      return;
    }
  }

  console.log('');

  // Step 1: Restore backups
  if (backups.size > 0) {
    console.log(chalk.cyan('  Restoring backups...\n'));

    for (const [originalName, backup] of backups) {
      // Determine where to restore based on file extension
      let targetDir;
      if (originalName.endsWith('.md')) {
        // Could be command, agent, or doc
        if (ccaspFiles.commands.some(c => basename(c) === originalName)) {
          targetDir = join(projectDir, '.claude', 'commands');
        } else if (ccaspFiles.agents.some(a => basename(a) === originalName)) {
          targetDir = join(projectDir, '.claude', 'agents');
        } else {
          targetDir = join(projectDir, '.claude', 'commands'); // Default
        }
      } else if (originalName.endsWith('.js')) {
        targetDir = join(projectDir, '.claude', 'hooks');
      } else if (originalName.endsWith('.json')) {
        targetDir = join(projectDir, '.claude', 'config');
      } else {
        targetDir = join(projectDir, '.claude');
      }

      const targetPath = join(targetDir, originalName);

      try {
        copyFileSync(backup.path, targetPath);
        console.log(chalk.green(`    ✓ Restored: ${originalName}`));
      } catch (err) {
        console.log(chalk.red(`    ✗ Failed to restore ${originalName}: ${err.message}`));
      }
    }

    console.log('');
  }

  // Step 2: Remove CCASP files (that weren't backed up)
  console.log(chalk.cyan('  Removing CCASP files...\n'));

  let removedCount = 0;

  // Remove commands (except those that were restored from backup)
  for (const cmdPath of ccaspFiles.commands) {
    const name = basename(cmdPath);
    if (!backups.has(name)) {
      try {
        unlinkSync(cmdPath);
        removedCount++;
      } catch {}
    }
  }

  // Remove hooks (except those that were restored from backup)
  for (const hookPath of ccaspFiles.hooks) {
    const name = basename(hookPath);
    if (!backups.has(name)) {
      try {
        unlinkSync(hookPath);
        removedCount++;
      } catch {}
    }
  }

  // Remove skills directories
  for (const skillDir of ccaspFiles.skills) {
    try {
      removeDir(skillDir);
      removedCount++;
    } catch {}
  }

  // Remove config files
  for (const configPath of ccaspFiles.config) {
    try {
      unlinkSync(configPath);
      removedCount++;
    } catch {}
  }

  // Remove agents (except those restored)
  for (const agentPath of ccaspFiles.agents) {
    const name = basename(agentPath);
    if (!backups.has(name)) {
      try {
        unlinkSync(agentPath);
        removedCount++;
      } catch {}
    }
  }

  console.log(chalk.green(`    ✓ Removed ${removedCount} CCASP file(s)\n`));

  // Step 3: Remove backup directory
  const backupDir = join(projectDir, '.claude', 'backups');
  if (existsSync(backupDir)) {
    try {
      removeDir(backupDir);
      console.log(chalk.green('    ✓ Removed backups directory\n'));
    } catch {}
  }

  // Step 4: Clean up empty directories
  const dirsToCheck = [
    join(projectDir, '.claude', 'commands'),
    join(projectDir, '.claude', 'hooks'),
    join(projectDir, '.claude', 'skills'),
    join(projectDir, '.claude', 'config'),
    join(projectDir, '.claude', 'agents'),
    join(projectDir, '.claude', 'docs')
  ];

  for (const dir of dirsToCheck) {
    if (existsSync(dir)) {
      try {
        const entries = readdirSync(dir);
        if (entries.length === 0) {
          rmdirSync(dir);
        }
      } catch {}
    }
  }

  // Step 5: Optionally remove entire .claude directory if empty or --all flag
  const claudeDir = join(projectDir, '.claude');
  if (options.all) {
    if (existsSync(claudeDir)) {
      const shouldRemoveAll = options.force || await confirm(chalk.yellow('  Remove entire .claude/ directory? (y/N): '));
      if (shouldRemoveAll) {
        try {
          removeDir(claudeDir);
          console.log(chalk.green('    ✓ Removed .claude/ directory\n'));
        } catch (err) {
          console.log(chalk.red(`    ✗ Could not remove .claude/: ${err.message}\n`));
        }
      }
    }
  } else {
    // Check if .claude is empty
    if (existsSync(claudeDir)) {
      try {
        const remaining = readdirSync(claudeDir);
        if (remaining.length === 0) {
          rmdirSync(claudeDir);
          console.log(chalk.green('    ✓ Removed empty .claude/ directory\n'));
        } else {
          console.log(chalk.dim(`    .claude/ directory kept (${remaining.length} items remain)`));
          console.log(chalk.dim('    Use --all to remove entire .claude/ directory\n'));
        }
      } catch {}
    }
  }

  // Remove from global registry
  const wasRegistered = unregisterProject(projectDir);
  if (wasRegistered) {
    console.log(chalk.green('  ✓ Removed from global CCASP registry'));
  }

  // Done
  console.log(chalk.green.bold('\n  ✓ CCASP uninstalled successfully!\n'));

  if (backups.size > 0) {
    console.log(chalk.dim('  Your backed-up files have been restored.'));
  }

  console.log(chalk.dim('  To reinstall, run: ccasp init\n'));
}
