# Hook Templates Index

Complete catalog of all enforcement hooks included in CCASP. Hooks are JavaScript files that intercept Claude Code CLI events to enforce patterns, track state, and automate workflows.

## Hook Event Types

Hooks subscribe to specific events in the Claude Code CLI lifecycle:

| Event Type | When it Fires | Use Cases |
|------------|---------------|-----------|
| `PreToolUse` | Before tool execution | Validation, context injection, safety checks |
| `PostToolUse` | After tool execution | State tracking, result processing, triggers |
| `PreSendMessage` | Before sending message to Claude | Context injection, budget setting |
| `PostReceiveMessage` | After receiving response from Claude | Logging, checkpointing, parsing |
| `SubagentStart` | When spawning a subagent | Hierarchy validation, context injection |
| `SubagentEnd` | When subagent completes | Result aggregation, cleanup |

---

## By Event Type

### PreToolUse Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `happy-mode-detector` | `*` | Auto-detect Happy.engineering mobile environment from session indicators |
| `context-guardian` | `*` | Monitor context window usage, prevent overflow at 90%, suggest /compact |
| `tunnel-check-prompt` | `Bash` | Validate tunnel URLs exist before deployment commands |
| `mcp-api-key-validator` | `*` | Verify MCP server credentials and API keys before operations |
| `constitution-enforcer` | `*` | Validate code changes against project constitution rules (sampling-based) |
| `playwright-pre-launch` | `Bash` | Inject test credentials and tunnel URLs into Playwright config |

### PostToolUse Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `token-usage-monitor` | `*` | Track token consumption, warn at 75%, critical at 90% |
| `usage-tracking` | `*` | Aggregate usage statistics across sessions for analytics |
| `session-id-generator` | `*` | Generate unique session identifiers for tracking |
| `git-commit-tracker` | `Bash` | Track git commits and maintain change log |
| `branch-merge-checker` | `Bash` | Validate branch safety before merge (CI checks, conflicts) |
| `deployment-orchestrator` | `Bash` | Coordinate parallel deployments (backend + frontend) |
| `ralph-loop-enforcer` | `Bash` | Monitor Ralph Loop test-fix iterations, enforce max 10 loops |
| `ralph-loop-web-search` | `Bash` | Trigger web search agent after 3 failed Ralph attempts |
| `ralph-occurrence-auditor` | `*` | Track recurring Ralph failures and suggest refactoring |
| `refactor-verify` | `Write, Edit` | Verify refactoring changes pass all tests before completion |
| `refactor-transaction` | `Write, Edit` | Ensure atomic refactoring operations (rollback on failure) |
| `refactor-audit` | `*` | Audit completed refactoring for code smell elimination |
| `progress-tracker` | `Write` | Update PROGRESS.json files when tasks complete |
| `progress-sync` | `Write` | Sync progress updates to GitHub issues |
| `hierarchy-progress-sync` | `Write` | Sync hierarchical progress (epic → roadmap → phase) |
| `roadmap-progress-sync` | `Write` | Update roadmap completion percentages |
| `epic-progress-sync` | `Write` | Update epic tracking and milestone completion |
| `github-progress-sync` | `Write` | Spawn L3 worker to update GitHub issue checkboxes |
| `issue-completion-detector` | `*` | Detect when GitHub issues are 100% complete |
| `github-task-auto-split` | `*` | Auto-split large tasks into manageable subtasks |
| `tool-output-cacher` | `*` | Cache tool outputs to reduce redundant calls |

### PreSendMessage Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `context-injector` | `*` | Inject tech stack and settings context into every message |
| `happy-title-generator` | `*` | Generate mobile-friendly titles for Happy.engineering UI |
| `token-budget-loader` | `*` | Set appropriate token budgets based on task type |
| `subagent-context-injector` | `*` | Inject context for L2/L3 agent spawns (AGENT_DELEGATION.md) |

### PostReceiveMessage Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `happy-checkpoint-manager` | `*` | Create recovery checkpoints for Happy.engineering sessions |
| `autonomous-decision-logger` | `*` | Log autonomous agent decisions for audit trail |

### SubagentStart Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `hierarchy-validator` | `*` | Validate L1 → L2 → L3 hierarchy compliance |
| `agent-delegator` | `*` | Route tasks to appropriate specialist agents |

