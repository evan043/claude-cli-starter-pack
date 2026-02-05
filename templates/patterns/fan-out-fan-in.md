# Fan-Out/Fan-In Pattern

Distribute work to parallel workers and aggregate results back to coordinator.

## Overview

The Fan-Out/Fan-In pattern splits a task into independent subtasks (fan-out), executes them in parallel, and combines results (fan-in) for efficient parallel processing.

## The Problem

Without fan-out/fan-in:
- Sequential processing wastes time on parallelizable work
- No clear aggregation strategy for distributed results
- Difficult to handle partial failures across workers
- Hard to balance load across available resources

## Architecture

```
                      ┌────────────────────┐
                      │    Coordinator     │
                      │  - Split work      │
                      │  - Launch workers  │
                      │  - Aggregate       │
                      └────────────────────┘
                               │
                               │ FAN-OUT
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Worker 1 │   │ Worker 2 │   │ Worker 3 │
        │  Task A  │   │  Task B  │   │  Task C  │
        └──────────┘   └──────────┘   └──────────┘
                │              │              │
                │              │ FAN-IN       │
                └──────────────┼──────────────┘
                               │
                               ▼
                      ┌────────────────────┐
                      │  Aggregated Result │
                      └────────────────────┘
```

## Aggregation Strategies

### 1. All-Succeed (Strict)
All workers must succeed for overall success. Use for critical operations.

```typescript
// All workers must complete successfully
const result = await fanOut(tasks, { strategy: 'all-succeed' });
// Throws if ANY worker fails
```

### 2. First-N-Succeed
Return as soon as N workers succeed. Use for redundancy/racing.

```typescript
// Return when first 3 workers succeed
const result = await fanOut(tasks, {
  strategy: 'first-n-succeed',
  requiredSuccesses: 3
});
```

### 3. Best-Of-N
Collect all results and pick the best. Use for quality comparison.

```typescript
// Get all results, pick best by scoring function
const result = await fanOut(tasks, {
  strategy: 'best-of-n',
  scorer: (result) => result.qualityScore
});
```

### 4. Majority-Vote
Use consensus from multiple workers. Use for validation/verification.

```typescript
// Return result that majority agree on
const result = await fanOut(tasks, {
  strategy: 'majority-vote',
  comparator: (a, b) => a.value === b.value
});
```

### 5. Partial Success (Tolerant)
Succeed even if some workers fail. Use for non-critical operations.

```typescript
// Return successful results, ignore failures
const result = await fanOut(tasks, {
  strategy: 'partial-success',
  minimumSuccesses: 2  // Need at least 2 successes
});
```

## Claude Code Context

### Use Case 1: Parallel Codebase Search

```typescript
// Search multiple directories in parallel (L1 → L3 workers)
async function searchCodebase(query: string, directories: string[]) {
  const tasks = directories.map(dir => ({
    description: `Search ${dir} for ${query}`,
    operation: async () => {
      // L3 worker searches one directory
      return await searchDirectory(dir, query);
    }
  }));

  // Fan-out to L3 workers, fan-in results
  const results = await fanOut(tasks, {
    strategy: 'all-succeed',  // Need all directories searched
    concurrency: 5,            // Max 5 parallel searches
    contextSafe: true          // Use AOP (Agent Output Protocol)
  });

  // Aggregate findings
  return aggregateSearchResults(results);
}
```

### Use Case 2: Multi-File Analysis

```typescript
// Analyze multiple files in parallel
async function analyzeFiles(files: string[]) {
  const tasks = files.map(file => ({
    description: `Analyze ${file}`,
    operation: async () => {
      return await analyzeFile(file);
    }
  }));

  // Partial success: OK if some files fail
  const results = await fanOut(tasks, {
    strategy: 'partial-success',
    minimumSuccesses: Math.ceil(files.length * 0.8),  // Need 80%
    concurrency: 10
  });

  return results;
}
```

### Use Case 3: Parallel Test Execution

```typescript
// Run test suites in parallel
async function runAllTests(testSuites: string[]) {
  const tasks = testSuites.map(suite => ({
    description: `Run ${suite}`,
    operation: async () => {
      return await runTestSuite(suite);
    }
  }));

  // All must pass
  const results = await fanOut(tasks, {
    strategy: 'all-succeed',
    concurrency: 3,  // Limit to 3 parallel test runs
    timeout: 300000  // 5 min per suite
  });

  return aggregateTestResults(results);
}
```

### Use Case 4: Redundant API Calls (Racing)

```typescript
// Call multiple endpoints, use fastest response
async function fetchWithRedundancy(endpoints: string[]) {
  const tasks = endpoints.map(endpoint => ({
    description: `Fetch from ${endpoint}`,
    operation: async () => {
      return await fetch(endpoint).then(r => r.json());
    }
  }));

  // Return first successful result
  const result = await fanOut(tasks, {
    strategy: 'first-n-succeed',
    requiredSuccesses: 1,  // Just need one
    cancelOthersOnSuccess: true  // Cancel remaining requests
  });

  return result[0];
}
```

## Implementation

