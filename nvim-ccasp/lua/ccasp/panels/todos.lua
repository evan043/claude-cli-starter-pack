-- ccasp/panels/todos.lua - Dual-pane todo management panel
-- Left pane: browsable todo library with sort/filter
-- Right pane: detail view or create/edit form
-- Uses nui.layout for side-by-side float layout.

local M = {}
local helpers = require("ccasp.panels.helpers")

-- Lazy-load sub-modules to prevent cascade failures at module load time.
-- Each sub-module is loaded on first use via these accessors.
local _todos_mod
local function todos_mod()
  if not _todos_mod then
    local ok, mod = pcall(require, "ccasp.todos")
    if not ok then
      vim.notify("CCASP Todo: failed to load ccasp.todos: " .. tostring(mod), vim.log.levels.ERROR)
      return nil
    end
    _todos_mod = mod
  end
  return _todos_mod
end

local _list_pane
local function list_pane()
  if not _list_pane then
    local ok, mod = pcall(require, "ccasp.panels.todo_list_pane")
    if not ok then
      vim.notify("CCASP Todo: failed to load todo_list_pane: " .. tostring(mod), vim.log.levels.ERROR)
      return nil
    end
    _list_pane = mod
  end
  return _list_pane
end

local _detail_pane
local function detail_pane()
  if not _detail_pane then
    local ok, mod = pcall(require, "ccasp.panels.todo_detail_pane")
    if not ok then
      vim.notify("CCASP Todo: failed to load todo_detail_pane: " .. tostring(mod), vim.log.levels.ERROR)
      return nil
    end
    _detail_pane = mod
  end
  return _detail_pane
end

local _form_pane
local function form_pane()
  if not _form_pane then
    local ok, mod = pcall(require, "ccasp.panels.todo_form_pane")
    if not ok then
      vim.notify("CCASP Todo: failed to load todo_form_pane: " .. tostring(mod), vim.log.levels.ERROR)
      return nil
    end
    _form_pane = mod
  end
  return _form_pane
end

local _session_picker
local function session_picker()
  if not _session_picker then
    local ok, mod = pcall(require, "ccasp.panels.todo_session_picker")
    if not ok then
      vim.notify("CCASP Todo: failed to load todo_session_picker: " .. tostring(mod), vim.log.levels.ERROR)
      return nil
    end
    _session_picker = mod
  end
  return _session_picker
end

-- ─── State ────────────────────────────────────────────────────────

local state = {
  -- nui objects
  layout = nil,
  left_popup = nil,
  right_popup = nil,

  -- Panel mode
  right_mode = "detail",   -- "detail" | "create" | "edit"
  active_pane = "left",    -- "left" | "right"

  -- Data state
  sort_mode = "priority",  -- "priority" | "alpha" | "date"
  active_tags = {},        -- active tag filters
  selected_todo_id = nil,  -- currently selected todo in left pane
  target_session_id = nil, -- session to send commands to
  target_session_name = nil,

  -- Navigation
  item_lines = {},         -- left pane: line -> { type, todo_id }
}

-- Module-level open flag
M.winid = nil
M.bufnr = nil

function M.is_open()
  if state.layout then return true end
  return M.winid ~= nil and vim.api.nvim_win_is_valid(M.winid)
end

function M.toggle()
  if M.is_open() then
    M.close()
  else
    M.open()
  end
end

-- ─── Close ────────────────────────────────────────────────────────

function M.close()
  if state.layout then
    pcall(function() state.layout:unmount() end)
  elseif M.winid and vim.api.nvim_win_is_valid(M.winid) then
    -- Fallback single-pane mode
    vim.api.nvim_win_close(M.winid, true)
  end
  state.layout = nil
  state.left_popup = nil
  state.right_popup = nil
  state.item_lines = {}
  M.winid = nil
  M.bufnr = nil

  helpers.restore_terminal_focus()
end

-- ─── Helpers ──────────────────────────────────────────────────────

-- Get the currently selected todo object
local function get_selected_todo()
  if not state.selected_todo_id then return nil end
  local tm = todos_mod()
  if not tm then return nil end
  local data = tm.read_todos()
  for _, todo in ipairs(data.todos or {}) do
    if todo.id == state.selected_todo_id then return todo end
  end
  return nil
