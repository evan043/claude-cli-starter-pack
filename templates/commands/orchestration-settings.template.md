---
description: View and modify orchestration settings (parallel agents, compacting)
model: haiku
---

# /orchestration-settings - Parallel & Compacting Configuration

View or modify how parallel agents and context compacting behave during `/phase-track --parallel` and `/roadmap-track run-all --parallel`.

## Current Settings

Read settings from `tech-stack.json` at `.claude/config/tech-stack.json`:

```javascript
const settings = techStack.orchestration || {
  parallel: { maxTasks: 2, maxPlans: 2, maxRoadmaps: 2 },
  compacting: {
    remainingThreshold: 40,
    pollIntervalSec: 120,
    compactAfterLaunch: true,
    compactAfterPoll: true,
  },
};
```

## Display Current Config

Show a compact summary:

```
Orchestration Settings
━━━━━━━━━━━━━━━━━━━━━

Parallel Agents
  Tasks per phase:     {{parallel.maxTasks}}
  Plans per roadmap:   {{parallel.maxPlans}}
  Roadmaps per epic:   {{parallel.maxRoadmaps}}

Context Compacting
  Auto-compact at:     {{compacting.remainingThreshold}}% remaining
  Poll interval:       {{compacting.pollIntervalSec}}s
  Compact after launch: {{compacting.compactAfterLaunch}}
  Compact after poll:   {{compacting.compactAfterPoll}}
```

## Modify Settings

When the user provides arguments, update the specified values:

| Argument | Effect |
|----------|--------|
| `/orchestration-settings` | Display current config |
| `/orchestration-settings --max-tasks N` | Set max parallel tasks per phase |
| `/orchestration-settings --max-plans N` | Set max parallel plans per roadmap |
| `/orchestration-settings --compact-at N` | Set remaining context % threshold |
| `/orchestration-settings --poll N` | Set poll interval in seconds |
| `/orchestration-settings --interactive` | Open interactive menu (same as CLI `ccasp` settings option 8) |

## Instructions for Claude

1. Read `.claude/config/tech-stack.json`
2. If no arguments: display current settings using the format above
3. If arguments provided: update the specified fields and save
4. Use `AskUserQuestion` for `--interactive` mode with these options:
   - Max parallel tasks (1-4)
   - Max parallel plans (1-3)
   - Compact threshold (20-50% remaining)
   - Poll interval (60-300 seconds)
   - Compact after launch (yes/no)
   - Compact after poll (yes/no)

## Defaults

If `orchestration` key doesn't exist in tech-stack.json, use:

```json
{
  "orchestration": {
    "parallel": {
      "maxTasks": 2,
      "maxPlans": 2,
      "maxRoadmaps": 2
    },
    "compacting": {
      "remainingThreshold": 40,
      "pollIntervalSec": 120,
      "compactAfterLaunch": true,
      "compactAfterPoll": true
    }
  }
}
```

## Related Commands

- `/phase-track {slug} --run-all --parallel` - Uses these settings for task parallelism
- `/roadmap-track {slug} run-all --parallel` - Uses these settings for plan parallelism

---

*Part of CCASP Orchestration System*
