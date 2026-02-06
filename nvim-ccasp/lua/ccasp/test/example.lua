-- ccasp/test/example.lua - Example usage of test infrastructure
-- Demonstrates how to use driver.lua and snapshot.lua for UI testing

local M = {}

-- Example 1: Simple smoke test
function M.simple_smoke_test()
  local driver = require("ccasp.test.driver")

  print("Running simple smoke test...")

  -- Open appshell
  if not driver.open("appshell") then
    print("Failed to open appshell")
    driver.print_errors()
    return false
  end

  -- Wait and check floats
  vim.wait(500, function() return false end)
  local floats = driver.get_floats()
  print(string.format("Floating windows: %d", #floats))

  -- Close
  driver.close()

  print("Simple smoke test complete")
  return true
end

-- Example 2: Full smoke traversal with results
function M.full_smoke_test()
  local driver = require("ccasp.test.driver")

  print("Running full smoke test...")

  local results = driver.full_smoke()
  driver.print_smoke_results(results)

  return results.failed == 0
end

-- Example 3: Capture snapshots and compare
function M.snapshot_comparison_test()
  local driver = require("ccasp.test.driver")
  local snapshot = require("ccasp.test.snapshot")

  print("Running snapshot comparison test...")

  -- Open appshell and capture initial state
  driver.open("appshell")
  vim.wait(500, function() return false end)

  local snap1 = snapshot.capture()
  print("\nSnapshot 1 captured:")
  snapshot.print(snap1)

  -- Make some changes
  driver.select_section(2)
  driver.open_flyout("commands")
  vim.wait(500, function() return false end)

  local snap2 = snapshot.capture()
  print("\nSnapshot 2 captured:")
  snapshot.print(snap2)

  -- Compare
  print("\nComparing snapshots:")
  snapshot.print_diff(snap1, snap2)

  -- Cleanup
  driver.close()

  return true
end

-- Example 4: Session spawn test
function M.session_spawn_test()
  local driver = require("ccasp.test.driver")

  print("Running session spawn test...")

  -- Open appshell
  driver.open("appshell")
  vim.wait(500, function() return false end)

  local initial_count = driver.get_session_count()
  print(string.format("Initial sessions: %d", initial_count))

  -- Spawn new session
  local session_id = driver.spawn_session()
  if not session_id then
    print("Failed to spawn session")
    driver.print_errors()
    driver.close()
    return false
  end

  local new_count = driver.get_session_count()
  print(string.format("Sessions after spawn: %d", new_count))

  local success = new_count == initial_count + 1
  print(string.format("Session spawn: %s", success and "PASSED" or "FAILED"))

  -- Cleanup
  driver.close()

  return success
end

-- Example 5: Save snapshot to file
function M.snapshot_to_file_test()
  local driver = require("ccasp.test.driver")
  local snapshot = require("ccasp.test.snapshot")

  print("Running snapshot-to-file test...")

  -- Open appshell
  driver.open("appshell")
  vim.wait(500, function() return false end)

  -- Capture and save
  local filepath = vim.fn.tempname() .. "_ccasp_snapshot.txt"
  local ok, err = snapshot.capture_to_file(filepath)

  if not ok then
    print(string.format("Failed to save snapshot: %s", err))
    driver.close()
    return false
  end

  print(string.format("Snapshot saved to: %s", filepath))

  -- Verify file exists
  local file_exists = vim.fn.filereadable(filepath) == 1
  print(string.format("File exists: %s", file_exists and "yes" or "no"))

  -- Cleanup
  driver.close()

  return file_exists
end

-- Run all tests
function M.run_all()
  local tests = {
    { name = "Simple Smoke Test", fn = M.simple_smoke_test },
    { name = "Full Smoke Test", fn = M.full_smoke_test },
    { name = "Snapshot Comparison", fn = M.snapshot_comparison_test },
    { name = "Session Spawn", fn = M.session_spawn_test },
    { name = "Snapshot to File", fn = M.snapshot_to_file_test },
  }

  print("=== Running All CCASP Tests ===\n")

  local passed = 0
  local failed = 0

  for i, test in ipairs(tests) do
    print(string.format("\n[%d/%d] Running: %s", i, #tests, test.name))
    print(string.rep("-", 60))

    local ok, result = pcall(test.fn)

    if ok and result then
      passed = passed + 1
      print(string.format("✓ %s PASSED", test.name))
    else
      failed = failed + 1
      print(string.format("✗ %s FAILED: %s", test.name, tostring(result)))
    end

    -- Wait between tests
    vim.wait(1000, function() return false end)
  end

  print("\n" .. string.rep("=", 60))
  print(string.format("Test Results: %d passed, %d failed (total %d)", passed, failed, #tests))
  print(string.rep("=", 60))

  return failed == 0
end

return M
