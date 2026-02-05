# Roadmap Track - Multi-Plan Execution Coordinator

You are a roadmap execution coordinator. You coordinate execution across MULTIPLE phase-dev-plans within a roadmap, respect cross-plan dependencies, and aggregate progress.

> ⚠️ **CONTEXT SAFETY REQUIRED**: This command MUST follow [Context-Safe Orchestration](../patterns/context-safe-orchestration.md) patterns. All plan executions return summaries only. Full results stored in files.

## Context Safety Rules

| Rule | Implementation |
|------|----------------|
| File-based state | ROADMAP.json is source of truth |
| Summary-only delegation | /phase-track returns max 200 chars |
| No full output aggregation | Read completion from files |
| Context checkpoints | Check before each plan |

## NEW ARCHITECTURE (Epic-Hierarchy)

Roadmap now coordinates MULTIPLE phase-dev-plans instead of direct phases:

```
Roadmap: User Authentication
  ├─ Phase-Dev-Plan: auth-backend (PROGRESS.json)
  │   ├─ Phase 1: Database Schema
  │   ├─ Phase 2: API Endpoints
  │   └─ Phase 3: Middleware
  ├─ Phase-Dev-Plan: auth-frontend (PROGRESS.json)
  │   ├─ Phase 1: Login UI
  │   ├─ Phase 2: Token Management
  │   └─ Phase 3: Protected Routes
  └─ Phase-Dev-Plan: auth-testing (PROGRESS.json)
      ├─ Phase 1: Unit Tests
      └─ Phase 2: E2E Tests
```

**Key Changes:**
- Roadmap tracks **phase-dev-plan references**, not direct phases
- Each plan has its own PROGRESS.json
- Cross-plan dependencies (e.g., frontend waits for backend)
- Roadmap completion = average of all plan completions

## Execution Protocol

### Step 1: Load Roadmap State

Load the roadmap and all plan references:

```javascript
// Load roadmap from consolidated structure
function loadRoadmapState(slug) {
  const roadmapPath = `.claude/roadmaps/${slug}/ROADMAP.json`;

  if (!existsSync(roadmapPath)) {
    throw new Error(`Roadmap not found: ${roadmapPath}`);
  }

  const roadmap = JSON.parse(readFileSync(roadmapPath, 'utf8'));

  // Load all plan PROGRESS.json files
  const planStates = [];
  for (const planRef of roadmap.phase_dev_plan_refs) {
    const progressPath = planRef.path;
    if (existsSync(progressPath)) {
      const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
      planStates.push({
        slug: planRef.slug,
        ref: planRef,
        progress: progress
      });
    }
  }

  return {
    roadmap,
    planStates,
    structure: 'epic-hierarchy'
  };
}
```

