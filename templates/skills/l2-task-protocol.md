# L2 Task Protocol Skill

This skill defines the communication protocol between the L1 Orchestrator and L2 Specialist agents.

## Overview

The L2 Task Protocol ensures consistent communication between agents in the orchestration hierarchy. It defines:

1. How tasks are assigned from L1 to L2
2. How L2 agents report progress and completion
3. How to handle errors and blockers
4. How to request and spawn L3 workers

## Task Assignment Format

When the orchestrator assigns a task to an L2 agent, it provides:

```json
{
  "assignment": {
    "taskId": "P1.1",
    "title": "Create user authentication endpoint",
    "details": "Implement POST /api/auth/login with JWT",
    "targetFile": "src/routes/auth.ts",
    "phase": {
      "id": "P1",
      "name": "Authentication System"
    },
    "plan": {
      "id": "user-auth-2024",
      "name": "User Authentication Implementation"
    },
    "constraints": {
      "readOnly": false,
      "maxDuration": 300000,
      "requiredTools": ["Read", "Write", "Edit"]
    },
    "context": {
      "relatedFiles": ["src/middleware/auth.ts", "src/types/user.ts"],
      "dependencies": ["bcrypt", "jsonwebtoken"],
      "existingPatterns": "Use async/await, follow existing error handling"
    }
  }
}
```

## Completion Report Formats

### Successful Completion

```
TASK_COMPLETE: P1.1
STATUS: completed
ARTIFACTS: [src/routes/auth.ts, src/middleware/jwt.ts]
SUMMARY: Implemented login endpoint with JWT token generation, added middleware for token validation
DURATION: 45000
TESTS_PASSED: true
```

### Task Blocked

```
TASK_BLOCKED: P1.1
BLOCKER: Missing database migration for users table - required columns not present
SUGGESTED_ACTION: Run migration to add password_hash and last_login columns
BLOCKED_SINCE: 2024-01-15T10:30:00Z
```

### Task Failed

```
TASK_FAILED: P1.1
ERROR: TypeScript compilation failed - cannot find module '@types/jsonwebtoken'
ATTEMPTED: Installed jsonwebtoken, tried multiple import syntaxes
STACK_TRACE: [optional stack trace]
RETRY_SUGGESTED: true
```

## Progress Updates

For long-running tasks, send progress updates:

```
TASK_PROGRESS: P1.1
PROGRESS: 60
CURRENT_STEP: Writing unit tests
ESTIMATED_REMAINING: 30000
```

## L3 Worker Requests

When an L2 agent needs to spawn L3 workers:

### Request Format

```
L3_REQUEST: search-auth-patterns
TYPE: search
DESCRIPTION: Find all existing authentication patterns in codebase
SCOPE: src/**/*.ts
EXPECTED_OUTPUT: List of files and patterns found
PARALLEL: true
```

### L3 Result Aggregation

```
L3_AGGREGATION: P1.1
WORKERS: [search-auth-1, search-auth-2, analyze-middleware]
COMBINED_RESULT:
- Found 3 existing auth patterns in src/middleware/
- JWT validation already exists in src/utils/jwt.ts
- Password hashing utility in src/utils/crypto.ts
SYNTHESIS: Can reuse existing JWT utility, need to create login-specific middleware
```

## Context Requests

L2 agents can request additional context:

```
CONTEXT_REQUEST: P1.1
NEEDED: Database schema for users table
REASON: Need to understand available columns for login query
URGENCY: blocking
```

## Error Recovery Protocol

When encountering errors:

1. **Transient Errors** (network, timeout)
   - Retry automatically up to 3 times
   - Exponential backoff: 1s, 2s, 4s

2. **Validation Errors** (lint, type check)
   - Attempt automatic fix
   - Report if fix fails

3. **Logic Errors** (test failures)
   - Report with full context
   - Suggest potential fixes

4. **Blocking Errors** (missing dependencies)
   - Report as blocked immediately
   - Do not attempt workarounds

## Message Queue Protocol

For async communication:

### Send Message

```json
{
  "id": "msg-12345",
  "type": "status_update",
  "sender": "l2-backend-abc123",
  "recipient": "orchestrator",
  "correlationId": "task-P1.1",
  "timestamp": "2024-01-15T10:35:00Z",
  "payload": {
    "progress": 75,
    "currentStep": "Running tests"
  }
}
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `task_assignment` | L1 → L2 | Assign new task |
| `task_complete` | L2 → L1 | Report completion |
| `task_failed` | L2 → L1 | Report failure |
| `task_blocked` | L2 → L1 | Report blocker |
| `status_update` | L2 → L1 | Progress update |
| `context_request` | L2 → L1 | Request more info |
| `l3_spawn` | L2 → L1 | Request L3 worker |
| `l3_result` | L3 → L2 | Worker result |
| `shutdown` | L1 → L2 | Graceful stop |

## Handshake Protocol

When L2 agent starts:

1. **Agent announces readiness**
   ```
   L2_READY: l2-backend-abc123
   DOMAIN: backend
   CAPABILITIES: [api, database, auth]
   AWAITING_TASK: true
   ```

2. **Orchestrator acknowledges**
   ```
   L2_ACKNOWLEDGED: l2-backend-abc123
   TASK_ASSIGNED: P1.1
   ```

3. **Agent confirms receipt**
   ```
   TASK_RECEIVED: P1.1
   STARTING_EXECUTION: true
   ```

## Best Practices

1. **Always use exact format** - Parsing depends on consistent patterns
2. **Include task ID** - Every message must reference the task
3. **Report early, report often** - Don't wait until completion to communicate
4. **Be specific about blockers** - Vague reports delay resolution
5. **Include artifacts** - List all files touched for audit trail
6. **Estimate durations** - Helps orchestrator with scheduling

---

*L2 Task Protocol - CCASP Agent Orchestration System*
