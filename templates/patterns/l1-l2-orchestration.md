# L1→L2 Orchestration Pattern

Hierarchical agent coordination with parallel L2 spawning.

> ⚠️ **CRITICAL**: This pattern MUST follow [Context-Safe Orchestration](./context-safe-orchestration.md) to prevent context overflow.

## Overview

A master-worker pattern where:
- **L1 (Orchestrator)**: Decomposes task, coordinates workers, aggregates **summaries only**
- **L2 (Specialists)**: Execute specific subtasks in parallel, write details to files

## Context Safety Rules

| Rule | Implementation |
|------|----------------|
| Summary-only returns | L2 agents return max 500 chars summary |
| File-based details | Full output → `.claude/cache/agent-outputs/` |
| AOP compliance | All agents follow Agent Output Protocol |
| Context checkpoints | Check at 70% utilization |

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

### L2 Launcher (Context-Safe)

```typescript
async function launchParallelL2s(subtasks: Subtask[]) {
  const cacheDir = '.claude/cache/agent-outputs';
  const batchId = `l2-batch-${Date.now()}`;

  // Launch all in single message for true parallelism
  // CRITICAL: Add AOP (Agent Output Protocol) instructions to each prompt
  const agents = subtasks.map((subtask, index) => ({
    description: subtask.title,
    prompt: `${subtask.prompt}

**OUTPUT REQUIREMENTS (MANDATORY - Context Safety):**
1. Write detailed results to: ${cacheDir}/${batchId}-${index}.json
2. Return ONLY a summary (max 500 chars) in this format:
   [AOP:SUMMARY] {brief findings - what you found/did}
   [AOP:DETAILS_FILE] ${cacheDir}/${batchId}-${index}.json
   [AOP:STATUS] success|failure|partial
3. DO NOT return full file contents, search results, or verbose output
4. The parent orchestrator will read details from the file if needed`,
    subagent_type: subtask.type,
    model: 'haiku', // Prefer haiku for parallel work
    run_in_background: true
  }));

  // All agents start simultaneously
  const handles = await Promise.all(agents.map(a => Task(a)));

  // Collect SUMMARIES ONLY (not full outputs)
  const summaries = [];
  for (const handle of handles) {
    const status = await TaskOutput({
      task_id: handle.task_id,
      block: true,
      timeout: 120000
    });

    // Extract only the AOP summary portion
    summaries.push(extractAOPSummary(status.output));
  }

  return {
    summaries,           // Summary-only for context
    detailsDir: cacheDir, // Where full details live
    batchId              // For later reference
  };
}

// Extract only summary from AOP-formatted output
function extractAOPSummary(output: string): AgentSummary {
  const summaryMatch = output.match(/\[AOP:SUMMARY\]([\s\S]*?)\[AOP:/);
  const fileMatch = output.match(/\[AOP:DETAILS_FILE\]\s*(\S+)/);
  const statusMatch = output.match(/\[AOP:STATUS\]\s*(\w+)/);

  return {
    summary: summaryMatch ? summaryMatch[1].trim().slice(0, 500) : output.slice(-200),
    detailsFile: fileMatch ? fileMatch[1] : null,
    status: statusMatch ? statusMatch[1] : 'unknown'
  };
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

### Result Aggregation (Context-Safe)

```typescript
// IMPORTANT: Aggregation stays minimal for context safety
function aggregateResults(summaries: AgentSummary[]): AggregatedResult {
  // Only aggregate summaries - details stay in files
  const combinedSummary = summaries
    .map((s, i) => `${i + 1}. ${s.summary}`)
    .join('\n');

  // Collect detail file paths for reference
  const detailFiles = summaries
    .filter(s => s.detailsFile)
    .map(s => s.detailsFile);

  return {
    summary: combinedSummary.slice(0, 2000), // Cap total summary
    detailFiles,                              // Paths only, not contents
    successCount: summaries.filter(s => s.status === 'success').length,
    totalCount: summaries.length
  };
}

// If full details needed later, read from files (not in main context)
async function getFullDetails(detailFiles: string[]): Promise<any[]> {
  // Read files into a separate context (e.g., via subagent)
  // or process incrementally to avoid context bloat
  return Promise.all(
    detailFiles.map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  );
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

## Context Safety Checklist

Before deploying L1→L2 orchestration:

- [ ] All L2 prompts include AOP output instructions
- [ ] Cache directory exists: `.claude/cache/agent-outputs/`
- [ ] Summary extraction function handles malformed output
- [ ] Aggregation caps total summary at 2000 chars
- [ ] Detail files cleaned up after processing
- [ ] Context checkpoint added for long-running orchestration

## Related Patterns

- [Context-Safe Orchestration](./context-safe-orchestration.md) - **Required reading**
- Two-Tier Query Pipeline
- Multi-Phase Orchestration
- Dependency Ordering
