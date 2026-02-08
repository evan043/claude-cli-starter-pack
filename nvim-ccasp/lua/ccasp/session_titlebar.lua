-- CCASP Session Title Bar
-- Uses winbar (window-local statusline at top) for session titles
-- Much simpler and more reliable than floating windows

local M = {}
local nf = require("ccasp.ui.icons")

-- Debounce timer for autocmd updates
local _update_timer = nil

-- Available colors for title bars (dark blue/teal/steel palette)
M.colors = {
  { name = "Blue", fg = "#61afef", bg = "#1e3a5f" },
  { name = "Green", fg = "#98c379", bg = "#1e3a2a" },
  { name = "Teal", fg = "#56b6c2", bg = "#1e4a5f" },
  { name = "Steel", fg = "#5fafff", bg = "#1a2a4a" },
  { name = "Slate", fg = "#8899aa", bg = "#2a3040" },
  { name = "Ice", fg = "#7ec8e3", bg = "#1e3a4f" },
  { name = "Navy", fg = "#4a8fcf", bg = "#0d1a2f" },
  { name = "Mint", fg = "#6fcf97", bg = "#1a3a2a" },
}

-- Session color assignments
local session_colors = {} -- { session_id = color_idx }

-- Minimized sessions storage
local minimized = {} -- { session_id = { name, color_idx, bufnr } }

-- Active session border color (steel blue for visibility)
local ACTIVE_BORDER_COLOR = "#3a7fcf"
local INACTIVE_BORDER_COLOR = "#1e2a3a"

-- Create single highlight group set
local function create_highlight_group(name, fg, bg, bold)
  vim.api.nvim_set_hl(0, name, { fg = fg, bg = bg, bold = bold or false })
end

-- Create highlight groups for each color
local function setup_highlights()
  for i, color in ipairs(M.colors) do
    create_highlight_group("CcaspWinbar" .. i, color.fg, color.bg, true)
    create_highlight_group("CcaspWinbarBtn" .. i, "#56b6c2", color.bg, true)
    create_highlight_group("CcaspWinbarActive" .. i, "#ffffff", color.bg, true)
  end

  create_highlight_group("CcaspWinbarDefault", "#8899aa", "#1e2a3a", true)
  create_highlight_group("CcaspActiveBorder", ACTIVE_BORDER_COLOR, nil, true)
  create_highlight_group("CcaspInactiveBorder", INACTIVE_BORDER_COLOR, nil)
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

-- Lookup current session from window (used by winbar click handlers)
local function get_current_session()
  local sessions = require("ccasp.sessions")
  local win = vim.api.nvim_get_current_win()
  return sessions.get_by_window(win)
end

-- Helper: exit terminal mode before opening a modal dialog
local function exit_terminal_and_run(fn)
  vim.schedule(function()
    local mode = vim.api.nvim_get_mode().mode
    if mode == "t" then
      local esc = vim.api.nvim_replace_termcodes("<C-\\><C-n>", true, false, true)
      vim.api.nvim_feedkeys(esc, "n", false)
      vim.schedule(fn)
    else
      fn()
    end
  end)
end

-- Setup global click handlers for winbar icon buttons
-- Uses %@v:lua.FuncName@text%X statusline click syntax
local function setup_click_handlers()
  _G.CcaspTitlebar_cycle = function(_, _, button, _)
    if button ~= "l" then return end
    vim.schedule(function()
      require("ccasp.sessions").focus_next()
    end)
  end

  _G.CcaspTitlebar_rename = function(_, _, button, _)
    if button ~= "l" then return end
    exit_terminal_and_run(function()
      local session = get_current_session()
      if session then M.rename(session.id) end
    end)
  end

  _G.CcaspTitlebar_color = function(_, _, button, _)
    if button ~= "l" then return end
    exit_terminal_and_run(function()
      local session = get_current_session()
      if session then M.change_color(session.id) end
    end)
  end

  _G.CcaspTitlebar_minimize = function(_, _, button, _)
    if button ~= "l" then return end
    vim.schedule(function()
      local session = get_current_session()
      if session then M.minimize(session.id) end
    end)
  end

  _G.CcaspTitlebar_close = function(_, _, button, _)
    if button ~= "l" then return end
    exit_terminal_and_run(function()
      local session = get_current_session()
      if session then M.close_session(session.id) end
    end)
  end
