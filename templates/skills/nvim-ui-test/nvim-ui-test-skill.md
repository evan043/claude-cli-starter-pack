# Neovim UI Testing Skill

## Overview

This skill covers deterministic headless testing of the nvim-ccasp Neovim plugin, including smoke tests, keymap validation, layout verification, and snapshot-based regression tracking.

## Architecture

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

## Test Framework

Tests use **plenary.nvim** (https://github.com/nvim-lua/plenary.nvim) which provides:
- `describe()` / `it()` from busted
- `assert.equals()`, `assert.truthy()`, `assert.falsy()`
- `PlenaryBustedFile` / `PlenaryBustedDirectory` commands
- Headless execution support

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

## Writing Tests

### Test Structure
```lua
-- nvim-ccasp/tests/my_spec.lua
local helpers = require("ccasp.test.helpers") -- if available via rtp

describe("My Feature", function()
  before_each(function()
    -- setup
  end)

  after_each(function()
    -- cleanup
  end)

  it("does something", function()
    -- arrange
    -- act
    -- assert
    assert.equals(expected, actual)
  end)
end)
```

### Key Assertions
- `assert.equals(a, b)` - Exact equality
- `assert.truthy(x)` - Not nil/false
- `assert.falsy(x)` - Nil or false
- `assert.has_error(fn)` - Function throws

### Testing Floating Windows
```lua
-- Get all floating windows
local floats = {}
for _, winid in ipairs(vim.api.nvim_list_wins()) do
  local config = vim.api.nvim_win_get_config(winid)
  if config.relative and config.relative ~= "" then
    table.insert(floats, { winid = winid, config = config })
  end
end
assert.truthy(#floats > 0, "Expected floating windows")
```

### Avoiding Timing Flakes
```lua
-- Use vim.wait() with polling instead of vim.defer_fn
vim.wait(1000, function()
  return some_condition()
end, 50) -- check every 50ms, timeout at 1000ms
```

## Snapshot Format

Text output:
```
=== CCASP Layout Snapshot ===
Timestamp: 2026-02-06 20:30:00
Editor: 120 cols x 40 lines

Windows (5 total, 3 floating):
  [1001] main      | 120x40 | normal     | active
  [1002] icon_rail | 3x36   | float(0,0) | z:50
  [1003] header    | tabline
  [1004] footer    | 120x2  | float(37,0)| z:50
  [1005] flyout    | 35x36  | float(1,3) | z:60
```

## Troubleshooting

### "plenary.nvim not found"
Install plenary.nvim and ensure it's in your Neovim runtime path:
```
git clone https://github.com/nvim-lua/plenary.nvim ~/.local/share/nvim/site/pack/testing/start/plenary.nvim
```

### Tests hang
- Check for `vim.wait()` calls without timeout
- Ensure `vim.defer_fn` callbacks complete
- Run with `--headless` flag

### Floating windows not appearing
- Headless Neovim may not render visual elements
- Use `nvim_list_wins()` + `nvim_win_get_config()` to verify programmatically
- Don't rely on visual inspection in headless mode

## This skill ships with the CCASP NPM package.
