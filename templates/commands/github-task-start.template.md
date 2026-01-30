---
description: Start or complete a task from GitHub Project Board
model: sonnet
---

# /github-task-start - Start GitHub Task

Start working on a task from your GitHub Project Board or mark it complete.

{{#if versionControl.projectBoard.number}}

## Usage

```
/github-task-start <issue-number>           # Start working on issue
/github-task-start <issue-number> --complete # Complete the issue
```

## Workflow

### Starting a Task

1. **Fetch Issue Details**
   ```bash
   gh issue view <number> --repo {{versionControl.owner}}/{{versionControl.repo}} --json title,body,labels,assignees
   ```

2. **Create Branch** (optional)
   ```bash
   git checkout -b feature/<issue-number>-<slug>
   ```

3. **Update Project Board Status**
   ```bash
   # Move to "In Progress" status
   gh project item-edit --id <item-id> --project-id {{versionControl.projectBoard.id}} --field-id <status-field-id> --single-select-option-id <in-progress-id>
   ```

4. **Create Task List**
   - Analyze issue requirements
   - Create TodoWrite tasks based on acceptance criteria
   - Begin implementation

### Completing a Task

1. **Verify All Tests Pass**
   ```bash
   {{#if testing.e2e.testCommand}}
   {{testing.e2e.testCommand}}
   {{else}}
   npm test
   {{/if}}
   ```

2. **Create Commit**
   ```bash
   git add .
   git commit -m "feat: <description>

   Closes #<issue-number>"
   ```

3. **Create PR**
   ```bash
   gh pr create --title "<title>" --body "Closes #<issue-number>" --repo {{versionControl.owner}}/{{versionControl.repo}}
   ```

4. **Update Project Board Status**
   - Move to "Done" status
   - Add completion comment

## Instructions for Claude

When invoked with an issue number:

1. Parse arguments for issue number and --complete flag
2. Fetch issue details from GitHub
3. If starting:
   - Display issue summary
   - Ask about branch creation
   - Update project board status
   - Generate task list from requirements
4. If completing:
   - Verify tests pass
   - Create PR if not exists
   - Update project board status
   - Add completion comment

{{else}}

## Configuration Required

GitHub Project Board is not configured. Run `/menu` → Project Settings → GitHub Project Board.

{{/if}}

---

*Generated from tech-stack.json template*
