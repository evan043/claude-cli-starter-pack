-- ccasp/todos.lua - Todo list management for CCASP Neovim plugin
-- Reads/writes .claude/todos.json, provides data to sidebar, panel, and telescope

local M = {}

-- ─── Path resolution ──────────────────────────────────────────────

-- Find .claude/todos.json relative to project root
function M.get_todos_path()
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

-- Find or create .claude/todos.json, returns path
function M.ensure_todos_path()
  local existing = M.get_todos_path()
  if existing then return existing end

  -- Create at cwd/.claude/todos.json
  local cwd = vim.fn.getcwd()
  local claude_dir = cwd .. "/.claude"
  if vim.fn.isdirectory(claude_dir) == 0 then
    vim.fn.mkdir(claude_dir, "p")
  end
  local path = claude_dir .. "/todos.json"
  local empty = { todos = {}, metadata = { version = "1.0.0", total_items = 0 } }
  local json = vim.json.encode(empty)
  vim.fn.writefile({ json }, path)
  return path
end

-- ─── Read ─────────────────────────────────────────────────────────

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

-- ─── Write ────────────────────────────────────────────────────────

-- Write full todos data to disk
function M.write_todos(data)
  local path = M.ensure_todos_path()
  data.metadata = data.metadata or {}
  data.metadata.total_items = #(data.todos or {})
  local json = vim.json.encode(data)
  vim.fn.writefile({ json }, path)
end

-- Generate a unique todo ID: epoch-hex4
function M.generate_id()
  local epoch = os.time()
  local hex = string.format("%04x", math.random(0, 0xFFFF))
  return tostring(epoch) .. "-" .. hex
end

-- ─── CRUD ─────────────────────────────────────────────────────────

-- Add a new todo. Returns the created todo entry.
-- @param opts table: { title, detail?, priority?, tags?, status? }
function M.add_todo(opts)
  local data = M.read_todos()
  local todo = {
    id = M.generate_id(),
    title = opts.title or "Untitled",
    detail = opts.detail or "",
    priority = opts.priority or "medium",
    tags = opts.tags or {},
    status = opts.status or "pending",
    created_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),
  }
  table.insert(data.todos, 1, todo) -- prepend
  M.write_todos(data)
  return todo
end

-- Update a todo by ID. Returns true on success.
-- @param id string
-- @param fields table: key-value pairs to merge
function M.update_todo(id, fields)
  local data = M.read_todos()
  for _, todo in ipairs(data.todos) do
    if todo.id == id then
      for k, v in pairs(fields) do
        todo[k] = v
      end
      M.write_todos(data)
      return true
    end
  end
  return false
end

-- Delete a todo by ID. Returns true on success.
function M.delete_todo(id)
  local data = M.read_todos()
  for i, todo in ipairs(data.todos) do
    if todo.id == id then
      table.remove(data.todos, i)
      M.write_todos(data)
      return true
    end
  end
  return false
end

-- ─── Queries ──────────────────────────────────────────────────────

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

-- Get all unique tags, sorted A-Z
function M.get_all_tags()
  local data = M.read_todos()
  local tag_set = {}
  for _, todo in ipairs(data.todos or {}) do
    for _, tag in ipairs(todo.tags or {}) do
      tag_set[tag] = true
    end
  end
  local tags = {}
  for tag in pairs(tag_set) do
    table.insert(tags, tag)
  end
  table.sort(tags)
  return tags
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
    local pa = { critical = 1, high = 2, medium = 3, low = 4 }
    return (pa[a.priority] or 3) < (pa[b.priority] or 3)
  end)

  return sorted
end

-- Get todos with configurable sort and filter
-- @param sort_mode string: "priority" | "alpha" | "date"
-- @param tag_filter table|nil: list of tags (AND filter — todo must have ALL)
-- @param status_filter string|nil: specific status or nil for all
function M.get_sorted_filtered(sort_mode, tag_filter, status_filter)
  local data = M.read_todos()
  local result = {}

  for _, todo in ipairs(data.todos or {}) do
    -- Status filter
    if status_filter and todo.status ~= status_filter then
      goto continue
    end

    -- Tag filter: todo must have all tags in filter
    if tag_filter and #tag_filter > 0 then
      local todo_tags = {}
      for _, t in ipairs(todo.tags or {}) do
        todo_tags[t] = true
      end
      for _, required_tag in ipairs(tag_filter) do
        if not todo_tags[required_tag] then
          goto continue
        end
      end
    end

    table.insert(result, todo)
    ::continue::
  end

  -- Sort
  sort_mode = sort_mode or "priority"
  local status_order = { in_progress = 1, pending = 2, completed = 3 }
  local priority_order = { critical = 1, high = 2, medium = 3, low = 4 }

  table.sort(result, function(a, b)
    -- Always group by status first
    local sa = status_order[a.status] or 4
    local sb = status_order[b.status] or 4
    if sa ~= sb then return sa < sb end

    if sort_mode == "alpha" then
      return (a.title or ""):lower() < (b.title or ""):lower()
    elseif sort_mode == "date" then
      return (a.created_at or "") > (b.created_at or "") -- newest first
    else -- "priority"
      return (priority_order[a.priority] or 3) < (priority_order[b.priority] or 3)
    end
  end)

  return result
end

-- ─── Formatting ───────────────────────────────────────────────────

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

-- ─── Session Interaction ──────────────────────────────────────────

-- Send a command to a specific session by ID
function M.send_to_session(session_id, command)
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if not sessions_ok then
    vim.notify("CCASP: sessions module not available", vim.log.levels.WARN)
    return false
  end

  local session = sessions.get(session_id)
  if not session or not session.bufnr or not vim.api.nvim_buf_is_valid(session.bufnr) then
    vim.notify("CCASP: target session not available", vim.log.levels.WARN)
    return false
  end

  local job_id = vim.b[session.bufnr].terminal_job_id
  if not job_id or job_id <= 0 then
    vim.notify("CCASP: no terminal job in target session", vim.log.levels.WARN)
    return false
  end

  vim.fn.chansend(job_id, command .. "\n")
  return true
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
