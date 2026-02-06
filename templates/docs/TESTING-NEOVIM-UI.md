# Testing Neovim UI

> This template is deployed to projects via `ccasp init`.

## Quick Start

```powershell
# Run all tests
./scripts/nvim-test.ps1

# Smoke test only
./scripts/nvim-smoke.ps1

# Capture layout snapshot
./scripts/nvim-snapshot.ps1
```

## Claude Commands

```
/ui-test          # Full test suite
/ui-smoke         # Quick smoke test
/ui-snapshot      # Layout snapshot + diff
/ui-bug           # Report UI bug
/ui-fix           # Fix failing test
/repo-guard       # Pre-commit gate
```

## Writing Tests

Tests use plenary.nvim (busted framework) and live in `nvim-ccasp/tests/`.

### File Naming
- `*_spec.lua` - Test specification files
- Use descriptive names: `flyout_spec.lua`, `right_panel_spec.lua`

### Template
```lua
describe("Feature Name", function()
  before_each(function()
    -- setup
  end)

  after_each(function()
    -- cleanup (close windows, clear buffers)
  end)

  it("does something specific", function()
    -- arrange
    -- act
    -- assert
    assert.equals(expected, actual)
  end)
end)
```

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
```

### Avoiding Timing Issues
```lua
-- Use vim.wait() with polling
vim.wait(1000, function()
  return some_condition()
end, 50) -- check every 50ms
```

## For full documentation, see `docs/testing-neovim-ui.md`.
