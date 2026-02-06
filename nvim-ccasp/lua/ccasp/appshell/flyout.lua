-- ccasp/appshell/flyout.lua - Collapsible Sidebar Panel
-- Opens as floating overlay from icon rail. Reuses existing sidebar renderers.

local M = {}
local icons = require("ccasp.ui.icons")

local state = {
  win = nil,
  buf = nil,
  current_section = nil,
  item_lines = {}, -- line -> action mapping
}

-- Section content renderers
local section_renderers = {
  terminal = function(lines, item_lines)
    table.insert(lines, "  " .. icons.terminal .. " Terminal Sessions")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "")

    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local all = sessions.list()
      local count = #all

      table.insert(lines, "  Sessions: " .. count .. "/" .. 8)
      table.insert(lines, "  Layout: " .. sessions.get_layout())
      table.insert(lines, "")

      -- List active sessions
      for i, session in ipairs(all) do
        local status_icon = session.claude_running and icons.claude_on or icons.claude_off
        local primary = session.is_primary and (" " .. icons.primary) or ""
        local line = string.format("  %s %s%s", status_icon, session.name, primary)
        table.insert(lines, line)
        item_lines[#lines] = { action = "focus_session", id = session.id }
      end

      table.insert(lines, "")
    end

    -- Actions
    table.insert(lines, "  " .. string.rep("─", 30))
    local actions = {
      { icon = icons.maximize, label = "New Claude Session", action = "new_session" },
      { icon = icons.edit,     label = "Rename Current Session", action = "session_rename" },
      { icon = icons.settings, label = "Change Session Color", action = "session_color" },
      { icon = icons.minimize, label = "Minimize Current", action = "session_minimize" },
      { icon = icons.reload,   label = "Restore Minimized", action = "session_restore" },
      { icon = icons.close,    label = "Close All Sessions", action = "session_close_all" },
    }
    for _, a in ipairs(actions) do
      table.insert(lines, "  " .. a.icon .. " " .. a.label)
      item_lines[#lines] = { action = a.action }
    end
  end,

  panels = function(lines, item_lines)
    table.insert(lines, "  " .. icons.dashboard .. " Panels")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "")

    local panels = {
      { icon = icons.dashboard, label = "Dashboard", action = "dashboard" },
      { icon = icons.settings,  label = "Control Panel", action = "control" },
      { icon = icons.features,  label = "Feature Toggles", action = "features" },
      { icon = icons.hooks,     label = "Hook Manager", action = "hooks" },
      { icon = icons.minimize,  label = "Taskbar", action = "taskbar" },
    }
    for _, p in ipairs(panels) do
      table.insert(lines, "  " .. p.icon .. " " .. p.label)
      item_lines[#lines] = { action = p.action }
    end

    table.insert(lines, "")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "  " .. icons.help .. " Prompt Injector")
    table.insert(lines, "")

    local pi_actions = {
      { icon = icons.enabled,  label = "Toggle Prompt Injector", action = "prompt_injector" },
      { icon = icons.ai,       label = "Quick Enhance", action = "quick_enhance" },
      { icon = icons.reload,   label = "Toggle Auto-Enhance", action = "auto_enhance" },
    }
    for _, a in ipairs(pi_actions) do
      table.insert(lines, "  " .. a.icon .. " " .. a.label)
      item_lines[#lines] = { action = a.action }
    end
  end,

  agents = function(lines, item_lines)
    table.insert(lines, "  " .. icons.agents .. " Agents")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "")

    local actions = {
      { icon = icons.agents,  label = "Open Agent Grid", action = "grid" },
      { icon = icons.reload,  label = "Restart All Agents", action = "restart_all" },
      { icon = icons.close,   label = "Kill All Agents", action = "kill_all" },
    }
    for _, a in ipairs(actions) do
      table.insert(lines, "  " .. a.icon .. " " .. a.label)
      item_lines[#lines] = { action = a.action }
    end
  end,

  browse = function(lines, item_lines)
    table.insert(lines, "  " .. icons.search .. " Browse")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "")

    local actions = {
      { icon = icons.commands, label = "Commands (Telescope)", action = "commands" },
      { icon = icons.assets,   label = "Skills (Telescope)", action = "skills" },
    }
    for _, a in ipairs(actions) do
      table.insert(lines, "  " .. a.icon .. " " .. a.label)
      item_lines[#lines] = { action = a.action }
    end
  end,

  system = function(lines, item_lines)
    table.insert(lines, "  " .. icons.settings .. " System")
    table.insert(lines, "  " .. string.rep("─", 30))
    table.insert(lines, "")

    local actions = {
      { icon = icons.save,    label = "Save Settings", action = "save_settings" },
      { icon = icons.reload,  label = "Detect Tech Stack", action = "detect_stack" },
      { icon = icons.reload,  label = "Refresh", action = "refresh" },
    }
    for _, a in ipairs(actions) do
      table.insert(lines, "  " .. a.icon .. " " .. a.label)
      item_lines[#lines] = { action = a.action }
    end
  end,
}

-- Render flyout content for current section
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local lines = {}
  state.item_lines = {}

  local renderer = section_renderers[state.current_section]
  if renderer then
    renderer(lines, state.item_lines)
  else
    table.insert(lines, "  Unknown section: " .. tostring(state.current_section))
  end

  local ns = vim.api.nvim_create_namespace("ccasp_flyout")

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)
  for i, line in ipairs(lines) do
    if line:match("^  [─]+$") then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspSeparator", i - 1, 0, -1)
    elseif i == 1 then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFlyoutTitle", i - 1, 0, -1)
    elseif state.item_lines[i] then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFlyoutItem", i - 1, 0, -1)
    end
  end
end

-- Execute action at cursor line
local function execute_action_at_cursor()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then return end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local item = state.item_lines[cursor[1]]
  if not item then return end

  M.execute_action(item)
end

-- Execute a flyout action
function M.execute_action(item)
  local ccasp = require("ccasp")
  local sessions = require("ccasp.sessions")

  local action_handlers = {
    -- Terminal sessions
    new_session = function() sessions.spawn() end,
    focus_session = function() sessions.focus(item.id) end,
    session_rename = function()
      local s = sessions.get_by_window()
      if s then sessions.rename(s.id) end
    end,
    session_color = function()
      local s = sessions.get_by_window()
      if s then sessions.change_color(s.id) end
    end,
    session_minimize = function()
      local s = sessions.get_by_window()
      if s then sessions.minimize(s.id) end
    end,
    session_restore = function() sessions.show_minimized_picker() end,
    session_close_all = function() sessions.close_all() end,

    -- Panels
    dashboard = function()
      if ccasp.panels and ccasp.panels.dashboard then ccasp.panels.dashboard.open() end
    end,
    control = function()
      if ccasp.panels and ccasp.panels.control then ccasp.panels.control.toggle() end
    end,
    features = function()
      if ccasp.panels and ccasp.panels.features then ccasp.panels.features.open() end
    end,
    hooks = function()
      if ccasp.panels and ccasp.panels.hooks then ccasp.panels.hooks.open() end
    end,
    taskbar = function()
      if ccasp.taskbar then ccasp.taskbar.show_picker() end
    end,

    -- Prompt Injector
    prompt_injector = function()
      if ccasp.prompt_injector then ccasp.prompt_injector.toggle() end
    end,
    quick_enhance = function()
      if ccasp.prompt_injector then ccasp.prompt_injector.quick_enhance() end
    end,
    auto_enhance = function()
      if ccasp.prompt_injector and ccasp.prompt_injector.toggle_auto_enhance then
        ccasp.prompt_injector.toggle_auto_enhance()
      end
    end,

    -- Agents
    grid = function()
      if ccasp.agents then ccasp.agents.open_grid() end
    end,
    restart_all = function()
      if ccasp.agents then ccasp.agents.restart_all() end
    end,
    kill_all = function()
      if ccasp.agents then ccasp.agents.kill_all() end
    end,

    -- Browse
    commands = function()
      M.close()
      if ccasp.telescope then ccasp.telescope.commands() end
    end,
    skills = function()
      M.close()
      if ccasp.telescope then ccasp.telescope.skills() end
    end,

    -- System
    save_settings = function()
      if ccasp.core and ccasp.core.settings then
        ccasp.core.settings.save()
        vim.notify("Settings saved", vim.log.levels.INFO)
      end
    end,
    detect_stack = function()
      vim.cmd("!ccasp detect-stack")
    end,
    refresh = function()
      render()
      vim.notify("Refreshed", vim.log.levels.INFO)
    end,
  }

  local handler = action_handlers[item.action]
  if handler then
    handler()
    -- Re-render after action (session list may have changed)
    vim.defer_fn(function() render() end, 500)
  end
end

-- Setup keymaps
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  vim.keymap.set("n", "<CR>", execute_action_at_cursor, opts)
  vim.keymap.set("n", "l", execute_action_at_cursor, opts)

  vim.keymap.set("n", "q", function() M.close() end, opts)
  vim.keymap.set("n", "<Esc>", function() M.close() end, opts)
  vim.keymap.set("n", "h", function() M.close() end, opts)

  -- j/k navigation (skip non-item lines)
  vim.keymap.set("n", "j", function()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    local total = vim.api.nvim_buf_line_count(state.buf)
    for line = cursor[1] + 1, total do
      if state.item_lines[line] then
        vim.api.nvim_win_set_cursor(state.win, { line, 0 })
        return
      end
    end
  end, opts)

  vim.keymap.set("n", "k", function()
    local cursor = vim.api.nvim_win_get_cursor(state.win)
    for line = cursor[1] - 1, 1, -1 do
      if state.item_lines[line] then
        vim.api.nvim_win_set_cursor(state.win, { line, 0 })
        return
      end
    end
  end, opts)
end

-- Open flyout for a section
function M.open(bounds, section)
  state.current_section = section

  -- If window already exists, just re-render with new section
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    render()
    return
  end

  -- Create buffer
  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  -- Create floating window
  state.win = vim.api.nvim_open_win(state.buf, true, {
    relative = "editor",
    row = bounds.row,
    col = bounds.col,
    width = bounds.width,
    height = bounds.height,
    style = "minimal",
    focusable = true,
    zindex = 60,
    border = { "", "", "", "│", "", "", "", "│" },
  })

  vim.wo[state.win].winhighlight = "Normal:CcaspFlyoutBg,EndOfBuffer:CcaspFlyoutBg,FloatBorder:CcaspFlyoutBorder"
  vim.wo[state.win].cursorline = true
  vim.wo[state.win].wrap = false

  setup_keymaps()
  render()

  -- Move cursor to first actionable item
  for line = 1, vim.api.nvim_buf_line_count(state.buf) do
    if state.item_lines[line] then
      vim.api.nvim_win_set_cursor(state.win, { line, 0 })
      break
    end
  end
end

-- Close flyout
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil
  state.current_section = nil

  -- Notify appshell that flyout is closed
  local appshell = require("ccasp.appshell")
  appshell.config.flyout.visible = false
  appshell.state.active_section = nil

  local icon_rail = require("ccasp.appshell.icon_rail")
  icon_rail.set_active(nil)
end

-- Switch section without closing
function M.switch_section(section)
  state.current_section = section
  render()
end

-- Resize flyout
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

-- Check if flyout is open
function M.is_open()
  return state.win ~= nil and vim.api.nvim_win_is_valid(state.win)
end

return M