```typescript
interface FanOutConfig {
  strategy: 'all-succeed' | 'first-n-succeed' | 'best-of-n' |
            'majority-vote' | 'partial-success';
  concurrency?: number;           // Max parallel workers (default: Infinity)
  timeout?: number;               // ms per worker (default: 60000)
  requiredSuccesses?: number;     // For first-n-succeed
  minimumSuccesses?: number;      // For partial-success
  scorer?: (result: any) => number;  // For best-of-n
  comparator?: (a: any, b: any) => boolean;  // For majority-vote
  cancelOthersOnSuccess?: boolean;  // Cancel pending on first success
  contextSafe?: boolean;          // Use AOP (Agent Output Protocol)
  onWorkerComplete?: (index: number, result: any) => void;
}

interface Task {
  description: string;
  operation: () => Promise<any>;
}

class FanOutFanIn {
  constructor(private config: FanOutConfig) {
    this.config.concurrency ??= Infinity;
    this.config.timeout ??= 60000;
    this.config.contextSafe ??= true;
  }

  async execute(tasks: Task[]): Promise<any> {
    // Split tasks into batches based on concurrency
    const batches = this.createBatches(tasks);

    const allResults: any[] = [];
    const allErrors: any[] = [];

    for (const batch of batches) {
      // Execute batch in parallel
      const batchPromises = batch.map((task, index) =>
        this.executeTask(task, index)
          .then(result => ({ success: true, result, index }))
          .catch(error => ({ success: false, error, index }))
      );

      const batchResults = await Promise.all(batchPromises);

      // Process results based on strategy
      for (const result of batchResults) {
        if (result.success) {
          allResults.push(result.result);
          if (this.config.onWorkerComplete) {
            this.config.onWorkerComplete(result.index, result.result);
          }

          // Check for early exit strategies
          if (this.shouldEarlyExit(allResults)) {
            return this.aggregateResults(allResults);
          }
        } else {
          allErrors.push(result.error);
        }
      }
    }

    // Validate based on strategy
    this.validateResults(allResults, allErrors, tasks.length);

    // Aggregate final results
    return this.aggregateResults(allResults);
  }

  private async executeTask(task: Task, index: number): Promise<any> {
    if (this.config.contextSafe) {
      // Use AOP for context safety
      const cacheDir = '.claude/cache/agent-outputs';
      const outputPath = `${cacheDir}/fan-out-${Date.now()}-${index}.json`;

      // Execute task
      const result = await this.withTimeout(task.operation());

      // Write full result to file
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(result, null, 2)
      );

      // Return summary only
      return {
        summary: this.summarizeResult(result),
        detailsFile: outputPath,
        status: 'success'
      };
    } else {
      // Normal execution (full result in memory)
      return await this.withTimeout(task.operation());
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('Worker timeout')),
          this.config.timeout
        )
      )
    ]);
  }

  private createBatches(tasks: Task[]): Task[][] {
    if (this.config.concurrency === Infinity) {
      return [tasks];
    }

    const batches: Task[][] = [];
    for (let i = 0; i < tasks.length; i += this.config.concurrency!) {
      batches.push(tasks.slice(i, i + this.config.concurrency!));
    }
    return batches;
  }

  private shouldEarlyExit(results: any[]): boolean {
    switch (this.config.strategy) {
      case 'first-n-succeed':
        return results.length >= (this.config.requiredSuccesses || 1);
      default:
        return false;
    }
  }

  private validateResults(
    results: any[],
    errors: any[],
    totalTasks: number
  ): void {
    switch (this.config.strategy) {
      case 'all-succeed':
        if (errors.length > 0) {
          throw new Error(
            `All-succeed strategy failed: ${errors.length} workers failed`
          );
        }
        break;

      case 'partial-success':
        const minSuccess = this.config.minimumSuccesses || 1;
        if (results.length < minSuccess) {
          throw new Error(
            `Partial-success strategy failed: ` +
            `only ${results.length}/${minSuccess} succeeded`
          );
        }
        break;

      case 'first-n-succeed':
        const required = this.config.requiredSuccesses || 1;
        if (results.length < required) {
          throw new Error(
            `First-n-succeed strategy failed: ` +
            `only ${results.length}/${required} succeeded`
          );
        }
        break;
    }
  }

  private aggregateResults(results: any[]): any {
    switch (this.config.strategy) {
      case 'best-of-n':
        return this.selectBest(results);

      case 'majority-vote':
        return this.majorityVote(results);

      case 'first-n-succeed':
        return results.slice(0, this.config.requiredSuccesses);

      default:
        // Return all results for other strategies
        return results;
    }
  }

  private selectBest(results: any[]): any {
    if (!this.config.scorer) {
      throw new Error('Best-of-n strategy requires scorer function');
    }

    let best = results[0];
    let bestScore = this.config.scorer(best);

    for (const result of results.slice(1)) {
      const score = this.config.scorer(result);
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }

    return best;
  }

  private majorityVote(results: any[]): any {
    if (!this.config.comparator) {
      throw new Error('Majority-vote strategy requires comparator function');
    }

    const votes = new Map<any, number>();

    for (const result of results) {
      let found = false;
      for (const [candidate, count] of votes.entries()) {
        if (this.config.comparator(result, candidate)) {
          votes.set(candidate, count + 1);
          found = true;
          break;
        }
      }
      if (!found) {
        votes.set(result, 1);
      }
    }

    // Return result with most votes
    let majority = null;
    let maxVotes = 0;
    for (const [result, count] of votes.entries()) {
      if (count > maxVotes) {
        majority = result;
        maxVotes = count;
      }
    }

    return majority;
  }

  private summarizeResult(result: any): string {
    // Simple summarization (customize per use case)
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      return `Object with ${keys.length} keys: ${keys.slice(0, 3).join(', ')}...`;
    }
    return String(result).slice(0, 200);
  }
}

// Helper function
export async function fanOut(
  tasks: Task[],
  config: Partial<FanOutConfig> = {}
): Promise<any> {
  const executor = new FanOutFanIn(config as FanOutConfig);
  return executor.execute(tasks);
}
```

