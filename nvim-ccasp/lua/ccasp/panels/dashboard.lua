-- ccasp/panels/dashboard.lua - Overview dashboard for CCASP
local M = {}
local helpers = require("ccasp.panels.helpers")

-- State
M.bufnr = nil
M.winid = nil
M.item_lines = {} -- line -> action mapping for navigation

-- Get dependencies
local function get_config()
  return require("ccasp.config")
end

local function get_agents()
  return require("ccasp.agents")
end

-- Action definitions for Quick Actions section
-- These are workflow launchers NOT available in the sidebar command panel
M.actions = {
  { key = "u", label = "Check for Updates",   action = "update_check" },
  { key = "n", label = "New Claude Session",   action = "new_session" },
  { key = "m", label = "Project Menu",         action = "menu" },
  { key = "t", label = "Create Task List",     action = "task_list" },
  { key = "d", label = "Deploy Full Stack",    action = "deploy" },
  { key = "w", label = "Site Intel Scan",      action = "site_intel" },
  { key = "P", label = "Project Configuration", action = "project_config" },
  { key = "?", label = "Help & Docs",          action = "help" },
  { key = "r", label = "Refresh Dashboard",    action = "refresh" },
  { key = "q", label = "Close",               action = "close" },
}

-- Helper: close dashboard and inject a slash command into the active Claude session
local function inject_slash_command(cmd)
  M.close()
  vim.schedule(function()
    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local primary = sessions.get_primary()
      if primary and primary.bufnr and vim.api.nvim_buf_is_valid(primary.bufnr) then
        local job_id = vim.b[primary.bufnr].terminal_job_id
        if job_id and job_id > 0 then
          vim.fn.chansend(job_id, cmd .. "\n")
          return
        end
      end
    end
    vim.notify("No active Claude session to send command", vim.log.levels.WARN)
  end)
end

