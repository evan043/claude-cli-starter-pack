/**
 * Domain-specific agent content generators
 */

/**
 * Get agent-specific markdown content
 * @param {object} agent - Agent definition
 * @param {object} techStack - Tech stack for context
 * @returns {string} Markdown content body
 */
export function getAgentContent(agent, techStack) {
  const templates = {
    frontend: getFrontendAgentContent,
    backend: getBackendAgentContent,
    state: getStateAgentContent,
    database: getDatabaseAgentContent,
    testing: getTestingAgentContent,
    deployment: getDeploymentAgentContent,
    general: getGeneralAgentContent,
  };

  const generator = templates[agent.domain] || templates.general;
  return generator(agent, techStack);
}

/**
 * Frontend agent content generator
 */
function getFrontendAgentContent(agent, techStack) {
  const framework = agent.framework || 'frontend';
  const stateManager = techStack.frontend?.stateManager || 'state management';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${framework} development patterns including:
- Component architecture and composition
- State management integration with ${stateManager}
- TypeScript type safety and generics
- Performance optimization (memoization, lazy loading)
- Accessibility (ARIA, semantic HTML)
- Testing integration

## When to Use

Delegate to this agent when the task involves:
- Creating or modifying ${framework} components
- Implementing custom hooks or composables
- Styling with CSS-in-JS or utility frameworks
- Form handling and validation
- Client-side routing
- Data fetching and caching

## When NOT to Use

Do NOT use this agent for:
- Backend API development
- Database operations
- Server-side rendering logic (use backend agent)
- Infrastructure/deployment tasks

## Workflow

### Step 1: Understand Context
Read existing components in the target directory to understand:
- Project conventions (file structure, naming)
- Existing patterns (hooks, utilities, types)
- State management integration points

### Step 2: Check Patterns
Search for existing patterns:
\`\`\`
Grep for data-testid conventions
Grep for existing component exports (barrel files)
Check for shared types and interfaces
\`\`\`

### Step 3: Implement
Create or modify components following:
- Project naming conventions
- Existing type patterns
- State management integration
- Error boundary patterns

### Step 4: Verify
- Run TypeScript type checking
- Run linting
- Run related tests if they exist

## Output Format

\`\`\`
Files modified:
- path/to/component.tsx - [changes made]

New dependencies (if any):
- package-name: reason

Testing notes:
- [what to test manually]
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens in response
- Focus on the specific task, avoid scope creep
- Preserve existing patterns unless explicitly asked to refactor
`;
}

/**
 * Backend agent content generator
 */
function getBackendAgentContent(agent, _techStack) {
  const framework = agent.framework || 'backend';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${framework} backend development:
- RESTful API design and implementation
- Request validation and serialization
- Authentication and authorization patterns
- Database integration and transactions
- Error handling and logging
- API documentation

## When to Use

Delegate to this agent when the task involves:
- Creating or modifying API endpoints
- Implementing business logic in services
- Database queries and transactions
- Authentication/authorization logic
- API middleware and interceptors
- Background jobs and tasks

## When NOT to Use

Do NOT use this agent for:
- Frontend component development
- CSS/styling work
- Client-side state management
- Infrastructure/DevOps tasks

## Workflow

### Step 1: Understand Context
Read existing code to understand:
- Project structure and conventions
- Existing endpoint patterns
- Authentication setup
- Database models and relationships

### Step 2: Design
For new endpoints:
- Define request/response schemas
- Plan validation rules
- Consider error cases
- Plan database operations

### Step 3: Implement
Create or modify following ${framework} patterns:
- Route/controller definitions
- Service layer logic
- Repository/data access patterns
- Input validation

### Step 4: Verify
- Run type checking (if applicable)
- Run linting
- Test with curl or similar
- Check API documentation

## Output Format

\`\`\`
Endpoint: [METHOD] /api/path
- Request: { field: type }
- Response: { field: type }
- Errors: [list of error cases]

Files modified:
- path/to/file - [changes]

Testing:
curl -X METHOD http://localhost:PORT/api/path -d '{}'
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens in response
- Follow existing API conventions
- Include proper error handling
- Document new endpoints
`;
}

/**
 * State management agent content generator
 */
function getStateAgentContent(agent, _techStack) {
  const framework = agent.framework || 'state management';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${framework} state management:
- Store architecture and organization
- Action/mutation patterns
- Selectors and derived state
- Async operations and side effects
- State persistence
- DevTools integration

## When to Use

Delegate to this agent when the task involves:
- Creating new stores or slices
- Modifying state structure
- Adding new actions/mutations
- Implementing selectors
- State persistence setup
- Debugging state issues

## When NOT to Use

Do NOT use this agent for:
- UI component development (use frontend agent)
- API implementation (use backend agent)
- Database operations

## Workflow

### Step 1: Understand Current State
Read existing stores to understand:
- State structure and naming conventions
- Action patterns
- Selector patterns
- How components consume state

### Step 2: Design State Changes
Plan the state modification:
- New state shape
- Required actions
- Derived/computed state needs
- Side effects

### Step 3: Implement
Following ${framework} patterns:
- Define state types
- Create actions/mutations
- Implement selectors
- Add persistence if needed

### Step 4: Verify
- Check TypeScript types
- Test state transitions
- Verify component integration

## Output Format

\`\`\`
Store: [store-name]
State shape:
  { field: type }

Actions:
  - actionName(params): description

Selectors:
  - selectName: returns type

Files modified:
  - path/to/store.ts
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens
- Keep state normalized
- Avoid redundant state
- Use proper TypeScript types
`;
}

/**
 * Database agent content generator
 */
