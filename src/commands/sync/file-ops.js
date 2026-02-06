/**
 * Sync File Operations
 *
 * Git change detection and file synchronization helpers for dev mode sync.
 *
 * Provides:
 * - getChangedFiles: Parse git status for modified/new files
 * - ensureDir: Create parent directory if missing
 * - syncFile: Copy single file from worktree to project
 * - deployTemplate: Deploy command template stripping .template extension
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Get all modified and new files from git
 * @param {string} worktreePath - Path to worktree
 * @returns {Object} { modified: string[], added: string[], all: string[] }
 */
export function getChangedFiles(worktreePath) {
  try {
    const output = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const modified = [];
    const added = [];

    for (const line of output.trim().split('\n')) {
      if (!line) continue;
      const status = line.substring(0, 2).trim();
      const file = line.substring(3).trim();

      // Skip worktree-specific files
      if (file.startsWith('.ccasp-dev/') || file === '.dev-worktree-config.json') {
        continue;
      }

      if (status === '??' || status === 'A') {
        added.push(file);
      } else if (status === 'M' || status === 'MM' || status === ' M') {
        modified.push(file);
      }
    }

    return {
      modified,
      added,
      all: [...modified, ...added]
    };
  } catch (error) {
    console.error(chalk.red('Failed to get git status:'), error.message);
    return { modified: [], added: [], all: [] };
  }
}

/**
 * Ensure directory exists
 * @param {string} filePath - File path
 */
export function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sync a single file from worktree to project
 * @param {string} worktreePath - Source worktree path
 * @param {string} projectPath - Target project path
 * @param {string} relativePath - Relative file path
 * @returns {Object} { success: boolean, action: string }
 */
export function syncFile(worktreePath, projectPath, relativePath) {
  const srcPath = join(worktreePath, relativePath);
  const destPath = join(projectPath, relativePath);

  if (!existsSync(srcPath)) {
    return { success: false, action: 'missing' };
  }

  try {
    ensureDir(destPath);
    copyFileSync(srcPath, destPath);
    return { success: true, action: existsSync(destPath) ? 'updated' : 'added' };
  } catch (error) {
    return { success: false, action: 'error', error: error.message };
  }
}

/**
 * Deploy command template to .claude/commands/
 * Strips .template from filename
 * @param {string} worktreePath - Source worktree path
 * @param {string} projectPath - Target project path
 * @param {string} templatePath - Relative template path
 * @returns {Object} { success: boolean, action: string }
 */
export function deployTemplate(worktreePath, projectPath, templatePath) {
  const srcPath = join(worktreePath, templatePath);

  // Convert templates/commands/foo.template.md -> .claude/commands/foo.md
  const filename = basename(templatePath).replace('.template.md', '.md');
  const destPath = join(projectPath, '.claude', 'commands', filename);

  if (!existsSync(srcPath)) {
    return { success: false, action: 'missing' };
  }

  try {
    ensureDir(destPath);
    copyFileSync(srcPath, destPath);
    return { success: true, action: 'deployed' };
  } catch (error) {
    return { success: false, action: 'error', error: error.message };
  }
}
