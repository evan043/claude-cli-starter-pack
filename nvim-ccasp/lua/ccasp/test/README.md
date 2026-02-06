# CCASP Test Infrastructure

Test utilities for the nvim-ccasp Neovim plugin. Provides UI automation, layout snapshots, and regression testing capabilities.

## Modules

### 1. `driver.lua` - UI Test Driver

Automates CCASP interactions with safe error handling.

#### Core Functions

```lua
local driver = require("ccasp.test.driver")

-- Open/Close
driver.open("appshell")  -- Open with specified layout (classic/modern/appshell)
driver.close()           -- Close and cleanup all floating windows

-- Navigation
driver.select_section(2)           -- Navigate to icon rail section (1-5)
driver.open_flyout("commands")     -- Open flyout for named section
driver.close_flyout()              -- Close flyout if open
driver.toggle_right_panel()        -- Toggle right panel visibility

-- Inspection
local floats = driver.get_floats() -- Get all floating window configs
driver.is_rail_visible()           -- Check if icon rail is visible
driver.is_flyout_visible()         -- Check if flyout is open
driver.get_session_count()         -- Get count of active Claude sessions

-- Session Management
local id = driver.spawn_session()  -- Spawn new Claude session
driver.focus_session(id)           -- Focus specific session

-- Error Handling
driver.get_errors()                -- Get error log
driver.print_errors()              -- Print errors to messages
driver.clear_errors()              -- Clear error log
```

#### Smoke Test

```lua
-- Run full smoke traversal (open, navigate all sections, toggle flyout, close)
local results = driver.full_smoke()
driver.print_smoke_results(results)
```

**Results structure:**
```lua
{
  steps = {
    { name = "open", ok = true },
    { name = "check_floats", ok = true, count = 5, rail_visible = true },
    { name = "section_1", ok = true },
    -- ... more steps
  },
  errors = { "step_name: error message", ... },
  passed = 12,
  failed = 0,
  summary = "Completed: 12 passed, 0 failed (total 12 steps)"
}
```

### 2. `snapshot.lua` - Layout Snapshot Utility

Captures complete window state for regression testing.

#### Core Functions

```lua
local snapshot = require("ccasp.test.snapshot")

-- Capture
local snap = snapshot.capture()  -- Capture current layout state

-- Output
local str = snapshot.to_string(snap)           -- Convert to readable string
snapshot.print(snap)                           -- Print to messages
snapshot.to_file(snap, "/path/to/file.txt")    -- Write to file
snapshot.capture_to_file("/path/to/file.txt")  -- Capture + write

-- Comparison
local diffs = snapshot.diff(snap1, snap2)      -- Compare two snapshots
snapshot.print_diff(snap1, snap2)              -- Print differences
```

#### Snapshot Structure

```lua
{
  timestamp = "2026-02-06 10:00:00",
  editor = {
    columns = 240,
    lines = 60,
    cmdheight = 1,
  },
  windows = {
    {
      winid = 1000,
      bufnr = 1,
      bufname = "term://...",
      filetype = "terminal",
      is_float = true,
      width = 80,
      height = 40,
      row = 5,
      col = 10,
      zindex = 50,
      border = "rounded",
      relative = "editor",
      winhighlight = "Normal:CcaspBg",
      active = true,
      cursor = { line = 10, col = 5 },
    },
    -- ... more windows
  },
  active_win = 1000,
  cursor = { line = 10, col = 5 },
  appshell_state = {
    active = true,
    active_section = "terminal",
    flyout_visible = false,
    rail_visible = true,
    right_panel_visible = false,
    zones = {
      icon_rail = { row = 1, col = 0, width = 3, height = 58 },
      content = { row = 1, col = 3, width = 237, height = 58 },
      -- ... more zones
    },
  },
  sessions = {
    { id = "session_123", name = "Claude 1", bufnr = 1, winid = 1000, claude_running = true, is_primary = true },
    -- ... more sessions
  },
}
```

### 3. `example.lua` - Example Tests

Demonstration scripts showing usage patterns.

```lua
local example = require("ccasp.test.example")

-- Individual tests
example.simple_smoke_test()
example.full_smoke_test()
example.snapshot_comparison_test()
example.session_spawn_test()
example.snapshot_to_file_test()

-- Run all
example.run_all()
```

## Usage Examples

### Basic Smoke Test

```lua
-- From Neovim command line
:lua require("ccasp.test.driver").full_smoke()
```

