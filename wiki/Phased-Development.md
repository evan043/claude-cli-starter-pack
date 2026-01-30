# Phased Development

Phased Development is CCASP's methodology for achieving 95%+ success rate on complex tasks by breaking them into validated phases.

## Why Phased Development?

Complex tasks often fail because:
- Scope creep mid-implementation
- Missing dependencies discovered late
- No clear success criteria
- Lost context in long sessions

Phased Development solves these by:
- **Upfront planning** - Identify all phases before starting
- **Clear criteria** - Define what "done" means for each phase
- **State persistence** - PROGRESS.json survives session restarts
- **Incremental validation** - Verify each phase before moving on

## Scales

Choose a scale based on task complexity:

| Scale | Phases | Duration | Use Case |
|-------|--------|----------|----------|
| **S** | 2 | 1-2 hours | Bug fixes, small features |
| **M** | 3-4 | 4-8 hours | Medium features, refactors |
| **L** | 5-7 | 1-3 days | Large features, integrations |
| **XL** | 8+ | 1+ weeks | Major systems, rewrites |

## Creating a Plan

### Via Slash Command

```
/phase-dev-plan
```

Interactive wizard:
1. Enter project name
2. Describe the task
3. Select scale
4. Review generated phases
5. Confirm and create

### Via Terminal

```bash
ccasp create-phase-dev
ccasp create-phase-dev --scale M
ccasp create-phase-dev --autonomous  # Minimal prompts
```

## Generated Structure

```
.claude/phase-dev/feature-name/
├── PROGRESS.json              # State tracking
├── EXECUTIVE_SUMMARY.md       # Project overview
├── phases/
│   ├── phase-1-setup.md
│   ├── phase-2-implementation.md
│   ├── phase-3-testing.md
│   └── phase-4-deployment.md
├── DEPLOYMENT_RUNBOOK.md      # Deploy steps
├── ROLLBACK.md                # Recovery plan
├── TEST_PLAN.md               # Testing strategy
└── command.md                 # /phase-dev-feature-name
```

## PROGRESS.json

The heart of phased development - tracks all state:

```json
{
  "project": "user-authentication",
  "description": "Add JWT-based user authentication",
  "scale": "M",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "currentPhase": 2,
  "status": "in_progress",
  "phases": [
    {
      "number": 1,
      "name": "Setup",
      "description": "Configure auth dependencies and database schema",
      "status": "completed",
      "startedAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T11:30:00Z",
      "tasks": [
        {
          "id": "1.1",
          "name": "Add JWT library",
          "done": true,
          "files": ["package.json"]
        },
        {
          "id": "1.2",
          "name": "Create User model",
          "done": true,
          "files": ["backend/models/user.py"]
        },
        {
          "id": "1.3",
          "name": "Run migration",
          "done": true,
          "files": ["backend/migrations/001_users.py"]
        }
      ],
      "successCriteria": [
        { "criterion": "JWT library installed", "met": true },
        { "criterion": "User table exists", "met": true },
        { "criterion": "Migration runs without error", "met": true }
      ]
    },
    {
      "number": 2,
      "name": "Implementation",
      "description": "Build authentication endpoints and middleware",
      "status": "in_progress",
      "startedAt": "2024-01-15T11:30:00Z",
      "tasks": [
        {
          "id": "2.1",
          "name": "Create auth router",
          "done": true,
          "files": ["backend/routers/auth.py"]
        },
        {
          "id": "2.2",
          "name": "Add JWT middleware",
          "done": false,
          "files": []
        },
        {
          "id": "2.3",
          "name": "Implement login endpoint",
          "done": false,
          "files": []
        }
      ],
      "successCriteria": [
        { "criterion": "Login returns valid JWT", "met": false },
        { "criterion": "Protected routes require token", "met": false }
      ]
    }
  ],
  "globalSuccessCriteria": [
    { "criterion": "All tests pass", "met": false },
    { "criterion": "No security vulnerabilities", "met": false },
    { "criterion": "Documentation complete", "met": false }
  ],
  "blockers": [],
  "notes": [
    {
      "timestamp": "2024-01-15T11:00:00Z",
      "note": "Decided to use python-jose for JWT handling"
    }
  ]
}
```

## Tracking Progress

### Via Slash Command

```
/phase-track user-authentication
```

Shows:
- Current phase and status
- Completed vs remaining tasks
- Success criteria status
- Time spent per phase

### Automatic Updates

When working on a phased project, Claude updates PROGRESS.json as tasks complete.

### Manual Updates

```
/phase-track user-authentication --complete 2.2
/phase-track user-authentication --block "Need API docs"
/phase-track user-authentication --note "Changed approach"
```

## Phase Structure

Each phase follows a consistent structure:

