-- ccasp/panels/control.lua - CCASP Control Panel (Modal)
-- Floating modal panel with navigable feature toggles and actions
local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

-- State
M.bufnr = nil
M.winid = nil
M.is_open = false
M.item_lines = {} -- line -> action mapping for navigation

-- Get dependencies
local function get_ccasp()
  return require("ccasp")
end

local function get_config()
  return require("ccasp.config")
end

local function get_agents()
  return require("ccasp.agents")
end

local function get_prompt_injector()
  return require("ccasp.prompt_injector")
end

-- Feature definitions with their config paths
M.features = {
  { key = "a", name = "Auto Commit", path = "hooks.autoCommit", default = false },
  { key = "w", name = "Write Files", path = "hooks.writeFiles", default = true },
  { key = "t", name = "Run Tests", path = "hooks.runTests", default = true },
  { key = "g", name = "GitHub Sync", path = "versionControl.autoSync", default = false },
  { key = "p", name = "Phased Dev", path = "phasedDevelopment.enabled", default = true },
  { key = "h", name = "Hooks", path = "hooks.enabled", default = true },
  { key = "k", name = "Tokens", path = "tokenManagement.enabled", default = false },
  { key = "i", name = "Prompt Injector", path = "promptInjector.enabled", default = false },
}

-- Model options
M.models = { "haiku", "sonnet", "opus" }
M.current_model_idx = 2

-- Action definitions
M.actions = {
  { key = "m", label = "Cycle Model",       action = "cycle_model" },
  { key = "G", label = "Agent Grid",        action = "agent_grid" },
  { key = "R", label = "Restart Agents",    action = "restart_agents" },
  { key = "K", label = "Kill Agents",       action = "kill_agents" },
  { key = "S", label = "Save Settings",     action = "save_settings" },
  { key = "D", label = "Detect Tech Stack", action = "detect_stack" },
  { key = "I", label = "Toggle Injector",   action = "toggle_injector" },
  { key = "E", label = "Quick Enhance",     action = "quick_enhance" },
  { key = "r", label = "Refresh",           action = "refresh" },
  { key = "q", label = "Close",             action = "close" },
}

