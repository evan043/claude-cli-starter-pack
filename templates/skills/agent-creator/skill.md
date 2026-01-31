---
name: agent-creator
description: Create Claude Code CLI agents (subagents) following best practices - proper Task tool configuration, agent specialization, workflow integration, and RAG-enhanced knowledge bases
---

# Agent Creator Skill

Expert-level Claude Code agent creation following official Anthropic best practices.

## When to Use This Skill

This skill is automatically invoked when:

- Creating new specialized agents/subagents
- Designing agent workflows
- Configuring agent tool access
- Setting up multi-agent coordination

## Agent Architecture Overview

### What are Claude Code Agents?

Agents (subagents) are specialized Claude instances launched via the `Task` tool to handle complex, multi-step tasks autonomously. They:

- Run in isolated contexts with specific tool access
- Execute tasks without interrupting main conversation
- Return results upon completion
- Can run in parallel for independent tasks

### Agent Types

| Agent Type | Description | Tools |
|------------|-------------|-------|
| `general-purpose` | Research, search, multi-step tasks | All tools |
| `Explore` | Fast codebase exploration | All except Edit, Write |
| `Plan` | Planning and discovery | All except Edit, Write |
| `Bash` | Command execution specialist | Bash only |

## Creating Custom Agents

### Skill-Based Agents

Agents defined as skills live in `.claude/skills/{skill-name}/`:

```
.claude/skills/
  my-agent/
    skill.md              # Main skill definition (YAML frontmatter)
    context/              # Agent context files
      README.md
      patterns.md
      examples.md
    workflows/            # Sub-workflows
      README.md
      sub-task-1.md
      sub-task-2.md
```

### skill.md Format

```markdown
---
name: my-agent
description: Brief description shown in skill list
---

# Agent Title

Detailed agent instructions, patterns, and capabilities.

## When to Use This Agent

List specific scenarios when this agent should be invoked.

## Capabilities

- What this agent can do
- Tools it has access to
- Patterns it follows

## Workflow

Step-by-step process the agent follows.

## Output Format

What the agent returns upon completion.
```

## Agent Design Patterns

### Pattern 1: Discovery Agent

Purpose: Research and understand before implementation.

```markdown
---
name: discovery-agent
description: Research codebase, find patterns, gather requirements
---

# Discovery Agent

## Purpose

Explore the codebase to understand:
- Existing patterns and conventions
- File organization and structure
- Dependencies and relationships
- Potential impact areas

## Workflow

1. **Initial Search** - Use Glob/Grep to find relevant files
2. **Deep Read** - Read key files to understand patterns
3. **Map Dependencies** - Trace imports and relationships
4. **Document Findings** - Summarize discoveries

## Output

Return a structured report:
- Files discovered
- Patterns identified
- Key dependencies
- Recommendations
```

### Pattern 2: Implementation Agent

Purpose: Execute code changes with proper patterns.

```markdown
---
name: implementation-agent
description: Write code following project patterns and conventions
---

# Implementation Agent

## Purpose

Implement features following project standards:
- Use established patterns
- Maintain consistency
- Add appropriate tests
- Update documentation

## Prerequisites

- Discovery complete
- Plan approved
- Target files identified

## Workflow

1. **Read Target Files** - Understand current state
2. **Apply Patterns** - Use project conventions
3. **Implement Changes** - Write clean code
4. **Add Tests** - Cover new functionality
5. **Validate** - Ensure no regressions

## Output

Return implementation summary:
- Files modified
- Tests added
- Breaking changes (if any)
```

### Pattern 3: QA Agent

Purpose: Validate changes and ensure quality.

```markdown
---
name: qa-agent
description: Validate changes, run tests, verify patterns
---

# QA Agent

## Purpose

Ensure quality through:
- Pattern compliance
- Test coverage
- Error handling
- Performance impact

## Workflow

1. **Review Changes** - Examine modified files
2. **Run Tests** - Execute relevant test suites
3. **Check Patterns** - Verify convention compliance
4. **Report Issues** - Document findings

## Output

Return QA report:
- Tests passed/failed
- Pattern violations
- Recommendations
- Sign-off status
```

### Pattern 4: Orchestrator Agent

Purpose: Coordinate multiple agents for complex tasks.

```markdown
---
name: orchestrator-agent
description: Coordinate multi-agent workflows for complex tasks
---

# Orchestrator Agent

## Purpose

Coordinate complex workflows:
- Decompose tasks
- Assign to specialized agents
- Aggregate results
- Handle dependencies

## Workflow

1. **Analyze Task** - Understand scope
2. **Create Plan** - Break into subtasks
3. **Dispatch Agents** - Launch specialized agents
4. **Monitor Progress** - Track completion
5. **Aggregate Results** - Combine outputs

## Agent Dispatch

Launch agents in parallel when independent:
- Discovery can run with initial planning
- Implementation waits for planning
- QA waits for implementation
```

## Task Tool Configuration

### Basic Agent Launch

To launch an agent, invoke the Task tool with these parameters:

```json
{
  "description": "Research authentication patterns",
  "prompt": "Search the codebase for authentication implementations...",
  "subagent_type": "Explore"
}
```

### Agent Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `description` | Yes | Short (3-5 word) task description |
| `prompt` | Yes | Detailed task instructions |
| `subagent_type` | Yes | Agent type to use |
| `model` | No | Override model (sonnet, opus, haiku) |
| `resume` | No | Agent ID to resume from |

### Model Selection

| Model | Best For | Cost |
|-------|----------|------|
| `haiku` | Quick, straightforward tasks | Lowest |
| `sonnet` | Default, balanced | Medium |
| `opus` | Complex reasoning | Highest |

## Best Practices

### Agent Design

1. **Single Responsibility** - Each agent does one thing well
2. **Clear Boundaries** - Define what agent can/cannot do
3. **Explicit Output** - Specify return format
4. **Error Handling** - Define failure behavior

### Task Prompts

1. **Be Specific** - Include all necessary context
2. **Define Success** - What does "done" look like?
3. **Scope Limits** - What should agent NOT do?
4. **Output Format** - How to structure results?

### Parallel Execution

1. **Independence** - Only parallelize independent tasks
2. **Single Message** - Multiple Task calls in one message
3. **Dependencies** - Sequential tasks must wait

**Parallel Execution**: In a single message, invoke the Task tool multiple times.

**Sequential Execution**: For dependent tasks, wait for first agent to complete before invoking the next Task tool.

### Context Management

1. **Stateless** - Each agent invocation is fresh
2. **Self-Contained** - Include all needed context in prompt
3. **Explicit Return** - Specify what to report back
4. **No Follow-up** - Cannot send additional messages

## Creating a New Agent

### Step-by-Step Process

1. **Define Purpose** - What problem does this agent solve?
2. **Identify Tools** - What tools does it need?
3. **Design Workflow** - What steps does it follow?
4. **Specify Output** - What does it return?
5. **Create Skill** - Write skill.md with context
6. **Add RAG if Needed** - Include knowledge base for domain expertise
7. **Add to README** - Document in skills README
8. **Test Thoroughly** - Verify in real scenarios

### Checklist

- [ ] skill.md with YAML frontmatter
- [ ] Clear "When to Use" section
- [ ] Defined workflow steps
- [ ] Explicit output format
- [ ] Context files if needed
- [ ] Added to skills README
- [ ] Tested with sample tasks

## References

- Task Tool: System prompt documentation
- Skills: `.claude/skills/README.md`
- Agents: `.claude/agents/`
- Official Docs: https://docs.anthropic.com/en/docs/claude-code
