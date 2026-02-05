# Epic Hierarchy Architecture

## Overview

CCASP uses a 3-level hierarchy for project management:

```
Epic (Strategy)       ← Coordinates multiple roadmaps
  ↓
Roadmap (Orchestration) ← Orchestrates multiple phases
  ↓
Phase-Dev (Execution)   ← Executes tasks (THE ONLY LEVEL THAT DOES WORK)
```

## Level Responsibilities

### Epic (Strategy)
**File:** `.claude/epics/{slug}/EPIC.json`

**Responsibilities:**
- Define multi-roadmap strategy
- Coordinate roadmap dependencies
- Track epic-level completion
- Manage token budgets
- Enforce gating requirements

**Does NOT:**
- Execute tasks
- Modify ROADMAP.json directly
- Modify PROGRESS.json

### Roadmap (Orchestration)
**File:** `.claude/roadmaps/{slug}/ROADMAP.json`

**Responsibilities:**
- Define phase sequence
- Spawn Phase-Dev instances for each phase
- Orchestrate phase dependencies
- Track roadmap-level completion
- Report completion to parent epic

**Does NOT:**
- Execute tasks
- Modify PROGRESS.json directly
- Create tasks (delegates to Phase-Dev)

### Phase-Dev (Execution)
**File:** `.claude/phase-dev/{slug}/PROGRESS.json`

**Responsibilities:**
- Own PROGRESS.json (single source of truth)
- Execute ALL tasks
- Track task completion
- Generate task lists
- Report completion to parent roadmap
- Update parent completion percentages

**The ONLY level that:**
- Executes tasks
- Modifies code
- Runs tests
- Updates PROGRESS.json

## Data Flow

### Creation (Top-Down)

```
1. User creates Epic
   ↓
2. Epic defines roadmaps
   ↓
3. Roadmap spawns Phase-Devs
   {
     type: 'roadmap',
     id: 'roadmap_abc123',
     slug: 'feature-auth',
     title: 'Authentication System'
   }
   ↓
4. Phase-Dev stores parent_context in PROGRESS.json
```

### Completion (Bottom-Up)

```
1. Phase-Dev completes tasks
   ↓
2. Phase-Dev updates PROGRESS.json
   status: 'completed'
   completion_metrics: {...}
   ↓
3. Phase-Dev reports to parent Roadmap
   ROADMAP.json.phases[X].status = 'completed'
   ROADMAP.json.completion_percentage = calculated
   ↓
4. If Roadmap 100% → Reports to parent Epic
   EPIC.json.roadmaps[Y].status = 'completed'
   EPIC.json.completion_percentage = calculated
```

## File Structure

```
.claude/
  epics/
    {epic-slug}/
      EPIC.json                    ← Epic owns this
      state/
        orchestrator-state.json    ← Epic orchestrator state
      roadmaps/                    ← References to child roadmaps

  roadmaps/
    {roadmap-slug}/
      ROADMAP.json                 ← Roadmap owns this
      state/
        orchestrator-state.json    ← Roadmap orchestrator state
      phases/                      ← References to child phase-devs

  phase-dev/
    {phase-dev-slug}/
      PROGRESS.json                ← Phase-Dev owns this (EXECUTION)
      EXECUTIVE_SUMMARY.md
      API_ENDPOINTS.md
      DATABASE_SCHEMA.md
      exploration/                 ← L2 exploration docs
        CODEBASE_MAP.md
        CODE_SNIPPETS.md
        DOMAIN_GLOSSARY.md
        PHASE_BREAKDOWN.md
        DELEGATION.md
        L2_SUMMARY.md
```

## Parent Context

### Phase-Dev Created by Roadmap

```javascript
// Roadmap creates Phase-Dev
await runCreatePhaseDev({
  name: 'Foundation Phase',
  scale: 'S'
}, {
  type: 'roadmap',
  id: 'roadmap_abc123',
  slug: 'feature-auth',
  title: 'Authentication System',
  roadmap_id: 'roadmap_abc123',
  epic_id: 'epic_xyz789'  // If roadmap has parent epic
});

// Phase-Dev stores in PROGRESS.json
{
  "parent_context": {
    "type": "roadmap",
    "id": "roadmap_abc123",
    "slug": "feature-auth",
    "title": "Authentication System",
    "roadmap_id": "roadmap_abc123",
    "epic_id": "epic_xyz789"
  }
}
```

### Standalone Phase-Dev

