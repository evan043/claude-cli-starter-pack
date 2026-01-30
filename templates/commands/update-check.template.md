---
description: Check for CCASP updates and add new features to your project
model: sonnet
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# /update-check - CCASP Update Manager

Check for Claude CLI Advanced Starter Pack updates and manage new features.

## Quick Menu

| Key | Action | Description |
|-----|--------|-------------|
| **1** | Check for Updates | Check npm registry for new versions |
| **2** | Add New Features | Install features from recent updates |
| **3** | Prior Releases | Review and enable features from older versions |
| **4** | View Changelog | See what changed in each release |
| **P** | Planning Mode | Audit new features before adding them |
| **B** | Back to /menu | Return to main menu |

---

## Instructions for Claude

When invoked, perform a version check and display the menu.

### Step 1: Check Current State

Read the current state files:
```bash
# Check installed version
cat node_modules/claude-cli-advanced-starter-pack/package.json 2>/dev/null | grep version
# Or check global install
npm list -g claude-cli-advanced-starter-pack 2>/dev/null | grep claude-cli-advanced-starter-pack
```

Read `.claude/config/ccasp-state.json` if it exists:
```json
{
  "lastCheckTimestamp": 1706644800000,
  "lastCheckResult": { "latestVersion": "1.0.5" },
  "lastSeenVersion": "1.0.4",
  "dismissedVersions": [],
  "installedFeatures": ["menu", "e2e-test", "create-agent"],
  "skippedFeatures": ["roadmap-sync"]
}
```

### Step 2: Check for Updates

Run npm to check latest version:
```bash
npm view claude-cli-advanced-starter-pack version
```

Compare with installed version. If update available, display:

```
╔════════════════════════════════════════════════════════════════╗
║  🆕 UPDATE AVAILABLE                                           ║
║  v1.0.4 → v1.0.5                                               ║
╠════════════════════════════════════════════════════════════════╣
║  What's New in v1.0.5:                                         ║
║  • Agent-powered project implementation                        ║
║  • Version tracking with update notifications                  ║
║  • Prior releases menu for feature management                  ║
║                                                                ║
║  New Features:                                                 ║
║  • /project-impl - Agent-powered setup & configuration         ║
║  • /update-check - Check updates and add features              ║
╠════════════════════════════════════════════════════════════════╣
║  To Update:                                                    ║
║  npm update -g claude-cli-advanced-starter-pack                ║
╚════════════════════════════════════════════════════════════════╝
```

### Step 3: Display Menu and Get Selection

Use AskUserQuestion:
```
What would you like to do?

1. Check for Updates - Check npm for new versions
2. Add New Features - Install features from recent updates
3. Prior Releases - Review features from older versions
4. View Changelog - See release history
P. Planning Mode - Audit features before adding
B. Back to /menu
```

---

## Option 1: Check for Updates

1. Run: `npm view claude-cli-advanced-starter-pack version`
2. Compare with current version
3. If update available:
   - Show version comparison
   - List highlights from releases.json
   - Show update command
   - Offer to add new features after update
4. If up to date:
   - Show "You're on the latest version!"
   - Offer to review available features not yet installed

---

## Option 2: Add New Features

1. Read `.claude/config/ccasp-state.json` for installed/skipped features
2. Read `.claude/commands/` to see what commands exist
3. Compare against available features in releases.json
4. Show features available to add:

```
╔════════════════════════════════════════════════════════════════╗
║  Available Features to Add                                     ║
╠════════════════════════════════════════════════════════════════╣
║  Commands:                                                     ║
║  [ ] /project-impl - Agent-powered project implementation      ║
║  [ ] /roadmap-sync - Sync roadmaps with GitHub                 ║
║  [ ] /claude-settings - Configure permissions and modes        ║
║                                                                ║
║  Optional Features:                                            ║
║  [ ] Token Management - Monitor API token usage                ║
║  [ ] Happy Mode - Mobile app integration                       ║
║  [ ] Tunnel Services - ngrok/localtunnel for mobile testing    ║
╚════════════════════════════════════════════════════════════════╝
```