-- Execute an action by name
local function execute_action(action_name)
  local handlers = {
    update_check = function()
      inject_slash_command("/update-check")
    end,
    new_session = function()
      M.close()
      vim.schedule(function()
        local sessions_ok, sessions = pcall(require, "ccasp.sessions")
        if sessions_ok then sessions.spawn() end
      end)
    end,
    menu = function()
      inject_slash_command("/menu")
    end,
    task_list = function()
      inject_slash_command("/create-task-list")
    end,
    deploy = function()
      inject_slash_command("/deploy-full")
    end,
    site_intel = function()
      inject_slash_command("/site-intel")
    end,
    project_config = function()
      M.close()
      vim.schedule(function()
        require("ccasp.project_config").open()
      end)
    end,
    help = function()
      M.close()
      vim.schedule(function()
        local help_ok, help = pcall(require, "ccasp.help")
        if help_ok and help.open then help.open() end
      end)
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

-- Render the dashboard
function M.render()
  local config = get_config()
  local agents = get_agents()

  local tech_stack = config.load_tech_stack()
  local state = config.load_state()
  local token_usage = config.get_token_usage()
  local commands = config.get_commands()
  local hooks = config.get_hooks()
  local skills = config.get_skills()
  local agent_status = agents.get_status()

  local lines = {}
  M.item_lines = {}

  -- ASCII Art Header
  table.insert(lines, "")
  table.insert(lines, "   ██████╗ ██████╗ █████╗ ███████╗██████╗ ")
  table.insert(lines, "  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗")
  table.insert(lines, "  ██║     ██║     ███████║███████╗██████╔╝")
  table.insert(lines, "  ██║     ██║     ██╔══██║╚════██║██╔═══╝ ")
  table.insert(lines, "  ╚██████╗╚██████╗██║  ██║███████║██║     ")
  table.insert(lines, "   ╚═════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ")
  table.insert(lines, "")
  table.insert(lines, "  Claude CLI Advanced Starter Pack - Neovim Edition")
  table.insert(lines, "")

  -- Version and Update Status
  local version = state.currentVersion or "unknown"
  local update_icon = state.updateAvailable and "⬆️ " or ""
  table.insert(lines, string.format("  Version: %s%s", update_icon, version))
  if state.updateAvailable then
    table.insert(lines, string.format("  Update available: %s", state.latestVersion or ""))
  end
  table.insert(lines, "")

  -- Project Info
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Project                                        │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

  local project_name = tech_stack.project and tech_stack.project.name or vim.fn.fnamemodify(vim.fn.getcwd(), ":t")
  table.insert(lines, "    " .. project_name)

  if tech_stack.frontend and tech_stack.frontend.framework then
    table.insert(lines, string.format("    Frontend: %s", tech_stack.frontend.framework))
  end
  if tech_stack.backend and tech_stack.backend.framework then
    table.insert(lines, string.format("    Backend: %s (%s)", tech_stack.backend.framework, tech_stack.backend.language or ""))
  end
  table.insert(lines, "")

  -- Features Grid
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Features                                       │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

  local function bool_icon(val)
    return val and "✓" or "○"
  end

  local features = {
    { "Tokens", config.get_nested(tech_stack, "tokenManagement.enabled") },
    { "Happy", config.get_nested(tech_stack, "happyMode.enabled") },
    { "GitHub", config.get_nested(tech_stack, "versionControl.projectBoard") ~= nil },
    { "Phased", config.get_nested(tech_stack, "phasedDevelopment.enabled") },
    { "Agents", config.get_nested(tech_stack, "agents.enabled") },
    { "Hooks", config.get_nested(tech_stack, "hooks.enabled") },
  }

  local feature_line = "    "
  for i, feat in ipairs(features) do
    feature_line = feature_line .. string.format("%s %s", bool_icon(feat[2]), feat[1])
    if i < #features then
      feature_line = feature_line .. "  │  "
    end
  end
  table.insert(lines, feature_line)
  table.insert(lines, "")

  -- Token Usage (if available)
  if token_usage then
    table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
    table.insert(lines, "  │  Token Usage                                    │")
    table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

    local used = token_usage.used or 0
    local budget = token_usage.budget or 200000
    local pct = math.floor((used / budget) * 100)
    local bar_width = 40
    local filled = math.floor((pct / 100) * bar_width)

    local bar = string.rep("█", filled) .. string.rep("░", bar_width - filled)

    local color_indicator = pct > 90 and "🔴" or pct > 75 and "🟡" or "🟢"
    table.insert(lines, string.format("    %s [%s] %d%%", color_indicator, bar, pct))
    table.insert(lines, string.format("    %s / %s tokens", M.format_number(used), M.format_number(budget)))
    table.insert(lines, "")
  end

  -- Installed Components
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Installed                                      │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

  table.insert(
    lines,
    string.format("    📝 %d Commands   🔧 %d Hooks   📦 %d Skills", #commands, #hooks, #skills)
  )
  table.insert(lines, "")

  -- Agent Status
  if agent_status.total > 0 then
    table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
    table.insert(lines, "  │  Agents                                         │")
    table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

    table.insert(
      lines,
      string.format(
        "    🟢 %d Running   ⚪ %d Stopped   🔴 %d Failed",
        agent_status.running,
        agent_status.stopped,
        agent_status.failed
      )
    )

    -- List active agents
    for slot, agent in pairs(agents.agents) do
      local status_icon = agent.status == "running" and "●" or "○"
      table.insert(lines, string.format("      %s %s (%s)", status_icon, agent.name, agent.model))
    end
    table.insert(lines, "")
  end

  -- Quick Actions (one per line for arrow/Enter/click navigation)
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Quick Actions                                  │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")

  for _, act in ipairs(M.actions) do
    table.insert(lines, string.format("    [%s]  %s", act.key, act.label))
    M.item_lines[#lines] = { action = act.action }
  end

  table.insert(lines, "")

  return lines
end

-- Format large numbers
function M.format_number(n)
  if n >= 1000000 then
    return string.format("%.1fM", n / 1000000)
  elseif n >= 1000 then
    return string.format("%.1fK", n / 1000)
  else
    return tostring(n)
  end
end

-- Open the dashboard
function M.open()
  if helpers.focus_if_open(M.winid) then
    return
  end

  -- Create buffer
  M.bufnr = helpers.create_buffer("ccasp://dashboard")

  -- Calculate position (larger for dashboard)
  local pos = helpers.calculate_position({ width = 55, height = 50 })

  -- Create window
  M.winid = helpers.create_window(M.bufnr, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " CCASP Dashboard ",
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
end

-- Refresh content
function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local lines = M.render()
  helpers.set_buffer_content(M.bufnr, lines)
  M.apply_highlights()
end

-- Apply highlights
function M.apply_highlights()
  local ns = helpers.prepare_highlights("ccasp_dashboard", M.bufnr)
  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    -- ASCII art header (bright blue)
    if line:match("^   █") or line:match("^  █") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingTitle", i - 1, 0, -1)
    -- Card borders (dark blue)
    elseif line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingCard", i - 1, 0, -1)
      -- Card title text inside │ ... │ gets teal
      local title_s, title_e = line:find("│  (.-)%s*│")
      if title_s and line:match("^  │") then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingCardTitle", i - 1, title_s + 2, title_e - 2)
      end
    elseif line:match("✓") then
      for s in line:gmatch("()✓") do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspStatusOk", i - 1, s - 1, s + 3)
      end
    elseif line:match("○") then
      for s in line:gmatch("()○") do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspMuted", i - 1, s - 1, s + 3)
      end
    elseif line:match("Version:") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingHeader", i - 1, 0, -1)
    elseif line:match("Update available") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspStatusWarn", i - 1, 0, -1)
    end

    -- Highlight key bindings [x] in steel blue
    for s, e in line:gmatch("()%[%w%?%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
    end
  end
end

-- Setup keymaps
function M.setup_keymaps()
  -- Standard panel keymaps (window manager, minimize, close)
  local opts = helpers.setup_standard_keymaps(M.bufnr, M.winid, "Dashboard", M, M.close)

  -- Letter shortcuts (kept for quick access)
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
      execute_action(item.action)
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
      execute_action(item.action)
    end
  end, opts)
end

-- Close panel
function M.close()
  helpers.close_panel(M)
end

return M
