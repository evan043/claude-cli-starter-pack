/**
 * Agent Schema Validation
 *
 * JSON schema definitions and validators for agents.json
 */

/**
 * Valid agent levels
 */
export const AGENT_LEVELS = ['L1', 'L2', 'L3'];

/**
 * Valid agent domains
 */
export const AGENT_DOMAINS = ['frontend', 'backend', 'state', 'database', 'testing', 'deployment', 'general'];

/**
 * Valid model options
 */
export const AGENT_MODELS = ['sonnet', 'haiku', 'opus', 'inherit'];

/**
 * Valid tools for agents
 */
export const AGENT_TOOLS = [
  'Task',
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Grep',
  'Glob',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'AskUserQuestion',
  'NotebookEdit',
];

/**
 * Default tools by agent level
 */
export const DEFAULT_TOOLS_BY_LEVEL = {
  L1: ['Task', 'Read', 'Grep', 'Glob', 'WebSearch', 'TodoWrite', 'AskUserQuestion'],
  L2: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
  L3: ['Read', 'Grep'],
};

/**
 * Default model by agent level
 */
export const DEFAULT_MODEL_BY_LEVEL = {
  L1: 'sonnet',
  L2: 'sonnet',
  L3: 'haiku',
};

/**
 * Agent schema for validation
 */
export const AGENT_SCHEMA = {
  required: ['name', 'level', 'domain'],
  properties: {
    name: {
      type: 'string',
      pattern: /^[a-z0-9-]+$/,
      description: 'Unique agent identifier (lowercase, hyphens)',
    },
    level: {
      type: 'string',
      enum: AGENT_LEVELS,
      description: 'Agent level (L1=Orchestrator, L2=Specialist, L3=Worker)',
    },
    domain: {
      type: 'string',
      enum: AGENT_DOMAINS,
      description: 'Agent domain (frontend, backend, state, database, testing, deployment)',
    },
    framework: {
      type: 'string',
      description: 'Specific framework this agent specializes in',
    },
    tools: {
      type: 'array',
      items: { type: 'string', enum: AGENT_TOOLS },
      description: 'Tools available to this agent',
    },
    model: {
      type: 'string',
      enum: AGENT_MODELS,
      description: 'Model to use (sonnet, haiku, opus, inherit)',
    },
    triggers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords that trigger this agent',
    },
    filePatterns: {
      type: 'array',
      items: { type: 'string' },
      description: 'File patterns this agent handles',
    },
    description: {
      type: 'string',
      description: 'Human-readable description of agent purpose',
    },
    maxTokens: {
      type: 'number',
      description: 'Maximum response tokens',
    },
  },
};

/**
 * Registry schema for validation
 */
export const REGISTRY_SCHEMA = {
  required: ['version', 'agents'],
  properties: {
    version: {
      type: 'string',
      description: 'Schema version',
    },
    generated: {
      type: 'string',
      description: 'ISO timestamp of generation',
    },
    techStack: {
      type: 'object',
      description: 'Detected tech stack summary',
    },
    agents: {
      type: 'array',
      items: AGENT_SCHEMA,
      description: 'Array of agent definitions',
    },
    delegationRules: {
      type: 'object',
      properties: {
        keywords: {
          type: 'object',
          description: 'Keyword to domain mapping',
        },
        filePatterns: {
          type: 'object',
          description: 'File pattern to domain mapping',
        },
      },
    },
  },
};

