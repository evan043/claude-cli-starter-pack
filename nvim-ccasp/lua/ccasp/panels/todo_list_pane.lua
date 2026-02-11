-- ccasp/panels/todo_list_pane.lua - Browsable todo library (left pane)
-- Read-only buffer with sort/filter controls, rendered into the left popup.

local M = {}
local helpers = require("ccasp.panels.helpers")
local todos_mod = require("ccasp.todos")

-- Render the todo list into the given buffer.
-- @param bufnr number: Buffer handle
-- @param state table: Shared panel state { sort_mode, active_tags, selected_todo_id }
-- @return table: item_lines map (line_num -> { type, todo_id? })
function M.render(bufnr, state)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return {} end

  local sort_mode = state.sort_mode or "priority"
  local active_tags = state.active_tags or {}
  local todos = todos_mod.get_sorted_filtered(sort_mode, active_tags)
  local counts = todos_mod.get_counts()

  local lines = {}
  local item_lines = {}

  -- Sort indicator
  local sort_labels = { priority = "Priority", alpha = "A-Z", date = "Date" }
  table.insert(lines, "")
  table.insert(lines, "  Sort: " .. (sort_labels[sort_mode] or sort_mode) .. " ▼  [s] cycle")

  -- Tag filter bar
  local all_tags = todos_mod.get_all_tags()
  if #all_tags > 0 then
    local tag_parts = {}
    local active_set = {}
    for _, t in ipairs(active_tags) do active_set[t] = true end
    for _, tag in ipairs(all_tags) do
      if active_set[tag] then
        table.insert(tag_parts, "[" .. tag .. "]")
      else
        table.insert(tag_parts, tag)
      end
    end
    table.insert(lines, "  Tags: " .. table.concat(tag_parts, "  ") .. "  [t] filter")
  end

  -- Summary line
  table.insert(lines, string.format("  %d total  %d pending  %d active  %d done",
    counts.total, counts.pending or 0, counts.in_progress or 0, counts.completed or 0))
  table.insert(lines, "  " .. string.rep("─", 36))

  if #todos == 0 then
    table.insert(lines, "")
    if #active_tags > 0 then
      table.insert(lines, "  No todos match the active filters.")
      table.insert(lines, "  Press [t] to adjust tag filters.")
    else
      table.insert(lines, "  No todos yet.")
      table.insert(lines, "  Press [a] to add one.")
    end
    table.insert(lines, "")
    helpers.set_buffer_content(bufnr, lines)
    M.apply_highlights(bufnr, lines, state, item_lines)
    return item_lines
  end

  -- Group by status
  local last_status = nil
  local status_icons = { pending = "○", in_progress = "◉", completed = "✓" }
  local status_headers = {
    in_progress = "◉ IN PROGRESS",
    pending     = "○ PENDING",
    completed   = "✓ COMPLETED",
  }

  for _, todo in ipairs(todos) do
    if todo.status ~= last_status then
      table.insert(lines, "")
      table.insert(lines, "  " .. (status_headers[todo.status] or todo.status:upper()))
      last_status = todo.status
    end

    -- Build todo line
    local icon = status_icons[todo.status] or "?"
    local priority_mark = ""
    if todo.priority == "critical" then
      priority_mark = " ★★"
    elseif todo.priority == "high" then
      priority_mark = " ★"
    end

    local tag_str = ""
    if todo.tags and #todo.tags > 0 then
      local tag_parts = {}
      for _, tag in ipairs(todo.tags) do
        table.insert(tag_parts, "[" .. tag .. "]")
      end
      tag_str = " " .. table.concat(tag_parts, "")
    end

    -- Highlight selected todo
    local selected_marker = ""
    if state.selected_todo_id and todo.id == state.selected_todo_id then
      selected_marker = " ◄"
    end

    local line = string.format("    %s %s%s%s%s", icon, todo.title or "", priority_mark, tag_str, selected_marker)
    table.insert(lines, line)
    item_lines[#lines] = { type = "todo", todo_id = todo.id }
  end

  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)
  M.apply_highlights(bufnr, lines, state, item_lines)
  return item_lines
end

-- Apply syntax highlights
function M.apply_highlights(bufnr, lines, state, item_lines)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local ns = helpers.prepare_highlights("ccasp_todo_list", bufnr)
  local active_set = {}
  for _, t in ipairs(state.active_tags or {}) do active_set[t] = true end

  for i, line in ipairs(lines) do
    -- Sort label
    if line:match("^  Sort:") then
      local sort_s = line:find("Sort: ") + 5
      local sort_e = line:find(" ▼")
      if sort_s and sort_e then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoSortActive", i - 1, sort_s, sort_e)
      end
    end

    -- Tag filter bar with active highlighting
    if line:match("^  Tags:") then
      -- Highlight active tags (bracketed) vs inactive
      for s, tag, e in line:gmatch("()%[([^%]]+)%]()") do
        if active_set[tag] then
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoTagActive", i - 1, s - 1, e - 1)
        else
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoTagBadge", i - 1, s - 1, e - 1)
        end
      end
    end

    -- Separator
    if line:match("^  ─") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspSeparator", i - 1, 0, -1)
    end

    -- Status section headers
    if line:match("^  ◉ IN PROGRESS") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusInfo", i - 1, 0, -1)
    elseif line:match("^  ○ PENDING") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspMuted", i - 1, 0, -1)
    elseif line:match("^  ✓ COMPLETED") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusOk", i - 1, 0, -1)
    end

    -- Individual todo items
    if item_lines[i] and item_lines[i].type == "todo" then
      -- Status icon
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

      -- Tag badges on todo items
      for s, e in line:gmatch("()%[[^%]]+%]()") do
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoTagBadge", i - 1, s - 1, e - 1)
      end

      -- Selection marker
      if line:match("◄") then
        for s in line:gmatch("()◄") do
          vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspStatusInfo", i - 1, s - 1, s + 2)
        end
      end

      -- Selected row gets highlight
      if state.selected_todo_id and item_lines[i].todo_id == state.selected_todo_id then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspCmdSelected", i - 1, 0, -1)
      end
    end

    -- Keybinding hints [s] [t] [a]
    for s, e in line:gmatch("()%[%w%]()") do
      -- Don't highlight tag badges (already done above)
      if not item_lines[i] then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
      end
    end
  end
end

return M
