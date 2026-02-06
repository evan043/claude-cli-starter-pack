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
  max_sessions = 8,
}

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

-- Equalize all session windows
function M.rearrange()
  cleanup_invalid()
  -- Just equalize - let Vim handle the layout
  vim.cmd("wincmd =")
  -- Update all titlebars
  get_titlebar().update_all()
end

-- Focus window by session if valid
local function focus_session_window(session)
  if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_set_current_win(session.winid)
  end
end

-- Create split window based on session count
local function create_split_window(count, sessions)
  if count == 0 then
    vim.cmd("vsplit")
  elseif count == 1 then
    focus_session_window(sessions[#sessions])
    vim.cmd("vsplit")
  elseif count == 2 then
    focus_session_window(sessions[1])
    vim.cmd("split")
  elseif count == 3 then
    focus_session_window(sessions[2])
    vim.cmd("split")
  else
    focus_session_window(sessions[#sessions])
    vim.cmd(count % 2 == 0 and "vsplit" or "split")
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

      vim.notify(name .. " starting...", vim.log.levels.INFO)
      vim.cmd("startinsert")
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

  create_split_window(count, M.list())

  vim.cmd("lcd " .. vim.fn.fnameescape(vim.fn.getcwd()))
  vim.cmd("terminal")

  local bufnr, winid = vim.api.nvim_get_current_buf(), vim.api.nvim_get_current_win()

  state.sessions[id] = { id = id, name = name, bufnr = bufnr, winid = winid, claude_running = false }
  table.insert(state.session_order, id)

  if count == 0 then
    state.primary_session = id
    require("ccasp.terminal")._set_state(bufnr, winid)
  end

  launch_claude_cli(id, bufnr, name)

  vim.defer_fn(function()
    get_titlebar().create(id)
    M.rearrange()
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

  get_titlebar().destroy(id)

  if session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_win_close(session.winid, true)
  end

  state.sessions[id] = nil
  remove_from_order(id)
  reassign_primary_if_needed(id)

  vim.defer_fn(M.rearrange, 100)
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

  local terminal = require("ccasp.terminal")
  terminal._set_state(nil, nil)
  terminal._set_claude_running(false)
end

-- Focus a specific session
function M.focus(id)
  local session = state.sessions[id]
  if session and session.winid and vim.api.nvim_win_is_valid(session.winid) then
    vim.api.nvim_set_current_win(session.winid)
    -- Move cursor to last line (input prompt) before entering terminal mode
    local bufnr = vim.api.nvim_win_get_buf(session.winid)
    local line_count = vim.api.nvim_buf_line_count(bufnr)
    vim.api.nvim_win_set_cursor(session.winid, { line_count, 0 })
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

  vim.defer_fn(function()
    get_titlebar().create(id)
  end, 1500)

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

return M
