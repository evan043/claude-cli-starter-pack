# Agent Patterns Library

Reusable patterns for Claude Code agent orchestration.

> ⚠️ **IMPORTANT**: All patterns MUST follow [Context-Safe Orchestration](context-safe-orchestration.md) to prevent context window overflow.

## Quick Reference

| Pattern | Use Case | Complexity | Context Safe |
|---------|----------|------------|--------------|
| [Context-Safe Orchestration](context-safe-orchestration.md) | **Required reading** - prevents overflow | Foundation | ✅ Core |
| [Two-Tier Query Pipeline](two-tier-query-pipeline.md) | Intent classification + execution | Medium | ⚠️ Apply AOP |
| [L1→L2 Orchestration](l1-l2-orchestration.md) | Master-worker parallel tasks | Medium | ✅ Updated |
| [Multi-Phase Orchestration](multi-phase-orchestration.md) | Sequential phases with parallel tasks | High | ✅ Updated |

## Context Safety (MANDATORY)

Before using ANY pattern:

1. **Read [Context-Safe Orchestration](context-safe-orchestration.md)** - Core principles
2. **Apply [Agent Output Protocol (AOP)](../docs/agent-output-protocol.md)** - Output format standard
3. **Use file-based state** - PROGRESS.json, not context variables
4. **Return summaries only** - Full details go to cache files

### Context Safety Checklist

- [ ] All agent prompts include AOP instructions
- [ ] Cache directory configured: `.claude/cache/agent-outputs/`
- [ ] Summary extraction handles AOP format
- [ ] Context checkpoints at 70% utilization
- [ ] File-based progress tracking enabled

## Choosing a Pattern

### Simple Task Routing
**Use: Two-Tier Query Pipeline**
- User requests vary in type
- Different handlers for different intents
- Need confidence-based routing

### Parallel Subtask Execution
**Use: L1→L2 Orchestration**
- Task decomposes into independent parts
- Parallel execution improves speed
- Need result aggregation

### Complex Multi-Step Projects
**Use: Multi-Phase Orchestration**
- Work has natural phase boundaries
- Validation needed between phases
- Phases may have parallel subtasks

## Pattern Combinations

### Query → Orchestration

```
User Request
     ↓
┌─────────────────┐
│ Query Pipeline  │  Classify intent
└─────────────────┘
     ↓
┌─────────────────┐
│ L1→L2 Pattern   │  Execute with specialists
└─────────────────┘
```

### Phase → Orchestration

```
┌─────────────────────────────┐
│     Phase 1: Discovery      │
│  ┌───────────────────────┐  │
│  │   L1→L2 Orchestration │  │  Parallel exploration
│  └───────────────────────┘  │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│   Phase 2: Implementation   │
│  ┌───────────────────────┐  │
│  │   L1→L2 Orchestration │  │  Parallel coding
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## Implementation Tips

### 1. Start Simple
Begin with the simplest pattern that solves your problem. Add complexity only when needed.

### 2. Use Appropriate Models
- L1 Orchestrators: Sonnet (needs reasoning)
- L2 Search/Explore: Haiku (fast, cheap)
- L2 Analysis/Generate: Sonnet (quality needed)

### 3. Handle Failures Gracefully
Always have fallback behavior when agents fail.

### 4. Log Extensively
Track agent launches, completions, and aggregations for debugging.

### 5. Use Background Agents (with Context Safety)
For long-running tasks, use `run_in_background: true` to avoid blocking.
**CRITICAL**: Always add AOP instructions to background agent prompts so they return summaries, not full outputs.

### 6. Implement Context Checkpoints
Add context utilization checks before major operations:
```javascript
const usage = await estimateContextUsage();
if (usage.percent > 70) {
  console.log('Consider /compact before continuing');
}
```

### 7. Store State in Files
Never accumulate large state in context. Use PROGRESS.json, ROADMAP.json, EPIC.json as sources of truth.

## Creating New Patterns

When documenting a new pattern:

1. **Overview**: What problem does it solve?
2. **When to Use**: Clear use cases
3. **Architecture**: Visual diagram
4. **Implementation**: Code examples
5. **Examples**: Real-world usage
6. **Related Patterns**: Connections to other patterns

## Pattern Template

```markdown
# Pattern Name

Brief description.

## Overview

What this pattern does.

## When to Use

- Use case 1
- Use case 2

## Architecture

[Diagram]

## Implementation

[Code]

## Example

[Complete example]

## Related Patterns

- Pattern A
- Pattern B
```
