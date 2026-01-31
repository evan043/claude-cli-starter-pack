---
description: Create intelligent task list with codebase exploration and clarifying questions
type: project
complexity: medium
model: opus
argument-hint: [task or feature description]
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - AskUserQuestion
  - Write
---

# /create-task-list - Intelligent Task List Generator

**Create a comprehensive task list with codebase exploration, clarifying questions, and persistent testing instructions.**

---

## QUICK START

```bash
/create-task-list fix the login page redirect bug
/create-task-list add dark mode to the settings panel
/create-task-list for issue #123                      # Analyze issue, generate tasks
/create-task-list for issue #123 --use-existing-tasks # Use issue's task checklist
/create-task-list
```

---

## FLAGS & ARGUMENTS

| Argument | Description |
|----------|-------------|
| `for issue #[N]` | Pull context from GitHub issue #N |
| `--use-existing-tasks` | Skip task generation, use issue's existing `## Task Checklist` |

**When `for issue #[NUMBER]` is specified:**
1. Fetch issue via `gh issue view [NUMBER] --json number,title,body,labels`
2. Use issue title + body as the task prompt
3. Extract labels for context (frontend, backend, P1, etc.)

**When `--use-existing-tasks` is specified:**
1. Parse existing checklist from `## Task Checklist` or `## Acceptance Criteria`
2. Skip Step 5 (task generation) - use parsed tasks directly
3. Still run full workflow: exploration, testing questions, workflow options

---

## PERSISTENT INSTRUCTIONS

**IMPORTANT**: Reference the persistent testing/deployment rules from `.claude/task-lists/TESTING_RULES.md`.

These rules are loaded automatically and apply to ALL task lists created by this command.

**Quick Reference** (full details in TESTING_RULES.md):
- **URLs**: {{devEnvironment.tunnel.service}} (`{{urls.tunnel.frontend}}`) or production (`{{urls.production.frontend}}`)
- **Login**: Use credentials from `{{testing.credentials.usernameEnvVar}}` / `{{testing.credentials.passwordEnvVar}}`
- **Login Selectors**: `{{testing.selectors.username}}`, `{{testing.selectors.password}}`, `{{testing.selectors.loginButton}}`
- **Backend**: {{deployment.backend.platform}} (never local dev server)
- **Deploy workflow**: Delete `/{{frontend.distDir}}` → rebuild → deploy → verify SHA
- **Task workflow**: Debug with curl → {{testing.e2e.framework}} test → commit after each task

---

## EXECUTION FLOW

### Step 0: Check Testing Configuration (Graceful Degradation)

**FIRST ACTION**: Check what testing configuration is available and display status.

**Configuration Check**:

1. **Read tech-stack.json** (`.claude/tech-stack.json` or `tech-stack.json`)
2. **Check testing section** for:
   - `testing.e2e.framework` - E2E framework (playwright, cypress, etc.)
   - `testing.selectors.*` - Login form selectors
   - `testing.credentials.*` - Environment variable names
   - `testing.environment.*` - Base URL and setup

3. **Display Configuration Status**:

```
╔═══════════════════════════════════════════════════════════════╗
║  📋 Testing Configuration Status                               ║
╠═══════════════════════════════════════════════════════════════╣
{{#if testing.e2e.framework}}
║  ✅ E2E Framework: {{testing.e2e.framework}}                   ║
{{else}}
║  ⚠️  E2E Framework: Not configured                             ║
{{/if}}
{{#if testing.selectors.username}}
║  ✅ Login Selectors: Configured                                ║
{{else}}
║  ⚠️  Login Selectors: Not configured                           ║
{{/if}}
{{#if testing.credentials.usernameEnvVar}}
║  ✅ Credentials: Using env vars                                ║
{{else}}
║  ⚠️  Credentials: Not configured                               ║
{{/if}}
{{#if testing.environment.baseUrl}}
║  ✅ Test URL: {{testing.environment.baseUrl}}                  ║
{{else}}
║  ⚠️  Test URL: Not configured                                  ║
{{/if}}
╚═══════════════════════════════════════════════════════════════╝
```

