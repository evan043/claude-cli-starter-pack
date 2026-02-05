-- CCASP Form Editor UI Component
-- Editable form popup for agents, hooks, and skills

local M = {}

-- Form state
local state = {
  popup = nil,
  buf = nil,
  asset_type = nil,
  asset_name = nil,
  original_data = nil,
  field_lines = {}, -- Map line numbers to field names
  editable_regions = {}, -- Track editable line ranges
}

-- Check if nui is available
local function has_nui()
  local ok, _ = pcall(require, "nui.popup")
  return ok
end

-- Field definitions for each asset type
local FIELD_SCHEMAS = {
  agent = {
    { name = "name", label = "NAME", editable = false, type = "string" },
    { name = "description", label = "DESCRIPTION", editable = true, type = "text", max_lines = 3 },
    { name = "model", label = "MODEL", editable = true, type = "select", options = { "sonnet", "opus", "haiku" } },
    { name = "tools", label = "TOOLS", editable = true, type = "list", hint = "comma-separated" },
  },
  hook = {
    { name = "name", label = "NAME", editable = false, type = "string" },
    { name = "description", label = "DESCRIPTION", editable = true, type = "text", max_lines = 3 },
    { name = "event", label = "EVENT", editable = true, type = "select", options = { "PreToolUse", "PostToolUse", "UserPromptSubmit" } },
  },
  skill = {
    { name = "name", label = "NAME", editable = false, type = "string" },
    { name = "description", label = "DESCRIPTION", editable = true, type = "text", max_lines = 3 },
    { name = "category", label = "CATEGORY", editable = true, type = "string" },
    { name = "features", label = "FEATURES", editable = true, type = "list", hint = "comma-separated" },
  },
}

-- Get icon for asset type
local function get_icon(asset_type)
  local icons = {
    agent = "🤖",
    agents = "🤖",
    hook = "⚡",
    hooks = "⚡",
    skill = "🎯",
    skills = "🎯",
  }
  return icons[asset_type] or "📄"
end

-- Normalize asset type (handle plural forms)
local function normalize_type(asset_type)
  if asset_type == "agents" then return "agent" end
  if asset_type == "hooks" then return "hook" end
  if asset_type == "skills" then return "skill" end
  return asset_type
end

-- Format value for display
local function format_value(value, field_type)
  if value == nil then
    return ""
  end

  if field_type == "list" and type(value) == "table" then
    return table.concat(value, ", ")
  end

  return tostring(value)
end

-- Parse value from display
local function parse_value(text, field_type)
  if field_type == "list" then
    local items = {}
    for item in text:gmatch("[^,]+") do
      local trimmed = item:gsub("^%s+", ""):gsub("%s+$", "")
      if trimmed ~= "" then
        table.insert(items, trimmed)
      end
    end
    return items
  end

  return text:gsub("^%s+", ""):gsub("%s+$", "")
end

