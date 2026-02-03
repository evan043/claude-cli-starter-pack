/**
 * Wizard Helper Functions
 *
 * Utility functions for file operations, backup management,
 * and directory handling used by the setup wizard.
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get dynamic counts of available templates
 * @returns {Object} Object with commands, hooks, and skills counts
 */
export function getTemplateCounts() {
  const templatesDir = join(__dirname, '..', '..', '..', 'templates');
  let commands = 0;
  let hooks = 0;
  let skills = 0;

  try {
    const commandsDir = join(templatesDir, 'commands');
    if (existsSync(commandsDir)) {
      commands = readdirSync(commandsDir).filter(f => f.endsWith('.template.md')).length;
    }
  } catch {
    // Use default
  }

  try {
    const hooksDir = join(templatesDir, 'hooks');
    if (existsSync(hooksDir)) {
      hooks = readdirSync(hooksDir).filter(f => f.endsWith('.template.js')).length;
    }
  } catch {
    // Use default
  }

  try {
    const skillsDir = join(templatesDir, 'skills');
    if (existsSync(skillsDir)) {
      skills = readdirSync(skillsDir).filter(f => !f.startsWith('.')).length;
    }
  } catch {
    // Use default
  }

  return { commands, hooks, skills };
}

/**
 * Create backup of a file before overwriting
 * @param {string} filePath - Path to file to backup
 * @returns {string|null} - Path to backup file, or null if no backup needed
 */
export function createBackup(filePath) {
  if (!existsSync(filePath)) return null;

  const backupDir = join(process.cwd(), '.claude', 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = basename(filePath);
  const backupPath = join(backupDir, `${fileName}.${timestamp}.bak`);

  copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Recursively copy a directory
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 */
export function copyDirRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Find existing CCASP backups in the project
 * @returns {Array} Array of backup objects with name, path, date, and content flags
 */
export function findExistingBackups() {
  const backupDir = join(process.cwd(), '.claude-backup');
  const backups = [];

  if (!existsSync(backupDir)) {
    return backups;
  }

  try {
    const entries = readdirSync(backupDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const backupPath = join(backupDir, entry.name);
        const hasClaudeDir = existsSync(join(backupPath, '.claude'));
        const hasClaudeMd = existsSync(join(backupPath, 'CLAUDE.md'));

        if (hasClaudeDir || hasClaudeMd) {
          // Parse timestamp from folder name (format: 2025-01-30T12-30-45)
          let date = entry.name;
          try {
            const isoDate = entry.name.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
            date = new Date(isoDate).toLocaleString();
          } catch {
            // Keep original name if parsing fails
          }

          backups.push({
            name: entry.name,
            path: backupPath,
            date,
            hasClaudeDir,
            hasClaudeMd,
          });
        }
      }
    }
  } catch {
    // Silently fail
  }

  // Sort by name (newest first)
  return backups.sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * Display setup header
 */
export function showSetupHeader() {
  console.log(
    boxen(
      chalk.bold.cyan('CCASP Setup Wizard\n\n') +
        chalk.dim('Vibe-code friendly - Minimal typing - Mobile-ready'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

/**
 * Show session restart reminder
 * Context-aware: different message for terminal vs Claude CLI
 */
export function showRestartReminder() {
  console.log(
    boxen(
      chalk.bold.green('Setup Complete!\n\n') +
        chalk.white('To start using your new commands:\n\n') +
        chalk.dim('Run this command in your project directory:\n\n') +
        `  ${chalk.yellow('claude')}\n\n` +
        chalk.dim('Then try: ') + chalk.cyan('/menu') + chalk.dim(' or ') + chalk.cyan('/project-implementation-for-ccasp'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );
}

/**
 * Show completion message
 */
export function showCompletionMessage() {
  console.log(
    boxen(
      chalk.bold.green('Setup Complete!\n\n') +
        chalk.white('Your .claude folder is ready.\n\n') +
        chalk.dim('Next steps:\n') +
        `  ${chalk.cyan('1.')} ${chalk.bold.yellow('RESTART')} Claude Code CLI for changes to take effect\n` +
        `  ${chalk.cyan('2.')} Type ${chalk.yellow('/menu')} to see commands\n` +
        `  ${chalk.cyan('3.')} Or type ${chalk.yellow('/ccasp-setup')} for this menu`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );

  // Show restart reminder
  showRestartReminder();
}

/**
 * Show manual launch instructions when auto-launch fails
 * @param {string} cwd - Current working directory
 */
export function showManualLaunchInstructions(cwd) {
  console.log(
    boxen(
      chalk.yellow('Could not auto-launch Claude CLI\n\n') +
        chalk.white('Please run these commands manually:\n\n') +
        chalk.dim(`  cd "${cwd}"\n`) +
        chalk.cyan('  claude\n\n') +
        chalk.dim('Then try: ') + chalk.yellow('/menu') + chalk.dim(' or ') + chalk.yellow('/project-implementation-for-ccasp'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
      }
    )
  );
}

/**
 * Launch Claude Code CLI with auto-injected command
 * Opens a new terminal window and starts Claude CLI with the setup command
 */
export async function launchClaudeCLI() {
  console.log(chalk.cyan('\nLaunching Claude Code CLI with project setup...\n'));

  const platform = process.platform;
  const cwd = process.cwd();
  const setupCommand = '/project-implementation-for-ccasp';
  let launched = false;

  try {
    const { execSync } = await import('child_process');

    if (platform === 'win32') {
      // Windows: Use PowerShell Start-Process with argument array
      // This reliably handles paths with spaces and special characters
      const psArgs = `/k','cd /d "${cwd}" && claude "${setupCommand}"`;
      execSync(`powershell -Command "Start-Process cmd -ArgumentList '${psArgs}'"`, {
        stdio: 'ignore',
        cwd: cwd,
      });
      launched = true;
    } else if (platform === 'darwin') {
      // macOS: Open Terminal app with claude command and inject setup
      execSync(`osascript -e 'tell application "Terminal" to do script "cd \\"${cwd}\\" && claude \\"${setupCommand}\\""'`, { stdio: 'pipe' });
      launched = true;
    } else {
      // Linux: Try common terminals with injected command
      try {
        execSync(`gnome-terminal -- bash -c "cd '${cwd}' && claude '${setupCommand}'; exec bash"`, { stdio: 'pipe' });
        launched = true;
      } catch {
        try {
          execSync(`xterm -e "cd '${cwd}' && claude '${setupCommand}'"`, { stdio: 'pipe' });
          launched = true;
        } catch {
          // Fallback below
        }
      }
    }

    if (launched) {
      console.log(
        boxen(
          chalk.green('Claude CLI Launched!\n\n') +
            chalk.dim('A new terminal window has opened with:\n') +
            chalk.yellow(`claude "${setupCommand}"\n\n`) +
            chalk.white('This will automatically run the full project setup:\n') +
            chalk.dim('  - Tech stack detection\n') +
            chalk.dim('  - MCP server configuration\n') +
            chalk.dim('  - GitHub project board setup\n') +
            chalk.dim('  - Testing framework integration'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } else {
      showManualLaunchInstructions(cwd);
    }
  } catch {
    showManualLaunchInstructions(cwd);
  }
}

export default {
  getTemplateCounts,
  createBackup,
  copyDirRecursive,
  findExistingBackups,
  showSetupHeader,
  showRestartReminder,
  showCompletionMessage,
  showManualLaunchInstructions,
  launchClaudeCLI,
};
