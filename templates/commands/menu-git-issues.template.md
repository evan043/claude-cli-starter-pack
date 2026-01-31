---
description: Mobile-friendly menu of open GitHub issues sorted by date
type: utility
complexity: simple
model: haiku
allowed-tools:
  - Bash
  - AskUserQuestion
---

# /menu-git-issues - Quick Issues View

**Mobile-friendly list of open GitHub issues with single-character selection.**

---

## EXECUTION

### Step 1: Fetch and Display Issues

Run this command to get open issues:

```bash
gh issue list --state open --json number,title,createdAt,labels --limit 20
```

### Step 2: Format for Mobile Display

Display issues in this compact format (sorted newest to oldest):

```
╔═══════════════════════════════════════╗
║  📋 Open Issues                       ║
╠═══════════════════════════════════════╣
║                                       ║
║  [A] #123 - Fix login redirect bug    ║
║      01/30 • P1 • frontend            ║
║                                       ║
║  [B] #122 - Add dark mode toggle      ║
║      01/29 • P2 • feature             ║
║                                       ║
║  [C] #121 - Update API docs           ║
║      01/28 • P3 • docs                ║
║                                       ║
║  [D] #120 - Refactor auth module      ║
║      01/27 • P2 • backend             ║
║                                       ║
╠═══════════════════════════════════════╣
║  [R] Refresh  [X] Exit                ║
╚═══════════════════════════════════════╝
```

**Format Rules:**
- Title: Max 30 chars, truncate with `...` if longer
- Date: `MM/DD` format (createdAt)
- Priority: Extract from labels (P0, P1, P2, P3) or show `-`
- Labels: Show first non-priority label, max 10 chars
- Sort: Newest first (by createdAt descending)

### Step 3: Ask User Selection

Use AskUserQuestion with single-letter options:

```
header: "Select"
question: "Pick an issue (A-Z) or action:"
options:
  - label: "A"
    description: "#123 - Fix login redirect bug"
  - label: "B"
    description: "#122 - Add dark mode toggle"
  - label: "C"
    description: "#121 - Update API docs"
  - label: "R"
    description: "Refresh list"
```

### Step 4: Handle Selection

**If user selects an issue (A-Z):**

Show issue details:

```
╔═══════════════════════════════════════╗
║  Issue #123                           ║
╠═══════════════════════════════════════╣
║                                       ║
║  Fix login redirect bug               ║
║                                       ║
║  Created: 01/30/2026                  ║
║  Labels: P1, frontend, bug            ║
║  URL: github.com/.../issues/123       ║
║                                       ║
╠═══════════════════════════════════════╣
║  [S] Start working  [V] View in gh    ║
║  [B] Back to list   [X] Exit          ║
╚═══════════════════════════════════════╝
```

Then ask:

```
header: "Action"
question: "What would you like to do?"
options:
  - label: "S - Start working"
    description: "Create task list for this issue"
  - label: "V - View details"
    description: "Show full issue body"
  - label: "B - Back"
    description: "Return to issues list"
  - label: "X - Exit"
    description: "Close menu"
```

**Actions:**
- **S (Start)**: Run `/create-task-list for issue #[NUMBER]`
- **V (View)**: Run `gh issue view [NUMBER]` and display
- **B (Back)**: Return to Step 2
- **R (Refresh)**: Re-fetch issues and display
- **X (Exit)**: End command

---

## MOBILE OPTIMIZATION

- Single character inputs (A, B, C, S, V, X)
- Compact display fits small screens
- No scrolling needed for main list
- Clear visual hierarchy with boxes
- Truncated titles prevent overflow

---

## ERROR HANDLING

| Error | Action |
|-------|--------|
| No issues found | Display "No open issues" message |
| gh not authenticated | Show `gh auth login` instructions |
| Network error | Show retry option |

---

## RELATED COMMANDS

- `/create-task-list` - Create task list from issue
- `/github-task-start` - Start working on issue
- `/github-update` - Sync with project board
