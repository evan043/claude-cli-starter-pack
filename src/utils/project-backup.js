/**
 * Project Backup Utilities
 *
 * Backup and restore project .claude directories before dev-deploy updates.
 * Backups are stored in ~/.claude/ccasp-project-backups/
 *
 * Features:
 * - Full backup of .claude/ and CLAUDE.md
 * - Manifest tracking for each backup
 * - Backup rotation (keep last 5 per project)
 * - Cross-platform path handling
 */

import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync
} from 'fs';
import { join, basename } from 'path';
import { globalClaudePath } from './paths.js';

const BACKUP_DIR = 'ccasp-project-backups';
const MAX_BACKUPS_PER_PROJECT = 5;

/**
 * Get backup root directory
 * @returns {string} Path to ~/.claude/ccasp-project-backups/
 */
export function getBackupRoot() {
  return globalClaudePath(BACKUP_DIR);
}

/**
 * Generate backup path for a project
 * @param {string} projectPath - Absolute path to project
 * @returns {string} Path to backup directory
 */
function getProjectBackupPath(projectPath) {
  const projectName = sanitizeProjectName(basename(projectPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return join(getBackupRoot(), `${projectName}_${timestamp}`);
}

/**
 * Sanitize project name for use in filesystem
 * @param {string} name - Project name
 * @returns {string} Safe name for filesystem
 */
function sanitizeProjectName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectoryRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip node_modules and other large/irrelevant directories
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get total size of a directory (for manifest)
 * @param {string} dirPath - Directory path
 * @returns {number} Size in bytes
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += getDirectorySize(fullPath);
      } else {
        totalSize += statSync(fullPath).size;
      }
    }
  } catch {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Count files in a directory recursively
 * @param {string} dirPath - Directory path
 * @returns {number} File count
 */
function countFiles(dirPath) {
  let count = 0;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFiles(join(dirPath, entry.name));
      } else {
        count++;
      }
    }
  } catch {
    // Ignore errors
  }

  return count;
}

/**
 * Backup a project's .claude directory before dev update
 * @param {string} projectPath - Project root path
 * @returns {Object|null} Backup manifest or null if nothing to backup
 */
export function backupProject(projectPath) {
  const claudeDir = join(projectPath, '.claude');
  const claudeMdPath = join(projectPath, 'CLAUDE.md');

  if (!existsSync(claudeDir) && !existsSync(claudeMdPath)) {
    return null; // Nothing to backup
  }

  const backupPath = getProjectBackupPath(projectPath);
  mkdirSync(backupPath, { recursive: true });

  const manifest = {
    projectPath,
    projectName: basename(projectPath),
    backupPath,
    backedUpAt: new Date().toISOString(),
    files: [],
    fileCount: 0,
    totalSize: 0
  };

  // Backup CLAUDE.md
  if (existsSync(claudeMdPath)) {
    const dest = join(backupPath, 'CLAUDE.md');
    copyFileSync(claudeMdPath, dest);
    manifest.files.push('CLAUDE.md');
    manifest.fileCount++;
    manifest.totalSize += statSync(claudeMdPath).size;
  }

  // Backup .claude directory (recursive)
  if (existsSync(claudeDir)) {
    const destClaudeDir = join(backupPath, '.claude');
    copyDirectoryRecursive(claudeDir, destClaudeDir);
    manifest.files.push('.claude/');
    manifest.fileCount += countFiles(claudeDir);
    manifest.totalSize += getDirectorySize(claudeDir);
  }

  // Save manifest
  writeFileSync(
    join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // Cleanup old backups
  cleanupOldBackups(projectPath);

  return manifest;
}

/**
 * Get list of backups for a project
 * @param {string} projectPath - Project path
 * @returns {Array} List of backup manifests sorted by date (newest first)
 */
export function getProjectBackups(projectPath) {
  const backupRoot = getBackupRoot();
  if (!existsSync(backupRoot)) return [];

  const projectName = sanitizeProjectName(basename(projectPath));
  const backups = [];

  try {
    const entries = readdirSync(backupRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith(`${projectName}_`)) {
        const manifestPath = join(backupRoot, entry.name, 'manifest.json');
        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            backups.push(manifest);
          } catch {
            /* ignore invalid manifests */
          }
        }
      }
    }
  } catch {
    /* ignore errors */
  }

  return backups.sort((a, b) => b.backedUpAt.localeCompare(a.backedUpAt));
}

