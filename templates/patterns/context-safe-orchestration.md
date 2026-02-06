# Context-Safe Orchestration Pattern

**CRITICAL**: This pattern MUST be followed by all CCASP orchestration commands to prevent context window overflow.

---

## HARD SEQUENTIAL GATES (NON-NEGOTIABLE)

**Phases/plans execute ONE AT A TIME. The next phase CANNOT start until the current phase is 100% complete.**

### FORBIDDEN — Will Cause the Exact Bug This Pattern Prevents:
- **DO NOT** launch multiple phases/plans in parallel (even if they seem independent)
- **DO NOT** start Phase N+1 before Phase N returns and PROGRESS.json shows `completed`
- **DO NOT** use `run_in_background: true` for phase-level execution (only for tasks WITHIN a single phase)
- **DO NOT** "get ahead" by reading Phase 3 while Phase 2 runs

### REQUIRED — Hard Gate Protocol:
1. Start Phase N → wait for it to complete → verify PROGRESS.json → start Phase N+1
2. If Phase N fails, STOP. Do not continue. Report and wait for user input
3. Before each phase: check context. If >70%, STOP and offer /compact
4. The word "sequential" means "one at a time, blocking" — not "eventually in order"

---

## The Problem

When parallel agents complete, their **entire outputs** are returned to the parent context, causing:
- Context window overflow (freezing/crashing)
- Degraded reasoning in the final 20% of context
- Lost work due to forced compaction

## Core Principles

### Principle 1: Summary-Only Returns

Agents MUST return **summaries only** to the parent. Detailed output goes to files.

```
┌─────────────────────────────────────────────────────────────────┐
│  BAD: Full output returned to parent context                    │
│  ═══════════════════════════════════════════════════════════    │
│  Agent returns: 50,000 chars of search results                  │
│  Parent receives: 50,000 chars (context consumed!)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  GOOD: Summary returned, details to file                        │
│  ═══════════════════════════════════════════════════════════    │
│  Agent writes: 50,000 chars → .claude/cache/agent-xyz.json      │
│  Agent returns: "Found 15 files, 3 issues. Details: [path]"     │
│  Parent receives: ~100 chars (context preserved!)               │
└─────────────────────────────────────────────────────────────────┘
```

### Principle 2: File-Based Progress Tracking

Progress state lives in files, NOT in conversation context.

```javascript
// PROGRESS.json is the source of truth
// Parent reads file, doesn't store full state in context
const progress = JSON.parse(fs.readFileSync('.claude/phase-plans/slug/PROGRESS.json'));
```

### Principle 3: 70% Context Ceiling (60% in Parallel Mode)

Treat 70% context utilization as the maximum safe threshold for sequential mode.
- 0-70%: Normal operation
- 70-80%: Warning - consider compaction
- 80%+: Critical - pause and compact

When running with `--parallel`, the threshold tightens to 60% used (40% remaining) by default. This is configurable via `/orchestration-settings`.

### Principle 4: Non-Blocking Status Checks

Use `TaskOutput` with `block: false` to check status without waiting for full output.

## Agent Output Protocol (AOP)

All CCASP agents MUST follow this output format:

```
[AOP:START] {timestamp}
[AOP:TASK] {brief task description}

... work happens ...

[AOP:SUMMARY]
- Key finding 1
- Key finding 2
- Key finding 3
Total: {N} items processed, {M} issues found

[AOP:DETAILS_FILE] .claude/cache/agent-outputs/{agent-id}-{timestamp}.json

[AOP:STATUS] {success|failure|partial}
[AOP:END] {timestamp}
```

### AOP Summary Rules

| Output Type | Max Summary Length | Details Location |
|-------------|-------------------|------------------|
| Search results | 500 chars | JSON file with full paths |
| Analysis | 800 chars | Markdown file with full analysis |
| Code changes | 300 chars | Git diff or file list |
| Test results | 400 chars | Full test output in file |
| Build output | 200 chars | Build log file |

## Implementation Patterns

### Pattern A: Parallel Agents with Summary Collection

```typescript
async function launchParallelAgentsContextSafe(subtasks: Subtask[]) {
  const cacheDir = '.claude/cache/agent-outputs';
  await ensureDir(cacheDir);

  // Generate unique batch ID
  const batchId = `batch-${Date.now()}`;

  // Prepare prompts with AOP instructions
  const agents = subtasks.map((subtask, index) => ({
    description: subtask.title,
    prompt: `
${subtask.prompt}

**OUTPUT REQUIREMENTS (MANDATORY):**
1. Write detailed results to: ${cacheDir}/${batchId}-${index}.json
2. Return ONLY a summary (max 500 chars) in this format:
   [AOP:SUMMARY] {brief findings}
   [AOP:DETAILS_FILE] ${cacheDir}/${batchId}-${index}.json
   [AOP:STATUS] success|failure
