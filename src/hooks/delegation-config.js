/**
 * Delegation Configuration Manager
 *
 * Manages the configuration for task-to-agent delegation routing.
 * Used by delegation hooks to route tasks to appropriate specialists.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Default delegation configuration
 */
const DEFAULT_DELEGATION_CONFIG = {
  version: '1.0',
  generated: null,
  enabled: true,
  mode: 'suggest', // 'suggest' | 'auto' | 'enforce'
  domains: {
    frontend: {
      keywords: [
        'component',
        'hook',
        'style',
        'css',
        'tailwind',
        'jsx',
        'tsx',
        'ui',
        'layout',
        'page',
        'view',
        'render',
        'responsive',
        'animation',
      ],
      filePatterns: [
        'src/components/**',
        'src/pages/**',
        'src/views/**',
        'src/hooks/**',
        'src/layouts/**',
        '*.tsx',
        '*.jsx',
        '*.vue',
        '*.svelte',
      ],
      priority: 1,
    },
    backend: {
      keywords: [
        'api',
        'endpoint',
        'route',
        'middleware',
        'auth',
        'authentication',
        'authorization',
        'controller',
        'service',
        'handler',
        'request',
        'response',
        'server',
      ],
      filePatterns: ['api/**', 'server/**', 'backend/**', 'routes/**', 'controllers/**', 'services/**', '*.py'],
      priority: 1,
    },
    state: {
      keywords: ['store', 'state', 'action', 'reducer', 'slice', 'atom', 'selector', 'dispatch', 'zustand', 'redux', 'pinia'],
      filePatterns: ['src/store/**', 'src/stores/**', 'src/state/**', '**/*.store.ts', '**/*Slice.ts'],
      priority: 2,
    },
    database: {
      keywords: [
        'database',
        'query',
        'migration',
        'schema',
        'model',
        'table',
        'column',
        'index',
        'relation',
        'orm',
        'prisma',
        'sql',
      ],
      filePatterns: ['prisma/**', 'migrations/**', 'models/**', 'schema/**', 'db/**', '*.sql'],
      priority: 2,
    },
    testing: {
      keywords: ['test', 'e2e', 'spec', 'fixture', 'mock', 'stub', 'assert', 'expect', 'playwright', 'vitest', 'jest', 'pytest'],
      filePatterns: ['tests/**', 'e2e/**', '__tests__/**', '**/*.test.*', '**/*.spec.*'],
      priority: 3,
    },
    deployment: {
      keywords: ['deploy', 'build', 'docker', 'ci', 'cd', 'pipeline', 'release', 'railway', 'cloudflare', 'vercel', 'production'],
      filePatterns: ['Dockerfile', 'docker-compose.*', 'wrangler.toml', 'railway.json', '.github/workflows/**', 'vercel.json'],
      priority: 3,
    },
  },
  routing: {
    // Maps detected domain to agent name pattern
    agentPatterns: {
      frontend: '{framework}-frontend-specialist',
      backend: '{framework}-backend-specialist',
      state: '{framework}-state-specialist',
      database: '{type}-{framework}-specialist',
      testing: '{framework}-testing-specialist',
      deployment: '{platform}-deployment-specialist',
    },
    // Fallback agents when no specific framework agent exists
    fallbacks: {
      frontend: 'general-frontend-specialist',
      backend: 'general-backend-specialist',
      state: 'general-state-specialist',
      database: 'general-database-specialist',
      testing: 'general-testing-specialist',
      deployment: 'general-deployment-specialist',
    },
  },
  agentOnlyMode: {
    enabled: false,
    // Tools that should trigger delegation in agent-only mode
    restrictedTools: ['Edit', 'Write', 'Bash'],
    // Exempt patterns (e.g., git commands, running tests)
    exemptPatterns: ['^git ', '^npm test', '^npm run test', '^pytest', '^npx playwright'],
  },
};

/**
 * Get the path to delegation.json
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to delegation.json
 */
export function getDelegationConfigPath(projectRoot = process.cwd()) {
  return join(projectRoot, '.claude', 'config', 'delegation.json');
}

