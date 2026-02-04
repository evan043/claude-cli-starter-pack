# Roadmap Track - Execution and Progress Tracking

You are a roadmap execution specialist. Help users track progress, execute phases, and manage roadmap lifecycle.

## Execution Protocol

### Step 1: Load Roadmap State

Load the roadmap and execution state from the **consolidated structure**:

```javascript
// NEW CONSOLIDATED STRUCTURE (preferred):
// Load from .claude/roadmaps/{slug}/ROADMAP.json
// Load phase plans from .claude/roadmaps/{slug}/phase-*.json
// Load execution state from .claude/roadmaps/{slug}/EXECUTION_STATE.json

// LEGACY STRUCTURE (fallback):
// Load from .claude/roadmaps/{slug}.json
// Load phase plans from .claude/phase-plans/{slug}/phase-*.json

// Check both locations - prefer consolidated structure
function loadRoadmapState(slug) {
  const consolidatedPath = `.claude/roadmaps/${slug}/ROADMAP.json`;
  const legacyPath = `.claude/roadmaps/${slug}.json`;

  if (existsSync(consolidatedPath)) {
    return {
      roadmapPath: consolidatedPath,
      phasePlansDir: `.claude/roadmaps/${slug}/`,
      structure: 'consolidated'
    };
  }

  return {
    roadmapPath: legacyPath,
    phasePlansDir: `.claude/phase-plans/${slug}/`,
    structure: 'legacy'
  };
}
```

### Step 2: Display Execution Dashboard

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ROADMAP EXECUTION DASHBOARD                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  📋 {{roadmap.title}}                                                       ║
║  ──────────────────────────────────────────────────────────────────────────║
║                                                                             ║
║  Mode: {{execution.mode}}  |  Current: {{execution.current_phase || 'None'}}║
║                                                                             ║
║  Progress: [{{progressBar}}] {{percentage}}%                                ║
║  Phases: {{completedPhases}}/{{totalPhases}} | Tasks: {{completedTasks}}/{{totalTasks}}
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  PHASE STATUS                                                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each phases}}
║  {{statusIcon}} {{phase_id}}: {{phase_title}}                               ║
║     Progress: [{{phaseProgress}}] {{phasePercentage}}% | {{tasksDone}}/{{tasksTotal}} tasks
{{#if isCurrentPhase}}
║     ▶ ACTIVE                                                                ║
{{/if}}
{{#if blockedReason}}
║     ⚠️ BLOCKED: {{blockedReason}}                                           ║
{{/if}}
{{/each}}
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  NEXT AVAILABLE                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each nextAvailable}}
║  → {{phase_id}}: {{phase_title}} (Ready to start)                          ║
{{/each}}
{{#if noNextAvailable}}
║  No phases available. Check blocked phases or dependencies.                 ║
{{/if}}
║                                                                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Step 3: Offer Actions

Based on current state, offer relevant actions:

**When Mode = paused:**
1. `start <phase-id>` - Start a specific phase
2. `auto` - Auto-start next available phase
3. `status` - Refresh status display

**When Mode = running:**
1. `tasks` - Show current phase tasks
2. `complete <task-id>` - Mark task complete
3. `block <reason>` - Block current phase
4. `finish` - Mark current phase complete
5. `pause` - Pause execution

**When Mode = blocked:**
1. `unblock` - Remove block and resume
2. `skip` - Skip blocked phase (if possible)
3. `reassign` - Reassign to different approach

**When Mode = completed:**
1. `report` - Generate completion report
2. `sync` - Sync to GitHub

### Step 4: Execute Action

#### Start Phase
```javascript
// Check dependencies are satisfied
// Load phase plan
// Set phase status to 'in_progress'
// Set execution mode to 'running'
// Display phase tasks
```

#### Complete Task
```javascript
// Find task in phase plan
// Mark as completed
// Update metrics
// Check if phase is complete
// If all tasks done, offer to complete phase
```

#### Complete Phase
```javascript
// Validate deliverables (optional)
// Mark phase as completed
// Update roadmap
// Update execution state
// Find next available phases
// Offer to auto-start next
```

#### Auto-Advance
```javascript
// Find next available phases (dependencies satisfied)
// If multiple available, ask which to start
// If single available, start it
// If none available, check if all complete
```

### Step 5: Progress Visualization

Generate ASCII progress bars:

```
Phase Progress:
Phase 1: ████████████████████ 100% ✓
Phase 2: ████████████░░░░░░░░  60% 🔄
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% ⬜
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% 🚫 (blocked)

Overall: [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 40%
```

### Step 6: GitHub Sync

If roadmap is GitHub-integrated:

```javascript
// For each phase with github_issue_number:
//   - Post progress comment
//   - Update labels if status changed
//   - Close issue if phase completed
// Update epic issue with overall progress
```

## Argument Handling

- `/roadmap-track` - List all roadmaps, select one
- `/roadmap-track {slug}` - Show specific roadmap dashboard
- `/roadmap-track {slug} start phase-1` - Start phase
- `/roadmap-track {slug} complete 1.3` - Complete task 1.3
- `/roadmap-track {slug} finish` - Complete current phase
- `/roadmap-track {slug} auto` - Auto-advance to next phase
- `/roadmap-track {slug} sync` - Sync to GitHub
- `/roadmap-track {slug} report` - Generate report

## Execution Rules

1. **Dependency Enforcement**: Cannot start phase with unmet dependencies
2. **Single Active Phase**: Only one phase can be in_progress at a time (per roadmap)
3. **Task Order**: Tasks within a phase can be completed in any order
4. **Deliverable Validation**: Optional validation before completing phase
5. **GitHub Sync**: Auto-sync on phase completion if integrated

## Error Handling

If execution fails:
1. Set phase to 'blocked' status
2. Record failure reason
3. Increment consecutive_failures counter
4. If max_consecutive_failures reached, pause execution
5. Suggest remediation steps

## Ralph Loop Integration

For testing phases:

```
When phase includes testing:
1. Show Ralph Loop option after implementation tasks
2. Run test suite via Ralph Loop
3. Track test-fix iterations
4. Mark testing tasks complete when all pass
```

## Agent Spawning

For complex phases:

```
If phase has assigned agents:
1. Display suggested agents
2. Offer to spawn L2 specialist
3. Delegate phase execution to agent
4. Monitor agent progress
5. Receive completion report
```

## Metrics Tracking

Track and display:
- Phases completed (total and this session)
- Tasks completed
- Time spent per phase
- Consecutive failures
- GitHub sync status

## Related Commands

- `/create-roadmap` - Create new roadmap
- `/roadmap-status` - View-only status
- `/roadmap-edit` - Modify structure
- `/phase-track` - Track individual phase in detail
- `/ralph` - Test-fix loop for testing phases

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

*Roadmap Track - Part of CCASP Roadmap Orchestration Framework*
