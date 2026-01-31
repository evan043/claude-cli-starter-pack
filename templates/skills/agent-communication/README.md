# Agent Communication Skill

This skill provides the protocol and utilities for inter-agent communication in the CCASP orchestration system.

## Overview

Agents communicate through:
1. **Shared state files** - Orchestrator state with message queue
2. **Hook events** - SubagentStart/SubagentStop for lifecycle
3. **Structured messages** - JSON format with correlation IDs

## Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `task_assignment` | L1 → L2 | Assign task to specialist |
| `task_complete` | L2 → L1 | Report task completion |
| `task_failed` | L2 → L1 | Report task failure |
| `task_blocked` | L2 → L1 | Report blocker |
| `status_update` | Any → L1 | Progress update |
| `context_request` | L2 → L1 | Request additional context |
| `l3_spawn_request` | L2 → L1 | Request L3 worker spawn |
| `l3_result` | L3 → L2 | Worker result |
| `shutdown` | L1 → Any | Graceful termination |

## Usage

### Sending Messages

```javascript
import { sendMessage } from './message-protocol.js';

// Send task completion
await sendMessage(statePath, {
  type: 'task_complete',
  sender: 'l2-backend-abc123',
  recipient: 'orchestrator',
  correlationId: 'P1.1',
  payload: {
    taskId: 'P1.1',
    status: 'completed',
    artifacts: ['src/routes/auth.ts'],
    summary: 'Implemented login endpoint',
  },
});
```

### Receiving Messages

```javascript
import { getMessages, markProcessed } from './message-protocol.js';

// Get unprocessed messages for this agent
const messages = getMessages(statePath, {
  recipient: 'l2-backend-abc123',
  unprocessedOnly: true,
});

// Process each message
for (const msg of messages) {
  handleMessage(msg);
  markProcessed(statePath, msg.id);
}
```

### Broadcasting

```javascript
import { broadcast } from './message-protocol.js';

// Send to all active agents
await broadcast(statePath, {
  type: 'shutdown',
  sender: 'orchestrator',
  payload: { reason: 'Plan complete' },
});
```

## File Structure

```
agent-communication/
├── README.md              # This file
├── message-protocol.js    # Core messaging functions
├── message-schema.json    # JSON schema for messages
└── examples/              # Usage examples
    ├── l1-to-l2.md
    ├── l2-to-l1.md
    └── l3-aggregation.md
```

## State File Location

Messages are stored in: `.claude/orchestrator/state.json`

```json
{
  "messages": [
    {
      "id": "msg-12345",
      "type": "task_assignment",
      "sender": "orchestrator",
      "recipient": "l2-backend-001",
      "correlationId": "P1.1",
      "timestamp": "2024-01-15T10:30:00Z",
      "processed": false,
      "payload": { ... }
    }
  ]
}
```

## Best Practices

1. **Always include correlationId** - Links related messages
2. **Process messages promptly** - Don't let queue grow
3. **Handle errors gracefully** - Report failures, don't crash
4. **Use appropriate types** - Helps with filtering and routing
5. **Keep payloads small** - Reference files instead of embedding content

---

*Agent Communication Skill - CCASP Orchestration System*