/**
 * Get the most recent backup for a project
 * @param {string} projectPath - Project path
 * @returns {Object|null} Most recent backup manifest or null
 */
export function getLatestBackup(projectPath) {
  const backups = getProjectBackups(projectPath);
  return backups.length > 0 ? backups[0] : null;
}

/**
 * Restore project from backup
 * @param {Object} manifest - Backup manifest
 * @returns {Object} Result with success status and details
 */
export function restoreProject(manifest) {
  const { projectPath, backupPath } = manifest;

  if (!existsSync(backupPath)) {
    return { success: false, error: 'Backup not found' };
  }

  if (!existsSync(projectPath)) {
    return { success: false, error: 'Project directory not found' };
  }

  const result = {
    success: true,
    restored: [],
    errors: []
  };

  try {
    // Remove current .claude
    const claudeDir = join(projectPath, '.claude');
    if (existsSync(claudeDir)) {
      rmSync(claudeDir, { recursive: true, force: true });
    }

    // Restore .claude from backup
    const backupClaudeDir = join(backupPath, '.claude');
    if (existsSync(backupClaudeDir)) {
      copyDirectoryRecursive(backupClaudeDir, claudeDir);
      result.restored.push('.claude/');
    }

    // Restore CLAUDE.md
    const backupClaudeMd = join(backupPath, 'CLAUDE.md');
    const destClaudeMd = join(projectPath, 'CLAUDE.md');
    if (existsSync(backupClaudeMd)) {
      copyFileSync(backupClaudeMd, destClaudeMd);
      result.restored.push('CLAUDE.md');
    }
  } catch (err) {
    result.success = false;
    result.errors.push(err.message);
  }

  return result;
}

/**
 * Cleanup old backups, keeping only the most recent ones
 * @param {string} projectPath - Project path
 */
function cleanupOldBackups(projectPath) {
  const backups = getProjectBackups(projectPath);

  if (backups.length > MAX_BACKUPS_PER_PROJECT) {
    const toDelete = backups.slice(MAX_BACKUPS_PER_PROJECT);
    for (const backup of toDelete) {
      try {
        rmSync(backup.backupPath, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}

/**
 * Delete a specific backup
 * @param {Object} manifest - Backup manifest
 * @returns {boolean} Success
 */
export function deleteBackup(manifest) {
  try {
    if (existsSync(manifest.backupPath)) {
      rmSync(manifest.backupPath, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get total backup storage used
 * @returns {Object} Storage info
 */
export function getBackupStorageInfo() {
  const backupRoot = getBackupRoot();

  if (!existsSync(backupRoot)) {
    return { totalSize: 0, backupCount: 0, projectCount: 0 };
  }

  let totalSize = 0;
  let backupCount = 0;
  const projects = new Set();

  try {
    const entries = readdirSync(backupRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        backupCount++;
        const projectName = entry.name.split('_')[0];
        projects.add(projectName);
        totalSize += getDirectorySize(join(backupRoot, entry.name));
      }
    }
  } catch {
    /* ignore */
  }

  return {
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    backupCount,
    projectCount: projects.size
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
}

/**
 * Cleanup all backups for a project
 * @param {string} projectPath - Project path
 * @returns {number} Number of backups deleted
 */
export function cleanupAllProjectBackups(projectPath) {
  const backups = getProjectBackups(projectPath);
  let deleted = 0;

  for (const backup of backups) {
    if (deleteBackup(backup)) {
      deleted++;
    }
  }

  return deleted;
}