-- Execute an action by name
local function execute_action(action_name, item)
  local config = get_config()
  local agents = get_agents()

  local handlers = {
    toggle_feature = function()
      if item and item.path then
        M.toggle_feature(item.path)
      end
    end,
    cycle_model = function()
      M.current_model_idx = (M.current_model_idx % #M.models) + 1
      local new_model = M.models[M.current_model_idx]
      vim.notify("CCASP: Default model set to " .. new_model, vim.log.levels.INFO)
      M.refresh()
    end,
    agent_grid = function()
      M.close()
      agents.open_grid()
    end,
    restart_agents = function()
      agents.restart_all()
      M.refresh()
    end,
    kill_agents = function()
      agents.kill_all()
      M.refresh()
    end,
    save_settings = function()
      M.save_all_settings()
    end,
    detect_stack = function()
      vim.cmd("!ccasp detect-stack")
      vim.defer_fn(function() M.refresh() end, 1000)
    end,
    toggle_injector = function()
      local pi_ok, prompt_injector = pcall(get_prompt_injector)
      if pi_ok then
        prompt_injector.toggle()
        M.refresh()
      else
        vim.notify("CCASP: Prompt Injector not available", vim.log.levels.ERROR)
      end
    end,
    quick_enhance = function()
      local pi_ok, prompt_injector = pcall(get_prompt_injector)
      if pi_ok then
        M.close()
        prompt_injector.quick_enhance()
      end
    end,
    refresh = function()
      M.refresh()
    end,
    close = function()
      M.close()
    end,
  }
  local handler = handlers[action_name]
  if handler then handler() end
end

-- Render the control panel content
function M.render()
  local config = get_config()
  local agents = get_agents()

  local tech_stack = config.load_tech_stack()
  local agent_status = agents.get_status()
  local token_usage = config.get_token_usage()
  local ccasp = get_ccasp()
  local status = ccasp.get_status()

  -- Get prompt injector status
  local pi_state = "OFF"
  local pi_ok, prompt_injector = pcall(get_prompt_injector)
  if pi_ok then
    local pi_status = prompt_injector.get_status()
    pi_state = pi_status.enabled and "ON" or "OFF"
  end

  local current_model = M.models[M.current_model_idx]

  local lines = {}
  M.item_lines = {}

  -- Header
  table.insert(lines, "")
  table.insert(lines, "  " .. nf.ccasp .. " CCASP Control Panel  v" .. status.version)
  table.insert(lines, "")

  -- Status section
  table.insert(lines, "  ╭─────────────────────────────────────────╮")
  table.insert(lines, "  │  Status                                  │")
  table.insert(lines, "  ╰─────────────────────────────────────────╯")

  table.insert(lines, string.format("    %s Model: %s", nf.model, current_model))
  table.insert(lines, string.format("    %s Agents: %d running  %d stopped  %d failed",
    nf.agents, agent_status.running, agent_status.stopped, agent_status.failed))

  if token_usage then
    local used = token_usage.used or 0
    local budget = token_usage.budget or 200000
    local pct = math.floor((used / budget) * 100)
    table.insert(lines, string.format("    %s Tokens: %sK/%sK (%d%%)",
      nf.tokens, M.format_number(used), M.format_number(budget), pct))
  else
    table.insert(lines, "    " .. nf.tokens .. " Tokens: --")
  end

  table.insert(lines, string.format("    %s Prompt Injector: %s", nf.ai, pi_state))
  table.insert(lines, string.format("    %s Permissions: %s", nf.shield, status.permissions_mode))
  table.insert(lines, "")

  -- Feature Toggles section
  table.insert(lines, "  ╭─────────────────────────────────────────╮")
  table.insert(lines, "  │  Feature Toggles                        │")
  table.insert(lines, "  ╰─────────────────────────────────────────╯")

  for _, feat in ipairs(M.features) do
    local enabled = config.get_nested(tech_stack, feat.path)
    if enabled == nil then enabled = feat.default end
    local icon = enabled and nf.enabled or nf.disabled
    local status_str = enabled and "ON" or "OFF"
    table.insert(lines, string.format("    [%s]  %s %-20s %s", feat.key, icon, feat.name, status_str))
    M.item_lines[#lines] = { action = "toggle_feature", path = feat.path, name = feat.name }
  end

  table.insert(lines, "")

  -- Actions section
  table.insert(lines, "  ╭─────────────────────────────────────────╮")
  table.insert(lines, "  │  Actions                                 │")
  table.insert(lines, "  ╰─────────────────────────────────────────╯")

  for _, act in ipairs(M.actions) do
    table.insert(lines, string.format("    [%s]  %s", act.key, act.label))
    M.item_lines[#lines] = { action = act.action }
  end

  table.insert(lines, "")

  return lines
end

-- Format numbers for display
function M.format_number(n)
  if n >= 1000000 then
    return string.format("%.0f", n / 1000)
  elseif n >= 1000 then
    return string.format("%.0f", n / 1000)
  else
    return tostring(n)
  end
end

-- Open the control panel as a floating modal
function M.open()
  if helpers.focus_if_open(M.winid) then
    return
  end

  -- Create buffer
  M.bufnr = helpers.create_buffer("ccasp://control-panel")

  -- Calculate position
  local pos = helpers.calculate_position({ width = 47, height = 40 })

  -- Create window
  M.winid = helpers.create_window(M.bufnr, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " Control Panel ",
  })

  vim.wo[M.winid].cursorline = true

  -- Render
  M.refresh()

  -- Setup keymaps
  M.setup_keymaps()

  -- Move cursor to first actionable item
  if M.bufnr and vim.api.nvim_buf_is_valid(M.bufnr) then
    for line = 1, vim.api.nvim_buf_line_count(M.bufnr) do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        break
      end
    end
  end

  M.is_open = true
end

-- Refresh panel content
function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local lines = M.render()
  helpers.set_buffer_content(M.bufnr, lines)
  M.apply_highlights()
end

-- Apply syntax highlighting
function M.apply_highlights()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local ns = helpers.prepare_highlights("ccasp_control", M.bufnr)
  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    local line_idx = i - 1

    -- Box borders
    if line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", line_idx, 0, -1)
    end

    -- Header line with CCASP brand
    if line:match("CCASP Control Panel") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", line_idx, 0, -1)
    end

    -- ON toggles
    for s in line:gmatch("()" .. nf.enabled) do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", line_idx, s - 1, s + #nf.enabled - 1)
    end
    -- OFF toggles
    for s in line:gmatch("()" .. nf.disabled) do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", line_idx, s - 1, s + #nf.disabled - 1)
    end

    -- ON/OFF status text
    local on_s = line:find("  ON$")
    if on_s then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", line_idx, on_s + 1, on_s + 3)
    end
    local off_s = line:find("  OFF$")
    if off_s then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", line_idx, off_s + 1, off_s + 4)
    end

    -- Highlight [key] patterns
    for s, e in line:gmatch("()%[%w+%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Special", line_idx, s - 1, e - 1)
    end
  end
end

-- Setup keymaps
function M.setup_keymaps()
  -- Standard panel keymaps (sandbox, window manager, minimize, close)
  local opts = helpers.setup_standard_keymaps(M.bufnr, M.winid, "Control Panel", M, M.close)

  -- Letter shortcuts for feature toggles
  for _, feat in ipairs(M.features) do
    vim.keymap.set("n", feat.key, function()
      M.toggle_feature(feat.path)
    end, opts)
  end

  -- Letter shortcuts for actions
  for _, act in ipairs(M.actions) do
    vim.keymap.set("n", act.key, function()
      execute_action(act.action)
    end, opts)
  end

  -- Enter → execute action at cursor
  vim.keymap.set("n", "<CR>", function()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    local item = M.item_lines[cursor[1]]
    if item then
      execute_action(item.action, item)
    end
  end, opts)

  -- Arrow / j/k navigation (skip non-actionable lines)
  local function nav_down()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    local total = vim.api.nvim_buf_line_count(M.bufnr)
    for line = cursor[1] + 1, total do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    for line = cursor[1] - 1, 1, -1 do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Mouse click → execute action at clicked line
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, M.winid, { line, 0 })
    local item = M.item_lines[line]
    if item then
      execute_action(item.action, item)
    end
  end, opts)
end

-- Toggle a feature
function M.toggle_feature(path)
  local config = get_config()
  local tech_stack = config.load_tech_stack()

  local new_value = config.toggle_nested(tech_stack, path)
  config.save_tech_stack(tech_stack)

  local feature_name = path:match("([^.]+)$")
  vim.notify(
    string.format("CCASP: %s %s", feature_name, new_value and "enabled" or "disabled"),
    vim.log.levels.INFO
  )

  M.refresh()
end

-- Save all settings
function M.save_all_settings()
  local config = get_config()
  local settings = config.load_settings()
  settings.defaultModel = M.models[M.current_model_idx]
  config.save_settings(settings)
  vim.notify("CCASP: Settings saved", vim.log.levels.INFO)
end

-- Close the panel
function M.close()
  helpers.close_panel(M)
  M.is_open = false
end

-- Toggle panel visibility
function M.toggle()
  if M.is_open then
    M.close()
  else
    M.open()
  end
end

return M
