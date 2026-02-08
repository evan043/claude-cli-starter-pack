-- ccasp/project_config/ui.lua - Project Configuration Panel
-- Centered floating panel for toggling app mode and feature flags.
--
-- Controls:
--   j/k, arrows:  Navigate items (skips headers/separators)
--   Enter/Space:  Toggle feature or select app mode
--   _:            Minimize to taskbar
--   Esc/q:        Close and restore terminal focus

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")
local storage = require("ccasp.project_config.storage")

local state = {
  bufnr = nil,
  winid = nil,
  item_lines = {},
}

-------------------------------------------------------------------------------
-- Close helpers
-------------------------------------------------------------------------------

local function close_panel()
  if state.winid and vim.api.nvim_win_is_valid(state.winid) then
    vim.api.nvim_win_close(state.winid, true)
  end
  state.winid = nil
  state.bufnr = nil
  state.item_lines = {}
  helpers.restore_terminal_focus()
end

-------------------------------------------------------------------------------
-- Navigation
-------------------------------------------------------------------------------

local function navigate(direction)
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end

  local cursor = vim.api.nvim_win_get_cursor(state.winid)
  local line = cursor[1]
  local total = vim.api.nvim_buf_line_count(state.bufnr)

  local next_line = line + direction
  while next_line >= 1 and next_line <= total do
    if state.item_lines[next_line] then
      vim.api.nvim_win_set_cursor(state.winid, { next_line, 2 })
      return
    end
    next_line = next_line + direction
  end
end

local function move_to_first_item()
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end

  local total = vim.api.nvim_buf_line_count(state.bufnr)
  for i = 1, total do
    if state.item_lines[i] then
      vim.api.nvim_win_set_cursor(state.winid, { i, 2 })
      return
    end
  end
end

-------------------------------------------------------------------------------
-- Feature definitions
-------------------------------------------------------------------------------

local MODE_LABELS = {
  { key = "commercial_saas",   label = "Commercial SaaS" },
  { key = "commercial_single", label = "Commercial Single-Tenant" },
  { key = "personal",          label = "Personal" },
}

-- Features that only apply to commercial modes
local COMMERCIAL_ONLY = { multi_tenancy = true, billing = true }

local FEATURE_SECTIONS = {
  {
    name = "COMPLIANCE & SECURITY",
    items = {
      { key = "compliance",     label = "Compliance Framework" },
      { key = "multi_tenancy",  label = "Multi-Tenancy" },
      { key = "rbac",           label = "RBAC (Role-Based Access)" },
      { key = "api_contracts",  label = "API Contract Docs" },
      { key = "route_maps",    label = "Route Map Enforcement" },
    },
  },
  {
    name = "BILLING & MONETIZATION",
    items = {
      { key = "billing", label = "Stripe Billing & Entitlements" },
    },
  },
  {
    name = "MOBILE & CROSS-PLATFORM",
    items = {
      { key = "mobile_packaging", label = "Mobile App Packaging (iOS/Android)" },
    },
  },
  {
    name = "DEVELOPMENT TOOLS",
    items = {
      { key = "deployment",          label = "Deployment Automation" },
      { key = "agents",              label = "Agent Generation" },
      { key = "github_integration",  label = "GitHub Integration" },
      { key = "mcp_servers",         label = "MCP Server Discovery" },
      { key = "phased_dev",          label = "Phased Development" },
      { key = "hooks",               label = "Hooks" },
    },
  },
}

-------------------------------------------------------------------------------
-- Rendering
-------------------------------------------------------------------------------

