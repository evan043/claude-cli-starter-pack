# GitHub Epic System

A comprehensive system for managing large development initiatives using GitHub's native features with automated testing schedules, agent progress tracking, and RALPH loop integration.

## Concepts

### Epic vs Roadmap - The Key Distinction

| Concept | Scope | Purpose | Example |
|---------|-------|---------|---------|
| **Epic** | 1-4 weeks | The "what" - a major feature or initiative | "AI Agent Orchestrator" |
| **Roadmap** | 3-12 months | The "when" - timeline and sequencing | Q1: Orchestrator, Q2: SaaS |

**Mental Model:**
```
Vision (Why)        → Years
  |
Roadmap (When)      → 3-12 months
  |
Epic (What)         → 1-4 weeks    <-- This system manages Epics
  |
Stories / Tasks (How) → 1-3 hours to 1-2 days
```

**Key Insight:**
- Epics are objects you complete
- Roadmaps are trajectories showing when things happen
- You don't "complete" a roadmap - you complete epics

## Directory Structure

```
.claude/
├── github-epics/           # Epic definitions
│   ├── ai-orchestrator.json
│   └── repo-guard.json
├── phase-plans/            # Phase development plans
│   └── ai-orchestrator/
│       ├── phase-1.json
│       ├── phase-2.json
│       └── EXECUTION_STATE.json
├── testing-issues/         # Local testing issue templates
│   └── ai-orchestrator/
│       ├── testing-phase-1.md
│       └── testing-phase-2.md
├── hooks/
│   ├── agent-epic-progress.js    # Progress tracking hook
│   └── ralph-loop-web-search.js  # RALPH web search hook
└── github-epics-initialized      # Session marker file
```

## Commands

| Command | Description |
|---------|-------------|
| `/github-epic-menu` | Interactive epic management dashboard |
| `/create-github-epic` | Create new epic from description or GitHub issues |
| `/github-epic-status` | View epic progress with dependency graphs |
| `/github-epic-edit` | Edit epic phases and structure |
| `/github-epic-track` | Track and execute epic phases |

## CLI Commands

```bash
# Open epic management dashboard
ccasp github-epic-menu
ccasp epic  # alias

# Create new epic
ccasp create-github-epic
ccasp create-github-epic --from-github
ccasp create-github-epic --from-project 5
```

## GitHub Integration

### Epic Issue Template

The system provides a GitHub issue template (`.github/ISSUE_TEMPLATE/epic.yml`) with:

- Business objective
- Success criteria
- Scope (in/out)
- Child issues / phases
- Milestones
- Dependencies
- Risks & mitigations
- Priority and effort estimates

### Automated Features

1. **Epic Issue Creation**: Creates parent epic issue with progress tracking
2. **Phase Issues**: Child issues for each phase linked to epic
3. **Progress Sync**: Auto-updates GitHub issues as phases complete
4. **Checkbox Updates**: Marks checkboxes in epic body as phases complete
5. **Auto-Close**: Closes epic issue when all phases are complete

## Testing System

### Automatic Testing Issue Generation

When phases complete, the system creates testing issues:

- **Schedule**: One testing issue per completed phase
- **Timing**: Testing starts day after epic completion
- **Duration**: 7-phase epic = 7 days of sequential testing

### Testing Issue Content

Each testing issue includes:

1. **RALPH Loop Configuration**
   - Automated test commands
   - Max iterations
   - Break-on-success settings

2. **Manual Testing Checklist**
   - Feature acceptance criteria
   - Visual regression checks
   - Responsive design verification
   - Error state handling
   - Performance checks
   - Accessibility verification

3. **Web Research Triggers**
   - Pre-testing research (known issues, best practices)
   - Post-failure research (every 3rd RALPH loop)

## Hooks

### Agent Epic Progress Hook

Monitors agent task completions and:

- Updates progress percentages in epic JSON
- Posts progress comments to GitHub issues
- Adds code snippets from completed work
- Marks phase checkboxes as completed
- Auto-closes issues at 100% completion

