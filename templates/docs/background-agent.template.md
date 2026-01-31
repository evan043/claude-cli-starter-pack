# Background Agent Orchestration

Template for production-grade background agent workflows.

## Overview

Background agents run autonomous tasks without blocking the main conversation. Use for:

- Long-running operations (builds, tests, deployments)
- Parallel exploration tasks
- Batch processing
- Monitoring and validation

## Configuration

### Basic Background Agent Launch

```typescript
// Launch agent in background
const result = await Task({
  description: "Run full test suite",
  prompt: "Execute all tests and report results...",
  subagent_type: "Bash",
  run_in_background: true
});

// result contains output_file path
const outputPath = result.output_file;
```

### Checking Background Agent Status

```typescript
// Read output file to check progress
const output = await Read({ file_path: outputPath });

// Parse for completion markers
if (output.includes('[COMPLETE]')) {
  // Agent finished
}
```

## Production Patterns

### Pattern 1: Parallel Exploration

Launch multiple explore agents simultaneously:

```typescript
// Launch in single message for parallel execution
const agents = await Promise.all([
  Task({
    description: "Search auth patterns",
    prompt: "Find authentication implementations...",
    subagent_type: "Explore",
    run_in_background: true
  }),
  Task({
    description: "Search API endpoints",
    prompt: "Find all API route definitions...",
    subagent_type: "Explore",
    run_in_background: true
  }),
  Task({
    description: "Search test patterns",
    prompt: "Find test file patterns...",
    subagent_type: "Explore",
    run_in_background: true
  })
]);
```

### Pattern 2: Build Monitoring

```typescript
// Launch build in background
const build = await Task({
  description: "Production build",
  prompt: "Run npm run build and report any errors...",
  subagent_type: "Bash",
  run_in_background: true
});

// Periodically check status
while (!buildComplete) {
  await sleep(10000); // Check every 10 seconds
  const status = await Read({ file_path: build.output_file });

  if (status.includes('Build complete') || status.includes('error')) {
    buildComplete = true;
    break;
  }
}
```

### Pattern 3: Test Pipeline

```typescript
// Sequential testing with background execution
async function runTestPipeline() {
  // Phase 1: Unit tests
  const unit = await Task({
    description: "Unit tests",
    prompt: "Run unit tests: npm run test:unit",
    subagent_type: "Bash",
    run_in_background: true
  });

  // Wait for unit tests
  const unitResult = await waitForCompletion(unit.output_file);

  if (!unitResult.success) {
    return { phase: 'unit', ...unitResult };
  }

  // Phase 2: Integration tests
  const integration = await Task({
    description: "Integration tests",
    prompt: "Run integration tests: npm run test:integration",
    subagent_type: "Bash",
    run_in_background: true
  });

  // ... continue pipeline
}
```

### Pattern 4: Deployment Orchestration

```typescript
async function deployWithValidation() {
  // Pre-deployment checks (parallel)
  const [lintResult, testResult, buildResult] = await Promise.all([
    runBackgroundTask("lint", "npm run lint"),
    runBackgroundTask("test", "npm test"),
    runBackgroundTask("build", "npm run build")
  ]);

  // Validate all passed
  if (!allPassed([lintResult, testResult, buildResult])) {
    return { success: false, stage: 'validation' };
  }

  // Deploy backend
  const backend = await runBackgroundTask(
    "backend deploy",
    "railway up"
  );

  if (!backend.success) {
    return { success: false, stage: 'backend' };
  }

  // Deploy frontend
  const frontend = await runBackgroundTask(
    "frontend deploy",
    "wrangler pages deploy dist"
  );

  // Smoke tests
  const smoke = await runBackgroundTask(
    "smoke tests",
    "npm run test:smoke"
  );

  return { success: smoke.success, stages: allStages };
}
```

## Error Handling

### Timeout Management

```typescript
async function waitForCompletion(outputFile, timeoutMs = 300000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const output = await Read({ file_path: outputFile });

    if (isComplete(output)) {
      return parseResult(output);
    }

    if (hasError(output)) {
      return { success: false, error: parseError(output) };
    }

    await sleep(5000);
  }

  return { success: false, error: 'Timeout' };
}
```

### Graceful Degradation

```typescript
async function robustBackgroundTask(description, prompt) {
  try {
    const agent = await Task({
      description,
      prompt,
      subagent_type: "Bash",
      run_in_background: true
    });

    return await waitForCompletion(agent.output_file);
  } catch (error) {
    console.error(`Background task failed: ${description}`);
    return { success: false, error: error.message };
  }
}
```

## Monitoring Dashboard

Create a status display for multiple background agents:

```
╔══════════════════════════════════════════════════════════════╗
║                    Background Agent Status                    ║
╠══════════════════════════════════════════════════════════════╣
║ Agent              │ Status      │ Duration  │ Progress      ║
╠══════════════════════════════════════════════════════════════╣
║ Unit Tests         │ ✅ Complete  │ 1m 23s    │ 100%          ║
║ Integration Tests  │ 🔄 Running   │ 2m 45s    │ 67%           ║
║ E2E Tests          │ ⏳ Pending   │ --        │ --            ║
║ Backend Deploy     │ ⏳ Pending   │ --        │ --            ║
║ Frontend Deploy    │ ⏳ Pending   │ --        │ --            ║
╚══════════════════════════════════════════════════════════════╝
```

## Best Practices

1. **Always set timeouts** - Background agents can hang
2. **Log progress markers** - Enable status checking
3. **Handle failures gracefully** - Don't crash on agent failure
4. **Clean up output files** - Remove temporary files after completion
5. **Use appropriate agent types** - Match agent to task

## Output File Format

Background agent output files should include:

```
[START] 2026-01-30T10:00:00Z
Task: Description here

[PROGRESS] Step 1 complete
[PROGRESS] Step 2 complete

[RESULT]
{
  "success": true,
  "details": "..."
}

[COMPLETE] 2026-01-30T10:05:00Z
```

---

*Use this template for complex orchestration workflows*
