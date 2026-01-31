/**
 * Agent Delegator Hook
 *
 * UserPromptSubmit hook that routes tasks to the appropriate
 * stack-specific agents based on detected domain and tech stack.
 *
 * This hook works in conjunction with task-classifier to provide
 * intelligent routing to specialist agents.
 *
 * Hook Type: UserPromptSubmit
 * Trigger: Every user prompt before processing
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load configuration file
 */
function loadConfig(filename) {
  const configPath = join(process.cwd(), '.claude', 'config', filename);
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Extract file paths mentioned in the prompt
 */
function extractFilePaths(prompt) {
  // Match common file path patterns
  const patterns = [
    /(?:^|\s)((?:\.\/|\.\.\/|\/)?(?:[\w-]+\/)*[\w-]+\.[\w]+)(?:\s|$|,)/g,
    /(?:file|path|in)\s*[:=]?\s*['"`]?([^'"`\s]+\.[\w]+)['"`]?/gi,
    /(?:src|lib|app|components|pages|api|tests?|e2e)\/[\w\-/]+\.[\w]+/g,
  ];

  const files = new Set();
  for (const pattern of patterns) {
    const matches = prompt.matchAll(pattern);
    for (const match of matches) {
      const file = match[1] || match[0];
      if (file && !file.startsWith('http')) {
        files.add(file.trim());
      }
    }
  }

  return Array.from(files);
}

/**
 * Check if file matches a glob pattern
 */
function matchesPattern(file, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(file) || new RegExp(`${regex}$`).test(file);
}

/**
 * Score domains based on file patterns
 */
function scoreByFiles(files, delegationConfig) {
  const scores = {};

  for (const file of files) {
    for (const [domain, config] of Object.entries(delegationConfig.domains || {})) {
      if (!scores[domain]) scores[domain] = 0;

      for (const pattern of config.filePatterns || []) {
        if (matchesPattern(file, pattern)) {
          scores[domain] += 2; // Higher weight for file patterns
        }
      }
    }
  }

  return scores;
}

/**
 * Build agent delegation prompt
 */
function buildDelegationPrompt(agent, domain, techStack) {
  const frameworkContext = [];

  if (domain === 'frontend' && techStack?.frontend) {
    if (techStack.frontend.framework) {
      frameworkContext.push(`Framework: ${techStack.frontend.framework}`);
    }
    if (techStack.frontend.stateManager) {
      frameworkContext.push(`State Manager: ${techStack.frontend.stateManager}`);
    }
    if (techStack.frontend.uiLibrary) {
      frameworkContext.push(`UI Library: ${techStack.frontend.uiLibrary}`);
    }
  }

  if (domain === 'backend' && techStack?.backend) {
    if (techStack.backend.framework) {
      frameworkContext.push(`Framework: ${techStack.backend.framework}`);
    }
    if (techStack.backend.language) {
      frameworkContext.push(`Language: ${techStack.backend.language}`);
    }
  }

  if (domain === 'database' && techStack?.database) {
    if (techStack.database.primary) {
      frameworkContext.push(`Database: ${techStack.database.primary}`);
    }
    if (techStack.database.orm) {
      frameworkContext.push(`ORM: ${techStack.database.orm}`);
    }
  }

  if (domain === 'testing' && techStack?.testing) {
    if (techStack.testing.e2e?.framework) {
      frameworkContext.push(`E2E: ${techStack.testing.e2e.framework}`);
    }
    if (techStack.testing.unit?.framework) {
      frameworkContext.push(`Unit: ${techStack.testing.unit.framework}`);
    }
  }

  return frameworkContext.length > 0
    ? `\n\nProject tech stack context:\n${frameworkContext.map((c) => `- ${c}`).join('\n')}`
    : '';
}

/**
 * Get the best agent for the detected domain
 */
function getBestAgent(domain, techStack, agentRegistry) {
  if (!agentRegistry?.agents) return null;

  const domainAgents = agentRegistry.agents.filter((a) => a.domain === domain);
  if (domainAgents.length === 0) return null;

  // Map domain to tech stack property
  const frameworkMap = {
    frontend: techStack?.frontend?.framework,
    backend: techStack?.backend?.framework,
    state: techStack?.frontend?.stateManager,
    database: techStack?.database?.orm || techStack?.database?.primary,
    testing: techStack?.testing?.e2e?.framework || techStack?.testing?.unit?.framework,
    deployment: techStack?.deployment?.backend?.platform || techStack?.deployment?.frontend?.platform,
  };

  const framework = frameworkMap[domain]?.toLowerCase();

  // Find framework-specific agent
  if (framework) {
    const frameworkAgent = domainAgents.find(
      (a) => a.framework?.toLowerCase() === framework || a.name.toLowerCase().includes(framework)
    );
    if (frameworkAgent) return frameworkAgent;
  }

  // Return first available domain agent
  return domainAgents[0];
}

/**
 * Main hook handler
 */
export async function handler(context) {
  const { prompt } = context;

  // Load configurations
  const delegationConfig = loadConfig('delegation.json');
  const techStack = loadConfig('tech-stack.json');
  const agentRegistry = loadConfig('agents.json');

  // Skip if no registry or delegation disabled
  if (!agentRegistry || !delegationConfig?.enabled) {
    return { continue: true };
  }

  // Extract file paths from prompt
  const files = extractFilePaths(prompt);

  // Score domains by files
  const fileScores = scoreByFiles(files, delegationConfig);

  // Find best domain from file scores
  let bestDomain = null;
  let bestScore = 0;

  for (const [domain, score] of Object.entries(fileScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Skip if no strong file-based signal
  if (!bestDomain || bestScore < 2) {
    return { continue: true };
  }

  // Get best agent for domain
  const agent = getBestAgent(bestDomain, techStack, agentRegistry);

  if (!agent) {
    return { continue: true };
  }

  // Build context for agent
  const contextAddition = buildDelegationPrompt(agent, bestDomain, techStack);

  return {
    continue: true,
    metadata: {
      detectedFiles: files,
      domain: bestDomain,
      agent: agent.name,
    },
    systemPromptAppend: `

[Agent Routing - File-Based Detection]
Files detected in prompt: ${files.join(', ')}
Domain: ${bestDomain}
Recommended specialist: ${agent.name}
${contextAddition}

For this task, consider using the Task tool with:
- subagent_type: "${agent.name}"
- A clear description of the task
- The user's original prompt as the task prompt

This agent has specialized knowledge of ${bestDomain} patterns and best practices.
`,
  };
}

/**
 * Hook configuration
 */
export const config = {
  name: 'agent-delegator',
  type: 'UserPromptSubmit',
  description: 'Routes tasks to appropriate agents based on file patterns',
  enabled: true,
};