end

-- Get target session info
local function get_target_session_name()
  if state.target_session_name then
    return state.target_session_name
  end
  -- Default to primary
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if sessions_ok then
    local primary = sessions.get_primary()
    if primary then
      return primary.name or "Primary"
    end
  end
  return "Primary Session"
end

-- Get target session ID (fallback to primary)
local function get_target_session_id()
  if state.target_session_id then return state.target_session_id end
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if sessions_ok then
    local primary = sessions.get_primary()
    if primary then return primary.id end
  end
  return nil
end

-- Forward declarations for cross-referenced locals
local focus_left
local refresh_left
local refresh_right_detail

-- ─── Inline input popup (avoids vim.ui.input command-line) ────────

-- Creates a small floating input field inside the appshell.
-- @param prompt string: Border title
-- @param on_submit function(text): Called with user's input
local function inline_input(prompt, on_submit)
  local input_buf = vim.api.nvim_create_buf(false, true)
  vim.bo[input_buf].buftype = "nofile"
  vim.bo[input_buf].bufhidden = "wipe"

  local pos = helpers.calculate_position({ width = 44, height = 1 })
  local input_win = vim.api.nvim_open_win(input_buf, true, {
    relative = "editor",
    width = 44,
    height = 1,
    row = pos.row,
    col = pos.col,
    style = "minimal",
    border = "rounded",
    title = " " .. prompt .. " ",
    title_pos = "center",
    zindex = 110, -- above appshell chrome (90) and todo panel (100)
  })

  -- Make editable, enter insert mode
  vim.bo[input_buf].modifiable = true
  vim.cmd("startinsert")

  local function close_input()
    vim.cmd("stopinsert")
    if vim.api.nvim_win_is_valid(input_win) then
      vim.api.nvim_win_close(input_win, true)
    end
  end

  -- Enter → submit
  vim.keymap.set("i", "<CR>", function()
    local text = (vim.api.nvim_buf_get_lines(input_buf, 0, 1, false)[1] or "")
    close_input()
    if text ~= "" and on_submit then
      vim.schedule(function() on_submit(text) end)
    end
  end, { buffer = input_buf, nowait = true })

  -- Esc → cancel (from insert or normal mode)
  vim.keymap.set("i", "<Esc>", close_input, { buffer = input_buf, nowait = true })
  vim.keymap.set("n", "<Esc>", close_input, { buffer = input_buf, nowait = true })
  vim.keymap.set("n", "q", close_input, { buffer = input_buf, nowait = true })
end

-- ─── Refresh ──────────────────────────────────────────────────────

refresh_left = function()
  if not state.left_popup then return end
  local bufnr = state.left_popup.bufnr
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local lp = list_pane()
  if not lp then return end

  state.item_lines = lp.render(bufnr, {
    sort_mode = state.sort_mode,
    active_tags = state.active_tags,
    selected_todo_id = state.selected_todo_id,
  })
end

refresh_right_detail = function()
  if not state.right_popup then return end
  local bufnr = state.right_popup.bufnr
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  state.right_mode = "detail"
  local todo = get_selected_todo()

  local dp = detail_pane()
  if not dp then return end
  dp.render(bufnr, todo, get_target_session_name())
end

local function refresh_right_form(mode, todo)
  if not state.right_popup then return end
  local bufnr = state.right_popup.bufnr
  local winid = state.right_popup.winid
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  state.right_mode = mode

  local fp = form_pane()
  if not fp then return end

  local tm = todos_mod()
  if not tm then return end

  fp.render(bufnr, winid, mode, todo,
    -- on_save
    function(result)
      if mode == "create" then
        local new_todo = tm.add_todo({
          title = result.title,
          detail = result.detail,
          priority = result.priority,
          tags = result.tags,
        })
        state.selected_todo_id = new_todo.id
        if result.session_id and result.session_id ~= "primary" then
          state.target_session_id = result.session_id
        end
        vim.notify("Todo created: " .. result.title, vim.log.levels.INFO)
      elseif mode == "edit" and todo then
        tm.update_todo(todo.id, {
          title = result.title,
          detail = result.detail,
          priority = result.priority,
          tags = result.tags,
        })
        if result.session_id and result.session_id ~= "primary" then
          state.target_session_id = result.session_id
        end
        vim.notify("Todo updated: " .. result.title, vim.log.levels.INFO)
      end
      refresh_left()
      refresh_right_detail()
      focus_left()
    end,
    -- on_cancel
    function()
      refresh_right_detail()
      focus_left()
    end
  )