/**
 * Validate a single agent definition
 * @param {object} agent - Agent definition to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateAgentSchema(agent) {
  const errors = [];

  // Check required fields
  for (const field of AGENT_SCHEMA.required) {
    if (!agent[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate name format
  if (agent.name && !AGENT_SCHEMA.properties.name.pattern.test(agent.name)) {
    errors.push(`Invalid name format: ${agent.name} (must be lowercase with hyphens)`);
  }

  // Validate level
  if (agent.level && !AGENT_LEVELS.includes(agent.level)) {
    errors.push(`Invalid level: ${agent.level} (must be one of: ${AGENT_LEVELS.join(', ')})`);
  }

  // Validate domain
  if (agent.domain && !AGENT_DOMAINS.includes(agent.domain)) {
    errors.push(`Invalid domain: ${agent.domain} (must be one of: ${AGENT_DOMAINS.join(', ')})`);
  }

  // Validate model
  if (agent.model && !AGENT_MODELS.includes(agent.model)) {
    errors.push(`Invalid model: ${agent.model} (must be one of: ${AGENT_MODELS.join(', ')})`);
  }

  // Validate tools
  if (agent.tools && Array.isArray(agent.tools)) {
    for (const tool of agent.tools) {
      if (!AGENT_TOOLS.includes(tool)) {
        errors.push(`Invalid tool: ${tool}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate the entire agents.json registry
 * @param {object} registry - Registry object to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateAgentsJson(registry) {
  const errors = [];

  // Check required fields
  for (const field of REGISTRY_SCHEMA.required) {
    if (!registry[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate version
  if (registry.version && typeof registry.version !== 'string') {
    errors.push('Version must be a string');
  }

  // Validate agents array
  if (registry.agents) {
    if (!Array.isArray(registry.agents)) {
      errors.push('Agents must be an array');
    } else {
      // Check for duplicate names
      const names = new Set();
      for (let i = 0; i < registry.agents.length; i++) {
        const agent = registry.agents[i];
        const agentValidation = validateAgentSchema(agent);

        if (!agentValidation.valid) {
          errors.push(`Agent ${i} (${agent.name || 'unnamed'}): ${agentValidation.errors.join(', ')}`);
        }

        if (agent.name) {
          if (names.has(agent.name)) {
            errors.push(`Duplicate agent name: ${agent.name}`);
          }
          names.add(agent.name);
        }
      }
    }
  }

  // Validate delegation rules
  if (registry.delegationRules) {
    if (registry.delegationRules.keywords && typeof registry.delegationRules.keywords !== 'object') {
      errors.push('delegationRules.keywords must be an object');
    }
    if (registry.delegationRules.filePatterns && typeof registry.delegationRules.filePatterns !== 'object') {
      errors.push('delegationRules.filePatterns must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a valid agent definition with defaults
 * @param {object} partial - Partial agent definition
 * @returns {object} Complete agent definition with defaults
 */
export function createAgentDefinition(partial) {
  const level = partial.level || 'L2';

  return {
    name: partial.name,
    level,
    domain: partial.domain || 'general',
    framework: partial.framework || null,
    tools: partial.tools || DEFAULT_TOOLS_BY_LEVEL[level] || [],
    model: partial.model || DEFAULT_MODEL_BY_LEVEL[level] || 'sonnet',
    triggers: partial.triggers || [],
    filePatterns: partial.filePatterns || [],
    description: partial.description || `${partial.name} agent`,
    maxTokens: partial.maxTokens || (level === 'L3' ? 500 : level === 'L2' ? 8000 : 16000),
  };
}

/**
 * Get schema documentation
 * @returns {string} Markdown documentation of the schema
 */
export function getSchemaDocumentation() {
  return `# Agent Registry Schema

## Agent Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique identifier (lowercase, hyphens) |
| level | string | Yes | L1 (Orchestrator), L2 (Specialist), L3 (Worker) |
| domain | string | Yes | ${AGENT_DOMAINS.join(', ')} |
| framework | string | No | Specific framework (react, fastapi, etc.) |
| tools | array | No | Available tools |
| model | string | No | sonnet, haiku, opus, inherit |
| triggers | array | No | Keywords that activate this agent |
| filePatterns | array | No | File patterns this agent handles |
| description | string | No | Human-readable description |
| maxTokens | number | No | Maximum response tokens |

## Agent Levels

| Level | Name | Purpose | Default Tools |
|-------|------|---------|---------------|
| L1 | Orchestrator | Coordinate and delegate | Task, Read, Grep, Glob, WebSearch |
| L2 | Specialist | Deep implementation | Read, Edit, Write, Bash, Grep, Glob |
| L3 | Worker | Simple atomic tasks | Read, Grep |

## Valid Tools

${AGENT_TOOLS.map((t) => `- ${t}`).join('\n')}

## Valid Domains

${AGENT_DOMAINS.map((d) => `- ${d}`).join('\n')}
`;
}