**Graceful Degradation Rules**:

| Config Status | Behavior |
|---------------|----------|
| **Fully configured** | Include all testing tasks (login, verification, E2E) |
| **Partially configured** | Include available tests, warn about missing pieces |
| **Not configured** | Skip testing tasks, show setup reminder at end |

**If testing is NOT configured**, display this reminder and continue:

```
╔═══════════════════════════════════════════════════════════════╗
║  ℹ️  Testing not configured - skipping E2E verification        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  To enable automated testing, run:                            ║
║                                                               ║
║    ccasp test-setup                                           ║
║                                                               ║
║  Or configure manually in tech-stack.json under "testing"     ║
║                                                               ║
║  Task list will be created WITHOUT testing tasks.             ║
║  You can still test manually after implementation.            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Store configuration status** for use in later steps:
- `TESTING_CONFIGURED`: true/false
- `E2E_ENABLED`: true if framework is set and not 'none'
- `SELECTORS_AVAILABLE`: true if login selectors exist

---

### Step 0b: Load Persistent Rules (if configured)

{{#if testing.e2e.framework}}
**Read `.claude/task-lists/TESTING_RULES.md`** to load testing and deployment rules.

These rules govern:
- Which URLs to use ({{devEnvironment.tunnel.service}} vs {{urls.production.frontend}})
- Login credentials
- Deployment workflow (delete {{frontend.distDir}}, rebuild, verify SHA)
- Task completion workflow (curl → {{testing.e2e.framework}} → commit)
{{else}}
**Skip loading TESTING_RULES.md** - testing not configured.
{{/if}}

---

### Step 1: Capture User Prompt & Parse Flags

```
PROMPT: $ARGUMENTS

Parse for special patterns:
  - "for issue #[NUMBER]" → Set GITHUB_ISSUE_NUMBER, fetch issue
  - "--use-existing-tasks" → Set USE_EXISTING_TASKS=true

If no arguments provided:
  → Use AskUserQuestion: "What would you like to accomplish today?"
```

**If GITHUB_ISSUE_NUMBER is set:**

```bash
# Fetch full issue details
gh issue view [NUMBER] --json number,title,body,labels,url
```

**Store issue data:**
```json
{
  "issue_number": [NUMBER],
  "issue_title": "[title]",
  "issue_body": "[body]",
  "issue_labels": ["label1", "label2"],
  "issue_url": "[url]"
}
```

**Set PROMPT** to: `[Issue Title]: [First 500 chars of body]`

**If USE_EXISTING_TASKS is true:**
1. Parse `## Task Checklist` or `## Acceptance Criteria` from issue body
2. Extract checkbox items: `- [ ] Task description`
3. Store as `EXISTING_TASKS` array
4. Display:
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  📋 Using Existing Tasks from Issue #[NUMBER]                 ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║  Found [N] tasks in issue checklist                           ║
   ║  Will skip task generation, use these tasks directly          ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

### Step 2: Context Assessment

Evaluate the prompt for:

| Factor | Weight | Indicators |
|--------|--------|------------|
| **Specificity** | 30% | File names, function names, error messages |
| **Scope** | 25% | Single file vs multi-file, frontend vs backend |
| **Technical depth** | 25% | Stack trace, API endpoints, component names |
| **Reproducibility** | 20% | Steps to reproduce, expected vs actual behavior |

**Score Calculation**:
- **70-100%**: Sufficient context → Proceed to Step 3a
- **0-69%**: Insufficient context → Proceed to Step 3b

---

### Step 3a: SUFFICIENT CONTEXT PATH

Deploy **parallel exploration agents** to understand the issue:

```
Deploy in SINGLE message (parallel execution):

Task 1: subagent_type="Explore"
  prompt: "Find files related to: $ARGUMENTS. Identify:
    - Primary files involved
    - Related components/services
    - Recent changes in git history"
  description: "Explore codebase for context"

Task 2: subagent_type="Explore"
  prompt: "Search for error patterns, tests, and documentation related to: $ARGUMENTS"
  description: "Find tests and docs"

Task 3 (if backend-related): subagent_type="Explore"
  prompt: "Find API endpoints, database models, and service files related to: $ARGUMENTS"
  description: "Explore backend architecture"
```

