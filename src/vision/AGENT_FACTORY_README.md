# Vision Mode Agent Factory

Dynamic agent creation and management system for Vision Mode execution.

## Overview

The Agent Factory enables Vision Mode to dynamically create specialized agents on-demand based on tech stack detection and domain requirements. This allows Vision Mode to adapt to any project architecture without hardcoded assumptions.

## File Location

`src/vision/agent-factory.js`

## Core Functions

### 1. createSpecializedAgent(config)

Creates a new specialized agent from configuration.

**Parameters:**
```javascript
{
  domain: 'frontend' | 'backend' | 'database' | 'testing' | 'deployment' | 'state',
  techStack: ['react', 'typescript', 'vite'], // Array of technologies
  capabilities: ['Deep React expertise', 'TypeScript patterns'], // Array of capabilities
  name: 'react-frontend-specialist', // Optional, auto-generated if not provided
  projectRoot: '/path/to/project' // Project root directory
}
```

**Returns:**
```javascript
{
  success: true,
  agentPath: '/path/to/.claude/agents/react-frontend-specialist.md',
  agentName: 'react-frontend-specialist',
  agentSlug: 'react-frontend-specialist',
  domain: 'frontend'
}
```

**Example:**
```javascript
import { createSpecializedAgent } from './src/vision/agent-factory.js';

const result = createSpecializedAgent({
  domain: 'frontend',
  techStack: ['react', 'typescript', 'vite'],
  capabilities: ['Component architecture', 'State management', 'Performance optimization'],
  projectRoot: process.cwd()
});

if (result.success) {
  console.log(`Agent created: ${result.agentPath}`);
}
```

### 2. generateAgentTemplate(domain, techStack, options)

Generates a markdown template for an agent with domain-specific workflows, file patterns, and quality checks.

**Parameters:**
```javascript
domain: 'frontend' | 'backend' | 'database' | 'testing' | 'deployment' | 'state'
techStack: ['fastapi', 'python'] // Array of technologies
options: {
  name: 'fastapi-backend-specialist', // Optional
  capabilities: ['API design', 'Database integration'], // Optional
  level: 'L2', // L1, L2, or L3
  includeRAG: false // Include RAG context retrieval capabilities
}
```

**Returns:**
String containing complete markdown agent template with:
- Frontmatter (name, description, level, domain, tools, frameworks)
- Role description
- Capabilities list
- Domain-specific workflows
- File patterns
- Quality checks
- Common code patterns
- Tools available
- Completion report format
- Token budget guidelines

### 3. updateExistingAgent(agentPath, newCapabilities)

Extends an existing agent with new capabilities.

**Parameters:**
```javascript
agentPath: '/path/to/.claude/agents/agent-name.md'
newCapabilities: ['WebSocket support', 'Real-time features']
```

**Returns:**
```javascript
{
  success: true,
  addedCapabilities: ['WebSocket support', 'Real-time features']
}
```

### 4. registerAgent(agentName, visionSlug, projectRoot, domain)

Registers an agent with a Vision and updates VISION.json execution_plan.agents_created.

**Parameters:**
```javascript
agentName: 'react-frontend-specialist'
visionSlug: 'build-dashboard'
projectRoot: '/path/to/project'
domain: 'frontend' // Optional, defaults to 'general'
```

**Returns:**
```javascript
{
  success: true,
  vision: { /* Updated vision object */ }
}
```

### 5. allocateAgentContext(agent, tokenBudget, level)

Allocates token budget to an agent based on its level.

**Parameters:**
```javascript
agent: { name: 'react-specialist', domain: 'frontend' }
tokenBudget: 200000 // Total token budget
level: 'L2' // L1, L2, or L3
```

**Returns:**
```javascript
{
  allocated: 60000,  // 30% for L2
  remaining: 140000,
  percentage: 30,
  level: 'L2'
}
```

**Allocation Rules:**
- L1 (Orchestrators): 50% of budget
- L2 (Specialists): 30% of budget
- L3 (Workers): 10% of budget

