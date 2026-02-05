# Agent Factory Usage Examples

Practical examples of using the Vision Mode Agent Factory.

## Example 1: Create a React Frontend Specialist

```javascript
import { createSpecializedAgent } from './src/vision/agent-factory.js';

const result = createSpecializedAgent({
  domain: 'frontend',
  techStack: ['react', 'typescript', 'vite', 'tailwindcss'],
  capabilities: [
    'Component architecture',
    'React hooks patterns',
    'TypeScript type definitions',
    'Tailwind CSS styling',
    'Vite configuration'
  ],
  projectRoot: process.cwd()
});

if (result.success) {
  console.log('✓ Agent created:', result.agentName);
  console.log('✓ Location:', result.agentPath);
} else {
  console.error('✗ Failed:', result.error);
}
```

**Generated Agent File**: `.claude/agents/react-frontend-specialist.md`

## Example 2: Create a FastAPI Backend Specialist

```javascript
import { createSpecializedAgent } from './src/vision/agent-factory.js';

const result = createSpecializedAgent({
  domain: 'backend',
  techStack: ['fastapi', 'python', 'sqlalchemy', 'postgresql'],
  capabilities: [
    'RESTful API design',
    'Async Python patterns',
    'Database schema design',
    'JWT authentication',
    'OpenAPI documentation'
  ],
  name: 'fastapi-backend-specialist',
  projectRoot: '/path/to/project'
});

console.log(result.success ? 'Agent ready!' : result.error);
```

## Example 3: Vision Mode Integration

```javascript
import {
  createSpecializedAgent,
  registerAgent,
  allocateAgentContext,
  createAgentRegistry
} from './src/vision/agent-factory.js';
import { loadVision } from './src/vision/state-manager.js';

async function setupVisionAgents(projectRoot, visionSlug) {
  const vision = loadVision(projectRoot, visionSlug);

  if (!vision) {
    throw new Error(`Vision not found: ${visionSlug}`);
  }

  const techDecisions = vision.architecture.tech_decisions;
  const totalBudget = vision.execution_plan.token_budget.total;

  // Create frontend agent
  const frontendResult = createSpecializedAgent({
    domain: 'frontend',
    techStack: [techDecisions.frontend.framework],
    projectRoot
  });

  if (frontendResult.success) {
    // Register with vision
    await registerAgent(
      frontendResult.agentName,
      visionSlug,
      projectRoot,
      'frontend'
    );

    // Allocate tokens
    const allocation = allocateAgentContext(
      { name: frontendResult.agentName, domain: 'frontend' },
      totalBudget,
      'L2'
    );

    console.log(`Frontend agent: ${frontendResult.agentName}`);
    console.log(`Allocated: ${allocation.allocated} tokens (${allocation.percentage}%)`);
  }

  // Create backend agent
  const backendResult = createSpecializedAgent({
    domain: 'backend',
    techStack: [techDecisions.backend.framework],
    projectRoot
  });

  if (backendResult.success) {
    await registerAgent(
      backendResult.agentName,
      visionSlug,
      projectRoot,
      'backend'
    );

    const allocation = allocateAgentContext(
      { name: backendResult.agentName, domain: 'backend' },
      totalBudget,
      'L2'
    );

    console.log(`Backend agent: ${backendResult.agentName}`);
    console.log(`Allocated: ${allocation.allocated} tokens`);
  }

  // Create agent registry
  const registry = createAgentRegistry(projectRoot, {
    frontend: techDecisions.frontend.framework,
    backend: techDecisions.backend.framework,
    database: techDecisions.database.type
  });

  console.log(`\nTotal agents: ${registry.count}`);
  registry.agents.forEach(agent => {
    console.log(`- ${agent.name} (${agent.domain})`);
  });

  return registry;
}

// Usage
setupVisionAgents(process.cwd(), 'build-dashboard');
```

## Example 4: Extend Existing Agent

```javascript
import {
  getAgentForDomain,
  updateExistingAgent
} from './src/vision/agent-factory.js';
import path from 'path';

const projectRoot = process.cwd();

// Find existing frontend agent
const agentName = getAgentForDomain('frontend', projectRoot);

if (agentName) {
  const agentPath = path.join(
    projectRoot,
    '.claude',
    'agents',
    `${agentName.toLowerCase().replace(/\s+/g, '-')}.md`
  );

  // Add new capabilities
  const result = updateExistingAgent(agentPath, [
    'WebSocket support',
    'Real-time data synchronization',
    'Server-sent events'
  ]);

  if (result.success) {
    console.log('✓ Added capabilities:', result.addedCapabilities);
  }
}
```

