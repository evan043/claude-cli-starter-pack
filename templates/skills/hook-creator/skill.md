---
name: hook-creator
description: Create Claude Code CLI hooks following best practices - proper JSON schema, event types, matchers, error handling, and file organization
---

# Hook Creator Skill

Expert-level Claude Code hook creation following official Anthropic best practices.

## When to Use This Skill

This skill is automatically invoked when:

- Creating new hooks for Claude Code CLI
- Modifying existing hook configurations
- Writing hook scripts (JS, Python, PowerShell)
- Configuring hook matchers and event types

## Hook Architecture Overview

### Configuration Files (Priority Order)

1. `~/.claude/settings.json` - Global user settings (all projects)
2. `.claude/settings.json` - Project settings (checked into git)
3. `.claude/settings.local.json` - Local overrides (gitignored)

### Hook Directory Structure

```
.claude/
  settings.local.json        # Hook configurations (JSON)
  hooks/
    README.md                 # Hook system documentation
    lifecycle/                # SessionStart, SessionEnd, Stop hooks
      README.md
      session-start.js
    tools/                    # PreToolUse, PostToolUse hooks
      README.md
      validate-files.js
    notifications/            # Notification hooks
      README.md
      alert-handler.js
    security/                 # Security-focused hooks
      README.md
      block-dangerous-ops.js
```

## Supported Hook Events

| Event | Trigger | Can Block | Primary Use Cases |
|-------|---------|-----------|-------------------|
| `SessionStart` | Session begins | No | Setup, notifications, load context |
| `SessionEnd` | Session ends | No | Cleanup, save state |
| `Stop` | Claude stops responding | No | Notifications, state saving |
| `PreToolUse` | Before tool executes | **Yes** | Security gates, input validation |
| `PostToolUse` | After tool completes | No | Logging, validation, sync |
| `Notification` | Attention needed | No | Custom alerts, sounds |
| `UserPromptSubmit` | Before prompt processes | **Yes** | Input validation |
| `SubagentStop` | Subagent completes | No | Aggregate results |
| `PreCompact` | Before transcript compaction | No | Archive, cleanup |
| `PermissionRequest` | Permission dialog shown | No | Custom handling |

## JSON Configuration Schema

### Basic Hook Configuration

```json
{
  "hooks": {
    "EventType": [
      {
        "matcher": "pattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### Configuration Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `matcher` | No | string (regex) | Filter which tools/events trigger hook |
| `hooks` | Yes | array | List of hook commands to execute |
| `type` | Yes | `"command"` or `"prompt"` | Hook execution type |
| `command` | For type:command | string | Shell command to execute |
| `timeout` | No | number | Seconds before timeout (default: 60) |

### Matcher Patterns

```json
// Single tool
"matcher": "Write"

// Multiple tools (regex OR)
"matcher": "Write|Edit|MultiEdit"

// MCP namespace
"matcher": "mcp__browserbase__.*"

// Specific MCP tool
"matcher": "mcp__browserbase__browserbase_stagehand_act"

// No matcher = all tools
// Just omit the matcher field
```

## Hook Input/Output

### Environment Variables (Available to Hooks)

| Variable | Description |
|----------|-------------|
| `CLAUDE_HOOK_INPUT` | JSON string of tool input |
| `CLAUDE_TOOL_NAME` | Name of tool being called |
| `CLAUDE_SESSION_ID` | Unique session identifier |
| `CLAUDE_PROJECT_PATH` | Path to project root |
| `CLAUDE_PERMISSION_MODE` | Current permission mode |

### Hook Output Format

```json
{
  "decision": "approve",         // "approve", "block", or "ask"
  "reason": "Optional explanation",
  "systemMessage": "Warning to show user",
  "updatedInput": {}             // Modified tool input
}
```

### Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Success | Allow action to proceed |
| 2 | Blocking error | Block action, show stderr to Claude |
| Other | Non-blocking error | Show stderr to user, allow action |
| Timeout | >60s (default) | Kill process, use default behavior |

## Hook Templates

### Template: JavaScript Tool Hook

```javascript
#!/usr/bin/env node

/**
 * Hook Name: [Description]
 * Event: PreToolUse | PostToolUse
 * Trigger: When [condition]
 * Purpose: [What this hook accomplishes]
 */

const fs = require('fs');
const path = require('path');