end

-- Build winbar string for a session
local function build_winbar(session_id, name, is_primary, claude_running, is_active)
  local color_idx = get_color_idx(session_id)
  local hl = is_active and ("CcaspWinbarActive" .. color_idx) or ("CcaspWinbar" .. color_idx)
  local btn_hl = "CcaspWinbarBtn" .. color_idx

  local status = claude_running and "●" or "○"
  local primary_marker = is_primary and " ★" or ""
  local active_marker = is_active and " ▶▶ ACTIVE ◀◀" or ""

  -- Clickable icon buttons using %@v:lua.FuncName@icon%X winbar click syntax
  -- Uses Material Design Nerd Font icons for cross-platform rendering
  -- Color matches title text (hl) instead of separate btn_hl
  local winbar = string.format(
    "%%#%s# %s %s%s%s %%=%%#%s#"
    .. " %%@v:lua.CcaspTitlebar_cycle@  %s  %%X"
    .. "│%%@v:lua.CcaspTitlebar_rename@  %s  %%X"
    .. "│%%@v:lua.CcaspTitlebar_color@  %s  %%X"
    .. "│%%@v:lua.CcaspTitlebar_minimize@  %s  %%X"
    .. "│%%@v:lua.CcaspTitlebar_close@  %s  %%X"
    .. " %%#%s# ",
    hl, status, name, primary_marker, active_marker,
    hl,
    nf.win_cycle, nf.win_rename, nf.palette, nf.win_minimize, nf.win_close,
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
  vim.wo[session.winid].winbar = winbar

  -- Set window border highlight based on active state
  local color_idx_val = session_colors[session_id] or 1
  if is_active then
    vim.wo[session.winid].winhighlight = "Normal:CcaspTerminalBg,NormalFloat:CcaspTerminalBg,EndOfBuffer:CcaspTerminalBg,WinBar:CcaspWinbarActive" .. color_idx_val .. ",WinBarNC:CcaspWinbar" .. color_idx_val .. ",WinSeparator:CcaspBorderActive"
  else
    vim.wo[session.winid].winhighlight = "Normal:CcaspTerminalBg,NormalFloat:CcaspTerminalBg,EndOfBuffer:CcaspTerminalBg,WinSeparator:CcaspBorderInactive"
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

-- Rename session via floating input modal
function M.rename(session_id)
  local helpers = require("ccasp.panels.helpers")
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)
  if not session then return end

  local width = 40
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { session.name })

  local pos = helpers.calculate_position({ width = width, height = 1 })
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = pos.width,
    height = 1,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.win_rename .. "  Rename Session ",
    title_pos = "center",
    footer = " Enter: Apply │ Esc: Cancel ",
    footer_pos = "center",
    style = "minimal",
  })

  -- Enter insert mode at end of text
  vim.cmd("startinsert!")

  local function close_modal()
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    helpers.restore_terminal_focus()
  end

  local function confirm()
    local new_name = vim.trim(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1] or "")
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    if new_name ~= "" then
      session.name = new_name
      M.update(session_id)
      vim.notify("Session renamed to: " .. new_name, vim.log.levels.INFO)
    end
    helpers.restore_terminal_focus()
  end

  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("i", "<CR>", confirm, opts)
  vim.keymap.set("n", "<CR>", confirm, opts)
  vim.keymap.set("i", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "q", close_modal, opts)
end

