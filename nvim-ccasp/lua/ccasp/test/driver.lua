-- ccasp/test/driver.lua - UI Test Driver for CCASP
-- Automates CCASP interactions for smoke testing and UI validation
-- Provides safe, error-handled operations for opening, navigating, and closing CCASP components

local M = {}

-- Error tracking
M.errors = {}

-- Safe require with error capture
local function safe_require(mod_name)
  local ok, module = pcall(require, mod_name)
  if not ok then
    local err = string.format("Failed to load %s: %s", mod_name, tostring(module))
    table.insert(M.errors, err)
    return nil
  end
  return module
end

-- Safe wait helper (protects against invalid wait durations)
local function safe_wait(ms)
  ms = ms or 100
  if ms < 0 then ms = 0 end
  if ms > 5000 then ms = 5000 end -- cap at 5s for safety

  local ok, err = pcall(vim.wait, ms, function() return false end)
  if not ok then
    table.insert(M.errors, string.format("Wait failed: %s", tostring(err)))
  end
end

-- Open CCASP with specified layout
-- @param layout string: "classic", "modern", or "appshell" (default: "appshell")
-- @return boolean: success status
function M.open(layout)
  layout = layout or "appshell"

  local ok, err = pcall(function()
    local ccasp = safe_require("ccasp")
    if not ccasp then
      error("CCASP module not available")
    end

    ccasp.setup({ layout = layout })
    ccasp.open()
  end)

  if not ok then
    table.insert(M.errors, string.format("Open failed: %s", tostring(err)))
    return false
  end

  -- Wait for deferred UI components to settle
  safe_wait(500)
  return true
end

-- Close CCASP and cleanup all floating windows
-- @return boolean: success status
function M.close()
  local ok, err = pcall(function()
    local ccasp = safe_require("ccasp")
    if ccasp then
      pcall(ccasp.close)
    end

    -- Force close any remaining floating windows
    for _, winid in ipairs(vim.api.nvim_list_wins()) do
      if vim.api.nvim_win_is_valid(winid) then
        local config = vim.api.nvim_win_get_config(winid)
        if config.relative and config.relative ~= "" then
          pcall(vim.api.nvim_win_close, winid, true)
        end
      end
    end
  end)

  if not ok then
    table.insert(M.errors, string.format("Close failed: %s", tostring(err)))
  end

  safe_wait(200)
  return ok
end

-- Navigate to icon rail section by index (1-5)
-- @param index number: Section index (1=terminal, 2=commands, 3=todos, 4=agents, 5=settings)
-- @return boolean: success status
function M.select_section(index)
  if type(index) ~= "number" or index < 1 or index > 5 then
    local err = string.format("Invalid section index: %s (must be 1-5)", tostring(index))
    table.insert(M.errors, err)
    return false
  end

  local ok, err = pcall(function()
    local icon_rail = safe_require("ccasp.appshell.icon_rail")
    if not icon_rail then
      error("Icon rail module not available")
    end

    icon_rail.select(index)
  end)

  if not ok then
    table.insert(M.errors, string.format("Select section %d failed: %s", index, tostring(err)))
    return false
  end

  safe_wait(300)
  return true
end

-- Open flyout for a named section
-- @param section string: Section name (e.g., "terminal", "commands", "todos")
-- @return boolean: success status
function M.open_flyout(section)
  if type(section) ~= "string" or section == "" then
    table.insert(M.errors, string.format("Invalid section name: %s", tostring(section)))
    return false
  end

  local ok, err = pcall(function()
    local appshell = safe_require("ccasp.appshell")
    if not appshell then
      error("Appshell module not available")
    end

    appshell.toggle_flyout(section)
  end)

  if not ok then
    table.insert(M.errors, string.format("Open flyout '%s' failed: %s", section, tostring(err)))
    return false
  end

  safe_wait(300)
  return true
end

-- Close flyout if open
-- @return boolean: success status
function M.close_flyout()
  local ok, err = pcall(function()
    local flyout = safe_require("ccasp.appshell.flyout")
    if not flyout then
      return -- silently skip if module not loaded
    end

    if flyout.is_open and flyout.is_open() then
      flyout.close()
    end
  end)

  if not ok then
    table.insert(M.errors, string.format("Close flyout failed: %s", tostring(err)))
    return false
  end

  safe_wait(200)
  return true
end

