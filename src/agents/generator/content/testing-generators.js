/**
 * Testing and general-purpose agent content generators
 */

/**
 * Testing agent content generator
 */
export function getTestingAgentContent(agent, _techStack) {
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
 * General purpose agent content generator
 */
export function getGeneralAgentContent(agent) {
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