```javascript
// Direct creation
await runCreatePhaseDev({
  name: 'Quick Feature',
  scale: 'S'
});

// Phase-Dev stores in PROGRESS.json
{
  "parent_context": null
}
```

## Completion Reporting

### Standalone Mode

```javascript
import { markPhaseDevComplete } from './src/phase-dev/index.js';

// Just updates PROGRESS.json
markPhaseDevComplete(projectRoot, 'quick-feature');
```

### Child Mode (Roadmap Parent)

```javascript
import { markPhaseDevComplete, reportPhaseDevComplete } from './src/phase-dev/index.js';

// 1. Update PROGRESS.json
const metrics = markPhaseDevComplete(projectRoot, 'auth-foundation');

// 2. Report to parent roadmap
const result = await reportPhaseDevComplete(projectRoot, 'auth-foundation', metrics);

// Result:
{
  success: true,
  mode: 'roadmap',
  parent: {
    type: 'roadmap',
    id: 'roadmap_abc123',
    slug: 'feature-auth',
    title: 'Authentication System'
  },
  roadmap_completion: 75,  // Roadmap is 75% done
  metrics: {
    tasks_completed: 25,
    files_modified: ['src/auth/login.js'],
    tests_added: 5,
    tokens_used: 15000
  }
}

// If roadmap reaches 100%, automatically reports to epic
```

## Completion Metrics

Auto-calculated from PROGRESS.json:

```javascript
{
  tasks_completed: 25,
  tasks_total: 30,
  files_modified: [
    'src/auth/login.js',
    'src/auth/middleware.js',
    'src/auth/schema.sql'
  ],
  tests_added: 5,
  tokens_used: 15000,
  duration_ms: 3600000  // 1 hour
}
```

## State Management

### Epic State
**File:** `.claude/epics/{slug}/state/orchestrator-state.json`

```json
{
  "status": "active",
  "currentRoadmapIndex": 1,
  "activeRoadmaps": [...],
  "completedRoadmaps": [...],
  "tokenBudget": {
    "used": 50000,
    "total": 500000
  },
  "metrics": {
    "roadmapsCompleted": 2,
    "totalTasks": 150
  }
}
```

### Roadmap State
**File:** `.claude/roadmaps/{slug}/state/orchestrator-state.json`

```json
{
  "status": "active",
  "currentPhaseIndex": 2,
  "activePhases": [...],
  "completedPhases": [...],
  "metrics": {
    "phasesCompleted": 2,
    "totalTasks": 50
  }
}
```

### Phase-Dev State
**File:** `.claude/phase-dev/{slug}/PROGRESS.json`

```json
{
  "project": {...},
  "parent_context": {...},
  "phases": [
    {
      "phase_id": "phase-1",
      "status": "completed",
      "tasks": [...]
    }
  ],
  "execution_log": [...],
  "status": "completed",
  "completion_metrics": {...}
}
```

## Ownership Rules

1. **Epic owns EPIC.json**
   - Can read ROADMAP.json
   - Cannot modify ROADMAP.json
   - Cannot modify PROGRESS.json

2. **Roadmap owns ROADMAP.json**
   - Can read PROGRESS.json
   - Cannot modify PROGRESS.json
   - Reports to EPIC.json when complete

3. **Phase-Dev owns PROGRESS.json**
   - The ONLY level that executes tasks
   - Reports to ROADMAP.json when complete
   - Can trigger roadmap → epic cascade

## Slash Commands

```bash
# Epic level
/epic-start {epic-slug}          # Start epic orchestrator
/epic-status {epic-slug}         # Check epic progress

# Roadmap level
/roadmap-start {roadmap-slug}    # Start roadmap orchestrator
/roadmap-status {roadmap-slug}   # Check roadmap progress

# Phase-Dev level (execution)
/phase-dev-{slug}                # Execute phase-dev tasks
```

## Key Principles

1. **Single Source of Truth**
   - Epic owns EPIC.json
   - Roadmap owns ROADMAP.json
   - Phase-Dev owns PROGRESS.json

2. **Parent Context is Immutable**
   - Set at creation time
   - Never modified during execution

3. **Completion Flows Upward**
   - Phase-Dev → Roadmap → Epic
   - Automatic cascading when 100%

4. **Execution at Bottom Only**
   - Only Phase-Dev executes tasks
   - Roadmap orchestrates
   - Epic coordinates

5. **Metrics are Comprehensive**
   - Tasks, files, tests, tokens, duration
   - Auto-calculated from execution log

---

**Epic coordinates. Roadmap orchestrates. Phase-Dev executes.**