-- Toggle right panel
-- @return boolean: success status
function M.toggle_right_panel()
  local ok, err = pcall(function()
    local appshell = safe_require("ccasp.appshell")
    if not appshell then
      error("Appshell module not available")
    end

    appshell.toggle_right_panel()
  end)

  if not ok then
    table.insert(M.errors, string.format("Toggle right panel failed: %s", tostring(err)))
    return false
  end

  safe_wait(300)
  return true
end

-- Execute a CCASP command by name (e.g., "CcaspOpen", "CcaspClose")
-- @param cmd_name string: Command name
-- @return boolean: success status
-- @return string|nil: error message if failed
function M.exec_command(cmd_name)
  if type(cmd_name) ~= "string" or cmd_name == "" then
    local err = string.format("Invalid command name: %s", tostring(cmd_name))
    table.insert(M.errors, err)
    return false, err
  end

  local ok, err = pcall(vim.cmd, cmd_name)
  if not ok then
    local err_msg = string.format("Command '%s' failed: %s", cmd_name, tostring(err))
    table.insert(M.errors, err_msg)
    return false, err_msg
  end

  safe_wait(300)
  return true, nil
end

-- Get all floating windows with their configurations
-- @return table: Array of floating window info tables
function M.get_floats()
  local floats = {}

  local ok, err = pcall(function()
    for _, winid in ipairs(vim.api.nvim_list_wins()) do
      if vim.api.nvim_win_is_valid(winid) then
        local config = vim.api.nvim_win_get_config(winid)
        if config.relative and config.relative ~= "" then
          local bufnr = vim.api.nvim_win_get_buf(winid)

          -- Handle row/col that might be tables or numbers
          local row = config.row
          if type(row) == "table" then
            row = row[false] or 0
          end

          local col = config.col
          if type(col) == "table" then
            col = col[false] or 0
          end

          table.insert(floats, {
            winid = winid,
            bufnr = bufnr,
            bufname = vim.api.nvim_buf_get_name(bufnr),
            filetype = vim.bo[bufnr].filetype or "",
            row = row,
            col = col,
            width = config.width or 0,
            height = config.height or 0,
            zindex = config.zindex or 50,
            border = config.border or "none",
            relative = config.relative,
          })
        end
      end
    end
  end)

  if not ok then
    table.insert(M.errors, string.format("Get floats failed: %s", tostring(err)))
  end

  return floats
end

-- Check if icon rail is visible
-- @return boolean: true if icon rail exists and is valid
function M.is_rail_visible()
  local ok, result = pcall(function()
    local icon_rail = safe_require("ccasp.appshell.icon_rail")
    if not icon_rail or not icon_rail.get_win then
      return false
    end

    local winid = icon_rail.get_win()
    return winid and vim.api.nvim_win_is_valid(winid)
  end)

  if not ok then
    return false
  end

  return result
end

-- Check if flyout is visible
-- @return boolean: true if flyout is open
function M.is_flyout_visible()
  local ok, result = pcall(function()
    local flyout = safe_require("ccasp.appshell.flyout")
    if not flyout or not flyout.is_open then
      return false
    end

    return flyout.is_open()
  end)

  if not ok then
    return false
  end

  return result
end

-- Get count of active Claude sessions
-- @return number: Number of active sessions
function M.get_session_count()
  local ok, count = pcall(function()
    local sessions = safe_require("ccasp.sessions")
    if not sessions or not sessions.count then
      return 0
    end

    return sessions.count()
  end)

  if not ok then
    return 0
  end

  return count
end

-- Clear error log
function M.clear_errors()
  M.errors = {}
end

-- Get error log
-- @return table: Array of error messages
function M.get_errors()
  return vim.deepcopy(M.errors)
end

-- Print error log to messages
function M.print_errors()
  if #M.errors == 0 then
    print("No errors recorded")
    return
  end

  print("Test driver errors:")
  for i, err in ipairs(M.errors) do
    print(string.format("  [%d] %s", i, err))
  end
end

