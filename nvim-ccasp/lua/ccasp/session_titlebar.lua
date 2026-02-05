-- CCASP Session Title Bar
-- Uses winbar (window-local statusline at top) for session titles
-- Much simpler and more reliable than floating windows

local M = {}

-- Available colors for title bars
M.colors = {
  { name = "Blue", fg = "#61afef", bg = "#1e3a5f" },
  { name = "Green", fg = "#98c379", bg = "#1e3a2a" },
  { name = "Purple", fg = "#c678dd", bg = "#3a1e5f" },
  { name = "Orange", fg = "#e5c07b", bg = "#5f3a1e" },
  { name = "Red", fg = "#e06c75", bg = "#5f1e1e" },
  { name = "Cyan", fg = "#56b6c2", bg = "#1e4a5f" },
  { name = "Pink", fg = "#ff79c6", bg = "#5f1e4a" },
  { name = "Yellow", fg = "#ffff00", bg = "#4a4a1e" },
}

-- Session color assignments
local session_colors = {} -- { session_id = color_idx }

-- Minimized sessions storage
local minimized = {} -- { session_id = { name, color_idx, bufnr } }

-- Active session border color (bright cyan/green for visibility)
local ACTIVE_BORDER_COLOR = "#00ff88"
local INACTIVE_BORDER_COLOR = "#3e4452"

-- Create highlight groups for each color
local function setup_highlights()
  for i, color in ipairs(M.colors) do
    vim.api.nvim_set_hl(0, "CcaspWinbar" .. i, {
      fg = color.fg,
      bg = color.bg,
      bold = true,
    })
    vim.api.nvim_set_hl(0, "CcaspWinbarBtn" .. i, {
      fg = "#ffff00",
      bg = color.bg,
      bold = true,
    })
    -- Active version (brighter, with indicator)
    vim.api.nvim_set_hl(0, "CcaspWinbarActive" .. i, {
      fg = "#ffffff",
      bg = color.bg,
      bold = true,
    })
  end
  -- Default
  vim.api.nvim_set_hl(0, "CcaspWinbarDefault", {
    fg = "#abb2bf",
    bg = "#3e4452",
    bold = true,
  })

  -- Active window border highlight
  vim.api.nvim_set_hl(0, "CcaspActiveBorder", {
    fg = ACTIVE_BORDER_COLOR,
    bg = nil,
    bold = true,
  })

  -- Inactive window border
  vim.api.nvim_set_hl(0, "CcaspInactiveBorder", {
    fg = INACTIVE_BORDER_COLOR,
    bg = nil,
  })
end

-- Get or assign color for session
local function get_color_idx(session_id)
  if session_colors[session_id] then
    return session_colors[session_id]
  end
  -- Assign next available color
  local used = {}
  for _, idx in pairs(session_colors) do
    used[idx] = true
  end
  for i = 1, #M.colors do
    if not used[i] then
      session_colors[session_id] = i
      return i
    end
  end
  -- All colors used, cycle
  session_colors[session_id] = 1
  return 1
end

-- Build winbar string for a session
local function build_winbar(session_id, name, is_primary, claude_running, is_active)
  local color_idx = get_color_idx(session_id)
  local hl = is_active and ("CcaspWinbarActive" .. color_idx) or ("CcaspWinbar" .. color_idx)
  local btn_hl = "CcaspWinbarBtn" .. color_idx

  local status = claude_running and "●" or "○"
  local primary_marker = is_primary and " ★" or ""
  local active_marker = is_active and " ▶▶ ACTIVE ◀◀" or ""

  -- Format: %#HlGroup# text %* for highlight groups
  -- [status] Name [primary] [ACTIVE]          [Tab] [_] [×]
  local winbar = string.format(
    "%%#%s# %s %s%s%s %%=%%#%s#[Tab] [r] [c] [_] [×] %%#%s# ",
    hl, status, name, primary_marker, active_marker,
    btn_hl,
    hl
  )

  return winbar
end

