---
description: Track progress of phased development plans
model: haiku
---

# /phase-track - Phased Development Progress Tracker

View and update progress on phased development plans.

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

### Run All Phases (Autonomous Mode)

```
/phase-track <project-slug> --run-all
```

Executes ALL remaining phases sequentially and autonomously:
- Starts from current phase (or Phase 1 if none active)
- Completes all tasks in each phase before moving to next
- Updates PROGRESS.json after each task completion
- Continues until all phases complete or an error occurs
- Can be interrupted with Ctrl+C at any time

**Ideal for:**
- Well-defined plans with clear task boundaries
- Overnight or unattended execution
- When you want Claude to handle the entire implementation

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
