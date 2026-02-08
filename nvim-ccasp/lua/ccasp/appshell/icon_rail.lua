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
  { icon = icons.commands,  name = "Commands",         key = "commands" },
  { icon = icons.terminal,  name = "Sessions",         key = "terminal" },
  { icon = icons.dashboard, name = "Panels",           key = "panels" },
  { icon = icons.agents,    name = "Agents",            key = "agents" },
  { icon = icons.search,    name = "Browse",            key = "browse" },
  { icon = icons.reload,    name = "Orchestration",     key = "orchestration" },
  { icon = icons.settings,  name = "System",            key = "system" },
  { icon = icons.features,  name = "Features",          key = "features" },
}

-- Create rail buffer content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local lines = {}
  local ns = vim.api.nvim_create_namespace("ccasp_icon_rail")

  -- Top spacer
  table.insert(lines, "")

  -- Section icons with number labels (always visible even without Nerd Font)
  for i, section in ipairs(M.sections) do
    table.insert(lines, string.format(" %d %s", i, section.icon))
  end

  -- Fill remaining space with empty lines, place logo at bottom
  local zone = require("ccasp.appshell").get_zone_bounds("icon_rail")
  local total_h = zone and zone.height or 20
  local used = #lines + 2 -- +2 for separator + logo
  for _ = 1, math.max(0, total_h - used) do
    table.insert(lines, "")
  end

  -- Bottom separator + logo mark (ASCII-safe, no nerd font dependency)
  table.insert(lines, " ───")
  table.insert(lines, " C·C")

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

  -- Helper: open flyout for section at cursor and focus it
  local function open_and_focus_flyout()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local idx = cursor[1] - 1  -- subtract 1 for spacer line
    if idx < 1 or idx > #M.sections then return end

    local section = M.sections[idx]
    local flyout = require("ccasp.appshell.flyout")
    local appshell = require("ccasp.appshell")

    -- If flyout is already open with this section, just focus it
    if flyout.is_open() and appshell.state.active_section == section.key then
      flyout.focus()
    else
      -- Open/switch to this section
      M.select(idx)
      -- Focus flyout after it opens
      vim.schedule(function()
        flyout.focus()
      end)
    end
  end

  -- Enter/CR to activate section and focus flyout
  vim.keymap.set("n", "<CR>", open_and_focus_flyout, opts)

  -- Right arrow / Tab → open flyout and focus it
  vim.keymap.set("n", "<Right>", open_and_focus_flyout, opts)
  vim.keymap.set("n", "<Tab>", open_and_focus_flyout, opts)

  -- When flyout is open, switch its content to match the cursor position
  local function sync_flyout_to_cursor()
    local appshell = require("ccasp.appshell")
    if not appshell.config.flyout.visible then return end

    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local idx = cursor[1] - 1  -- subtract spacer line
    if idx < 1 or idx > #M.sections then return end

    local section = M.sections[idx]
    if appshell.state.active_section == section.key then return end -- already showing

    -- Switch flyout to new section (without toggle — always open)
    state.active_index = idx
    state.active_section = section.key
    render()
    appshell.state.active_section = section.key
    appshell.calculate_zones()
    local flyout = require("ccasp.appshell.flyout")
    flyout.open(appshell.state.zones.flyout, section.key)
  end

  -- j/k/Down/Up navigation
  local function nav_down()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local next_line = math.min(cursor[1] + 1, #M.sections + 1)
    if next_line >= 2 then
      vim.api.nvim_win_set_cursor(state.win, { next_line, 0 })
      sync_flyout_to_cursor()
    end
  end

  local function nav_up()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local prev_line = math.max(cursor[1] - 1, 2)
    vim.api.nvim_win_set_cursor(state.win, { prev_line, 0 })
    sync_flyout_to_cursor()
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Left arrow → focus flyout if open (same direction as content)
  vim.keymap.set("n", "<Left>", function() end, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    local idx = line - 1  -- subtract 1 for spacer line
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

  -- Sandbox buffer to prevent Neovim errors on unmapped keys
  local helpers_ok, helpers = pcall(require, "ccasp.panels.helpers")
  if helpers_ok then
    helpers.sandbox_buffer(state.buf)
  end

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
