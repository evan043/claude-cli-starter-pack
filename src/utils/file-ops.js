/**
 * Safe File Operations
 * Centralized file I/O with parent directory creation and error handling.
 *
 * JSON operations delegate to json-io.js. safeReadJson/safeWriteJson are
 * maintained as aliases for backward compatibility.
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { readJSON, writeJSON } from './json-io.js';

/**
 * Write file with automatic parent directory creation
 * @param {string} filePath - Target file path
 * @param {string} content - File content
 * @param {object} options - Write options
 */
export function safeWriteFile(filePath, content, options = {}) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, options.encoding || 'utf8');
}

/**
 * Read JSON file with error handling (delegates to readJSON)
 * @param {string} filePath - JSON file path
 * @param {*} fallback - Value to return if file doesn't exist or is invalid
 * @returns {*} Parsed JSON or fallback
 */
export function safeReadJson(filePath, fallback = null) {
  return readJSON(filePath, fallback);
}

/**
 * Write JSON file with formatting (delegates to writeJSON)
 * @param {string} filePath - Target file path
 * @param {*} data - Data to serialize
 * @param {number} indent - JSON indent spaces
 */
export function safeWriteJson(filePath, data, indent = 2) {
  writeJSON(filePath, data, indent);
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