-- Apply winbar to a session's window
function M.create(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session or not session.winid or not vim.api.nvim_win_is_valid(session.winid) then
    return
  end

  -- Assign color if not already
  get_color_idx(session_id)

  -- Update winbar
  M.update(session_id)
end

-- Update winbar for a session
function M.update(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session or not session.winid or not vim.api.nvim_win_is_valid(session.winid) then
    return
  end

  local primary = sessions.get_primary()
  local is_primary = primary and primary.id == session_id

  -- Check if this session's window is the current/active window
  local current_win = vim.api.nvim_get_current_win()
  local is_active = session.winid == current_win

  local winbar = build_winbar(
    session_id,
    session.name,
    is_primary,
    session.claude_running,
    is_active
  )

  -- Set winbar for this window
  vim.api.nvim_win_set_option(session.winid, "winbar", winbar)

  -- Set window border highlight based on active state
  if is_active then
    vim.api.nvim_win_set_option(session.winid, "winhighlight", "Normal:Normal,WinBar:CcaspWinbarActive" .. (session_colors[session_id] or 1) .. ",WinBarNC:CcaspWinbar" .. (session_colors[session_id] or 1))
  else
    vim.api.nvim_win_set_option(session.winid, "winhighlight", "Normal:Normal")
  end

  -- Setup keymaps for this buffer
  M.setup_keymaps(session.bufnr, session_id)
end

-- Remove winbar (called on close)
function M.destroy(session_id)
  session_colors[session_id] = nil
  -- Winbar is automatically removed when window closes
end

-- Update all session winbars
function M.update_all()
  local sessions = require("ccasp.sessions")
  local all_sessions = sessions.list()

  for _, session in ipairs(all_sessions) do
    M.update(session.id)
  end
end

-- Rename session
function M.rename(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session then return end

  vim.ui.input({
    prompt = "Rename session: ",
    default = session.name,
  }, function(new_name)
    if new_name and new_name ~= "" then
      session.name = new_name
      M.update(session_id)
      vim.notify("Session renamed to: " .. new_name, vim.log.levels.INFO)
    end
  end)
end

-- Change title bar color
function M.change_color(session_id)
  local items = {}
  local current_idx = session_colors[session_id] or 1

  for i, color in ipairs(M.colors) do
    local marker = (i == current_idx) and " ●" or ""
    table.insert(items, color.name .. marker)
  end

  vim.ui.select(items, {
    prompt = "Select title bar color:",
  }, function(_, idx)
    if idx then
      session_colors[session_id] = idx
      M.update(session_id)
      vim.notify("Color changed to: " .. M.colors[idx].name, vim.log.levels.INFO)
    end
  end)
end

-- Minimize session
function M.minimize(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session then return end

  -- Store minimized state
  minimized[session_id] = {
    name = session.name,
    color_idx = session_colors[session_id] or 1,
    bufnr = session.bufnr,
  }

  -- Hide the window
  if session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_win_hide(session.winid)
  end

  vim.notify(session.name .. " minimized", vim.log.levels.INFO)
end

-- Restore minimized session
function M.restore(session_id)
  local min_session = minimized[session_id]
  if not min_session then return end

  local sessions = require("ccasp.sessions")

  -- Create a new window for the buffer
  vim.cmd("vsplit")
  local new_winid = vim.api.nvim_get_current_win()

  if min_session.bufnr and vim.api.nvim_buf_is_valid(min_session.bufnr) then
    vim.api.nvim_win_set_buf(new_winid, min_session.bufnr)
  end

  -- Update session state
  local session = sessions.get(session_id)
  if session then
    session.winid = new_winid
  end

  -- Restore color
  session_colors[session_id] = min_session.color_idx

  -- Remove from minimized
  minimized[session_id] = nil

  -- Update winbar
  M.update(session_id)

  vim.notify(min_session.name .. " restored", vim.log.levels.INFO)
end

-- Get minimized sessions list
function M.get_minimized()
  local result = {}
  for id, data in pairs(minimized) do
    table.insert(result, {
      id = id,
      name = data.name,
      color_idx = data.color_idx,
    })
  end
  return result
end

-- Show minimized sessions picker
function M.show_minimized_picker()
  local min_sessions = M.get_minimized()

  if #min_sessions == 0 then
    vim.notify("No minimized sessions", vim.log.levels.INFO)
    return
  end

  local items = {}
  for _, session in ipairs(min_sessions) do
    local color = M.colors[session.color_idx] or { name = "Default" }
    table.insert(items, string.format("[%s] %s", color.name, session.name))
  end

  vim.ui.select(items, {
    prompt = "Restore minimized session:",
  }, function(_, idx)
    if idx then
      M.restore(min_sessions[idx].id)
    end
  end)
end

-- Close session with confirmation
function M.close_session(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session then return end

  vim.ui.select({ "Yes", "No" }, {
    prompt = "Close " .. session.name .. "?",
  }, function(choice)
    if choice == "Yes" then
      sessions.close(session_id)
    end
  end)
end

-- Setup keymaps for terminal buffer
function M.setup_keymaps(bufnr, session_id)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local sessions = require("ccasp.sessions")
  local opts = { buffer = bufnr, noremap = true, silent = true }

  -- Tab to cycle to next session (works in both normal and terminal mode)
  vim.keymap.set("n", "<Tab>", function()
    sessions.focus_next()
  end, vim.tbl_extend("force", opts, { desc = "Next Claude session" }))

  vim.keymap.set("n", "<S-Tab>", function()
    sessions.focus_prev()
  end, vim.tbl_extend("force", opts, { desc = "Previous Claude session" }))

  -- Terminal mode: Ctrl+Tab to cycle (since Tab is used for completion)
  vim.keymap.set("t", "<C-Tab>", function()
    vim.cmd([[<C-\><C-n>]])
    sessions.focus_next()
  end, vim.tbl_extend("force", opts, { desc = "Next Claude session" }))

  vim.keymap.set("t", "<C-S-Tab>", function()
    vim.cmd([[<C-\><C-n>]])
    sessions.focus_prev()
  end, vim.tbl_extend("force", opts, { desc = "Previous Claude session" }))

  -- Normal mode keymaps (when escaped from terminal)
  vim.keymap.set("n", "r", function()
    M.rename(session_id)
  end, vim.tbl_extend("force", opts, { desc = "Rename session" }))

  vim.keymap.set("n", "c", function()
    M.change_color(session_id)
  end, vim.tbl_extend("force", opts, { desc = "Change session color" }))

  vim.keymap.set("n", "_", function()
    M.minimize(session_id)
  end, vim.tbl_extend("force", opts, { desc = "Minimize session" }))

  vim.keymap.set("n", "x", function()
    M.close_session(session_id)
  end, vim.tbl_extend("force", opts, { desc = "Close session" }))
end

-- Show context menu
function M.show_context_menu(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)

  if not session then return end

  vim.ui.select({
    "Rename",
    "Change Color",
    "Minimize",
    "Close",
  }, {
    prompt = session.name .. ":",
  }, function(choice)
    if choice == "Rename" then
      M.rename(session_id)
    elseif choice == "Change Color" then
      M.change_color(session_id)
    elseif choice == "Minimize" then
      M.minimize(session_id)
    elseif choice == "Close" then
      M.close_session(session_id)
    end
  end)
end

-- Initialize
function M.setup()
  setup_highlights()

  -- Create autocommand group for active window tracking
  local group = vim.api.nvim_create_augroup("CcaspSessionActive", { clear = true })

  -- Update all titlebars when window focus changes AND auto-enter insert mode
  vim.api.nvim_create_autocmd({ "WinEnter", "BufEnter" }, {
    group = group,
    callback = function()
      -- Defer to let the window change complete
      vim.defer_fn(function()
        M.update_all()

        -- Auto-enter insert mode if we're now in a session terminal
        local sessions = require("ccasp.sessions")
        local current_win = vim.api.nvim_get_current_win()
        local session = sessions.get_by_window(current_win)

        if session then
          -- This is a Claude session terminal - auto-enter insert mode
          local bufnr = vim.api.nvim_win_get_buf(current_win)
          local buftype = vim.api.nvim_buf_get_option(bufnr, "buftype")
          if buftype == "terminal" then
            vim.cmd("startinsert")
          end
        end
      end, 10)
    end,
  })

  -- Also update on WinLeave to clear the active state
  vim.api.nvim_create_autocmd("WinLeave", {
    group = group,
    callback = function()
      vim.defer_fn(function()
        M.update_all()
      end, 10)
    end,
  })
end

return M
