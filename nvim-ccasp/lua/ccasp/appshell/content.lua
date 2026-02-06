-- ccasp/appshell/content.lua - Main Content Area Manager
-- Manages terminal windows within the appshell content zone
-- Coordinates with sessions.lua for multi-session grid layout

local M = {}

local state = {
  bounds = nil,
  initialized = false,
}

-- Open content area and create initial terminal
function M.open(bounds)
  state.bounds = bounds
  state.initialized = true

  -- Create the first terminal session in the content area
  -- We use splits (not floats) for terminal windows since terminal buffers
  -- work best in real Neovim windows, not floating windows
  local terminal = require("ccasp.terminal")
  local sessions = require("ccasp.sessions")

  if sessions.count() == 0 then
    -- Create a full-size window for terminal content
    -- First ensure we're not in a floating window
    local current_win = vim.api.nvim_get_current_win()
    local win_config = vim.api.nvim_win_get_config(current_win)

    if win_config.relative ~= "" then
      -- We're in a floating window, need to create a real buffer first
      vim.cmd("enew")
    end

    -- Create terminal
    local project_root = vim.fn.getcwd()
    vim.cmd("lcd " .. vim.fn.fnameescape(project_root))
    vim.cmd("terminal")

    local bufnr = vim.api.nvim_get_current_buf()
    local winid = vim.api.nvim_get_current_win()

    -- Apply terminal background
    vim.wo[winid].winhighlight = "Normal:CcaspTerminalBg,NormalFloat:CcaspTerminalBg,EndOfBuffer:CcaspTerminalBg"
    vim.wo[winid].scrolloff = 0

    -- Register with terminal module
    terminal._set_state(bufnr, winid)

    -- Register as primary session
    local session_id = sessions.register_primary(bufnr, winid)

    -- Launch Claude CLI
    vim.defer_fn(function()
      if vim.api.nvim_buf_is_valid(bufnr) then
        local job_id = vim.b[bufnr].terminal_job_id
        if job_id and job_id > 0 then
          vim.fn.chansend(job_id, "claude\r")
          vim.notify("Claude CLI starting...", vim.log.levels.INFO)
          vim.cmd("startinsert")

          vim.defer_fn(function()
            terminal._set_claude_running(true)
            sessions.set_claude_running(session_id, true)
          end, 3000)
        end
      end
    end, 1000)
  end
end

-- Close content area
function M.close()
  -- Don't close terminal sessions here - they're managed by sessions.lua
  state.initialized = false
  state.bounds = nil
end

-- Resize content area (recalculate session grid)
function M.resize(bounds)
  state.bounds = bounds

  if not state.initialized then return end

  -- Tell sessions module to rearrange with new bounds
  local sessions = require("ccasp.sessions")
  sessions.rearrange()
end

-- Get current content bounds
function M.get_bounds()
  return state.bounds
end

-- Get available width for terminals (used by sessions.lua)
function M.get_available_width()
  if state.bounds then
    return state.bounds.width
  end
  -- Fallback: calculate from appshell
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.width or vim.o.columns
end

-- Get available height for terminals (used by sessions.lua)
function M.get_available_height()
  if state.bounds then
    return state.bounds.height
  end
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.height or (vim.o.lines - 4)
end

return M