## Complete Example: Parallel L3 Worker Pattern

```typescript
// L1 Orchestrator uses fan-out/fan-in for L3 workers
async function analyzeCodebaseWithL3Workers(directories: string[]) {
  const cacheDir = '.claude/cache/agent-outputs';
  await fs.promises.mkdir(cacheDir, { recursive: true });

  // Create tasks for each directory
  const tasks = directories.map((dir, index) => ({
    description: `Analyze ${dir}`,
    operation: async () => {
      // Spawn L3 worker agent
      const agent = await Task({
        description: `L3 Worker: Analyze ${dir}`,
        prompt: `
Analyze all files in ${dir} for code quality issues.

**OUTPUT REQUIREMENTS (AOP - Context Safety):**
1. Write detailed findings to: ${cacheDir}/l3-${index}.json
2. Return ONLY summary (max 500 chars):
   [AOP:SUMMARY] Found N issues in M files
   [AOP:DETAILS_FILE] ${cacheDir}/l3-${index}.json
   [AOP:STATUS] success
`,
        subagent_type: 'Explore',
        model: 'haiku',
        run_in_background: true
      });

      // Wait for completion
      const output = await TaskOutput({
        task_id: agent.task_id,
        block: true,
        timeout: 120000
      });

      // Extract AOP summary
      return extractAOPSummary(output.output);
    }
  }));

  // Fan-out to all L3 workers in parallel
  const results = await fanOut(tasks, {
    strategy: 'all-succeed',
    concurrency: 5,  // Max 5 parallel L3 agents
    contextSafe: true,
    onWorkerComplete: (index, result) => {
      console.log(`✓ L3 Worker ${index + 1} complete: ${result.summary}`);
    }
  });

  // Fan-in: Aggregate all worker summaries
  const aggregated = {
    totalWorkers: results.length,
    summaries: results.map(r => r.summary),
    detailFiles: results.map(r => r.detailsFile)
  };

  console.log(`
✓ Fan-in complete: ${results.length} workers succeeded
  Details: ${aggregated.detailFiles.join(', ')}
  `);

  return aggregated;
}
```

## Error Handling Strategies

### 1. Fail Fast (All-Succeed)
```typescript
// Stop on first error
try {
  await fanOut(tasks, { strategy: 'all-succeed' });
} catch (error) {
  console.error('A worker failed, aborting all');
}
```

### 2. Continue on Error (Partial Success)
```typescript
// Collect successes, report failures
const result = await fanOut(tasks, {
  strategy: 'partial-success',
  minimumSuccesses: 1  // At least one must succeed
});

console.log(`${result.length} succeeded, ${tasks.length - result.length} failed`);
```

### 3. Retry Failed Workers
```typescript
// Retry failed tasks
let results = await fanOut(tasks, {
  strategy: 'partial-success',
  minimumSuccesses: 0
});

const failed = tasks.length - results.length;
if (failed > 0) {
  console.log(`Retrying ${failed} failed workers...`);
  // Re-run failed tasks
}
```

## Context Safety Checklist

- [ ] `contextSafe: true` enabled
- [ ] Agent prompts include AOP instructions
- [ ] Cache directory created before execution
- [ ] Summary extraction handles AOP format
- [ ] Detail files cleaned up after aggregation
- [ ] Concurrency limited to prevent quota issues

## When to Use

Use fan-out/fan-in when:

- Tasks are independent (no data dependencies)
- Parallel execution improves performance
- Need aggregation of distributed results
- Working with bounded resources (concurrency limits)

## When NOT to Use

Don't use fan-out/fan-in for:

- Sequential tasks with dependencies
- Single task that can't be split
- Tasks that require shared state
- Already-parallel operations (redundant)

## Related Patterns

- **L1→L2 Orchestration**: Uses fan-out/fan-in for L2 specialists
- **Map-Reduce**: Similar pattern with reduction phase
- **Context-Safe Orchestration**: Required for AOP compliance
- **Circuit Breaker**: Protect fan-out from failing workers

---

*Fan-Out/Fan-In Pattern - CCASP v2.3.0*
*Distribute work to parallel workers and aggregate results*
