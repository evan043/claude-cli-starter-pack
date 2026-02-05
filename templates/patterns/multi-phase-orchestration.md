# Multi-Phase Orchestration Pattern

Sequential phase execution with parallel agents within phases.

> ⚠️ **CRITICAL**: This pattern MUST follow [Context-Safe Orchestration](./context-safe-orchestration.md) to prevent context overflow.

---

## HARD SEQUENTIAL GATES (NON-NEGOTIABLE)

**Phase N+1 CANNOT start until Phase N status = `completed` and its validation gate has passed.**

This is the single most important rule in this entire document. Everything else is secondary.

### FORBIDDEN - These Actions Will Cause Context Overflow:
- **DO NOT** start Phase 2 while Phase 1 is still running
- **DO NOT** launch background agents for multiple phases simultaneously
- **DO NOT** "pipeline" phases (starting Phase 2 tasks while Phase 1 validation runs)
- **DO NOT** interpret "sequential phases with parallel tasks" as "parallel phases"
- **DO NOT** skip a failed validation gate and proceed to the next phase

### REQUIRED - You Must Follow These Steps:
1. Execute Phase N tasks (parallel within the phase is OK)
2. Run Phase N validation gate
3. If validation **passes**: write `status: "completed"` to PROGRESS.json, THEN start Phase N+1
4. If validation **fails**: STOP COMPLETELY. Report failure. Wait for user input. Do NOT continue
5. Check context usage before each phase. If >70%, pause and offer /compact

### What "Parallel Within a Phase" Means:
- Tasks A, B, C within Phase 1 can run simultaneously (they are at the same level)
- Phase 2 tasks CANNOT run until ALL Phase 1 tasks complete AND validation passes
- This is the ONLY form of parallelism allowed

---

## Overview

Organizes work into distinct phases where:
- **Phases execute STRICTLY sequentially** — Phase N+1 is BLOCKED until Phase N completes
- Tasks **within** a single phase can run in parallel (this is the only allowed parallelism)
- Validation gates between phases are HARD STOPS — failing a gate means execution halts
- **All state lives in files, not context**

## Context Safety Rules

| Rule | Implementation |
|------|----------------|
| File-based state | PROGRESS.json is source of truth |
| Summary-only returns | Phase results return max 300 chars |
| Context checkpoints | Check at 70% before each phase |
| AOP compliance | All parallel agents follow Agent Output Protocol |

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

### Phase Controller (Context-Safe)

```typescript
interface Phase {
  id: string;
  name: string;
  tasks: Task[];
  validation: ValidationGate;
  parallel: boolean;
}

// CRITICAL: State lives in files, not in context variable
// HARD GATE: Phases execute ONE AT A TIME. Phase N+1 blocked until Phase N complete.
async function executePhases(phases: Phase[], progressPath: string): Promise<PhaseResults> {
  // Results stored in file, not accumulated in memory
  const cacheDir = '.claude/cache/agent-outputs';

  for (const phase of phases) {
    // ═══════════════════════════════════════════════════════════════
    // HARD GATE: Verify previous phase completed before proceeding
    // ═══════════════════════════════════════════════════════════════
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const phaseIndex = phases.indexOf(phase);
    if (phaseIndex > 0) {
      const prevPhase = progress.phases[phaseIndex - 1];
      if (prevPhase.status !== 'completed') {
        throw new Error(
          `HARD GATE VIOLATION: Cannot start Phase ${phase.id} — ` +
          `Phase ${phases[phaseIndex - 1].id} status is "${prevPhase.status}", not "completed". ` +
          `Fix the previous phase first.`
        );
      }
    }

    // Context checkpoint before each phase — MANDATORY
    const contextCheck = await checkContextUtilization();
    if (contextCheck.percent > 70) {
      console.log(`⚠️ CONTEXT GATE: ${contextCheck.percent}% used. PAUSING execution.`);
      console.log('   Run /compact to free context, then resume. Progress is saved.');
      return { status: 'paused', reason: 'context_threshold', resumeFrom: phase.id };
    }

    console.log(`Starting Phase ${phase.id}: ${phase.name}`);

    // Execute phase tasks (summaries only returned to context)
    const phaseResult = phase.parallel
      ? await executeParallelContextSafe(phase.tasks, cacheDir)
      : await executeSequentialContextSafe(phase.tasks, cacheDir);

    // Run validation gate
    const validation = await phase.validation.check(phaseResult);

    // Update PROGRESS.json file (not context)
    await updateProgressFile(progressPath, phase.id, {
      status: validation.passed ? 'completed' : 'failed',
      summary: phaseResult.summary.slice(0, 300), // Summary only!
      detailsDir: phaseResult.detailsDir,
      validation: validation
    });

    if (!validation.passed) {
      // HARD GATE: Validation failure = FULL STOP. Do NOT continue.
      console.log(`⛔ HARD GATE: Phase ${phase.id} validation FAILED. Execution halted.`);
      console.log(`   Reason: ${validation.reason}`);
      console.log(`   DO NOT proceed to next phase. Fix this phase first.`);
      return {
        status: 'failed',
        failedPhase: phase.id,
        reason: validation.reason,
        summary: `STOPPED at phase ${phase.id}: ${validation.reason}`
      };
    }

    // Minimal context output
    console.log(`✓ Phase ${phase.id} complete: ${phaseResult.summary.slice(0, 100)}`);
  }

  return {
    status: 'completed',
    summary: `All ${phases.length} phases completed successfully`
  };
}
```

### Parallel Task Execution (Context-Safe)

```typescript
async function executeParallelContextSafe(tasks: Task[], cacheDir: string) {
  const batchId = `phase-${Date.now()}`;

  // Prepare prompts with AOP instructions
  const preparedTasks = tasks.map((task, index) => ({
    ...task,
    prompt: `${task.prompt}

**OUTPUT REQUIREMENTS (MANDATORY - Context Safety):**
1. Write detailed results to: ${cacheDir}/${batchId}-task-${index}.json
2. Return ONLY a summary (max 400 chars):
   [AOP:SUMMARY] {what you accomplished}
   [AOP:DETAILS_FILE] ${cacheDir}/${batchId}-task-${index}.json
   [AOP:STATUS] success|failure|partial
3. DO NOT include full file contents or verbose logs in your response`
  }));

  // Launch all in parallel
  const agents = preparedTasks.map(task => Task({
    description: task.title,
    prompt: task.prompt,
    subagent_type: task.type,
    model: 'haiku',
    run_in_background: true
  }));

  const handles = await Promise.all(agents);

  // Collect summaries only
  const summaries = [];
  for (const handle of handles) {
    const result = await TaskOutput({
      task_id: handle.task_id,
      block: true,
      timeout: 120000
    });
    summaries.push(extractAOPSummary(result.output));
  }

  // Return aggregated summary (not full results)
  return {
    summary: summaries.map(s => s.summary).join('; ').slice(0, 800),
    detailsDir: cacheDir,
    batchId,
    successCount: summaries.filter(s => s.status === 'success').length,
    totalCount: summaries.length
  };
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

## Context Safety Checklist

Before deploying multi-phase orchestration:

- [ ] PROGRESS.json created for state tracking
- [ ] All task prompts include AOP instructions
- [ ] Cache directory exists: `.claude/cache/agent-outputs/`
- [ ] Context checkpoint added before each phase
- [ ] Phase results capped at 300 chars summary
- [ ] Detail files cleaned up after phase completion

## Related Patterns

- [Context-Safe Orchestration](./context-safe-orchestration.md) - **Required reading**
- L1→L2 Orchestration
- Phase Validation Gates
- Two-Tier Query Pipeline