3. DO NOT return full search results, file contents, or verbose output
`,
    subagent_type: subtask.type,
    model: 'haiku', // Use haiku for faster, cheaper parallel work
    run_in_background: true
  }));

  // Launch all agents
  const handles = await Promise.all(agents.map(a => Task(a)));

  // Collect summaries only (not full outputs)
  const summaries = [];
  for (const handle of handles) {
    // Non-blocking check first
    let status = await TaskOutput({ task_id: handle.task_id, block: false, timeout: 1000 });

    // Wait with timeout if not complete
    if (!status.complete) {
      status = await TaskOutput({ task_id: handle.task_id, block: true, timeout: 60000 });
    }

    // Extract only the summary portion
    const summary = extractAOPSummary(status.output);
    summaries.push(summary);
  }

  return {
    summaries,
    detailsDir: cacheDir,
    batchId
  };
}

function extractAOPSummary(output: string): string {
  // Extract only [AOP:SUMMARY] to [AOP:STATUS] section
  const summaryMatch = output.match(/\[AOP:SUMMARY\]([\s\S]*?)\[AOP:STATUS\]/);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 500);
  }
  // Fallback: take last 200 chars
  return output.slice(-200);
}
```

### Pattern B: Sequential Phases with File-Based State

```typescript
async function executePhaseContextSafe(phaseId: number, progressPath: string) {
  // Read state from file (not from context)
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  const phase = progress.phases.find(p => p.id === phaseId);

  // Execute tasks
  for (const task of phase.tasks) {
    if (task.completed) continue;

    // Execute with AOP-compliant prompt
    const result = await executeTaskWithAOP(task);

    // Update file immediately (not context)
    task.completed = result.status === 'success';
    task.completedAt = new Date().toISOString();
    task.resultSummary = result.summary; // Summary only!
    task.resultFile = result.detailsFile; // Full details in file

    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

    // Return minimal status to context
    console.log(`Task ${task.id}: ${result.summary.slice(0, 100)}`);
  }

  // Return minimal phase summary
  return {
    phaseId,
    completed: phase.tasks.every(t => t.completed),
    summary: `Phase ${phaseId}: ${phase.tasks.filter(t => t.completed).length}/${phase.tasks.length} tasks`
  };
}
```

### Pattern C: Run-All with Checkpoint Recovery

```typescript
/**
 * HARD GATE: Phases execute ONE AT A TIME, in strict order.
 * Phase N+1 CANNOT start until Phase N is "completed" in PROGRESS.json.
 * This function NEVER launches multiple phases in parallel.
 */
async function runAllPhasesContextSafe(progressPath: string) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  // Process phases STRICTLY SEQUENTIALLY — one at a time
  for (const phase of progress.phases) {
    if (phase.status === 'completed') {
      console.log(`✓ Phase ${phase.id} already complete`);
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // HARD GATE: Context check BEFORE each phase (not after)
    // ═══════════════════════════════════════════════════════════════
    const contextUsage = await checkContextUtilization();
    if (contextUsage > 0.7) {
      console.log(`⛔ CONTEXT GATE: ${Math.round(contextUsage * 100)}% used. STOPPING.`);
      console.log('   Run /compact to free context, then resume.');
      console.log('   Progress is saved — you will pick up where you left off.');
      return {
        completed: false,
        summary: `Paused at Phase ${phase.id}: context at ${Math.round(contextUsage * 100)}%`
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // HARD GATE: Verify previous phase is "completed" before starting
    // ═══════════════════════════════════════════════════════════════
    const phaseIndex = progress.phases.indexOf(phase);
    if (phaseIndex > 0) {
      const prevPhase = progress.phases[phaseIndex - 1];
      if (prevPhase.status !== 'completed') {
        console.log(`⛔ HARD GATE: Cannot start Phase ${phase.id}`);
        console.log(`   Previous Phase ${prevPhase.id} status: "${prevPhase.status}" (must be "completed")`);
        return {
          completed: false,
          summary: `Blocked: Phase ${prevPhase.id} not complete`
        };
      }
    }

    console.log(`▶ Starting Phase ${phase.id}: ${phase.name}`);
    console.log(`  (This is the ONLY phase running right now)`);

    // Execute SINGLE phase with context-safe pattern — blocks until complete
    const result = await executePhaseContextSafe(phase.id, progressPath);

    // Update phase status in file IMMEDIATELY
    phase.status = result.completed ? 'completed' : 'in_progress';
    phase.completedAt = result.completed ? new Date().toISOString() : null;
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

    // If phase did not complete, STOP — do not continue to next phase
    if (!result.completed) {
      console.log(`⛔ Phase ${phase.id} did not complete. Halting execution.`);
      return {
        completed: false,
        summary: `Stopped at Phase ${phase.id}: incomplete`
      };
    }
  }

  return {
    completed: progress.phases.every(p => p.status === 'completed'),
    summary: `${progress.phases.filter(p => p.status === 'completed').length}/${progress.phases.length} phases complete`
  };
}
```

