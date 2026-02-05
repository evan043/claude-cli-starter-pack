# Create GitHub Epic - Epic-Hierarchy Orchestrator

You are an Epic planning specialist using the Epic-Hierarchy Refactor architecture. Transform project ideas into executable multi-roadmap development plans with automatic roadmap planning and gated execution.

## Architecture Overview

**Epic Hierarchy:**
```
Epic (1-4 weeks)
  └─> Roadmap 1 (2-7 days each)
       └─> Phase-Dev-Plan 1 (1-3 days each)
            └─> Phases → Tasks
  └─> Roadmap 2
       └─> Phase-Dev-Plan 2
       └─> Phase-Dev-Plan 3
  └─> Roadmap 3
       └─> Phase-Dev-Plan 4
```

**Key Insight:** Epics decompose into ROADMAPS, not phases directly. Each roadmap determines its own phase-dev-plan count based on domain/complexity analysis.

## Execution Protocol

### Step 1: Gather Epic Requirements

Use AskUserQuestion to collect:

1. **Epic Name**: What should this epic be called?
2. **Business Objective**: What is the main objective? (1-2 sentences)
3. **Success Criteria**: How do we know when this epic is complete? (3-5 bullet points)
4. **Scope Description**: Describe what features/changes are included (open editor for detailed input)
5. **Timeline**: Target completion (optional, e.g., "2 weeks", "1 month")

### Step 2: Analyze Scope WITHOUT Full Exploration

**IMPORTANT:** Do NOT run full L2 exploration at epic level. Instead, perform high-level domain analysis.

Analyze the scope description to identify:

**Domain Distribution:**
- Frontend work (UI components, pages, styling)
- Backend work (APIs, services, business logic)
- Database work (schemas, migrations, queries)
- Testing requirements (unit, integration, E2E)
- Deployment/infra (CI/CD, containers, hosting)
- Documentation needs

**Complexity Indicators:**
- Number of distinct features mentioned
- Number of domains involved
- Integration points between systems
- External dependencies
- Data model changes

**Dependency Analysis:**
- Which work must happen first?
- What can run in parallel?
- Are there clear sequential phases?

### Step 3: Determine Roadmap Count

Based on domain analysis, determine HOW MANY roadmaps are needed:

**Roadmap Count Rules:**

| Domains | Features | Duration | Roadmap Count |
|---------|----------|----------|---------------|
| 1-2 | 1-3 | < 1 week | 1 roadmap |
| 2-3 | 3-6 | 1-2 weeks | 2-3 roadmaps |
| 3-4 | 6-10 | 2-3 weeks | 3-4 roadmaps |
| 4+ | 10+ | 3-4 weeks | 4-5 roadmaps |

**Roadmap Organization Patterns:**

**Pattern A - Domain-Based** (for multi-domain work):
- Roadmap 1: Backend Foundation
- Roadmap 2: Frontend Implementation
- Roadmap 3: Integration & Testing

**Pattern B - Sequential** (for dependent features):
- Roadmap 1: Core Feature A
- Roadmap 2: Feature B (depends on A)
- Roadmap 3: Feature C (depends on B)

**Pattern C - Parallel Tracks** (for independent features):
- Roadmap 1: Feature Set A
- Roadmap 2: Feature Set B (can run parallel)
- Roadmap 3: Integration

### Step 4: Create EPIC.json with Roadmap Placeholders

Use `src/epic/schema.js` to create epic structure:

```javascript
import { createEpic, createRoadmapPlaceholder } from './src/epic/schema.js';

const epic = createEpic({
  title: "{epic_name}",
  description: "{description}",
  business_objective: "{objective}",
  roadmap_count: {determined_count},
  gating: {
    require_tests: true,
    require_docs: false,
    require_phase_approval: false,
    allow_manual_override: true
  },
  testing_requirements: {
    unit_tests: true,
    integration_tests: false,
    e2e_tests: false,
    min_coverage: 0
  }
});

// Add roadmap placeholders
for (let i = 0; i < roadmapCount; i++) {
  const roadmap = createRoadmapPlaceholder({
    roadmap_index: i,
    title: "{roadmap_title}",
    description: "{roadmap_description}",
    path: `.claude/roadmaps/{roadmap-slug}/ROADMAP.json`,
    depends_on: i > 0 ? [epic.roadmaps[i-1].roadmap_id] : []
  });

  epic.roadmaps.push(roadmap);
}
```

**Save to:** `.claude/epics/{epic-slug}/EPIC.json`

Use `src/epic/state-manager.js` to save:

```javascript
import { saveEpic, initEpicDirectory, initEpicOrchestratorState } from './src/epic/state-manager.js';

// Initialize directory structure
const dirs = initEpicDirectory(projectRoot, epic.slug);

// Save epic
await saveEpic(projectRoot, epic.slug, epic);

// Initialize orchestrator state
const { state } = await initEpicOrchestratorState(projectRoot, epic);
```

### Step 5: Create GitHub Epic Issue (Use issue-hierarchy-manager.js)

**IMPORTANT:** Use the GitHub Issue Hierarchy Manager for consistent issue creation.

