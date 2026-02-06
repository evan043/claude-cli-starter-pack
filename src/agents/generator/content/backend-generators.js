/**
 * Backend-focused agent content generators (backend, database, deployment)
 */

/**
 * Backend agent content generator
 */
export function getBackendAgentContent(agent, _techStack) {
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

- Maximum ${agent.maxTokens || 8000} tokens
- Follow existing API conventions
- Include proper error handling
- Document new endpoints
`;
}

/**
 * Database agent content generator
 */
export function getDatabaseAgentContent(agent, _techStack) {
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
 * Deployment agent content generator
 */
export function getDeploymentAgentContent(agent, _techStack) {
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