### RALPH Loop Web Search Hook

Enhances testing with web research:

- **Pre-Testing**: Searches for known issues and best practices
- **Post-Failure**: Searches for solutions after every 3rd failed test
- **Caching**: 24-hour cache for search results
- **Sources**: GitHub issues, Stack Overflow, documentation

## Session Restart Requirement

After creating an epic with agent configurations:

1. The system creates a marker file: `.claude/github-epics-initialized`
2. First run after creation shows restart warning
3. User must restart Claude Code session
4. This ensures hooks and agent configs are properly loaded

## Epic JSON Schema

```json
{
  "epic_id": "uuid",
  "slug": "ai-orchestrator",
  "title": "AI Agent Orchestrator",
  "description": "Description text",
  "business_objective": "What this achieves",
  "success_criteria": ["criterion1", "criterion2"],
  "scope": {
    "in": ["included features"],
    "out": ["excluded features"]
  },
  "created": "ISO8601",
  "updated": "ISO8601",
  "source": "manual | github-issues | github-project",
  "status": "planning | active | paused | completed",
  "phases": [
    {
      "phase_id": "phase-1",
      "phase_title": "Foundation",
      "goal": "Set up core infrastructure",
      "inputs": {
        "issues": ["#45", "#46"],
        "docs": ["specs/foundation.md"]
      },
      "outputs": ["Base agent interface", "Registry schema"],
      "agents_assigned": ["backend-specialist"],
      "dependencies": [],
      "complexity": "M",
      "status": "pending",
      "github_issue_number": 124,
      "phase_dev_config": {
        "scale": "M",
        "progress_json_path": ".claude/phase-plans/ai-orchestrator/phase-1.json"
      }
    }
  ],
  "metadata": {
    "total_phases": 5,
    "completed_phases": 0,
    "completion_percentage": 0,
    "github_integrated": true,
    "github_epic_number": 123,
    "last_github_sync": "ISO8601"
  },
  "testing": {
    "auto_create_issues": true,
    "testing_start_offset_days": 1,
    "ralph_loop_enabled": true,
    "web_search_enabled": true
  }
}
```

## Typical Phase Patterns

### Foundation Pattern (New Features)
1. Foundation - Core setup, schemas, base components
2. API Layer - Backend endpoints, services
3. UI Layer - Frontend components, pages
4. Integration - Wire together, add features
5. Polish - Testing, docs, optimization

### Migration Pattern (Refactoring)
1. Analysis - Document current state, plan changes
2. Preparation - Create safety nets, golden masters
3. Core Migration - Execute main changes
4. Validation - Testing, verification
5. Cleanup - Remove old code, update docs

### Feature Pattern (Adding Capabilities)
1. Design - Architecture, API contracts
2. Backend - Services, endpoints
3. Frontend - UI components
4. Testing - E2E, integration tests
5. Deploy - Release, monitoring

## Migration from Legacy Roadmaps

If you have existing roadmaps in `.claude/roadmaps/`:

1. Run `/github-epic-menu`
2. System detects legacy roadmaps
3. Offers migration to `.claude/github-epics/`
4. Preserves all data, updates internal references

## Best Practices

1. **Keep Epics Focused**: 1-4 weeks, clear objective
2. **Use Phases**: Break work into 5-8 phases
3. **Define Dependencies**: Avoid circular dependencies
4. **Set Success Criteria**: Make completion measurable
5. **Enable Testing**: Always enable RALPH loop for quality
6. **Sync with GitHub**: Keep issues updated for visibility

## Related Documentation

- [Phase Development Plans](./PHASE_DEV.md)
- [RALPH Loop Testing](./RALPH_LOOP.md)
- [Agent Hierarchy](./AGENT_HIERARCHY.md)
- [Hook System](./HOOKS.md)

---

*GitHub Epic System - Part of CCASP (Claude CLI Advanced Starter Pack)*
