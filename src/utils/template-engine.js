/**
 * Template Engine
 *
 * Handles placeholder replacement in .claude files using tech-stack.json values.
 * Supports:
 * - Nested property access: {{frontend.port}}, {{deployment.backend.platform}}
 * - Conditional blocks: {{#if condition}}...{{/if}}
 * - Equality checks: {{#if (eq path "value")}}...{{/if}}
 * - Else blocks: {{#if condition}}...{{else}}...{{/if}}
 * - Each loops: {{#each array}}{{this}}{{/each}}
 * - Path variables: ${CWD}, ${HOME}
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { homedir } from 'os';

/**
 * Load agent registry and create template-friendly context
 * @param {string} projectRoot - Project root directory
 * @returns {object} Agent context for templates
 */
export function loadAgentContext(projectRoot = process.cwd()) {
  const registryPath = join(projectRoot, '.claude', 'config', 'agents.json');

  // Default context when no registry exists
  const defaultContext = {
    available: false,
    agents: [],
    byDomain: {},
    bestMatch: null,
    count: 0,
  };

  if (!existsSync(registryPath)) {
    return defaultContext;
  }

  try {
    const content = readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content);

    if (!registry.agents || registry.agents.length === 0) {
      return defaultContext;
    }

    // Build domain-indexed agents
    const byDomain = {};
    for (const agent of registry.agents) {
      if (!byDomain[agent.domain]) {
        byDomain[agent.domain] = [];
      }
      byDomain[agent.domain].push(agent);
    }

    return {
      available: true,
      agents: registry.agents,
      byDomain,
      frontend: byDomain.frontend?.[0] || null,
      backend: byDomain.backend?.[0] || null,
      state: byDomain.state?.[0] || null,
      database: byDomain.database?.[0] || null,
      testing: byDomain.testing?.[0] || null,
      deployment: byDomain.deployment?.[0] || null,
      bestMatch: null, // Set dynamically based on task
      count: registry.agents.length,
      delegationRules: registry.delegationRules || {},
      techStack: registry.techStack || {},
    };
  } catch {
    return defaultContext;
  }
}

/**
 * Find best agent for a given prompt using keyword matching
 * @param {object} agentContext - Agent context from loadAgentContext
 * @param {string} prompt - User prompt to analyze
 * @param {string[]} files - Optional file paths for context
 * @returns {object|null} Best matching agent or null
 */
export function findBestAgent(agentContext, prompt, files = []) {
  if (!agentContext.available || !agentContext.delegationRules) {
    return null;
  }

  const promptLower = prompt.toLowerCase();
  const domainScores = {};

  // Score based on keywords
  const keywords = agentContext.delegationRules.keywords || {};
  for (const [keyword, domain] of Object.entries(keywords)) {
    if (promptLower.includes(keyword.toLowerCase())) {
      domainScores[domain] = (domainScores[domain] || 0) + 1;
    }
  }

  // Score based on file patterns
  const filePatterns = agentContext.delegationRules.filePatterns || {};
  for (const [domain, patterns] of Object.entries(filePatterns)) {
    for (const file of files) {
      for (const pattern of patterns) {
        if (matchGlobPattern(file, pattern)) {
          domainScores[domain] = (domainScores[domain] || 0) + 2;
        }
      }
    }
  }

  // Find highest scoring domain
  let bestDomain = null;
  let bestScore = 0;
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Return first agent for best domain
  if (bestDomain && agentContext.byDomain[bestDomain]) {
    const agent = agentContext.byDomain[bestDomain][0];
    return {
      ...agent,
      confidence: Math.min(100, bestScore * 20), // 0-100 confidence score
      matchedDomain: bestDomain,
    };
  }

  return null;
}

/**
 * Simple glob pattern matching for file paths
 * @param {string} path - File path to test
 * @param {string} pattern - Glob pattern (supports * and **)
 * @returns {boolean} Whether path matches pattern
 */
function matchGlobPattern(path, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Merge agent context into tech stack values for template processing
 * @param {object} values - Tech stack values
 * @param {object} agentContext - Agent context from loadAgentContext
 * @returns {object} Merged values with agents namespace
 */
export function mergeAgentContext(values, agentContext) {
  return {
    ...values,
    agents: agentContext,
  };
}

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
 * Evaluate a condition expression
 * @param {string} condition - The condition to evaluate
 * @param {object} values - Tech stack values
 * @returns {boolean} Whether the condition is truthy
 */
function evaluateCondition(condition, values) {
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
function processEachBlocks(content, values) {
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
function processConditionalBlocks(content, values) {
  // Process from innermost to outermost to handle nested conditionals
  let result = content;
  let previousResult;

  // Keep processing until no more changes (handles nested blocks)
  do {
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
function processPathVariables(content) {
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

export {
  evaluateCondition,
  processConditionalBlocks,
  processEachBlocks,
  processPathVariables,
};

export default {
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,
  flattenObject,
  extractPlaceholders,
  validateTechStack,
  evaluateCondition,
  processConditionalBlocks,
  processEachBlocks,
  processPathVariables,
  loadAgentContext,
  findBestAgent,
  mergeAgentContext,
};
