/**
 * Directory Picker Utility
 *
 * Cross-platform directory selection for CCASP setup wizard.
 * Supports native file explorer dialogs on Windows, macOS, and Linux.
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { execSync, spawn } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Validate that a path is an existing directory
 * @param {string} dirPath - Path to validate
 * @returns {boolean|string} - true if valid, error message if not
 */
export function validateDirectory(dirPath) {
  if (!dirPath || dirPath.trim() === '') {
    return 'Please enter a directory path';
  }

  const resolvedPath = resolve(dirPath.trim());

  if (!existsSync(resolvedPath)) {
    return `Directory does not exist: ${resolvedPath}`;
  }

  try {
    const stats = statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return `Path is not a directory: ${resolvedPath}`;
    }
  } catch (error) {
    return `Cannot access path: ${error.message}`;
  }

  return true;
}

/**
 * Launch native file explorer folder picker
 * @returns {Promise<string|null>} - Selected directory path or null if cancelled
 */
async function launchNativeFolderPicker() {
  const platform = process.platform;
  const spinner = ora('Opening file explorer...').start();

  try {
    let selectedPath = null;

    if (platform === 'win32') {
      // Windows: Use PowerShell folder browser dialog
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
        $folderBrowser.Description = "Select a folder for CCASP setup"
        $folderBrowser.ShowNewFolderButton = $true
        $folderBrowser.RootFolder = [System.Environment+SpecialFolder]::MyComputer
        if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $folderBrowser.SelectedPath
        }
      `;

      try {
        const result = execSync(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, {
          encoding: 'utf8',
          windowsHide: true,
        }).trim();

        if (result && result.length > 0) {
          selectedPath = result;
        }
      } catch (error) {
        // PowerShell dialog cancelled or failed
        spinner.stop();
        return null;
      }

    } else if (platform === 'darwin') {
      // macOS: Use AppleScript folder dialog
      const appleScript = `
        set selectedFolder to choose folder with prompt "Select a folder for CCASP setup"
        return POSIX path of selectedFolder
      `;

      try {
        const result = execSync(`osascript -e '${appleScript}'`, {
          encoding: 'utf8',
        }).trim();

        if (result && result.length > 0) {
          // Remove trailing slash if present
          selectedPath = result.endsWith('/') ? result.slice(0, -1) : result;
        }
      } catch (error) {
        // AppleScript dialog cancelled
        spinner.stop();
        return null;
      }

    } else {
      // Linux: Try zenity, then kdialog, then fallback to manual input
      const linuxDialogs = [
        { cmd: 'zenity', args: ['--file-selection', '--directory', '--title=Select folder for CCASP setup'] },
        { cmd: 'kdialog', args: ['--getexistingdirectory', '.', '--title', 'Select folder for CCASP setup'] },
      ];

      for (const dialog of linuxDialogs) {
        try {
          // Check if command exists
          execSync(`which ${dialog.cmd}`, { encoding: 'utf8' });

          const result = execSync(`${dialog.cmd} ${dialog.args.join(' ')}`, {
            encoding: 'utf8',
          }).trim();

          if (result && result.length > 0) {
            selectedPath = result;
            break;
          }
        } catch (error) {
          // Command not found or dialog cancelled, try next
          continue;
        }
      }

      // If no GUI dialog worked, inform user
      if (!selectedPath) {
        spinner.stop();
        console.log(chalk.yellow('\nNo GUI file picker available. Please use manual path entry.\n'));
        return null;
      }
    }

    spinner.stop();

    if (selectedPath) {
      // Validate the selected path
      const validation = validateDirectory(selectedPath);
      if (validation === true) {
        return selectedPath;
      } else {
        console.log(chalk.red(`\n${validation}\n`));
        return null;
      }
    }

    return null;

  } catch (error) {
    spinner.stop();
    console.log(chalk.yellow(`\nFile explorer error: ${error.message}\n`));
    return null;
  }
}

/**
 * Prompt user to enter directory path manually
 * @returns {Promise<string|null>} - Entered directory path or null if cancelled
 */
async function promptManualPath() {
  const { dirPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'dirPath',
      message: 'Enter the folder path (or press Enter to cancel):',
      validate: (input) => {
        if (!input || input.trim() === '') {
          return true; // Allow empty to cancel
        }
        return validateDirectory(input);
      },
    },
  ]);

  if (!dirPath || dirPath.trim() === '') {
    return null;
  }

  return resolve(dirPath.trim());
}

/**
 * Main directory picker - presents menu and handles selection
 * @param {Object} options - Configuration options
 * @param {string} options.currentDir - Current working directory
 * @param {boolean} options.showCurrent - Whether to show current directory option
 * @returns {Promise<{path: string, changed: boolean}|null>} - Selected path info or null if cancelled
 */
export async function pickDirectory(options = {}) {
  const currentDir = options.currentDir || process.cwd();
  const showCurrent = options.showCurrent !== false;

  console.log(chalk.bold('\n📁 Directory Selection\n'));

  const choices = [];

  if (showCurrent) {
    choices.push({
      name: `${chalk.green('1.')} Current directory ${chalk.dim(`(${currentDir})`)}`,
      value: 'current',
      short: 'Current',
    });
  }

  choices.push(
    {
      name: `${chalk.cyan('2.')} Open file explorer ${chalk.dim('- Browse for folder')}`,
      value: 'explorer',
      short: 'Explorer',
    },
    {
      name: `${chalk.yellow('3.')} Paste/type folder path ${chalk.dim('- Manual entry')}`,
      value: 'paste',
      short: 'Manual',
    },
    {
      name: `${chalk.dim('0.')} Cancel`,
      value: 'cancel',
      short: 'Cancel',
    }
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Where would you like to set up CCASP?',
      choices,
      pageSize: 5,
    },
  ]);

  switch (action) {
    case 'current':
      return { path: currentDir, changed: false };

    case 'explorer': {
      const explorerPath = await launchNativeFolderPicker();
      if (explorerPath) {
        const changed = resolve(explorerPath) !== resolve(currentDir);
        return { path: explorerPath, changed };
      }
      // If explorer failed/cancelled, offer manual entry
      console.log(chalk.dim('\nFile explorer cancelled. Would you like to enter a path manually?\n'));
      const retryManual = await promptManualPath();
      if (retryManual) {
        const changed = resolve(retryManual) !== resolve(currentDir);
        return { path: retryManual, changed };
      }
      return null;
    }

    case 'paste': {
      const manualPath = await promptManualPath();
      if (manualPath) {
        const changed = resolve(manualPath) !== resolve(currentDir);
        return { path: manualPath, changed };
      }
      return null;
    }

    case 'cancel':
    default:
      return null;
  }
}

/**
 * Change to selected directory and verify
 * @param {string} targetDir - Directory to change to
 * @returns {boolean} - true if successful
 */
export function changeDirectory(targetDir) {
  try {
    const resolvedPath = resolve(targetDir);
    process.chdir(resolvedPath);
    console.log(chalk.green(`\n✓ Changed to: ${chalk.cyan(resolvedPath)}\n`));
    return true;
  } catch (error) {
    console.log(chalk.red(`\nFailed to change directory: ${error.message}\n`));
    return false;
  }
}

export default pickDirectory;