## Example 5: Token Budget Allocation

```javascript
import { allocateAgentContext } from './src/vision/agent-factory.js';

const totalBudget = 200000; // 200K tokens

// Allocate for L1 orchestrator
const orchestratorAllocation = allocateAgentContext(
  { name: 'vision-orchestrator', domain: 'orchestration' },
  totalBudget,
  'L1'
);

console.log('L1 Orchestrator:');
console.log(`- Allocated: ${orchestratorAllocation.allocated} tokens`);
console.log(`- Percentage: ${orchestratorAllocation.percentage}%`);
console.log(`- Remaining: ${orchestratorAllocation.remaining} tokens`);

// Allocate for L2 specialists
const specialistAllocation = allocateAgentContext(
  { name: 'frontend-specialist', domain: 'frontend' },
  orchestratorAllocation.remaining,
  'L2'
);

console.log('\nL2 Specialist:');
console.log(`- Allocated: ${specialistAllocation.allocated} tokens`);
console.log(`- Percentage: ${specialistAllocation.percentage}%`);
console.log(`- Remaining: ${specialistAllocation.remaining} tokens`);

// Allocate for L3 workers
const workerAllocation = allocateAgentContext(
  { name: 'component-worker', domain: 'frontend' },
  specialistAllocation.remaining,
  'L3'
);

console.log('\nL3 Worker:');
console.log(`- Allocated: ${workerAllocation.allocated} tokens`);
console.log(`- Percentage: ${workerAllocation.percentage}%`);
```

**Output:**
```
L1 Orchestrator:
- Allocated: 100000 tokens
- Percentage: 50%
- Remaining: 100000 tokens

L2 Specialist:
- Allocated: 30000 tokens
- Percentage: 30%
- Remaining: 70000 tokens

L3 Worker:
- Allocated: 7000 tokens
- Percentage: 10%
- Remaining: 63000 tokens
```

## Example 6: List and Manage Agents

```javascript
import {
  listAgents,
  decommissionAgent
} from './src/vision/agent-factory.js';

const projectRoot = process.cwd();

// List all agents
const agents = listAgents(projectRoot);

console.log(`Found ${agents.length} agents:\n`);

agents.forEach(agent => {
  console.log(`Name: ${agent.name}`);
  console.log(`Domain: ${agent.domain}`);
  console.log(`Level: ${agent.level}`);
  console.log(`File: ${agent.file}`);
  console.log('---');
});

// Decommission an unused agent
const result = decommissionAgent('legacy-agent', projectRoot);

if (result.success) {
  console.log(`\n✓ Agent archived: ${result.archived}`);
}
```

## Example 7: Custom Agent Template

```javascript
import { generateAgentTemplate } from './src/vision/agent-factory.js';
import fs from 'fs';
import path from 'path';

// Generate custom agent template
const template = generateAgentTemplate(
  'testing',
  ['playwright', 'typescript'],
  {
    name: 'playwright-e2e-specialist',
    capabilities: [
      'E2E test automation',
      'Page object patterns',
      'Test parallelization',
      'Visual regression testing'
    ],
    level: 'L2',
    includeRAG: true // Enable RAG context retrieval
  }
);

// Save to custom location
const agentPath = path.join(
  process.cwd(),
  '.claude',
  'agents',
  'playwright-e2e-specialist.md'
);

fs.writeFileSync(agentPath, template, 'utf8');
console.log('✓ Custom agent template created');
```

## Example 8: Batch Agent Creation

```javascript
import { createSpecializedAgent } from './src/vision/agent-factory.js';

const techStack = {
  frontend: ['react', 'typescript', 'vite'],
  backend: ['fastapi', 'python'],
  database: ['postgresql', 'prisma'],
  testing: ['playwright', 'jest'],
  deployment: ['railway', 'cloudflare']
};

const projectRoot = process.cwd();

async function createProjectAgents() {
  const results = [];

  for (const [domain, stack] of Object.entries(techStack)) {
    console.log(`Creating ${domain} agent...`);

    const result = createSpecializedAgent({
      domain,
      techStack: stack,
      projectRoot
    });

    if (result.success) {
      console.log(`✓ ${result.agentName}`);
      results.push(result);
    } else {
      console.error(`✗ ${domain}: ${result.error}`);
    }
  }

  console.log(`\nCreated ${results.length} agents`);
  return results;
}

createProjectAgents();
```