### SubagentEnd Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `l2-completion-reporter` | `*` | Report L2 agent completion status to orchestrator |
| `agent-error-recovery` | `*` | Handle agent failures and retry logic |
| `l3-parallel-executor` | `*` | Aggregate results from parallel L3 worker batches |

---

## By Category

### Token & Session Management

| Hook | Event | Purpose |
|------|-------|---------|
| `token-usage-monitor` | PostToolUse | Track cumulative token usage, warn at thresholds |
| `usage-tracking` | PostToolUse | Aggregate session statistics |
| `session-id-generator` | PostToolUse | Generate unique session IDs |
| `context-guardian` | PreToolUse | Prevent context window overflow |
| `token-budget-loader` | PreSendMessage | Set task-specific token budgets |

### Deployment & CI/CD

| Hook | Event | Purpose |
|------|-------|---------|
| `deployment-orchestrator` | PostToolUse | Coordinate parallel full-stack deploys |
| `branch-merge-checker` | PostToolUse | Validate merge safety (CI, conflicts) |
| `tunnel-check-prompt` | PreToolUse | Validate tunnel URLs before deploy |

### Testing & Quality

| Hook | Event | Purpose |
|------|-------|---------|
| `ralph-loop-enforcer` | PostToolUse | Monitor continuous test-fix cycles |
| `ralph-loop-web-search` | PostToolUse | Trigger web search after 3 failed attempts |
| `ralph-occurrence-auditor` | PostToolUse | Track recurring test failures |
| `playwright-pre-launch` | PreToolUse | Inject E2E test credentials |

### Refactoring

| Hook | Event | Purpose |
|------|-------|---------|
| `refactor-verify` | PostToolUse | Verify refactoring passes tests |
| `refactor-transaction` | PostToolUse | Atomic refactoring operations |
| `refactor-audit` | PostToolUse | Audit code smell elimination |

### Agent Orchestration

| Hook | Event | Purpose |
|------|-------|---------|
| `hierarchy-validator` | SubagentStart | Enforce L1 → L2 → L3 hierarchy |
| `l2-completion-reporter` | SubagentEnd | Report L2 task completion |
| `agent-delegator` | SubagentStart | Route tasks to specialists |
| `agent-error-recovery` | SubagentEnd | Handle agent failures |
| `orchestrator-enforcer` | PreToolUse | Enforce orchestration patterns |
| `orchestrator-init` | PreSendMessage | Initialize orchestration state |
| `orchestrator-audit-logger` | PostReceiveMessage | Log orchestration decisions |
| `l3-parallel-executor` | SubagentEnd | Execute L3 workers in parallel |
| `agent-epic-progress` | PostToolUse | Track agent progress in epics |
| `subagent-context-injector` | PreSendMessage | Inject agent context |

### Progress & State Tracking

| Hook | Event | Purpose |
|------|-------|---------|
| `progress-tracker` | PostToolUse | Update PROGRESS.json files |
| `progress-sync` | PostToolUse | Sync progress to GitHub |
| `hierarchy-progress-sync` | PostToolUse | Sync epic/roadmap/phase hierarchy |
| `roadmap-progress-sync` | PostToolUse | Update roadmap completion |
| `epic-progress-sync` | PostToolUse | Update epic milestones |
| `github-progress-sync` | PostToolUse | Trigger L3 GitHub sync worker |
| `issue-completion-detector` | PostToolUse | Detect 100% complete issues |
| `phase-validation-gates` | PreToolUse | Validate phase completion |
| `phase-dev-enforcer` | PreToolUse | Enforce phase-dev-plan requirements |
| `roadmap-state-tracker` | PostToolUse | Track roadmap execution state |

### Git & Version Control

| Hook | Event | Purpose |
|------|-------|---------|
| `git-commit-tracker` | PostToolUse | Track commits and maintain changelog |
| `branch-merge-checker` | PostToolUse | Validate merge safety |

### GitHub Integration

| Hook | Event | Purpose |
|------|-------|---------|
| `github-progress-sync` | PostToolUse | Update GitHub issue checkboxes |
| `github-task-auto-split` | PostToolUse | Auto-split large tasks |
| `issue-completion-detector` | PostToolUse | Detect completed issues |