-- Render form content
local function render_form()
  local lines = {}
  local highlights = {}

  state.field_lines = {}
  state.editable_regions = {}

  local asset_type = normalize_type(state.asset_type)
  local schema = FIELD_SCHEMAS[asset_type]

  if not schema then
    table.insert(lines, "Unknown asset type: " .. tostring(state.asset_type))
    return lines, highlights
  end

  table.insert(lines, "")

  for _, field in ipairs(schema) do
    local value = state.original_data[field.name]
    local display_value = format_value(value, field.type)

    -- Field label
    local label_line = "[" .. field.label .. "]"
    if not field.editable then
      label_line = label_line .. " (read-only)"
    end
    if field.hint then
      label_line = label_line .. " " .. field.hint
    end

    table.insert(lines, label_line)
    local label_line_num = #lines
    table.insert(highlights, { label_line_num, 0, #label_line, "Title" })

    -- Field value
    local value_start_line = #lines + 1

    if field.type == "text" and field.max_lines then
      -- Multi-line text field
      local text_lines = vim.split(display_value, "\n")
      for i = 1, field.max_lines do
        local line = text_lines[i] or ""
        table.insert(lines, line)
        state.field_lines[#lines] = field.name
      end
    elseif field.type == "select" then
      -- Select field - show current value with options hint
      table.insert(lines, display_value)
      state.field_lines[#lines] = field.name

      -- Show options as hint
      local options_hint = "  Options: " .. table.concat(field.options, " | ")
      table.insert(lines, options_hint)
      table.insert(highlights, { #lines, 0, #options_hint, "Comment" })
    else
      -- Single-line field
      table.insert(lines, display_value)
      state.field_lines[#lines] = field.name
    end

    local value_end_line = #lines

    -- Track editable regions
    if field.editable then
      table.insert(state.editable_regions, {
        field = field.name,
        start_line = value_start_line,
        end_line = value_end_line,
        type = field.type,
      })
    end

    table.insert(lines, "")
  end

  -- Instructions at bottom
  table.insert(lines, string.rep("─", 50))
  table.insert(lines, "")
  table.insert(lines, "  [Ctrl+S] Save    [d] Delete    [Esc] Cancel")
  table.insert(lines, "")
  table.insert(lines, "  Edit fields directly, then press Ctrl+S to save.")
  table.insert(highlights, { #lines, 2, #lines, "Comment" })

  return lines, highlights
end

-- Extract data from buffer
local function extract_data_from_buffer()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then
    return nil
  end

  local data = vim.deepcopy(state.original_data)
  local all_lines = vim.api.nvim_buf_get_lines(state.buf, 0, -1, false)

  local asset_type = normalize_type(state.asset_type)
  local schema = FIELD_SCHEMAS[asset_type]

  if not schema then
    return data
  end

  for _, region in ipairs(state.editable_regions) do
    local field_schema = nil
    for _, f in ipairs(schema) do
      if f.name == region.field then
        field_schema = f
        break
      end
    end

    if field_schema then
      -- Extract text from region
      local region_lines = {}
      for line_num = region.start_line, region.end_line do
        local line = all_lines[line_num]
        if line and not line:match("^%s*Options:") then
          table.insert(region_lines, line)
        end
      end

      local text = table.concat(region_lines, "\n")
      data[region.field] = parse_value(text, field_schema.type)
    end
  end

  return data
end

-- Save changes
local function save_changes()
  local data = extract_data_from_buffer()
  if not data then
    vim.notify("Failed to extract form data", vim.log.levels.ERROR)
    return false
  end

  local assets = require("ccasp.core.assets")
  local success, err = assets.save(state.asset_type, state.asset_name, data)

  if success then
    vim.notify("Asset saved: " .. state.asset_name, vim.log.levels.INFO)
    M.close()

    -- Refresh sidebar
    local sidebar = require("ccasp.ui.sidebar")
    sidebar.refresh()

    return true
  else
    vim.notify("Failed to save: " .. (err or "unknown error"), vim.log.levels.ERROR)
    return false
  end
end

-- Show delete confirmation
local function show_delete_confirm()
  local delete_modal = require("ccasp.ui.delete-modal")
  delete_modal.show(state.asset_type, state.asset_name, function(deleted)
    if deleted then
      M.close()
    end
  end)
end

-- Open form editor for an asset
function M.open(asset_type, asset_name)
  if not has_nui() then
    vim.notify("nui.nvim required for form editor", vim.log.levels.WARN)
    return
  end

  local assets = require("ccasp.core.assets")
  local asset = assets.get(asset_type, asset_name)

  if not asset then
    vim.notify("Asset not found: " .. asset_name, vim.log.levels.ERROR)
    return
  end

  -- Store state
  state.asset_type = asset_type
  state.asset_name = asset_name
  state.original_data = vim.deepcopy(asset)

  local Popup = require("nui.popup")
  local icon = get_icon(asset_type)

  state.popup = Popup({
    position = "50%",
    size = {
      width = 60,
      height = 30,
    },
    border = {
      style = "rounded",
      text = {
        top = " " .. icon .. " Edit: " .. asset_name .. " ",
        top_align = "center",
        bottom = " Form Editor ",
        bottom_align = "center",
      },
    },
    buf_options = {
      modifiable = true,
      buftype = "acwrite",
      filetype = "ccasp-form",
    },
    win_options = {
      winhighlight = "Normal:Normal,FloatBorder:FloatBorder",
      cursorline = true,
    },
    enter = true,
    focusable = true,
  })

  state.popup:mount()
  state.buf = state.popup.bufnr

  -- Render form
  local lines, highlights = render_form()

  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)

  -- Apply highlights
  local ns_id = vim.api.nvim_create_namespace("ccasp_form_editor")
  for _, hl in ipairs(highlights) do
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, hl[4], hl[1] - 1, hl[2], hl[3])
  end

  -- Setup keybindings
  local opts = { buffer = state.buf, noremap = true, silent = true }

  -- Save with Ctrl+S
  vim.keymap.set({ "n", "i" }, "<C-s>", function()
    save_changes()
  end, opts)

  -- Delete
  vim.keymap.set("n", "d", function()
    show_delete_confirm()
  end, opts)

  -- Close with Escape
  vim.keymap.set("n", "<Esc>", function()
    M.close()
  end, opts)

  vim.keymap.set("n", "q", function()
    M.close()
  end, opts)

  -- Position cursor on first editable field
  if #state.editable_regions > 0 then
    local first_region = state.editable_regions[1]
    vim.api.nvim_win_set_cursor(state.popup.winid, { first_region.start_line, 0 })
  end
end

-- Close form editor
function M.close()
  if state.popup then
    state.popup:unmount()
    state.popup = nil
  end

  state.buf = nil
  state.asset_type = nil
  state.asset_name = nil
  state.original_data = nil
  state.field_lines = {}
  state.editable_regions = {}
end

-- Check if form is open
function M.is_open()
  return state.popup ~= nil
end

return M
