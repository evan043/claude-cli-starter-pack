# Claude Workflow for nvim-ccasp Development

This document describes the recommended Claude Code CLI workflow for developing and testing the nvim-ccasp Neovim plugin.

## Development Cycle

```
Write Code -> /ui-smoke -> Fix -> /ui-test -> /ui-snapshot -> /repo-guard -> Commit
```

### 1. Write Code
Edit Lua files in `nvim-ccasp/lua/ccasp/`. The `nvim-after-edit-test` hook automatically runs smoke tests after each edit.

### 2. Quick Validation
```
/ui-smoke
```
Runs the smoke test suite to catch obvious regressions.

### 3. Fix Issues
```
/ui-fix
```
If smoke tests fail, this command guides you through diagnosis and repair using the ui-debugger agent.

### 4. Full Test Suite
```
/ui-test
```
Runs all tests: smoke, keymaps, and layout validation.

### 5. Snapshot Comparison
```
/ui-snapshot
```
Captures the current layout and compares against the previous snapshot. Highlights any dimension or z-index changes.

### 6. Pre-Commit Gate
```
/repo-guard
```
Quality gate that verifies tests pass, no lint errors, and no regressions before committing.

## Agent Roles

| Agent | Role | Invoked By |
|-------|------|------------|
| **nvim-test-runner** | Executes tests, parses output | `/ui-test`, `/ui-smoke` |
| **ui-driver** | Drives UI, validates windows | Test reproduction |
| **ui-debugger** | Diagnoses bugs, applies fixes | `/ui-fix`, `/ui-bug` |

### Delegation Flow
```
/ui-test
  └-> nvim-test-runner (runs tests)
       └-> [on failure] ui-debugger (diagnoses)
            └-> [needs repro] ui-driver (drives UI)
            └-> [applies fix] -> re-runs tests
```

## Hook Automation

| Hook | Trigger | Action |
|------|---------|--------|
| `nvim-after-edit-test` | After editing `*.lua` | Runs smoke tests |
| `agent-limit-compact` | Before spawning agents | Limits to 3 concurrent |

## Bug Reporting
```
/ui-bug
```
Generates a structured bug report with:
- Current layout snapshot
- Error messages
- Steps to reproduce
- Environment info

## File Locations

| Category | Path |
|----------|------|
| Plugin source | `nvim-ccasp/lua/ccasp/` |
| Test specs | `nvim-ccasp/tests/*_spec.lua` |
| Test utilities | `nvim-ccasp/lua/ccasp/test/` |
| Runner scripts | `scripts/nvim-*.ps1` |
| Commands | `.claude/commands/ui-*.md` |
| Agents | `.claude/agents/testing/` |
| Snapshots | `nvim-ccasp/tests/artifacts/` |
