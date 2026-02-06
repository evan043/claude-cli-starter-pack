# Neovim UI Testing Agents

Specialized Claude agents for UI testing workflows.

## Available Agents

| Agent | File | Role |
|-------|------|------|
| ui-driver | `testing/ui-driver.md` | Drives UI actions, validates windows |
| ui-debugger | `testing/ui-debugger.md` | Diagnoses and fixes UI bugs |
| nvim-test-runner | `testing/nvim-test-runner.md` | Runs tests, reports results |

## Agent Boundaries

```
ui-driver       → DRIVES and VALIDATES (read-only on production code)
ui-debugger     → DIAGNOSES and FIXES (modifies production + test code)
nvim-test-runner → EXECUTES and REPORTS (runs scripts, parses output)
```

## Delegation Pattern

1. `/ui-test` → invokes **nvim-test-runner** agent
2. Test fails → nvim-test-runner delegates to **ui-debugger**
3. ui-debugger needs reproduction → delegates to **ui-driver**
4. ui-driver reports exact state → ui-debugger applies fix