-- Run a full smoke traversal: open, visit each section, toggle flyout, close
-- @return table: Results with steps and errors
function M.full_smoke()
  M.clear_errors()

  local results = {
    steps = {},
    errors = {},
    passed = 0,
    failed = 0,
  }

  local function record_step(name, ok, extra)
    local step = { name = name, ok = ok }
    if extra then
      for k, v in pairs(extra) do
        step[k] = v
      end
    end
    table.insert(results.steps, step)

    if ok then
      results.passed = results.passed + 1
    else
      results.failed = results.failed + 1
      if extra and extra.error then
        table.insert(results.errors, string.format("%s: %s", name, extra.error))
      end
    end
  end

  -- Step 1: Open appshell
  local ok = M.open("appshell")
  record_step("open", ok, { error = ok and nil or "Failed to open appshell" })
  if not ok then
    results.summary = "Failed at open step"
    return results
  end

  -- Step 2: Verify floats exist (icon rail should be visible)
  safe_wait(500)
  local floats = M.get_floats()
  local rail_visible = M.is_rail_visible()
  record_step("check_floats", #floats > 0 and rail_visible, {
    count = #floats,
    rail_visible = rail_visible,
    error = (#floats == 0 or not rail_visible) and "No floating windows or rail not visible" or nil
  })

  -- Step 3: Visit each section (1-5)
  for i = 1, 5 do
    ok = M.select_section(i)
    record_step("section_" .. i, ok, {
      error = ok and nil or string.format("Failed to select section %d", i)
    })
    safe_wait(200)
  end

  -- Step 4: Test flyout toggle
  ok = M.open_flyout("terminal")
  record_step("open_flyout", ok, {
    error = ok and nil or "Failed to open flyout"
  })
  safe_wait(300)

  local flyout_visible = M.is_flyout_visible()
  record_step("flyout_visible", flyout_visible, {
    error = flyout_visible and nil or "Flyout not visible after open"
  })

  ok = M.close_flyout()
  record_step("close_flyout", ok, {
    error = ok and nil or "Failed to close flyout"
  })

  -- Step 5: Toggle right panel (on and off)
  ok = M.toggle_right_panel()
  record_step("right_panel_on", ok, {
    error = ok and nil or "Failed to toggle right panel on"
  })
  safe_wait(300)

  ok = M.toggle_right_panel()
  record_step("right_panel_off", ok, {
    error = ok and nil or "Failed to toggle right panel off"
  })

  -- Step 6: Close appshell
  ok = M.close()
  record_step("close", ok, {
    error = ok and nil or "Failed to close appshell"
  })
  safe_wait(500)

  -- Step 7: Verify clean state (no floating windows remaining)
  floats = M.get_floats()
  local clean = #floats == 0
  record_step("clean_state", clean, {
    remaining = #floats,
    error = clean and nil or string.format("%d floating windows still open", #floats)
  })

  -- Generate summary
  results.summary = string.format(
    "Completed: %d passed, %d failed (total %d steps)",
    results.passed,
    results.failed,
    #results.steps
  )

  return results
end

-- Print smoke test results in readable format
-- @param results table: Results from full_smoke()
function M.print_smoke_results(results)
  if not results or not results.steps then
    print("No results to print")
    return
  end

  print("=== CCASP Smoke Test Results ===")
  print(results.summary)
  print("")

  if #results.errors > 0 then
    print("Errors:")
    for i, err in ipairs(results.errors) do
      print(string.format("  [%d] %s", i, err))
    end
    print("")
  end

  print("Steps:")
  for i, step in ipairs(results.steps) do
    local status = step.ok and "✓" or "✗"
    local extra = ""
    if step.count then extra = extra .. string.format(" (count=%d)", step.count) end
    if step.remaining then extra = extra .. string.format(" (remaining=%d)", step.remaining) end
    if step.rail_visible ~= nil then extra = extra .. string.format(" (rail=%s)", step.rail_visible and "yes" or "no") end

    print(string.format("  [%2d] %s %s%s", i, status, step.name, extra))
  end

  print("")
  print(string.format("Result: %s", results.failed == 0 and "PASSED" or "FAILED"))
end

-- Spawn a new Claude session (for multi-session testing)
-- @return string|nil: session ID if successful
function M.spawn_session()
  local ok, result = pcall(function()
    local sessions = safe_require("ccasp.sessions")
    if not sessions or not sessions.spawn then
      error("Sessions module not available")
    end

    return sessions.spawn()
  end)

  if not ok then
    table.insert(M.errors, string.format("Spawn session failed: %s", tostring(result)))
    return nil
  end

  safe_wait(1000) -- Wait for session to fully initialize
  return result
end

-- Focus a specific session by ID
-- @param id string: Session ID
-- @return boolean: success status
function M.focus_session(id)
  if not id then
    table.insert(M.errors, "Session ID required")
    return false
  end

  local ok, err = pcall(function()
    local sessions = safe_require("ccasp.sessions")
    if not sessions or not sessions.focus then
      error("Sessions module not available")
    end

    sessions.focus(id)
  end)

  if not ok then
    table.insert(M.errors, string.format("Focus session failed: %s", tostring(err)))
    return false
  end

  safe_wait(200)
  return true
end

return M