local function render()
  local bufnr = state.bufnr
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local config = storage.load()
  local lines = {}
  state.item_lines = {}

  -- App Mode section
  table.insert(lines, "")
  table.insert(lines, "  APP MODE")
  table.insert(lines, "  " .. string.rep("─", 44))

  for _, m in ipairs(MODE_LABELS) do
    local selected = config.app_mode == m.key
    local radio = selected and "●" or "○"
    table.insert(lines, "  " .. radio .. " " .. m.label)
    state.item_lines[#lines] = { action = "set_mode", mode = m.key }
  end

  -- Feature sections
  for _, section in ipairs(FEATURE_SECTIONS) do
    table.insert(lines, "")
    table.insert(lines, "  " .. section.name)
    table.insert(lines, "  " .. string.rep("─", 44))

    for _, feat in ipairs(section.items) do
      local enabled = config.features[feat.key]
      local toggle_icon = enabled and nf.enabled or nf.disabled
      local status_text = enabled and "ON" or "OFF"
      local is_commercial_only = COMMERCIAL_ONLY[feat.key]
      local is_personal = config.app_mode == "personal"

      local suffix = ""
      if is_commercial_only and is_personal then
        suffix = "  (N/A in Personal)"
      end

      table.insert(lines, "  " .. toggle_icon .. " " .. feat.label .. "  " .. status_text .. suffix)
      state.item_lines[#lines] = { action = "toggle_feature", key = feat.key, name = feat.label }
    end
  end

  -- Stub behavior note
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", 44))
  if config.app_mode == "personal" then
    table.insert(lines, "  Disabled features: skipped entirely")
  else
    table.insert(lines, "  Disabled features: stubbed (CCASP:STUB)")
  end

  -- Bottom padding
  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_project_config", bufnr)
  for i, line in ipairs(lines) do
    if line:match("^  APP MODE") or line:match("^  COMPLIANCE") or line:match("^  BILLING") or line:match("^  MOBILE") or line:match("^  DEVELOPMENT") then
      helpers.add_highlight(bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  " .. string.rep("─", 5)) then
      helpers.add_highlight(bufnr, ns, "NonText", i - 1, 0, -1)
    elseif line:match("^  ●") then
      helpers.add_highlight(bufnr, ns, "DiagnosticOk", i - 1, 0, -1)
    elseif line:match("^  ○") then
      helpers.add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("N/A in Personal") then
      helpers.add_highlight(bufnr, ns, "DiagnosticWarn", i - 1, 0, -1)
    elseif line:match("Disabled features:") then
      helpers.add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif state.item_lines[i] then
      local item = state.item_lines[i]
      if item.action == "toggle_feature" then
        local config_check = storage.load()
        local enabled = config_check.features[item.key]
        if not enabled then
          helpers.add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
        end
      end
    end
  end
end

-------------------------------------------------------------------------------
-- Action execution
-------------------------------------------------------------------------------

local function execute_at_cursor()
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end

  local cursor = vim.api.nvim_win_get_cursor(state.winid)
  local item = state.item_lines[cursor[1]]
  if not item then return end

  if item.action == "set_mode" then
    storage.set_app_mode(item.mode)
    render()
    -- Keep cursor on same line
    pcall(vim.api.nvim_win_set_cursor, state.winid, { cursor[1], 2 })
  elseif item.action == "toggle_feature" then
    local new_val = storage.toggle_feature(item.key)
    render()
    -- Keep cursor on same line
    pcall(vim.api.nvim_win_set_cursor, state.winid, { cursor[1], 2 })
    vim.notify(
      string.format("CCASP: %s %s", item.name, new_val and "enabled" or "disabled"),
      vim.log.levels.INFO
    )
  end
end

-------------------------------------------------------------------------------
-- Open panel
-------------------------------------------------------------------------------

function M.open_panel()
  -- If already open, just focus
  if helpers.focus_if_open(state.winid) then
    return
  end

  local width = 56
  local height = 26
  local pos = helpers.calculate_position({ width = width, height = height })

  local bufnr = helpers.create_buffer("ccasp://project-config")

  local winid = helpers.create_window(bufnr, {
    width = width,
    height = height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.config .. " Project Configuration ",
    title_pos = "center",
    footer = " j/k Move  Enter Toggle  Esc/q Close ",
    footer_pos = "center",
  })

  state.bufnr = bufnr
  state.winid = winid
  state.item_lines = {}

  -- Sandbox first, then panel-specific keymaps can override
  helpers.sandbox_buffer(bufnr)
  helpers.setup_window_manager(bufnr, winid, "Project Config")
  helpers.setup_minimize(bufnr, winid, "Project Config", state)

  -- Render content
  render()

  -- Keymaps
  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Close
  vim.keymap.set("n", "q", close_panel, opts)
  vim.keymap.set("n", "<Esc>", close_panel, opts)

  -- Navigation
  vim.keymap.set("n", "j", function() navigate(1) end, opts)
  vim.keymap.set("n", "k", function() navigate(-1) end, opts)
  vim.keymap.set("n", "<Down>", function() navigate(1) end, opts)
  vim.keymap.set("n", "<Up>", function() navigate(-1) end, opts)

  -- Toggle / select
  vim.keymap.set("n", "<CR>", execute_at_cursor, opts)
  vim.keymap.set("n", "<Space>", execute_at_cursor, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse and mouse.line and state.item_lines[mouse.line] then
      pcall(vim.api.nvim_win_set_cursor, state.winid, { mouse.line, 2 })
      execute_at_cursor()
    end
  end, opts)

  -- Place cursor on first actionable item
  move_to_first_item()
end

-------------------------------------------------------------------------------
-- Close panel
-------------------------------------------------------------------------------

function M.close_panel()
  close_panel()
end

function M.is_open()
  return state.winid ~= nil and vim.api.nvim_win_is_valid(state.winid)
end

return M
