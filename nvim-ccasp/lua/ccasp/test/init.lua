-- ccasp/test/init.lua - Test Infrastructure Entry Point
-- Provides convenient access to all test modules

local M = {}

-- Lazy-load test modules
M.driver = nil
M.snapshot = nil
M.example = nil

-- Get driver module
function M.get_driver()
  if not M.driver then
    M.driver = require("ccasp.test.driver")
  end
  return M.driver
end

-- Get snapshot module
function M.get_snapshot()
  if not M.snapshot then
    M.snapshot = require("ccasp.test.snapshot")
  end
  return M.snapshot
end

-- Get example module
function M.get_example()
  if not M.example then
    M.example = require("ccasp.test.example")
  end
  return M.example
end

-- Convenience functions (forward to driver)

-- Run smoke test
function M.smoke()
  local driver = M.get_driver()
  local results = driver.full_smoke()
  driver.print_smoke_results(results)
  return results
end

-- Capture and print snapshot
function M.snap()
  local snapshot = M.get_snapshot()
  local snap = snapshot.capture()
  snapshot.print(snap)
  return snap
end

-- Run all example tests
function M.test_all()
  local example = M.get_example()
  return example.run_all()
end

-- Quick open/close for manual testing
function M.open(layout)
  local driver = M.get_driver()
  return driver.open(layout or "appshell")
end

function M.close()
  local driver = M.get_driver()
  return driver.close()
end

-- Compare current state to a saved snapshot file
function M.compare_to_file(filepath)
  if not filepath or not vim.fn.filereadable(filepath) then
    print("Error: Invalid or unreadable file: " .. tostring(filepath))
    return nil
  end

  -- Can't easily deserialize the snapshot, so just print current state
  print("Current state:")
  M.snap()
  print("\nCompare manually with: " .. filepath)

  return true
end

-- Capture and save snapshot to file
function M.save_snap(filepath)
  local snapshot = M.get_snapshot()

  if not filepath then
    filepath = vim.fn.tempname() .. "_ccasp_snapshot.txt"
  end

  local ok, err = snapshot.capture_to_file(filepath)

  if not ok then
    print("Error saving snapshot: " .. tostring(err))
    return false
  end

  print("Snapshot saved to: " .. filepath)
  return filepath
end

-- Print help
function M.help()
  print([[
CCASP Test Infrastructure

Quick Commands:
  require("ccasp.test").smoke()              -- Run smoke test
  require("ccasp.test").snap()               -- Capture and print snapshot
  require("ccasp.test").test_all()           -- Run all example tests
  require("ccasp.test").save_snap()          -- Save snapshot to temp file
  require("ccasp.test").save_snap("/path")   -- Save to specific file

Modules:
  require("ccasp.test").get_driver()         -- UI test driver
  require("ccasp.test").get_snapshot()       -- Snapshot utility
  require("ccasp.test").get_example()        -- Example tests

Manual Testing:
  require("ccasp.test").open("appshell")     -- Open CCASP
  require("ccasp.test").close()              -- Close CCASP

For detailed docs, see: lua/ccasp/test/README.md
  ]])
end

return M