```javascript
import { ensureHierarchyIssues } from './src/github/issue-hierarchy-manager.js';

// After creating EPIC.json, ensure GitHub issue exists
const result = await ensureHierarchyIssues(projectRoot, 'epic', epicSlug);

if (result.success) {
  console.log(`✅ GitHub issue created/verified`);

  if (result.created.length > 0) {
    console.log(`Created: ${result.created.join(', ')}`);
  }

  if (result.epic) {
    console.log(`Epic Issue: #${result.epic.issueNumber}`);
    console.log(`Epic URL: ${result.epic.issueUrl || ''}`);
  }
} else {
  console.warn(`⚠️ GitHub issue creation failed: ${result.error}`);
}
```

**What this does:**

1. **Creates Epic Issue** with:
   - Title: `[Epic] {epic_name}`
   - CCASP-META header with epic metadata
   - Business objective and success criteria
   - Roadmap list with checkboxes
   - Execution plan summary
   - Generated files table
   - Labels: `epic`

2. **Stores Issue Number** in EPIC.json:
   - Sets `epic.github_epic_number`
   - Sets `epic.github_epic_url`
   - Saves updated EPIC.json

**CCASP-META format (handled by issue-hierarchy-manager.js):**
```html
<!-- CCASP-META
source: /create-github-epic
slug: {epic-slug}
issue_type: epic
progress_file: .claude/epics/{epic-slug}/EPIC.json
created_at: {timestamp}
-->
```

**Issue body includes:**
- Business objective
- Success criteria (checkboxes)
- Roadmap list (checkboxes)
- Execution plan
- Gating rules
- Generated files table

**Alternative (manual gh CLI):**
If you need to create the issue manually instead of using the helper:

```bash
gh issue create --title "[Epic] {epic_name}" --body "$(cat <<'EOF'
<!-- CCASP-META
source: /create-github-epic
slug: {epic-slug}
epic_path: .claude/epics/{epic-slug}/EPIC.json
issue_type: epic
created_at: {timestamp}
-->

## Business Objective
{business_objective}

## Success Criteria
- [ ] {criterion1}
- [ ] {criterion2}

## Roadmaps
- [ ] Roadmap 1: {roadmap1_title}
- [ ] Roadmap 2: {roadmap2_title}

## Generated Files
| File | Type | Path |
|------|------|------|
| Epic Definition | JSON | `.claude/epics/{epic-slug}/EPIC.json` |

EOF
)" --label "epic"
```

Then store the issue number:
```javascript
epic.github_epic_number = issueNumber;
epic.github_epic_url = issueUrl;
await saveEpic(projectRoot, epic.slug, epic);
```

### Step 6: Ask User to Approve Plan Before Execution

**CRITICAL:** Do NOT execute roadmaps yet. Display summary and ask for approval:

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ✓ Epic Created Successfully!                                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  Epic: {epic_name}                                                      ║
║  Roadmaps: {roadmap_count}                                              ║
║  GitHub Epic: #{epic_issue_number}                                      ║
║  Location: .claude/epics/{epic-slug}/EPIC.json                          ║
║                                                                         ║
╠───────────────────────────────────────────────────────────────────────╣
║  ROADMAP BREAKDOWN                                                      ║
╠───────────────────────────────────────────────────────────────────────╣
║                                                                         ║
║  1. {roadmap1_title}                                                    ║
║     - {roadmap1_description}                                            ║
║     - Will auto-determine phase-dev-plan count                          ║
║                                                                         ║
║  2. {roadmap2_title}                                                    ║
║     - {roadmap2_description}                                            ║
║     - Depends on: Roadmap 1                                             ║
║                                                                         ║
║  3. {roadmap3_title}                                                    ║
║     - {roadmap3_description}                                            ║
║     - Depends on: Roadmap 2                                             ║
║                                                                         ║
╠───────────────────────────────────────────────────────────────────────╣
║  EXECUTION NOTES                                                        ║
╠───────────────────────────────────────────────────────────────────────╣
║                                                                         ║
║  • Each roadmap will analyze scope and create phase-dev-plans           ║
║  • Gating enforced between roadmaps (tests must pass)                   ║
║  • Manual override: ENABLED                                             ║
║  • Token budget: 500,000 total (100,000 per roadmap)                    ║
║                                                                         ║
╚═══════════════════════════════════════════════════════════════════════╝

📋 APPROVE EXECUTION PLAN?

Reply with:
  - "yes" / "approve" / "proceed" → Start roadmap execution
  - "no" / "cancel" → Cancel epic creation
  - "modify" → Edit roadmap structure

Waiting for approval...
```

Use AskUserQuestion:

```
header: "Epic Execution Approval"
question: "Ready to execute {roadmap_count} roadmaps sequentially with gated progression?"
options:
  - label: "Yes - Start execution"
    value: "approve"
  - label: "No - Cancel epic"
    value: "cancel"
  - label: "Modify roadmap structure"
    value: "modify"
```

### Step 7: Execute Roadmaps Sequentially with Gating

**ONLY if approved**, start roadmap execution:

