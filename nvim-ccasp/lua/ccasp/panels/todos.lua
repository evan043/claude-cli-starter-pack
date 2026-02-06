-- ccasp/panels/todos.lua - Floating todo management panel
-- Full CRUD interface in a floating window

local M = {}
local todos_mod = require("ccasp.todos")
local helpers = require("ccasp.panels.helpers")

-- State
M.bufnr = nil
M.winid = nil
local todo_lines = {} -- Map line numbers to todo IDs

-- Get todo icon with fallback
local function get_todo_icon()
  local ok, nf = pcall(require, "ccasp.ui.icons")
  if ok and nf.todo then
    return nf.todo
  end
  return "☑" -- Fallback icon
end

function M.is_open()
  return M.winid and vim.api.nvim_win_is_valid(M.winid)
end

function M.toggle()
  if M.is_open() then
    M.close()
  else
    M.open()
  end
end

function M.close()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_close(M.winid, true)
  end
  M.winid = nil
  M.bufnr = nil
  todo_lines = {}
end

function M.open()
  if M.is_open() then
    M.refresh()
    return
  end

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[M.bufnr].buftype = "nofile"
  vim.bo[M.bufnr].bufhidden = "wipe"
  vim.bo[M.bufnr].filetype = "ccasp-todos"

  -- Calculate window dimensions
  local width = math.min(60, vim.o.columns - 10)
  local height = math.min(30, vim.o.lines - 6)
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  -- Create floating window
  M.winid = vim.api.nvim_open_win(M.bufnr, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = "rounded",
    title = " " .. get_todo_icon() .. " Todo List ",
    title_pos = "center",
  })

  -- Set window options
  vim.wo[M.winid].wrap = false
  vim.wo[M.winid].cursorline = true

  -- Render content
  M.refresh()

  -- Set keybindings
  local opts = { buffer = M.bufnr, noremap = true, silent = true }
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)
  vim.keymap.set("n", "<CR>", M.action_work, opts)
  vim.keymap.set("n", "a", M.action_add, opts)
  vim.keymap.set("n", "d", M.action_detail, opts)
  vim.keymap.set("n", "c", M.action_complete, opts)
  vim.keymap.set("n", "x", M.action_delete, opts)
  vim.keymap.set("n", "r", M.refresh, opts)
end

function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then return end

  local todos = todos_mod.get_sorted()
  local counts = todos_mod.get_counts()
  local lines = {}
  todo_lines = {}

  -- Header
  table.insert(lines, string.format("  Todos: %d total  |  %d pending  %d active  %d done",
    counts.total, counts.pending, counts.in_progress, counts.completed))
  table.insert(lines, string.rep("─", 58))
  table.insert(lines, "")

  if #todos == 0 then
    table.insert(lines, "  No todos yet. Press 'a' to add one.")
    table.insert(lines, "")
  else
    local last_status = nil
    for _, todo in ipairs(todos) do
      -- Section header
      if todo.status ~= last_status then
        local headers = {
          in_progress = "  ◉ IN PROGRESS",
          pending = "  ○ PENDING",
          completed = "  ✓ COMPLETED"
        }
        if last_status then table.insert(lines, "") end
        table.insert(lines, headers[todo.status] or "  ? UNKNOWN")
        table.insert(lines, "")
        last_status = todo.status
      end

      -- Todo line
      local line = "  " .. todos_mod.format_short(todo)
      table.insert(lines, line)
      todo_lines[#lines] = todo.id
    end
  end

  -- Footer
  table.insert(lines, "")
  table.insert(lines, string.rep("─", 58))
  table.insert(lines, "  [Enter] Work on  [a] Add  [d] Detail  [c] Complete  [x] Delete")
  table.insert(lines, "  [r] Refresh  [q] Close")

  vim.bo[M.bufnr].modifiable = true
  vim.api.nvim_buf_set_lines(M.bufnr, 0, -1, false, lines)
  vim.bo[M.bufnr].modifiable = false
end

-- Get todo at current cursor line
function M.get_current_todo()
  if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return nil end
  local row = vim.api.nvim_win_get_cursor(M.winid)[1]
  local todo_id = todo_lines[row]
  if not todo_id then return nil end

  local data = todos_mod.read_todos()
  for _, todo in ipairs(data.todos or {}) do
    if todo.id == todo_id then return todo end
  end
  return nil
end

function M.action_work()
  local todo = M.get_current_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  M.close()
  todos_mod.work_on(todo)
end

function M.action_add()
  vim.ui.input({ prompt = "New todo: " }, function(input)
    if input and input ~= "" then
      M.close()
      todos_mod.quick_add(input)
    end
  end)
end

function M.action_detail()
  local todo = M.get_current_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  local detail_lines = todos_mod.format_detail(todo)
  vim.notify(table.concat(detail_lines, "\n"), vim.log.levels.INFO)
end

function M.action_complete()
  local todo = M.get_current_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  -- Send complete command to terminal
  local terminal = require("ccasp.terminal")
  terminal.send("/todo complete " .. todo.id)
  -- Refresh after a short delay
  vim.defer_fn(function() M.refresh() end, 1000)
end

function M.action_delete()
  local todo = M.get_current_todo()
  if not todo then
    vim.notify("No todo selected", vim.log.levels.WARN)
    return
  end
  vim.ui.select({"Yes, delete", "Cancel"}, {
    prompt = "Delete: " .. todo.title .. "?",
  }, function(choice)
    if choice == "Yes, delete" then
      local terminal = require("ccasp.terminal")
      terminal.send("/todo delete " .. todo.id)
      vim.defer_fn(function() M.refresh() end, 1000)
    end
  end)
end

-- Render function (for consistency with other panels)
function M.render()
  return M.refresh()
end

return M
