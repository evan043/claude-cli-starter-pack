/**
 * Agent Registry Manager
 *
 * Centralized management of tech stack-specific agents.
 * Loads, validates, and provides access to agents.json.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { validateAgentSchema, validateAgentsJson } from './schema.js';
import { getDefaultAgentsForStack } from './stack-mapping.js';

/**
 * Default agents.json structure
 */
const DEFAULT_REGISTRY = {
  version: '1.0',
  generated: null,
  techStack: {},
  agents: [],
  delegationRules: {
    keywords: {},
    filePatterns: {},
  },
};

/**
 * Get the path to agents.json
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to agents.json
 */
export function getRegistryPath(projectRoot = process.cwd()) {
  return join(projectRoot, '.claude', 'config', 'agents.json');
}

/**
 * Load the agent registry from agents.json
 * @param {string} projectRoot - Project root directory
 * @returns {object|null} Agent registry or null if not found
 */
export function loadAgentRegistry(projectRoot = process.cwd()) {
  const registryPath = getRegistryPath(projectRoot);

  if (!existsSync(registryPath)) {
    return null;
  }

  try {
    const content = readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content);

    // Validate the registry
    const validation = validateAgentsJson(registry);
    if (!validation.valid) {
      console.warn(`Warning: agents.json validation failed: ${validation.errors.join(', ')}`);
    }

    return registry;
  } catch (err) {
    console.error(`Error loading agents.json: ${err.message}`);
    return null;
  }
}

/**
 * Save the agent registry to agents.json
 * @param {object} registry - Agent registry object
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to saved file
 */
export function saveAgentRegistry(registry, projectRoot = process.cwd()) {
  const registryPath = getRegistryPath(projectRoot);
  const dir = dirname(registryPath);

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Update generated timestamp
  registry.generated = new Date().toISOString();

  // Validate before saving
  const validation = validateAgentsJson(registry);
  if (!validation.valid) {
    throw new Error(`Invalid registry: ${validation.errors.join(', ')}`);
  }

  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  return registryPath;
}

/**
 * Create a new agent registry from tech stack
 * @param {object} techStack - Detected tech stack from tech-stack.json
 * @returns {object} New agent registry
 */
export function createRegistryFromTechStack(techStack) {
  const registry = {
    ...DEFAULT_REGISTRY,
    generated: new Date().toISOString(),
    techStack: {
      frontend: techStack.frontend?.framework || null,
      stateManager: techStack.frontend?.stateManager || null,
      backend: techStack.backend?.framework || null,
      backendLanguage: techStack.backend?.language || null,
      database: techStack.database?.primary || null,
      orm: techStack.database?.orm || null,
      testing: techStack.testing?.e2e?.framework || null,
      unitTesting: techStack.testing?.unit?.framework || null,
      deployment: {
        frontend: techStack.deployment?.frontend?.platform || null,
        backend: techStack.deployment?.backend?.platform || null,
      },
    },
    agents: [],
    delegationRules: {
      keywords: {
        // Frontend keywords
        component: 'frontend',
        hook: 'frontend',
        style: 'frontend',
        css: 'frontend',
        tailwind: 'frontend',
        jsx: 'frontend',
        tsx: 'frontend',
        // Backend keywords
        api: 'backend',
        endpoint: 'backend',
        route: 'backend',
        middleware: 'backend',
        auth: 'backend',
        // State keywords
        store: 'state',
        state: 'state',
        action: 'state',
        reducer: 'state',
        slice: 'state',
        // Database keywords
        database: 'database',
        query: 'database',
        migration: 'database',
        schema: 'database',
        model: 'database',
        // Testing keywords
        test: 'testing',
        e2e: 'testing',
        spec: 'testing',
        fixture: 'testing',
        // Deployment keywords
        deploy: 'deployment',
        build: 'deployment',
        docker: 'deployment',
        ci: 'deployment',
      },
      filePatterns: {
        frontend: ['src/components/**', 'src/pages/**', 'src/hooks/**', '*.tsx', '*.jsx', '*.vue', '*.svelte'],
        backend: ['api/**', 'server/**', 'backend/**', 'routes/**', '*.py'],
        state: ['src/store/**', 'src/stores/**', 'src/state/**'],
        database: ['prisma/**', 'migrations/**', 'models/**', 'schema/**'],
        testing: ['tests/**', 'e2e/**', '**/*.test.*', '**/*.spec.*'],
        deployment: ['Dockerfile', 'docker-compose.*', 'wrangler.toml', 'railway.json', '.github/workflows/**'],
      },
    },
  };

  // Generate agents based on detected tech stack
  const defaultAgents = getDefaultAgentsForStack(techStack);
  registry.agents = defaultAgents;

  return registry;
}

