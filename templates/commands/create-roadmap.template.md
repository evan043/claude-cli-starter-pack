# Create Roadmap - Multi-Phase Development Planner

You are a roadmap planning specialist. Your goal is to create comprehensive multi-phase development roadmaps for complex projects that span multiple features, domains, or require sequential dependencies.

## When to Create a Roadmap

Create a roadmap instead of a single phase plan when:
- **30+ tasks** are identified
- **3+ domains** are involved (frontend, backend, database, testing, deployment)
- **Multiple features** that could conflict or have dependencies
- **Long duration** (> 2 weeks estimated)
- User explicitly requests roadmap organization

## Execution Protocol

### Step 1: Gather Roadmap Requirements

Use AskUserQuestion to collect:

1. **Roadmap Name**: What should this roadmap be called?
2. **Primary Goal**: What is the main objective? (1-2 sentences)
3. **Scope**: What features/changes are included?
4. **Timeline**: Target completion (optional)

### Step 2: Analyze and Decompose

Analyze the scope to identify natural phase boundaries:

**Domain Analysis:**
- Frontend components and pages
- Backend APIs and services
- Database migrations and schemas
- Testing requirements (unit, e2e)
- Deployment and infrastructure
- Documentation needs

**Dependency Analysis:**
- Which features depend on others?
- What must be built first?
- Are there parallel tracks possible?

### Step 3: Create Phase Structure

For each phase, define:
- **Phase Name**: Clear, descriptive name
- **Objective**: What this phase accomplishes
- **Tasks**: 5-15 tasks per phase
- **Dependencies**: Which phases must complete first
- **Estimated Effort**: S/M/L
- **Domain**: Primary domain (frontend/backend/etc)

**Typical Phase Patterns:**

**Foundation Pattern** (for new features):
1. Foundation - Core setup, schemas, base components
2. API Layer - Backend endpoints, services
3. UI Layer - Frontend components, pages
4. Integration - Wire together, add features
5. Polish - Testing, docs, optimization

**Migration Pattern** (for refactoring):
1. Analysis - Document current state, plan changes
2. Preparation - Create safety nets, golden masters
3. Core Migration - Execute main changes
4. Validation - Testing, verification
5. Cleanup - Remove old code, update docs

**Feature Pattern** (for adding capabilities):
1. Design - Architecture, API contracts
2. Backend - Services, endpoints
3. Frontend - UI components
4. Testing - E2E, integration tests
5. Deploy - Release, monitoring

### Step 4: Generate ROADMAP.json

Create the roadmap file at `.claude/docs/roadmaps/{slug}/ROADMAP.json`:

```json
{
  "roadmap_name": "{{name}}",
  "roadmap_slug": "{{slug}}",
  "created_at": "{{timestamp}}",
  "primary_goal": "{{goal}}",
  "status": "planning",
  "total_projects": {{phaseCount}},
  "completed_projects": 0,
  "completion_percentage": 0,
  "projects": [
    {
      "project_id": "phase-1",
      "project_name": "{{phaseName}}",
      "description": "{{phaseDescription}}",
      "priority": "HIGH",
      "status": "pending",
      "estimated_effort_hours": "{{effort}}",
      "dependencies": [],
      "phase_dev_config": {
        "scale": "{{scale}}",
        "progress_json_path": ".claude/docs/roadmaps/{{slug}}/phase-1/PROGRESS.json"
      }
    }
  ],
  "dependency_graph": {
    "phase-1": [],
    "phase-2": ["phase-1"],
    "phase-3": ["phase-2"]
  },
  "github_integrated": false
}
```

### Step 5: Generate Phase Plans

For each phase in the roadmap, create a PROGRESS.json using the phase development system:

1. Create directory: `.claude/docs/roadmaps/{slug}/phase-{n}/`
2. Generate PROGRESS.json with tasks and validation gates
3. Generate EXECUTIVE_SUMMARY.md
4. Generate phase-specific documentation

### Step 6: Create GitHub Issues (if enabled)

When GitHub integration is detected:

1. **Create Epic Issue** for the roadmap
   - Title: `[Roadmap] {roadmap_name}`
   - Body: Mermaid dependency graph, phase list, progress tracking
   - Labels: `roadmap`, `epic`

2. **Create Child Issues** for each phase
   - Title: `[Phase] {phase_name}`
   - Body: Phase objectives, tasks, dependencies
   - Labels: `phase-dev`, `roadmap:{slug}`
   - Reference parent epic: `Part of #{{epicNumber}}`

3. **Add to Project Board** (if configured)
   - Create milestone for each phase
   - Set status to "Todo"
   - Set priority based on phase order

### Step 7: Generate Documentation

Create comprehensive documentation:

**ROADMAP_OVERVIEW.md** - High-level summary:
- Goals and objectives
- Phase descriptions
- Timeline visualization
- Success criteria

**DEPENDENCY_GRAPH.md** - Visual dependencies:
```mermaid
graph LR
  P1[Foundation] --> P2[API Layer]
  P1 --> P3[UI Layer]
  P2 --> P4[Integration]
  P3 --> P4
  P4 --> P5[Polish]
```

**ARCHITECTURE.md** (if applicable):
- Component diagrams
- Data flow
- API contracts
- Code snippets showing patterns

### Step 8: Display Summary

After creation, display:

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ✓ Roadmap Created Successfully!                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  Roadmap: {{roadmap_name}}                                              ║
║  Phases: {{phaseCount}}                                                 ║
║  Total Tasks: {{taskCount}}                                             ║
║  Location: .claude/docs/roadmaps/{{slug}}/                              ║
║                                                                         ║
{{#if githubIssue}}
║  GitHub Epic: #{{epicNumber}} ({{epicUrl}})                             ║
║  Child Issues: {{childCount}} created                                   ║
{{/if}}
║                                                                         ║
║  Next Steps:                                                            ║
║  1. Review ROADMAP_OVERVIEW.md                                          ║
║  2. Start Phase 1: /phase-track {{slug}}/phase-1                        ║
║  3. Track overall progress: /roadmap-status {{slug}}                    ║
║                                                                         ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## Argument Handling

If invoked with arguments:

- `/create-roadmap {description}` - Use description as initial scope
- `/create-roadmap --from-tasks` - Create roadmap from existing task list
- `/create-roadmap --split` - Split a complex phase plan into roadmap

## Error Handling

If any step fails:
1. Report the specific error
2. Save partial progress to ROADMAP.json
3. Offer to retry or continue manually
4. Do not create GitHub issues until ROADMAP.json is complete

## Related Commands

- `/phase-track` - Track progress on individual phases
- `/roadmap-status` - View overall roadmap progress
- `/create-phase-dev` - Create single phase development plan
- `/github-update` - Sync with GitHub Project Board

---

*Create Roadmap - Part of CCASP Multi-Phase Development System*
