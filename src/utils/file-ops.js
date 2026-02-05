/**
 * Safe File Operations
 * Centralized file I/O with parent directory creation and error handling.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

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
 * Read JSON file with error handling
 * @param {string} filePath - JSON file path
 * @param {*} fallback - Value to return if file doesn't exist or is invalid
 * @returns {*} Parsed JSON or fallback
 */
export function safeReadJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Write JSON file with formatting
 * @param {string} filePath - Target file path
 * @param {*} data - Data to serialize
 * @param {number} indent - JSON indent spaces
 */
export function safeWriteJson(filePath, data, indent = 2) {
  safeWriteFile(filePath, JSON.stringify(data, null, indent) + '\n');
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
