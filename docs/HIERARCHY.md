# Epic-Hierarchy Architecture

> **4-Level Project Management System**
> Epic → Roadmap → Phase-Dev-Plan → Phase/Tasks

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [The 4 Levels Explained](#the-4-levels-explained)
- [When to Use Each Level](#when-to-use-each-level)
- [Slash Commands](#slash-commands)
- [File Structure](#file-structure)
- [Data Flow](#data-flow)
- [Gating & Dependencies](#gating--dependencies)
- [Token Budget Management](#token-budget-management)
- [Progress Aggregation](#progress-aggregation)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

---

## Overview

The Epic-Hierarchy architecture provides a structured approach to managing large-scale development projects through four distinct levels of granularity. Each level serves a specific purpose and maintains clear separation of concerns while enabling seamless coordination across the hierarchy.

**Key Benefits:**
- Clear scope boundaries at each level
- Automated progress tracking from bottom-up
- Flexible dependency management
- Token budget allocation and tracking
- Gating mechanisms for quality assurance
- Support for both sequential and parallel execution

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         EPIC (L0)                               │
│  • Business objective                                           │
│  • Multiple roadmaps (sequential or parallel)                   │
│  • Token budget: 500k-1M tokens                                 │
│  • Gating rules (tests, docs, approvals)                        │
│  • File: .claude/epics/{epic-slug}/EPIC.json                    │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │ contains multiple
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ROADMAP (L1)                              │
│  • Coordination layer                                           │
│  • Multiple phase-dev-plans                                     │
│  • Token budget: 100k-200k tokens per roadmap                   │
│  • Cross-plan dependencies                                      │
│  • File: .claude/roadmaps/{roadmap-slug}/ROADMAP.json           │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │ references multiple
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE-DEV-PLAN (L2)                           │
│  • Execution engine                                             │
│  • Multiple phases (S/M/L complexity)                           │
│  • Token budget: 20k-50k tokens per plan                        │
│  • Agent delegation strategy                                    │
│  • File: .claude/phase-plans/{plan-slug}/PROGRESS.json          │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │ contains multiple
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE / TASKS (L3)                           │
│  • Atomic work units                                            │
│  • File-level operations                                        │
│  • Test coverage requirements                                   │
│  • Acceptance criteria                                          │
│  • Tracked in: PROGRESS.json phases[] array                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## The 4 Levels Explained

### Level 0: Epic

**Purpose:** Highest-level business objective or major feature initiative.

**Characteristics:**
- Spans multiple roadmaps (typically 2-10)
- Duration: Weeks to months
- Token budget: 500,000 - 1,000,000 tokens
- GitHub integration: Can create epic issue
- Gating: Enforces quality gates between roadmaps

**Key Fields:**
```json
{
  "epic_id": "epic-{uuid}",
  "slug": "epic-slug",
  "title": "Major Feature Initiative",
  "description": "...",
  "roadmaps": [
    {
      "roadmap_id": "rm-{uuid}",
      "roadmap_index": 0,
      "title": "Roadmap 1",
      "status": "completed",
      "completion_percentage": 100,
      "path": ".claude/roadmaps/roadmap-1/ROADMAP.json"
    }
  ],
  "roadmap_count": 3,
  "current_roadmap_index": 0,
  "gating": {
    "require_tests": true,
    "require_docs": false,
    "allow_manual_override": true
  },
  "token_budget": {
    "total": 500000,
    "used": 0,
    "per_roadmap": 100000
  }
}
```

**Use Cases:**
- Large feature initiatives (e.g., "User Authentication System")
- Multi-module refactors (e.g., "Migrate to TypeScript")
- Platform upgrades (e.g., "React 19 Migration")

---

### Level 1: Roadmap

**Purpose:** Coordination layer that groups related phase-dev-plans.

**Characteristics:**
- Spans multiple phase-dev-plans (typically 3-8)
- Duration: Days to weeks
- Token budget: 100,000 - 200,000 tokens
- GitHub integration: Can create roadmap issue
- Cross-plan dependencies

**Key Fields:**
```json
{
  "roadmap_id": "rm-{uuid}",
  "slug": "roadmap-slug",
  "title": "Feature Implementation",
  "parent_epic": {
    "epic_id": "epic-{uuid}",
    "epic_slug": "epic-slug",
    "epic_path": ".claude/epics/epic-slug/EPIC.json"
  },
  "phase_dev_plan_refs": [
    {
      "slug": "backend-api",
      "path": ".claude/phase-plans/backend-api/PROGRESS.json",
      "title": "Backend API Implementation",
      "status": "completed",
      "completion_percentage": 100
    }
  ],
  "cross_plan_dependencies": [
    {
      "dependent_slug": "frontend-ui",
      "depends_on_slug": "backend-api",
      "reason": "UI needs API endpoints"
    }
  ],
  "metadata": {
    "plan_count": 3,
    "overall_completion_percentage": 67
  }
}
```

**Use Cases:**
- Feature groups (e.g., "Authentication - Backend + Frontend")
- Module implementations (e.g., "Payment Processing System")
- Domain-specific work (e.g., "Database Schema Updates")

---

### Level 2: Phase-Dev-Plan

**Purpose:** Execution engine for breaking down work into manageable phases.

**Characteristics:**
- Spans multiple phases (typically 3-5)
- Duration: Hours to days
- Token budget: 20,000 - 50,000 tokens per plan
- Complexity: Small (S), Medium (M), or Large (L)
- Agent delegation strategy

**Key Fields:**
```json
{
  "project_title": "Backend API Implementation",
  "slug": "backend-api",
  "scale": "M",
  "status": "in_progress",
  "phases": [
    {
      "id": 1,
      "name": "Setup & Configuration",
      "objective": "Set up project structure and dependencies",
      "complexity": "S",
      "assigned_agent": "backend-specialist",
      "status": "completed",
      "tasks": [
        {
          "id": "1.1",
          "title": "Initialize project structure",
          "status": "completed"
        }
      ]
    }
  ],
  "agent_delegation": {
    "primary_agent": "backend-specialist",
    "task_assignments": [...]
  },
  "metadata": {
    "total_tasks": 15,
    "completed_tasks": 10,
    "completion_percentage": 67
  }
}
```

**Use Cases:**
- Feature implementation (e.g., "User Login API")
- Bug fixes (e.g., "Fix Memory Leak in WebSocket Handler")
- Refactoring (e.g., "Extract Common Utilities")

---

### Level 3: Phase / Tasks

**Purpose:** Atomic work units that represent individual file changes or operations.

**Characteristics:**
- Duration: Minutes to hours
- File-level operations
- Acceptance criteria
- Test coverage requirements

**Key Fields:**
```json
{
  "id": "1.1",
  "title": "Create user model",
  "description": "Define User model with authentication fields",
  "status": "completed",
  "files": {
    "modify": [
      {
        "path": "src/models/user.js",
        "reason": "Create User model"
      }
    ],
    "reference": [
      {
        "path": "src/models/base.js",
        "reason": "Extend base model"
      }
    ]
  },
  "acceptance_criteria": [
    "User model extends BaseModel",
    "Contains email, password, createdAt fields",
    "Includes password hashing method"
  ],
  "assigned_agent": "backend-specialist"
}
```

**Use Cases:**
- Create/modify single files
- Write unit tests
- Update documentation
- Configure settings

---

## When to Use Each Level

### Use Epic When:
- Project will take multiple weeks or months
- Multiple distinct areas need coordination (frontend + backend + infrastructure)
- Quality gates are needed between major milestones
- Token budget management is critical
- GitHub epic tracking is desired

**Example:** "Implement Complete User Management System" (auth + profiles + permissions + admin panel)

---

### Use Roadmap When:
- Multiple related features need coordination
- Cross-dependency management is needed
- Project spans multiple phase-dev-plans
- Parent epic exists or GitHub issue tracking needed

**Example:** "User Authentication" (backend API + frontend UI + testing)

---

### Use Phase-Dev-Plan When:
- Single feature or focused task
- Work can be broken into 3-5 phases
- No need for epic-level coordination
- Most common level for daily work

**Example:** "Add Password Reset Functionality"

---

### Use Tasks When:
- Atomic, file-level work
- Part of a phase-dev-plan
- Clear acceptance criteria
- Single responsibility

**Example:** "Create password-reset email template"

---

## Slash Commands

### Create Epic

```bash
/create-epic
```

**Interactive prompts:**
1. Epic title
2. Business objective
3. Number of roadmaps
4. Gating requirements (tests, docs, approvals)
5. Token budget allocation

**Output:**
- `.claude/epics/{epic-slug}/EPIC.json`
- Optional: GitHub epic issue

---

### Create Roadmap

```bash
/create-roadmap
```

**Interactive prompts:**
1. Roadmap title
2. Parent epic (optional)
3. Number of phase-dev-plans
4. Cross-plan dependencies

**Output:**
- `.claude/roadmaps/{roadmap-slug}/ROADMAP.json`
- Optional: GitHub roadmap issue

---

### Create Phase-Dev-Plan

```bash
/phase-dev-plan
```

**Interactive prompts:**
1. Project title
2. Complexity scale (S/M/L)
3. Parent roadmap (optional)
4. Additional context

**Output:**
- `.claude/phase-plans/{plan-slug}/PROGRESS.json`
- `.claude/phase-plans/{plan-slug}/PLAN.md`
- Optional: `.claude/exploration/{slug}/` directory

---

### Execute Epic

```bash
/execute-epic {epic-slug}
```

Orchestrates epic execution:
1. Load EPIC.json
2. Get next roadmap via `getNextRoadmap()`
3. Check gating requirements
4. Execute roadmap
5. Aggregate progress
6. Move to next roadmap

---

### Execute Roadmap

```bash
/execute-roadmap {roadmap-slug}
```

Orchestrates roadmap execution:
1. Load ROADMAP.json
2. Check cross-plan dependencies
3. Execute phase-dev-plans (sequential or parallel)
4. Aggregate progress
5. Update completion percentage

---

## File Structure

```
.claude/
├── epics/
│   └── {epic-slug}/
│       ├── EPIC.json              # Epic definition
│       └── execution.log          # Execution history
│
├── roadmaps/
│   └── {roadmap-slug}/
│       ├── ROADMAP.json           # Roadmap definition
│       └── execution.log          # Execution history
│
├── phase-plans/
│   └── {plan-slug}/
│       ├── PROGRESS.json          # Phase-dev-plan progress
│       ├── PLAN.md                # Human-readable plan
│       └── exploration/           # L2 exploration artifacts
│           ├── EXPLORATION_SUMMARY.md
│           ├── PHASE_BREAKDOWN.md
│           └── code-snippets/
│
└── orchestrator/
    ├── state.json                 # Global orchestrator state
    └── logs/
        └── {timestamp}.log        # Execution logs
```

---

## Data Flow

### Bottom-Up Progress Aggregation

```
Tasks (L3) → Phase completion
  ↓
Phase completion → Phase-dev-plan completion (PROGRESS.json)
  ↓
Phase-dev-plan completion → Roadmap completion (ROADMAP.json)
  ↓
Roadmap completion → Epic completion (EPIC.json)
```

**Implementation:**
```javascript
// Calculate epic completion
const epicProgress = aggregateEpicProgress(epicPath);
// Reads EPIC.json, loads each ROADMAP.json, calculates weighted average

// Calculate roadmap completion
const roadmapProgress = aggregateRoadmapProgress(roadmapPath);
// Reads ROADMAP.json, loads each PROGRESS.json, calculates average

// Calculate phase-dev-plan completion
const phaseProgress = aggregatePhaseProgress(progressPath);
// Reads PROGRESS.json, counts completed tasks, calculates percentage
```

---

### Top-Down Token Budget Allocation

```
Epic (500k tokens)
  ↓ allocates per_roadmap budget
Roadmap 1 (100k tokens) | Roadmap 2 (100k tokens) | Roadmap 3 (100k tokens)
  ↓ allocates per_plan budget
Phase-Plan 1 (30k) | Phase-Plan 2 (40k) | Phase-Plan 3 (30k)
  ↓ tracks usage
Task execution consumes tokens
```

**Implementation:**
```javascript
// Allocate epic budget to roadmaps
const epicBudget = createTokenBudget(500000);
allocateBudget(epicBudget, 'roadmap-1', 100000);

// Track usage during task execution
trackUsage(epicBudget, 'roadmap-1', tokensUsed);

// Check if compaction needed
if (shouldCompact(epicBudget, 'roadmap-1')) {
  // Trigger context compaction
}
```

---

## Gating & Dependencies

### Epic-Level Gates

**Between Roadmaps:**
- **Test Gate:** All tests must pass before advancing to next roadmap
- **Documentation Gate:** Required docs must exist (EXPLORATION_SUMMARY.md, etc.)
- **Manual Approval Gate:** Human approval required

**Configuration:**
```json
{
  "gating": {
    "require_tests": true,
    "require_docs": false,
    "require_phase_approval": false,
    "allow_manual_override": true
  }
}
```

**Gating Flow:**
```javascript
// Check gates before advancing to next roadmap
const gateResults = await checkGates(roadmapPath, epic.gating);

if (gateResults.overall === 'fail' && !epic.gating.allow_manual_override) {
  throw new Error('Gates failed, cannot proceed');
}

if (gateResults.overall === 'fail' && epic.gating.allow_manual_override) {
  // Prompt user for manual override
  const decision = await promptManualOverride(gateResults);
  if (decision !== 'override') {
    throw new Error('User declined to override gate');
  }
}
```

---

### Roadmap-Level Dependencies

**Sequential Dependencies:**
```json
{
  "roadmaps": [
    {
      "roadmap_id": "rm-1",
      "roadmap_index": 0,
      "title": "Roadmap 1"
    },
    {
      "roadmap_id": "rm-2",
      "roadmap_index": 1,
      "title": "Roadmap 2",
      "depends_on": []  // Implicitly depends on rm-1 (previous index)
    }
  ]
}
```

**Explicit Dependencies:**
```json
{
  "roadmaps": [
    {
      "roadmap_id": "rm-backend",
      "roadmap_index": 0,
      "title": "Backend API"
    },
    {
      "roadmap_id": "rm-frontend",
      "roadmap_index": 1,
      "title": "Frontend UI",
      "depends_on": ["rm-backend"]  // Explicit dependency
    },
    {
      "roadmap_id": "rm-testing",
      "roadmap_index": 2,
      "title": "Integration Tests",
      "depends_on": ["rm-backend", "rm-frontend"]  // Multiple dependencies
    }
  ]
}
```

---

### Cross-Plan Dependencies

**Within a Roadmap:**
```json
{
  "phase_dev_plan_refs": [
    {
      "slug": "backend-api",
      "status": "completed"
    },
    {
      "slug": "frontend-ui",
      "status": "in_progress"
    }
  ],
  "cross_plan_dependencies": [
    {
      "dependent_slug": "frontend-ui",
      "depends_on_slug": "backend-api",
      "reason": "Frontend needs API endpoints to be available"
    }
  ]
}
```

**Dependency Checking:**
```javascript
// Check if plan can start
const depCheck = checkPlanDependencies(roadmap, 'frontend-ui');

if (!depCheck.satisfied) {
  console.log('Cannot start frontend-ui yet');
  console.log('Missing dependencies:', depCheck.missing);
  // depCheck.missing = ['backend-api']
}
```

---

## Token Budget Management

### Budget Hierarchy

```
Epic Budget (500k tokens)
├── Roadmap 1 (100k tokens)
│   ├── Phase-Plan A (30k tokens)
│   │   ├── Used: 25k
│   │   └── Available: 5k
│   ├── Phase-Plan B (40k tokens)
│   │   ├── Used: 35k
│   │   └── Available: 5k
│   └── Phase-Plan C (30k tokens)
│       ├── Used: 20k
│       └── Available: 10k
└── Roadmap 2 (100k tokens)
    └── ...
```

### Budget Status

- **Available:** < 80% used
- **Low:** 80-100% used (triggers compaction warning)
- **Exhausted:** 100% used (halt execution)
- **Exceeded:** > 100% used (error state)

### Budget Operations

**Allocation:**
```javascript
const epicBudget = createTokenBudget(500000);
allocateBudget(epicBudget, 'roadmap-1', 100000);
```

**Tracking:**
```javascript
trackUsage(epicBudget, 'roadmap-1', 5000);
// Updates used, available, status
```

**Reallocation:**
```javascript
// Roadmap 1 completed early with 20k unused
reallocateBudget(epicBudget, 'roadmap-1', 'roadmap-2', 20000);
```

**Release:**
```javascript
// Return unused budget to parent pool
const { released } = releaseBudget(epicBudget, 'roadmap-1');
console.log(`Released ${released} tokens back to epic pool`);
```

---

## Progress Aggregation

### Epic Progress

```javascript
import { aggregateEpicProgress } from './orchestration/progress-aggregator.js';

const epicProgress = aggregateEpicProgress('.claude/epics/my-epic/');

// Output:
{
  completion: 67,              // Overall completion percentage
  status: 'in_progress',       // Epic status
  roadmaps: [
    {
      id: 'rm-1',
      title: 'Roadmap 1',
      completion: 100,
      status: 'completed',
      phases_completed: 5,
      phases_total: 5
    },
    {
      id: 'rm-2',
      title: 'Roadmap 2',
      completion: 50,
      status: 'in_progress',
      phases_completed: 2,
      phases_total: 4
    },
    {
      id: 'rm-3',
      title: 'Roadmap 3',
      completion: 0,
      status: 'pending',
      phases_completed: 0,
      phases_total: 3
    }
  ],
  roadmaps_total: 3,
  roadmaps_completed: 1,
  roadmaps_blocked: 0
}
```

### Roadmap Progress

```javascript
import { aggregateRoadmapProgress } from './orchestration/progress-aggregator.js';

const roadmapProgress = aggregateRoadmapProgress('.claude/roadmaps/my-roadmap/');

// Output:
{
  completion: 50,
  status: 'in_progress',
  phases: [
    {
      path: '.claude/phase-plans/backend-api/PROGRESS.json',
      title: 'Backend API',
      completion: 100,
      status: 'completed',
      tasks_completed: 15,
      tasks_total: 15
    },
    {
      path: '.claude/phase-plans/frontend-ui/PROGRESS.json',
      title: 'Frontend UI',
      completion: 0,
      status: 'pending',
      tasks_completed: 0,
      tasks_total: 12
    }
  ],
  phases_completed: 1,
  phases_total: 2
}
```

---

## Migration Guide

### From Legacy Roadmap to Epic-Hierarchy

**Old Structure (Direct Phase Tracking):**
```json
{
  "roadmap_id": "legacy-roadmap",
  "phases": [
    {
      "phase_id": "phase-1",
      "phase_title": "Setup",
      "status": "completed",
      "dependencies": []
    },
    {
      "phase_id": "phase-2",
      "phase_title": "Implementation",
      "status": "in_progress",
      "dependencies": ["phase-1"]
    }
  ],
  "metadata": {
    "total_phases": 2,
    "completed_phases": 1,
    "completion_percentage": 50
  }
}
```

**New Structure (Phase-Dev-Plan References):**
```json
{
  "roadmap_id": "legacy-roadmap",
  "phase_dev_plan_refs": [
    {
      "slug": "setup",
      "path": ".claude/phase-plans/setup/PROGRESS.json",
      "title": "Setup",
      "status": "completed",
      "completion_percentage": 100
    },
    {
      "slug": "implementation",
      "path": ".claude/phase-plans/implementation/PROGRESS.json",
      "title": "Implementation",
      "status": "in_progress",
      "completion_percentage": 50
    }
  ],
  "cross_plan_dependencies": [
    {
      "dependent_slug": "implementation",
      "depends_on_slug": "setup",
      "reason": "Migrated from phase dependency"
    }
  ],
  "metadata": {
    "plan_count": 2,
    "overall_completion_percentage": 75
  },
  "_legacy_phases_deprecated": true,
  "phases": [...]  // Kept for reference
}
```

**Migration Script:**
```javascript
import { migrateLegacyRoadmap } from './roadmap/schema.js';

// Load legacy roadmap
const legacyRoadmap = JSON.parse(readFileSync('ROADMAP.json', 'utf8'));

// Migrate to new format
const migratedRoadmap = migrateLegacyRoadmap(legacyRoadmap);

// Save migrated version
writeFileSync('ROADMAP.json', JSON.stringify(migratedRoadmap, null, 2));
```

---

## Examples

### Example 1: Simple Feature (Phase-Dev-Plan Only)

**Scenario:** Add password reset functionality

```bash
/phase-dev-plan
# Title: Add Password Reset
# Scale: M
# Parent Roadmap: (none)
```

**Output:**
- `.claude/phase-plans/add-password-reset/PROGRESS.json`
- 3-5 phases: Setup → Implementation → Testing → Documentation → Cleanup

---

### Example 2: Multi-Module Feature (Roadmap)

**Scenario:** User authentication system (backend + frontend)

```bash
/create-roadmap
# Title: User Authentication System
# Phase-dev-plans: 2
# - Backend API
# - Frontend UI
```

**Output:**
- `.claude/roadmaps/user-auth/ROADMAP.json`
- Cross-plan dependency: frontend-ui depends on backend-api

---

### Example 3: Major Initiative (Epic)

**Scenario:** Complete user management system

```bash
/create-epic
# Title: User Management System
# Roadmaps: 3
# - Authentication
# - User Profiles
# - Admin Panel
```

**Output:**
- `.claude/epics/user-management/EPIC.json`
- 3 roadmap placeholders with sequential dependencies
- Gating enabled between roadmaps

---

## Best Practices

### 1. Choose the Right Level
- Don't over-engineer: Use phase-dev-plan for most work
- Use roadmap when coordination is needed
- Use epic only for truly large initiatives

### 2. Set Realistic Budgets
- Epic: 500k-1M tokens
- Roadmap: 100k-200k tokens
- Phase-dev-plan: 20k-50k tokens
- Monitor usage and adjust allocations

### 3. Define Clear Dependencies
- Explicit is better than implicit
- Document the "why" in reason field
- Use cross-plan dependencies within roadmaps

### 4. Enable Appropriate Gates
- Require tests for production code
- Require docs for public APIs
- Allow manual override for experimentation

### 5. Monitor Progress
- Check completion percentages regularly
- Use progress aggregation functions
- Look for blocked status early

---

## Troubleshooting

### Epic not advancing to next roadmap

**Cause:** Gating requirements not met

**Solution:**
```javascript
const gateResults = await checkGates(currentRoadmapPath, epic.gating);
console.log(formatGateResults(gateResults));
// Review failed gates and fix issues
```

---

### Roadmap showing 0% completion despite completed plans

**Cause:** Plan references not updated

**Solution:**
```javascript
// Update plan reference
updatePlanReference(roadmap, 'plan-slug', {
  status: 'completed',
  completion_percentage: 100
});

// Recalculate overall completion
roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);
```

---

### Token budget exceeded

**Cause:** Underestimated complexity or inefficient execution

**Solution:**
```javascript
// Check budget status
const budgetSummary = getBudgetSummary(epicBudget);
console.log(formatBudgetSummary(epicBudget));

// Reallocate from completed roadmaps
reallocateBudget(epicBudget, 'roadmap-1', 'roadmap-2', 20000);
```

---

## GitHub Integration

CCASP automatically creates and syncs GitHub issues across the entire hierarchy. When you create an Epic, Roadmap, or Phase-Dev-Plan, corresponding GitHub issues are created and linked together.

### Issue Creation at Each Level

**Epic Issues:**
- Created with `/create-github-epic` command
- Labeled with `epic`
- Contains business objective, success criteria, and roadmap list
- Auto-links to all child roadmap issues

**Roadmap Issues:**
- Created with `/create-roadmap` command
- Labeled with `roadmap`
- Contains phase-dev-plan references and completion tracking
- Auto-links to parent epic (if exists)

**Phase-Dev-Plan Issues:**
- Created automatically when running `/phase-dev-plan`
- Labeled with `phase-dev-plan`
- Contains full phase breakdown with tasks
- Auto-links to parent roadmap or epic (if exists)

### CCASP-META Format Specification

All GitHub issues created by CCASP include a CCASP-META header for machine parsing:

```markdown
<!-- CCASP-META
source: /phase-dev-plan
slug: github-hierarchy-sync
issue_type: feature
progress_file: .claude/phase-plans/github-hierarchy-sync/PROGRESS.json
created_at: 2026-02-04T12:00:00.000Z
parent_type: roadmap
parent_slug: my-roadmap
parent_issue: #123
-->
```

**Required Fields:**
- `source` - Command that created the issue (`/create-github-epic`, `/create-roadmap`, `/phase-dev-plan`)
- `slug` - Unique identifier for the plan/roadmap/epic
- `issue_type` - Type of issue (`epic`, `roadmap`, `feature`)
- `progress_file` - Path to the JSON file tracking progress
- `created_at` - ISO timestamp of creation

**Optional Fields:**
- `parent_type` - Type of parent (`epic` or `roadmap`)
- `parent_slug` - Slug of parent
- `parent_issue` - Issue number of parent (e.g., `#123`)
- `last_synced` - Timestamp of last progress sync

### Progress Sync Hooks

Progress sync is handled by the `github-progress-sync` hook, which runs automatically when:

**Trigger Events:**
- EPIC.json file changes (epic level)
- ROADMAP.json file changes (roadmap level)
- PROGRESS.json file changes (plan level)
- Tasks marked complete via TodoWrite

**Sync Actions:**
1. **Title Update:** Add/update progress percentage prefix
   - `[0%] Project Name` → `[50%] Project Name` → `[100%] Project Name`
2. **Body Update:** Refresh phase/task checkboxes
3. **Comment Post:** Add progress milestone comments at 25%, 50%, 75%, 100%
4. **Issue Closure:** Auto-close when completion reaches 100%

**Hook Configuration:**
```javascript
// .claude/hooks/github-progress-sync.js
{
  enabled: true,
  triggers: ['file-write'],
  filePatterns: ['**/EPIC.json', '**/ROADMAP.json', '**/PROGRESS.json'],
  sync_thresholds: [25, 50, 75, 100], // Post comments at these percentages
  auto_close_on_completion: true
}
```

### Breadcrumb Navigation Format

Breadcrumbs provide clickable navigation across the hierarchy:

**Plan Level:**
```markdown
**Hierarchy:** [Epic #120](https://github.com/owner/repo/issues/120) > [Roadmap #123](https://github.com/owner/repo/issues/123) > This Plan
```

**Roadmap Level:**
```markdown
**Hierarchy:** [Epic #120](https://github.com/owner/repo/issues/120) > This Roadmap
```

**Epic Level:**
No breadcrumb (top level)

Breadcrumbs are generated by `generateBreadcrumb()` in `src/github/issue-hierarchy-manager.js` and included in issue bodies automatically.

### Completion and Closure Flow

When a level reaches 100% completion:

**Phase-Dev-Plan Completion:**
1. Update issue title to `[100%] Project Name`
2. Post completion comment with statistics
3. Close issue with comment
4. Trigger parent roadmap progress recalculation
5. Update parent roadmap issue

**Roadmap Completion:**
1. Calculate completion from all phase-dev-plans
2. Update roadmap issue title to `[100%] Roadmap Name`
3. Post completion summary
4. Close roadmap issue
5. Trigger parent epic progress recalculation
6. Update parent epic issue

**Epic Completion:**
1. Calculate completion from all roadmaps
2. Update epic issue title to `[100%] Epic Name`
3. Post completion summary with overall statistics
4. Close epic issue
5. Optionally archive epic files

**Completion Comment Format:**
```markdown
## ✅ Phase-Dev-Plan Completed

All phases and tasks completed successfully.

**Statistics:**
- Total Phases: 5
- Total Tasks: 23
- Completion: 100%
- Duration: 3 days

**Test Results:**
- Unit Tests: 45 passed
- E2E Tests: 12 passed
- Coverage: 87%

---
_Auto-closed by CCASP Hierarchy Progress Sync_
```

### Standalone Mode Support

Plans can be created without a parent roadmap or epic:

**Creating Standalone Plan:**
```bash
/phase-dev-plan
# Leave parent roadmap field empty
```

**Standalone Issue Characteristics:**
- No `parent_type` or `parent_slug` in CCASP-META
- No breadcrumb in issue body
- Progress sync works independently
- Can be adopted into roadmap later via `/adopt-roadmap`

### Adoption Workflow

Existing standalone plans can be adopted into a roadmap:

**Step 1: Create or Select Roadmap**
```bash
/create-roadmap
# Title: Feature Set Roadmap
# Phase-dev-plans: (will add existing plans)
```

**Step 2: Adopt Standalone Plan**
```bash
/adopt-roadmap --plan=standalone-feature --roadmap=feature-set
```

**Adoption Process:**
1. Load standalone plan PROGRESS.json
2. Update `parent_context` to reference roadmap
3. Post adoption comment to plan issue
4. Add plan reference to roadmap issue
5. Update plan issue with breadcrumb
6. Recalculate roadmap completion percentage

**Adoption Comment Format:**
```markdown
## 🔗 Plan Adopted

This phase-dev-plan has been adopted into a roadmap.

**New Parent:** [Roadmap #145](link)
**Hierarchy:** [Epic #120](link) > [Roadmap #145](link) > This Plan

Progress will now be aggregated up to the parent roadmap.

---
_Updated by /adopt-roadmap command_
```

### Configuration Requirements

GitHub integration requires configuration in `tech-stack.json`:

**Required Configuration:**
```json
{
  "versionControl": {
    "owner": "your-org",
    "repo": "your-repo",
    "projectBoard": {
      "owner": "your-org",
      "repo": "your-repo",
      "number": 1
    }
  }
}
```

**GitHub CLI Requirements:**
- `gh` CLI version 2.40+ installed
- Authenticated via `gh auth login`
- Repository access configured

**Check GitHub Setup:**
```bash
ccasp setup
# Select: Configure GitHub integration
# Or manually run: gh auth status
```

**Testing GitHub Integration:**
```javascript
import { checkGhCli, getRepoInfo } from './src/roadmap/github-integration.js';

const ghStatus = checkGhCli();
if (!ghStatus.authenticated) {
  console.error('GitHub CLI not authenticated');
  console.log('Run: gh auth login');
}

const repoInfo = getRepoInfo();
console.log('Repository:', `${repoInfo.owner}/${repoInfo.repo}`);
```

---

## Related Documentation

- [Phase-Dev-Plan Guide](./PHASE_DEV_PLAN.md)
- [Agent Orchestration](./AGENT_ORCHESTRATION.md)
- [Token Budget Management](./TOKEN_BUDGET.md)
- [Gating Rules](./GATING.md)
- [GitHub Integration Modules](../src/github/README.md)

---

**Version:** 1.1.0
**Last Updated:** 2026-02-04
**Part of:** Claude CLI Advanced Starter Pack (CCASP)
