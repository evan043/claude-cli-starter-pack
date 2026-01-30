---
description: Start a Happy Mode session for mobile app integration
model: sonnet
---

# /happy-start - Start Happy Mode Session

Initialize Happy Engineering integration for mobile app control and checkpoint management.

{{#if happyMode.enabled}}

## Configuration

| Setting | Value |
|---------|-------|
| Dashboard URL | {{happyMode.dashboardUrl}} |
| Checkpoint Interval | {{happyMode.checkpointInterval}} minutes |
| Verbosity | {{happyMode.verbosity}} |
| Notify on Task Complete | {{happyMode.notifications.onTaskComplete}} |
| Notify on Error | {{happyMode.notifications.onError}} |

## Session Modes

### 1. Full Verbosity
Complete responses with all details. Best for desktop use.

### 2. Condensed (Recommended for Mobile)
Summarized responses optimized for mobile viewing:
- Bullet points instead of paragraphs
- Collapsed code blocks
- Status indicators (✓, ⚠, ✗)

### 3. Minimal
Essential information only:
- Task status
- Error messages
- Required user input

## Commands During Happy Session

| Command | Description |
|---------|-------------|
| `happy:checkpoint` | Save current progress checkpoint |
| `happy:status` | Show session status and metrics |
| `happy:pause` | Pause and save state |
| `happy:resume` | Resume from last checkpoint |
| `happy:end` | End Happy session gracefully |

## Checkpoint Structure

Checkpoints are saved to: `.claude/self-hosted-happy/checkpoints/`

```json
{
  "timestamp": "2025-01-30T12:00:00Z",
  "sessionId": "uuid",
  "progress": {
    "tasksCompleted": 3,
    "tasksRemaining": 2,
    "currentTask": "Implement feature X"
  },
  "context": {
    "summary": "Working on...",
    "recentFiles": ["src/...", "..."],
    "pendingActions": []
  }
}
```

## Instructions for Claude

When this command is invoked:

1. **Initialize Session**
   - Generate session ID
   - Create initial checkpoint
   - Set response format to `{{happyMode.verbosity}}`

2. **Configure Notifications**
   {{#if happyMode.notifications.onTaskComplete}}
   - Enable task completion notifications
   {{/if}}
   {{#if happyMode.notifications.onError}}
   - Enable error notifications
   {{/if}}

3. **Start Checkpoint Timer**
   - Schedule checkpoints every {{happyMode.checkpointInterval}} minutes
   - Auto-save on significant progress

4. **Respond with Session Info**
   ```
   Happy Mode Started
   ─────────────────
   Session: <id>
   Verbosity: {{happyMode.verbosity}}
   Checkpoints: Every {{happyMode.checkpointInterval}} min

   Ready for tasks. Mobile app can now control this session.
   ```

{{else}}

## Happy Mode Disabled

Happy Engineering integration is not enabled for this project.

To enable:
1. Run `/menu` → Project Settings → Happy Mode
2. Configure dashboard URL and checkpoint interval
3. Install Happy Coder mobile app

{{/if}}

---

*Generated from tech-stack.json template*
