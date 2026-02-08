-- ccasp/appshell/content.lua - Main Content Area Manager
-- Manages terminal windows within the appshell content zone
-- Creates spacer splits to reserve physical space for floating chrome (header, icon rail, footer)
-- Coordinates with sessions.lua for multi-session grid layout

local M = {}

local state = {
  bounds = nil,
  initialized = false,
  top_spacer_win = nil,
  top_spacer_buf = nil,
  left_spacer_win = nil,
  left_spacer_buf = nil,
  bottom_spacer_win = nil,
  bottom_spacer_buf = nil,
}

-- Create spacer windows to reserve physical space for floating chrome
-- Without spacers, terminal content would be hidden behind the header, icon rail, and footer
local function create_spacers()
  local appshell = require("ccasp.appshell")
  local config = appshell.config

  local header_h = config.header.visible and config.header.height or 0
  local rail_w = config.icon_rail.visible and config.icon_rail.width or 0
  local footer_h = config.footer.visible and config.footer.height or 0

  -- Save the content window ID BEFORE creating any spacer splits.
  -- wincmd navigation is unreliable after multiple splits (cursor column
  -- determines which window "up" lands in). Using an explicit ID is safe.
  local content_win = vim.api.nvim_get_current_win()

  -- Left spacer for icon rail (pushes terminal content right)
  if rail_w > 0 then
    vim.cmd("silent topleft " .. rail_w .. "vnew")
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
  end

  -- Bottom spacer for footer (pushes terminal content up)
  if footer_h > 0 then
    vim.cmd("silent botright " .. footer_h .. "new")
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
  end

  -- Return to content window before creating top spacer (aboveleft is relative)
  vim.api.nvim_set_current_win(content_win)

  -- Top spacer for header (pushes terminal content below header float)
  -- Created AFTER left/bottom so aboveleft places it above content_win,
  -- within the right column (not spanning the left spacer)
  if header_h > 0 then
    vim.cmd("silent aboveleft " .. header_h .. "new")
    state.top_spacer_buf = vim.api.nvim_get_current_buf()
    state.top_spacer_win = vim.api.nvim_get_current_win()
    vim.bo[state.top_spacer_buf].buftype = "nofile"
    vim.bo[state.top_spacer_buf].bufhidden = "wipe"
    vim.bo[state.top_spacer_buf].swapfile = false
    vim.wo[state.top_spacer_win].winfixheight = true
    vim.wo[state.top_spacer_win].number = false
    vim.wo[state.top_spacer_win].relativenumber = false
    vim.wo[state.top_spacer_win].signcolumn = "no"
    vim.wo[state.top_spacer_win].foldcolumn = "0"
    vim.wo[state.top_spacer_win].statusline = " "
    vim.wo[state.top_spacer_win].winbar = " "
    vim.wo[state.top_spacer_win].winhighlight =
      "Normal:CcaspHeaderBg,EndOfBuffer:CcaspHeaderBg,StatusLine:CcaspHeaderBg,StatusLineNC:CcaspHeaderBg"
  end

  -- Always return to the content window using its saved ID
  -- (wincmd k/l is unreliable when cursor column falls under a spacer)
  vim.api.nvim_set_current_win(content_win)
end

