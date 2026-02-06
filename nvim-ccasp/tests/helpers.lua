-- Test helpers for nvim-ccasp
-- Provides utilities for setting up test environments and assertions

local M = {}

-- Setup minimal test environment for ccasp
function M.setup_test_env()
  local ok, ccasp = pcall(require, "ccasp")
  if not ok then
    error("Failed to require ccasp: " .. tostring(ccasp))
  end

  -- Minimal config for testing
  local config = {
    layout = "appshell",
    appshell = {
      icon_rail = { width = 3, visible = true },
      flyout = { width = 30, visible = false },
      header = { height = 1, visible = true },
      footer = { height = 1, visible = true },
      right_panel = { width = 40, visible = false },
    },
    keymaps = {
      enabled = true,
    },
  }

  local setup_ok, setup_err = pcall(ccasp.setup, config)
  if not setup_ok then
    error("Failed to setup ccasp: " .. tostring(setup_err))
  end

  return ccasp
end

-- Wrap a test function in clean state setup/teardown
function M.with_clean_state(fn)
  return function()
    -- Clear any existing state
    M.cleanup()
    vim.api.nvim_command("silent! %bwipeout!")
    vim.v.errmsg = ""

    -- Run the test
    local ok, err = pcall(fn)

    -- Cleanup after test
    M.cleanup()

    -- Re-throw error if test failed
    if not ok then
      error(err)
    end
  end
end

-- Poll-based wait to avoid timing flakes
-- condition_fn: function that returns true when condition is met
-- timeout_ms: maximum time to wait (default 1000ms)
-- interval_ms: polling interval (default 50ms)
function M.wait_for(condition_fn, timeout_ms, interval_ms)
  timeout_ms = timeout_ms or 1000
  interval_ms = interval_ms or 50

  local start_time = vim.loop.now()
  while vim.loop.now() - start_time < timeout_ms do
    if condition_fn() then
      return true
    end
    vim.wait(interval_ms)
  end

  return false
end

-- Get all windows with metadata
function M.get_all_windows()
  local windows = {}
  for _, winid in ipairs(vim.api.nvim_list_wins()) do
    local bufnr = vim.api.nvim_win_get_buf(winid)
    local bufname = vim.api.nvim_buf_get_name(bufnr)
    local filetype = vim.api.nvim_buf_get_option(bufnr, "filetype")
    local win_config = vim.api.nvim_win_get_config(winid)
    local is_float = win_config.relative ~= ""

    table.insert(windows, {
      winid = winid,
      bufnr = bufnr,
      bufname = bufname,
      filetype = filetype,
      is_float = is_float,
      float_config = is_float and win_config or nil,
    })
  end
  return windows
end

-- Get only floating windows
function M.get_float_windows()
  local float_windows = {}
  for _, win in ipairs(M.get_all_windows()) do
    if win.is_float then
      table.insert(float_windows, win)
    end
  end
  return float_windows
end

-- Assert that a window with matching bufname exists
function M.assert_window_exists(name_pattern)
  local windows = M.get_all_windows()
  for _, win in ipairs(windows) do
    if string.match(win.bufname, name_pattern) or string.match(win.filetype, name_pattern) then
      return true
    end
  end
  error(string.format("No window found matching pattern: %s", name_pattern))
end

-- Check that no errors occurred
function M.assert_no_errors()
  local errmsg = vim.v.errmsg
  if errmsg ~= "" then
    error(string.format("Unexpected error: %s", errmsg))
  end
end

-- Cleanup all windows and reset state
function M.cleanup()
  -- Close all floating windows
  for _, win in ipairs(M.get_float_windows()) do
    pcall(vim.api.nvim_win_close, win.winid, true)
  end

  -- Try to close ccasp if it's loaded
  local ok, ccasp = pcall(require, "ccasp")
  if ok and ccasp.close then
    pcall(ccasp.close)
  end

  -- Clear error message
  vim.v.errmsg = ""
end

return M
