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

First, fetch full issue details including body:

```bash
gh issue view [NUMBER] --json number,title,body,createdAt,labels,url
```

**Detect Issue Format:**

Check if the issue body contains BOTH of these indicators of `/github-task` format:
- `## Acceptance Criteria` OR `## Task Checklist` section
- `## Suggested Implementation` OR `## Implementation Approach` section

**If PROPERLY FORMATTED** (created by `/github-task`):

Show issue details with format indicator:

```
╔═══════════════════════════════════════╗
║  Issue #123  ✓ Task-Ready             ║
╠═══════════════════════════════════════╣
║                                       ║
║  Fix login redirect bug               ║
║                                       ║
║  Created: 01/30/2026                  ║
║  Labels: P1, frontend, bug            ║
║  URL: github.com/.../issues/123       ║
║                                       ║
║  Format: Task-ready (has checklist)   ║
║                                       ║
╠═══════════════════════════════════════╣
║  [S] Start (use existing tasks)       ║
║  [V] View details  [B] Back  [X] Exit ║
╚═══════════════════════════════════════╝
```

Then ask:

```
header: "Action"
question: "What would you like to do?"
options:
  - label: "S - Start working"
    description: "Execute task checklist from issue"
  - label: "V - View details"
    description: "Show full issue body"
  - label: "B - Back"
    description: "Return to issues list"
```

**If NOT PROPERLY FORMATTED** (generic issue):

Show issue details with exploration indicator:

```
╔═══════════════════════════════════════╗
║  Issue #123  ⚠ Needs Analysis         ║
╠═══════════════════════════════════════╣
║                                       ║
║  Fix login redirect bug               ║
║                                       ║
║  Created: 01/30/2026                  ║
║  Labels: P1, frontend, bug            ║
║  URL: github.com/.../issues/123       ║
║                                       ║
║  Format: Needs task list generation   ║
║                                       ║
╠═══════════════════════════════════════╣
║  [S] Start (explore + generate tasks) ║
║  [V] View details  [B] Back  [X] Exit ║
╚═══════════════════════════════════════╝
```

Then ask:

```
header: "Action"
question: "What would you like to do?"
options:
  - label: "S - Start working"
    description: "Run /create-task-list to analyze and generate tasks"
  - label: "V - View details"
    description: "Show full issue body"
  - label: "B - Back"
    description: "Return to issues list"
```

### Step 5: Handle "Start Working" Based on Format

**For PROPERLY FORMATTED issues (S action):**

1. Extract the task checklist from the issue body
2. Parse tasks from `## Acceptance Criteria` or `## Task Checklist` section
3. Create TodoWrite entries from the checklist items
4. Begin implementing tasks in order
5. As each task completes, optionally update issue with progress comment

**For NOT PROPERLY FORMATTED issues (S action):**

1. Run `/create-task-list for issue #[NUMBER]`
2. After task list is generated, ask:

```
header: "Update"
question: "Update GitHub issue with generated task list?"
options:
  - label: "Y - Yes, update issue"
    description: "Add task checklist to issue body"
  - label: "N - No, just implement"
    description: "Keep issue as-is, start work"
```

3. If user selects Y:
   ```bash
   # Append task checklist to issue body
   gh issue edit [NUMBER] --body "$(gh issue view [NUMBER] --json body -q .body)

   ## Task Checklist (Auto-generated)

   - [ ] Task 1
   - [ ] Task 2
   ..."
   ```

4. Begin implementing generated task list

**Other Actions:**
- **V (View)**: Run `gh issue view [NUMBER]` and display full body
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