end

-- ─── Focus management ─────────────────────────────────────────────

focus_left = function()
  state.active_pane = "left"
  if state.left_popup and state.left_popup.winid and vim.api.nvim_win_is_valid(state.left_popup.winid) then
    vim.api.nvim_set_current_win(state.left_popup.winid)
  end
end

local function focus_right()
  state.active_pane = "right"
  if state.right_popup and state.right_popup.winid and vim.api.nvim_win_is_valid(state.right_popup.winid) then
    vim.api.nvim_set_current_win(state.right_popup.winid)
  end
end

-- ─── Left pane navigation ─────────────────────────────────────────

local function nav_down()
  if not state.left_popup or not state.left_popup.winid then return end
  local winid = state.left_popup.winid
  if not vim.api.nvim_win_is_valid(winid) then return end
  local bufnr = state.left_popup.bufnr
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local cursor = vim.api.nvim_win_get_cursor(winid)
  local total = vim.api.nvim_buf_line_count(bufnr)
  for line = cursor[1] + 1, total do
    if state.item_lines[line] then
      vim.api.nvim_win_set_cursor(winid, { line, 0 })
      -- Auto-select for detail preview
      if state.item_lines[line].todo_id then
        state.selected_todo_id = state.item_lines[line].todo_id
        if state.right_mode == "detail" then
          refresh_right_detail()
        end
      end
      return
    end
  end
end

local function nav_up()
  if not state.left_popup or not state.left_popup.winid then return end
  local winid = state.left_popup.winid
  if not vim.api.nvim_win_is_valid(winid) then return end

  local cursor = vim.api.nvim_win_get_cursor(winid)
  for line = cursor[1] - 1, 1, -1 do
    if state.item_lines[line] then
      vim.api.nvim_win_set_cursor(winid, { line, 0 })
      if state.item_lines[line].todo_id then
        state.selected_todo_id = state.item_lines[line].todo_id
        if state.right_mode == "detail" then
          refresh_right_detail()
        end
      end
      return
    end
  end
end

-- ─── Actions ──────────────────────────────────────────────────────

local function action_add()
  refresh_right_form("create", nil)
  focus_right()
end

local function action_edit()
  local todo = get_selected_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  refresh_right_form("edit", todo)
  focus_right()
end

local function action_work()
  local todo = get_selected_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  local tm = todos_mod()
  if not tm then return end
  local session_id = get_target_session_id()
  if session_id then
    tm.send_to_session(session_id, "/todo work " .. todo.id)
  else
    tm.work_on(todo)
  end
  M.close()
end

local function action_complete()
  local todo = get_selected_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  local tm = todos_mod()
  if not tm then return end
  tm.update_todo(todo.id, { status = "completed" })
  vim.notify("Marked complete: " .. (todo.title or ""), vim.log.levels.INFO)
  refresh_left()
  refresh_right_detail()
end

local function action_cycle_status()
  local todo = get_selected_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  local tm = todos_mod()
  if not tm then return end
  local cycle = { pending = "in_progress", in_progress = "completed", completed = "pending" }
  local new_status = cycle[todo.status] or "pending"
  tm.update_todo(todo.id, { status = new_status })
  local labels = { pending = "Pending", in_progress = "In Progress", completed = "Completed" }
  vim.notify("Status: " .. (labels[new_status] or new_status), vim.log.levels.INFO)
  refresh_left()
  refresh_right_detail()
end

