# Agents

CCASP provides a sophisticated L1/L2/L3 agent hierarchy for autonomous task execution within Claude Code CLI.

## Agent Hierarchy

```
┌─────────────────────────────────────────────┐
│           L1 ORCHESTRATOR                   │
│  • Coordinates overall task                 │
│  • Delegates to specialists                 │
│  • Maintains context across subtasks        │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ L2 SPECIALIST │   │ L2 SPECIALIST │
│ • Domain expert│   │ • Domain expert│
│ • Focused task │   │ • Focused task │
└───────┬───────┘   └───────┬───────┘
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   L3 WORKER   │   │   L3 WORKER   │
│ • Single task │   │ • Single task │
│ • Fast exec   │   │ • Fast exec   │
└───────────────┘   └───────────────┘
```

### L1 Orchestrator

- **Purpose**: High-level coordination and planning
- **Scope**: Entire feature or complex task
- **Model**: Typically uses more capable model (opus/sonnet)
- **Creates**: Sub-tasks for L2 specialists

### L2 Specialist

- **Purpose**: Domain-specific expertise
- **Scope**: Single domain (frontend, backend, testing, etc.)
- **Model**: Standard model (sonnet)
- **Creates**: Specific tasks for L3 workers

### L3 Worker

- **Purpose**: Execute single, focused tasks
- **Scope**: One file, one function, one test
- **Model**: Fast model (haiku) for simple tasks
- **Creates**: Nothing - executes and returns

## Creating Agents

### Using the Slash Command

Inside Claude Code CLI:
```
/create-agent
```

This launches an interactive wizard to create:
- L1 Orchestrator agents
- L2 Specialist agents
- L3 Worker agents
- RAG pipelines (L1 + multiple L2s)

### Using the Terminal Command

```bash
ccasp create-agent
```

### Agent Definition Format

Agents are defined in `.claude/agents/` as markdown files:

```markdown
---
name: frontend-specialist
type: L2
model: sonnet
description: Frontend development specialist for React/TypeScript
---

# Frontend Specialist Agent

## Expertise
- React 19 components and hooks
- TypeScript type safety
- Tailwind CSS styling
- State management (Zustand)

## Tools Available
- Read, Write, Edit (file operations)
- Bash (npm commands)
- Glob, Grep (search)

## Behavior
1. Always check existing patterns before creating new code
2. Use project's established conventions
3. Run type checks after modifications
4. Suggest tests for new components

## Context Files
- src/components/**/*.tsx
- src/hooks/**/*.ts
- src/types/**/*.ts
```

## Agent Types

### Task Agents (Standard)

Execute specific tasks and return results:

```markdown
---
name: test-runner
type: L3
model: haiku
---

# Test Runner Agent

Run tests and report results.

## Behavior
1. Execute: npm test
2. Parse output for failures
3. Return summary with file:line for failures
```

### RAG Pipeline Agents

Multi-agent systems with context retrieval:

```markdown
---
name: feature-implementer
type: RAG-Pipeline
model: sonnet
---

# Feature Implementation Pipeline

## L1 Orchestrator
Coordinates feature implementation across domains.

## L2 Specialists
- frontend-specialist: UI components
- backend-specialist: API endpoints
- test-specialist: Test coverage

## RAG Sources
- .claude/docs/architecture.md
- .claude/docs/patterns.md
- CLAUDE.md
```

### Phased Development Agents

Special agents for phased task execution:

```markdown
---
name: phase-executor
type: Phase-Dev
project: feature-name
---

# Phase Executor

Executes phases defined in PROGRESS.json.

## Phase Tracking
- Reads: .claude/phase-dev/feature-name/PROGRESS.json
- Updates: Status on completion
- Validates: Success criteria before marking done
```

## Using Agents

### Invoke via Task Tool

```
Use the Task tool with subagent_type="frontend-specialist"
```

### Invoke via Slash Command

```
/create-agent
# Select "Invoke existing agent"
# Choose agent from list
```

### Programmatic Invocation

In your slash commands:
```markdown
## Implementation

1. Deploy frontend-specialist agent for UI work
2. Deploy backend-specialist agent for API work
3. Deploy test-specialist agent for test coverage
```

## Best Practices

### 1. Single Responsibility

Each agent should have one clear purpose:
- ✅ `test-runner` - runs tests
- ✅ `type-checker` - checks TypeScript
- ❌ `test-and-lint-and-build` - too many responsibilities

### 2. Clear Context

Define what files/patterns the agent should focus on:
```markdown
## Context Files
- src/api/**/*.ts       # API layer
- src/services/**/*.ts  # Service layer
```

### 3. Specify Model Appropriately

| Task Complexity | Model | Use Case |
|----------------|-------|----------|
| Simple, fast | haiku | File operations, simple edits |
| Standard | sonnet | Most development tasks |
| Complex planning | opus | Architecture, complex decisions |

### 4. Define Success Criteria

```markdown
## Success Criteria
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Coverage > 80%
```

## Example Agents

### Code Reviewer

```markdown
---
name: code-reviewer
type: L2
model: sonnet
---

# Code Reviewer Agent

## Purpose
Review code changes for quality and best practices.

## Checks
1. Code style consistency
2. Error handling
3. Type safety
4. Performance concerns
5. Security issues

## Output Format
Return markdown with:
- Summary
- Issues found (with severity)
- Suggestions
```

### Documentation Generator

```markdown
---
name: doc-generator
type: L3
model: haiku
---

# Documentation Generator

## Purpose
Generate JSDoc/TSDoc comments for functions.

## Behavior
1. Read function signature
2. Infer parameter types and purposes
3. Generate comprehensive documentation
4. Preserve existing comments if better
```

### Database Migration Expert

```markdown
---
name: migration-expert
type: L2
model: sonnet
---

# Database Migration Expert

## Expertise
- PostgreSQL schemas
- Prisma migrations
- Data integrity

## Behavior
1. Analyze current schema
2. Design migration steps
3. Generate rollback plan
4. Validate foreign keys
```

## Troubleshooting

### Agent Not Found

Ensure the agent file exists in `.claude/agents/` and has correct frontmatter.

### Agent Not Executing

Check that:
1. Claude Code CLI was restarted after creating agent
2. Agent file has valid markdown structure
3. Model specified is available

### Context Too Large

Reduce the scope of Context Files or split into multiple specialized agents.

## See Also

- [Hooks](Hooks) - Trigger agents automatically
- [Skills](Skills) - RAG-enhanced capabilities
- [Phased Development](Phased-Development) - Multi-phase execution
