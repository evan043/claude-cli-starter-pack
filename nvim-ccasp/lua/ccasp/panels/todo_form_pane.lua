-- ccasp/panels/todo_form_pane.lua - Create/edit form for todos
-- Uses nui-components.nvim when available, falls back to manual buffer form.

local M = {}
local helpers = require("ccasp.panels.helpers")
local todos_mod = require("ccasp.todos")

-- ─── Session option builder ───────────────────────────────────────

local function build_session_items()
  local items = {}
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if not sessions_ok then
    table.insert(items, { id = "primary", label = "Primary Session" })
    return items
  end

  local layers_ok, layers = pcall(require, "ccasp.layers")
  if layers_ok and layers.is_initialized() then
    for _, layer in ipairs(layers.list()) do
      if layer.is_active then
        local layer_sessions = sessions.list()
        for _, s in ipairs(layer_sessions) do
          local prefix = s.is_primary and "● " or "  "
          table.insert(items, {
            id = s.id,
            label = prefix .. (s.name or s.id) .. " (" .. layer.name .. ")",
          })
        end
      end
    end
  else
    for _, s in ipairs(sessions.list()) do
      local prefix = s.is_primary and "● " or "  "
      table.insert(items, { id = s.id, label = prefix .. (s.name or s.id) })
    end
  end

  if #items == 0 then
    table.insert(items, { id = "primary", label = "Primary Session" })
  end

  return items
end

-- ─── nui-components form ──────────────────────────────────────────

-- Try to render form with nui-components. Returns true if successful.
local function render_nui_components(bufnr, winid, mode, todo, on_save, on_cancel)
  local ok, n = pcall(require, "nui-components")
  if not ok then return false end

  -- Get window dimensions
  if not winid or not vim.api.nvim_win_is_valid(winid) then return false end
  local width = vim.api.nvim_win_get_width(winid)
  local height = vim.api.nvim_win_get_height(winid)

  local initial_title = (mode == "edit" and todo) and (todo.title or "") or ""
  local initial_detail = (mode == "edit" and todo) and (todo.detail or "") or ""
  local initial_priority = (mode == "edit" and todo) and (todo.priority or "medium") or "medium"
  local initial_tags = ""
  if mode == "edit" and todo and todo.tags then
    initial_tags = table.concat(todo.tags, ", ")
  end

  local signal = n.create_signal({
    title = initial_title,
    detail = initial_detail,
    priority = initial_priority,
    tags = initial_tags,
    session_id = "primary",
  })

  local session_items = build_session_items()
  local session_data = {}
  for _, item in ipairs(session_items) do
    table.insert(session_data, n.option(item.id, { text = item.label }))
  end

  local priority_data = {
    n.option("low", { text = "Low" }),
    n.option("medium", { text = "Medium" }),
    n.option("high", { text = "High" }),
    n.option("critical", { text = "Critical" }),
  }
  -- Mark current priority as selected
  for _, opt in ipairs(priority_data) do
    if opt.id == initial_priority then
      opt.is_selected = true
    end
  end

  local heading = mode == "edit" and " Edit Todo" or " New Todo"

  local renderer = n.create_renderer({
    width = width,
    height = height,
    relative = { type = "win", winid = winid },
    position = { row = 0, col = 0 },
  })

  local body = function()
    return n.rows(
      n.paragraph({ lines = { n.line(n.text(heading, "CcaspOnboardingCardTitle")) }, is_focusable = false }),
      n.gap(1),
      n.text_input({
        id = "title",
        border_label = "Title",
        autofocus = true,
        max_lines = 1,
        value = initial_title,
        on_change = function(value)
          signal.title = value
        end,
      }),
      n.gap(1),
      n.text_input({
        id = "detail",
        border_label = "Detail (optional)",
        max_lines = 3,
        value = initial_detail,
        on_change = function(value)
          signal.detail = value
        end,
      }),
      n.gap(1),
      n.select({
        id = "priority",
        border_label = "Priority",
        data = priority_data,
        on_select = function(item)
          signal.priority = item.id
        end,
      }),
      n.gap(1),
      n.text_input({
        id = "tags",
        border_label = "Tags (comma-separated)",
        max_lines = 1,
        value = initial_tags,
        on_change = function(value)
          signal.tags = value
        end,
      }),
      n.gap(1),
      n.select({
        id = "session",
        border_label = "Target Session",
        data = session_data,
        on_select = function(item)
          signal.session_id = item.id
        end,
      }),
      n.gap(1),
      n.columns(
        { flex = 0 },
        n.button({
          label = "  Save  ",
          on_press = function()
            local title_val = signal.title:get_value()
            if not title_val or title_val == "" then
              vim.notify("Title is required", vim.log.levels.WARN)
              return
            end

            -- Parse tags
            local tags = {}
            local tags_str = signal.tags:get_value() or ""
            for tag in tags_str:gmatch("[^,]+") do
              tag = vim.trim(tag)
              if tag ~= "" then
                table.insert(tags, tag)
              end
            end

            local result = {
              title = title_val,
              detail = signal.detail:get_value() or "",
              priority = signal.priority:get_value() or "medium",
              tags = tags,
              session_id = signal.session_id:get_value() or "primary",
            }

            renderer:close()
            if on_save then on_save(result) end
          end,
        }),
        n.gap(2),
        n.button({
          label = " Cancel ",
          on_press = function()
            renderer:close()
            if on_cancel then on_cancel() end
          end,
        })
      )
    )
  end

  renderer:render(body)
  return true
