-- ccasp/panels/todo_detail_pane.lua - Read-only detail view for a selected todo
-- Renders into the right popup buffer of the dual-pane todo layout.

local M = {}
local helpers = require("ccasp.panels.helpers")

-- Render detail view for a todo into the given popup buffer.
-- @param bufnr number: Buffer handle of the right popup
-- @param todo table|nil: The selected todo, or nil for empty state
-- @param target_session_name string|nil: Name of the target session
function M.render(bufnr, todo, target_session_name)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local lines = {}

  if not todo then
    -- Empty state
    table.insert(lines, "")
    table.insert(lines, "  Select a todo from the left pane")
    table.insert(lines, "  to view its details here.")
    table.insert(lines, "")
    table.insert(lines, "  Press [a] to add a new todo.")
    helpers.set_buffer_content(bufnr, lines)
    M.apply_highlights(bufnr, lines)
    return
  end

  -- Header card
  table.insert(lines, "")
  table.insert(lines, "  ╭───────────────────────────────────╮")
  table.insert(lines, "  │  Todo Detail                      │")
  table.insert(lines, "  ╰───────────────────────────────────╯")
  table.insert(lines, "")

  -- Fields
  table.insert(lines, "  Title:    " .. (todo.title or ""))

  local status_icons = { pending = "○", in_progress = "◉", completed = "✓" }
  local status_labels = { pending = "Pending", in_progress = "In Progress", completed = "Completed" }
  local icon = status_icons[todo.status] or "?"
  local label = status_labels[todo.status] or todo.status
  table.insert(lines, "  Status:   " .. icon .. " " .. label)

  local priority_icons = { critical = "★★", high = "★", medium = "●", low = "·" }
  local priority_labels = { critical = "Critical", high = "High", medium = "Medium", low = "Low" }
  local pri_icon = priority_icons[todo.priority] or "●"
  local pri_label = priority_labels[todo.priority] or todo.priority
  table.insert(lines, "  Priority: " .. pri_icon .. " " .. pri_label)

  if todo.tags and #todo.tags > 0 then
    table.insert(lines, "  Tags:     " .. table.concat(todo.tags, ", "))
  end

  if todo.created_at then
    -- Format ISO timestamp to readable
    local display_date = todo.created_at:gsub("T", " "):gsub("Z$", "")
    table.insert(lines, "  Created:  " .. display_date)
  end

  if todo.detail and todo.detail ~= "" then
    table.insert(lines, "")
    table.insert(lines, "  Detail:")
    -- Wrap long detail text
    for line in todo.detail:gmatch("[^\n]+") do
      table.insert(lines, "    " .. line)
    end
  end

  if todo.routed_to then
    table.insert(lines, "")
    table.insert(lines, "  Routed:   " .. todo.routed_to .. " → " .. (todo.route_ref or ""))
  end

  -- Actions card
  table.insert(lines, "")
  table.insert(lines, "  ╭───────────────────────────────────╮")
  table.insert(lines, "  │  Actions                          │")
  table.insert(lines, "  ╰───────────────────────────────────╯")
  table.insert(lines, "")
  table.insert(lines, "  [w]  Work on this todo")
  table.insert(lines, "  [e]  Edit")
  table.insert(lines, "  [c]  Mark Complete")
  table.insert(lines, "  [p]  Cycle Status")
  table.insert(lines, "  [x]  Delete")

  -- Target session card
  table.insert(lines, "")
  table.insert(lines, "  ╭───────────────────────────────────╮")
  table.insert(lines, "  │  Target Session                   │")
  table.insert(lines, "  ╰───────────────────────────────────╯")
  table.insert(lines, "")
  table.insert(lines, "  " .. (target_session_name or "Primary Session"))
  table.insert(lines, "  [S]  Change Target Session")
  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)
  M.apply_highlights(bufnr, lines)
end

-- Apply highlights to the detail view
function M.apply_highlights(bufnr, lines)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local ns = helpers.prepare_highlights("ccasp_todo_detail", bufnr)

  for i, line in ipairs(lines) do
    -- Card borders
    if line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingCard", i - 1, 0, -1)
      local title_s, title_e = line:find("│  (.-)%s*│")
      if title_s and line:match("^  │") then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingCardTitle", i - 1, title_s + 2, title_e - 2)
      end
    end

    -- Field labels (Title:, Status:, etc.)
    local label_end = line:find(":%s+")
    if label_end and line:match("^  %a") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoFormLabel", i - 1, 2, label_end)
    end

    -- Status icons
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

    -- Keybinding highlights [x]
    for s, e in line:gmatch("()%[%w%]()") do
      vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
    end
  end
end

return M