### Pattern D: Epic Execution with Minimal Context

```typescript
async function executeEpicContextSafe(epicSlug: string) {
  const epicPath = `.claude/epics/${epicSlug}/EPIC.json`;
  const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));

  for (const roadmap of epic.roadmaps) {
    if (roadmap.status === 'completed') continue;

    console.log(`🚀 Roadmap: ${roadmap.title}`);

    // Delegate to roadmap-track (which handles its own context)
    // The roadmap writes to its own ROADMAP.json, epic reads file for status
    await runSlashCommand(`/roadmap-track ${roadmap.slug} run-all`);

    // Read result from file, not from command output
    const roadmapPath = `.claude/roadmaps/${roadmap.slug}/ROADMAP.json`;
    const roadmapState = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

    // Update epic with minimal data
    roadmap.status = roadmapState.status;
    roadmap.completion = roadmapState.metadata.overall_completion_percentage;
    fs.writeFileSync(epicPath, JSON.stringify(epic, null, 2));

    // Minimal context output
    console.log(`  → ${roadmap.status}: ${roadmap.completion}%`);
  }

  return {
    status: epic.roadmaps.every(r => r.status === 'completed') ? 'completed' : 'in_progress',
    summary: `Epic ${epicSlug}: ${epic.roadmaps.filter(r => r.status === 'completed').length}/${epic.roadmaps.length} roadmaps`
  };
}
```

## Context Budget Management

### Budget Allocation per Level

| Level | Context Budget | Notes |
|-------|---------------|-------|
| Epic | 10,000 tokens | Coordination only |
| Roadmap | 20,000 tokens | Plan-level coordination |
| Phase-Dev-Plan | 30,000 tokens | Phase execution |
| L2 Specialist | 50,000 tokens | Implementation work |
| L3 Worker | Full 200K | Isolated, doesn't affect parent |

### Context Checkpoint Hook

Add to any long-running orchestration:

