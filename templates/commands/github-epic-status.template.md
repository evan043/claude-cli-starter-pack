# GitHub Epic Status - Progress Dashboard

You are an Epic progress tracking specialist. Display comprehensive status for GitHub Epics with visual progress indicators, Mermaid dependency graphs, and actionable insights.

## Execution Protocol

### Step 1: Load Epic Data

Load epic from `.claude/github-epics/{slug}.json` or by argument:
- `/github-epic-status` - Show all epics overview
- `/github-epic-status {slug}` - Show specific epic details

### Step 2: Display Overview (All Epics)

When no slug provided, show summary table:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          GITHUB EPIC STATUS DASHBOARD                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                                 ║
║  Active Epics: 3            Completed: 1            Total Phases: 15           ║
║                                                                                 ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ # │ Epic Name              │ Phases │ Progress │ Status    │ Next Phase       ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ 1 │ AI Agent Orchestrator  │ 5      │ ████████░░ 80%   │ active    │ Phase 5: Polish   ║
║ 2 │ RepoGuard System       │ 7      │ ██░░░░░░░░ 20%   │ active    │ Phase 2: API      ║
║ 3 │ Multi-tenant SaaS      │ 4      │ ██████████ 100%  │ completed │ -                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Step 3: Display Detailed View (Specific Epic)

When slug provided, show full details:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  EPIC: AI Agent Orchestrator                                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                                 ║
║  Business Objective:                                                            ║
║  Build a multi-tier agent system for autonomous task execution                  ║
║                                                                                 ║
║  Success Criteria:                                                              ║
║  [x] All L2 specialist agents can be spawned successfully                       ║
║  [x] 95% task completion rate without human intervention                        ║
║  [ ] Response time < 2 seconds for simple queries                               ║
║                                                                                 ║
╠───────────────────────────────────────────────────────────────────────────────╣
║  Status: active           Created: 2024-01-10        GitHub: #123              ║
║  Progress: 80% (4/5)      Last Updated: 2024-01-25   Testing: 3 issues created ║
╚═══════════════════════════════════════════════════════════════════════════════╝

## Phase Breakdown

┌───┬──────────────────────────┬────────────┬────────────┬──────────────┬───────────┐
│ # │ Phase                    │ Complexity │ Tasks      │ Status       │ Deps      │
├───┼──────────────────────────┼────────────┼────────────┼──────────────┼───────────┤
│ 1 │ Foundation               │ M          │ 8/8        │ ✅ complete  │ -         │
│ 2 │ Agent Registry           │ M          │ 12/12      │ ✅ complete  │ 1         │
│ 3 │ L2 Specialists           │ L          │ 15/15      │ ✅ complete  │ 2         │
│ 4 │ L3 Workers               │ M          │ 10/10      │ ✅ complete  │ 3         │
│ 5 │ Integration & Polish     │ L          │ 3/8        │ 🔄 active    │ 3,4       │
└───┴──────────────────────────┴────────────┴────────────┴──────────────┴───────────┘

## Dependency Graph

\`\`\`mermaid
graph LR
  subgraph Completed
    P1[✅ Foundation]
    P2[✅ Registry]
    P3[✅ Specialists]
    P4[✅ Workers]
  end
  subgraph Active
    P5[🔄 Integration]
  end

  P1 --> P2
  P2 --> P3
  P3 --> P4
  P3 --> P5
  P4 --> P5
\`\`\`

## Testing Schedule

| Phase | Testing Date | Status | RALPH Loops |
|-------|--------------|--------|-------------|
| Phase 1: Foundation | Jan 15, 2024 | ✅ Passed | 2 loops |
| Phase 2: Registry | Jan 17, 2024 | ✅ Passed | 1 loop |
| Phase 3: Specialists | Jan 20, 2024 | ✅ Passed | 3 loops |
| Phase 4: Workers | Jan 23, 2024 | ✅ Passed | 1 loop |
| Phase 5: Integration | Pending | ⏳ Scheduled | - |

## Actions Available

[S] Start next phase    [G] Open GitHub Epic    [T] View testing issues
[E] Edit epic           [R] Refresh status      [B] Back to menu
```

### Step 4: Show Progress Insights

Provide actionable insights:

```
## Insights

⚡ **Velocity**: 1.2 phases per week (on track for Feb 1 completion)

⚠️ **Blockers**: None detected

💡 **Recommendations**:
- Phase 5 has high complexity (L) - consider parallel work streams
- 2 external dependencies pending: API contract finalization
- Testing coverage at 85% - consider adding edge case tests
```

### Step 5: GitHub Sync Status

If GitHub integrated:

```
## GitHub Integration

Epic Issue: #123 (open) - last synced 2 hours ago
Child Issues:
  - #124 Phase 1: Foundation [closed]
  - #125 Phase 2: Registry [closed]
  - #126 Phase 3: Specialists [closed]
  - #127 Phase 4: Workers [closed]
  - #128 Phase 5: Integration [open]

Testing Issues:
  - #130 Testing: Phase 1 [closed]
  - #131 Testing: Phase 2 [closed]
  - #132 Testing: Phase 3 [closed]
  - #133 Testing: Phase 4 [closed]

[S] Sync now    [O] Open in browser    [C] Create missing issues
```

## Argument Handling

- `/github-epic-status` - Dashboard of all epics
- `/github-epic-status {slug}` - Detailed view of specific epic
- `/github-epic-status --json` - Output as JSON
- `/github-epic-status --sync` - Sync with GitHub before displaying

## Related Commands

- `/github-epic-menu` - Epic management dashboard
- `/github-epic-edit` - Edit epic structure
- `/github-epic-track` - Track epic execution
- `/create-github-epic` - Create new epic

---

*GitHub Epic Status - Part of CCASP GitHub Epic System*
