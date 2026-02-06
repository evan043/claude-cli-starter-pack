/**
 * JSON File I/O Utilities
 *
 * Centralized JSON read/write operations with error handling.
 * Replaces scattered JSON.parse(readFileSync(...)) patterns throughout the codebase.
 *
 * For file operations without JSON parsing, see file-ops.js.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Read and parse a JSON file
 * @param {string} filePath - Absolute path to JSON file
 * @param {*} fallback - Value to return if file doesn't exist or is invalid JSON
 * @returns {*} Parsed JSON data or fallback value
 */
export function readJSON(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Write data as formatted JSON to a file (creates parent directories)
 * @param {string} filePath - Absolute path to write to
 * @param {*} data - Data to serialize as JSON
 * @param {number} indent - JSON indentation spaces (default: 2)
 */
export function writeJSON(filePath, data, indent = 2) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, indent)}\n`, 'utf8');
}

/**
 * Read JSON with a list of fallback paths (returns first that exists)
 * @param {string[]} paths - Array of file paths to try in order
 * @param {*} fallback - Value to return if no path contains valid JSON
 * @returns {*} Parsed JSON data or fallback
 */
export function readJSONFromPaths(paths, fallback = null) {
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return fallback;
}
