# Neovim UI Testing Hooks

Automation hooks for the nvim-ccasp testing workflow.

## Available Hooks

| Hook | Template | Trigger |
|------|----------|---------|
| nvim-after-edit-test | `nvim-after-edit-test.template.js` | After editing `*.lua` files |
| agent-limit-compact | `agent-limit-compact.template.js` | Before spawning agents |

## nvim-after-edit-test

Automatically runs smoke tests when Lua files in `nvim-ccasp/` are edited. Helps catch regressions immediately.

**Event:** `afterEditTool`
**Matcher:** `*.lua` files in `nvim-ccasp/`
**Action:** Runs `scripts/nvim-smoke.ps1`

## agent-limit-compact

Limits concurrent agents to 3 and triggers context compaction when approaching limits. Prevents resource exhaustion during test/debug cycles.

**Event:** `beforeToolCall`
**Matcher:** Task tool invocations
**Action:** Checks agent count, blocks if over limit
