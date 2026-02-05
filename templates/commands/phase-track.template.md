---
description: Track progress of phased development plans
model: haiku
---

# /phase-track - Phased Development Progress Tracker

View and update progress on phased development plans.

---

## HARD SEQUENTIAL GATES (NON-NEGOTIABLE)

**Phases execute ONE AT A TIME. Phase N+1 CANNOT start until Phase N status = `completed` in PROGRESS.json.**

### FORBIDDEN - Will Cause Context Overflow and Lost Work:
- **DO NOT** start Phase N+1 while Phase N is still `in_progress`
- **DO NOT** launch multiple phases in parallel (even via background agents)
- **DO NOT** launch tasks from different phases simultaneously
- **DO NOT** skip a phase that failed validation and continue to the next
- **DO NOT** interpret "run-all" as "run all at once" — it means "run all sequentially, one at a time"

### REQUIRED - Hard Gate Protocol:
1. **ONE phase at a time**: Execute all tasks in Phase N → verify all complete → mark Phase N `completed` → THEN start Phase N+1
2. **Verify via PROGRESS.json**: Read the file to confirm `status: "completed"` before advancing — do not rely on memory
3. **Context checkpoint**: Before EACH phase, check context usage. If >70%, STOP and offer /compact
4. **Failure = Full Stop**: If a task or phase fails, HALT execution. Do NOT continue to the next phase. Report the error and wait for user input
5. **File is source of truth**: Write to PROGRESS.json after EVERY task completion. If the session crashes, progress is preserved

---

