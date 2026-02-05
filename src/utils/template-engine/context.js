/**
 * Agent context building and variable resolution
 *
 * Handles loading agent registries, finding best agents for tasks,
 * and merging contexts for template processing.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
export function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
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