/**
 * Load the delegation configuration
 * @param {string} projectRoot - Project root directory
 * @returns {object} Delegation configuration
 */
export function loadDelegationConfig(projectRoot = process.cwd()) {
  const configPath = getDelegationConfigPath(projectRoot);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_DELEGATION_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_DELEGATION_CONFIG, ...config };
  } catch (err) {
    console.error(`Error loading delegation.json: ${err.message}`);
    return { ...DEFAULT_DELEGATION_CONFIG };
  }
}

/**
 * Save the delegation configuration
 * @param {object} config - Delegation configuration
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to saved file
 */
export function saveDelegationConfig(config, projectRoot = process.cwd()) {
  const configPath = getDelegationConfigPath(projectRoot);
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  config.generated = new Date().toISOString();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return configPath;
}

/**
 * Classify a task based on prompt and file context
 * @param {string} prompt - User prompt
 * @param {string[]} files - Files being worked on
 * @param {object} config - Delegation configuration
 * @returns {object} Classification result { domain, confidence, matches }
 */
export function classifyTask(prompt, files = [], config = null) {
  const delegationConfig = config || loadDelegationConfig();
  const promptLower = prompt.toLowerCase();
  const scores = {};
  const matches = {};

  // Score based on keywords
  for (const [domain, domainConfig] of Object.entries(delegationConfig.domains)) {
    scores[domain] = 0;
    matches[domain] = { keywords: [], files: [] };

    for (const keyword of domainConfig.keywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        scores[domain] += 1;
        matches[domain].keywords.push(keyword);
      }
    }
  }

  // Score based on file patterns
  for (const file of files) {
    for (const [domain, domainConfig] of Object.entries(delegationConfig.domains)) {
      for (const pattern of domainConfig.filePatterns) {
        if (matchesGlob(file, pattern)) {
          scores[domain] += 2; // File patterns weighted higher
          matches[domain].files.push(file);
        }
      }
    }
  }

  // Find best domain
  let bestDomain = null;
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Calculate confidence (0-1)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;

  return {
    domain: bestDomain,
    confidence,
    scores,
    matches: bestDomain ? matches[bestDomain] : null,
    allMatches: matches,
  };
}

/**
 * Get the recommended agent for a task
 * @param {string} prompt - User prompt
 * @param {string[]} files - Files being worked on
 * @param {object} techStack - Tech stack configuration
 * @param {object} config - Delegation configuration
 * @returns {object|null} Agent recommendation { name, domain, reason }
 */
export function getRecommendedAgent(prompt, files = [], techStack = {}, config = null) {
  const classification = classifyTask(prompt, files, config);

  if (!classification.domain || classification.confidence < 0.3) {
    return null;
  }

  const domain = classification.domain;
  const delegationConfig = config || loadDelegationConfig();

  // Determine the specific agent based on tech stack
  let agentName = delegationConfig.routing.fallbacks[domain];
  let framework = null;

  // Try to find specific framework agent
  if (domain === 'frontend' && techStack.frontend?.framework) {
    framework = techStack.frontend.framework.toLowerCase();
    agentName = `${framework}-frontend-specialist`;
  } else if (domain === 'backend' && techStack.backend?.framework) {
    framework = techStack.backend.framework.toLowerCase();
    agentName = `${framework}-backend-specialist`;
  } else if (domain === 'state' && techStack.frontend?.stateManager) {
    framework = techStack.frontend.stateManager.toLowerCase();
    agentName = `${framework}-state-specialist`;
  } else if (domain === 'database') {
    if (techStack.database?.orm) {
      framework = techStack.database.orm.toLowerCase();
      agentName = `${framework}-orm-specialist`;
    } else if (techStack.database?.primary) {
      framework = techStack.database.primary.toLowerCase();
      agentName = `${framework}-db-specialist`;
    }
  } else if (domain === 'testing') {
    if (techStack.testing?.e2e?.framework) {
      framework = techStack.testing.e2e.framework.toLowerCase();
      agentName = `${framework}-e2e-specialist`;
    } else if (techStack.testing?.unit?.framework) {
      framework = techStack.testing.unit.framework.toLowerCase();
      agentName = `${framework}-unit-specialist`;
    }
  } else if (domain === 'deployment') {
    if (techStack.deployment?.backend?.platform) {
      framework = techStack.deployment.backend.platform.toLowerCase();
      agentName = `${framework}-deployment-specialist`;
    } else if (techStack.deployment?.frontend?.platform) {
      framework = techStack.deployment.frontend.platform.toLowerCase();
      agentName = `${framework}-deployment-specialist`;
    }
  }

  return {
    name: agentName,
    domain,
    framework,
    confidence: classification.confidence,
    reason: buildReason(classification, domain),
  };
}