### 6. getAgentForDomain(domain, projectRoot)

Finds the best agent for a specific domain by scanning .claude/agents/ directory.

**Parameters:**
```javascript
domain: 'frontend' | 'backend' | 'database' | 'testing' | 'deployment' | 'state'
projectRoot: '/path/to/project'
```

**Returns:**
```javascript
'react-frontend-specialist' // Agent name or null if not found
```

### 7. decommissionAgent(agentName, projectRoot)

Archives and removes an agent from active use.

**Parameters:**
```javascript
agentName: 'legacy-agent'
projectRoot: '/path/to/project'
```

**Returns:**
```javascript
{
  success: true,
  archived: '/path/to/.claude/agents/archived/legacy-agent-2026-02-05T12-00-00.md'
}
```

The agent is moved to `.claude/agents/archived/` with a timestamp.

### 8. listAgents(projectRoot)

Lists all agents in the project.

**Parameters:**
```javascript
projectRoot: '/path/to/project'
```

**Returns:**
```javascript
[
  {
    name: 'react-frontend-specialist',
    domain: 'frontend',
    level: 'L2',
    file: 'react-frontend-specialist.md'
  },
  {
    name: 'fastapi-backend-specialist',
    domain: 'backend',
    level: 'L2',
    file: 'fastapi-backend-specialist.md'
  }
]
```

### 9. createAgentRegistry(projectRoot, techStack)

Creates an agent registry for a project by scanning existing agents and matching them to the tech stack.

**Parameters:**
```javascript
projectRoot: '/path/to/project'
techStack: {
  frontend: 'react',
  backend: 'fastapi',
  database: 'postgresql',
  testing: 'playwright'
}
```

**Returns:**
```javascript
{
  agents: [
    {
      name: 'react-frontend-specialist',
      domain: 'frontend',
      techStack: ['react'],
      available: true
    },
    {
      name: 'fastapi-backend-specialist',
      domain: 'backend',
      techStack: ['fastapi'],
      available: true
    }
  ],
  count: 2,
  created: '2026-02-05T12:00:00.000Z'
}
```

## Domain Patterns

The Agent Factory recognizes these domains:

### Frontend
- **Keywords**: frontend, ui, component, react, vue, angular, svelte, nextjs
- **Frameworks**: react, vue, angular, svelte, nextjs, nuxt, remix
- **Tools**: Read, Write, Edit, Glob, Grep, Bash

### Backend
- **Keywords**: backend, api, endpoint, server, route, fastapi, express, django, flask
- **Frameworks**: fastapi, express, nestjs, django, flask, rails, gin, springboot
- **Tools**: Read, Write, Edit, Glob, Grep, Bash

### Database
- **Keywords**: database, schema, migration, model, query, orm, sql, mongodb
- **Frameworks**: prisma, typeorm, drizzle, sqlalchemy, mongoose, sequelize
- **Tools**: Read, Write, Edit, Bash, Glob, Grep

### Testing
- **Keywords**: test, e2e, unit, integration, spec, coverage, playwright, jest
- **Frameworks**: playwright, jest, vitest, pytest, cypress, mocha
- **Tools**: Read, Write, Edit, Bash, Glob, Grep

### Deployment
- **Keywords**: deploy, ci, cd, docker, kubernetes, railway, cloudflare, vercel
- **Frameworks**: railway, cloudflare, vercel, netlify, aws, docker
- **Tools**: Read, Write, Edit, Bash, Glob, Grep

### State
- **Keywords**: state, store, zustand, redux, pinia, context
- **Frameworks**: zustand, redux, pinia, jotai, recoil, mobx
- **Tools**: Read, Write, Edit, Glob, Grep, Bash

## Agent Template Structure

Generated agents include:

### Frontmatter
```yaml
---
name: agent-name
description: L2 domain specialist for tech stack
level: L2
domain: frontend
tools: Read, Write, Edit, Glob, Grep, Bash
frameworks: [react, typescript, vite]
permissionMode: acceptEdits
model: sonnet
---
```

