# Phase-Dev Module

**Execution-level module for phased development.**

Phase-Dev is the ONLY level that executes tasks in the CCASP hierarchy. It owns PROGRESS.json and reports completion to parent roadmaps/epics.

## Architecture

```
Epic (Strategy)
  └── Roadmap (Orchestration)
      └── Phase-Dev (Execution) ← YOU ARE HERE
          └── Tasks (Atomic work units)
```

## Responsibilities

1. **Own PROGRESS.json** - Single source of truth for task execution
2. **Execute tasks** - The only level that performs actual work
3. **Report completion** - Signal PHASE_DEV_COMPLETE to parent roadmap/epic
4. **Track metrics** - Tasks completed, files modified, tests added, tokens used
5. **Update parent progress** - Keep roadmap/epic completion percentages current

## Parent Context

Phase-Dev can operate in two modes:

### Standalone Mode
Created directly without a parent roadmap/epic.

```javascript
// PROGRESS.json
{
  "parent_context": null,
  // ...
}
```

### Child Mode
Created as part of a roadmap or epic.

```javascript
// PROGRESS.json
{
  "parent_context": {
    "type": "roadmap",
    "id": "roadmap_abc123",
    "slug": "feature-auth",
    "title": "Authentication System",
    "roadmap_id": "roadmap_abc123",
    "epic_id": null
  },
  // ...
}
```

## Completion Reporting

### API

```javascript
import { reportPhaseDevComplete } from './src/phase-dev/index.js';

// Report completion
const result = await reportPhaseDevComplete(projectRoot, phaseDevSlug, {
  tasks_completed: 25,
  files_modified: ['src/auth/login.js', 'src/auth/middleware.js'],
  tests_added: 5,
  tokens_used: 15000,
  duration_ms: 3600000
});

if (result.success) {
  console.log(`Reported to ${result.mode}: ${result.parent?.title}`);
  console.log(`Roadmap completion: ${result.roadmap_completion}%`);
}
```

### Automatic Metrics

If you don't provide metrics, they are calculated automatically from PROGRESS.json:

```javascript
import { calculateCompletionMetrics, markPhaseDevComplete } from './src/phase-dev/index.js';

// Calculate metrics from PROGRESS.json
const metrics = calculateCompletionMetrics(progress);

// Mark complete with auto-calculated metrics
const metrics = markPhaseDevComplete(projectRoot, phaseDevSlug);
```

### Completion Flow

```
1. Phase-Dev completes all tasks
2. markPhaseDevComplete() updates PROGRESS.json
3. reportPhaseDevComplete() finds parent context
4. Updates parent roadmap's ROADMAP.json
5. Calculates roadmap completion percentage
6. Triggers progress hook (if configured)
7. If roadmap is 100%, reports to epic (if exists)
```

## Integration with Roadmap

Roadmaps spawn Phase-Dev instances for each phase:

```javascript
// In roadmap ROADMAP.json
{
  "phases": [
    {
      "phase_id": "phase-1",
      "title": "Foundation",
      "phase_dev_slug": "auth-foundation",  // Links to .claude/phase-dev/auth-foundation/
      "status": "completed",
      "completion_metrics": {
        "tasks_completed": 25,
        "files_modified": [...],
        "tests_added": 5
      }
    }
  ]
}
```

## Status Queries

```javascript
import { getPhaseDevStatus } from './src/phase-dev/index.js';

const status = getPhaseDevStatus(projectRoot, 'auth-foundation');

console.log(status);
// {
//   exists: true,
//   status: 'completed',
//   completion_percentage: 100,
//   total_tasks: 25,
//   completed_tasks: 25,
//   parent_context: { type: 'roadmap', ... },
//   created: '2026-02-04T...',
//   last_updated: '2026-02-04T...'
// }
```

## File Structure

```
.claude/
  phase-dev/
    {slug}/
      PROGRESS.json           ← Owned by Phase-Dev
      EXECUTIVE_SUMMARY.md
      API_ENDPOINTS.md
      DATABASE_SCHEMA.md
      exploration/            ← L2 exploration docs (6 files)
        CODEBASE_MAP.md
        CODE_SNIPPETS.md
        DOMAIN_GLOSSARY.md
        PHASE_BREAKDOWN.md
        DELEGATION.md
        L2_SUMMARY.md
```

## Hooks

Phase-Dev can trigger parent roadmap hooks on completion:

```javascript
// In ROADMAP.json
{
  "hooks": {
    "progress_update": "roadmap-progress-hook.js"
  }
}

// .claude/hooks/tools/roadmap-progress-hook.js
export async function onProgressUpdate({ roadmap, parentContext, timestamp }) {
  // Custom logic when phase completes
  console.log(`Phase completed in roadmap: ${roadmap.title}`);
}
```

## Key Principles

1. **Phase-Dev executes, Roadmap orchestrates, Epic strategizes**
2. **PROGRESS.json is owned by Phase-Dev** - Never modified by parent levels
3. **Completion flows upward** - Phase-Dev → Roadmap → Epic
4. **Parent context is immutable** - Set at creation time
5. **Metrics are comprehensive** - Track tasks, files, tests, tokens, duration

## Examples

### Create Standalone Phase-Dev

```bash
gtask create-phase-dev --name "Auth System" --scale M
```

### Create Child Phase-Dev (from Roadmap)

```javascript
import { runCreatePhaseDev } from './src/commands/create-phase-dev.js';

await runCreatePhaseDev({
  name: 'Foundation Phase',
  scale: 'S'
}, {
  type: 'roadmap',
  id: 'roadmap_abc123',
  slug: 'feature-auth',
  title: 'Authentication System',
  roadmap_id: 'roadmap_abc123'
});
```

### Complete a Phase-Dev

```javascript
import { markPhaseDevComplete, reportPhaseDevComplete } from './src/phase-dev/index.js';

// Mark complete
const metrics = markPhaseDevComplete(projectRoot, 'auth-foundation');

// Report to parent
const result = await reportPhaseDevComplete(projectRoot, 'auth-foundation', metrics);

if (result.success) {
  console.log('Completion reported successfully');
}
```

## Error Handling

All functions return result objects with `success` and `error` fields:

```javascript
const result = await reportPhaseDevComplete(...);

if (!result.success) {
  console.error(`Failed to report completion: ${result.error}`);
  // Handle error
}
```

## Testing

```bash
# Syntax validation
node --check src/phase-dev/completion-reporter.js

# Integration test (TODO)
npm test -- src/phase-dev/
```

---

**Phase-Dev owns execution. Roadmap orchestrates phases. Epic coordinates roadmaps.**
