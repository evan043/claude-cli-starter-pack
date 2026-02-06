# Example: UI Driver Validation

## Scenario
The ui-driver agent validates that opening the appshell creates the expected floating windows.

## Driver Script (Lua)
```lua
local driver = require("ccasp.test.driver")

-- Open appshell
driver.open({ layout = "appshell" })

-- Validate zones exist
local floats = driver.get_floats()
assert(#floats >= 3, "Expected at least 3 floating windows")

-- Check icon rail
local rail = driver.find_float("icon_rail")
assert(rail, "Icon rail not found")
assert(rail.config.width == 3, "Icon rail should be 3 columns wide")

-- Toggle flyout
driver.open_flyout("terminal")
local flyout = driver.find_float("flyout")
assert(flyout, "Flyout should be open")

-- Close and verify cleanup
driver.close()
local remaining = driver.get_floats()
assert(#remaining == 0, "All floats should be closed")
```

## Expected Agent Output
```
UI Driver Report:
  Setup: appshell opened successfully
  Floats: 4 (icon_rail, header, footer, flyout)
  Validation: 4/4 checks passed
  Teardown: clean (0 remaining windows)
  Result: PASS
```