### Task Classification

| Hook | Event | Purpose |
|------|-------|---------|
| `task-classifier` | PreSendMessage | Classify tasks by complexity |
| `complexity-analyzer` | PostToolUse | Analyze code complexity |
| `completion-verifier` | PostToolUse | Verify task completion |
| `delegation-enforcer` | PreToolUse | Enforce delegation requirements |

### Happy.engineering Mobile

| Hook | Event | Purpose |
|------|-------|---------|
| `happy-mode-detector` | PreToolUse | Auto-detect mobile environment |
| `happy-checkpoint-manager` | PostReceiveMessage | Create recovery checkpoints |
| `happy-title-generator` | PreSendMessage | Generate mobile-friendly titles |
| `panel-queue-reader` | PreToolUse | Read Happy control panel queues |

### Documentation & Updates

| Hook | Event | Purpose |
|------|-------|---------|
| `documentation-generator` | PostToolUse | Auto-generate docs from code |
| `ccasp-update-check` | PreToolUse | Check for CCASP updates |

### Vision Mode

| Hook | Event | Purpose |
|------|-------|---------|
| `vision-observer-hook` | PostToolUse | Observe Vision execution for drift |

### MCP & Security

| Hook | Event | Purpose |
|------|-------|---------|
| `mcp-api-key-validator` | PreToolUse | Validate MCP credentials |

### Code Quality

| Hook | Event | Purpose |
|------|-------|---------|
| `constitution-enforcer` | PreToolUse | Enforce project coding standards |

### Optimization

| Hook | Event | Purpose |
|------|-------|---------|
| `tool-output-cacher` | PostToolUse | Cache tool outputs to reduce redundancy |

---

## Hook Statistics

- **Total Hooks**: 54
- **PreToolUse**: 6
- **PostToolUse**: 20
- **PreSendMessage**: 4
- **PostReceiveMessage**: 2
- **SubagentStart**: 2
- **SubagentEnd**: 3

---

## Hook Configuration

Most hooks support configuration via `.claude/config/hooks-config.json`:

```json
{
  "token-usage-monitor": {
    "context_limit": 200000,
    "warning_threshold": 0.75,
    "critical_threshold": 0.90
  },
  "ralph-loop-enforcer": {
    "maxIterations": 10,
    "sameFailureThreshold": 3
  },
  "constitution-enforcer": {
    "enabled": true,
    "samplingRate": 0.05,
    "sections": ["code_style", "security"]
  }
}
```

---

## Registering Custom Hooks

Add hooks to `.claude/settings.json`:

```json
{
  "hooks": [
    {
      "path": ".claude/hooks/my-custom-hook.js",
      "enabled": true,
      "events": ["PreToolUse"],
      "matchers": {
        "tools": ["Bash"],
        "patterns": ["npm test"]
      }
    }
  ]
}
```

---

## Hook Development

### Basic Hook Structure

```javascript
/**
 * My Custom Hook
 *
 * Event: PostToolUse
 * Tools: Bash
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'my-custom-hook',
  events: ['PostToolUse'],
  matchers: {
    tools: ['Bash'],
    patterns: [/npm test/]
  },

  async run(context) {
    const { tool, input, output } = context;

    // Your logic here
    console.log(`Hook triggered: ${tool}`);

    // Return modified context or original
    return context;
  }
};
```

### Available Context

| Field | Description |
|-------|-------------|
| `context.tool` | Tool name (Bash, Read, Write, etc.) |
| `context.input` | Tool input parameters |
| `context.output` | Tool output (PostToolUse only) |
| `context.message` | Message content (PreSendMessage) |
| `context.techStack` | Parsed tech-stack.json |
| `context.settings` | Parsed settings.json |

### Testing Hooks

```bash
# Enable hook debugging
export CLAUDE_DEBUG_HOOKS=1

# Run Claude Code CLI
claude .

# Check hook execution logs
cat .claude/logs/hooks.log
```

---

## Next Steps

- [View Template Index](../INDEX.md)
- [View Variables Reference](../VARIABLES.md)
- [Read Hook Development Guide](../../docs/hook-development.md)
- [Check Hook Examples](../hooks/)
