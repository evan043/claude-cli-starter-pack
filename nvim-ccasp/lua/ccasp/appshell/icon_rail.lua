-- ccasp/appshell/icon_rail.lua - Vertical Activity Bar
-- 3-column icon strip on the left edge with clickable section icons

local M = {}
local icons = require("ccasp.ui.icons")

-- Rail state
local state = {
  win = nil,
  buf = nil,
  active_index = nil,
  active_section = nil,
}

-- Section definitions: { icon, name, section_key }
M.sections = {
  { icon = icons.terminal,  name = "Sessions", key = "terminal" },
  { icon = icons.dashboard, name = "Panels",   key = "panels" },
  { icon = icons.agents,    name = "Agents",    key = "agents" },
  { icon = icons.search,    name = "Browse",    key = "browse" },
  { icon = icons.settings,  name = "System",    key = "system" },
}

-- Create rail buffer content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local lines = {}
  local ns = vim.api.nvim_create_namespace("ccasp_icon_rail")

  -- Top spacer
  table.insert(lines, "")

  -- Section icons (one per line, centered in 3 cols)
  for i, section in ipairs(M.sections) do
    table.insert(lines, " " .. section.icon)
  end

  -- Fill remaining space with empty lines, place logo at bottom
  local zone = require("ccasp.appshell").get_zone_bounds("icon_rail")
  local total_h = zone and zone.height or 20
  local used = #lines + 2 -- +2 for separator + logo
  for _ = 1, math.max(0, total_h - used) do
    table.insert(lines, "")
  end

  -- Bottom separator + logo
  table.insert(lines, " ─")
  table.insert(lines, " " .. icons.ccasp)

  -- Set content
  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)

  -- Line 0 is spacer, lines 1-5 are icons, rest is fill, last 2 are sep+logo
  for i, _ in ipairs(M.sections) do
    local line_idx = i -- 0-indexed: line 1, 2, 3, 4, 5
    local hl_group = (state.active_index == i) and "CcaspIconRailActive" or "CcaspIconRailItem"
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, hl_group, line_idx, 0, -1)
  end

  -- Logo highlight
  local last_line = vim.api.nvim_buf_line_count(state.buf) - 1
  pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspIconRailActive", last_line, 0, -1)
  -- Separator
  if last_line > 0 then
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspSeparator", last_line - 1, 0, -1)
  end
end

-- Setup keymaps for the rail buffer
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  -- Number keys to select section
  for i = 1, #M.sections do
    vim.keymap.set("n", tostring(i), function()
      M.select(i)
    end, opts)
  end

  -- Enter/CR to activate section at cursor
  vim.keymap.set("n", "<CR>", function()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local line = cursor[1] -- 1-indexed; line 2..6 are sections
    local idx = line -- offset by spacer on line 1
    if idx >= 1 and idx <= #M.sections then
      M.select(idx)
    end
  end, opts)

  -- j/k navigation
  vim.keymap.set("n", "j", function()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local next_line = math.min(cursor[1] + 1, #M.sections + 1)
    if next_line >= 2 then
      vim.api.nvim_win_set_cursor(state.win, { next_line, 0 })
    end
  end, opts)

  vim.keymap.set("n", "k", function()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local prev_line = math.max(cursor[1] - 1, 2)
    vim.api.nvim_win_set_cursor(state.win, { prev_line, 0 })
  end, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    local idx = line
    if idx >= 1 and idx <= #M.sections then
      M.select(idx)
    end
  end, opts)

  -- q to close
  vim.keymap.set("n", "q", function()
    local appshell = require("ccasp.appshell")
    appshell.toggle_rail()
  end, opts)
end

-- Open the icon rail
function M.open(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    return
  end

  -- Create buffer
  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  -- Create floating window
  state.win = vim.api.nvim_open_win(state.buf, false, {
    relative = "editor",
    row = bounds.row,
    col = bounds.col,
    width = bounds.width,
    height = bounds.height,
    style = "minimal",
    focusable = true,
    zindex = 50,
    border = "none",
  })

  -- Window options
  vim.wo[state.win].winhighlight = "Normal:CcaspIconRailBg,EndOfBuffer:CcaspIconRailBg"
  vim.wo[state.win].cursorline = true
  vim.wo[state.win].wrap = false
  vim.wo[state.win].number = false
  vim.wo[state.win].relativenumber = false
  vim.wo[state.win].signcolumn = "no"

  setup_keymaps()
  render()
end

-- Close the icon rail
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil
end

-- Select a section (triggers flyout)
function M.select(index)
  if index < 1 or index > #M.sections then return end

  local section = M.sections[index]
  state.active_index = index
  state.active_section = section.key

  render()

  -- Trigger flyout via appshell orchestrator
  local appshell = require("ccasp.appshell")
  appshell.toggle_flyout(section.key)
end

-- Set active section (called from appshell orchestrator)
function M.set_active(section_key)
  if not section_key then
    state.active_index = nil
    state.active_section = nil
  else
    for i, section in ipairs(M.sections) do
      if section.key == section_key then
        state.active_index = i
        state.active_section = section_key
        break
      end
    end
  end
  render()
end

-- Resize rail window
function M.resize(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = bounds.row,
      col = bounds.col,
      width = bounds.width,
      height = bounds.height,
    })
    render()
  end
end

-- Toggle visibility
function M.toggle_visibility()
  local appshell = require("ccasp.appshell")
  appshell.toggle_rail()
end

-- Get rail window ID
function M.get_win()
  return state.win
end

return M