// Parse hook input from environment
const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
const toolName = process.env.CLAUDE_TOOL_NAME || '';
const projectPath = process.env.CLAUDE_PROJECT_PATH || process.cwd();

async function main() {
  try {
    // Your validation/processing logic here
    const shouldBlock = false; // Set based on your logic

    if (shouldBlock) {
      console.error('Blocked: [reason]');
      process.exit(2); // Exit code 2 = blocking error
    }

    // Success - allow action
    console.log(JSON.stringify({
      decision: 'approve',
      reason: 'Validation passed'
    }));
    process.exit(0);

  } catch (error) {
    // CRITICAL: Always default to allowing on error
    console.error('Hook error:', error.message);
    console.log(JSON.stringify({
      decision: 'approve',
      reason: `Error in hook: ${error.message}`
    }));
    process.exit(0);
  }
}

main();
```

### Template: Python Security Hook

```python
#!/usr/bin/env python3
"""
Hook Name: [Description]
Event: PreToolUse
Trigger: Write|Edit|Bash
Purpose: Block dangerous operations
"""

import json
import os
import sys

# Parse hook input
try:
    hook_input = json.loads(os.environ.get('CLAUDE_HOOK_INPUT', '{}'))
    tool_name = os.environ.get('CLAUDE_TOOL_NAME', '')
    project_path = os.environ.get('CLAUDE_PROJECT_PATH', os.getcwd())
except json.JSONDecodeError:
    hook_input = {}
    tool_name = ''
    project_path = os.getcwd()

# Dangerous patterns to block
DANGEROUS_PATTERNS = [
    '.env',
    'secrets/',
    'credentials',
    'private_key',
]

def is_dangerous(file_path: str) -> bool:
    """Check if file path matches dangerous patterns."""
    return any(pattern in file_path.lower() for pattern in DANGEROUS_PATTERNS)

def main():
    try:
        file_path = hook_input.get('file_path', '')

        if is_dangerous(file_path):
            sys.stderr.write(f"Blocked: Dangerous file pattern detected: {file_path}\n")
            sys.exit(2)  # Exit 2 = blocking error

        print(json.dumps({
            'decision': 'approve',
            'reason': 'File path validated'
        }))
        sys.exit(0)

    except Exception as e:
        # CRITICAL: Default to allowing on error
        sys.stderr.write(f"Hook error: {str(e)}\n")
        print(json.dumps({
            'decision': 'approve',
            'reason': f'Error in hook: {str(e)}'
        }))
        sys.exit(0)

if __name__ == '__main__':
    main()
```

## Best Practices

### Performance

1. **Keep hooks fast** - Target <5 seconds execution
2. **Use timeouts** - Set appropriate timeouts for longer operations
3. **Async when possible** - Background non-critical work
4. **Minimize I/O** - Cache frequently accessed data

### Security

1. **Quote variables** - Prevent command injection
2. **Validate inputs** - Never trust hook input blindly
3. **Scope credentials** - Hooks run with your full environment
4. **Block sensitive files** - Use PreToolUse to protect secrets

### Error Handling

1. **Always default to `approve`** - Don't block on hook errors
2. **Log errors** - Write to stderr for debugging
3. **Graceful degradation** - Hooks should fail safely
4. **Test locally** - Verify hooks before deploying

### Organization

1. **Use subdirectories** - Group hooks by purpose
2. **Document everything** - README.md in each directory
3. **Consistent naming** - `{purpose}-{action}-hook.{ext}`
4. **Version control** - Track hook changes in git

## Workflows

### Creating a New Hook

1. **Determine event type** - Which lifecycle event triggers your hook?
2. **Design matcher** - What tools/actions should trigger it?
3. **Choose language** - JS for complex logic, Python for security
4. **Write hook script** - Use templates above
5. **Configure in settings** - Add to `.claude/settings.local.json`
6. **Document** - Update README.md in appropriate directory
7. **Test locally** - Run hook manually before enabling

### Modifying Existing Hooks

1. **Review current config** - Check `.claude/settings.local.json`
2. **Understand impact** - What tools/events are affected?
3. **Make changes** - Update configuration or hook script
4. **Test thoroughly** - Verify both success and error paths
5. **Update documentation** - Keep README.md current

## References

- Official Docs: https://docs.anthropic.com/en/docs/claude-code/hooks
- Project Hooks: `.claude/hooks/README.md`
- Settings: `.claude/settings.local.json`
