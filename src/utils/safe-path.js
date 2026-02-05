/**
 * Path Safety Utilities
 *
 * Prevents path traversal attacks by validating file paths
 * before file system operations.
 */

import { resolve, relative, normalize } from 'path';

/**
 * Validate that a file path is within an allowed base directory.
 * Prevents path traversal attacks (../../etc/passwd).
 * @param {string} filePath - The path to validate
 * @param {string} baseDir - The allowed base directory
 * @returns {string} The resolved, safe path
 * @throws {Error} If path escapes the base directory
 */
export function safePath(filePath, baseDir) {
  const resolved = resolve(baseDir, filePath);
  const rel = relative(baseDir, resolved);

  // Check if path tries to escape base directory
  if (rel.startsWith('..') || resolve(resolved) !== resolved) {
    throw new Error(`Path traversal blocked: ${filePath} escapes ${baseDir}`);
  }

  return resolved;
}

/**
 * Normalize and validate a path component (no slashes, no ..)
 * Use this for validating individual path segments like filenames.
 * @param {string} component - A single path segment
 * @returns {string} The validated component
 * @throws {Error} If component contains path traversal
 */
export function safeComponent(component) {
  const normalized = normalize(component);

  // Check for path traversal or separators
  if (normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
    throw new Error(`Invalid path component: ${component}`);
  }

  return normalized;
}

/**
 * Validate multiple path components
 * @param {string[]} components - Array of path segments
 * @returns {string[]} Validated components
 * @throws {Error} If any component is invalid
 */
export function safeComponents(components) {
  return components.map(comp => safeComponent(comp));
}