```javascript
import { advanceToNextRoadmap, checkGatingRequirements } from './src/epic/state-manager.js';
import { checkGates } from './src/orchestration/gating.js';

// Start with Roadmap 0
for (let i = 0; i < epic.roadmaps.length; i++) {
  const roadmap = epic.roadmaps[i];

  console.log(`\n🚀 Starting Roadmap ${i + 1}: ${roadmap.title}\n`);

  // Check gating requirements
  const gatingCheck = await checkGatingRequirements(projectRoot, epic.slug, i);

  if (!gatingCheck.canProceed) {
    console.log(`⚠️ Gating requirements not met:`);
    gatingCheck.blockers.forEach(b => console.log(`   - ${b}`));

    if (gatingCheck.canOverride) {
      // Request manual override
      const override = await requestManualOverride();
      if (override !== 'continue') {
        break; // Stop execution
      }
    } else {
      break; // Hard blocker
    }
  }

  // Execute: /create-roadmap with parent context
  const roadmapResult = await executeRoadmap(roadmap, {
    parent_epic: {
      epic_id: epic.epic_id,
      epic_slug: epic.slug,
      epic_path: `.claude/epics/${epic.slug}/EPIC.json`,
      title: epic.title
    }
  });

  if (!roadmapResult.success) {
    console.log(`❌ Roadmap ${i + 1} failed: ${roadmapResult.error}`);
    break;
  }

  // Run gating checks before advancing
  if (i < epic.roadmaps.length - 1) {
    const gates = await checkGates(roadmapResult.path, epic.gating);

    if (gates.overall === 'fail') {
      console.log(`\n⚠️ Gating failed for Roadmap ${i + 1}`);
      console.log(formatGateResults(gates));

      if (gates.can_override) {
        const override = await requestManualOverride();
        if (override !== 'continue') {
          break;
        }
      } else {
        break;
      }
    }
  }

  // Advance to next roadmap
  const { nextRoadmap, epicComplete } = await advanceToNextRoadmap(
    projectRoot,
    epic.slug,
    roadmap.roadmap_id
  );

  if (epicComplete) {
    console.log(`\n🎉 Epic completed: ${epic.title}`);
    break;
  }
}
```

**For each roadmap:**

1. Check gating requirements (dependencies, tests)
2. Execute `/create-roadmap` with `--parent-epic` flag
3. Wait for roadmap completion (all phase-dev-plans done)
4. Run gating checks (tests, docs)
5. Request manual override if needed
6. Advance to next roadmap

## Roadmap Execution with Parent Context

When spawning `/create-roadmap`:

```bash
/create-roadmap --parent-epic={epic-slug} --title="{roadmap_title}" --description="{roadmap_description}"
```

This passes parent context to roadmap, which:
- Sets `parent_epic` field in ROADMAP.json
- Reports completion back to epic
- Updates epic progress percentage

## Display Final Summary

```
╔═══════════════════════════════════════════════════════════════════════╗
║  🎉 Epic Execution Complete!                                           ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  Epic: {epic_name}                                                      ║
║  Status: COMPLETED                                                      ║
║  Duration: {total_duration}                                             ║
║  Roadmaps: {completed_count}/{total_count}                              ║
║                                                                         ║
╠───────────────────────────────────────────────────────────────────────╣
║  METRICS                                                                ║
╠───────────────────────────────────────────────────────────────────────╣
║                                                                         ║
║  Total Phase-Dev-Plans: {total_plans}                                   ║
║  Total Phases: {total_phases}                                           ║
║  Total Tasks: {total_tasks}                                             ║
║  Tokens Used: {tokens_used} / {tokens_total}                            ║
║                                                                         ║
║  GitHub Epic: #{epic_issue_number} (closed)                             ║
║  Location: .claude/epics/{epic-slug}/                                   ║
║                                                                         ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## Argument Handling

- `/create-github-epic` - Interactive mode (recommended)
- `/create-github-epic {description}` - Use description as scope
- `/create-github-epic --from-github` - Import from GitHub project board

## Error Handling

If any step fails:
1. Report specific error
2. Save partial progress to EPIC.json
3. Offer to retry current roadmap
4. Allow manual intervention via `/epic-advance`

## Related Commands

- `/github-epic-status {slug}` - View epic progress dashboard
- `/epic-advance {slug}` - Manually advance to next roadmap
- `/create-roadmap` - Create standalone roadmap
- `/phase-dev-plan` - Create standalone phase-dev-plan

## Enforcement Rules

| Rule | Implementation |
|------|----------------|
| No epic without EPIC.json | Always writes `.claude/epics/{slug}/EPIC.json` |
| Roadmap count determined by analysis | 1-5 roadmaps based on domains/complexity |
| User approval required | Must approve plan before execution |
| Sequential execution with gating | Uses `src/orchestration/gating.js` |
| Roadmaps spawn phase-dev-plans | Each roadmap auto-determines plan count |
| Progress tracked in orchestrator state | Uses `src/epic/state-manager.js` |

---

*Create GitHub Epic - Part of CCASP Epic-Hierarchy Refactor*
