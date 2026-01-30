/**
 * Template Engine
 *
 * Handles placeholder replacement in .claude files using tech-stack.json values.
 * Supports nested property access: {{frontend.port}}, {{deployment.backend.platform}}
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

/**
 * Get nested property from object using dot notation
 * @param {object} obj - The object to search
 * @param {string} path - Dot-notated path (e.g., "frontend.port")
 * @returns {*} The value or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Replace all placeholders in a string
 * @param {string} content - Content with {{placeholder}} patterns
 * @param {object} values - Tech stack values object
 * @param {object} options - Options for replacement
 * @returns {string} Content with placeholders replaced
 */
export function replacePlaceholders(content, values, options = {}) {
  const { preserveUnknown = false, warnOnMissing = true } = options;
  const warnings = [];

  // Match {{path.to.value}} patterns
  const result = content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(values, trimmedPath);

    if (value === undefined || value === null || value === '') {
      if (warnOnMissing) {
        warnings.push(`Missing value for: ${trimmedPath}`);
      }
      return preserveUnknown ? match : `{{${trimmedPath}}}`; // Keep placeholder
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  });

  return { content: result, warnings };
}

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

/**
 * Generate a tech-stack.json from detected values
 * @param {object} detected - Detected tech stack
 * @param {object} userOverrides - User-provided overrides
 * @returns {object} Merged tech stack
 */
export function generateTechStack(detected, userOverrides = {}) {
  // Deep merge function
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined && source[key] !== null) {
        result[key] = source[key];
      }
    }
    return result;
  }

  return deepMerge(detected, userOverrides);
}

/**
 * Flatten nested object to dot-notation keys
 * @param {object} obj - Object to flatten
 * @param {string} prefix - Current key prefix
 * @returns {object} Flattened object
 */
export function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Get all unique placeholders from content
 * @param {string} content - Content to scan
 * @returns {string[]} Array of placeholder paths
 */
export function extractPlaceholders(content) {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  const placeholders = matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim());
  return [...new Set(placeholders)];
}

/**
 * Validate a tech-stack.json against required placeholders
 * @param {object} techStack - Tech stack values
 * @param {string[]} requiredPlaceholders - Required placeholder paths
 * @returns {object} Validation result
 */
export function validateTechStack(techStack, requiredPlaceholders) {
  const missing = [];
  const present = [];

  for (const placeholder of requiredPlaceholders) {
    const value = getNestedValue(techStack, placeholder);
    if (value === undefined || value === null || value === '') {
      missing.push(placeholder);
    } else {
      present.push(placeholder);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    present,
    coverage: present.length / requiredPlaceholders.length,
  };
}

export default {
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,
  flattenObject,
  extractPlaceholders,
  validateTechStack,
};