**Wait for all agents to complete**, then proceed to Step 4.

---

### Step 3b: INSUFFICIENT CONTEXT PATH

1. **Quick codebase scan**:
   ```
   Deploy Task: subagent_type="Explore"
     prompt: "Perform a brief codebase overview to understand the project structure
       and identify areas that might relate to: $ARGUMENTS
       Also review CLAUDE.md for project-specific patterns."
     description: "Quick codebase scan"
   ```

2. **Ask clarifying questions** using AskUserQuestion:
   - What specific behavior are you seeing?
   - What is the expected behavior?
   - Which area of the app is affected (Web UI, Backend API, Desktop)?
   - Can you provide any error messages or screenshots?

3. **After user provides clarity**, proceed to Step 3a with updated context.

---

### Step 4: Synthesize Findings & Ask Questions

Present findings in a **simple paragraph + bullet point format** (NO CODE):

```markdown
## Understanding

Based on my exploration, here's what I found:

**The Issue:**
[1-2 sentence summary of the problem]

**Affected Areas:**
- [Area 1]: [Brief description]
- [Area 2]: [Brief description]

**Proposed Approach:**
1. [Step 1 - What we'll do, not how]
2. [Step 2]
3. [Step 3]

**Key Files:**
- `path/to/file1.ts` - [Why it's relevant]
- `path/to/file2.py` - [Why it's relevant]
```

**MANDATORY QUESTIONS** (use AskUserQuestion with multiple questions):