### Capture Snapshot and Print

```lua
:lua local s = require("ccasp.test.snapshot"); s.print(s.capture())
```

### Compare Before/After Layout Changes

```lua
local driver = require("ccasp.test.driver")
local snapshot = require("ccasp.test.snapshot")

-- Capture before
driver.open("appshell")
vim.wait(500, function() return false end)
local before = snapshot.capture()

-- Make changes
driver.select_section(3)
driver.open_flyout("todos")
vim.wait(500, function() return false end)

-- Capture after
local after = snapshot.capture()

-- Compare
snapshot.print_diff(before, after)

driver.close()
```

### Save Snapshot to File

```lua
local snapshot = require("ccasp.test.snapshot")
local driver = require("ccasp.test.driver")

driver.open("appshell")
vim.wait(500, function() return false end)

snapshot.capture_to_file("/tmp/ccasp_layout.txt")

driver.close()
```

### Multi-Session Testing

```lua
local driver = require("ccasp.test.driver")

driver.open("appshell")

-- Spawn multiple sessions
local session1 = driver.spawn_session()
local session2 = driver.spawn_session()

print(string.format("Total sessions: %d", driver.get_session_count()))

-- Focus specific session
driver.focus_session(session1)

driver.close()
```

## Error Handling

All driver functions use `pcall` internally and capture errors. Check errors with:

```lua
local driver = require("ccasp.test.driver")

driver.open("appshell")
-- ... perform operations

if #driver.get_errors() > 0 then
  driver.print_errors()
end
```

## Test Patterns

### Regression Test Pattern

```lua
-- 1. Capture baseline
local baseline = snapshot.capture()
snapshot.to_file(baseline, "baseline.txt")

-- 2. After code changes, capture new snapshot
local current = snapshot.capture()

-- 3. Compare
local diffs = snapshot.diff(baseline, current)
if #diffs > 1 then  -- > 1 because "No differences" is one item
  print("Layout regression detected!")
  snapshot.print_diff(baseline, current)
end
```

### Automated Smoke Test

```lua
-- Run before every commit
local driver = require("ccasp.test.driver")
local results = driver.full_smoke()

if results.failed > 0 then
  driver.print_smoke_results(results)
  error("Smoke test failed - see errors above")
end
```

### Performance Test

```lua
local driver = require("ccasp.test.driver")

local start = vim.loop.hrtime()
driver.open("appshell")
local open_time = (vim.loop.hrtime() - start) / 1e6  -- milliseconds

print(string.format("Open time: %.2fms", open_time))

driver.close()
```

## Keymap Integration

Add to your Neovim config:

```lua
-- Run smoke test
vim.keymap.set("n", "<leader>ts", function()
  local driver = require("ccasp.test.driver")
  local results = driver.full_smoke()
  driver.print_smoke_results(results)
end, { desc = "CCASP: Run smoke test" })

-- Capture snapshot
vim.keymap.set("n", "<leader>tc", function()
  local snapshot = require("ccasp.test.snapshot")
  snapshot.print(snapshot.capture())
end, { desc = "CCASP: Capture snapshot" })

-- Run all example tests
vim.keymap.set("n", "<leader>ta", function()
  require("ccasp.test.example").run_all()
end, { desc = "CCASP: Run all tests" })
```

## CI Integration

```bash
# Run smoke test in headless Neovim
nvim --headless -c "lua require('ccasp.test.driver').full_smoke()" -c "quitall"

# Capture snapshot to file
nvim --headless -c "lua require('ccasp.test.snapshot').capture_to_file('/tmp/snapshot.txt')" -c "quitall"
```

## Troubleshooting

### Test Hangs

If tests hang, check wait durations. The driver caps waits at 5000ms for safety.

### Windows Not Closing

Force cleanup with:

```lua
for _, win in ipairs(vim.api.nvim_list_wins()) do
  if vim.api.nvim_win_is_valid(win) then
    pcall(vim.api.nvim_win_close, win, true)
  end
end
```

### Error Log Accumulation

Clear between tests:

```lua
driver.clear_errors()
```

## Future Enhancements

- [ ] Assertion helpers (e.g., `assert_window_exists`, `assert_zone_bounds`)
- [ ] Mock Claude CLI responses for faster tests
- [ ] Visual regression testing (screenshot comparison)
- [ ] Test coverage reporting
- [ ] Integration with plenary.nvim test framework

## License

Same as parent project (MIT)