```typescript
async function contextCheckpoint(thresholdPercent = 70) {
  // Estimate current context usage
  const estimate = await estimateContextUsage();

  if (estimate.percent >= thresholdPercent) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ⚠️ CONTEXT CHECKPOINT                                          ║
╠════════════════════════════════════════════════════════════════╣
║  Current usage: ${estimate.percent}% (${estimate.tokens} tokens)
║  Threshold: ${thresholdPercent}%
║
║  Options:
║  1. /compact - Compress conversation and continue
║  2. /clear - Start fresh (progress saved to files)
║  3. Continue - Risk degraded performance
╚════════════════════════════════════════════════════════════════╝
    `);

    // Return checkpoint status for caller to handle
    return { checkpoint: true, usage: estimate };
  }

  return { checkpoint: false, usage: estimate };
}
```

## Migration Checklist

When updating existing CCASP commands to be context-safe:

- [ ] Add AOP instructions to all agent prompts
- [ ] Replace full output returns with summary extraction
- [ ] Store detailed results in `.claude/cache/agent-outputs/`
- [ ] Use file-based state (PROGRESS.json) as source of truth
- [ ] Add context checkpoints for run-all modes
- [ ] Use `block: false` for initial TaskOutput checks
- [ ] Cap summary lengths per output type
- [ ] Add cleanup for cache files after completion

## File Locations

| Purpose | Path |
|---------|------|
| Agent outputs | `.claude/cache/agent-outputs/{agent-id}.json` |
| Phase progress | `.claude/phase-plans/{slug}/PROGRESS.json` |
| Roadmap state | `.claude/roadmaps/{slug}/ROADMAP.json` |
| Epic state | `.claude/epics/{slug}/EPIC.json` |
| Context checkpoints | `.claude/cache/context-checkpoints.json` |

## Controlled Parallelism (--parallel Flag)

The `--parallel` flag on existing commands introduces **controlled parallelism** while preserving context safety. These rules apply when executing with `--parallel`:

- `/phase-track {slug} --run-all --parallel` — parallel tasks within each phase
- `/roadmap-track {slug} run-all --parallel` — parallel plans within a roadmap
- Epic-level: parallel roadmaps via `/github-epic-status` orchestration

All parallelism settings are configurable via `/orchestration-settings` or CLI menu option 8.

### Parallelism Hierarchy

| Level | Default (Sequential) | --parallel Mode | Configurable? |
|-------|---------------------|-----------------|---------------|
| Tasks within a phase | 1 at a time | **Max 2 parallel** background agents | `maxTasks` (1-4) |
| Phases within a plan | 1 at a time (hard gate) | 1 at a time (hard gate - unchanged) | No |
| Plans within a roadmap | 1 at a time | **Max 2 parallel** (if independent) | `maxPlans` (1-3) |
| Roadmaps within an epic | 1 at a time | **Max 2 parallel** (if independent) | `maxRoadmaps` (1-3) |
| Context auto-compact | 70% = offer compact | **60% = aggressive auto-compact** | `remainingThreshold` |

### Task-Level Parallelism Rules

Tasks within a phase can run in parallel (max 2, configurable) ONLY when:
- Tasks have no `depends_on` overlap (task B doesn't depend on task A)
- Tasks don't modify the same files (no `files`/`scope` overlap)
- If dependency metadata is unavailable or only 1 independent task exists, fall back to sequential

Each parallel task uses the Agent Output Protocol (AOP) and runs as a background agent with `run_in_background: true`. Results are written to `.claude/cache/agent-outputs/` and PROGRESS.json is updated immediately after each task completes.

### Plan/Roadmap-Level Parallelism Rules

Plans within a roadmap (or roadmaps within an epic) can run in parallel (max 2, configurable) ONLY when:
- No `cross_plan_dependencies` exist between them (neither blocks the other)
- Both have all prerequisite dependencies satisfied
- The dependency graph (topological sort) confirms independence

Each parallel plan/roadmap agent runs the full sequential execution internally (`/phase-track --run-all` or `/roadmap-track run-all`). The parent orchestrator monitors via `TaskOutput` with `block: true` and reads PROGRESS.json/ROADMAP.json for ground truth.

### Aggressive Compacting Protocol (--parallel Mode)

When `--parallel` is active, compacting follows a strict protocol to keep context safe:

1. **Compact after launch**: Immediately after spinning up background agents, run `/compact` to free the launch context
2. **Poll every 2 minutes**: Check background agents via `TaskOutput` with `timeout: 120000` (configurable via `pollIntervalSec`)
3. **Compact after each poll**: After every `TaskOutput` check, run `/compact` to free the poll results from context
4. **Stop at threshold**: If remaining context drops below the threshold (default 40%), stop launching new agents and wait for running ones to finish

This ensures context never accumulates from multiple poll cycles or launch sequences.

```
┌─────────────────────────────────────────────────────────────────┐
│  Parallel Execution Loop                                         │
│  ════════════════════════════════════════════════════════════    │
│                                                                  │
│  1. Select independent batch (max 2 items)                       │
│  2. Launch background agents (run_in_background: true)           │
│  3. /compact  ← immediately after launch                         │
│  4. Poll: TaskOutput(timeout: 120000)  ← wait 2 min             │
│  5. /compact  ← after each poll result                           │
│  6. Repeat 4-5 until all agents complete                         │
│  7. Update PROGRESS.json / ROADMAP.json                          │
│  8. Check remaining context — if < 40%, stop                     │
│  9. Next batch → go to step 1                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration via tech-stack.json

Settings are stored in `tech-stack.json` under the `orchestration` key and can be modified via:
- **CLI**: `ccasp` → Settings → option 8 (Orchestration)
- **Slash command**: `/orchestration-settings` (with optional flags like `--max-tasks N`, `--compact-at N`)
- **Neovim**: Appshell icon rail → Orchestration section

```json
{
  "orchestration": {
    "parallel": {
      "maxTasks": 2,
      "maxPlans": 2,
      "maxRoadmaps": 2
    },
    "compacting": {
      "remainingThreshold": 40,
      "pollIntervalSec": 120,
      "compactAfterLaunch": true,
      "compactAfterPoll": true
    }
  }
}
```

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `maxTasks` | 2 | 1-4 | Max parallel background agents per phase |
| `maxPlans` | 2 | 1-3 | Max parallel plans per roadmap |
| `maxRoadmaps` | 2 | 1-3 | Max parallel roadmaps per epic |
| `remainingThreshold` | 40 | 20-50 | Stop launching at N% remaining context |
| `pollIntervalSec` | 120 | 60-300 | Seconds between TaskOutput polls |
| `compactAfterLaunch` | true | bool | Compact immediately after launching agents |
| `compactAfterPoll` | true | bool | Compact after each poll cycle |

---

## Related Patterns

- L1→L2 Orchestration (updated for context safety)
- Multi-Phase Orchestration (updated for context safety)
- Agent Output Protocol (new)
- Controlled Parallelism (--parallel flag)

---

*Context-Safe Orchestration Pattern - CCASP v2.6.2*
*Prevents context window overflow in parallel agent workflows*
