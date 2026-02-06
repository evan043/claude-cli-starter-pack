/**
 * Cross-Platform Path Utilities
 *
 * Centralized path handling for Windows/macOS/Linux compatibility.
 * All path operations should use these utilities to ensure consistency.
 */

import { join, normalize, sep } from 'path';
import { homedir } from 'os';

/**
 * Normalize a path to use forward slashes (for comparison and storage)
 * @param {string} filePath - Path to normalize
 * @returns {string} Path with forward slashes
 */
export function toForwardSlashes(filePath) {
  if (!filePath) return filePath;
  return filePath.replace(/\\/g, '/');
}

/**
 * Normalize a path to use the platform's native separator
 * @param {string} filePath - Path to normalize
 * @returns {string} Path with native separators
 */
export function toNativePath(filePath) {
  if (!filePath) return filePath;
  return filePath.replace(/[/\\]/g, sep);
}

/**
 * Compare two paths for equality (cross-platform safe)
 * @param {string} path1 - First path
 * @param {string} path2 - Second path
 * @returns {boolean} True if paths are equivalent
 */
export function pathsEqual(path1, path2) {
  if (!path1 || !path2) return path1 === path2;
  const norm1 = toForwardSlashes(path1).replace(/\/$/, '').toLowerCase();
  const norm2 = toForwardSlashes(path2).replace(/\/$/, '').toLowerCase();
  return norm1 === norm2;
}

/**
 * Get the last segment of a path (cross-platform safe)
 * @param {string} filePath - Path to extract from
 * @returns {string} Last segment of the path
 */
export function getPathSegment(filePath) {
  if (!filePath) return '';
  return filePath.split(/[/\\]/).pop() || '';
}

/**
 * Build a .claude-relative path string for use in config/templates
 * Always uses forward slashes for consistency in JSON/templates
 * @param {...string} segments - Path segments after .claude/
 * @returns {string} Path string like ".claude/hooks/file.js"
 */
export function claudeRelativePath(...segments) {
  return `.claude/${  segments.join('/')}`;
}

/**
 * Build an absolute path to a .claude directory item
 * @param {string} baseDir - Project root directory
 * @param {...string} segments - Path segments after .claude/
 * @returns {string} Absolute path using native separators
 */
export function claudeAbsolutePath(baseDir, ...segments) {
  return join(baseDir, '.claude', ...segments);
}

/**
 * Get the user's home directory (cross-platform)
 * @returns {string} Home directory path
 */
export function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE || homedir();
}

/**
 * Build a path relative to user's home directory
 * @param {...string} segments - Path segments after home
 * @returns {string} Absolute path using native separators
 */
export function homeRelativePath(...segments) {
  return join(getHomeDir(), ...segments);
}

/**
 * Build a path to global .claude directory
 * @param {...string} segments - Path segments after ~/.claude/
 * @returns {string} Absolute path using native separators
 */
export function globalClaudePath(...segments) {
  return join(getHomeDir(), '.claude', ...segments);
}

/**
 * Check if running on Windows
 * @returns {boolean} True if Windows
 */
export function isWindows() {
  return process.platform === 'win32';
}

/**
 * Get the appropriate command existence checker
 * @returns {string} 'where' on Windows, 'which' on Unix
 */
export function getWhichCommand() {
  return isWindows() ? 'where' : 'which';
}

/**
 * Normalize line endings to Unix style (LF)
 * @param {string} content - Content to normalize
 * @returns {string} Content with Unix line endings
 */
export function normalizeLineEndings(content) {
  if (!content) return content;
  return content.replace(/\r\n/g, '\n');
}

/**
 * Build a Node.js command that works cross-platform
 * Uses forward slashes which Node.js handles on all platforms
 * @param {string} scriptPath - Path to the script (relative to project root)
 * @returns {string} Command string like "node .claude/hooks/script.js"
 */
export function nodeCommand(scriptPath) {
  // Node.js handles forward slashes on all platforms
  const normalizedPath = toForwardSlashes(scriptPath);
  return `node ${normalizedPath}`;
}

/**
 * Ensure a path uses consistent separators for storage/comparison
 * Stores with forward slashes, converts to native when needed for fs operations
 * @param {string} filePath - Path to store
 * @returns {string} Normalized path for storage
 */
export function storagePath(filePath) {
  return toForwardSlashes(filePath);
}
