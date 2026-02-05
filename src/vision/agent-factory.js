/**
 * Vision Mode Agent Factory
 *
 * Dynamic agent creation and management for Vision Mode execution.
 * Generates specialized agents on-demand based on tech stack and domain requirements.
 */

import fs from 'fs';
import path from 'path';
import { addCreatedAgent } from './schema.js';
import { loadVision, saveVision, updateVision } from './state-manager.js';

/**
 * Domain to tech stack mappings
 */
export const DOMAIN_PATTERNS = {
  frontend: {
    keywords: ['frontend', 'ui', 'component', 'react', 'vue', 'angular', 'svelte', 'nextjs'],
    frameworks: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'remix']
  },
  backend: {
    keywords: ['backend', 'api', 'endpoint', 'server', 'route', 'fastapi', 'express', 'django', 'flask'],
    frameworks: ['fastapi', 'express', 'nestjs', 'django', 'flask', 'rails', 'gin', 'springboot']
  },
  database: {
    keywords: ['database', 'schema', 'migration', 'model', 'query', 'orm', 'sql', 'mongodb'],
    frameworks: ['prisma', 'typeorm', 'drizzle', 'sqlalchemy', 'mongoose', 'sequelize']
  },
  testing: {
    keywords: ['test', 'e2e', 'unit', 'integration', 'spec', 'coverage', 'playwright', 'jest'],
    frameworks: ['playwright', 'jest', 'vitest', 'pytest', 'cypress', 'mocha']
  },
  deployment: {
    keywords: ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'railway', 'cloudflare', 'vercel'],
    frameworks: ['railway', 'cloudflare', 'vercel', 'netlify', 'aws', 'docker']
  },
  state: {
    keywords: ['state', 'store', 'zustand', 'redux', 'pinia', 'context'],
    frameworks: ['zustand', 'redux', 'pinia', 'jotai', 'recoil', 'mobx']
  }
};

/**
 * Create a specialized agent from configuration
 * @param {Object} config - Agent configuration
 * @param {string} config.domain - Domain (frontend, backend, etc.)
 * @param {Array<string>} config.techStack - Technologies used
 * @param {Array<string>} config.capabilities - Agent capabilities
 * @param {string} config.name - Agent name (optional, auto-generated if not provided)
 * @param {string} config.projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, agentPath?: string, agentName?: string, error?: string }
 */
