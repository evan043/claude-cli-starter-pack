-- ccasp/todos.lua - Todo list management for CCASP Neovim plugin
-- Reads/writes .claude/todos.json, provides data to sidebar, panel, and telescope

local M = {}

-- Find .claude/todos.json relative to project root
function M.get_todos_path()
  -- Look for .claude/ directory up from cwd
  local cwd = vim.fn.getcwd()
  local path = cwd .. "/.claude/todos.json"
  if vim.fn.filereadable(path) == 1 then
    return path
  end
  -- Try parent directories
  local parent = vim.fn.fnamemodify(cwd, ":h")
  while parent ~= cwd do
    path = parent .. "/.claude/todos.json"
    if vim.fn.filereadable(path) == 1 then
      return path
    end
    cwd = parent
    parent = vim.fn.fnamemodify(cwd, ":h")
  end
  return nil
end

-- Read todos from .claude/todos.json
function M.read_todos()
  local path = M.get_todos_path()
  if not path then
    return { todos = {}, metadata = { version = "1.0.0", total_items = 0 } }
  end

  local content = vim.fn.readfile(path)
  if #content == 0 then
    return { todos = {}, metadata = { version = "1.0.0", total_items = 0 } }
  end

  local ok, data = pcall(vim.fn.json_decode, table.concat(content, "\n"))
  if not ok or not data then
    vim.notify("CCASP: Failed to parse todos.json", vim.log.levels.ERROR)
    return { todos = {}, metadata = { version = "1.0.0", total_items = 0 } }
  end

  return data
end

-- Get todos filtered by status
function M.get_by_status(status)
  local data = M.read_todos()
  local filtered = {}
  for _, todo in ipairs(data.todos or {}) do
    if todo.status == status then
      table.insert(filtered, todo)
    end
  end
  return filtered
end

-- Get counts by status
function M.get_counts()
  local data = M.read_todos()
  local counts = { pending = 0, in_progress = 0, completed = 0, total = 0 }
  for _, todo in ipairs(data.todos or {}) do
    counts[todo.status] = (counts[todo.status] or 0) + 1
    counts.total = counts.total + 1
  end
  return counts
end

-- Get all todos sorted: in_progress first, then pending, then completed
function M.get_sorted()
  local data = M.read_todos()
  local sorted = {}
  local order = { in_progress = 1, pending = 2, completed = 3 }

  for _, todo in ipairs(data.todos or {}) do
    table.insert(sorted, todo)
  end

  table.sort(sorted, function(a, b)
    local oa = order[a.status] or 4
    local ob = order[b.status] or 4
    if oa ~= ob then return oa < ob end
    -- Within same status, sort by priority
    local pa = { critical = 1, high = 2, medium = 3, low = 4 }
    return (pa[a.priority] or 3) < (pa[b.priority] or 3)
  end)

  return sorted
end

-- Format a single todo for display (short form)
function M.format_short(todo)
  local icons = { pending = "○", in_progress = "◉", completed = "✓" }
  local icon = icons[todo.status] or "?"
  local id = string.sub(todo.id or "", 1, 4)
  local priority_mark = ""
  if todo.priority == "high" or todo.priority == "critical" then
    priority_mark = " ★"
  end
  return string.format("%s [%s] %s%s", icon, id, todo.title or "", priority_mark)
end

-- Format a single todo for display (detail form)
function M.format_detail(todo)
  local lines = {}
  table.insert(lines, "Title:    " .. (todo.title or ""))
  if todo.detail and todo.detail ~= "" then
    table.insert(lines, "Detail:   " .. todo.detail)
  end
  table.insert(lines, "Status:   " .. (todo.status or "pending"))
  table.insert(lines, "Priority: " .. (todo.priority or "medium"))
  table.insert(lines, "Created:  " .. (todo.created_at or ""))
  if todo.tags and #todo.tags > 0 then
    table.insert(lines, "Tags:     " .. table.concat(todo.tags, ", "))
  end
  if todo.routed_to then
    table.insert(lines, "Routed:   " .. todo.routed_to .. " → " .. (todo.route_ref or ""))
  end
  return lines
end

-- Send a todo to Claude CLI terminal for "work on" flow
function M.work_on(todo)
  local terminal = require("ccasp.terminal")
  local cmd = "/todo work " .. (todo.id or "")
  terminal.send(cmd)
end

-- Send quick-add command to Claude CLI terminal
function M.quick_add(text)
  local terminal = require("ccasp.terminal")
  local cmd = "/todo-add " .. text
  terminal.send(cmd)
end

return M