-- Close spacer windows
local function close_spacers()
  if state.top_spacer_win and vim.api.nvim_win_is_valid(state.top_spacer_win) then
    vim.api.nvim_win_close(state.top_spacer_win, true)
  end
  if state.left_spacer_win and vim.api.nvim_win_is_valid(state.left_spacer_win) then
    vim.api.nvim_win_close(state.left_spacer_win, true)
  end
  if state.bottom_spacer_win and vim.api.nvim_win_is_valid(state.bottom_spacer_win) then
    vim.api.nvim_win_close(state.bottom_spacer_win, true)
  end
  state.top_spacer_win = nil
  state.top_spacer_buf = nil
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
  vim.api.nvim_set_hl(0, "WinSeparator", { fg = "#0d1117", bg = "#0d1117" })

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
      vim.cmd("silent enew")
    end

    -- Create terminal
    local project_root = vim.fn.getcwd()
    vim.cmd("silent lcd " .. vim.fn.fnameescape(project_root))
    vim.cmd("silent terminal")

    local bufnr = vim.api.nvim_get_current_buf()
    local winid = vim.api.nvim_get_current_win()

    -- Keep terminal buffer alive when its window is closed (layer switching).
    vim.bo[bufnr].bufhidden = "hide"

    -- Apply terminal window options
    vim.wo[winid].scrolloff = 0
    vim.wo[winid].statusline = " "
    vim.wo[winid].number = false
    vim.wo[winid].relativenumber = false
    vim.wo[winid].signcolumn = "no"
    vim.wo[winid].foldcolumn = "0"

    -- Register with terminal module
    terminal._set_state(bufnr, winid)

    -- Register as primary session
    local session_id = sessions.register_primary(bufnr, winid)

    -- Initialize layer system (creates Layer 1 for the first session)
    local layers_ok, layers = pcall(require, "ccasp.layers")
    if layers_ok then layers.init() end

    -- Set winbar + winhighlight SYNCHRONOUSLY right after registration
    -- (deferred callbacks can fail silently when cmdheight=0)
    local tb_ok, tb = pcall(require, "ccasp.session_titlebar")
    if tb_ok then
      tb.update(session_id)
    else
      -- Fallback: set a minimal winbar directly if titlebar module fails
      vim.wo[winid].winbar = "  Claude 1"
      vim.wo[winid].winhighlight = "Normal:CcaspTerminalBg,NormalFloat:CcaspTerminalBg,EndOfBuffer:CcaspTerminalBg"
    end

    -- Refresh footer to show the new session tab
    vim.schedule(function()
      local ft_ok, footer = pcall(require, "ccasp.appshell.footer")
      if ft_ok then footer.refresh() end
    end)

    -- Launch Claude CLI
    -- Use longer delay in Neovide (GUI renders asynchronously, terminal needs more init time)
    local launch_delay = vim.g.neovide and 2500 or 1000
    vim.defer_fn(function()
      if vim.api.nvim_buf_is_valid(bufnr) then
        local job_id = vim.b[bufnr].terminal_job_id
        if job_id and job_id > 0 then
          vim.fn.chansend(job_id, "claude\r")
          -- Suppressed: cmdheight=0 turns vim.notify into "Press ENTER" prompt
          -- Only enter insert mode if the terminal window still has focus.
          -- The onboarding panel may have opened on top, stealing focus.
          -- Blindly calling startinsert would put INSERT mode on the wrong buffer.
          if vim.api.nvim_win_is_valid(winid) and vim.api.nvim_get_current_win() == winid then
            vim.cmd("startinsert")
          end

          vim.defer_fn(function()
            terminal._set_claude_running(true)
            sessions.set_claude_running(session_id, true)
          end, 3000)
        end
      end
    end, launch_delay)

    -- Apply default layout template on startup (after initial session stabilizes)
    vim.defer_fn(function()
      local tmpl_ok, tmpl = pcall(require, "ccasp.layout_templates")
      if tmpl_ok then
        local default_tmpl = tmpl.get_default()
        if default_tmpl then
          tmpl.apply(default_tmpl.name)
        end
      end
    end, vim.g.neovide and 3500 or 2500)
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
  local header_h = config.header.visible and config.header.height or 0
  local rail_w = config.icon_rail.visible and config.icon_rail.width or 0
  local flyout_w = config.flyout.visible and config.flyout.width or 0
  local spacer_w = rail_w + flyout_w -- Reserve space for both rail and flyout
  local footer_h = config.footer.visible and config.footer.height or 0

  if state.top_spacer_win and vim.api.nvim_win_is_valid(state.top_spacer_win) then
    if header_h > 0 then
      vim.wo[state.top_spacer_win].winfixheight = false
      vim.api.nvim_win_set_height(state.top_spacer_win, header_h)
      vim.wo[state.top_spacer_win].winfixheight = true
    end
  end

  if state.left_spacer_win and vim.api.nvim_win_is_valid(state.left_spacer_win) then
    if spacer_w > 0 then
      -- Temporarily unset winfixwidth to allow resize, then re-lock
      vim.wo[state.left_spacer_win].winfixwidth = false
      vim.api.nvim_win_set_width(state.left_spacer_win, spacer_w)
      vim.wo[state.left_spacer_win].winfixwidth = true
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
    -- Subtract separator + flyout width (when open, spacer is wider)
    local appshell = require("ccasp.appshell")
    local has_spacer = appshell.config.icon_rail.visible and 1 or 0
    local flyout_w = appshell.config.flyout.visible and appshell.config.flyout.width or 0
    return state.bounds.width - has_spacer - flyout_w
  end
  -- Fallback: calculate from appshell
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.width or vim.o.columns
end

-- Get available height for terminals (used by sessions.lua)
function M.get_available_height()
  if state.bounds then
    -- Subtract separators between spacers and content area
    local appshell = require("ccasp.appshell")
    local has_top = appshell.config.header.visible and 1 or 0
    local has_bottom = appshell.config.footer.visible and 1 or 0
    return state.bounds.height - has_top - has_bottom
  end
  local appshell = require("ccasp.appshell")
  local zone = appshell.get_zone_bounds("content")
  return zone and zone.height or (vim.o.lines - 4)
end

-- Check if a window is a spacer (used by sessions.lua to exclude from arrangement)
function M.is_spacer_win(winid)
  return winid == state.top_spacer_win
      or winid == state.left_spacer_win
      or winid == state.bottom_spacer_win
end

-- Get spacer window IDs
function M.get_spacer_wins()
  return {
    top = state.top_spacer_win,
    left = state.left_spacer_win,
    bottom = state.bottom_spacer_win,
  }
end

return M
