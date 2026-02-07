-- ccasp/appshell/content.lua - Main Content Area Manager
-- Manages terminal windows within the appshell content zone
-- Creates spacer splits to reserve physical space for floating chrome (icon rail, footer)
-- Coordinates with sessions.lua for multi-session grid layout

local M = {}

local state = {
  bounds = nil,
  initialized = false,
  left_spacer_win = nil,
  left_spacer_buf = nil,
  bottom_spacer_win = nil,
  bottom_spacer_buf = nil,
}

-- Create spacer windows to reserve physical space for floating chrome
-- Without spacers, terminal content would be hidden behind the icon rail and footer
local function create_spacers()
  local appshell = require("ccasp.appshell")
  local config = appshell.config

  local rail_w = config.icon_rail.visible and config.icon_rail.width or 0
  local footer_h = config.footer.visible and config.footer.height or 0

  -- Left spacer for icon rail (pushes terminal content right)
  if rail_w > 0 then
    vim.cmd("topleft " .. rail_w .. "vnew")
    state.left_spacer_buf = vim.api.nvim_get_current_buf()
    state.left_spacer_win = vim.api.nvim_get_current_win()
    vim.bo[state.left_spacer_buf].buftype = "nofile"
    vim.bo[state.left_spacer_buf].bufhidden = "wipe"
    vim.bo[state.left_spacer_buf].swapfile = false
    vim.wo[state.left_spacer_win].winfixwidth = true
    vim.wo[state.left_spacer_win].number = false
    vim.wo[state.left_spacer_win].relativenumber = false
    vim.wo[state.left_spacer_win].signcolumn = "no"
    vim.wo[state.left_spacer_win].foldcolumn = "0"
    vim.wo[state.left_spacer_win].statusline = " "
    vim.wo[state.left_spacer_win].winhighlight =
      "Normal:CcaspIconRailBg,EndOfBuffer:CcaspIconRailBg,StatusLine:CcaspIconRailBg,StatusLineNC:CcaspIconRailBg"
    -- Return focus to content area
    vim.cmd("wincmd l")
  end

  -- Bottom spacer for footer (pushes terminal content up)
  if footer_h > 0 then
    vim.cmd("botright " .. footer_h .. "new")
    state.bottom_spacer_buf = vim.api.nvim_get_current_buf()
    state.bottom_spacer_win = vim.api.nvim_get_current_win()
    vim.bo[state.bottom_spacer_buf].buftype = "nofile"
    vim.bo[state.bottom_spacer_buf].bufhidden = "wipe"
    vim.bo[state.bottom_spacer_buf].swapfile = false
    vim.wo[state.bottom_spacer_win].winfixheight = true
    vim.wo[state.bottom_spacer_win].number = false
    vim.wo[state.bottom_spacer_win].relativenumber = false
    vim.wo[state.bottom_spacer_win].signcolumn = "no"
    vim.wo[state.bottom_spacer_win].foldcolumn = "0"
    vim.wo[state.bottom_spacer_win].statusline = " "
    vim.wo[state.bottom_spacer_win].winhighlight =
      "Normal:CcaspFooterBg,EndOfBuffer:CcaspFooterBg,StatusLine:CcaspFooterBg,StatusLineNC:CcaspFooterBg"
    -- Return focus to content area
    vim.cmd("wincmd k")
  end
end

-- Close spacer windows
local function close_spacers()
  if state.left_spacer_win and vim.api.nvim_win_is_valid(state.left_spacer_win) then
    vim.api.nvim_win_close(state.left_spacer_win, true)
  end
  if state.bottom_spacer_win and vim.api.nvim_win_is_valid(state.bottom_spacer_win) then
    vim.api.nvim_win_close(state.bottom_spacer_win, true)
  end
  state.left_spacer_win = nil
  state.left_spacer_buf = nil
  state.bottom_spacer_win = nil
  state.bottom_spacer_buf = nil
end

-- Open content area and create initial terminal
function M.open(bounds)
  state.bounds = bounds
  state.initialized = true

  -- Create spacer splits to reserve physical space for floating chrome
  create_spacers()

  -- Make window separators blend with appshell chrome
  vim.api.nvim_set_hl(0, "WinSeparator", { fg = "#080810", bg = "#080810" })

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
  close_spacers()
  -- Don't close terminal sessions here - they're managed by sessions.lua
  state.initialized = false
  state.bounds = nil
end

-- Resize content area (recalculate session grid)
function M.resize(bounds)
  state.bounds = bounds

  if not state.initialized then return end

  -- Resize spacers to match current config
  local appshell = require("ccasp.appshell")
  local config = appshell.config
  local rail_w = config.icon_rail.visible and config.icon_rail.width or 0
  local footer_h = config.footer.visible and config.footer.height or 0

  if state.left_spacer_win and vim.api.nvim_win_is_valid(state.left_spacer_win) then
    if rail_w > 0 then
      vim.api.nvim_win_set_width(state.left_spacer_win, rail_w)
    end
  end

  if state.bottom_spacer_win and vim.api.nvim_win_is_valid(state.bottom_spacer_win) then
    if footer_h > 0 then
      vim.api.nvim_win_set_height(state.bottom_spacer_win, footer_h)
    end
  end

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
    -- Subtract 1 for window separator between spacer and content
    local appshell = require("ccasp.appshell")
    local has_spacer = appshell.config.icon_rail.visible and 1 or 0
    return state.bounds.width - has_spacer
  end
  -- Fallback: calculate from appshell
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.width or vim.o.columns
end

-- Get available height for terminals (used by sessions.lua)
function M.get_available_height()
  if state.bounds then
    -- Subtract 1 for window separator between content and footer spacer
    local appshell = require("ccasp.appshell")
    local has_spacer = appshell.config.footer.visible and 1 or 0
    return state.bounds.height - has_spacer
  end
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.height or (vim.o.lines - 4)
end

-- Check if a window is a spacer (used by sessions.lua to exclude from arrangement)
function M.is_spacer_win(winid)
  return winid == state.left_spacer_win or winid == state.bottom_spacer_win
end

-- Get spacer window IDs
function M.get_spacer_wins()
  return {
    left = state.left_spacer_win,
    bottom = state.bottom_spacer_win,
  }
end

return M