{{#if testing.e2e.framework}}
**Question 1: Testing Approach** (only if E2E_ENABLED)
```
header: "Testing"
question: "Do you want to use 'Ralph Wiggum Loop' style testing? (Continuous test-fix cycle until all tests pass)"
options:
  - label: "Yes - Ralph Loop (Recommended)"
    description: "Automatically retry fixes until tests pass, max 10 iterations"
  - label: "No - Manual Testing"
    description: "I'll run tests manually after each change"
  - label: "Minimal Testing"
    description: "Only test at the end of all tasks"
```
{{else}}
**Question 1: Testing Approach** (testing not configured - simplified options)
```
header: "Testing"
question: "Testing is not configured. How would you like to verify your changes?"
options:
  - label: "Manual verification only"
    description: "I'll test the changes manually - no automated tests"
  - label: "Setup testing first"
    description: "I want to configure automated testing before proceeding (run: ccasp test-setup)"
```

**Note**: If user selects "Setup testing first", provide instructions to run `ccasp test-setup` and restart the task list creation.
{{/if}}

{{#if testing.e2e.framework}}
**Question 2: {{testing.e2e.framework}} Environment** (only if E2E_ENABLED)
```
header: "{{testing.e2e.framework}}"
question: "Where should {{testing.e2e.framework}} E2E tests run?"
options:
  - label: "{{devEnvironment.tunnel.service}} ({{urls.tunnel.frontend}}) (Recommended)"
    description: "Test against local backend via {{devEnvironment.tunnel.service}} tunnel"
  - label: "{{urls.production.frontend}} (Production)"
    description: "Test against production - requires deployment"
  - label: "No {{testing.e2e.framework}}"
    description: "Skip E2E tests, use curl/unit tests only"
```
{{else}}
**Question 2: SKIP** (E2E not configured - skip this question)
{{/if}}

---

### Step 4b: MANDATORY Workflow Questions (ALWAYS ASK)

**CRITICAL**: After presenting findings, you MUST ask these 4 questions using AskUserQuestion.
Users can answer with combinations like: `1, 2` or `1 & 3` or `1,2,4` or `all` or `none`.

**Parse combination answers**: If user responds with numbers (e.g., "1, 2" or "1 & 3 & 4"), enable ALL selected options.

```
header: "Workflow Options"
question: "Select workflow options (combine with commas: 1,2 or 1 & 3):\n\n1. Create GitHub Issue on remote repo\n2. Add issue to Project Board\n3. Create new branch before implementing\n4. Create new git worktree\n\nWhich options? (e.g., '1,2' or 'all' or 'none')"
options:
  - label: "1 - GitHub Issue only"
    description: "Create tracked issue with codebase analysis"
  - label: "1, 2 - Issue + Project Board (Recommended)"
    description: "Create issue AND add to project board"
  - label: "1, 2, 3 - Issue + Board + Branch"
    description: "Full workflow: issue, board, and new branch"
  - label: "All (1, 2, 3, 4)"
    description: "Everything: issue, board, branch, and worktree"
  - label: "None - Local only"
    description: "Skip all GitHub integration, just local TodoWrite"
```

**Parse user's selection** and store flags:
- `CREATE_GITHUB_ISSUE`: true if "1" selected
- `ADD_TO_PROJECT_BOARD`: true if "2" selected
- `CREATE_NEW_BRANCH`: true if "3" selected
- `CREATE_WORKTREE`: true if "4" selected

**Combination Parsing Rules**:
| User Input | Parsed Options |
|------------|----------------|
| `1` | Issue only |
| `1, 2` or `1,2` or `1 & 2` | Issue + Board |
| `1,2,3` or `1, 2, 3` | Issue + Board + Branch |
| `1 & 2 & 4` | Issue + Board + Worktree |
| `all` or `1,2,3,4` | All options |
| `none` or `0` | No GitHub integration |

---

**Question 4: Confirm Plan**
```
header: "Plan"
question: "Does this approach look correct, or should I adjust?"
options:
  - label: "Looks good - proceed"
    description: "Create the task list and start working"
  - label: "Need adjustments"
    description: "I'll describe what to change"
```

**Question 5: Task Execution Strategy**
```
header: "Execution"
question: "How would you like to execute tasks?"
options:
  - label: "Sequential - One at a time (Recommended)"
    description: "Complete each task fully, commit, then move to next. More control, easier rollback"
  - label: "Grouped - Related tasks together"
    description: "Group related tasks, commit after each group. Balanced approach"
  - label: "All at once"
    description: "Execute all tasks, single final commit. Fastest but harder to debug"
```

**Store the user's execution preference** for use in Step 8.

---

### Step 5: Create Task List

**If USE_EXISTING_TASKS is true (from `--use-existing-tasks` flag):**

Skip task generation. Use the tasks parsed from the GitHub issue in Step 1.

```
╔═══════════════════════════════════════════════════════════════╗
║  📋 Using Existing Tasks from Issue #[NUMBER]                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Skipping task generation - using issue's checklist           ║
║  Tasks will be wrapped with testing/deployment context        ║
╚═══════════════════════════════════════════════════════════════╝
```

**Convert EXISTING_TASKS to TodoWrite format**, wrapping with context tasks (Task 0 for rules, final task for commit).

---

**If USE_EXISTING_TASKS is false (default):**

Use **TaskCreate** to build the task list with Claude's native system.

**Task List Structure** (adapts based on TESTING_CONFIGURED status):

{{#if testing.e2e.framework}}
```
Task 0: "Review Testing Rules" (DO NOT MARK COMPLETE)
  description: "Read .claude/task-lists/TESTING_RULES.md before starting. These rules apply to all tasks."
  activeForm: "Maintaining context"

Task 1: "Login via {{testing.e2e.framework}}" (ALWAYS FIRST for E2E tests)
  description: |
    Start {{testing.e2e.framework}} from the LOGIN PAGE. Fresh browser has no session.

    **Use these EXACT selectors (from tech-stack.json):**

    1. Navigate to: {env}/login
    2. Fill username: `{{testing.selectors.username}}`
    3. Fill password: `{{testing.selectors.password}}`
    4. Click: `{{testing.selectors.loginButton}}`
    5. Wait for: `{{testing.selectors.loginSuccess}}`

    This task is REQUIRED before any other {{testing.e2e.framework}} interaction.
  activeForm: "Logging into application"

Task 2: "[First actual task]"
  description: "[What needs to be done]"
  activeForm: "[Present participle form]"

Task 3: "[Second task]"
  ...

Task N-1: "Run final verification tests"
  description: "Execute {{testing.e2e.framework}} E2E tests on {selected_environment} to verify all changes work"
  activeForm: "Running verification tests"

Task N: "Commit all changes"
  description: "Create a git commit with all changes from this session"
  activeForm: "Committing changes"
```
{{else}}
```
Task 0: "Context Reference" (DO NOT MARK COMPLETE)
  description: "Testing not configured. To enable: run 'ccasp test-setup'. Tasks below will NOT include automated testing."
  activeForm: "Maintaining context"

Task 1: "[First actual task]"
  description: "[What needs to be done]"
  activeForm: "[Present participle form]"

Task 2: "[Second task]"
  ...

Task N-1: "Manual verification"
  description: "Manually test the changes in your browser/application to verify everything works"
  activeForm: "Manually verifying changes"

Task N: "Commit all changes"
  description: "Create a git commit with all changes from this session"
  activeForm: "Committing changes"
```

**Note**: Since E2E testing is not configured, the task list excludes:
- Login via Playwright/Puppeteer task
- Automated E2E verification tests

The user should manually verify changes work before committing.
{{/if}}

**IMPORTANT**:
- Task 0 with persistent instructions should NEVER be marked complete
- Each task should be atomic and independently verifiable
{{#if testing.e2e.framework}}
- Include curl testing tasks BEFORE {{testing.e2e.framework}} tasks when debugging
{{/if}}

---

### Step 6: Execute Workflow Options (Based on Step 4b Selection)

Execute the workflow options selected by the user in Step 4b. Process in this order:

---

#### Step 6a: Create New Branch (if CREATE_NEW_BRANCH = true)

**Before any GitHub operations, create the working branch:**

```bash
# Generate branch name from task description
# Format: feature/[short-description] or fix/[short-description]

gh api repos/{owner}/{repo} --jq '.default_branch' # Get default branch
git checkout -b [branch-name]
git push -u origin [branch-name]
```

**Display confirmation:**
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ New Branch Created                                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Branch: [branch-name]                                        ║
║  Based on: [default-branch]                                   ║
║  Pushed to: origin/[branch-name]                              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

#### Step 6b: Create Git Worktree (if CREATE_WORKTREE = true)

**Create isolated worktree for parallel development:**

```bash
# Create worktree directory
git worktree add ../[project-name]-[branch-name] [branch-name]

# Display path to worktree
```

**Display confirmation:**
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Git Worktree Created                                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Location: ../[project-name]-[branch-name]                    ║
║  Branch: [branch-name]                                        ║
║                                                               ║
║  To work in worktree:                                         ║
║    cd ../[project-name]-[branch-name]                         ║
║                                                               ║
║  To remove when done:                                         ║
║    git worktree remove ../[project-name]-[branch-name]        ║
╚═══════════════════════════════════════════════════════════════╝
```

**Ask user:**
```
header: "Worktree"
question: "Worktree created. Work in worktree or current directory?"
options:
  - label: "Continue in current directory"
    description: "Stay here, worktree is for manual use"
  - label: "Switch to worktree"
    description: "I'll restart Claude Code in the worktree directory"
```

---

#### Step 6c: Create GitHub Issue (if CREATE_GITHUB_ISSUE = true)

**Present issue preview:**

```markdown
## GitHub Issue Preview

**Title:** [Generated from user prompt]
**Priority:** P2-Medium (or determined from analysis)
**Labels:** [Determined from exploration - frontend, backend, feature, bug, etc.]
**Stack:** [Frontend only | Backend only | Both]
**Branch:** [branch-name if created, else "will create on first commit"]

**Description Preview:**
> [First 200 characters of the analysis from Step 3...]

**Task Checklist:**
- [ ] Task 1: [First task]
- [ ] Task 2: [Second task]
- [ ] ...
```

**Create the issue:**
```bash
gh issue create \
  --title "[Task description]" \
  --body "$(cat <<'EOF'
## Description

[User's original prompt]

## Codebase Analysis

[Include findings from Step 3 exploration agents]

## Task Checklist

[Mirror the TodoWrite tasks as checkboxes]
- [ ] Task 1: ...
- [ ] Task 2: ...

---
Generated by `/create-task-list`
EOF
)" \
  --label "[labels]"
```

**Store issue number:**
```json
// Write to .claude/task-lists/session-{timestamp}.json
{
  "github_issue": {
    "number": [ISSUE_NUM],
    "url": "[ISSUE_URL]",
    "created_at": "[ISO timestamp]"
  },
  "branch": "[branch-name]",
  "worktree": "[worktree-path or null]"
}
```

---

#### Step 6d: Add to Project Board (if ADD_TO_PROJECT_BOARD = true)

**Add the created issue to the configured project board:**

```bash
# Get project board number from tech-stack.json or .gtaskrc
# {{versionControl.projectBoard.number}}

gh project item-add [PROJECT_NUMBER] \
  --owner [OWNER] \
  --url [ISSUE_URL]
```

**Display confirmation:**
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Added to Project Board                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Issue: #[ISSUE_NUMBER]                                       ║
║  Board: [PROJECT_NAME] (#[PROJECT_NUMBER])                    ║
║  Status: [Default column - usually "To Do" or "Backlog"]      ║
╚═══════════════════════════════════════════════════════════════╝
```

---

#### Step 6e: Summary of Workflow Actions

**Display summary of all completed workflow actions:**

```
╔═══════════════════════════════════════════════════════════════╗
║  📋 Workflow Setup Complete                                   ║
╠═══════════════════════════════════════════════════════════════╣
{{#if CREATE_NEW_BRANCH}}
║  ✅ Branch: [branch-name]                                     ║
{{/if}}
{{#if CREATE_WORKTREE}}
║  ✅ Worktree: ../[worktree-path]                              ║
{{/if}}
{{#if CREATE_GITHUB_ISSUE}}
║  ✅ Issue: #[ISSUE_NUMBER] - [title]                          ║
║     URL: [ISSUE_URL]                                          ║
{{/if}}
{{#if ADD_TO_PROJECT_BOARD}}
║  ✅ Project Board: Added to [PROJECT_NAME]                    ║
{{/if}}
{{#unless CREATE_GITHUB_ISSUE}}
{{#unless CREATE_NEW_BRANCH}}
{{#unless CREATE_WORKTREE}}
║  ℹ️  Local task list only (no GitHub integration)             ║
{{/unless}}
{{/unless}}
{{/unless}}
╚═══════════════════════════════════════════════════════════════╝
```

**Ask user how to proceed:**
```
header: "Workflow Ready"
question: "Workflow setup complete. What would you like to do?"
options:
  - label: "Continue to Task Execution"
    description: "Proceed with creating and executing the task list"
  - label: "View Issue in Browser"
    description: "Open the issue, then come back to continue"
  - label: "Exit for Now"
    description: "Save session state, I'll continue later"
```

**Handle user response:**
- **"Continue to Task Execution"**: Proceed to Step 7
- **"View Issue in Browser"**: Provide clickable link, wait for user to return, then proceed
- **"Exit for Now"**: Save session state to `.claude/task-lists/session-{timestamp}.json` and exit gracefully

---

### Step 7: Configure Ralph Loop (If Selected)

If user selected Ralph Loop testing, write configuration:

```javascript
// Write to .claude/ralph-loop.local.md
const config = {
  iteration: 1,
  max_iterations: 10,
  completion_promise: "all tasks complete and tests passing",
  started_at: new Date().toISOString(),
  task_list_id: "[current session]"
};
```

---

### Step 8: Final Review & Begin Execution

#### Step 8a: Display Task Summary

1. **Display comprehensive task summary**:
   ```
   ## Task List Created

   | # | Task | Status |
   |---|------|--------|
   | 0 | Persistent Context | (always active) |
   | 1 | [Task 1 subject] | pending |
   | 2 | [Task 2 subject] | pending |
   ...

   **Configuration:**
{{#if testing.e2e.framework}}
   - Testing Mode: [Ralph Loop / Manual / Minimal]
   - E2E Framework: {{testing.e2e.framework}}
   - Environment: [{{devEnvironment.tunnel.service}} / {{urls.production.frontend}}]
{{else}}
   - Testing: Not configured (manual verification only)
   - To enable: run `ccasp test-setup`
{{/if}}
   - Execution Strategy: [Sequential / Grouped / All at once]

   **Workflow Setup:**
   - GitHub Issue: [#123 | Not created]
   - Project Board: [Added to Board #X | Not added]
   - Branch: [feature/task-name | Using current branch]
   - Worktree: [../project-branch | Not created]
   ```

#### Step 8b: Final Confirmation Before Execution

**Ask user to confirm before starting using AskUserQuestion:**
```
header: "Ready to Begin?"
question: "Review the task list above. How would you like to proceed?"
options:
  - label: "Start Task 1 Now"
    description: "Begin executing the first task immediately"
  - label: "Start from Different Task"
    description: "Skip to a specific task number"
  - label: "Modify Task List"
    description: "Add, remove, or edit tasks before starting"
  - label: "Save & Exit"
    description: "Save the task list for later, exit now"
```

**Handle user response:**
- **"Start Task 1 Now"**: Proceed to Step 8c
- **"Start from Different Task"**: Ask which task number, validate it exists, start there
- **"Modify Task List"**: Allow user to describe changes, update TaskList, show summary again
- **"Save & Exit"**: Save full session state to `.claude/task-lists/session-{timestamp}.json`, display resume instructions, exit

#### Step 8c: Begin Execution

2. **Compact context** (use /compact if token usage is high)

3. **Execute based on user's chosen strategy** (from Step 4, Question 5):

   **Sequential Execution (One at a time):**
   - Use `TaskUpdate` to set Task 1 to `in_progress`
   - Execute the task fully
   - Use `TaskUpdate` to set Task 1 to `completed`
   - **Commit changes for this task**
   - Ask: "Task 1 complete. Ready for Task 2?" (brief confirmation)
   - Repeat for each task

   **Grouped Execution:**
   - Identify related task groups (e.g., all frontend tasks, all backend tasks)
   - Execute all tasks in a group
   - Commit after completing each group
   - Brief status update between groups

   **All at Once Execution:**
   - Execute all tasks without intermediate commits
   - Single comprehensive commit at the end
   - Higher risk but faster for simple changes

---

### Step 9: Post-Execution Summary

After all tasks are complete, display a summary:

{{#if testing.e2e.framework}}
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ All Tasks Completed                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tasks completed: [N]                                         ║
║  E2E tests: [Passed/Failed]                                   ║
║  Commits made: [M]                                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
{{else}}
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ All Tasks Completed                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tasks completed: [N]                                         ║
║  Commits made: [M]                                            ║
║                                                               ║
║  ℹ️  Testing was skipped (not configured)                      ║
║                                                               ║
║  To enable automated E2E testing for future tasks:            ║
║                                                               ║
║    ccasp test-setup                                           ║
║                                                               ║
║  This will configure:                                         ║
║  • Playwright/Cypress/Puppeteer integration                   ║
║  • Login selectors for authenticated testing                  ║
║  • Test environment URLs                                      ║
║  • Ralph Loop continuous testing                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
{{/if}}

---

## ERROR HANDLING

| Situation | Action |
|-----------|--------|
| Exploration agent fails | Retry with broader search terms |
| User provides unclear answers | Ask follow-up questions with examples |
| Task creation fails | Fall back to manual task tracking |
| Ralph loop exceeds max iterations | Stop loop, summarize progress, ask user how to proceed |
| {{testing.e2e.framework}} tests fail on {{devEnvironment.tunnel.service}} | Check tunnel status, verify backend is running |
| {{testing.e2e.framework}} tests fail on production | Verify deployment completed, check SHA match |

---

## RELATED COMMANDS

- `/ralph` - Persistent loop execution
- `/test-{{testing.e2e.framework}}-{{devEnvironment.tunnel.service}}` - E2E testing with {{devEnvironment.tunnel.service}}
- `/github-task-start` - Start GitHub Project Board tasks
- `/create-phase-dev` - Complex multi-phase project planning