{{#if phasedDevelopment.enabled}}

## Configuration

| Setting | Value |
|---------|-------|
| Default Scale | {{phasedDevelopment.defaultScale}} |
| Success Target | {{phasedDevelopment.successTarget}} ({{phasedDevelopment.successTarget * 100}}%) |
| Progress File | {{phasedDevelopment.progressFile}} |

## Available Projects

Scan for active phased development projects in **both structures**:

```bash
# NEW CONSOLIDATED STRUCTURE (preferred):
# Roadmaps with phases in: .claude/roadmaps/{slug}/phase-*.json

# LEGACY STRUCTURE (fallback):
# Phase plans in: .claude/phase-plans/{slug}/
# Progress files in: .claude/docs/*/PROGRESS.json

# Find all phase plans (new structure)
find .claude/roadmaps -name "phase-*.json" -type f 2>/dev/null

# Find legacy PROGRESS.json files
find .claude/docs -name "PROGRESS.json" -type f 2>/dev/null

# Or on Windows
dir /s /b .claude\roadmaps\phase-*.json
dir /s /b .claude\docs\PROGRESS.json
```

## Progress File Structure

```json
{
  "projectName": "Feature X",
  "scale": "M",
  "targetSuccess": 0.95,
  "agent_assignments": {
    "available": true,
    "count": 5,
    "byDomain": {
      "frontend": "frontend-react-specialist",
      "backend": "backend-fastapi-specialist"
    }
  },
  "phases": [
    {
      "id": 1,
      "name": "Setup & Foundation",
      "status": "completed",
      "assignedAgent": "backend-fastapi-specialist",
      "tasks": [
        { "id": "1.1", "description": "Create database schema", "completed": true },
        { "id": "1.2", "description": "Set up API endpoints", "completed": true }
      ],
      "completedAt": "2025-01-30T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Core Implementation",
      "status": "in_progress",
      "assignedAgent": "frontend-react-specialist",
      "tasks": [
        { "id": "2.1", "description": "Implement business logic", "completed": true },
        { "id": "2.2", "description": "Add validation", "completed": false }
      ]
    }
  ],
  "metrics": {
    "totalTasks": 10,
    "completedTasks": 5,
    "currentPhase": 2,
    "estimatedCompletion": "2025-01-31"
  }
}
```

## Commands

### View Progress

```
/phase-track <project-slug>
```

Displays:
- Overall progress percentage
- Current phase status
- Remaining tasks
- Estimated completion

### Update Task Status

```
/phase-track <project-slug> --complete <task-id>
```

Marks a task as completed and updates metrics.

### Generate Report

```
/phase-track <project-slug> --report
```

Generates a markdown progress report.

### Run All Phases (Autonomous Mode - STRICTLY Sequential)

```
/phase-track <project-slug> --run-all
```

Executes ALL remaining phases **one at a time, in order**. "Run-all" does NOT mean "run all at once."

**Hard Gate Rules:**
- Only ONE phase runs at any moment. The next phase WAITS for the current to complete
- Phase N must reach `status: "completed"` in PROGRESS.json before Phase N+1 can begin
- If a phase fails, execution STOPS — it does NOT skip to the next phase

**Execution behavior:**
- Starts from current phase (or Phase 1 if none active)
- Completes all tasks in each phase before moving to next
- **Updates PROGRESS.json after each task (file is source of truth)**
- **Context checkpoint at 70% - STOPS for /compact if needed**
- **Returns summaries only - full results in cache files**
- Continues until all phases complete or an error occurs
- Can be interrupted with Ctrl+C at any time
- **Safe to /compact mid-execution - progress is preserved in files**

**Context Safety:**
- All task results written to `.claude/cache/agent-outputs/`
- PROGRESS.json updated immediately after each task
- Parent orchestrators receive summary only (max 200 chars)
- Use `/context-audit` to check current utilization

**Ideal for:**
- Well-defined plans with clear task boundaries
- Overnight or unattended execution
- When you want Claude to handle the entire implementation
- **Long-running sessions that may hit context limits**

## Progress Visualization

```
Project: Feature X (M scale, 95% target)
════════════════════════════════════════

Phase 1: Setup & Foundation     ████████████████████ 100% ✓  🤖 backend-fastapi-specialist
Phase 2: Core Implementation    ████████████░░░░░░░░  60%    🤖 frontend-react-specialist
Phase 3: Testing & Validation   ░░░░░░░░░░░░░░░░░░░░   0%    🤖 testing-playwright-specialist
Phase 4: Documentation          ░░░░░░░░░░░░░░░░░░░░   0%

Overall: ████████░░░░░░░░░░░░  40% (4/10 tasks)

Current Task: 2.2 - Add validation
Assigned Agent: frontend-react-specialist
```

{{#if agents.available}}
## Agent Assignments

When agent registry is available, each phase shows its assigned specialist agent.
Deploy the assigned agent when executing phase tasks for domain-specific expertise.

| Phase | Assigned Agent | Domain |
|-------|---------------|--------|
{{#if agents.frontend}}| Frontend phases | {{agents.frontend.name}} | frontend |{{/if}}
{{#if agents.backend}}| Backend phases | {{agents.backend.name}} | backend |{{/if}}
{{#if agents.database}}| Database phases | {{agents.database.name}} | database |{{/if}}
{{#if agents.testing}}| Testing phases | {{agents.testing.name}} | testing |{{/if}}
{{#if agents.deployment}}| Deployment phases | {{agents.deployment.name}} | deployment |{{/if}}
{{/if}}

## Ralph Loop Integration

For testing phases or when validation tests fail, use Ralph Loop for continuous test-fix cycles:

### When to Use Ralph Loop

- After completing implementation phases
- When phase validation tests fail
- During "Testing & Validation" phases
- Before marking a phase as complete

### Recommended Workflow

```
1. Complete implementation tasks in phase
2. Run phase validation tests
3. If tests fail → /ralph to start continuous loop
4. Ralph fixes failures automatically
5. When all pass → Mark phase complete
```

### Testing Configuration

```json
// From PROGRESS.json
{
  "testing_config": {
    "ralph_loop": {
      "enabled": true,
      "testCommand": "npm test",
      "maxIterations": 10,
      "autoStart": false
    },
    "e2e_framework": "playwright",
    "testingAgentAvailable": true,
    "testingAgentName": "testing-playwright-specialist"
  }
}
```

### Ralph Loop Commands

| Command | Description |
|---------|-------------|
| `/ralph` | Auto-detect tests, start loop |
| `/ralph npm test` | Use specific test command |
| `/ralph --max 15` | Increase iteration limit |
| `/ralph --stop` | Stop current loop |

{{#if testing.e2e.framework}}
**E2E Testing**: Use `/ralph --playwright` for {{testing.e2e.framework}} tests
{{/if}}

> 💡 **Tip**: Enable Ralph Loop auto-start in PROGRESS.json to automatically begin test-fix cycles after each phase.

## Instructions for Claude

When this command is invoked:

1. If no project specified, list all available projects with PROGRESS.json
2. If project specified:
   - Load PROGRESS.json
   - Display progress visualization
   - Show current phase and task details
3. If --complete flag, update task status and recalculate metrics
4. If --report flag, generate markdown report
5. **If --run-all flag, execute context-safe autonomous mode:**

### Run-All Context-Safe Implementation

```javascript
/**
 * HARD GATE: Phases execute ONE AT A TIME, in strict order.
 * Phase N+1 CANNOT start until Phase N is "completed" in PROGRESS.json.
 * This function NEVER launches multiple phases in parallel.
 * Violating this causes context overflow — the exact bug this prevents.
 */
async function runAllPhasesContextSafe(progressPath) {
  const cacheDir = '.claude/cache/agent-outputs';
  const batchId = `phase-run-${Date.now()}`;

  // Load state from file (not from context/memory)
  let progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  for (const phase of progress.phases) {
    if (phase.status === 'completed') {
      console.log(`✓ Phase ${phase.id} complete`);
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // HARD GATE #1: Context check BEFORE each phase (not after)
    // ═══════════════════════════════════════════════════════════════
    const usage = await estimateContextUsage();
    if (usage.percent > 70) {
      console.log(`\n⛔ CONTEXT GATE: ${usage.percent}% used. STOPPING execution.`);
      console.log('   Run /compact then resume with /phase-track ${slug} --run-all');
      console.log('   Progress is saved — you will pick up where you left off.\n');
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
      return { paused: true, atPhase: phase.id, progressPath };
    }

    // ═══════════════════════════════════════════════════════════════
    // HARD GATE #2: Verify previous phase completed before starting
    // ═══════════════════════════════════════════════════════════════
    const phaseIndex = progress.phases.indexOf(phase);
    if (phaseIndex > 0) {
      const prevPhase = progress.phases[phaseIndex - 1];
      if (prevPhase.status !== 'completed') {
        console.log(`\n⛔ HARD GATE: Cannot start Phase ${phase.id}`);
        console.log(`   Previous Phase ${prevPhase.id} status: "${prevPhase.status}" (must be "completed")`);
        console.log(`   Complete Phase ${prevPhase.id} first, then retry.`);
        return { blocked: true, atPhase: phase.id, reason: `Phase ${prevPhase.id} not complete` };
      }
    }

    console.log(`\n▶ Phase ${phase.id}: ${phase.name} (ONLY phase running right now)`);
    phase.status = 'in_progress';

    // Execute tasks with AOP
    for (const task of phase.tasks) {
      if (task.completed) continue;

      // Task execution with summary-only return
      const result = await executeTaskContextSafe(task, cacheDir, batchId);

      // Update file immediately
      task.completed = result.status === 'success';
      task.resultSummary = result.summary.slice(0, 200);
      task.resultFile = result.detailsFile;
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

      console.log(`   ${task.completed ? '✓' : '✗'} ${task.id}: ${result.summary.slice(0, 50)}`);
    }

    // Update phase status
    const allTasksComplete = phase.tasks.every(t => t.completed);
    phase.status = allTasksComplete ? 'completed' : 'partial';
    phase.completedAt = phase.status === 'completed' ? new Date().toISOString() : null;
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

    // ═══════════════════════════════════════════════════════════════
    // HARD GATE #3: If phase did NOT complete, STOP — do NOT continue
    // ═══════════════════════════════════════════════════════════════
    if (!allTasksComplete) {
      const failedTasks = phase.tasks.filter(t => !t.completed);
      console.log(`\n⛔ Phase ${phase.id} has ${failedTasks.length} incomplete task(s). HALTING.`);
      console.log(`   Failed: ${failedTasks.map(t => t.id).join(', ')}`);
      console.log(`   Fix these tasks before continuing to Phase ${phase.id + 1}.`);
      return {
        status: 'partial',
        summary: `Stopped at Phase ${phase.id}: ${failedTasks.length} tasks incomplete`,
        progressPath
      };
    }
  }

  // Calculate final metrics
  const completed = progress.phases.filter(p => p.status === 'completed').length;
  progress.status = completed === progress.phases.length ? 'completed' : 'partial';
  progress.completion_percentage = Math.round((completed / progress.phases.length) * 100);
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

  // Return summary only (parent reads details from file)
  return {
    status: progress.status,
    summary: `${completed}/${progress.phases.length} phases complete (${progress.completion_percentage}%)`,
    progressPath
  };
}

async function executeTaskContextSafe(task, cacheDir, batchId) {
  const outputFile = `${cacheDir}/${batchId}-task-${task.id}.json`;

  // If task has assigned agent, use it with AOP prompt
  if (task.assignedAgent) {
    const result = await Task({
      description: `Task ${task.id}: ${task.description.slice(0, 30)}`,
      prompt: `${task.description}

**OUTPUT REQUIREMENTS (Context Safety):**
1. Write detailed results to: ${outputFile}
2. Return ONLY:
   [AOP:SUMMARY] Brief description of what was done
   [AOP:DETAILS_FILE] ${outputFile}
   [AOP:STATUS] success|failure`,
      subagent_type: task.assignedAgent,
      model: 'haiku',
      run_in_background: false
    });

    return extractAOPResult(result);
  }

  // Direct execution for simple tasks
  return { status: 'success', summary: 'Task completed', detailsFile: null };
}
```

{{else}}

## Phased Development Disabled

Phased development system is not enabled for this project.

To enable:
1. Run `/menu` → Project Settings (if available)
2. Or set `phasedDevelopment.enabled: true` in tech-stack.json
3. Use `/create-phase-dev` to create a new phased plan

{{/if}}

---

*Generated from tech-stack.json template*
