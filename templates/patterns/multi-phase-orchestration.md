# Multi-Phase Orchestration Pattern

Sequential phase execution with parallel agents within phases.

## Overview

Organizes work into distinct phases where:
- Phases execute sequentially (each depends on previous)
- Tasks within a phase can run in parallel
- Validation gates between phases ensure quality

## When to Use

- Large projects with natural phase boundaries
- Work that must be done in a specific order
- Need for validation between major steps

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         L1 Controller                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1: Discovery                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Agent A  │  │ Agent B  │  │ Agent C  │  (parallel)      │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                   ↓ Validation Gate                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Phase 2: Implementation                    │
│  ┌──────────┐  ┌──────────┐                                │
│  │ Agent D  │  │ Agent E  │  (parallel)                    │
│  └──────────┘  └──────────┘                                │
│                   ↓ Validation Gate                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Phase 3: Testing                        │
│  ┌──────────┐                                               │
│  │ Agent F  │  (sequential - needs all results)            │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Phase Controller

```typescript
interface Phase {
  id: string;
  name: string;
  tasks: Task[];
  validation: ValidationGate;
  parallel: boolean;
}

async function executePhases(phases: Phase[]): Promise<PhaseResults> {
  const results: PhaseResult[] = [];
  let context = {}; // Accumulates data across phases

  for (const phase of phases) {
    console.log(`Starting Phase ${phase.id}: ${phase.name}`);

    // Execute phase tasks
    const phaseResult = phase.parallel
      ? await executeParallel(phase.tasks, context)
      : await executeSequential(phase.tasks, context);

    // Run validation gate
    const validation = await phase.validation.check(phaseResult);

    if (!validation.passed) {
      return {
        completed: results,
        failed: phase,
        reason: validation.reason,
        context
      };
    }

    // Update context with phase results
    context = { ...context, [phase.id]: phaseResult };
    results.push({ phase, result: phaseResult, validation });
  }

  return { completed: results, context };
}
```

### Parallel Task Execution

```typescript
async function executeParallel(tasks: Task[], context: Context) {
  // Prepare prompts with context
  const preparedTasks = tasks.map(task => ({
    ...task,
    prompt: injectContext(task.prompt, context)
  }));

  // Launch all in parallel
  const agents = preparedTasks.map(task => Task({
    description: task.title,
    prompt: task.prompt,
    subagent_type: task.type,
    run_in_background: true
  }));

  const handles = await Promise.all(agents);

  // Wait for all to complete
  return Promise.all(handles.map(waitForCompletion));
}
```

### Validation Gates

```typescript
const validationGates = {
  discovery: {
    async check(results) {
      // Verify all files were found
      const allFilesFound = results.every(r => r.files?.length > 0);

      // Verify no critical errors
      const noErrors = results.every(r => !r.error);

      return {
        passed: allFilesFound && noErrors,
        reason: !allFilesFound ? 'Missing required files' :
                !noErrors ? 'Errors during discovery' : null
      };
    }
  },

  implementation: {
    async check(results) {
      // Run tests on new code
      const testResult = await runTests();

      // Check for type errors
      const typeCheck = await runTypeCheck();

      return {
        passed: testResult.passing && typeCheck.clean,
        reason: !testResult.passing ? `${testResult.failed} tests failed` :
                !typeCheck.clean ? `${typeCheck.errors} type errors` : null
      };
    }
  }
};
```

## Complete Example

```typescript
// Project: Implement new feature with testing

const phases: Phase[] = [
  {
    id: 'discovery',
    name: 'Codebase Discovery',
    parallel: true,
    tasks: [
      { title: 'Find related components', type: 'Explore', ... },
      { title: 'Find API endpoints', type: 'Explore', ... },
      { title: 'Find existing tests', type: 'Explore', ... }
    ],
    validation: validationGates.discovery
  },
  {
    id: 'planning',
    name: 'Implementation Planning',
    parallel: false, // Sequential - needs discovery results
    tasks: [
      { title: 'Design component structure', type: 'Plan', ... },
      { title: 'Design API changes', type: 'Plan', ... }
    ],
    validation: validationGates.planning
  },
  {
    id: 'implementation',
    name: 'Code Implementation',
    parallel: true, // Independent components
    tasks: [
      { title: 'Implement component', type: 'general-purpose', ... },
      { title: 'Implement API', type: 'general-purpose', ... }
    ],
    validation: validationGates.implementation
  },
  {
    id: 'testing',
    name: 'Testing & Validation',
    parallel: false,
    tasks: [
      { title: 'Write unit tests', type: 'general-purpose', ... },
      { title: 'Run E2E tests', type: 'Bash', ... }
    ],
    validation: validationGates.testing
  }
];

// Execute
const result = await executePhases(phases);
```

## State Management

### PROGRESS.json Integration

```json
{
  "current_phase": 2,
  "phases": [
    {
      "id": "discovery",
      "status": "complete",
      "tasks": [...],
      "validation": { "passed": true }
    },
    {
      "id": "implementation",
      "status": "in_progress",
      "tasks": [...],
      "validation": null
    }
  ]
}
```

### Checkpoint Recovery

```typescript
async function resumeFromCheckpoint(progressPath: string) {
  const progress = JSON.parse(await readFile(progressPath));

  // Find incomplete phase
  const incompleteIndex = progress.phases.findIndex(
    p => p.status !== 'complete'
  );

  // Resume from that phase
  return executePhases(
    progress.phases.slice(incompleteIndex),
    progress.context
  );
}
```

## Related Patterns

- L1→L2 Orchestration
- Phase Validation Gates
- Two-Tier Query Pipeline