/**
 * Get an agent by name
 * @param {object} registry - Agent registry
 * @param {string} name - Agent name
 * @returns {object|null} Agent definition or null
 */
export function getAgentByName(registry, name) {
  if (!registry || !registry.agents) {
    return null;
  }
  return registry.agents.find((a) => a.name === name) || null;
}

/**
 * Get all agents for a specific domain
 * @param {object} registry - Agent registry
 * @param {string} domain - Domain (frontend, backend, state, database, testing, deployment)
 * @returns {Array} Array of agents for the domain
 */
export function getAgentsByDomain(registry, domain) {
  if (!registry || !registry.agents) {
    return [];
  }
  return registry.agents.filter((a) => a.domain === domain);
}

/**
 * Get the best agent for a task based on keywords and file patterns
 * @param {object} registry - Agent registry
 * @param {string} prompt - User prompt
 * @param {string[]} files - Files being worked on
 * @returns {object|null} Best matching agent or null
 */
export function getBestAgentForTask(registry, prompt, files = []) {
  if (!registry || !registry.agents || registry.agents.length === 0) {
    return null;
  }

  const promptLower = prompt.toLowerCase();
  const domainScores = {};

  // Score based on keywords
  if (registry.delegationRules?.keywords) {
    for (const [keyword, domain] of Object.entries(registry.delegationRules.keywords)) {
      if (promptLower.includes(keyword.toLowerCase())) {
        domainScores[domain] = (domainScores[domain] || 0) + 1;
      }
    }
  }

  // Score based on file patterns
  if (registry.delegationRules?.filePatterns && files.length > 0) {
    for (const [domain, patterns] of Object.entries(registry.delegationRules.filePatterns)) {
      for (const file of files) {
        for (const pattern of patterns) {
          if (matchesPattern(file, pattern)) {
            domainScores[domain] = (domainScores[domain] || 0) + 2; // File patterns weighted higher
          }
        }
      }
    }
  }

  // Find the highest scoring domain
  let bestDomain = null;
  let bestScore = 0;
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Return the first agent for the best domain
  if (bestDomain) {
    const domainAgents = getAgentsByDomain(registry, bestDomain);
    if (domainAgents.length > 0) {
      return domainAgents[0];
    }
  }

  // Fallback to general-purpose if no match
  return null;
}

/**
 * Simple glob pattern matching
 * @param {string} path - File path
 * @param {string} pattern - Glob pattern
 * @returns {boolean} Whether path matches pattern
 */
function matchesPattern(path, pattern) {
  // Simple pattern matching - supports * and **
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Add an agent to the registry
 * @param {object} registry - Agent registry
 * @param {object} agent - Agent definition
 * @returns {object} Updated registry
 */
export function addAgent(registry, agent) {
  // Validate the agent
  const validation = validateAgentSchema(agent);
  if (!validation.valid) {
    throw new Error(`Invalid agent: ${validation.errors.join(', ')}`);
  }

  // Check for duplicate
  const existing = registry.agents.findIndex((a) => a.name === agent.name);
  if (existing >= 0) {
    registry.agents[existing] = agent; // Update existing
  } else {
    registry.agents.push(agent);
  }

  return registry;
}

/**
 * Remove an agent from the registry
 * @param {object} registry - Agent registry
 * @param {string} name - Agent name to remove
 * @returns {object} Updated registry
 */
export function removeAgent(registry, name) {
  registry.agents = registry.agents.filter((a) => a.name !== name);
  return registry;
}

/**
 * Get a summary of the registry
 * @param {object} registry - Agent registry
 * @returns {object} Summary with counts by domain
 */
export function getRegistrySummary(registry) {
  if (!registry || !registry.agents) {
    return { total: 0, byDomain: {} };
  }

  const byDomain = {};
  for (const agent of registry.agents) {
    byDomain[agent.domain] = (byDomain[agent.domain] || 0) + 1;
  }

  return {
    total: registry.agents.length,
    byDomain,
    techStack: registry.techStack,
    generated: registry.generated,
  };
}

/**
 * Check if registry exists
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} Whether registry exists
 */
export function hasAgentRegistry(projectRoot = process.cwd()) {
  return existsSync(getRegistryPath(projectRoot));
}
