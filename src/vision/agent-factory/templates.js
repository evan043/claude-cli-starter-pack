/**
 * Vision Mode Agent Factory - Template Generation
 *
 * Pure functions for generating agent templates and domain-specific configurations.
 * No external dependencies, no file I/O.
 */

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
 * Generate agent name from domain and tech stack
 * @param {string} domain - Domain name
 * @param {Array<string>} techStack - Technologies
 * @returns {string} Generated agent name
 */
export function generateAgentName(domain, techStack) {
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

${capabilities.length > 0 ? capabilities.map(c => `- ${c}`).join('\n') : `- Deep domain expertise in ${  domain}`}
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
export function getTechStackDescription(domain, techStack) {
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
export function getDomainWorkflows(domain) {
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
export function getDomainFilePatterns(domain, techStack) {
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
export function getDomainCommonPatterns(domain, techStack) {
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
export function getDomainQualityChecks(domain) {
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
export function getDomainTools(domain) {
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
