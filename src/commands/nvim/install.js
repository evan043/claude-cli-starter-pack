/**
 * CCASP Neovim Plugin - Installation Module
 *
 * Handles plugin installation, uninstallation, and file operations.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { PLUGIN_SOURCE, PLUGIN_PATHS } from './config.js';

/**
 * Create symlink (cross-platform)
 */
export function createSymlink(source, target) {
  const isWindows = process.platform === 'win32';

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(target), { recursive: true });

  // Remove existing if present
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);
    if (stats.isSymbolicLink() || stats.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  if (isWindows) {
    // Windows requires directory junction for symlinks without admin
    fs.symlinkSync(source, target, 'junction');
  } else {
    fs.symlinkSync(source, target);
  }
}

/**
 * Copy directory recursively
 */
export function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install plugin via symlink
 */
export async function installSymlink(nvimConfig) {
  const spinner = ora('Creating symlink...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);
    createSymlink(PLUGIN_SOURCE, targetPath);

    spinner.succeed(chalk.green('Symlink created successfully!'));
    console.log(chalk.dim(`  Source: ${PLUGIN_SOURCE}`));
    console.log(chalk.dim(`  Target: ${targetPath}`));

    return targetPath;
  } catch (error) {
    spinner.fail(chalk.red('Failed to create symlink'));
    throw error;
  }
}

/**
 * Install plugin via copy
 */
export async function installCopy(nvimConfig) {
  const spinner = ora('Copying plugin files...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);

    // Remove existing if present
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    copyDir(PLUGIN_SOURCE, targetPath);

    spinner.succeed(chalk.green('Plugin files copied successfully!'));
    console.log(chalk.dim(`  Source: ${PLUGIN_SOURCE}`));
    console.log(chalk.dim(`  Target: ${targetPath}`));

    return targetPath;
  } catch (error) {
    spinner.fail(chalk.red('Failed to copy plugin files'));
    throw error;
  }
}

/**
 * Uninstall plugin
 */
export async function uninstallPlugin(nvimConfig) {
  const spinner = ora('Removing plugin...').start();

  try {
    const targetPath = path.join(nvimConfig, PLUGIN_PATHS.manual);

    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      spinner.succeed(chalk.green('Plugin removed successfully!'));
      console.log(chalk.dim(`  Removed: ${targetPath}`));
    } else {
      spinner.info(chalk.yellow('Plugin not found at expected location'));
      console.log(chalk.dim(`  Expected: ${targetPath}`));
    }

    // Also check for config files
    const lazyConfig = path.join(nvimConfig, PLUGIN_PATHS.lazy);
    if (fs.existsSync(lazyConfig)) {
      console.log(chalk.yellow('\nNote: Config file still exists:'));
      console.log(chalk.dim(`  ${lazyConfig}`));
      console.log(chalk.dim('  Remove manually if no longer needed.'));
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to remove plugin'));
    throw error;
  }
}