local function action_delete()
  local todo = get_selected_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end

  local tm = todos_mod()
  if not tm then return end

  -- Use popup.confirm if available, else vim.ui.select
  local popup_ok, popup = pcall(require, "ccasp.ui.popup")
  if popup_ok and popup.confirm then
    popup.confirm("Delete Todo", "Delete '" .. (todo.title or "") .. "'?", function()
      tm.delete_todo(todo.id)
      state.selected_todo_id = nil
      vim.notify("Deleted: " .. (todo.title or ""), vim.log.levels.INFO)
      refresh_left()
      refresh_right_detail()
    end)
  else
    vim.ui.select({ "Yes, delete", "Cancel" }, {
      prompt = "Delete: " .. (todo.title or "") .. "?",
    }, function(choice)
      if choice == "Yes, delete" then
        tm.delete_todo(todo.id)
        state.selected_todo_id = nil
        vim.notify("Deleted: " .. (todo.title or ""), vim.log.levels.INFO)
        refresh_left()
        refresh_right_detail()
      end
    end)
  end
end

local function action_cycle_sort()
  local cycle = { priority = "alpha", alpha = "date", date = "priority" }
  state.sort_mode = cycle[state.sort_mode] or "priority"
  refresh_left()
end

local function action_toggle_tags()
  local tm = todos_mod()
  if not tm then return end
  local all_tags = tm.get_all_tags()
  if #all_tags == 0 then
    vim.notify("No tags to filter", vim.log.levels.INFO)
    return
  end

  -- Build picker items
  local items = {}
  local active_set = {}
  for _, t in ipairs(state.active_tags) do active_set[t] = true end

  for _, tag in ipairs(all_tags) do
    local prefix = active_set[tag] and "[x] " or "[ ] "
    table.insert(items, { label = prefix .. tag, tag = tag })
  end
  table.insert(items, { label = "─── Clear All ───", action = "clear" })

  local picker_ok, picker = pcall(require, "ccasp.ui.picker_popup")
  if not picker_ok then
    vim.notify("CCASP: picker_popup not available", vim.log.levels.WARN)
    return
  end
  picker.show({
    items = items,
    title = "Tag Filter",
    centered = true,
    min_width = 24,
    on_select = function(item)
      if item.action == "clear" then
        state.active_tags = {}
      elseif item.tag then
        -- Toggle tag
        if active_set[item.tag] then
          -- Remove
          local new_tags = {}
          for _, t in ipairs(state.active_tags) do
            if t ~= item.tag then table.insert(new_tags, t) end
          end
          state.active_tags = new_tags
        else
          table.insert(state.active_tags, item.tag)
        end
      end
      refresh_left()
    end,
  })
end

local function action_session_picker()
  local sp = session_picker()
  if not sp then return end
  sp.show({
    on_select = function(session_id, session_label)
      state.target_session_id = session_id
      state.target_session_name = vim.trim(session_label or "")
      if state.right_mode == "detail" then
        refresh_right_detail()
      end
    end,
  })
end

-- ─── Keymaps ──────────────────────────────────────────────────────

local function setup_left_keymaps()
  if not state.left_popup or not state.left_popup.bufnr then return end
  local bufnr = state.left_popup.bufnr
  if not vim.api.nvim_buf_is_valid(bufnr) then return end

  -- Sandbox first
  helpers.sandbox_buffer(bufnr)

  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Navigation
  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Select todo → show detail
  vim.keymap.set("n", "<CR>", function()
    if not state.left_popup or not state.left_popup.winid then return end
    local winid = state.left_popup.winid
    if not vim.api.nvim_win_is_valid(winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(winid)
    local item = state.item_lines[cursor[1]]
    if item and item.todo_id then
      state.selected_todo_id = item.todo_id
      refresh_left()
      refresh_right_detail()
    end
  end, opts)

  -- Actions
  vim.keymap.set("n", "a", action_add, opts)
  vim.keymap.set("n", "e", action_edit, opts)
  vim.keymap.set("n", "w", action_work, opts)
  vim.keymap.set("n", "c", action_complete, opts)
  vim.keymap.set("n", "p", action_cycle_status, opts)
  vim.keymap.set("n", "x", action_delete, opts)
  vim.keymap.set("n", "s", action_cycle_sort, opts)
  vim.keymap.set("n", "t", action_toggle_tags, opts)
  vim.keymap.set("n", "S", action_session_picker, opts)
  vim.keymap.set("n", "r", function()
    refresh_left()
    refresh_right_detail()
  end, opts)

  -- Pane switch
  vim.keymap.set("n", "<Tab>", focus_right, opts)

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if not state.left_popup or not state.left_popup.winid then return end
    if mouse.winid ~= state.left_popup.winid then return end
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, state.left_popup.winid, { line, 0 })
    local item = state.item_lines[line]
    if item and item.todo_id then
      state.selected_todo_id = item.todo_id
      refresh_left()
      refresh_right_detail()
    end
  end, opts)

  -- Window manager + minimize
  if state.left_popup.winid and vim.api.nvim_win_is_valid(state.left_popup.winid) then
    helpers.setup_window_manager(bufnr, state.left_popup.winid, "Todo List")
  end