### Sections
1. **Tech Stack Description**: Lists technologies and their use cases
2. **Capabilities**: Agent's specialized skills
3. **Domain-Specific Workflows**: Step-by-step workflows for common tasks
4. **File Patterns**: Files the agent works with
5. **Quality Checks**: Pre-completion verification steps
6. **Common Patterns**: Code examples for the tech stack
7. **Tools Available**: List of available tools
8. **Completion Report**: Format for task completion reports
9. **Token Budget**: Token usage guidelines

## Integration with Vision Mode

The Agent Factory integrates with Vision Mode's execution flow:

1. **Analysis Phase**: Vision Mode detects tech stack from VISION.json architecture
2. **Agent Creation**: Factory creates specialized agents for each domain
3. **Registration**: Agents are registered in VISION.json execution_plan.agents_created
4. **Allocation**: Token budget is allocated to each agent
5. **Execution**: Agents are deployed to handle domain-specific tasks
6. **Decommission**: Unused agents are archived when no longer needed

## Usage in Vision Orchestrator

```javascript
import {
  createSpecializedAgent,
  registerAgent,
  allocateAgentContext,
  listAgents
} from './src/vision/agent-factory.js';

// Create frontend agent
const frontendAgent = createSpecializedAgent({
  domain: 'frontend',
  techStack: vision.architecture.tech_decisions.frontend.framework,
  projectRoot: projectRoot
});

// Register with vision
if (frontendAgent.success) {
  await registerAgent(
    frontendAgent.agentName,
    vision.slug,
    projectRoot,
    'frontend'
  );

  // Allocate token budget
  const allocation = allocateAgentContext(
    { name: frontendAgent.agentName, domain: 'frontend' },
    vision.execution_plan.token_budget.total,
    'L2'
  );

  console.log(`Allocated ${allocation.allocated} tokens to ${frontendAgent.agentName}`);
}

// List all agents
const agents = listAgents(projectRoot);
console.log(`Total agents: ${agents.length}`);
```

## File Structure

```
.claude/
├── agents/
│   ├── react-frontend-specialist.md
│   ├── fastapi-backend-specialist.md
│   ├── prisma-database-specialist.md
│   ├── playwright-testing-specialist.md
│   └── archived/
│       └── legacy-agent-2026-02-05T12-00-00.md
└── visions/
    └── {vision-slug}/
        └── VISION.json  # Contains agents_created array
```

## Best Practices

1. **One Agent Per Domain**: Create one specialized agent per domain (frontend, backend, etc.)
2. **Tech-Specific Agents**: Include tech stack in agent name for clarity
3. **Progressive Enhancement**: Start with basic agents, extend with updateExistingAgent()
4. **Token Management**: Use allocateAgentContext() to prevent token exhaustion
5. **Archive Old Agents**: Use decommissionAgent() instead of deleting
6. **Registry Pattern**: Use createAgentRegistry() for project-wide agent discovery

## Testing

The agent factory can be tested with:

```javascript
// Test agent creation
const result = createSpecializedAgent({
  domain: 'testing',
  techStack: ['jest', 'typescript'],
  projectRoot: '/tmp/test-project'
});

assert(result.success);
assert(fs.existsSync(result.agentPath));

// Test agent template generation
const template = generateAgentTemplate('backend', ['fastapi'], {
  name: 'test-agent',
  level: 'L2'
});

assert(template.includes('# Test Agent'));
assert(template.includes('fastapi'));
```

## Error Handling

All functions return result objects with `success` and `error` fields:

```javascript
const result = createSpecializedAgent({ /* config */ });

if (!result.success) {
  console.error(`Agent creation failed: ${result.error}`);
  // Handle error
}
```

## Future Enhancements

- RAG-enhanced agent templates with context retrieval
- Agent capability scoring and recommendation
- Multi-agent collaboration patterns
- Agent performance metrics and optimization
- Dynamic agent specialization based on task complexity

---

*Part of CCASP Vision Mode*
*Created: 2026-02-05*
