---
name: rag-agent-creator
description: Create RAG-enhanced Claude Code agents with structured knowledge bases, retrieval strategies, and domain expertise
---

# RAG Agent Creator Skill

Expert-level RAG (Retrieval-Augmented Generation) agent creation for Claude Code CLI.

## When to Use This Skill

This skill is automatically invoked when:

- Creating agents that need domain-specific expertise
- Setting up knowledge bases for agent reference
- Designing retrieval strategies for agent context
- Building multi-source knowledge systems

## What is RAG for Claude Code?

RAG (Retrieval-Augmented Generation) agents combine:

1. **Retrieval** - Find relevant context from knowledge base
2. **Augmentation** - Inject context into agent prompt
3. **Generation** - Agent produces informed responses

### When to Add RAG Capabilities

Add RAG when your agent needs:

- **Domain-specific expertise** - Specialized knowledge
- **Large knowledge base** - Multiple docs, patterns, examples
- **Consistent retrieval** - Predictable keyword-to-file mappings
- **Protocol-based workflows** - Documented procedures

## RAG Directory Structure

```
.claude/skills/{agent-name}/
  skill.md                    # Main skill definition
  context/                    # Knowledge base
    README.md                 # Knowledge index
    PROTOCOL.md              # Agent protocols (optional)
    architecture/            # Architecture docs
    patterns/                # Code/workflow patterns
    examples/                # Example implementations
    rag/                     # RAG-specific config
      README.md              # Retrieval strategy
      RETRIEVAL_MATRIX.md    # Keyword mappings
  workflows/
    README.md
    rag-orchestrator-agent.md      # RAG coordination
    rag-implementation-agent.md    # RAG implementation
```

## Knowledge Base Design

### Key Principles

1. **Atomic Files** - One concept per file for precise retrieval
2. **Clear Naming** - Descriptive names (e.g., `basetab-pattern.md`)
3. **Indexed** - Maintain README.md with file descriptions
4. **Cross-Referenced** - Link related documents

### Example Knowledge Organization

```
context/
  README.md                    # Index: lists all files
  PROTOCOL.md                 # Core rules for agent

  architecture/
    README.md                 # Architecture overview
    database-schema.md        # Database structure
    api-design.md            # API patterns

  patterns/
    README.md                 # Pattern index
    error-handling.md        # Error patterns
    validation.md            # Input validation
    caching.md               # Cache strategies

  examples/
    README.md                 # Example index
    feature-implementation.md # Complete feature
    api-endpoint.md          # API example
    test-suite.md            # Testing example
```

## Retrieval Patterns

### Pattern 1: Keyword Matching

Map keywords to specific knowledge files:

```markdown
## Retrieval Matrix

| Keyword Pattern | Files to Load | Priority |
|-----------------|---------------|----------|
| "authentication" | `patterns/auth.md`, `examples/auth.md` | High |
| "database" | `architecture/database.md`, `patterns/repository.md` | Medium |
| "testing" | `patterns/testing.md`, `examples/test-example.md` | High |
| "error" | `patterns/error-handling.md` | Medium |
```

### Pattern 2: Hierarchical Retrieval

Start specific, broaden if needed:

1. Load specific pattern file (e.g., `patterns/auth.md`)
2. If insufficient, load architecture file (e.g., `architecture/security.md`)
3. If still needed, load examples (e.g., `examples/auth-implementation.md`)

### Pattern 3: Category-Based

Group knowledge by domain:

```markdown
## Categories

### Backend
- `architecture/api-design.md`
- `patterns/repository.md`
- `patterns/service-layer.md`

### Frontend
- `architecture/component-structure.md`
- `patterns/state-management.md`
- `patterns/form-handling.md`

### Testing
- `patterns/unit-testing.md`
- `patterns/e2e-testing.md`
- `examples/test-suite.md`
```

### Pattern 4: Priority-Based

Load based on task importance:

```markdown
## Priority Levels

### Always Load (P1)
- `PROTOCOL.md` - Core rules
- `architecture/README.md` - Overview

### Load for Implementation (P2)
- Relevant `patterns/*.md`
- Relevant `architecture/*.md`

### Load for Examples (P3)
- `examples/*.md` - When needed
```

## Creating a RAG Agent

### Step 1: Define Knowledge Domain

What expertise does this agent need?

```markdown
## Domain: E-commerce Backend

### Topics Covered
- Product management
- Order processing
- Inventory tracking
- Payment integration
- User authentication
```

### Step 2: Create Knowledge Structure

```bash
mkdir -p .claude/skills/my-agent/context/{architecture,patterns,examples,rag}
```

### Step 3: Write Knowledge Files

Each file should be self-contained:

```markdown
# Pattern: Repository

## Purpose
Encapsulate data access logic.

## Implementation
[Code examples]

## When to Use
[Scenarios]

## Anti-patterns
[What to avoid]
```

### Step 4: Create Index (README.md)

```markdown
# Knowledge Base Index

## Architecture
| File | Description |
|------|-------------|
| `database.md` | Database schema and relationships |
| `api-design.md` | REST API conventions |

## Patterns
| File | Description |
|------|-------------|
| `repository.md` | Data access layer pattern |
| `service.md` | Business logic layer |

## Examples
| File | Description |
|------|-------------|
| `crud-endpoint.md` | Complete CRUD example |
```

### Step 5: Define Retrieval Strategy

Create `context/rag/RETRIEVAL_MATRIX.md`:

```markdown
# Retrieval Matrix

## Keyword Mappings

| User Says | Load Files | Priority |
|-----------|------------|----------|
| "add endpoint" | `patterns/api-design.md`, `examples/crud-endpoint.md` | High |
| "database query" | `architecture/database.md`, `patterns/repository.md` | High |
| "fix bug" | `patterns/error-handling.md`, `patterns/debugging.md` | Medium |
```

### Step 6: Create Skill Definition

```markdown
---
name: my-rag-agent
description: Domain expert for [area]
---

# My RAG Agent

## Knowledge Base

This agent has access to:
- Architecture documentation
- Implementation patterns
- Working examples

## Retrieval Strategy

1. Parse user request for keywords
2. Load matching knowledge files
3. Apply to current context
4. Generate informed response

## Available Knowledge

See `context/README.md` for full index.
```

## Best Practices

### Knowledge Quality

1. **Keep files focused** - One concept per file
2. **Include examples** - Show, don't just tell
3. **Update regularly** - Keep knowledge current
4. **Test retrieval** - Verify keyword mappings work

### Retrieval Efficiency

1. **Optimize index** - Fast keyword lookup
2. **Limit context** - Don't overload with irrelevant info
3. **Prioritize** - Most relevant first
4. **Cache common patterns** - Speed up frequent retrievals

### Maintenance

1. **Review quarterly** - Audit knowledge accuracy
2. **Remove stale docs** - Delete outdated information
3. **Add new patterns** - Capture learnings
4. **Track usage** - Monitor which files are used

## RAG Agent Checklist

- [ ] Knowledge domain defined
- [ ] Context directory structure created
- [ ] README.md with knowledge index
- [ ] PROTOCOL.md with retrieval rules (if needed)
- [ ] Retrieval matrix documented
- [ ] Examples included
- [ ] skill.md references context files
- [ ] Workflows defined (orchestrator + implementation)
- [ ] Tested with sample queries

## References

- Agent Creator: `.claude/skills/agent-creator/`
- Claude Code Docs: https://docs.anthropic.com/en/docs/claude-code
- Skills System: `.claude/skills/README.md`