-- Change title bar color via floating color picker modal
function M.change_color(session_id)
  local helpers = require("ccasp.panels.helpers")
  local current_idx = session_colors[session_id] or 1

  local width = 34
  local height = #M.colors + 4

  local buf = helpers.create_buffer("ccasp://color-picker")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.palette .. "  Session Color ",
    footer = " Enter: Select │ Esc: Cancel ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true

  -- Build content
  local lines = {}
  local item_lines = {}

  table.insert(lines, "")
  table.insert(lines, "  Select a color:")
  table.insert(lines, "")

  for i, color in ipairs(M.colors) do
    local marker = (i == current_idx) and "  ●" or ""
    table.insert(lines, string.format("    %s%s", color.name, marker))
    item_lines[#lines] = { color_idx = i }
  end

  table.insert(lines, "")

  helpers.set_buffer_content(buf, lines)
  helpers.sandbox_buffer(buf)

  -- Highlights: color each swatch line with its actual fg color
  local ns = helpers.prepare_highlights("ccasp_color_picker", buf)
  for i, line_text in ipairs(lines) do
    if line_text:match("Select") then
      vim.api.nvim_buf_add_highlight(buf, ns, "Title", i - 1, 0, -1)
    end
    for ci, color in ipairs(M.colors) do
      if line_text:match("^    " .. color.name) then
        local hl_name = "CcaspSwatch" .. ci
        vim.api.nvim_set_hl(0, hl_name, { fg = color.fg, bold = true })
        vim.api.nvim_buf_add_highlight(buf, ns, hl_name, i - 1, 4, -1)
      end
    end
  end

  local panel = { bufnr = buf, winid = win }
  local function close_modal()
    helpers.close_panel(panel)
  end

  local function apply_at_cursor()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local item = item_lines[cursor[1]]
    if item and item.color_idx then
      session_colors[session_id] = item.color_idx
      M.update(session_id)
      close_modal()
      vim.notify("Color: " .. M.colors[item.color_idx].name, vim.log.levels.INFO)
    end
  end

  -- Keymaps
  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("n", "<CR>", apply_at_cursor, opts)
  vim.keymap.set("n", "q", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)

  -- Navigation
  local function nav_down()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local total = vim.api.nvim_buf_line_count(buf)
    for line = cursor[1] + 1, total do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    for line = cursor[1] - 1, 1, -1 do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, win, { line, 0 })
    local item = item_lines[line]
    if item and item.color_idx then
      session_colors[session_id] = item.color_idx
      M.update(session_id)
      close_modal()
      vim.notify("Color: " .. M.colors[item.color_idx].name, vim.log.levels.INFO)
    end
  end, opts)

  -- Position cursor on current color
  for line = 1, #lines do
    if item_lines[line] and item_lines[line].color_idx == current_idx then
      vim.api.nvim_win_set_cursor(win, { line, 0 })
      break
    end
  end
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

-- Close session with floating confirmation modal
function M.close_session(session_id)
  local helpers = require("ccasp.panels.helpers")
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)
  if not session then return end

  local width = 36
  local height = 7

  local buf = helpers.create_buffer("ccasp://close-confirm")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.win_close .. "  Close Session ",
    footer = " y: Yes │ n/Esc: No ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true

  -- Build content
  local lines = {}
  local item_lines = {}

  table.insert(lines, "")
  table.insert(lines, "  Close \"" .. session.name .. "\"?")
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", width - 4))
  table.insert(lines, "    Yes - Close session")
  item_lines[#lines] = { action = "yes" }
  table.insert(lines, "    No  - Cancel")
  item_lines[#lines] = { action = "no" }
  table.insert(lines, "")

  helpers.set_buffer_content(buf, lines)
  helpers.sandbox_buffer(buf)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_close_confirm", buf)
  for i, line_text in ipairs(lines) do
    if line_text:match("Close \"") then
      vim.api.nvim_buf_add_highlight(buf, ns, "WarningMsg", i - 1, 0, -1)
    elseif line_text:match("^  ─") then
      vim.api.nvim_buf_add_highlight(buf, ns, "Comment", i - 1, 0, -1)
    elseif line_text:match("^    Yes") then
      vim.api.nvim_buf_add_highlight(buf, ns, "DiagnosticError", i - 1, 4, 7)
    elseif line_text:match("^    No") then
      vim.api.nvim_buf_add_highlight(buf, ns, "DiagnosticOk", i - 1, 4, 6)
    end
  end

  local panel = { bufnr = buf, winid = win }
  local function close_modal()
    helpers.close_panel(panel)
  end

  local function do_close()
    close_modal()
    vim.schedule(function() sessions.close(session_id) end)
  end

  local function execute_at_cursor()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local item = item_lines[cursor[1]]
    if item then
      if item.action == "yes" then do_close()
      elseif item.action == "no" then close_modal() end
    end
  end

  -- Keymaps
  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("n", "<CR>", execute_at_cursor, opts)
  vim.keymap.set("n", "y", do_close, opts)
  vim.keymap.set("n", "n", close_modal, opts)
  vim.keymap.set("n", "q", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)

  -- Navigation
  local function nav_down()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local total = vim.api.nvim_buf_line_count(buf)
    for line = cursor[1] + 1, total do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    for line = cursor[1] - 1, 1, -1 do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, win, { line, 0 })
    local item = item_lines[line]
    if item then
      if item.action == "yes" then do_close()
      elseif item.action == "no" then close_modal() end
    end
  end, opts)

  -- Default cursor on "No" (safe default)
  for line = #lines, 1, -1 do
    if item_lines[line] and item_lines[line].action == "no" then
      vim.api.nvim_win_set_cursor(win, { line, 0 })
      break
    end
  end
