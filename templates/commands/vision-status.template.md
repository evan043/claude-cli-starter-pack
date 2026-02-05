---
description: View Vision status, progress, and alignment metrics
options:
  - label: "All Visions"
    description: "List all Visions with summary"
  - label: "Specific Vision"
    description: "Detailed status for one Vision"
  - label: "Quick Status"
    description: "Compact view with key metrics only"
---

# Vision Status - Progress & Alignment Dashboard

Display comprehensive status for Visions including roadmap progress, drift events, security scans, and agent status.

**Vision Architecture:**
```
VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
```

---

## Execution Protocol

### Step 1: Determine Display Mode

Check invocation arguments:

- `/vision-status` - List all Visions
- `/vision-status {slug}` - Show specific Vision details
- `/vision-status --all` - List all Visions with extended details
- `/vision-status {slug} --quick` - Quick status for specific Vision

### Step 2: List All Visions (Default)

If no slug provided, list all Visions:

```javascript
import { listVisions } from './src/vision/state-manager.js';

const visions = listVisions(projectRoot);

if (visions.length === 0) {
  console.log('No Visions found. Create one with /vision-init');
  return;
}
```

Display summary:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         VISION MODE DASHBOARD                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Active Visions: {{count}}                                                  ║
║                                                                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
{{#each visions}}
║                                                                             ║
║  🚀 {{title}} ({{slug}})                                                    ║
║  ────────────────────────────────────────────────────────────────────────── ║
║                                                                             ║
║  Status: {{statusEmoji}} {{status}}                                         ║
║  Progress: [{{progressBar}}] {{completion_percentage}}%                     ║
║  Priority: {{priorityBadge}}                                                ║
║  Created: {{created}} | Updated: {{updated}}                                ║
║                                                                             ║
║  Quick Actions:                                                             ║
║    • /vision-status {{slug}} - View details                                 ║
║    • /vision-adjust {{slug}} - Adjust plan                                  ║
{{#if (eq status 'planning' 'architecting')}}
║    • /vision-execute {{slug}} - Start execution                             ║
{{/if}}
{{#if (eq status 'executing')}}
║    • /vision-pause {{slug}} - Pause execution                               ║
{{/if}}
║                                                                             ║
{{/each}}
╚═══════════════════════════════════════════════════════════════════════════╝
```

**Status Emoji Legend:**

| Status | Emoji |
|--------|-------|
| planning | 📝 |
| analyzing | 🔍 |
| architecting | 🏗️ |
| orchestrating | 🎭 |
| executing | ⚡ |
| validating | ✅ |
| completed | 🎉 |
| failed | ❌ |
| paused | ⏸️ |

**Priority Badge:**

| Priority | Badge |
|----------|-------|
| low | 🔵 LOW |
| medium | 🟡 MEDIUM |
| high | 🟠 HIGH |
| critical | 🔴 CRITICAL |

**Progress Bar:**
- 40 characters wide
- `█` for completed
- `░` for remaining
- Example: `████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░` (30%)

### Step 3: Show Specific Vision Details

If slug provided, load and display full status:

```javascript
import { loadVision, getVisionStatus } from './src/vision/state-manager.js';

const vision = loadVision(projectRoot, visionSlug);
if (!vision) {
  console.log(`Vision not found: ${visionSlug}`);
  return;
}

const status = getVisionStatus(projectRoot, visionSlug);
```

Display detailed status:

```
╔════════════════════════════════════════════════════════════════════════════╗
║                          VISION STATUS REPORT                               ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  {{title}}                                                                  ║
║  Slug: {{slug}} | ID: {{vision_id}}                                         ║
║  Status: {{statusEmoji}} {{status}}                                         ║
║  Priority: {{priorityBadge}}                                                ║
║                                                                             ║
║  Progress: [{{progressBar}}] {{completion_percentage}}%                     ║
║                                                                             ║
║  📅 Timeline                                                                ║
║     Created: {{created}}                                                    ║
║     Updated: {{updated}}                                                    ║
║     Duration: {{duration}}                                                  ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  💭 Original Vision                                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  {{prompt.original}}                                                        ║
║                                                                             ║
║  Intent: {{prompt.parsed.intent}} ({{prompt.confidence}}% confidence)      ║
║  Complexity: {{estimated_complexity}}                                       ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  🗺️ Execution Plan                                                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#if epic_slug}}
║  Parent Epic: {{epic_slug}} (GitHub #{{epic_issue}})                        ║
║               .claude/epics/{{epic_slug}}/EPIC.json                         ║
║                                                                             ║
{{/if}}
║  Roadmaps: {{roadmap_count}} total                                          ║
║            {{roadmaps_completed}} completed                                 ║
║            {{roadmaps_in_progress}} in progress                             ║
║            {{roadmaps_pending}} pending                                     ║
║                                                                             ║
║  Estimated Phases: {{estimated_phases}}                                     ║
║  Estimated Tasks: {{estimated_tasks}}                                       ║
║                                                                             ║
║  Token Budget:                                                              ║
║    Total: {{token_budget.total}} tokens                                     ║
║    Allocated: {{token_budget.allocated}} tokens                             ║
║    Used: {{token_budget.used}} tokens                                       ║
║    Remaining: {{token_budget.remaining}} tokens                             ║
║    Per Roadmap: {{token_budget.per_roadmap}} tokens                         ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  📊 Roadmap Progress                                                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#each roadmaps}}
║  {{order}}. {{title}}                                                       ║
║     Status: {{statusBadge}}                                                 ║
║     Progress: [{{progressBar}}] {{completion_percentage}}%                  ║
║     Path: .claude/roadmaps/{{roadmap_slug}}/ROADMAP.json                    ║
{{#if github_issue}}
║     GitHub: #{{github_issue}}                                               ║
{{/if}}
║     Actions: /roadmap-track {{roadmap_slug}}                                ║
║                                                                             ║
{{/each}}
╠════════════════════════════════════════════════════════════════════════════╣
║  🤖 Agents Created                                                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#if agents_created.length}}
{{#each agents_created}}
║  • {{name}} ({{domain}})                                                    ║
║    Created: {{created_at}}                                                  ║
║    Command: /{{name}}                                                       ║
║                                                                             ║
{{/each}}
{{else}}
║  No agents created yet.                                                     ║
║                                                                             ║
{{/if}}
╠════════════════════════════════════════════════════════════════════════════╣
║  👁️ Observer Status                                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Enabled: {{observer.enabled}}                                              ║
║  Observations: {{observer.observation_count}}                               ║
║  Last Observation: {{observer.last_observation}}                            ║
║                                                                             ║
║  Current Alignment: [{{alignmentBar}}] {{alignmentPercentage}}%            ║
║                                                                             ║
{{#if (lt observer.current_alignment 0.9)}}
║  ⚠️ ALIGNMENT BELOW TARGET (95%)                                            ║
║                                                                             ║
{{/if}}
║  Drift Events: {{observer.drift_events.length}}                             ║
║  Adjustments Made: {{observer.adjustments_made}}                            ║
║                                                                             ║
{{#if observer.drift_events.length}}
║  Recent Drift Events:                                                       ║
{{#each observer.drift_events (limit 5)}}
║    {{detected_at}} - {{severityBadge}} {{area}}                             ║
║      Expected: {{expected}}                                                 ║
║      Actual: {{actual}}                                                     ║
║      Resolution: {{resolution}}                                             ║
║                                                                             ║
{{/each}}
{{/if}}
╠════════════════════════════════════════════════════════════════════════════╣
║  🛡️ Security Status                                                         ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Enabled: {{security.enabled}}                                              ║
║  Scans Performed: {{security.scan_count}}                                   ║
║  Last Scan: {{security.last_scan}}                                          ║
║                                                                             ║
║  Packages Scanned: {{security.packages_scanned}}                            ║
║  Vulnerabilities Found: {{security.vulnerabilities_found}}                  ║
║  Vulnerabilities Blocked: {{security.vulnerabilities_blocked}}              ║
║                                                                             ║
{{#if security.blocked_packages.length}}
║  Blocked Packages:                                                          ║
{{#each security.blocked_packages (limit 5)}}
║    • {{name}} - {{severity}}                                                ║
║      Reason: {{reason}}                                                     ║
║      Blocked: {{blocked_at}}                                                ║
║                                                                             ║
{{/each}}
{{/if}}
╠════════════════════════════════════════════════════════════════════════════╣
║  🏗️ Architecture Summary                                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Frontend: {{architecture.tech_decisions.frontend.framework}}               ║
║  State: {{architecture.tech_decisions.state.library}}                       ║
║  Backend: {{architecture.tech_decisions.backend.framework}}                 ║
║  Database: {{architecture.tech_decisions.database.type}}                    ║
║                                                                             ║
║  API Endpoints: {{architecture.api_contracts.length}}                       ║
║  State Stores: {{architecture.state_design.stores.length}}                  ║
║  Components: {{wireframes.components.length}}                               ║
║  Screens: {{wireframes.screens.length}}                                     ║
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  📋 Next Actions                                                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
{{#if (eq status 'planning')}}
║  ✓ Vision initialized                                                       ║
║  → Complete analysis: Wait for web search results                           ║
║                                                                             ║
{{else if (eq status 'analyzing')}}
║  ✓ Analysis in progress                                                     ║
║  → Generate wireframes and architecture                                     ║
║                                                                             ║
{{else if (eq status 'architecting')}}
║  ✓ Architecture defined                                                     ║
║  → Create roadmaps and start orchestration                                  ║
║  → /vision-execute {{slug}}                                                 ║
║                                                                             ║
{{else if (eq status 'orchestrating')}}
║  ✓ Roadmaps created                                                         ║
║  → Start first roadmap execution                                            ║
{{#if next_roadmap}}
║  → /roadmap-track {{next_roadmap.roadmap_slug}}                             ║
{{/if}}
║                                                                             ║
{{else if (eq status 'executing')}}
║  ✓ Execution in progress                                                    ║
{{#if next_action}}
║  → {{next_action}}                                                          ║
{{else}}
║  → Monitor progress: /vision-status {{slug}}                                ║
{{/if}}
{{#if (lt observer.current_alignment 0.85)}}
║  ⚠️ ALIGNMENT DROPPING - Consider manual adjustment                         ║
║  → /vision-adjust {{slug}}                                                  ║
{{/if}}
║                                                                             ║
{{else if (eq status 'validating')}}
║  ✓ Validation in progress                                                   ║
║  → Run tests and verify functionality                                       ║
║                                                                             ║
{{else if (eq status 'completed')}}
║  ✓ Vision completed successfully!                                           ║
║  → Review final output and documentation                                    ║
║  → Deploy to production if ready                                            ║
║                                                                             ║
{{else if (eq status 'failed')}}
║  ❌ Vision execution failed                                                 ║
║  → Review error logs                                                        ║
║  → /vision-adjust {{slug}} to fix issues                                    ║
║  → /vision-execute {{slug}} --resume to retry                               ║
║                                                                             ║
{{else if (eq status 'paused')}}
║  ⏸️ Vision paused                                                            ║
║  → /vision-execute {{slug}} --resume to continue                            ║
║  → /vision-adjust {{slug}} to modify plan                                   ║
║                                                                             ║
{{/if}}
╠════════════════════════════════════════════════════════════════════════════╣
║  🔗 Related Commands                                                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  /vision-adjust {{slug}}        Adjust Vision plan                          ║
║  /vision-execute {{slug}}       Start/resume autonomous execution           ║
║  /vision-pause {{slug}}         Pause execution                             ║
{{#if epic_slug}}
║  /epic-advance {{epic_slug}}    Advance parent Epic                         ║
{{/if}}
{{#each roadmaps (limit 3)}}
║  /roadmap-track {{roadmap_slug}}{{padRight 17}} Track roadmap {{order}}     ║
{{/each}}
║                                                                             ║
╠════════════════════════════════════════════════════════════════════════════╣
║  📁 Files                                                                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Vision Config: .claude/visions/{{slug}}/VISION.json                        ║
║  Vision Summary: .claude/visions/{{slug}}/VISION_SUMMARY.md                 ║
{{#if epic_slug}}
║  Epic Config: .claude/epics/{{epic_slug}}/EPIC.json                         ║
{{/if}}
{{#each roadmaps (limit 3)}}
║  Roadmap {{order}}: .claude/roadmaps/{{roadmap_slug}}/ROADMAP.json         ║
{{/each}}
║                                                                             ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Step 4: Quick Status Mode

If `--quick` flag provided, show compact status:

```
╔═══════════════════════════════════════════════════╗
║  VISION: {{title}}                                ║
╠═══════════════════════════════════════════════════╣
║  Status: {{status}} | Priority: {{priority}}      ║
║  Progress: [{{progressBar}}] {{completion}}%      ║
║  Roadmaps: {{completed}}/{{total}} complete       ║
║  Alignment: {{alignment}}% | Drift: {{drift}}     ║
║  Security: {{vulnerabilities}} issues             ║
║  Last Updated: {{updated}}                        ║
╠═══════════════════════════════════════════════════╣
║  Next: {{next_action}}                            ║
╚═══════════════════════════════════════════════════╝
```

### Step 5: Calculate Derived Metrics

**Alignment Percentage:**
```javascript
const alignmentPercentage = Math.round(vision.observer.current_alignment * 100);
```

**Alignment Bar:**
```javascript
function generateAlignmentBar(alignment) {
  const width = 30;
  const filled = Math.round(alignment * width);
  const empty = width - filled;

  if (alignment >= 0.95) {
    return '█'.repeat(filled) + '░'.repeat(empty);
  } else if (alignment >= 0.85) {
    return '▓'.repeat(filled) + '░'.repeat(empty);
  } else {
    return '▒'.repeat(filled) + '░'.repeat(empty);
  }
}
```

**Duration:**
```javascript
function calculateDuration(created, updated) {
  const start = new Date(created);
  const end = new Date(updated);
  const diff = end - start;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return 'Less than 1h';
  }
}
```

**Drift Severity Badge:**
```javascript
function getDriftSeverityBadge(severity) {
  switch (severity) {
    case 'critical': return '🔴 CRITICAL';
    case 'high': return '🟠 HIGH';
    case 'medium': return '🟡 MEDIUM';
    case 'low': return '🔵 LOW';
    case 'none': return '🟢 NONE';
    default: return severity;
  }
}
```

**Next Action Recommendation:**
```javascript
function getNextAction(vision) {
  if (vision.status === 'orchestrating' && vision.execution_plan.roadmaps.length > 0) {
    const nextRoadmap = vision.execution_plan.roadmaps.find(rm => rm.status === 'pending');
    if (nextRoadmap) {
      return `/roadmap-track ${nextRoadmap.roadmap_slug}`;
    }
  }

  if (vision.status === 'executing') {
    const inProgressRoadmap = vision.execution_plan.roadmaps.find(rm => rm.status === 'in_progress');
    if (inProgressRoadmap) {
      return `/roadmap-track ${inProgressRoadmap.roadmap_slug}`;
    }
  }

  return null;
}
```

### Step 6: Alignment History Graph (Optional)

If `--chart` flag provided, display ASCII alignment graph:

```
Alignment History (last 24 hours)

100% ┤                                     ╭────────
 95% ┤                               ╭────╯
 90% ┤                         ╭────╯
 85% ┤                   ╭────╯
 80% ┤             ╭────╯
 75% ┤       ╭────╯
 70% ┤ ╭────╯
      └┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬───
       0h   3h   6h   9h   12h  15h  18h  21h  24h

Drift Events: {{drift_count}}
Adjustments: {{adjustment_count}}
```

Use vision.observer.alignment_history to generate graph.

### Step 7: Security Report (Optional)

If `--security` flag provided, show detailed security report:

```
╔═══════════════════════════════════════════════════════════════╗
║                  SECURITY SCAN REPORT                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Total Scans: {{scan_count}}                                  ║
║  Last Scan: {{last_scan}}                                     ║
║                                                               ║
║  Packages Scanned: {{packages_scanned}}                       ║
║  Vulnerabilities Found: {{vulnerabilities_found}}             ║
║  Vulnerabilities Blocked: {{vulnerabilities_blocked}}         ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Blocked Packages                                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
{{#each blocked_packages}}
║  {{name}} ({{severity}})                                      ║
║  Reason: {{reason}}                                           ║
║  Blocked: {{blocked_at}}                                      ║
║                                                               ║
{{/each}}
╚═══════════════════════════════════════════════════════════════╝
```

## Argument Handling

- `/vision-status` - List all Visions
- `/vision-status {slug}` - Show specific Vision details
- `/vision-status --all` - List all with extended details
- `/vision-status {slug} --quick` - Quick status for Vision
- `/vision-status {slug} --chart` - Include alignment history graph
- `/vision-status {slug} --security` - Show security report
- `/vision-status {slug} --json` - Output as JSON for scripting

**Examples:**

```bash
/vision-status

/vision-status kanban-board

/vision-status kanban-board --quick

/vision-status kanban-board --chart

/vision-status kanban-board --security

/vision-status kanban-board --json
```

## JSON Output Format

When `--json` flag is used:

```json
{
  "vision_id": "vis-...",
  "slug": "kanban-board",
  "title": "Kanban Board",
  "status": "executing",
  "priority": "high",
  "completion_percentage": 45,
  "roadmaps": {
    "total": 4,
    "completed": 1,
    "in_progress": 1,
    "pending": 2
  },
  "observer": {
    "enabled": true,
    "current_alignment": 0.92,
    "drift_events": 3,
    "adjustments_made": 2
  },
  "security": {
    "enabled": true,
    "last_scan": "2026-02-05T10:30:00Z",
    "vulnerabilities_found": 5,
    "vulnerabilities_blocked": 2
  },
  "created": "2026-02-01T09:00:00Z",
  "updated": "2026-02-05T10:45:00Z",
  "next_action": "/roadmap-track backend-api"
}
```

## Error Handling

If Vision not found:
```
╔═══════════════════════════════════════════════════════════════╗
║  Vision Not Found: {slug}                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Available Visions:                                           ║
{{#each available_visions}}
║    • {{slug}} - {{title}}                                     ║
{{/each}}
║                                                               ║
║  Create a new Vision: /vision-init                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Related Commands

- `/vision-init` - Initialize a new Vision
- `/vision-adjust` - Adjust Vision plan
- `/vision-execute` - Start autonomous execution
- `/roadmap-track` - Track specific roadmap
- `/epic-advance` - Advance parent Epic

---

*Vision Status - Part of CCASP Vision Mode Autonomous Development Framework*