end

local function setup_right_keymaps()
  if not state.right_popup or not state.right_popup.bufnr then return end
  local bufnr = state.right_popup.bufnr
  if not vim.api.nvim_buf_is_valid(bufnr) then return end

  -- Sandbox first
  helpers.sandbox_buffer(bufnr)

  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Detail mode actions
  vim.keymap.set("n", "w", action_work, opts)
  vim.keymap.set("n", "e", action_edit, opts)
  vim.keymap.set("n", "c", action_complete, opts)
  vim.keymap.set("n", "p", action_cycle_status, opts)
  vim.keymap.set("n", "x", action_delete, opts)
  vim.keymap.set("n", "S", action_session_picker, opts)
  vim.keymap.set("n", "a", action_add, opts)

  -- Pane switch
  vim.keymap.set("n", "<Tab>", focus_left, opts)

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", function()
    if state.right_mode == "create" or state.right_mode == "edit" then
      -- Cancel form, go back to detail
      refresh_right_detail()
      focus_left()
    else
      M.close()
    end
  end, opts)
end

-- ─── Open ─────────────────────────────────────────────────────────

function M.open()
  if M.is_open() then
    -- Focus existing
    focus_left()
    return
  end

  -- Try nui.layout approach
  local nui_ok, Layout = pcall(require, "nui.layout")
  local popup_ok, Popup = pcall(require, "nui.popup")

  if not nui_ok or not popup_ok then
    M._open_fallback()
    return
  end

  -- Calculate position within the content zone, clamped to available space
  local pos = helpers.calculate_position({ width = 90, height = 35 })
  -- Clamp dimensions to avoid overflow
  local max_w = vim.o.columns - 4
  local max_h = vim.o.lines - 4
  pos.width = math.min(pos.width, max_w)
  pos.height = math.min(pos.height, max_h)
  if pos.width < 40 then pos.width = 40 end
  if pos.height < 15 then pos.height = 15 end
  -- Ensure position is non-negative
  pos.row = math.max(pos.row, 0)
  pos.col = math.max(pos.col, 0)

  -- Create popups and layout inside pcall to catch constructor errors
  local mount_ok, mount_err = pcall(function()
    -- Create left popup (todo list)
    -- zindex=100 puts it above appshell chrome (zindex=90)
    state.left_popup = Popup({
      enter = true,
      focusable = true,
      zindex = 100,
      border = {
        style = "rounded",
        text = {
          top = " Todo Library ",
          top_align = "center",
        },
      },
      buf_options = {
        buftype = "nofile",
        swapfile = false,
        bufhidden = "wipe",
      },
      win_options = {
        cursorline = true,
      },
    })

    -- Create right popup (detail/form)
    state.right_popup = Popup({
      enter = false,
      focusable = true,
      zindex = 100,
      border = {
        style = "rounded",
        text = {
          top = " Detail ",
          top_align = "center",
        },
      },
      buf_options = {
        buftype = "nofile",
        swapfile = false,
        bufhidden = "wipe",
      },
      win_options = {
        cursorline = false,
      },
    })

    -- Create layout
    local layout_box = Layout.Box({
      Layout.Box(state.left_popup, { size = "40%" }),
      Layout.Box(state.right_popup, { size = "60%" }),
    }, { dir = "row" })

    state.layout = Layout({
      relative = "editor",
      position = {
        row = pos.row,
        col = pos.col,
      },
      size = {
        width = pos.width,
        height = pos.height,
      },
    }, layout_box)

    -- Mount the layout (creates container + child windows)
    state.layout:mount()
  end)

  if not mount_ok then
    vim.notify("CCASP Todo: dual-pane failed: " .. tostring(mount_err), vim.log.levels.WARN)
    state.layout = nil
    state.left_popup = nil
    state.right_popup = nil
    M._open_fallback()
    return
  end

  -- Verify that child windows were actually created
  local left_winid = state.left_popup and state.left_popup.winid
  local left_bufnr = state.left_popup and state.left_popup.bufnr
  local right_winid = state.right_popup and state.right_popup.winid
  local right_bufnr = state.right_popup and state.right_popup.bufnr

  if not left_winid or not vim.api.nvim_win_is_valid(left_winid)
    or not left_bufnr or not vim.api.nvim_buf_is_valid(left_bufnr)
    or not right_winid or not vim.api.nvim_win_is_valid(right_winid)
    or not right_bufnr or not vim.api.nvim_buf_is_valid(right_bufnr) then
    vim.notify("CCASP Todo: layout mounted but windows invalid, using fallback", vim.log.levels.WARN)
    pcall(function() state.layout:unmount() end)
    state.layout = nil
    state.left_popup = nil
    state.right_popup = nil
    M._open_fallback()
    return
  end

  -- Store references for M.is_open() etc.
  M.winid = left_winid
  M.bufnr = left_bufnr

  -- Initialize target session
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if sessions_ok then
    local primary = sessions.get_primary()
    if primary then
      state.target_session_id = primary.id
      state.target_session_name = primary.name or "Primary"
    end
  end

  -- Setup keymaps on both panes
  setup_left_keymaps()
  setup_right_keymaps()

  -- Render content
  refresh_left()
  refresh_right_detail()

  -- Focus left pane, move to first todo item
  -- Defensive re-focus for close_and_run_modal terminal mode race
  focus_left()
  vim.defer_fn(function()
    if state.left_popup and state.left_popup.winid and vim.api.nvim_win_is_valid(state.left_popup.winid) then
      vim.api.nvim_set_current_win(state.left_popup.winid)
    end
  end, 50)
  vim.schedule(function()
    if state.left_popup and state.left_popup.winid and vim.api.nvim_win_is_valid(state.left_popup.winid) then
      local buf = state.left_popup.bufnr
      if buf and vim.api.nvim_buf_is_valid(buf) then
        for line = 1, vim.api.nvim_buf_line_count(buf) do
          if state.item_lines[line] and state.item_lines[line].todo_id then
            vim.api.nvim_win_set_cursor(state.left_popup.winid, { line, 0 })
            state.selected_todo_id = state.item_lines[line].todo_id
            refresh_right_detail()
            break
          end
        end
      end
    end
  end)

  -- Cleanup when left pane buffer is wiped (layout closed externally)
  if left_bufnr and vim.api.nvim_buf_is_valid(left_bufnr) then
    vim.api.nvim_create_autocmd("BufWipeout", {
      buffer = left_bufnr,
      once = true,
      callback = function()
        vim.schedule(function()
          state.layout = nil
          state.left_popup = nil
          state.right_popup = nil
          state.item_lines = {}
          M.winid = nil
          M.bufnr = nil
        end)
      end,
    })
  end
