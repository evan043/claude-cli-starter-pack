-- CCASP Layer Manager
-- Named groups of sessions that work like browser tabs.
-- Each layer has its own independent set of Claude Code sessions.
-- Switching layers hides one set and shows another, with all terminal processes
-- continuing to run in the background.

local M = {}

-- Lazy-loaded modules (avoid circular dependency)
local function get_sessions() return require("ccasp.sessions") end
local function get_titlebar() return require("ccasp.session_titlebar") end
local function get_footer()
  local ok, f = pcall(require, "ccasp.appshell.footer")
  return ok and f or nil
end

local state = {
  layers = {},        -- { [1-9] = { name, sessions_data } }
  active_layer = 1,
  initialized = false,
}

-- Deep copy a table (one level deep for session objects, deep for nested tables)
local function deep_copy(t)
  if type(t) ~= "table" then return t end
  local copy = {}
  for k, v in pairs(t) do
    if type(v) == "table" then
      copy[k] = deep_copy(v)
    else
      copy[k] = v
    end
  end
  return copy
end

-- Snapshot the current layer state from sessions + titlebar
local function snapshot_current()
  local layer = state.layers[state.active_layer]
  if not layer then return end

  local sessions = get_sessions()
  local titlebar = get_titlebar()

  layer.sessions_data = sessions._export_state()
  layer.titlebar_data = titlebar._export_state()
end

-- Initialize layer system. Called once after first session is registered.
function M.init()
  if state.initialized then return end
  state.initialized = true

  state.layers[1] = {
    name = "Layer 1",
    sessions_data = nil, -- will be snapshotted on first switch
    titlebar_data = nil,
  }
  state.active_layer = 1
end

-- Get current active layer number
function M.get_active()
  return state.active_layer
end

-- List all layers with metadata
-- Returns: { {num, name, session_count, is_active}, ... }
function M.list()
  local result = {}
  for num = 1, 9 do
    local layer = state.layers[num]
    if layer then
      local session_count
      if num == state.active_layer then
        -- Active layer: count from live sessions module
        session_count = get_sessions().count()
      else
        -- Inactive layer: count from snapshot
        local data = layer.sessions_data
        if data and data.session_order then
          session_count = #data.session_order
        else
          session_count = 0
        end
      end
      table.insert(result, {
        num = num,
        name = layer.name,
        session_count = session_count,
        is_active = num == state.active_layer,
      })
    end
  end
  return result
end

-- Create a new layer with optional name. Returns layer number or nil if full.
function M.create(name)
  for num = 1, 9 do
    if not state.layers[num] then
      state.layers[num] = {
        name = name or ("Layer " .. num),
        sessions_data = {
          sessions = {},
          session_order = {},
          primary_session = nil,
          active_session = nil,
        },
        titlebar_data = {
          session_colors = {},
          minimized = {},
        },
      }
      return num
    end
  end
  vim.notify("Maximum layers reached (9)", vim.log.levels.WARN)
  return nil
end

-- Rename a layer
function M.rename(num, name)
  local layer = state.layers[num]
  if not layer then return end
  layer.name = name
  local footer = get_footer()
  if footer then footer.refresh() end
end

-- Close a layer. Cannot close the only remaining layer.
function M.close(num)
  local layer = state.layers[num]
  if not layer then return end

  -- Count remaining layers
  local count = 0
  for _ in pairs(state.layers) do count = count + 1 end
  if count <= 1 then
    vim.notify("Cannot close the only layer", vim.log.levels.WARN)
    return
  end

  -- If closing the active layer, switch to another first
  if num == state.active_layer then
    -- Find next available layer
    local target = nil
    for n = 1, 9 do
      if state.layers[n] and n ~= num then
        target = n
        break
      end
    end
    if target then
      M.switch_to(target)
    end
  end

  -- Close terminal buffers in the layer being removed
  local data = state.layers[num] and state.layers[num].sessions_data
  if data and data.sessions then
    for _, session in pairs(data.sessions) do
      if session.bufnr and vim.api.nvim_buf_is_valid(session.bufnr) then
        pcall(vim.api.nvim_buf_delete, session.bufnr, { force = true })
      end
    end
  end

  state.layers[num] = nil

  local footer = get_footer()
  if footer then footer.refresh() end
end

-- Find a non-spacer, non-float window in the content area.
-- Returns the window ID, or nil if none found.
local function find_content_window()
  local content_ok, content = pcall(require, "ccasp.appshell.content")
  for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    local cfg = vim.api.nvim_win_get_config(win)
    local is_float = cfg.relative and cfg.relative ~= ""
    local is_spacer = content_ok and content.is_spacer_win and content.is_spacer_win(win)
    if not is_float and not is_spacer then
      return win
    end
  end
  return nil
end

