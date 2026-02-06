/**
 * Agent Configuration and Domain Detection
 *
 * Provides agent configurations and domain detection logic.
 */

/**
 * Agent level configurations
 */
export const AGENT_CONFIGS = {
  L2: {
    frontend: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Frontend Specialist',
    },
    backend: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Backend Specialist',
    },
    testing: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Testing Specialist',
    },
    deployment: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Bash', 'Glob', 'Grep'],
      description: 'L2 Deployment Specialist',
    },
    general: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 General Specialist',
    },
  },
  L3: {
    search: {
      subagentType: 'Explore',
      tools: ['Read', 'Glob', 'Grep'],
      description: 'L3 Search Worker',
    },
    analyze: {
      subagentType: 'Explore',
      tools: ['Read', 'Glob', 'Grep'],
      description: 'L3 Analysis Worker',
    },
    execute: {
      subagentType: 'Bash',
      tools: ['Bash'],
      description: 'L3 Execution Worker',
    },
  },
};

/**
 * Domain detection keywords
 */
export const DOMAIN_KEYWORDS = {
  frontend: [
    'react', 'vue', 'angular', 'svelte', 'component', 'ui', 'css', 'style',
    'tailwind', 'jsx', 'tsx', 'html', 'dom', 'browser', 'client', 'layout',
    'button', 'form', 'input', 'modal', 'page', 'route', 'navigation'
  ],
  backend: [
    'api', 'server', 'endpoint', 'database', 'db', 'model', 'schema', 'query',
    'fastapi', 'express', 'django', 'flask', 'rest', 'graphql', 'middleware',
    'authentication', 'authorization', 'jwt', 'session', 'repository'
  ],
  testing: [
    'test', 'spec', 'jest', 'vitest', 'playwright', 'cypress', 'pytest',
    'mock', 'stub', 'fixture', 'assertion', 'coverage', 'e2e', 'unit',
    'integration', 'snapshot', 'expect'
  ],
  deployment: [
    'deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'gcp',
    'azure', 'vercel', 'railway', 'cloudflare', 'nginx', 'ssl', 'domain',
    'environment', 'production', 'staging'
  ],
};

/**
 * L2 Agent types for project exploration
 */
export const PROJECT_L2_AGENT_TYPES = {
  code_snippets: {
    name: 'code-snippets-explorer',
    description: 'Extract relevant code snippets from codebase',
    subagentType: 'Explore',
    tools: ['Read', 'Glob', 'Grep'],
  },
  reference_files: {
    name: 'reference-files-analyzer',
    description: 'Identify files to modify and reference',
    subagentType: 'Explore',
    tools: ['Read', 'Glob', 'Grep'],
  },
  agent_delegation: {
    name: 'agent-delegation-planner',
    description: 'Recommend agents for each task',
    subagentType: 'general-purpose',
    tools: ['Read', 'Glob', 'Grep'],
  },
  json_structure: {
    name: 'structure-generator',
    description: 'Generate full phase/task breakdown',
    subagentType: 'general-purpose',
    tools: ['Read', 'Glob', 'Grep', 'Write'],
  },
};

/**
 * Detect task domain from task details
 */
export function detectTaskDomain(task) {
  const searchText = `${task.title} ${task.details || ''} ${task.file || ''}`.toLowerCase();

  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(kw => searchText.includes(kw)).length;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'general';

  return Object.entries(scores).find(([, score]) => score === maxScore)[0];
}
