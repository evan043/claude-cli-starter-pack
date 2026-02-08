-- CCASP Multi-Session Terminal Manager
-- Manages multiple Claude CLI sessions with quadrant stacking layout
-- Layout progression: 1 → 1x2 → 2x2 → 2x3 → 2x4 (max 8 sessions)

local M = {}

-- Titlebar module (lazy-loaded to avoid circular dependency)
local titlebar = nil
local function get_titlebar()
  if not titlebar then
    titlebar = require("ccasp.session_titlebar")
  end
  return titlebar
end

-- Session state
local state = {
  sessions = {}, -- { id = { id, bufnr, winid, claude_running, name } }
  session_order = {}, -- ordered list of session IDs
  primary_session = nil,
  active_session = nil, -- most recently focused/created session
  max_sessions = 8,
  resizing = false, -- true during split/rearrange to suppress auto-scroll
}

-- Attach on_lines auto-scroll to a terminal buffer so unfocused session
-- windows stay pinned to the bottom as new output arrives.
-- Guarded by state.resizing to avoid SIGWINCH-triggered scroll displacement
-- when splits resize all terminal TUIs simultaneously.
local function attach_auto_scroll(id, bufnr)
  vim.api.nvim_buf_attach(bufnr, false, {
    on_lines = function(_, buf)
      -- Detach if session or buffer gone
      local session = state.sessions[id]
      if not session or not vim.api.nvim_buf_is_valid(buf) then
        return true -- detach
      end
      local winid = session.winid
      if not winid or not vim.api.nvim_win_is_valid(winid) then
        return true -- detach
      end
      -- Skip during split/rearrange (SIGWINCH triggers bulk on_lines)
      if state.resizing then return end
      -- Skip if this is the focused window (terminal mode auto-follows)
      if vim.api.nvim_get_current_win() == winid then return end
      -- Scroll unfocused window to bottom on next tick
      vim.schedule(function()
        if not vim.api.nvim_win_is_valid(winid) then return end
        if not vim.api.nvim_buf_is_valid(buf) then return end
        if state.resizing then return end -- re-check after schedule
        local line_count = vim.api.nvim_buf_line_count(buf)
        pcall(vim.api.nvim_win_set_cursor, winid, { line_count, 0 })
      end)
    end,
  })
end

-- Generate unique session ID
local function generate_id()
  return "session_" .. os.time() .. "_" .. math.random(1000, 9999)
end

-- Get count of active sessions
function M.count()
  local count = 0
  for _, id in ipairs(state.session_order) do
    local session = state.sessions[id]
    if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
      count = count + 1
    end
  end
  return count
end

-- Get all active sessions in order
function M.list()
  local sessions = {}
  for _, id in ipairs(state.session_order) do
    local session = state.sessions[id]
    if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
      table.insert(sessions, {
        id = id,
        name = session.name,
        bufnr = session.bufnr,
        winid = session.winid,
        claude_running = session.claude_running,
        is_primary = id == state.primary_session,
      })
    end
  end
  return sessions
end

-- Clean up invalid sessions from order list
local function cleanup_invalid()
  local new_order = {}
  for _, id in ipairs(state.session_order) do
    local session = state.sessions[id]
    if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
      table.insert(new_order, id)
    else
      state.sessions[id] = nil
    end
  end
  state.session_order = new_order
end

-- Get layout description based on count
function M.get_layout()
  local count = M.count()
  if count <= 1 then return "1"
  elseif count == 2 then return "1x2"
  elseif count <= 4 then return "2x2"
  elseif count <= 6 then return "2x3"
  else return "2x4"
  end
end

-- Equalize all session windows using Neovim's built-in equalization.
-- wincmd = understands the window tree hierarchy and respects
-- winfixwidth/winfixheight on spacer windows (icon rail, footer).
function M.rearrange()
  state.resizing = true
  cleanup_invalid()
  local sessions = M.list()
  if #sessions == 0 then
    state.resizing = false
    return
  end

  -- Update titlebars first (winbar height affects equalization)
  get_titlebar().update_all()

  vim.cmd("wincmd =")

  -- Refresh footer to reflect current session list
  local ft_ok, footer = pcall(require, "ccasp.appshell.footer")
  if ft_ok then footer.refresh() end

  -- Clear resizing flag after TUI has settled (SIGWINCH fires on_lines synchronously)
  vim.defer_fn(function() state.resizing = false end, 300)
end

-- Focus window by session if valid
local function focus_session_window(session)
  if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_set_current_win(session.winid)
  end
end