end

-- ─── Fallback: single-pane mode (no nui.layout) ──────────────────

function M._open_fallback()
  local tm = todos_mod()
  if not tm then
    vim.notify("CCASP Todo: cannot open, todos module unavailable", vim.log.levels.ERROR)
    return
  end

  -- Create buffer via helpers
  local bufnr = helpers.create_buffer("ccasp://todos")
  local pos = helpers.calculate_position({ width = 55, height = 40 })
  local winid = helpers.create_window(bufnr, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " Todo List ",
  })

  M.bufnr = bufnr
  M.winid = winid
  vim.wo[winid].cursorline = true

  -- Defensive re-focus: close_and_run_modal terminal mode race
  vim.api.nvim_set_current_win(winid)
  vim.defer_fn(function()
    if winid and vim.api.nvim_win_is_valid(winid) then
      vim.api.nvim_set_current_win(winid)
    end
  end, 50)

  -- Render single-pane content
  M._render_fallback(bufnr)

  -- Setup keymaps
  local opts = helpers.setup_standard_keymaps(bufnr, winid, "Todo List", M, M.close)

  vim.keymap.set("n", "a", function()
    inline_input("New Todo Title", function(text)
      tm.add_todo({ title = text })
      M._render_fallback(bufnr)
      -- Re-focus the todo panel after input closes
      if winid and vim.api.nvim_win_is_valid(winid) then
        vim.api.nvim_set_current_win(winid)
      end
    end)
  end, opts)

  vim.keymap.set("n", "w", function()
    local todo = M._get_fallback_todo(winid)
    if todo then
      M.close()
      vim.schedule(function() tm.work_on(todo) end)
    end
  end, opts)

  vim.keymap.set("n", "c", function()
    local todo = M._get_fallback_todo(winid)
    if todo then
      tm.update_todo(todo.id, { status = "completed" })
      M._render_fallback(bufnr)
    end
  end, opts)

  vim.keymap.set("n", "x", function()
    local todo = M._get_fallback_todo(winid)
    if todo then
      tm.delete_todo(todo.id)
      M._render_fallback(bufnr)
    end
  end, opts)

  vim.keymap.set("n", "r", function()
    M._render_fallback(bufnr)
  end, opts)

  -- Cycle status: pending → in_progress → completed
  vim.keymap.set("n", "p", function()
    local todo = M._get_fallback_todo(winid)
    if todo then
      local cycle = { pending = "in_progress", in_progress = "completed", completed = "pending" }
      tm.update_todo(todo.id, { status = cycle[todo.status] or "pending" })
      M._render_fallback(bufnr)
    end
  end, opts)

  -- Edit title inline
  vim.keymap.set("n", "e", function()
    local todo = M._get_fallback_todo(winid)
    if not todo then return end
    inline_input("Edit Title", function(text)
      tm.update_todo(todo.id, { title = text })
      M._render_fallback(bufnr)
      if winid and vim.api.nvim_win_is_valid(winid) then
        vim.api.nvim_set_current_win(winid)
      end
    end)
  end, opts)

  -- Sort cycle
  vim.keymap.set("n", "s", function()
    local cycle = { priority = "alpha", alpha = "date", date = "priority" }
    state.sort_mode = cycle[state.sort_mode] or "priority"
    M._render_fallback(bufnr)
  end, opts)

  -- j/k navigation
  local function fb_nav(dir)
    if not winid or not vim.api.nvim_win_is_valid(winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(winid)
    local total = vim.api.nvim_buf_line_count(bufnr)
    local start, finish, step
    if dir == "down" then
      start, finish, step = cursor[1] + 1, total, 1
    else
      start, finish, step = cursor[1] - 1, 1, -1
    end
    for line = start, finish, step do
      if state.item_lines[line] then
        vim.api.nvim_win_set_cursor(winid, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", function() fb_nav("down") end, opts)
  vim.keymap.set("n", "k", function() fb_nav("up") end, opts)
  vim.keymap.set("n", "<Down>", function() fb_nav("down") end, opts)
  vim.keymap.set("n", "<Up>", function() fb_nav("up") end, opts)

  vim.keymap.set("n", "<CR>", function()
    local todo = M._get_fallback_todo(winid)
    if todo then
      M.close()
      vim.schedule(function() tm.work_on(todo) end)
    end
  end, opts)
end

function M._render_fallback(bufnr)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local tm = todos_mod()
  if not tm then return end

  local sort_mode = state.sort_mode or "priority"
  local todos = tm.get_sorted_filtered(sort_mode)
  local counts = tm.get_counts()
  local lines = {}
  state.item_lines = {}

  local sort_labels = { priority = "Priority", alpha = "A-Z", date = "Date" }

  table.insert(lines, "")
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Todo Overview                                  │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")
  table.insert(lines, string.format("    %d total   %d pending   %d active   %d done",
    counts.total, counts.pending or 0, counts.in_progress or 0, counts.completed or 0))
  table.insert(lines, "    Sort: " .. (sort_labels[sort_mode] or sort_mode) .. "  [s] cycle")
  table.insert(lines, "")

  if #todos == 0 then
    table.insert(lines, "    No todos yet. Press [a] to add one.")
  else
    local last_status = nil
    for _, todo in ipairs(todos) do
      if todo.status ~= last_status then
        if last_status then table.insert(lines, "") end
        local headers = {
          in_progress = "  ◉ In Progress",
          pending     = "  ○ Pending",
          completed   = "  ✓ Completed",
        }
        table.insert(lines, headers[todo.status] or ("  " .. todo.status))
        last_status = todo.status
      end
      local icon = ({ pending = "○", in_progress = "◉", completed = "✓" })[todo.status] or "?"
      local pri = ""
      if todo.priority == "critical" then pri = " ★★"
      elseif todo.priority == "high" then pri = " ★" end
      local tag_str = ""
      if todo.tags and #todo.tags > 0 then
        local parts = {}
        for _, tag in ipairs(todo.tags) do table.insert(parts, "[" .. tag .. "]") end
        tag_str = " " .. table.concat(parts, "")
      end
      table.insert(lines, string.format("    %s %s%s%s", icon, todo.title or "", pri, tag_str))
      state.item_lines[#lines] = { type = "todo", todo_id = todo.id }
    end
  end

  table.insert(lines, "")
  table.insert(lines, "  [a] Add  [e] Edit  [w] Work  [c] Done  [p] Status")
  table.insert(lines, "  [x] Delete  [s] Sort  [r] Refresh  [q] Close")
  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_todos_fb", bufnr)
  for i, line in ipairs(lines) do
    if line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingCard", i - 1, 0, -1)
      local title_s, title_e = line:find("│  (.-)%s*│")
      if title_s and line:match("^  │") then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingCardTitle", i - 1, title_s + 2, title_e - 2)
      end
    end
    -- Sort label
    if line:match("Sort:") then
      local sort_s = line:find("Sort: ")
      if sort_s then
        local label_start = sort_s + 5
        local label_end = line:find("%s+%[s%]") or #line
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoSortActive", i - 1, label_start, label_end)
      end
    end
    -- Status section headers
    if line:match("^  ◉ In Progress") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusInfo", i - 1, 0, -1)
    elseif line:match("^  ○ Pending") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspMuted", i - 1, 0, -1)
    elseif line:match("^  ✓ Completed") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusOk", i - 1, 0, -1)
    end
    -- Todo item icons
    if state.item_lines[i] then
      if line:match("✓") then
        for s in line:gmatch("()✓") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusOk", i - 1, s - 1, s + 2)
        end
      end
      if line:match("◉") then
        for s in line:gmatch("()◉") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusInfo", i - 1, s - 1, s + 2)
        end
      end
      if line:match("○") then
        for s in line:gmatch("()○") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspMuted", i - 1, s - 1, s + 2)
        end
      end
      -- Priority stars
      if line:match("★★") then
        for s in line:gmatch("()★★") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoPriorityCrit", i - 1, s - 1, s + 5)
        end
      elseif line:match("★") then
        for s in line:gmatch("()★") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoPriorityHigh", i - 1, s - 1, s + 2)
        end
      end
      -- Tag badges on items
      for s, e in line:gmatch("()%[[^%]]+%]()") do
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoTagBadge", i - 1, s - 1, e - 1)
      end
    else
      -- Keybinding hints [a] [w] etc. (not on item lines)
      for s, e in line:gmatch("()%[%w%]()") do
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
      end
    end
  end
end

function M._get_fallback_todo(winid)
  if not winid or not vim.api.nvim_win_is_valid(winid) then return nil end
  local tm = todos_mod()
  if not tm then return nil end
  local row = vim.api.nvim_win_get_cursor(winid)[1]
  local item = state.item_lines[row]
  if not item or not item.todo_id then return nil end
  local data = tm.read_todos()
  for _, todo in ipairs(data.todos or {}) do
    if todo.id == item.todo_id then return todo end
  end
  return nil
end

return M
