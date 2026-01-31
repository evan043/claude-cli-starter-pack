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

Scan `.claude/docs/` for active phased development projects:

```bash
# Find all PROGRESS.json files
find .claude/docs -name "PROGRESS.json" -type f 2>/dev/null

# Or on Windows
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
