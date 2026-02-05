/**
 * Constitution Validator
 *
 * Validates constitution YAML files against the JSON Schema.
 * Used by the enforcement hook and CLI commands.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load the constitution schema
 * @returns {object} JSON Schema object
 */
export function loadSchema() {
  const schemaPath = join(__dirname, '..', '..', 'templates', 'constitution.schema.json');

  if (!existsSync(schemaPath)) {
    throw new Error(`Constitution schema not found at: ${schemaPath}`);
  }

  try {
    const content = readFileSync(schemaPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse constitution schema: ${err.message}`);
  }
}

/**
 * Parse YAML content to JavaScript object
 * Simple YAML parser for constitution files (no external dependency)
 * @param {string} yamlContent - YAML content string
 * @returns {object} Parsed object
 */
export function parseYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = {};
  const stack = [{ indent: -1, obj: result }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.search(/\S/);
    const content = line.trim();

    // Pop stack for dedented lines
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    // Handle array items
    if (content.startsWith('- ')) {
      const itemContent = content.slice(2);

      // Find the array key from previous line context
      const arrayKey = stack[stack.length - 1].arrayKey;
      if (arrayKey && Array.isArray(parent[arrayKey])) {
        // Check if this is a key-value item
        if (itemContent.includes(': ')) {
          const obj = {};
          const [key, ...valueParts] = itemContent.split(': ');
          const value = valueParts.join(': ');
          obj[key.trim()] = parseValue(value);
          parent[arrayKey].push(obj);
          stack.push({ indent, obj, arrayKey: null });
        } else {
          parent[arrayKey].push(parseValue(itemContent));
        }
      }
      continue;
    }

    // Handle key-value pairs
    if (content.includes(': ')) {
      const colonIndex = content.indexOf(': ');
      const key = content.slice(0, colonIndex).trim();
      const value = content.slice(colonIndex + 2).trim();

      if (value === '' || value === '|' || value === '>') {
        // Object or array start
        parent[key] = {};
        stack.push({ indent, obj: parent[key], arrayKey: null });
      } else if (value === '[]') {
        parent[key] = [];
      } else {
        parent[key] = parseValue(value);
      }
    } else if (content.endsWith(':')) {
      // Key with nested content
      const key = content.slice(0, -1).trim();

      // Check if next line starts with '-' (array)
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith('- ')) {
        parent[key] = [];
        stack.push({ indent, obj: parent, arrayKey: key });
      } else {
        parent[key] = {};
        stack.push({ indent, obj: parent[key], arrayKey: null });
      }
    }
  }

  return result;
}

/**
 * Parse a YAML value to appropriate JavaScript type
 * @param {string} value - String value to parse
 * @returns {*} Parsed value
 */
function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;

  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Handle arrays in bracket notation
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(item => parseValue(item.trim()));
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * Validate constitution object against schema
 * @param {object} constitution - Parsed constitution object
 * @param {object} schema - JSON Schema (optional, loads default if not provided)
 * @returns {object} Validation result {valid: boolean, errors: string[]}
 */
export function validateConstitution(constitution, schema = null) {
  const errors = [];

  if (!schema) {
    try {
      schema = loadSchema();
    } catch (err) {
      return { valid: false, errors: [err.message] };
    }
  }

  // Required fields
  if (!constitution.version) {
    errors.push('Missing required field: version');
  } else if (!/^\d+\.\d+\.\d+$/.test(constitution.version)) {
    errors.push('version must be semantic version format (e.g., 1.0.0)');
  }

  if (!constitution.project_name) {
    errors.push('Missing required field: project_name');
  }

  if (!constitution.sections) {
    errors.push('Missing required field: sections');
  } else {
    // Validate each section
    for (const [sectionName, section] of Object.entries(constitution.sections)) {
      const sectionErrors = validateSection(sectionName, section);
      errors.push(...sectionErrors);
    }
  }

  // Validate enforcement config
  if (constitution.enforcement) {
    if (constitution.enforcement.sampling_rate !== undefined) {
      const rate = constitution.enforcement.sampling_rate;
      if (typeof rate !== 'number' || rate < 0 || rate > 1) {
        errors.push('enforcement.sampling_rate must be a number between 0 and 1');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single section
 * @param {string} name - Section name
 * @param {object} section - Section object
 * @returns {string[]} Array of error messages
 */
function validateSection(name, section) {
  const errors = [];

  if (!section.title) {
    errors.push(`Section '${name}': missing required field 'title'`);
  }

  if (!section.rules) {
    errors.push(`Section '${name}': missing required field 'rules'`);
  } else if (!Array.isArray(section.rules)) {
    errors.push(`Section '${name}': rules must be an array`);
  } else {
    // Validate each rule
    section.rules.forEach((rule, index) => {
      const ruleErrors = validateRule(name, rule, index);
      errors.push(...ruleErrors);
    });
  }

  return errors;
}

/**
 * Validate a single rule
 * @param {string} sectionName - Parent section name
 * @param {object} rule - Rule object
 * @param {number} index - Rule index
 * @returns {string[]} Array of error messages
 */
function validateRule(sectionName, rule, index) {
  const errors = [];
  const prefix = `Section '${sectionName}', rule ${index}`;

  if (!rule.id) {
    errors.push(`${prefix}: missing required field 'id'`);
  } else if (!/^[A-Z]{2,4}-\d{3}$/.test(rule.id)) {
    errors.push(`${prefix}: id '${rule.id}' must match pattern XX-NNN (e.g., CS-001)`);
  }

  if (!rule.description) {
    errors.push(`${prefix}: missing required field 'description'`);
  } else if (rule.description.length > 200) {
    errors.push(`${prefix}: description exceeds 200 character limit`);
  }

  if (rule.severity && !['error', 'warning', 'info'].includes(rule.severity)) {
    errors.push(`${prefix}: severity must be 'error', 'warning', or 'info'`);
  }

  if (rule.domains) {
    const validDomains = ['frontend', 'backend', 'testing', 'deployment', 'all'];
    rule.domains.forEach((domain) => {
      if (!validDomains.includes(domain)) {
        errors.push(`${prefix}: invalid domain '${domain}'`);
      }
    });
  }

  return errors;
}

/**
 * Load and validate a constitution file
 * @param {string} filePath - Path to constitution YAML file
 * @returns {object} {valid: boolean, errors: string[], constitution: object|null}
 */
export function loadAndValidateConstitution(filePath) {
  if (!existsSync(filePath)) {
    return {
      valid: false,
      errors: [`Constitution file not found: ${filePath}`],
      constitution: null,
    };
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const constitution = parseYaml(content);
    const validation = validateConstitution(constitution);

    return {
      valid: validation.valid,
      errors: validation.errors,
      constitution: validation.valid ? constitution : null,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to parse constitution: ${err.message}`],
      constitution: null,
    };
  }
}