end

-- ─── Fallback manual form ─────────────────────────────────────────

-- Manual buffer-based form for when nui-components is not available.
-- Uses labeled fields with cursor-line navigation.
local function render_manual_form(bufnr, winid, mode, todo, on_save, on_cancel)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  -- Form state
  local form = {
    title = (mode == "edit" and todo) and (todo.title or "") or "",
    detail = (mode == "edit" and todo) and (todo.detail or "") or "",
    priority = (mode == "edit" and todo) and (todo.priority or "medium") or "medium",
    tags = "",
    session_id = "primary",
    field_order = { "title", "detail", "priority", "tags", "session", "save", "cancel" },
    field_lines = {},  -- line_num -> field_name
    current_field = 1,
  }

  if mode == "edit" and todo and todo.tags then
    form.tags = table.concat(todo.tags, ", ")
  end

  local session_items = build_session_items()
  local priority_opts = { "low", "medium", "high", "critical" }

  local function render_form()
    local lines = {}
    form.field_lines = {}

    local heading = mode == "edit" and " Edit Todo" or " New Todo"
    table.insert(lines, "")
    table.insert(lines, "  " .. heading)
    table.insert(lines, "  " .. string.rep("─", 35))
    table.insert(lines, "")

    -- Title field
    table.insert(lines, "  Title:")
    table.insert(lines, "    " .. (form.title ~= "" and form.title or "(empty)"))
    form.field_lines[#lines] = "title"

    table.insert(lines, "")

    -- Detail field
    table.insert(lines, "  Detail:")
    table.insert(lines, "    " .. (form.detail ~= "" and form.detail or "(empty)"))
    form.field_lines[#lines] = "detail"

    table.insert(lines, "")

    -- Priority (cycle)
    table.insert(lines, "  Priority:")
    table.insert(lines, "    " .. form.priority .. "  (Enter to cycle)")
    form.field_lines[#lines] = "priority"

    table.insert(lines, "")

    -- Tags
    table.insert(lines, "  Tags (comma-separated):")
    table.insert(lines, "    " .. (form.tags ~= "" and form.tags or "(empty)"))
    form.field_lines[#lines] = "tags"

    table.insert(lines, "")

    -- Session
    local session_label = "Primary Session"
    for _, item in ipairs(session_items) do
      if item.id == form.session_id then
        session_label = item.label
        break
      end
    end
    table.insert(lines, "  Target Session:")
    table.insert(lines, "    " .. session_label .. "  (Enter to cycle)")
    form.field_lines[#lines] = "session"

    table.insert(lines, "")
    table.insert(lines, "  " .. string.rep("─", 35))

    table.insert(lines, "    [Enter] Save    [Esc] Cancel")
    form.field_lines[#lines] = "save"

    table.insert(lines, "")

    helpers.set_buffer_content(bufnr, lines)

    -- Apply highlights
    local ns = helpers.prepare_highlights("ccasp_todo_form", bufnr)
    for i, line in ipairs(lines) do
      if line:match("^  ─") then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspSeparator", i - 1, 0, -1)
      elseif line:match("^  %a.-:$") or line:match("^  %a.-%)$") or line:match("^  %a.-:") then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspTodoFormLabel", i - 1, 2, -1)
      end
      for s, e in line:gmatch("()%[%a+%]()") do
        vim.api.nvim_buf_add_highlight(bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
      end
    end

    return lines
  end

  render_form()

  -- Navigate to first field
  local function goto_field(field_name)
    for line_num, name in pairs(form.field_lines) do
      if name == field_name then
        pcall(vim.api.nvim_win_set_cursor, winid, { line_num, 4 })
        return
      end
    end
  end

  goto_field("title")

  -- Keymaps
  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Navigate field lines with j/k
  local function nav_next_field()
    if not winid or not vim.api.nvim_win_is_valid(winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(winid)
    local total = vim.api.nvim_buf_line_count(bufnr)
    for line = cursor[1] + 1, total do
      if form.field_lines[line] then
        vim.api.nvim_win_set_cursor(winid, { line, 4 })
        return
      end
    end
  end

  local function nav_prev_field()
    if not winid or not vim.api.nvim_win_is_valid(winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(winid)
    for line = cursor[1] - 1, 1, -1 do
      if form.field_lines[line] then
        vim.api.nvim_win_set_cursor(winid, { line, 4 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_next_field, opts)
  vim.keymap.set("n", "k", nav_prev_field, opts)
  vim.keymap.set("n", "<Down>", nav_next_field, opts)
  vim.keymap.set("n", "<Up>", nav_prev_field, opts)
  vim.keymap.set("n", "<Tab>", nav_next_field, opts)
  vim.keymap.set("n", "<S-Tab>", nav_prev_field, opts)

  -- Enter on a field: edit it
  vim.keymap.set("n", "<CR>", function()
    if not winid or not vim.api.nvim_win_is_valid(winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(winid)
    local field = form.field_lines[cursor[1]]
    if not field then return end

    if field == "save" then
      -- Execute save
      if form.title == "" then
        vim.notify("Title is required", vim.log.levels.WARN)
        return
      end
      local tags = {}
      for tag in form.tags:gmatch("[^,]+") do
        tag = vim.trim(tag)
        if tag ~= "" then table.insert(tags, tag) end
      end
      if on_save then
        on_save({
          title = form.title,
          detail = form.detail,
          priority = form.priority,
          tags = tags,
          session_id = form.session_id,
        })
      end
      return
    end

    if field == "priority" then
      -- Cycle priority
      local idx = 1
      for i, p in ipairs(priority_opts) do
        if p == form.priority then idx = i; break end
      end
      form.priority = priority_opts[(idx % #priority_opts) + 1]
      render_form()
      goto_field("priority")
      return
    end

    if field == "session" then
      -- Cycle session
      local idx = 1
      for i, item in ipairs(session_items) do
        if item.id == form.session_id then idx = i; break end
      end
      form.session_id = session_items[(idx % #session_items) + 1].id
      render_form()
      goto_field("session")
      return
    end

    -- Text fields: use vim.ui.input as last resort
    local current_val = form[field] or ""
    local prompt = field:sub(1, 1):upper() .. field:sub(2) .. ": "
    vim.ui.input({ prompt = prompt, default = current_val }, function(input)
      if input then
        form[field] = input
        render_form()
        goto_field(field)
      end
    end)
  end, opts)

  -- Esc to cancel
  vim.keymap.set("n", "<Esc>", function()
    if on_cancel then on_cancel() end
  end, opts)

  vim.keymap.set("n", "q", function()
    if on_cancel then on_cancel() end
  end, opts)
end

-- ─── Public API ───────────────────────────────────────────────────

-- Render the form into the right pane.
-- @param bufnr number: Buffer handle
-- @param winid number: Window handle
-- @param mode string: "create" | "edit"
-- @param todo table|nil: Existing todo for edit mode
-- @param on_save function(result): Called with form data on save
-- @param on_cancel function(): Called when form is cancelled
function M.render(bufnr, winid, mode, todo, on_save, on_cancel)
  -- Try nui-components first
  local ok = render_nui_components(bufnr, winid, mode, todo, on_save, on_cancel)
  if not ok then
    -- Fallback to manual form
    render_manual_form(bufnr, winid, mode, todo, on_save, on_cancel)
  end
end

return M