-- Core operation: switch to layer N
function M.switch_to(num)
  if not state.initialized then return end

  -- Same layer = noop
  if num == state.active_layer and state.layers[num] then return end

  -- Auto-create if layer doesn't exist
  if not state.layers[num] then
    if num < 1 or num > 9 then return end
    M.create("Layer " .. num)
  end

  local sessions = get_sessions()
  local titlebar = get_titlebar()

  -- 1. Snapshot current layer
  snapshot_current()

  -- 2. Before detaching, find a content window to preserve.
  --    We'll replace its buffer with a temporary one so it survives
  --    all session window closures (can't close the last window).
  local anchor_win = find_content_window()
  local temp_buf = nil
  if anchor_win then
    temp_buf = vim.api.nvim_create_buf(false, true)
    vim.bo[temp_buf].buftype = "nofile"
    vim.bo[temp_buf].bufhidden = "wipe"
    vim.api.nvim_win_set_buf(anchor_win, temp_buf)
  end

  -- 3. Detach all windows (keeps buffers alive via bufhidden=hide)
  sessions._detach_all_windows()

  -- 4. Focus the anchor window (content area) for reattachment
  if anchor_win and vim.api.nvim_win_is_valid(anchor_win) then
    vim.api.nvim_set_current_win(anchor_win)
  end

  -- 5. Load target layer
  local target = state.layers[num]
  state.active_layer = num

  if target.sessions_data and target.sessions_data.session_order
      and #target.sessions_data.session_order > 0 then
    -- Target has sessions: import state and reattach windows
    sessions._import_state(target.sessions_data)
    titlebar._import_state(target.titlebar_data)
    sessions._reattach_windows()
    sessions.rearrange()
  else
    -- Target is empty: import empty state and spawn a fresh session
    sessions._import_state({
      sessions = {},
      session_order = {},
      primary_session = nil,
      active_session = nil,
    })
    titlebar._import_state({
      session_colors = {},
      minimized = {},
    })
    -- Spawn a new session in the empty layer (user expects a usable terminal)
    sessions.spawn()
  end

  -- Clean up temp buffer (reattach replaced it in the anchor window)
  if temp_buf and vim.api.nvim_buf_is_valid(temp_buf) then
    pcall(vim.api.nvim_buf_delete, temp_buf, { force = true })
  end

  -- 6. Refresh chrome
  local footer = get_footer()
  if footer then footer.refresh() end
  titlebar.update_all()
end

-- Get layer info by number
function M.get(num)
  return state.layers[num]
end

-- Check if initialized
function M.is_initialized()
  return state.initialized
end

-- ═══════════════════════════════════════════════════════════════════
-- Floating Modal Dialogs (matches session_titlebar patterns)
-- ═══════════════════════════════════════════════════════════════════

local nf = require("ccasp.ui.icons")

-- Show "New Layer" floating input modal → creates + switches to new layer
function M.show_new_modal()
  local helpers = require("ccasp.panels.helpers")

  local default_name = "Layer " .. (M._next_available_num() or "?")
  local width = 40
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { default_name })

  local pos = helpers.calculate_position({ width = width, height = 1 })
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = pos.width,
    height = 1,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.maximize .. "  New Layer ",
    title_pos = "center",
    footer = " Enter: Create │ Esc: Cancel ",
    footer_pos = "center",
    style = "minimal",
  })

  vim.cmd("startinsert!")

  local function close_modal()
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    helpers.restore_terminal_focus()
  end

  local function confirm()
    local name = vim.trim(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1] or "")
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    if name ~= "" then
      local num = M.create(name)
      if num then
        M.switch_to(num)
      end
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

-- Show "Rename Layer" floating input modal
function M.show_rename_modal()
  local helpers = require("ccasp.panels.helpers")

  local active_num = state.active_layer
  local layer = state.layers[active_num]
  if not layer then return end

  local width = 40
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { layer.name })

  local pos = helpers.calculate_position({ width = width, height = 1 })
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = pos.width,
    height = 1,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.edit .. "  Rename Layer ",
    title_pos = "center",
    footer = " Enter: Apply │ Esc: Cancel ",
    footer_pos = "center",
    style = "minimal",
  })

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
      M.rename(active_num, new_name)
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

-- Show "Close Layer" floating confirmation modal
function M.show_close_modal()
  local helpers = require("ccasp.panels.helpers")

  local active_num = state.active_layer
  local layer = state.layers[active_num]
  if not layer then return end

  -- Count remaining layers — block if only one
  local count = 0
  for _ in pairs(state.layers) do count = count + 1 end
  if count <= 1 then
    vim.notify("Cannot close the only layer", vim.log.levels.WARN)
    return
  end

  local width = 36
  local height = 7

  local buf = helpers.create_buffer("ccasp://close-layer")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.close .. "  Close Layer ",
    footer = " y: Yes │ n/Esc: No ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true

  local lines = {}
  local item_lines = {}

  table.insert(lines, "")
  table.insert(lines, "  Close \"" .. layer.name .. "\"?")
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", width - 4))
  table.insert(lines, "    Yes - Close layer")
  item_lines[#lines] = { action = "yes" }
  table.insert(lines, "    No  - Cancel")
  item_lines[#lines] = { action = "no" }
  table.insert(lines, "")

  helpers.set_buffer_content(buf, lines)
  helpers.sandbox_buffer(buf)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_close_layer", buf)
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
    vim.schedule(function() M.close(active_num) end)
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

-- Internal: find next available layer number
function M._next_available_num()
  for num = 1, 9 do
    if not state.layers[num] then return num end
  end
  return nil
end

return M
