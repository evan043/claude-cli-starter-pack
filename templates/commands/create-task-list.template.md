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
/create-task-list
```

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

### Step 1: Capture User Prompt

```
PROMPT: $ARGUMENTS

If no arguments provided:
  → Use AskUserQuestion: "What would you like to accomplish today?"
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

**Question 3: GitHub Integration**
```
header: "GitHub"
question: "Would you like to create a tracked GitHub issue for this task list?"
options:
  - label: "Yes - Create GitHub issue (Recommended)"
    description: "Creates issue with codebase analysis, adds to project board, auto-updates progress"
  - label: "No - Local task list only"
    description: "Just use TodoWrite without GitHub tracking"
```

**Question 4: Confirm Plan** (only if plan needs adjustment)
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

### Step 6: Create GitHub Issue (If Selected)

If user selected GitHub integration:

#### Step 6a: Preview Issue Before Creation

**Present issue preview to user** before creating:

```markdown
## GitHub Issue Preview

**Title:** [Generated from user prompt]
**Priority:** P2-Medium (or determined from analysis)
**Labels:** [Determined from exploration - frontend, backend, feature, bug, etc.]
**Stack:** [Frontend only | Backend only | Both]

**Description Preview:**
> [First 200 characters of the analysis from Step 3...]

**Task Checklist:**
- [ ] Task 1: [First task]
- [ ] Task 2: [Second task]
- [ ] ...
```

**Ask for confirmation using AskUserQuestion:**
```
header: "Create GitHub Issue?"
question: "Ready to create this GitHub issue? Review the preview above."
options:
  - label: "Yes - Create Issue"
    description: "Create the issue and enable auto-progress tracking"
  - label: "Modify Details"
    description: "I want to change the title, priority, or labels"
  - label: "Skip GitHub"
    description: "Don't create issue, use local TodoWrite only"
```

**Handle user response:**
- **"Yes - Create Issue"**: Proceed to create the issue (Step 6b)
- **"Modify Details"**: Ask which fields to change, then show preview again
- **"Skip GitHub"**: Skip to Step 7, note that GitHub tracking is disabled

---

#### Step 6b: Create the Issue

1. **Create comprehensive issue** using `/github-create-task`:
   ```bash
   /github-create-task --batch-mode

   Title: [Task description from user prompt]
   Priority: P2-Medium
   Labels: [Determined from exploration - frontend, backend, feature, bug, etc.]
   QA: [Required if P0/P1, else Not Required]
   Stack: [Frontend only|Backend only|Both]

   ## Description

   [User's original prompt]

   ## Codebase Analysis

   [Include findings from Step 3 exploration agents]

   ## Task Checklist

   [Mirror the TodoWrite tasks as checkboxes]
   - [ ] Task 1: ...
   - [ ] Task 2: ...
   ```

2. **Store issue number** for progress tracking:
   ```json
   // Write to .claude/task-lists/session-{timestamp}.json
   {
     "github_issue": {
       "number": [ISSUE_NUM],
       "url": "[ISSUE_URL]",
       "created_at": "[ISO timestamp]"
     }
   }
   ```

3. **Install progress hook** (auto-updates GitHub issue when tasks complete):
   - The hook watches for TodoWrite calls
   - When a task is marked `completed`, it updates the GitHub issue:
     - Checks off the corresponding checkbox
     - Adds a progress comment if significant milestone
   - See `.claude/hooks/tools/github-progress-hook.js`

#### Step 6c: Post-Creation Confirmation

After the issue is created, **display confirmation and ask how to proceed**:

```markdown
╔═══════════════════════════════════════════════════════════════╗
║  ✅ GitHub Issue Created Successfully                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Issue: #[ISSUE_NUMBER]                                       ║
║  URL: https://github.com/[owner]/[repo]/issues/[number]       ║
║                                                               ║
║  Auto-progress tracking enabled:                              ║
║  • Tasks will auto-update issue as they complete              ║
║  • Checkboxes will be checked off automatically               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Ask user how to proceed using AskUserQuestion:**
```
header: "Issue Created"
question: "GitHub issue #[NUMBER] created. What would you like to do?"
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
   - GitHub Issue: [#123 (if created) | Not tracked]
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