-- Create split window based on session count
-- Uses vnew/new (not vsplit/split) to avoid briefly duplicating the terminal
-- buffer of the focused session into the new window.
local function create_split_window(count, sessions)
  if count == 0 then
    -- First additional split (shouldn't normally hit – content.lua creates session 1)
    vim.cmd("vnew")
  elseif count == 1 then
    -- 1 → 2: side-by-side columns
    focus_session_window(sessions[#sessions])
    vim.cmd("vnew")
  elseif count == 2 then
    -- 2 → 3: split left column vertically (session 1 top, new bottom-left)
    focus_session_window(sessions[1])
    vim.cmd("new")
  elseif count == 3 then
    -- 3 → 4: split right column vertically (session 2 top, new bottom-right)
    focus_session_window(sessions[2])
    vim.cmd("new")
  else
    -- 5+: alternate between column and row splits
    focus_session_window(sessions[#sessions])
    vim.cmd(count % 2 == 0 and "vnew" or "new")
  end
end

-- Launch Claude CLI in terminal buffer
local function launch_claude_cli(id, bufnr, name)
  vim.defer_fn(function()
    if not vim.api.nvim_buf_is_valid(bufnr) then return end

    local job_id = vim.b[bufnr].terminal_job_id
    if job_id and job_id > 0 then
      vim.fn.chansend(job_id, "claude\r")
      state.sessions[id].claude_running = true

      if id == state.primary_session then
        require("ccasp.terminal")._set_claude_running(true)
      end

      -- Only enter insert mode if the terminal window still has focus.
      -- The flyout or another panel may be focused; blindly calling
      -- startinsert would put INSERT mode on the wrong buffer.
      local session = state.sessions[id]
      if session and session.winid and vim.api.nvim_win_is_valid(session.winid)
          and vim.api.nvim_get_current_win() == session.winid then
        vim.cmd("startinsert")
      end
    end
  end, 500)
end

-- Create a new Claude CLI session
function M.spawn()
  cleanup_invalid()

  local count = M.count()
  if count >= state.max_sessions then
    vim.notify("Maximum sessions reached (" .. state.max_sessions .. ")", vim.log.levels.WARN)
    return nil
  end

  local id = generate_id()
  local name = "Claude " .. (count + 1)

  -- Suppress auto-scroll during split (SIGWINCH fires on_lines for all terminals)
  state.resizing = true

  create_split_window(count, M.list())

  vim.cmd("lcd " .. vim.fn.fnameescape(vim.fn.getcwd()))
  vim.cmd("terminal")

  local bufnr, winid = vim.api.nvim_get_current_buf(), vim.api.nvim_get_current_win()

  -- Apply terminal window options (winhighlight set later by titlebar.update)
  vim.wo[winid].scrolloff = 0
  vim.wo[winid].number = false
  vim.wo[winid].relativenumber = false
  vim.wo[winid].signcolumn = "no"
  vim.wo[winid].foldcolumn = "0"

  state.sessions[id] = { id = id, name = name, bufnr = bufnr, winid = winid, claude_running = false }
  table.insert(state.session_order, id)
  state.active_session = id -- newly created session is always active

  if count == 0 then
    state.primary_session = id
    require("ccasp.terminal")._set_state(bufnr, winid)
  end

  -- Auto-scroll: keep unfocused terminal windows pinned to bottom
  attach_auto_scroll(id, bufnr)

  -- Set consistent statusline (content.lua sets this for session 1, do it here for 2+)
  vim.wo[winid].statusline = " "

  -- Update all titlebars FIRST so every session has a winbar before equalization.
  -- wincmd = accounts for winbar height; running it before winbars are set causes
  -- misaligned quadrants (windows without winbars get 1 extra row).
  get_titlebar().update_all()

  -- Equalize windows AFTER winbars are consistent across all sessions
  vim.cmd("wincmd =")

  -- Refresh footer to show the new session tab
  local ft_ok, footer = pcall(require, "ccasp.appshell.footer")
  if ft_ok then footer.refresh() end

  launch_claude_cli(id, bufnr, name)

  vim.defer_fn(function()
    get_titlebar().create(id)
    M.rearrange() -- includes wincmd = and footer.refresh() (also sets/clears resizing)
  end, 800)

  return id
end

-- Create a new Claude CLI session at a specific directory path
function M.spawn_at_path(path)
  -- Validate path is a directory
  if vim.fn.isdirectory(path) == 0 then
    vim.notify("Directory not found: " .. path, vim.log.levels.ERROR)
    return nil
  end

  cleanup_invalid()

  local count = M.count()
  if count >= state.max_sessions then
    vim.notify("Maximum sessions reached (" .. state.max_sessions .. ")", vim.log.levels.WARN)
    return nil
  end

  local id = generate_id()
  local name = vim.fn.fnamemodify(path, ":t")

  -- Suppress auto-scroll during split (SIGWINCH fires on_lines for all terminals)
  state.resizing = true

  create_split_window(count, M.list())

  -- Set the local directory to the provided repo path
  vim.cmd("lcd " .. vim.fn.fnameescape(path))
  vim.cmd("terminal")

  local bufnr, winid = vim.api.nvim_get_current_buf(), vim.api.nvim_get_current_win()

  -- Apply terminal window options (winhighlight set later by titlebar.update)
  vim.wo[winid].scrolloff = 0
  vim.wo[winid].number = false
  vim.wo[winid].relativenumber = false
  vim.wo[winid].signcolumn = "no"
  vim.wo[winid].foldcolumn = "0"

  state.sessions[id] = { id = id, name = name, bufnr = bufnr, winid = winid, claude_running = false, path = path }
  table.insert(state.session_order, id)
  state.active_session = id -- newly created session is always active

  if count == 0 then
    state.primary_session = id
    require("ccasp.terminal")._set_state(bufnr, winid)
  end

  -- Auto-scroll: keep unfocused terminal windows pinned to bottom
  attach_auto_scroll(id, bufnr)

  -- Set consistent statusline (content.lua sets this for session 1, do it here for 2+)
  vim.wo[winid].statusline = " "

  -- Update all titlebars FIRST so every session has a winbar before equalization.
  -- wincmd = accounts for winbar height; running it before winbars are set causes
  -- misaligned quadrants (windows without winbars get 1 extra row).
  get_titlebar().update_all()

  -- Equalize windows AFTER winbars are consistent across all sessions
  vim.cmd("wincmd =")

  -- Refresh footer to show the new session tab
  local ft_ok, footer = pcall(require, "ccasp.appshell.footer")
  if ft_ok then footer.refresh() end

  launch_claude_cli(id, bufnr, name)

  vim.defer_fn(function()
    get_titlebar().create(id)
    M.rearrange() -- includes wincmd = and footer.refresh() (also sets/clears resizing)
  end, 800)

  return id
end

-- Remove session from order list
local function remove_from_order(id)
  for i, sid in ipairs(state.session_order) do
    if sid == id then
      table.remove(state.session_order, i)
      return
    end
  end
end

-- Reassign primary session if current primary is closed
local function reassign_primary_if_needed(closed_id)
  if closed_id ~= state.primary_session then return end

  local sessions = M.list()
  if #sessions > 0 then
    state.primary_session = sessions[1].id
    local terminal = require("ccasp.terminal")
    terminal._set_state(sessions[1].bufnr, sessions[1].winid)
    terminal._set_claude_running(sessions[1].claude_running)
  else
    state.primary_session = nil
  end
end

-- Close a specific session
function M.close(id)
  local session = state.sessions[id]
  if not session then return end

  -- Suppress auto-scroll during close (remaining windows resize)
  state.resizing = true

  get_titlebar().destroy(id)

  if session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_win_close(session.winid, true)
  end

  state.sessions[id] = nil
  remove_from_order(id)
  reassign_primary_if_needed(id)

  vim.defer_fn(M.rearrange, 100) -- rearrange sets/clears resizing
end

-- Close all sessions
function M.close_all()
  for id, session in pairs(state.sessions) do
    get_titlebar().destroy(id)
    if session.winid and vim.api.nvim_win_is_valid(session.winid) then
      vim.api.nvim_win_close(session.winid, true)
    end
  end
  state.sessions = {}
  state.session_order = {}
  state.primary_session = nil
  state.active_session = nil

  local terminal = require("ccasp.terminal")
  terminal._set_state(nil, nil)
  terminal._set_claude_running(false)
end

-- Focus a specific session
function M.focus(id)
  local session = state.sessions[id]
  if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
    state.active_session = id
    vim.api.nvim_set_current_win(session.winid)
    -- Ensure the terminal buffer is still displayed in this window
    if session.bufnr and vim.api.nvim_buf_is_valid(session.bufnr) then
      local current_buf = vim.api.nvim_win_get_buf(session.winid)
      if current_buf ~= session.bufnr then
        vim.api.nvim_win_set_buf(session.winid, session.bufnr)
      end
    end
    -- Scroll to bottom using native motion (respects terminal viewport, unlike buf_line_count)
    local mode = vim.api.nvim_get_mode().mode
    if mode ~= "t" and mode ~= "nt" then
      vim.cmd("normal! G")
    end
    vim.cmd("startinsert")
  end
end

-- Focus next session
function M.focus_next()
  local sessions = M.list()
  if #sessions == 0 then return end

  local current_win = vim.api.nvim_get_current_win()
  local current_idx = 0

  for i, session in ipairs(sessions) do
    if session.winid == current_win then
      current_idx = i
      break
    end
  end

  local next_idx = (current_idx % #sessions) + 1
  M.focus(sessions[next_idx].id)
end

-- Focus previous session
function M.focus_prev()
  local sessions = M.list()
  if #sessions == 0 then return end

  local current_win = vim.api.nvim_get_current_win()
  local current_idx = 0

  for i, session in ipairs(sessions) do
    if session.winid == current_win then
      current_idx = i
      break
    end
  end

  local prev_idx = current_idx - 1
  if prev_idx < 1 then prev_idx = #sessions end
  M.focus(sessions[prev_idx].id)
end

-- Send command to a specific session
function M.send(cmd, id)
  local session
  if id then
    session = state.sessions[id]
  else
    local current_win = vim.api.nvim_get_current_win()
    for _, s in pairs(state.sessions) do
      if s.winid == current_win then
        session = s
        break
      end
    end
  end

  if not session or not session.bufnr then return end

  local job_id = vim.b[session.bufnr].terminal_job_id
  if job_id and job_id > 0 then
    vim.fn.chansend(job_id, cmd .. "\n")
  end
end

-- Get session by ID
function M.get(id)
  return state.sessions[id]
end

-- Get primary session
function M.get_primary()
  if state.primary_session then
    return state.sessions[state.primary_session]
  end
  return nil
end

-- Get the most recently active session (last focused or created)
function M.get_active()
  if state.active_session and state.sessions[state.active_session] then
    local s = state.sessions[state.active_session]
    if s.winid and vim.api.nvim_win_is_valid(s.winid) then
      return s
    end
  end
  -- Fallback to primary, then first available
  local primary = M.get_primary()
  if primary and primary.winid and vim.api.nvim_win_is_valid(primary.winid) then
    return primary
  end
  local all = M.list()
  return all[1] or nil
end

-- Track active session from WinEnter (called by session_titlebar autocmd)
function M.set_active_by_window(winid)
  for id, session in pairs(state.sessions) do
    if session.winid == winid then
      state.active_session = id
      return
    end
  end
end

-- Register an existing session (called from sidebar)
function M.register_primary(bufnr, winid)
  local id = generate_id()
  state.sessions[id] = {
    id = id,
    name = "Claude 1",
    bufnr = bufnr,
    winid = winid,
    claude_running = false,
  }
  table.insert(state.session_order, id)
  state.primary_session = id
  state.active_session = id

  -- Auto-scroll: keep unfocused terminal windows pinned to bottom
  attach_auto_scroll(id, bufnr)

  -- Create titlebar after short delay (allows terminal to initialize)
  vim.defer_fn(function()
    local ok, err = pcall(function()
      get_titlebar().create(id)
    end)
    if not ok then
      vim.schedule(function()
        vim.notify("Titlebar create error: " .. tostring(err), vim.log.levels.WARN)
      end)
    end
  end, 500)

  -- Initialize layer system on first session registration
  local layers_ok, layers = pcall(require, "ccasp.layers")
  if layers_ok then layers.init() end

  return id
end

-- Mark session as claude running
function M.set_claude_running(id, running)
  if state.sessions[id] then
    state.sessions[id].claude_running = running
    get_titlebar().update(id)
  end
end

-- Show session picker
function M.show_picker()
  local sessions = M.list()

  if #sessions == 0 then
    vim.notify("No active Claude sessions", vim.log.levels.INFO)
    return
  end

  local items = {}
  for i, session in ipairs(sessions) do
    local status = session.claude_running and "●" or "○"
    local primary = session.is_primary and " ★" or ""
    table.insert(items, string.format("[%d] %s %s%s", i, status, session.name, primary))
  end

  vim.ui.select(items, {
    prompt = "Select Claude Session:",
  }, function(_, idx)
    if idx then
      M.focus(sessions[idx].id)
    end
  end)
end

-- Rename a session
function M.rename(id)
  get_titlebar().rename(id)
end

-- Change session title bar color
function M.change_color(id)
  get_titlebar().change_color(id)
end

-- Minimize a session
function M.minimize(id)
  get_titlebar().minimize(id)
end

-- Restore a minimized session
function M.restore(id)
  get_titlebar().restore(id)
end

-- Get minimized sessions
function M.get_minimized()
  return get_titlebar().get_minimized()
end

-- Show minimized sessions picker
function M.show_minimized_picker()
  get_titlebar().show_minimized_picker()
end

-- Get session by current window
function M.get_by_window(winid)
  winid = winid or vim.api.nvim_get_current_win()
  for id, session in pairs(state.sessions) do
    if session.winid == winid then
      return session
    end
  end
  return nil
end

-- Update all titlebars
function M.update_titlebars()
  get_titlebar().update_all()
end

-- Re-arrange on resize
vim.api.nvim_create_autocmd("VimResized", {
  group = vim.api.nvim_create_augroup("CcaspSessionResize", { clear = true }),
  callback = function()
    vim.defer_fn(function()
      M.rearrange()
    end, 100)
  end,
})

-- ═══════════════════════════════════════════════════════════════════
-- Layer Manager Internal API (called only by layers.lua)
-- ═══════════════════════════════════════════════════════════════════

-- Deep copy utility
local function deep_copy(t)
  if type(t) ~= "table" then return t end
  local copy = {}
  for k, v in pairs(t) do
    copy[k] = type(v) == "table" and deep_copy(v) or v
  end
  return copy
end

-- Export current session state for layer snapshot
function M._export_state()
  return {
    sessions = deep_copy(state.sessions),
    session_order = deep_copy(state.session_order),
    primary_session = state.primary_session,
    active_session = state.active_session,
  }
end

-- Import session state from a layer snapshot
function M._import_state(data)
  data = data or {}
  state.sessions = data.sessions or {}
  state.session_order = data.session_order or {}
  state.primary_session = data.primary_session
  state.active_session = data.active_session

  -- Update terminal module with new primary
  local primary = state.primary_session and state.sessions[state.primary_session]
  local terminal = require("ccasp.terminal")
  if primary then
    terminal._set_state(primary.bufnr, primary.winid)
    terminal._set_claude_running(primary.claude_running or false)
  else
    terminal._set_state(nil, nil)
    terminal._set_claude_running(false)
  end
end

-- Detach all session windows (close windows, keep buffers alive)
function M._detach_all_windows()
  state.resizing = true

  for id, session in pairs(state.sessions) do
    -- Destroy titlebar (winbar is removed when window closes)
    get_titlebar().destroy(id)
    -- Close window but keep buffer
    if session.winid and vim.api.nvim_win_is_valid(session.winid) then
      vim.api.nvim_win_close(session.winid, true)
    end
    session.winid = nil
  end

  vim.defer_fn(function() state.resizing = false end, 300)
end

-- Reattach windows for sessions that have valid buffers but no windows.
-- Recreates the split grid, assigns buffers, rebuilds titlebars.
function M._reattach_windows()
  state.resizing = true

  local ordered = {}
  for _, id in ipairs(state.session_order) do
    local session = state.sessions[id]
    if session and session.bufnr and vim.api.nvim_buf_is_valid(session.bufnr) then
      table.insert(ordered, session)
    end
  end

  if #ordered == 0 then
    state.resizing = false
    return
  end

  -- First session: use current window
  local first = ordered[1]
  local first_win = vim.api.nvim_get_current_win()
  vim.api.nvim_win_set_buf(first_win, first.bufnr)
  first.winid = first_win

  -- Apply terminal window options
  vim.wo[first_win].scrolloff = 0
  vim.wo[first_win].number = false
  vim.wo[first_win].relativenumber = false
  vim.wo[first_win].signcolumn = "no"
  vim.wo[first_win].foldcolumn = "0"
  vim.wo[first_win].statusline = " "

  -- Remaining sessions: create splits
  for i = 2, #ordered do
    local session = ordered[i]
    create_split_window(i - 1, ordered)
    local new_win = vim.api.nvim_get_current_win()
    vim.api.nvim_win_set_buf(new_win, session.bufnr)
    session.winid = new_win

    vim.wo[new_win].scrolloff = 0
    vim.wo[new_win].number = false
    vim.wo[new_win].relativenumber = false
    vim.wo[new_win].signcolumn = "no"
    vim.wo[new_win].foldcolumn = "0"
    vim.wo[new_win].statusline = " "
  end

  -- Rebuild titlebars for all sessions
  for _, session in ipairs(ordered) do
    get_titlebar().create(session.id)
    -- Re-attach auto-scroll
    attach_auto_scroll(session.id, session.bufnr)
  end

  -- Equalize windows
  get_titlebar().update_all()
  vim.cmd("wincmd =")

  -- Focus the active session
  local active = state.active_session and state.sessions[state.active_session]
  if active and active.winid and vim.api.nvim_win_is_valid(active.winid) then
    vim.api.nvim_set_current_win(active.winid)
  end

  vim.defer_fn(function() state.resizing = false end, 300)
end

return M
