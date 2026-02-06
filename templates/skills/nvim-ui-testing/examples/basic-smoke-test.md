# Example: Writing a Basic Smoke Test

## File Location
`nvim-ccasp/tests/my_smoke_spec.lua`

## Template
```lua
local helpers = require("tests.helpers")

describe("My Feature Smoke Test", function()
  local env

  before_each(function()
    env = helpers.setup_test_env({ layout = "appshell" })
  end)

  after_each(function()
    helpers.cleanup()
  end)

  it("opens without errors", function()
    local errors = helpers.assert_no_errors(function()
      require("ccasp").open()
    end)
    assert.equals(0, #errors)
  end)

  it("creates expected floating windows", function()
    require("ccasp").open()
    local floats = helpers.get_float_windows()
    assert.truthy(#floats >= 3, "Expected at least 3 floating windows")
  end)

  it("closes cleanly", function()
    require("ccasp").open()
    require("ccasp").close()
    local floats = helpers.get_float_windows()
    assert.equals(0, #floats, "All windows should be closed")
  end)
end)
```

## Running
```powershell
nvim --headless -c "PlenaryBustedFile nvim-ccasp/tests/my_smoke_spec.lua"
```