export function createSpecializedAgent(config) {
  const {
    domain,
    techStack = [],
    capabilities = [],
    name = null,
    projectRoot = process.cwd()
  } = config;

  try {
    // Generate agent name if not provided
    const agentName = name || generateAgentName(domain, techStack);
    const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');

    // Create agent directory
    const agentsDir = path.join(projectRoot, '.claude', 'agents');
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    const agentPath = path.join(agentsDir, `${agentSlug}.md`);

    // Check if agent already exists
    if (fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent already exists: ${agentPath}`,
        agentPath,
        agentName
      };
    }

    // Generate agent template
    const template = generateAgentTemplate(domain, techStack, {
      name: agentName,
      capabilities
    });

    // Write agent file
    fs.writeFileSync(agentPath, template, 'utf8');

    return {
      success: true,
      agentPath,
      agentName,
      agentSlug,
      domain
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate agent name from domain and tech stack
 * @param {string} domain - Domain name
 * @param {Array<string>} techStack - Technologies
 * @returns {string} Generated agent name
 */
function generateAgentName(domain, techStack) {
  if (techStack.length > 0) {
    const primaryTech = techStack[0];
    return `${primaryTech}-${domain}-specialist`;
  }
  return `${domain}-specialist`;
}

/**
 * Generate markdown template for an agent
 * @param {string} domain - Domain (frontend, backend, etc.)
 * @param {Array<string>} techStack - Technologies the agent should know
 * @param {Object} options - Additional options
 * @returns {string} Markdown template
 */
export function generateAgentTemplate(domain, techStack, options = {}) {
  const {
    name = `${domain}-specialist`,
    capabilities = [],
    level = 'L2',
    includeRAG = false
  } = options;

  const timestamp = new Date().toISOString();
  const domainInfo = DOMAIN_PATTERNS[domain] || { keywords: [], frameworks: [] };

  // Get domain-specific patterns and workflows
  const workflows = getDomainWorkflows(domain);
  const filePatterns = getDomainFilePatterns(domain, techStack);
  const commonPatterns = getDomainCommonPatterns(domain, techStack);
  const qualityChecks = getDomainQualityChecks(domain);
  const tools = getDomainTools(domain);

  return `---
name: ${name}
description: ${level} ${domain} specialist for ${techStack.join(', ')}
level: ${level}
domain: ${domain}
tools: ${tools.join(', ')}
frameworks: [${techStack.join(', ')}]
permissionMode: acceptEdits
model: sonnet
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

You are a **${level} ${domain} specialist** for this project. Your expertise covers:

${getTechStackDescription(domain, techStack)}

## Capabilities

${capabilities.length > 0 ? capabilities.map(c => `- ${c}`).join('\n') : '- Deep domain expertise in ' + domain}
- Pattern recognition and best practices
- Code quality and standards enforcement
- Performance optimization
${includeRAG ? '- RAG-enhanced context retrieval' : ''}

## Domain-Specific Workflows

${workflows}

## File Patterns You Handle

${filePatterns}

## Quality Checks

Before reporting completion:

${qualityChecks}

## Common Patterns

${commonPatterns}

## Tools Available

${tools.map(t => `- **${t}**`).join('\n')}

## Completion Report

When completing a task:

\`\`\`
TASK_COMPLETE: {taskId}
STATUS: completed | blocked | needs_review
ARTIFACTS: [file1.ext, file2.ext, ...]
SUMMARY: Brief description of what was accomplished
VERIFIED: lint-pass, tests-pass, etc.
${includeRAG ? 'RAG_CONTEXT_USED: [context IDs that informed the work]' : ''}
\`\`\`

## Token Budget

- Maximum response: ${level === 'L3' ? '500 tokens' : level === 'L2' ? '8,000 tokens' : 'Full context'}
- Report to orchestrator when approaching limit
${includeRAG ? '- Use RAG retrieval to optimize context usage' : ''}

---

*${name}*
*Part of Vision Mode Agent Factory*
*Created: ${timestamp}*
`;
}

/**
 * Get tech stack description for domain
 * @param {string} domain - Domain name
 * @param {Array<string>} techStack - Tech stack
 * @returns {string} Description
 */
function getTechStackDescription(domain, techStack) {
  const descriptions = {
    frontend: techStack.map(t => `- **${t}**: UI components, state management, routing`).join('\n'),
    backend: techStack.map(t => `- **${t}**: API endpoints, business logic, authentication`).join('\n'),
    database: techStack.map(t => `- **${t}**: Schema design, migrations, queries`).join('\n'),
    testing: techStack.map(t => `- **${t}**: Test automation, coverage, E2E testing`).join('\n'),
    deployment: techStack.map(t => `- **${t}**: CI/CD, deployment automation, infrastructure`).join('\n'),
    state: techStack.map(t => `- **${t}**: Global state, persistence, synchronization`).join('\n')
  };

  return descriptions[domain] || techStack.map(t => `- ${t}`).join('\n');
}

/**
 * Get domain-specific workflows
 * @param {string} domain - Domain name
 * @returns {string} Workflow description
 */
function getDomainWorkflows(domain) {
  const workflows = {
    frontend: `### Component Creation
1. Check existing component patterns
2. Use framework best practices
3. Implement accessibility features
4. Add proper TypeScript types
5. Write component tests

### State Management
1. Identify state scope (local vs global)
2. Follow existing state patterns
3. Implement actions and selectors
4. Add state persistence if needed`,

    backend: `### API Endpoint Creation
1. Check existing route patterns
2. Follow RESTful conventions
3. Add request validation
4. Implement authentication/authorization
5. Include error handling
6. Document with OpenAPI

### Database Operations
1. Check existing migration patterns
2. Use proper data types
3. Add indexes for performance
4. Include foreign key relationships
5. Generate and apply migrations`,

    database: `### Schema Design
1. Analyze data requirements
2. Design normalized schema
3. Add proper indexes
4. Define relationships
5. Generate migrations

### Query Optimization
1. Analyze query patterns
2. Add appropriate indexes
3. Use query explain plans
4. Optimize N+1 queries
5. Implement caching where needed`,

    testing: `### Test Creation
1. Identify test scope (unit/integration/e2e)
2. Write descriptive test cases
3. Follow AAA pattern (Arrange/Act/Assert)
4. Mock external dependencies
5. Ensure good coverage

### E2E Testing
1. Identify user flows
2. Write page objects
3. Implement test scenarios
4. Add assertions
5. Handle flaky tests`,

    deployment: `### Deployment Workflow
1. Build application
2. Run pre-deployment tests
3. Apply migrations
4. Deploy to target environment
5. Verify health checks
6. Monitor logs`,

    state: `### State Management
1. Define state shape
2. Create stores/slices
3. Implement actions
4. Add selectors
5. Connect to components
6. Test state changes`
  };

  return workflows[domain] || '### Generic Workflow\n1. Analyze requirements\n2. Implement solution\n3. Test thoroughly\n4. Document changes';
}

/**
 * Get domain-specific file patterns
 * @param {string} domain - Domain name
 * @param {Array<string>} techStack - Tech stack
 * @returns {string} File patterns description
 */
function getDomainFilePatterns(domain, techStack) {
  const patterns = {
    frontend: `- \`src/components/**/*\` - UI components
- \`src/pages/**/*\` - Page components
- \`src/hooks/**/*\` - Custom hooks
- \`src/styles/**/*\` - Stylesheets`,

    backend: `- \`backend/routers/**/*\` - API routes
- \`backend/services/**/*\` - Business logic
- \`backend/models/**/*\` - Data models
- \`backend/middleware/**/*\` - Middleware`,

    database: `- \`prisma/schema.prisma\` - Prisma schema
- \`migrations/**/*\` - Database migrations
- \`backend/models/**/*\` - ORM models
- \`backend/repositories/**/*\` - Data access layer`,

    testing: `- \`tests/**/*\` - Test files
- \`e2e/**/*\` - E2E tests
- \`__tests__/**/*\` - Unit tests
- \`*.test.ts\` - Test files`,

    deployment: `- \`.github/workflows/**/*\` - CI/CD workflows
- \`Dockerfile\` - Container definition
- \`docker-compose.yml\` - Multi-container setup
- \`deploy/**/*\` - Deployment scripts`,

    state: `- \`src/store/**/*\` - State stores
- \`src/slices/**/*\` - Redux slices
- \`src/context/**/*\` - Context providers`
  };

  return patterns[domain] || '- Project-specific files';
}

/**
 * Get domain-specific common patterns
 * @param {string} domain - Domain name
 * @param {Array<string>} techStack - Tech stack
 * @returns {string} Common patterns
 */
function getDomainCommonPatterns(domain, techStack) {
  if (techStack.length === 0) {
    return 'See documentation for common patterns.';
  }

  const primaryTech = techStack[0].toLowerCase();

  // Return tech-specific patterns based on domain
  if (domain === 'frontend' && primaryTech === 'react') {
    return `### React Component
\`\`\`typescript
import React from 'react';

interface Props {
  title: string;
}

export const Component: React.FC<Props> = ({ title }) => {
  return <div>{title}</div>;
};
\`\`\``;
  }

  if (domain === 'backend' && primaryTech === 'fastapi') {
    return `### FastAPI Endpoint
\`\`\`python
@router.get("/{id}", response_model=Response)
async def get_item(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    item = await service.get(db, id)
    if not item:
        raise HTTPException(status_code=404)
    return item
\`\`\``;
  }

  return 'See framework documentation for common patterns.';
}

/**
 * Get domain-specific quality checks
 * @param {string} domain - Domain name
 * @returns {string} Quality checks
 */
function getDomainQualityChecks(domain) {
  const checks = {
    frontend: `1. **Lint**: Run ESLint/Prettier
2. **Type Check**: TypeScript compilation
3. **Tests**: Component tests pass
4. **Build**: Production build succeeds
5. **Accessibility**: a11y checks pass`,

    backend: `1. **Lint**: Run linter for language
2. **Type Check**: Static type checking
3. **Tests**: Unit/integration tests pass
4. **API Docs**: OpenAPI/Swagger updated
5. **Migrations**: Database migrations valid`,

    database: `1. **Schema Valid**: Schema compiles
2. **Migration**: Migration runs successfully
3. **Rollback**: Rollback migration works
4. **Indexes**: Required indexes present
5. **Constraints**: Data integrity enforced`,

    testing: `1. **Tests Pass**: All tests passing
2. **Coverage**: Coverage meets threshold
3. **No Flakes**: Tests are deterministic
4. **Performance**: Tests run efficiently
5. **Reporting**: Test reports generated`,

    deployment: `1. **Build**: Application builds successfully
2. **Tests**: Pre-deployment tests pass
3. **Deploy**: Deployment completes
4. **Health**: Health checks pass
5. **Monitoring**: Monitoring enabled`,

    state: `1. **Tests**: State tests pass
2. **Type Safety**: Types are correct
3. **Persistence**: State persists correctly
4. **Performance**: No unnecessary re-renders
5. **DevTools**: State visible in devtools`
  };

  return checks[domain] || '1. Code compiles\n2. Tests pass\n3. Documentation updated';
}

/**
 * Get domain-specific tools
 * @param {string} domain - Domain name
 * @returns {Array<string>} Tool names
 */
function getDomainTools(domain) {
  const tools = {
    frontend: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    backend: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    database: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    testing: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    deployment: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    state: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash']
  };

  return tools[domain] || ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'];
}

/**
 * Update an existing agent with new capabilities
 * @param {string} agentPath - Path to agent file
 * @param {Array<string>} newCapabilities - New capabilities to add
 * @returns {Object} Result { success: boolean, error?: string }
 */
export function updateExistingAgent(agentPath, newCapabilities) {
  try {
    if (!fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent not found: ${agentPath}`
      };
    }

    const content = fs.readFileSync(agentPath, 'utf8');

    // Find capabilities section
    const capabilitiesMatch = content.match(/## Capabilities\n\n([\s\S]*?)\n\n##/);

    if (!capabilitiesMatch) {
      return {
        success: false,
        error: 'Could not find Capabilities section in agent file'
      };
    }

    const existingCapabilities = capabilitiesMatch[1];
    const newCapabilitiesText = newCapabilities
      .filter(cap => !existingCapabilities.includes(cap))
      .map(cap => `- ${cap}`)
      .join('\n');

    if (newCapabilitiesText.length === 0) {
      return {
        success: true,
        message: 'No new capabilities to add'
      };
    }

    const updatedContent = content.replace(
      /## Capabilities\n\n([\s\S]*?)\n\n##/,
      `## Capabilities\n\n$1\n${newCapabilitiesText}\n\n##`
    );

    fs.writeFileSync(agentPath, updatedContent, 'utf8');

    return {
      success: true,
      addedCapabilities: newCapabilities.filter(cap => !existingCapabilities.includes(cap))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Register agent with a vision
 * @param {string} agentName - Agent name
 * @param {string} visionSlug - Vision slug
 * @param {string} projectRoot - Project root directory
 * @param {string} domain - Agent domain
 * @returns {Object} Result { success: boolean, error?: string }
 */
export async function registerAgent(agentName, visionSlug, projectRoot, domain = 'general') {
  try {
    const result = await updateVision(projectRoot, visionSlug, (vision) => {
      addCreatedAgent(vision, {
        name: agentName,
        domain
      });
      return vision;
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      vision: result.vision
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Allocate token budget to an agent
 * @param {Object} agent - Agent details { name, domain }
 * @param {number} tokenBudget - Total token budget
 * @param {string} level - Agent level (L1, L2, L3)
 * @returns {Object} Allocation { allocated: number, remaining: number }
 */
export function allocateAgentContext(agent, tokenBudget, level = 'L2') {
  const allocations = {
    L1: 0.5, // Orchestrators get 50% of budget
    L2: 0.3, // Specialists get 30%
    L3: 0.1  // Workers get 10%
  };

  const percentage = allocations[level] || 0.3;
  const allocated = Math.floor(tokenBudget * percentage);
  const remaining = tokenBudget - allocated;

  return {
    allocated,
    remaining,
    percentage: percentage * 100,
    level
  };
}

/**
 * Find best agent for a domain
 * @param {string} domain - Domain to search for
 * @param {string} projectRoot - Project root directory
 * @returns {string|null} Agent name or null if not found
 */
export function getAgentForDomain(domain, projectRoot) {
  try {
    const agentsDir = path.join(projectRoot, '.claude', 'agents');

    if (!fs.existsSync(agentsDir)) {
      return null;
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

    // Look for domain-specific agent
    const domainPattern = DOMAIN_PATTERNS[domain];
    if (!domainPattern) {
      return null;
    }

    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];

        // Check if domain matches
        if (frontmatter.includes(`domain: ${domain}`)) {
          const nameMatch = frontmatter.match(/name: (.+)/);
          if (nameMatch) {
            return nameMatch[1].trim();
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error finding agent for domain ${domain}:`, error.message);
    return null;
  }
}

/**
 * Decommission an agent
 * @param {string} agentName - Agent name to remove
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Result { success: boolean, archived?: string, error?: string }
 */
export function decommissionAgent(agentName, projectRoot) {
  try {
    const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');
    const agentPath = path.join(projectRoot, '.claude', 'agents', `${agentSlug}.md`);

    if (!fs.existsSync(agentPath)) {
      return {
        success: false,
        error: `Agent not found: ${agentName}`
      };
    }

    // Create archive directory
    const archiveDir = path.join(projectRoot, '.claude', 'agents', 'archived');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Archive the agent with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `${agentSlug}-${timestamp}.md`);

    // Copy to archive
    const content = fs.readFileSync(agentPath, 'utf8');
    fs.writeFileSync(archivePath, content, 'utf8');

    // Remove original
    fs.unlinkSync(agentPath);

    return {
      success: true,
      archived: archivePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all agents in project
 * @param {string} projectRoot - Project root directory
 * @returns {Array<Object>} Agent list
 */
export function listAgents(projectRoot) {
  try {
    const agentsDir = path.join(projectRoot, '.claude', 'agents');

    if (!fs.existsSync(agentsDir)) {
      return [];
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    const agents = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const nameMatch = frontmatter.match(/name: (.+)/);
        const domainMatch = frontmatter.match(/domain: (.+)/);
        const levelMatch = frontmatter.match(/level: (.+)/);

        agents.push({
          name: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
          domain: domainMatch ? domainMatch[1].trim() : 'unknown',
          level: levelMatch ? levelMatch[1].trim() : 'L2',
          file
        });
      }
    }

    return agents;
  } catch (error) {
    console.error('Error listing agents:', error.message);
    return [];
  }
}

/**
 * Create agent registry for a project
 * @param {string} projectRoot - Project root directory
 * @param {Object} techStack - Tech stack configuration
 * @returns {Object} Agent registry
 */
export function createAgentRegistry(projectRoot, techStack) {
  const agents = [];
  const domains = ['frontend', 'backend', 'database', 'testing', 'deployment', 'state'];

  for (const domain of domains) {
    const domainTech = techStack[domain];
    if (domainTech) {
      const techArray = Array.isArray(domainTech) ? domainTech : [domainTech];
      const agentName = getAgentForDomain(domain, projectRoot);

      if (agentName) {
        agents.push({
          name: agentName,
          domain,
          techStack: techArray,
          available: true
        });
      }
    }
  }

  return {
    agents,
    count: agents.length,
    created: new Date().toISOString()
  };
}

export default {
  createSpecializedAgent,
  generateAgentTemplate,
  updateExistingAgent,
  registerAgent,
  allocateAgentContext,
  getAgentForDomain,
  decommissionAgent,
  listAgents,
  createAgentRegistry,
  DOMAIN_PATTERNS
};
