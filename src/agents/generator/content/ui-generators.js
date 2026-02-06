/**
 * UI-focused agent content generators (frontend, state management)
 */

/**
 * Frontend agent content generator
 */
export function getFrontendAgentContent(agent, techStack) {
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
 * State management agent content generator
 */
export function getStateAgentContent(agent, _techStack) {
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
