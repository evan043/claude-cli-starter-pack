# Smart Update Manager

Explore and manage updates for your customized CCASP assets with intelligent merge suggestions.

## Overview

This command helps you safely update customized commands, skills, agents, and hooks while preserving your modifications. It detects which assets you've customized and used, then provides merge exploration with Claude's analysis.

## When to Use

- After running `npm update -g claude-cli-advanced-starter-pack`
- When `/menu` shows an update is available with customized assets
- To review what changes an update would bring before applying

## Execution Flow

### Step 1: Detect Customized Assets

Read `.claude/config/usage-tracking.json` to identify:
- Assets you've used (commands, skills, agents, hooks)
- Assets marked as customized (modified from template)
- Usage frequency and last-used dates

### Step 2: Compare with Templates

For each customized asset:
1. Load your local version from `.claude/`
2. Load the template version from the CCASP package
3. Generate a diff comparison
4. Analyze change significance (low/medium/high)

### Step 3: Present Merge Options

For each asset with differences, offer:

| Option | Description |
|--------|-------------|
| **Explore** | Show detailed analysis with Claude's explanation of changes |
| **Replace** | Use the new template version (backup created) |
| **Skip** | Keep your customized version |
| **Show Diff** | View raw line-by-line differences |

### Step 4: Apply Decisions

- Backup files go to `.claude/backups/` with timestamps
- Update `.claude/config/usage-tracking.json` to reflect changes
- Generate summary report of actions taken

## Usage Examples

### Check for updates
```
/update-smart
```

### Force re-check (bypass cache)
```
/update-smart --force
```

### Only show customized assets (no update)
```
/update-smart --list
```

## Output

### Asset Summary Table
```
┌────────────────────────────────────────────────────────────────┐
│  Customized Assets Detected                                    │
├────────────────────────────────────────────────────────────────┤
│  Commands (3)                                                  │
│    • /create-task-list  - 🟡 Medium changes - Used 12 times   │
│    • /github-update     - 🟢 Minor changes - Used 5 times     │
│    • /e2e-test          - 🔴 Major changes - Used 8 times     │
├────────────────────────────────────────────────────────────────┤
│  Skills (1)                                                    │
│    • dms                - 🟡 Medium changes - Used 3 times    │
└────────────────────────────────────────────────────────────────┘
```

### Change Significance Legend
- 🟢 **Low**: Comment changes, formatting, minor tweaks
- 🟡 **Medium**: Configuration changes, new options
- 🔴 **High**: Structural changes, new features, breaking changes

## Related Commands

- `/update-check` - Check for CCASP updates
- `/menu` - View update status in main menu
- `/ccasp-setup` - Re-run setup wizard

## File Locations

| File | Purpose |
|------|---------|
| `.claude/config/usage-tracking.json` | Asset usage data |
| `.claude/config/ccasp-state.json` | Update state cache |
| `.claude/backups/` | Backup directory for replaced files |

## Implementation Notes

1. Read usage tracking from `.claude/config/usage-tracking.json`
2. For each customized asset type (commands, skills, agents, hooks):
   - Get local version from `.claude/{type}/`
   - Get template from CCASP package installation
   - Compare contents and generate diff
3. Display findings and prompt for decisions
4. Apply updates with backups
5. Update tracking file to reflect new state