/**
 * Build a human-readable reason for the recommendation
 * @param {object} classification - Task classification
 * @param {string} domain - Detected domain
 * @returns {string} Reason string
 */
function buildReason(classification, domain) {
  const matches = classification.matches;
  if (!matches) return 'General task classification';

  const parts = [];

  if (matches.keywords.length > 0) {
    parts.push(`keywords: ${matches.keywords.slice(0, 3).join(', ')}`);
  }

  if (matches.files.length > 0) {
    parts.push(`files: ${matches.files.slice(0, 2).join(', ')}`);
  }

  return parts.length > 0 ? `Detected ${domain} domain based on ${parts.join('; ')}` : `Classified as ${domain} domain`;
}

/**
 * Simple glob pattern matching
 * @param {string} path - File path
 * @param {string} pattern - Glob pattern
 * @returns {boolean} Whether path matches pattern
 */
function matchesGlob(path, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(path) || new RegExp(`${regex}$`).test(path);
}

/**
 * Check if a tool should be delegated in agent-only mode
 * @param {string} tool - Tool name
 * @param {string} command - Command being executed (for Bash)
 * @param {object} config - Delegation configuration
 * @returns {boolean} Whether the tool should be delegated
 */
export function shouldDelegateInAgentOnlyMode(tool, command = '', config = null) {
  const delegationConfig = config || loadDelegationConfig();

  if (!delegationConfig.agentOnlyMode.enabled) {
    return false;
  }

  if (!delegationConfig.agentOnlyMode.restrictedTools.includes(tool)) {
    return false;
  }

  // Check for exempt patterns (e.g., git commands)
  if (tool === 'Bash' && command) {
    for (const pattern of delegationConfig.agentOnlyMode.exemptPatterns) {
      if (new RegExp(pattern).test(command)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create a delegation configuration from tech stack
 * @param {object} techStack - Tech stack configuration
 * @returns {object} Delegation configuration
 */
export function createDelegationConfigFromStack(techStack) {
  const config = { ...DEFAULT_DELEGATION_CONFIG };
  config.generated = new Date().toISOString();

  // Enhance keywords based on detected frameworks
  if (techStack.frontend?.framework) {
    const framework = techStack.frontend.framework.toLowerCase();
    config.domains.frontend.keywords.push(framework);
  }

  if (techStack.frontend?.stateManager) {
    const stateManager = techStack.frontend.stateManager.toLowerCase();
    config.domains.state.keywords.push(stateManager);
  }

  if (techStack.backend?.framework) {
    const framework = techStack.backend.framework.toLowerCase();
    config.domains.backend.keywords.push(framework);
  }

  if (techStack.database?.orm) {
    config.domains.database.keywords.push(techStack.database.orm.toLowerCase());
  }

  if (techStack.testing?.e2e?.framework) {
    config.domains.testing.keywords.push(techStack.testing.e2e.framework.toLowerCase());
  }

  if (techStack.testing?.unit?.framework) {
    config.domains.testing.keywords.push(techStack.testing.unit.framework.toLowerCase());
  }

  return config;
}

/**
 * Get delegation mode description
 * @param {string} mode - Delegation mode
 * @returns {string} Description
 */
export function getDelegationModeDescription(mode) {
  const modes = {
    suggest: 'Suggests appropriate agent but allows direct execution',
    auto: 'Automatically delegates to agent without asking',
    enforce: 'Requires delegation to agent, blocks direct execution',
  };
  return modes[mode] || modes.suggest;
}

export { DEFAULT_DELEGATION_CONFIG };