## Example 9: Agent Registry with Filtering

```javascript
import { createAgentRegistry, listAgents } from './src/vision/agent-factory.js';

const projectRoot = process.cwd();

// Create registry for specific tech stack
const registry = createAgentRegistry(projectRoot, {
  frontend: 'react',
  backend: 'fastapi',
  database: 'postgresql',
  testing: 'playwright',
  deployment: 'railway'
});

console.log('Agent Registry:');
console.log(`Total: ${registry.count}`);
console.log(`Created: ${registry.created}\n`);

// Filter by domain
const frontendAgents = registry.agents.filter(a => a.domain === 'frontend');
console.log('Frontend agents:', frontendAgents.map(a => a.name));

const backendAgents = registry.agents.filter(a => a.domain === 'backend');
console.log('Backend agents:', backendAgents.map(a => a.name));

// Check availability
const availableAgents = registry.agents.filter(a => a.available);
console.log(`\nAvailable agents: ${availableAgents.length}/${registry.count}`);
```

## Example 10: Complete Vision Setup

```javascript
import {
  createSpecializedAgent,
  registerAgent,
  allocateAgentContext,
  createAgentRegistry
} from './src/vision/agent-factory.js';
import { loadVision, saveVision } from './src/vision/state-manager.js';

async function completeVisionSetup(projectRoot, visionSlug) {
  // Load vision
  const vision = loadVision(projectRoot, visionSlug);
  const techDecisions = vision.architecture.tech_decisions;
  const tokenBudget = vision.execution_plan.token_budget.total;

  console.log(`Setting up agents for: ${vision.title}`);
  console.log(`Total budget: ${tokenBudget} tokens\n`);

  const domains = [
    { key: 'frontend', tech: techDecisions.frontend.framework },
    { key: 'backend', tech: techDecisions.backend.framework },
    { key: 'database', tech: techDecisions.database.type }
  ];

  let remainingBudget = tokenBudget;
  const createdAgents = [];

  for (const { key, tech } of domains) {
    if (!tech) continue;

    console.log(`Creating ${key} agent for ${tech}...`);

    // Create agent
    const agentResult = createSpecializedAgent({
      domain: key,
      techStack: [tech],
      projectRoot
    });

    if (!agentResult.success) {
      console.error(`Failed: ${agentResult.error}`);
      continue;
    }

    // Register with vision
    await registerAgent(
      agentResult.agentName,
      visionSlug,
      projectRoot,
      key
    );

    // Allocate tokens
    const allocation = allocateAgentContext(
      { name: agentResult.agentName, domain: key },
      remainingBudget,
      'L2'
    );

    remainingBudget = allocation.remaining;

    console.log(`✓ ${agentResult.agentName}`);
    console.log(`  Tokens: ${allocation.allocated}`);

    createdAgents.push({
      name: agentResult.agentName,
      domain: key,
      allocation: allocation.allocated
    });
  }

  // Create registry
  const registry = createAgentRegistry(projectRoot, {
    frontend: techDecisions.frontend.framework,
    backend: techDecisions.backend.framework,
    database: techDecisions.database.type
  });

  // Update vision with final budget allocation
  vision.execution_plan.token_budget.allocated = tokenBudget - remainingBudget;
  vision.execution_plan.token_budget.remaining = remainingBudget;

  await saveVision(projectRoot, vision);

  console.log('\n=== Setup Complete ===');
  console.log(`Agents created: ${createdAgents.length}`);
  console.log(`Tokens allocated: ${tokenBudget - remainingBudget}`);
  console.log(`Tokens remaining: ${remainingBudget}`);
  console.log('\nAgent Summary:');
  createdAgents.forEach(agent => {
    console.log(`- ${agent.name} (${agent.domain}): ${agent.allocation} tokens`);
  });

  return {
    agents: createdAgents,
    registry,
    budgetUsed: tokenBudget - remainingBudget,
    budgetRemaining: remainingBudget
  };
}

// Run setup
completeVisionSetup(process.cwd(), 'build-dashboard')
  .then(result => {
    console.log('\n✓ Vision agent setup complete');
  })
  .catch(error => {
    console.error('✗ Setup failed:', error.message);
  });
```

---

*Part of CCASP Vision Mode Agent Factory*
*Created: 2026-02-05*