### Step 2: Display Execution Dashboard (Multi-Plan)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ROADMAP EXECUTION DASHBOARD                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  📋 {{roadmap.title}}                                                       ║
║  ──────────────────────────────────────────────────────────────────────────║
║                                                                             ║
║  Overall Progress: [{{progressBar}}] {{overallPercentage}}%                 ║
║  Plans: {{completedPlans}}/{{totalPlans}}                                   ║
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  PHASE-DEV-PLANS                                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each planRefs}}
║  {{statusIcon}} {{slug}}: {{title}}                                         ║
║     Progress: [{{planProgress}}] {{planPercentage}}%                        ║
{{#if isActive}}
║     ▶ ACTIVE                                                                ║
{{/if}}
{{#if isBlocked}}
║     🚫 BLOCKED: {{blockedReason}}                                           ║
{{/if}}
{{#if phases}}
║     Phases: {{completedPhases}}/{{totalPhases}}                             ║
{{/if}}
{{/each}}
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  CROSS-PLAN DEPENDENCIES                                                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each dependencies}}
║  {{dependentSlug}} → {{dependsOnSlug}} {{status}}                           ║
║     Reason: {{reason}}                                                      ║
{{/each}}
{{#if noDependencies}}
║  No cross-plan dependencies                                                 ║
{{/if}}
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  NEXT AVAILABLE                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each nextAvailable}}
║  → {{slug}}: {{title}} (Dependencies satisfied)                             ║
{{/each}}
{{#if noNextAvailable}}
║  No plans available. Check blocked plans or dependencies.                   ║
{{/if}}
║                                                                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Step 3: Offer Actions (Multi-Plan)

Based on current state, offer relevant actions:

**When roadmap has plans pending:**
1. `start <plan-slug>` - Start a specific plan (if dependencies satisfied)
2. `auto` - Auto-start next available plan
3. `run-all` - **Run ALL plans sequentially and autonomously**
4. `status` - Refresh status display

**When roadmap has active plans:**
1. `track <plan-slug>` - Delegate to /phase-track for detailed plan execution
2. `sync <plan-slug>` - Sync plan reference from PROGRESS.json
3. `sync-all` - Sync all plan references
4. `pause` - Pause execution

**When plan is blocked:**
1. `unblock <plan-slug>` - Remove block and resume
2. `skip <plan-slug>` - Skip blocked plan (update dependencies)
3. `reassign <plan-slug>` - Reassign to different approach

**When roadmap is completed:**
1. `report` - Generate completion report
2. `sync-github` - Sync to parent epic (if integrated)
3. `archive` - Archive roadmap and cleanup

### Step 4: Execute Action (Multi-Plan)

#### Start Plan
```javascript
// Check dependencies are satisfied
async function startPlan(roadmap, planSlug) {
  // 1. Check cross-plan dependencies
  const depCheck = checkPlanDependencies(roadmap, planSlug);
  if (!depCheck.satisfied) {
    console.error(`Plan ${planSlug} blocked by dependencies: ${depCheck.missing.join(', ')}`);
    return;
  }

  // 2. Update plan reference status
  updatePlanReference(roadmap, planSlug, { status: 'in_progress' });

  // 3. Delegate to /phase-track for execution
  console.log(`Starting plan: ${planSlug}`);
  console.log(`Delegating to /phase-track ${planSlug}...`);

  // Spawn /phase-track command
  await runCommand(`/phase-track ${planSlug}`);
}
```

#### Sync Plan Reference
```javascript
// Update plan reference from its PROGRESS.json
async function syncPlanRef(roadmap, planSlug) {
  const planRef = roadmap.phase_dev_plan_refs.find(ref => ref.slug === planSlug);
  if (!planRef) return;

  // Load PROGRESS.json
  const progressPath = planRef.path;
  const progress = JSON.parse(readFileSync(progressPath, 'utf8'));

  // Update reference
  updatePlanReference(roadmap, planSlug, {
    status: progress.status,
    completion_percentage: progress.completion_percentage || 0
  });

  // Recalculate overall completion
  roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);

  // Check if roadmap complete
  checkRoadmapCompletion(roadmap);
}
```

#### Sync All Plans
```javascript
// Sync all plan references
async function syncAllPlans(roadmap) {
  for (const planRef of roadmap.phase_dev_plan_refs) {
    await syncPlanRef(roadmap, planRef.slug);
  }

  console.log(`Synced ${roadmap.phase_dev_plan_refs.length} plan references`);
}
```

#### Auto-Advance (Multi-Plan)
```javascript
// Find next available plan (dependencies satisfied)
async function autoAdvance(roadmap) {
  const nextAvailable = getNextAvailablePlans(roadmap);

  if (nextAvailable.length === 0) {
    // Check if all complete
    const allComplete = roadmap.phase_dev_plan_refs.every(ref => ref.status === 'completed');
    if (allComplete) {
      console.log('🎉 All plans complete!');
      return;
    } else {
      console.log('No plans available. Check dependencies or blocked plans.');
      return;
    }
  }

  if (nextAvailable.length === 1) {
    // Auto-start single available plan
    await startPlan(roadmap, nextAvailable[0].slug);
  } else {
    // Multiple available - ask user
    console.log('Multiple plans available:');
    nextAvailable.forEach((plan, i) => {
      console.log(`  ${i + 1}. ${plan.slug}: ${plan.title}`);
    });
    // Prompt for selection
  }
}
```

#### Run All Plans (Autonomous Mode - Context-Safe)
```javascript
/**
 * Execute ALL plans sequentially without user intervention
 * CRITICAL: Follows context-safe orchestration pattern
 */
async function runAllPlans(roadmap) {
  console.log('🚀 AUTONOMOUS MODE (Context-Safe): Running all phase-dev-plans...\n');
  console.log('📋 State tracked in: ROADMAP.json (not context)\n');

  // Get plans in dependency order
  const orderedPlans = topologicalSortPlans(roadmap);
  const roadmapPath = `.claude/roadmaps/${roadmap.slug}/ROADMAP.json`;

  for (const planRef of orderedPlans) {
    // CONTEXT CHECKPOINT: Check before each plan
    const contextUsage = await estimateContextUsage();
    if (contextUsage.percent > 70) {
      console.log(`\n⚠️ CONTEXT CHECKPOINT: ${contextUsage.percent}% used`);
      console.log('   Consider: /compact to free context before continuing');
      console.log('   Progress is saved - you can safely compact and resume.\n');
      // Could pause here for user decision
    }

    // Skip already completed plans
    if (planRef.status === 'completed') {
      console.log(`✓ Plan ${planRef.slug} already complete`);
      continue;
    }

    // Check dependencies
    const depCheck = checkPlanDependencies(roadmap, planRef.slug);
    if (!depCheck.satisfied) {
      console.log(`⚠️ Plan ${planRef.slug} blocked: ${depCheck.missing.join(', ')}`);
      continue;
    }

    // Start plan - update FILE immediately
    console.log(`\n▶ Plan: ${planRef.slug}`);
    updatePlanReference(roadmap, planRef.slug, { status: 'in_progress' });
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

    // Delegate to /phase-track (returns summary only)
    // CRITICAL: Do NOT capture full output - read result from file
    console.log(`   Executing /phase-track ${planRef.slug} run-all...`);
    await runCommand(`/phase-track ${planRef.slug} run-all`);

    // Read result from PROGRESS.json file (not from command output)
    const progressPath = planRef.path;
    const planProgress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Update roadmap with minimal data from file
    planRef.status = planProgress.status || 'completed';
    planRef.completion_percentage = planProgress.completion_percentage || 100;

    // Save to file immediately
    roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);
    fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

    // Minimal context output (summary only)
    console.log(`   ✓ ${planRef.status}: ${planRef.completion_percentage}%`);
    console.log(`   Roadmap: ${roadmap.metadata.overall_completion_percentage}%`);

    // Sync to parent epic (file update, not context)
    if (roadmap.parent_epic) {
      await syncToParentEpic(roadmap);
    }
  }

  // Final status from file
  const allComplete = roadmap.phase_dev_plan_refs.every(p => p.status === 'completed');
  roadmap.status = allComplete ? 'completed' : 'partial';
  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

  console.log(`\n${allComplete ? '🎉 ALL PLANS COMPLETE!' : '⚠️ Some plans incomplete'}`);

  // Return minimal summary (not full results)
  return {
    success: allComplete,
    summary: `${roadmap.phase_dev_plan_refs.filter(p => p.status === 'completed').length}/${roadmap.phase_dev_plan_refs.length} plans complete`,
    roadmapPath // Reference to file for full details
  };
}

// Topological sort for dependency-ordered execution
function topologicalSortPlans(roadmap) {
  const sorted = [];
  const visited = new Set();

  function visit(planSlug) {
    if (visited.has(planSlug)) return;
    visited.add(planSlug);

    // Visit dependencies first
    const deps = roadmap.cross_plan_dependencies.filter(
      dep => dep.dependent_slug === planSlug
    );
    for (const dep of deps) {
      visit(dep.depends_on_slug);
    }

    // Add to sorted list
    const planRef = roadmap.phase_dev_plan_refs.find(ref => ref.slug === planSlug);
    if (planRef) {
      sorted.push(planRef);
    }
  }

  for (const planRef of roadmap.phase_dev_plan_refs) {
    visit(planRef.slug);
  }

  return sorted;
}
```

**Run-All Execution Rules (Multi-Plan, Context-Safe):**
1. Plans execute in dependency order (topological sort)
2. Each plan delegates to /phase-track for detailed execution
3. **Context checkpoint before each plan (pause at 70%)**
4. **Results read from files, not from command output**
5. Plan references synced from PROGRESS.json files
6. Overall roadmap completion updated incrementally in ROADMAP.json
7. Execution continues until all plans complete or error occurs
8. User can interrupt, /compact, and resume at any time
9. If a plan fails, execution pauses and offers recovery options
10. **Full details in files, only summaries in context**

### Step 5: Progress Visualization (Multi-Plan)

Generate ASCII progress bars for plans:

```
Phase-Dev-Plan Progress:
auth-backend:  ████████████████████ 100% ✅
auth-frontend: ████████████░░░░░░░░  60% 🔄 (3/5 phases)
auth-testing:  ░░░░░░░░░░░░░░░░░░░░   0% ⬜ (blocked by auth-frontend)

Overall: [█████████████░░░░░░░░░░░░░░░░░░░░░░] 53%

Dependencies:
  auth-frontend → auth-backend ✅
  auth-testing → auth-frontend ⚠️ (waiting)
```

### Step 6: Parent Epic Sync

If roadmap has parent epic:

```javascript
// Sync to parent epic
async function syncToParentEpic(roadmap) {
  if (!roadmap.parent_epic) return;

  const epicPath = roadmap.parent_epic.epic_path;
  if (!existsSync(epicPath)) {
    console.warn(`Parent epic not found: ${epicPath}`);
    return;
  }

  // Load epic
  const epic = JSON.parse(readFileSync(epicPath, 'utf8'));

  // Update roadmap reference in epic
  const roadmapRef = epic.roadmap_refs.find(ref => ref.slug === roadmap.slug);
  if (roadmapRef) {
    roadmapRef.status = roadmap.status;
    roadmapRef.completion_percentage = roadmap.metadata.overall_completion_percentage;
    roadmapRef.updated = new Date().toISOString();
  }

  // Save updated epic
  writeFileSync(epicPath, JSON.stringify(epic, null, 2));

  console.log(`Synced to parent epic: ${roadmap.parent_epic.epic_slug}`);
}
```

## Argument Handling (Multi-Plan)

- `/roadmap-track` - List all roadmaps, select one
- `/roadmap-track {slug}` - Show specific roadmap dashboard (multi-plan view)
- `/roadmap-track {slug} start {plan-slug}` - Start a plan (delegate to /phase-track)
- `/roadmap-track {slug} sync {plan-slug}` - Sync plan reference from PROGRESS.json
- `/roadmap-track {slug} sync-all` - Sync all plan references
- `/roadmap-track {slug} auto` - Auto-advance to next available plan
- `/roadmap-track {slug} run-all` - Run ALL plans sequentially (autonomous mode)
- `/roadmap-track {slug} report` - Generate completion report
- `/roadmap-track {slug} track {plan-slug}` - Delegate to /phase-track for detailed plan execution

## Execution Rules (Multi-Plan)

1. **Dependency Enforcement**: Cannot start plan with unmet cross-plan dependencies
2. **Multiple Active Plans**: Multiple plans can be in_progress simultaneously (if dependencies allow)
3. **Plan Delegation**: Each plan delegates to /phase-track for detailed execution
4. **Automatic Syncing**: Plan references auto-sync from PROGRESS.json after completion
5. **Parent Epic Sync**: Auto-sync to parent epic on plan completion if integrated
6. **Completion Aggregation**: Roadmap completion = average of all plan completions

## Error Handling (Multi-Plan)

If plan execution fails:
1. Set plan reference status to 'blocked'
2. Record failure reason in plan PROGRESS.json
3. Update roadmap plan reference
4. Block dependent plans automatically
5. Suggest remediation steps (retry, skip, reassign)

## Plan Delegation Pattern

Roadmap delegates to /phase-track for each plan:

```
Roadmap-Track (L0) → coordinates plans
  ├─ /phase-track auth-backend → executes plan phases
  │   └─ spawns L2 specialists for tasks
  ├─ /phase-track auth-frontend → executes plan phases
  │   └─ spawns L2 specialists for tasks
  └─ /phase-track auth-testing → executes plan phases
      └─ spawns L2 specialists for tasks
```

**Key Pattern:**
- Roadmap-Track: Plan-level coordination
- Phase-Track: Phase/task-level execution
- L2 Specialists: Code-level implementation

## Metrics Tracking (Multi-Plan)

Track and display:
- Plans completed (total and this session)
- Overall roadmap completion percentage
- Individual plan completion percentages
- Cross-plan dependency status
- Parent epic sync status
- Time spent per plan

## Related Commands

- `/create-roadmap` - Create new roadmap
- `/roadmap-status` - View-only status (multi-plan view)
- `/roadmap-edit` - Modify roadmap structure and plan references
- `/phase-track` - Track individual phase-dev-plan in detail
- `/epic-track` - Track parent epic (if integrated)
- `/phase-dev-plan` - Create new phase-dev-plan

---

## Dynamic Command Cleanup on Completion

**IMPORTANT:** When a roadmap reaches 100% completion, offer to clean up the dynamic command.

### Completion Detection

```javascript
// When all phases are completed
if (completedPhases === totalPhases && percentage === 100) {
  const dynamicCommandPath = `.claude/commands/roadmap-${slug}.md`;

  // Display completion message
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  🎉 ROADMAP COMPLETE!                                                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  ${roadmap.title}                                                          ║
║                                                                             ║
║  All ${totalPhases} phases completed                                       ║
║  Total tasks: ${completedTasks}/${totalTasks}                              ║
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  CLEANUP OPTIONS                                                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  [1] Remove dynamic command: /roadmap-${slug}                              ║
║  [2] Archive roadmap files                                                  ║
║  [3] Keep everything (do nothing)                                          ║
║                                                                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);
}
```

### Cleanup Actions

**Option 1: Remove Dynamic Command**
```bash
rm .claude/commands/roadmap-{slug}.md
```

**Option 2: Archive Roadmap**
```bash
# Create archive directory
mkdir -p .claude/roadmaps/_archived/

# Move roadmap directory to archive
mv .claude/roadmaps/{slug}/ .claude/roadmaps/_archived/{slug}-{date}/

# Remove dynamic command
rm .claude/commands/roadmap-{slug}.md
```

**Option 3: Keep Everything**
- Roadmap remains accessible via `/roadmap-status {slug}`
- Dynamic command `/roadmap-{slug}` stays available
- Useful if you may resume or reference the roadmap later

### Auto-Cleanup Prompt

When completing the final phase via `/roadmap-track {slug} finish`:

```
header: "Roadmap Complete"
question: "All phases complete! What would you like to do with the roadmap?"
options:
  - label: "Remove dynamic command"
    description: "Delete /roadmap-{slug} command, keep roadmap files"
  - label: "Archive roadmap"
    description: "Move to _archived/, remove command"
  - label: "Keep everything"
    description: "Leave roadmap and command in place"
```

---

## Summary: Roadmap Multi-Plan Architecture

### What Changed

**OLD (Legacy):**
- Roadmap directly contained phases
- Roadmap managed phase execution
- Single ROADMAP.json with embedded phases

**NEW (Epic-Hierarchy):**
- Roadmap coordinates MULTIPLE phase-dev-plans
- Each plan has its own PROGRESS.json
- Roadmap tracks plan references, not phases directly
- Cross-plan dependencies managed at roadmap level
- Plans delegate to /phase-track for execution

### Why This Change

1. **Scalability**: Large roadmaps decompose into manageable plans
2. **Parallelization**: Multiple plans can run concurrently (if dependencies allow)
3. **Separation of Concerns**: Roadmap = plan coordination, Phase-Track = execution
4. **Epic Integration**: Roadmaps can report to parent epics
5. **Domain Isolation**: Backend, frontend, testing as separate plans

### Migration Path

Legacy roadmaps automatically migrate on load:
- Direct phases → converted to plan references
- Phase dependencies → cross-plan dependencies
- Existing PROGRESS.json files preserved
- Backwards compatible (can still read old format)

---

*Roadmap Track - Multi-Plan Coordinator*
*Part of CCASP Epic-Hierarchy Architecture*
