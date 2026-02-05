/**
 * Template processing, placeholder replacement, conditionals
 *
 * Handles template syntax including:
 * - {{placeholders}}
 * - {{#if condition}}...{{/if}}
 * - {{#each array}}...{{/each}}
 * - (eq path "value") comparisons
 */

import { homedir } from 'os';
import { join } from 'path';
import { getNestedValue } from './context.js';

// Maximum template processing iterations to prevent infinite loops
const MAX_TEMPLATE_ITERATIONS = 100;

/**
 * Evaluate a condition expression
 * @param {string} condition - The condition to evaluate
 * @param {object} values - Tech stack values
 * @returns {boolean} Whether the condition is truthy
 */
export function evaluateCondition(condition, values) {
  const trimmed = condition.trim();

  // Handle (eq path "value") syntax
  const eqMatch = trimmed.match(/^\(eq\s+([^\s]+)\s+["']([^"']+)["']\)$/);
  if (eqMatch) {
    const [, path, expected] = eqMatch;
    const actual = getNestedValue(values, path);
    return actual === expected;
  }

  // Handle (neq path "value") syntax
  const neqMatch = trimmed.match(/^\(neq\s+([^\s]+)\s+["']([^"']+)["']\)$/);
  if (neqMatch) {
    const [, path, expected] = neqMatch;
    const actual = getNestedValue(values, path);
    return actual !== expected;
  }

  // Handle (not path) syntax
  const notMatch = trimmed.match(/^\(not\s+([^\s]+)\)$/);
  if (notMatch) {
    const [, path] = notMatch;
    const value = getNestedValue(values, path);
    return !value;
  }

  // Handle (and condition1 condition2) syntax
  const andMatch = trimmed.match(/^\(and\s+(.+)\s+(.+)\)$/);
  if (andMatch) {
    const [, cond1, cond2] = andMatch;
    return evaluateCondition(cond1, values) && evaluateCondition(cond2, values);
  }

  // Handle (or condition1 condition2) syntax
  const orMatch = trimmed.match(/^\(or\s+(.+)\s+(.+)\)$/);
  if (orMatch) {
    const [, cond1, cond2] = orMatch;
    return evaluateCondition(cond1, values) || evaluateCondition(cond2, values);
  }

  // Simple path - check if value is truthy
  const value = getNestedValue(values, trimmed);
  return !!value && value !== 'none' && value !== '';
}

/**
 * Process {{#each array}}...{{/each}} blocks
 * @param {string} content - Content with each blocks
 * @param {object} values - Tech stack values
 * @returns {string} Processed content
 */
export function processEachBlocks(content, values) {
  // Match {{#each path}}content{{/each}}
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return content.replace(eachRegex, (match, path, innerContent) => {
    const array = getNestedValue(values, path.trim());

    if (!Array.isArray(array) || array.length === 0) {
      return '';
    }

    return array
      .map((item, index) => {
        let result = innerContent;
        // Replace {{this}} with current item
        result = result.replace(/\{\{this\}\}/g, String(item));
        // Replace {{@index}} with current index
        result = result.replace(/\{\{@index\}\}/g, String(index));
        // Replace {{@first}} with boolean
        result = result.replace(/\{\{@first\}\}/g, String(index === 0));
        // Replace {{@last}} with boolean
        result = result.replace(/\{\{@last\}\}/g, String(index === array.length - 1));
        return result;
      })
      .join('');
  });
}

/**
 * Process {{#if condition}}...{{else}}...{{/if}} blocks
 * @param {string} content - Content with conditional blocks
 * @param {object} values - Tech stack values
 * @returns {string} Processed content
 */
export function processConditionalBlocks(content, values) {
  // Process from innermost to outermost to handle nested conditionals
  let result = content;
  let previousResult;
  let iterations = 0;

  // Keep processing until no more changes (handles nested blocks)
  do {
    if (++iterations > MAX_TEMPLATE_ITERATIONS) {
      throw new Error(
        `Template processing exceeded ${MAX_TEMPLATE_ITERATIONS} iterations - possible infinite loop in template`
      );
    }

    previousResult = result;

    // Match {{#if condition}}...{{else}}...{{/if}} or {{#if condition}}...{{/if}}
    // Non-greedy match for innermost blocks first
    const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    const ifOnlyRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    // First handle if-else blocks
    result = result.replace(ifElseRegex, (match, condition, ifContent, elseContent) => {
      const isTruthy = evaluateCondition(condition, values);
      return isTruthy ? ifContent : elseContent;
    });

    // Then handle if-only blocks (no else)
    result = result.replace(ifOnlyRegex, (match, condition, ifContent) => {
      const isTruthy = evaluateCondition(condition, values);
      return isTruthy ? ifContent : '';
    });
  } while (result !== previousResult);

  return result;
}

/**
 * Process path variables like ${CWD} and ${HOME}
 * @param {string} content - Content with path variables
 * @returns {string} Content with paths resolved
 */
export function processPathVariables(content) {
  return content
    .replace(/\$\{CWD\}/g, process.cwd())
    .replace(/\$\{HOME\}/g, homedir())
    .replace(/\$\{CLAUDE_DIR\}/g, join(process.cwd(), '.claude'));
}

/**
 * Replace all placeholders in a string
 * @param {string} content - Content with {{placeholder}} patterns
 * @param {object} values - Tech stack values object
 * @param {object} options - Options for replacement
 * @returns {string} Content with placeholders replaced
 */
export function replacePlaceholders(content, values, options = {}) {
  const { preserveUnknown = false, warnOnMissing = true, processConditionals = true } = options;
  const warnings = [];

  let result = content;

  // Step 1: Process path variables (${CWD}, ${HOME}, etc.)
  result = processPathVariables(result);

  // Step 2: Process {{#each}} blocks
  result = processEachBlocks(result, values);

  // Step 3: Process {{#if}}...{{/if}} conditional blocks
  if (processConditionals) {
    result = processConditionalBlocks(result, values);
  }

  // Step 4: Replace simple {{path.to.value}} placeholders
  result = result.replace(/\{\{([^#/][^}]*)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Skip special syntax that wasn't processed
    if (trimmedPath.startsWith('#') || trimmedPath.startsWith('/') || trimmedPath.startsWith('@')) {
      return match;
    }

    const value = getNestedValue(values, trimmedPath);

    if (value === undefined || value === null || value === '') {
      if (warnOnMissing && !trimmedPath.includes('PLACEHOLDER')) {
        warnings.push(`Missing value for: ${trimmedPath}`);
      }
      return preserveUnknown ? match : `{{${trimmedPath}}}`; // Keep placeholder
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle objects - return JSON
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  });

  return { content: result, warnings };
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
