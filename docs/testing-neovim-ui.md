# Testing Neovim UI (nvim-ccasp)

Guide for deterministic headless testing of the nvim-ccasp Neovim plugin.

## Overview

The nvim-ccasp plugin provides a terminal command center for Claude Code CLI inside Neovim. It supports two layout modes:
- **Classic**: Sidebar + terminal split
- **Appshell**: Full chrome with icon rail, flyout, header, footer, content zone, and optional right panel

This testing framework validates both layouts using headless Neovim and plenary.nvim.

## Prerequisites

- Neovim 0.9+ installed and in PATH
- plenary.nvim installed (`git clone https://github.com/nvim-lua/plenary.nvim ~/.local/share/nvim/site/pack/testing/start/plenary.nvim`)
- PowerShell 5+ (Windows) or bash (Linux/macOS)

## Test Architecture

```
nvim-ccasp/
  lua/ccasp/test/
    driver.lua       # UI automation driver
    snapshot.lua      # Layout snapshot utility
  tests/
    minimal_init.lua  # Headless test init
    helpers.lua       # Test utilities
    ui_smoke_spec.lua # Smoke tests
    keymaps_spec.lua  # Keymap validation
    layout_spec.lua   # Layout structure tests
    artifacts/        # Test output (snapshots, logs)
scripts/
  nvim-test.ps1      # Full test runner
  nvim-smoke.ps1     # Smoke test runner
  nvim-snapshot.ps1  # Snapshot capture
```

## Running Tests

### Full Suite
```powershell
./scripts/nvim-test.ps1
```

### Smoke Only
```powershell
./scripts/nvim-smoke.ps1
```

### Single File
```powershell
nvim --headless -c "PlenaryBustedFile nvim-ccasp/tests/layout_spec.lua"
```

### With Filter
```powershell
./scripts/nvim-test.ps1 -Filter "layout"
```

## Test Categories

### Smoke Tests (`ui_smoke_spec.lua`)
Verifies the plugin loads, opens UI, traverses menus, and closes cleanly. Quick validation that nothing is fundamentally broken.

### Keymap Tests (`keymaps_spec.lua`)
Validates all registered keybindings execute without error. Tests both appshell-specific keymaps (Ctrl+B, Alt+1-5) and universal keymaps (CcaspDashboard, etc).

### Layout Tests (`layout_spec.lua`)
Validates the structural integrity of the appshell layout: all 6 zones present, correct dimensions, proper z-indexing, content zone fills remaining space.

## Test Utilities

### helpers.lua
- `setup_test_env(opts)` - Initialize test environment
- `with_clean_state(fn)` - Run function with clean Neovim state
- `wait_for(condition, timeout, interval)` - Poll-based waiting
- `get_float_windows()` - Get all floating windows
- `assert_window_exists(name)` - Assert a named window exists
- `assert_no_errors(fn)` - Run function and collect errors
- `cleanup()` - Tear down test state

### driver.lua
- `open(opts)` - Open CCASP UI with config
- `close()` - Close UI completely
- `select_section(name)` - Click icon rail section
- `open_flyout(section)` - Open flyout for section
- `close_flyout()` - Close flyout
- `get_floats()` - Get floating window info
- `full_smoke()` - Run complete smoke traversal

### snapshot.lua
- `capture()` - Capture current layout state
- `to_string(snap)` - Format snapshot as text
- `to_file(snap, path)` - Save snapshot to file
- `diff(snap1, snap2)` - Compare two snapshots
- `print_diff(changes)` - Print diff report

## Claude Workflow Integration

This testing framework integrates with Claude Code CLI via CCASP slash commands:

| Command | Description |
|---------|-------------|
| `/ui-test` | Run full test suite |
| `/ui-smoke` | Quick smoke test |
| `/ui-snapshot` | Capture and compare layout |
| `/ui-bug` | Report bug with structured data |
| `/ui-fix` | Guided debug and fix workflow |
| `/repo-guard` | Pre-commit quality gate |

### Agents
- **ui-driver**: Drives UI actions, validates windows
- **ui-debugger**: Diagnoses and fixes UI bugs
- **nvim-test-runner**: Runs tests, reports results

### Hooks
- **nvim-after-edit-test**: Auto-runs smoke tests after `.lua` edits
- **agent-limit-compact**: Limits concurrent agents to 3

## Avoiding Common Pitfalls

1. **Timing flakes**: Use `vim.wait()` with polling, not `vim.defer_fn`
2. **Headless rendering**: Don't rely on visual output; use API calls to verify state
3. **Global state**: Always clean up in `after_each` to prevent test pollution
4. **Plugin load order**: Use `minimal_init.lua` to control load sequence
5. **Float detection**: Use `nvim_win_get_config().relative ~= ""` to identify floats

## CI Integration (Future)

Tests are designed to run in CI with:
```yaml
- name: Run nvim-ccasp tests
  run: |
    nvim --headless -c "PlenaryBustedDirectory nvim-ccasp/tests/ {minimal_init = 'nvim-ccasp/tests/minimal_init.lua'}"
```