end

-- Create keymap with extended options
local function set_keymap(mode, key, fn, base_opts, desc)
  vim.keymap.set(mode, key, fn, vim.tbl_extend("force", base_opts, { desc = desc }))
end

-- Setup keymaps for terminal buffer
function M.setup_keymaps(bufnr, session_id)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local sessions = require("ccasp.sessions")
  local opts = { buffer = bufnr, noremap = true, silent = true }

  -- Session cycling (Ctrl-Tab only; plain Tab is reserved for flyout toggle)
  local function exit_terminal_mode()
    local esc = vim.api.nvim_replace_termcodes("<C-\\><C-n>", true, false, true)
    vim.api.nvim_feedkeys(esc, "n", false)
  end

  set_keymap("t", "<C-Tab>", function()
    exit_terminal_mode()
    vim.schedule(function() sessions.focus_next() end)
  end, opts, "Next Claude session")

  set_keymap("t", "<C-S-Tab>", function()
    exit_terminal_mode()
    vim.schedule(function() sessions.focus_prev() end)
  end, opts, "Previous Claude session")

  -- Normal mode session controls
  set_keymap("n", "r", function() M.rename(session_id) end, opts, "Rename session")
  set_keymap("n", "c", function() M.change_color(session_id) end, opts, "Change session color")
  set_keymap("n", "_", function() M.minimize(session_id) end, opts, "Minimize session")
  set_keymap("n", "x", function() M.close_session(session_id) end, opts, "Close session")
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

-- Handle auto-enter insert mode for session terminals
local _last_focus_win = nil
local function handle_session_terminal_focus()
  local sessions = require("ccasp.sessions")
  local current_win = vim.api.nvim_get_current_win()

  -- Skip if we already focused this window (prevents repeated startinsert)
  if current_win == _last_focus_win then return end
  _last_focus_win = current_win

  local session = sessions.get_by_window(current_win)

  if session then
    local bufnr = vim.api.nvim_win_get_buf(current_win)
    if vim.bo[bufnr].buftype == "terminal" then
      -- If already in terminal mode (e.g. restore_terminal_focus already called startinsert),
      -- skip normal! G which would error with "Can't re-enter normal mode from terminal mode"
      local mode = vim.api.nvim_get_mode().mode
      if mode == "t" or mode == "nt" then
        return
      end
      -- Scroll to bottom using native motion (respects terminal viewport, unlike buf_line_count)
      vim.cmd("normal! G")
      vim.cmd("startinsert")
    end
  end
end

-- Debounced update to prevent rapid-fire redraws from WinEnter+BufEnter
local function debounced_update(include_focus)
  if _update_timer then
    vim.fn.timer_stop(_update_timer)
  end
  _update_timer = vim.fn.timer_start(50, function()
    _update_timer = nil
    vim.schedule(function()
      M.update_all()
      if include_focus then
        handle_session_terminal_focus()
      end
    end)
  end)
end

-- Initialize
function M.setup()
  setup_highlights()
  setup_click_handlers()

  local group = vim.api.nvim_create_augroup("CcaspSessionActive", { clear = true })

  vim.api.nvim_create_autocmd({ "WinEnter", "BufEnter" }, {
    group = group,
    callback = function()
      debounced_update(true)
    end,
  })

  vim.api.nvim_create_autocmd("WinLeave", {
    group = group,
    callback = function()
      _last_focus_win = nil
      debounced_update(false)
    end,
  })
end

return M
