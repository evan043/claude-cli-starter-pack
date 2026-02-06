# Example: Snapshot Regression Testing

## Workflow
1. Capture baseline snapshot
2. Make code changes
3. Capture new snapshot
4. Diff and validate

## Lua Code
```lua
local snapshot = require("ccasp.test.snapshot")

-- Capture baseline
require("ccasp").setup({ layout = "appshell" })
require("ccasp").open()
local baseline = snapshot.capture()
snapshot.to_file(baseline, "tests/artifacts/baseline.txt")
require("ccasp").close()

-- After changes, capture new state
require("ccasp").open()
local current = snapshot.capture()
snapshot.to_file(current, "tests/artifacts/current.txt")

-- Diff
local changes = snapshot.diff(baseline, current)
if #changes > 0 then
  print("Layout changes detected:")
  snapshot.print_diff(changes)
else
  print("No layout changes - safe to proceed")
end
```

## Integration with /ui-snapshot
The `/ui-snapshot` command automates this workflow. It:
1. Loads the previous snapshot from `tests/artifacts/last-snapshot.txt`
2. Captures the current layout
3. Diffs and reports changes
4. Saves the new snapshot
