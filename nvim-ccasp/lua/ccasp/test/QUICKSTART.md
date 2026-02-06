# CCASP Test Infrastructure - Quick Start

Get up and running with CCASP testing in 5 minutes.

## Installation

The test infrastructure is already included with nvim-ccasp. No additional installation needed.

## Quick Commands

Open Neovim and run these commands directly:

### 1. Run Smoke Test (Most Common)

```vim
:lua require("ccasp.test").smoke()
```

This will:
- Open appshell layout
- Visit all 5 sections
- Toggle flyout on/off
- Toggle right panel on/off
- Close appshell
- Verify clean state
- Print results

**Expected output:**
```
=== CCASP Smoke Test Results ===
Completed: 12 passed, 0 failed (total 12 steps)

Steps:
  [ 1] ✓ open
  [ 2] ✓ check_floats (count=3) (rail=yes)
  [ 3] ✓ section_1
  [ 4] ✓ section_2
  [ 5] ✓ section_3
  [ 6] ✓ section_4
  [ 7] ✓ section_5
  [ 8] ✓ open_flyout
  [ 9] ✓ flyout_visible
  [10] ✓ close_flyout
  [11] ✓ right_panel_on
  [12] ✓ right_panel_off
  [13] ✓ close
  [14] ✓ clean_state (remaining=0)

Result: PASSED
```

### 2. Capture Layout Snapshot

```vim
:lua require("ccasp.test").snap()
```

This will capture and print the current window layout state, including:
- Editor dimensions
- All windows (floating and splits)
- Appshell state (if active)
- Active Claude sessions
- Zone bounds

### 3. Save Snapshot to File

```vim
:lua require("ccasp.test").save_snap()
```

Saves to a temporary file and prints the path.

Or save to a specific location:

```vim
:lua require("ccasp.test").save_snap("/tmp/my_snapshot.txt")
```

### 4. Run All Example Tests

```vim
:lua require("ccasp.test").test_all()
```

Runs all 5 example tests:
- Simple smoke test
- Full smoke test
- Snapshot comparison
- Session spawn test
- Snapshot to file test

### 5. Get Help

```vim
:lua require("ccasp.test").help()
```

## Common Workflows

### Before/After Comparison

```lua
-- From Neovim, run this Lua block:
local test = require("ccasp.test")
local snap = require("ccasp.test.snapshot")
local driver = require("ccasp.test.driver")

-- Open and capture initial state
driver.open("appshell")
vim.wait(500, function() return false end)
local before = snap.capture()

-- Make some UI changes
driver.select_section(3)
driver.open_flyout("todos")
vim.wait(500, function() return false end)

-- Capture changed state
local after = snap.capture()

-- Print differences
snap.print_diff(before, after)

-- Cleanup
driver.close()
```

### Manual UI Exploration

```lua
local driver = require("ccasp.test.driver")

-- Open CCASP
driver.open("appshell")

-- Navigate around manually...
driver.select_section(2)
driver.open_flyout("commands")

-- Inspect state
local floats = driver.get_floats()
print(vim.inspect(floats))

-- Check visibility
print("Rail visible:", driver.is_rail_visible())
print("Flyout visible:", driver.is_flyout_visible())

-- When done
driver.close()
```

### Regression Testing

```bash
# From terminal, capture baseline
nvim --headless -c "lua require('ccasp.test').save_snap('baseline.txt')" -c "quitall"

# After making code changes
nvim --headless -c "lua require('ccasp.test').save_snap('current.txt')" -c "quitall"

# Compare manually
diff baseline.txt current.txt
```

## Keymaps (Optional)

Add to your `~/.config/nvim/init.lua`:

```lua
-- CCASP test keymaps
vim.keymap.set("n", "<leader>ts", function()
  require("ccasp.test").smoke()
end, { desc = "CCASP: Smoke test" })

vim.keymap.set("n", "<leader>tc", function()
  require("ccasp.test").snap()
end, { desc = "CCASP: Capture snapshot" })

vim.keymap.set("n", "<leader>ta", function()
  require("ccasp.test").test_all()
end, { desc = "CCASP: Run all tests" })
```

Then just press `<leader>ts` to run smoke tests!

## Troubleshooting

### Test hangs or freezes

Add shorter waits:

```lua
local driver = require("ccasp.test.driver")
driver.open("appshell")
vim.wait(200, function() return false end)  -- Shorter wait
driver.close()
```

### Windows not closing properly

Force cleanup:

```lua
local driver = require("ccasp.test.driver")
driver.close()  -- This force-closes all floating windows
```

### Error messages

Check the error log:

```lua
local driver = require("ccasp.test.driver")
driver.open("appshell")
-- ... perform actions
driver.print_errors()
```

### Module not found

Make sure you're in the nvim-ccasp directory or have the plugin installed:

```vim
:lua print(vim.fn.stdpath("data") .. "/site/pack/*/start/nvim-ccasp")
```

## Next Steps

- Read [README.md](./README.md) for detailed API documentation
- Check [example.lua](./example.lua) for more test patterns
- Integrate tests into your CI/CD pipeline
- Create custom test suites for your workflows

## API Reference (Quick)

```lua
-- Test module (entry point)
local test = require("ccasp.test")
test.smoke()                    -- Run smoke test
test.snap()                     -- Capture snapshot
test.save_snap(path)            -- Save snapshot
test.test_all()                 -- Run all examples
test.help()                     -- Show help

-- Driver module (UI automation)
local driver = require("ccasp.test.driver")
driver.open(layout)             -- Open CCASP
driver.close()                  -- Close CCASP
driver.select_section(index)    -- Navigate section
driver.open_flyout(name)        -- Open flyout
driver.close_flyout()           -- Close flyout
driver.toggle_right_panel()     -- Toggle panel
driver.get_floats()             -- Get floating windows
driver.full_smoke()             -- Run smoke traversal
driver.spawn_session()          -- Spawn Claude session
driver.get_errors()             -- Get error log

-- Snapshot module (layout capture)
local snap = require("ccasp.test.snapshot")
snap.capture()                  -- Capture layout
snap.to_string(snapshot)        -- Format snapshot
snap.print(snapshot)            -- Print snapshot
snap.to_file(snap, path)        -- Write to file
snap.capture_to_file(path)      -- Capture + write
snap.diff(snap1, snap2)         -- Compare snapshots
snap.print_diff(snap1, snap2)   -- Print differences

-- Example module (test suite)
local example = require("ccasp.test.example")
example.simple_smoke_test()
example.full_smoke_test()
example.snapshot_comparison_test()
example.session_spawn_test()
example.snapshot_to_file_test()
example.run_all()
```

## Support

For issues or questions:
1. Check [README.md](./README.md) for detailed docs
2. Review [example.lua](./example.lua) for usage patterns
3. Open an issue on GitHub with `:lua require("ccasp.test").snap()` output

Happy testing!