```markdown
<!-- phases/phase-2-implementation.md -->
# Phase 2: Implementation

## Objective
Build the core authentication logic.

## Prerequisites
- Phase 1 completed
- JWT library installed
- User model created

## Tasks

### 2.1 Create Auth Router
- [ ] Create `backend/routers/auth.py`
- [ ] Define router with `/auth` prefix
- [ ] Add to main app

### 2.2 JWT Middleware
- [ ] Create `backend/middleware/auth.py`
- [ ] Implement token validation
- [ ] Add to FastAPI middleware

### 2.3 Login Endpoint
- [ ] POST `/auth/login`
- [ ] Validate credentials
- [ ] Return JWT token

## Success Criteria
- [ ] Login endpoint returns valid JWT
- [ ] Invalid credentials return 401
- [ ] Token contains user ID claim
- [ ] Token expires after configured time

## Validation Steps
1. Test login with valid credentials
2. Test login with invalid credentials
3. Decode JWT and verify claims
4. Wait for expiry and verify rejection

## Estimated Duration
2-3 hours

## Dependencies
- bcrypt for password hashing
- python-jose for JWT

## Rollback Plan
If this phase fails:
1. Remove auth router from main.py
2. Delete auth.py and middleware files
3. Return to Phase 1 state
```

## Best Practices

### 1. Define Clear Success Criteria

```markdown
# ✅ Good - Testable
- [ ] Login with valid credentials returns 200
- [ ] Response contains `access_token` field
- [ ] Token is valid JWT

# ❌ Bad - Vague
- [ ] Login works
- [ ] Authentication is implemented
```

### 2. Keep Phases Independent

Each phase should be completable in one session:

```markdown
# ✅ Good - Focused
Phase 1: Database schema
Phase 2: API endpoints
Phase 3: Frontend forms
Phase 4: Integration tests

# ❌ Bad - Overlapping
Phase 1: Start building everything
Phase 2: Continue building
Phase 3: Finish and test
```

### 3. Include Rollback Plans

Every phase should be reversible:

```markdown
## Rollback Plan
1. `git revert` to pre-phase commit
2. Drop new database tables
3. Remove new config entries
```

### 4. Track Dependencies

```markdown
## Dependencies
- Phase 1 must be complete
- External API key required
- Staging environment available
```

### 5. Add Notes as You Go

```
/phase-track project --note "Decided to use Redis for session storage"
```

## Automated Execution

### Phase Executor Agent

CCASP can create an agent that executes phases autonomously:

```markdown
---
name: phase-executor-user-auth
type: Phase-Dev
project: user-authentication
---

# Phase Executor: User Authentication

## Behavior
1. Load PROGRESS.json
2. Find next incomplete task
3. Execute task
4. Update PROGRESS.json
5. Validate success criteria
6. Continue or report blocker

## Constraints
- Do not skip validation
- Report all blockers
- Commit after each task
```

### Running the Executor

```
/phase-dev-user-authentication
```

Or via Task tool:
```
Use Task tool with subagent_type="phase-executor-user-auth"
```

## Integration with GitHub

Phased Development integrates with GitHub Integration:

### Auto-Create Issues

Each phase can create a GitHub issue:

```json
{
  "phases": [{
    "number": 1,
    "githubIssue": 123
  }]
}
```

### Progress Updates

Phase completion updates GitHub issue comments.

### PR per Phase

Optionally create PRs for each phase:

```bash
/phase-track project --create-pr
```

## Troubleshooting

### Progress Not Saving

Ensure PROGRESS.json is writable:
```bash
ls -la .claude/phase-dev/project/PROGRESS.json
```

### Phase Stuck

Check for blockers:
```
/phase-track project --show-blockers
```

Add blocker:
```
/phase-track project --block "Need design review"
```

### Lost Context

PROGRESS.json persists across sessions. Restart Claude and run:
```
/phase-track project
```

Claude will reload the state.

### Incorrect Phase Order

Edit PROGRESS.json directly:
```json
{
  "currentPhase": 2,
  "phases": [
    { "status": "completed" },
    { "status": "in_progress" }
  ]
}
```

## Example: Complete Workflow

```bash
# 1. Create the plan
/phase-dev-plan

# 2. Review generated phases
cat .claude/phase-dev/my-feature/EXECUTIVE_SUMMARY.md

# 3. Start execution
/phase-dev-my-feature

# 4. Check progress anytime
/phase-track my-feature

# 5. Handle blockers
/phase-track my-feature --block "Need API access"

# 6. Resume after resolving
/phase-track my-feature --unblock
/phase-dev-my-feature

# 7. Complete and verify
/phase-track my-feature --verify-all
```

## See Also

- [Agents](Agents) - Phase executor agents
- [Features](Features) - Enable phased development
- [GitHub Integration](Features#github-integration) - GitHub sync
