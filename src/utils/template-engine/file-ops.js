/**
 * File reading/writing for templates
 *
 * Handles processing template files and directories with
 * placeholder replacement and validation.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { replacePlaceholders } from './processor.js';

/**
 * Process a single file
 * @param {string} filePath - Path to the file
 * @param {object} values - Tech stack values
 * @param {object} options - Processing options
 * @returns {object} Result with stats
 */
export function processFile(filePath, values, options = {}) {
  const { dryRun = false, verbose = false } = options;

  const originalContent = readFileSync(filePath, 'utf8');
  const { content: newContent, warnings } = replacePlaceholders(originalContent, values, options);

  const placeholderCount = (originalContent.match(/\{\{[^}]+\}\}/g) || []).length;
  const replacedCount = placeholderCount - (newContent.match(/\{\{[^}]+\}\}/g) || []).length;

  const result = {
    file: filePath,
    placeholders: placeholderCount,
    replaced: replacedCount,
    remaining: placeholderCount - replacedCount,
    warnings,
    changed: originalContent !== newContent,
  };

  if (!dryRun && result.changed) {
    // Ensure parent directory exists before writing
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, newContent, 'utf8');
  }

  return result;
}

/**
 * Process all template files in a directory
 * @param {string} dirPath - Directory path
 * @param {object} values - Tech stack values
 * @param {object} options - Processing options
 * @returns {object[]} Array of results
 */
export function processDirectory(dirPath, values, options = {}) {
  const {
    extensions = ['.md', '.json', '.js', '.ts', '.yml', '.yaml'],
    recursive = true,
    exclude = ['node_modules', '.git', 'dist', 'build'],
  } = options;

  const results = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip excluded directories
      if (exclude.includes(entry)) continue;

      const stat = statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (extensions.includes(ext)) {
          results.push(processFile(fullPath, values, options));
        }
      }
    }
  }

  walkDir(dirPath);
  return results;
}
