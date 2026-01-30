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

### Step 0: Load Persistent Rules

**FIRST ACTION**: Read `.claude/task-lists/TESTING_RULES.md` to load testing and deployment rules.

These rules govern:
- Which URLs to use ({{devEnvironment.tunnel.service}} vs {{urls.production.frontend}})
- Login credentials
- Deployment workflow (delete {{frontend.distDir}}, rebuild, verify SHA)
- Task completion workflow (curl → {{testing.e2e.framework}} → commit)

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

**Question 1: Testing Approach**
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

**Question 2: {{testing.e2e.framework}} Environment**
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

---

### Step 5: Create Task List

Use **TaskCreate** to build the task list with Claude's native system.

**Task List Structure**:

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

Task 2: "[Second task]"
  ...

Task N-1: "Run final verification tests"
  description: "Execute {{testing.e2e.framework}} E2E tests on {selected_environment} to verify all changes work"
  activeForm: "Running verification tests"

Task N: "Commit all changes"
  description: "Create a git commit with all changes from this session"
  activeForm: "Committing changes"
```

**IMPORTANT**:
- Task 0 with persistent instructions should NEVER be marked complete
- Each task should be atomic and independently verifiable
- Include curl testing tasks BEFORE {{testing.e2e.framework}} tasks when debugging

---

### Step 6: Create GitHub Issue (If Selected)

If user selected GitHub integration:

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

### Step 8: Compact Session & Begin

1. **Display task summary**:
   ```
   ## Task List Created

   | # | Task | Status |
   |---|------|--------|
   | 0 | Persistent Context | (always active) |
   | 1 | [Task 1 subject] | pending |
   | 2 | [Task 2 subject] | pending |
   ...

   **Testing Mode:** [Ralph Loop / Manual / Minimal]
   **Environment:** [{{devEnvironment.tunnel.service}} / {{urls.production.frontend}}]
   **GitHub Issue:** [#123 (if created) | Not tracked]

   Ready to begin. Starting with Task 1...
   ```

2. **Compact context** (use /compact if token usage is high)

3. **Begin Task 1**:
   - Use `TaskUpdate` to set Task 1 to `in_progress`
   - Execute the task
   - Use `TaskUpdate` to set Task 1 to `completed`
   - Commit changes
   - Move to Task 2

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