/**
 * Get rules for a specific domain
 * @param {object} constitution - Validated constitution object
 * @param {string} domain - Domain to filter by (e.g., 'frontend', 'backend')
 * @returns {object[]} Array of applicable rules
 */
export function getRulesForDomain(constitution, domain) {
  const rules = [];

  if (!constitution?.sections) {
    return rules;
  }

  for (const section of Object.values(constitution.sections)) {
    if (!section.enabled) continue;
    if (!section.rules) continue;

    for (const rule of section.rules) {
      if (!rule.enabled) continue;

      // Check if rule applies to this domain
      const domains = rule.domains || ['all'];
      if (domains.includes('all') || domains.includes(domain)) {
        rules.push(rule);
      }
    }
  }

  return rules;
}

/**
 * Get rules matching a file pattern
 * @param {object} constitution - Validated constitution object
 * @param {string} filePath - File path to match
 * @returns {object[]} Array of applicable rules
 */
export function getRulesForFile(constitution, filePath) {
  const rules = [];

  if (!constitution?.sections) {
    return rules;
  }

  for (const section of Object.values(constitution.sections)) {
    if (!section.enabled) continue;
    if (!section.rules) continue;

    for (const rule of section.rules) {
      if (!rule.enabled) continue;

      // If no file patterns specified, rule applies to all files
      if (!rule.file_patterns || rule.file_patterns.length === 0) {
        rules.push(rule);
        continue;
      }

      // Check if file matches any pattern
      for (const pattern of rule.file_patterns) {
        if (matchGlobPattern(filePath, pattern)) {
          rules.push(rule);
          break;
        }
      }
    }
  }

  return rules;
}

/**
 * Simple glob pattern matching
 * @param {string} path - File path to test
 * @param {string} pattern - Glob pattern
 * @returns {boolean} Whether path matches pattern
 */
function matchGlobPattern(path, pattern) {
  // Convert glob to regex
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');

  return new RegExp(`^${regex}$`).test(path) ||
         new RegExp(regex).test(path);
}

export default {
  loadSchema,
  parseYaml,
  validateConstitution,
  loadAndValidateConstitution,
  getRulesForDomain,
  getRulesForFile,
};
