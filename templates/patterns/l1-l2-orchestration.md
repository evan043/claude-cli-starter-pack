# L1→L2 Orchestration Pattern

Hierarchical agent coordination with parallel L2 spawning.

## Overview

A master-worker pattern where:
- **L1 (Orchestrator)**: Decomposes task, coordinates workers, aggregates results
- **L2 (Specialists)**: Execute specific subtasks in parallel

## When to Use

- Complex tasks that can be broken into independent subtasks
- Parallel execution would improve speed
- Subtasks require different specializations

## Architecture

```
                    ┌─────────────────────┐
                    │   L1 Orchestrator   │
                    │   - Decompose task  │
                    │   - Dispatch L2s    │
                    │   - Aggregate       │
                    └─────────────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ L2 Specialist │    │ L2 Specialist │    │ L2 Specialist │
│   (Search)    │    │   (Analyze)   │    │   (Document)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Implementation

### L1 Orchestrator

```typescript
async function orchestrate(task: string) {
  // Step 1: Decompose task into subtasks
  const subtasks = await decomposeTask(task);

  // Step 2: Identify dependencies
  const { independent, dependent } = categorizeSubtasks(subtasks);

  // Step 3: Launch independent L2 agents in parallel
  const parallelResults = await launchParallelL2s(independent);

  // Step 4: Launch dependent L2 agents sequentially
  const sequentialResults = await launchSequentialL2s(dependent, parallelResults);

  // Step 5: Aggregate results
  return aggregateResults([...parallelResults, ...sequentialResults]);
}
```

### L2 Launcher

```typescript
async function launchParallelL2s(subtasks: Subtask[]) {
  // Launch all in single message for true parallelism
  const agents = subtasks.map(subtask => ({
    description: subtask.title,
    prompt: subtask.prompt,
    subagent_type: subtask.type,
    run_in_background: true
  }));

  // All agents start simultaneously
  const handles = await Promise.all(agents.map(a => Task(a)));

  // Wait for all to complete
  return Promise.all(handles.map(h => waitForAgent(h)));
}
```

### Task Decomposition

```typescript
function decomposeTask(task: string): Subtask[] {
  // Example: "Analyze and document the authentication system"

  return [
    {
      id: 'search',
      title: 'Find auth files',
      prompt: 'Search for all authentication-related files',
      type: 'Explore',
      dependencies: []
    },
    {
      id: 'analyze',
      title: 'Analyze auth flow',
      prompt: 'Analyze the authentication flow and security',
      type: 'Plan',
      dependencies: ['search']
    },
    {
      id: 'document',
      title: 'Generate docs',
      prompt: 'Document the authentication system',
      type: 'general-purpose',
      dependencies: ['analyze']
    }
  ];
}
```

### Result Aggregation

```typescript
function aggregateResults(results: AgentResult[]): FinalResult {
  return {
    summary: results.map(r => r.summary).join('\n\n'),
    files: results.flatMap(r => r.files || []),
    insights: results.flatMap(r => r.insights || []),
    recommendations: prioritizeRecommendations(results)
  };
}
```

## Complete Example

```typescript
// Task: "Analyze the codebase for performance issues"

// L1 Orchestrator breaks into:
const subtasks = [
  // Independent (run in parallel)
  { id: 'bundle', type: 'Explore', prompt: 'Find bundle size issues' },
  { id: 'queries', type: 'Explore', prompt: 'Find slow database queries' },
  { id: 'renders', type: 'Explore', prompt: 'Find excessive re-renders' },

  // Dependent (run after above complete)
  { id: 'report', type: 'general-purpose', prompt: 'Generate performance report',
    dependencies: ['bundle', 'queries', 'renders'] }
];

// Execution:
// 1. L1 launches 3 Explore agents in parallel
// 2. All 3 complete with findings
// 3. L1 launches report agent with aggregated findings
// 4. L1 returns final report
```

## Model Selection by Level

| Level | Model | Reasoning |
|-------|-------|-----------|
| L1 | Sonnet | Needs to coordinate, decompose, aggregate |
| L2 Search | Haiku | Simple file discovery |
| L2 Analysis | Sonnet | Complex reasoning required |
| L2 Generate | Sonnet | Quality output needed |

## Error Handling

```typescript
async function orchestrateWithRecovery(task) {
  const subtasks = await decomposeTask(task);
  const results = [];

  for (const subtask of subtasks) {
    try {
      const result = await executeSubtask(subtask);
      results.push({ subtask, result, success: true });
    } catch (error) {
      // Log failure but continue with other subtasks
      results.push({ subtask, error, success: false });
    }
  }

  // Report partial success if some failed
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  return {
    results: aggregateResults(successful.map(r => r.result)),
    failures: failed.map(f => ({ task: f.subtask.id, error: f.error })),
    partial: failed.length > 0
  };
}
```

## Related Patterns

- Two-Tier Query Pipeline
- Multi-Phase Orchestration
- Dependency Ordering