5. Use AskUserQuestion to let user select features
6. For each selected feature:
   - Read the template from templates/commands/
   - Write to .claude/commands/
   - Update ccasp-state.json
7. Show summary of what was added

---

## Option 3: Prior Releases

1. Load releases.json data
2. Show release history:

```
╔════════════════════════════════════════════════════════════════╗
║  CCASP Release History                                         ║
╠════════════════════════════════════════════════════════════════╣
║  v1.0.5 (2025-01-30) - Agent-powered implementation            ║
║  v1.0.4 (2025-01-29) - Settings schema update                  ║
║  v1.0.3 (2025-01-28) - Backup and uninstall wizard             ║
║  v1.0.2 (2025-01-27) - Template fallback and fixes             ║
║  v1.0.1 (2025-01-26) - Documentation improvements              ║
║  v1.0.0 (2025-01-25) - Initial release                         ║
╚════════════════════════════════════════════════════════════════╝

Select a version to see details and available features: [1-6]
```

3. Show details for selected version:
   - Summary
   - Highlights
   - New features with descriptions
   - Option to add any features from that release

---

## Option 4: View Changelog

Display formatted changelog from releases.json:

```markdown
# CCASP Changelog

## v1.0.5 (2025-01-30)
**Agent-powered project implementation**

### Highlights
- New /project-impl command for agent-powered setup
- Version tracking with update notifications
- Prior releases menu for feature management

### New Commands
- `/project-impl` - Agent-powered project implementation
- `/update-check` - Check updates and add features

---

## v1.0.4 (2025-01-29)
**Settings schema update**
...
```

---

## Option P: Planning Mode

For users who want to audit new features before adding them:

1. Show available features with detailed descriptions
2. Enter plan mode to:
   - Explore the template files
   - Review what changes will be made
   - Check for conflicts with existing commands
   - Understand feature dependencies
3. Create an implementation plan
4. Ask user to approve before making changes
5. Exit plan mode and implement approved changes

**Planning Mode Flow:**
```
1. Explore: Read template files for selected features
2. Analyze: Check for conflicts or dependencies
3. Plan: Create step-by-step implementation plan
4. Review: Present plan to user
5. Approve: User confirms or modifies
6. Implement: Execute approved changes
```

---

## Feature Installation Process

When adding a feature:

### For Commands:
1. Check if template exists: `templates/commands/{name}.template.md`
2. Check if command already exists: `.claude/commands/{name}.md`
3. If exists, ask: Skip, Overwrite, or Backup & Overwrite
4. Copy template to `.claude/commands/{name}.md`
5. Update INDEX.md
6. Update ccasp-state.json

### For Hooks:
1. Check template in `templates/hooks/`
2. Copy to `.claude/hooks/`
3. Update settings.json hooks configuration

### For Optional Features:
1. Update `.claude/config/tech-stack.json`
2. Deploy associated commands/hooks
3. Show post-configuration instructions if needed

---

## State Management

Update `.claude/config/ccasp-state.json` after each operation:

```json
{
  "lastCheckTimestamp": 1706644800000,
  "lastCheckResult": {
    "latestVersion": "1.0.5"
  },
  "lastSeenVersion": "1.0.5",
  "dismissedVersions": [],
  "installedFeatures": [
    "menu",
    "e2e-test",
    "create-agent",
    "project-impl"
  ],
  "skippedFeatures": [
    "roadmap-sync"
  ],
  "installHistory": [
    {
      "feature": "project-impl",
      "version": "1.0.5",
      "installedAt": "2025-01-30T12:00:00Z"
    }
  ]
}
```

---

## Terminal Alternative

These operations can also be run from the terminal:

```bash
# Check for updates
npm outdated -g claude-cli-advanced-starter-pack

# Update package
npm update -g claude-cli-advanced-starter-pack

# Run wizard to add features
ccasp wizard
```

---

## After Installation Reminder

After adding new features, remind user:

```
⚠️  RESTART REQUIRED

New commands have been added to .claude/commands/.
To use them, restart your Claude Code session:

1. Exit (Ctrl+C or /exit)
2. Restart: claude or claude .
3. New commands will be available
```

---

*Part of Claude CLI Advanced Starter Pack*
