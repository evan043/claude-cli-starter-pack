/**
 * Backup Management Module
 *
 * Handles backup creation, listing, and restoration for assets.
 * Ensures safe update operations with rollback capabilities.
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import chalk from 'chalk';
import { getAutoUpdateSettings } from '../version-check.js';
import { ASSET_PATHS } from './asset-loader.js';

/**
 * Create a backup of a file before updating
 * Returns the backup file path or null if backups are disabled
 */
export function createBackup(filePath, projectDir = process.cwd()) {
  const settings = getAutoUpdateSettings(projectDir);

  // Check if backups are enabled
  if (!settings.backupBeforeUpdate) {
    return null;
  }

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    // Create backup directory structure
    const backupDir = join(projectDir, '.claude', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-').slice(0, -5);

    // Determine asset type from path
    const claudeDir = join(projectDir, '.claude');
    const relativePath = filePath.replace(`${claudeDir  }/`, '').replace(`${claudeDir  }\\`, '');
    const backupSubdir = dirname(relativePath);
    const filename = basename(filePath);

    // Create backup subdirectory
    const fullBackupDir = join(backupDir, backupSubdir);
    if (!existsSync(fullBackupDir)) {
      mkdirSync(fullBackupDir, { recursive: true });
    }

    // Create backup filename
    const backupFilename = `${filename}.${timestamp}.bak`;
    const backupPath = join(fullBackupDir, backupFilename);

    // Copy file to backup
    copyFileSync(filePath, backupPath);

    return backupPath;
  } catch (error) {
    console.error('Backup failed:', error.message);
    return null;
  }
}

/**
 * List all backups for a specific asset
 */
export function listBackups(assetType, assetName, projectDir = process.cwd()) {
  const pathConfig = ASSET_PATHS[assetType];
  if (!pathConfig) return [];

  const localPath = pathConfig.local(projectDir, assetName);
  const filename = basename(localPath);
  const claudeDir = join(projectDir, '.claude');
  const relativePath = localPath.replace(`${claudeDir  }/`, '').replace(`${claudeDir  }\\`, '');
  const backupSubdir = dirname(relativePath);

  const backupDir = join(projectDir, '.claude', 'backups', backupSubdir);

  if (!existsSync(backupDir)) {
    return [];
  }

  try {
    const files = readdirSync(backupDir);
    const backups = files
      .filter((f) => f.startsWith(filename) && f.endsWith('.bak'))
      .map((f) => {
        const fullPath = join(backupDir, f);
        const stats = statSync(fullPath);
        return {
          filename: f,
          path: fullPath,
          timestamp: stats.mtime.getTime(),
          size: stats.size,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    return backups;
  } catch (error) {
    console.error(chalk.yellow(`Warning: Failed to list backups for ${assetName} - ${error.message}`));
    return [];
  }
}

/**
 * Restore a backup
 */
export function restoreBackup(backupPath, projectDir = process.cwd()) {
  if (!existsSync(backupPath)) {
    throw new Error('Backup file not found');
  }

  // Parse the backup path to determine original location
  const backupDir = join(projectDir, '.claude', 'backups');
  const relativePath = backupPath.replace(`${backupDir  }/`, '').replace(`${backupDir  }\\`, '');

  // Remove the .timestamp.bak suffix
  const parts = basename(relativePath).split('.');
  const originalFilename = parts.slice(0, -2).join('.');
  const originalDir = dirname(relativePath);

  const originalPath = join(projectDir, '.claude', originalDir, originalFilename);

  // Create backup of current version before restoring
  if (existsSync(originalPath)) {
    createBackup(originalPath, projectDir);
  }

  // Copy backup to original location
  copyFileSync(backupPath, originalPath);

  return originalPath;
}