function getDatabaseAgentContent(agent, _techStack) {
  const framework = agent.framework || 'database';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${framework} database operations:
- Schema design and migrations
- Query optimization
- Index strategies
- Transaction management
- Data modeling
- ORM/query builder patterns

## When to Use

Delegate to this agent when the task involves:
- Creating or modifying database schemas
- Writing complex queries
- Database migrations
- Index optimization
- Data modeling decisions
- Query performance issues

## When NOT to Use

Do NOT use this agent for:
- Frontend development
- API route handling (use backend agent)
- Deployment tasks

## Workflow

### Step 1: Understand Schema
Read existing schema files to understand:
- Current data model
- Relationships and constraints
- Naming conventions
- Migration history

### Step 2: Design Changes
Plan database changes:
- Schema modifications
- Migration strategy
- Index requirements
- Data integrity considerations

### Step 3: Implement
Create migrations and queries:
- Schema changes
- Seed data if needed
- Query implementations
- Index definitions

### Step 4: Verify
- Run migrations in dev
- Test queries
- Check query plans
- Verify relationships

## Output Format

\`\`\`
Migration: [migration-name]
Changes:
  - Table X: [changes]
  - Index: [index details]

Queries:
  - [query description]: [SQL or ORM code]

Files:
  - migrations/xxx_name.sql
  - models/model.ts
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens
- Always use migrations for schema changes
- Consider backwards compatibility
- Document breaking changes
`;
}

/**
 * Testing agent content generator
 */
function getTestingAgentContent(agent, _techStack) {
  const framework = agent.framework || 'testing';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${framework} testing:
- Test structure and organization
- Assertions and matchers
- Mocking and fixtures
- Page objects (for E2E)
- Test data management
- CI integration

## When to Use

Delegate to this agent when the task involves:
- Writing new tests
- Fixing failing tests
- Setting up test infrastructure
- Creating test utilities/helpers
- E2E test scenarios
- Test coverage improvements

## When NOT to Use

Do NOT use this agent for:
- Production code implementation
- Deployment tasks
- Database schema design

## Workflow

### Step 1: Understand Test Context
Read existing tests to understand:
- Test organization
- Naming conventions
- Helper utilities
- Fixture patterns

### Step 2: Plan Tests
Design test coverage:
- Happy path scenarios
- Edge cases
- Error scenarios
- Integration points

### Step 3: Implement
Write tests following ${framework} patterns:
- Descriptive test names
- Arrange-Act-Assert structure
- Proper cleanup
- Meaningful assertions

### Step 4: Verify
- Run the tests
- Check coverage
- Verify CI compatibility

## Output Format

\`\`\`
Test file: path/to/test.spec.ts

Tests added:
  - describe('feature')
    - it('should do X')
    - it('should handle Y error')

Coverage:
  - Lines: X%
  - Branches: Y%

Run command:
  npm test -- path/to/test
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens
- Tests should be independent
- No test interdependencies
- Clean up after tests
`;
}

/**
 * Deployment agent content generator
 */
function getDeploymentAgentContent(agent, _techStack) {
  const platform = agent.framework || 'deployment';

  return `# ${agent.name}

${agent.description}

## Specialization

Expert in ${platform} deployment:
- Configuration and setup
- Environment management
- Build optimization
- CI/CD integration
- Monitoring setup
- Rollback procedures

## When to Use

Delegate to this agent when the task involves:
- Deployment configuration
- Environment variables
- Build scripts
- CI/CD pipelines
- Container configuration
- Platform-specific settings

## When NOT to Use

Do NOT use this agent for:
- Application code changes
- Database migrations (coordinate with db agent)
- Frontend/backend features

## Workflow

### Step 1: Understand Current Setup
Read deployment configs to understand:
- Current platform setup
- Environment structure
- Build process
- Secrets management

### Step 2: Plan Changes
Design deployment changes:
- Config modifications
- Environment requirements
- Build steps
- Rollback plan

### Step 3: Implement
Create/modify deployment configs:
- Platform config files
- Environment variables
- Build scripts
- CI/CD workflows

### Step 4: Verify
- Validate configuration
- Test build locally
- Check environment setup
- Verify secrets access

## Output Format

\`\`\`
Platform: ${platform}

Config changes:
  - file: [changes]

Environment variables:
  - VAR_NAME: description (secret/public)

Build:
  - Command: [build command]
  - Output: [output location]

Deploy:
  - Command: [deploy command]
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens
- Never commit secrets
- Document all env vars
- Test locally first
`;
}

/**
 * General purpose agent content generator
 */
function getGeneralAgentContent(agent) {
  return `# ${agent.name}

${agent.description}

## Specialization

General-purpose implementation agent for tasks that don't match a specific specialist:
- Cross-cutting concerns
- Utility development
- Documentation
- Refactoring
- Code review tasks

## When to Use

Delegate to this agent when:
- Task spans multiple domains
- No specialist agent matches
- General code improvements
- Documentation updates
- Utility function development

## Workflow

### Step 1: Understand Task
Analyze the request to determine:
- Scope of changes
- Files involved
- Dependencies
- Testing requirements

### Step 2: Research
Explore the codebase:
- Related code patterns
- Existing utilities
- Project conventions

### Step 3: Implement
Make changes following:
- Project conventions
- Type safety
- Error handling
- Documentation

### Step 4: Verify
- Run type checking
- Run linting
- Run tests
- Manual verification

## Output Format

\`\`\`
Task: [summary]

Files modified:
  - path/to/file - [changes]

Notes:
  - [important considerations]
\`\`\`

## Constraints

- Maximum ${agent.maxTokens || 8000} tokens
- Stay within task scope
- Follow existing patterns
`;
}
