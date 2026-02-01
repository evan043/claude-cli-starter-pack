-- ccasp/panels/dashboard.lua - Overview dashboard for CCASP
local M = {}

-- State
M.bufnr = nil
M.winid = nil

-- Get dependencies
local function get_config()
  return require("ccasp.config")
end

local function get_agents()
  return require("ccasp.agents")
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

  -- Quick Actions
  table.insert(lines, "  ╭─────────────────────────────────────────────────╮")
  table.insert(lines, "  │  Quick Actions                                  │")
  table.insert(lines, "  ╰─────────────────────────────────────────────────╯")
  table.insert(lines, "    [g] Agent Grid    [p] Control Panel   [f] Features")
  table.insert(lines, "    [h] Hooks         [c] Commands        [s] Skills")
  table.insert(lines, "    [r] Refresh       [q] Close")
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
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_set_current_win(M.winid)
    return
  end

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(M.bufnr, "buftype", "nofile")
  vim.api.nvim_buf_set_option(M.bufnr, "bufhidden", "wipe")
  vim.api.nvim_buf_set_name(M.bufnr, "ccasp://dashboard")

  -- Calculate size (larger for dashboard)
  local width = 55
  local height = 50
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  -- Create window
  M.winid = vim.api.nvim_open_win(M.bufnr, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = "rounded",
    title = " CCASP Dashboard ",
    title_pos = "center",
  })

  -- Render
  M.refresh()

  -- Setup keymaps
  M.setup_keymaps()
end

-- Refresh content
function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local lines = M.render()
  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(M.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", false)

  M.apply_highlights()
end

-- Apply highlights
function M.apply_highlights()
  local ns = vim.api.nvim_create_namespace("ccasp_dashboard")
  vim.api.nvim_buf_clear_namespace(M.bufnr, ns, 0, -1)

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    -- ASCII art header
    if line:match("^   █") or line:match("^  █") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("✓") then
      for s in line:gmatch("()✓") do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, s - 1, s + 3)
      end
    elseif line:match("○") then
      for s in line:gmatch("()○") do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, s - 1, s + 3)
      end
    elseif line:match("Version:") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticInfo", i - 1, 0, -1)
    elseif line:match("Update available") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticWarn", i - 1, 0, -1)
    end

    -- Highlight key bindings
    for s, e in line:gmatch("()%[%w%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Special", i - 1, s - 1, e - 1)
    end
  end
end

-- Setup keymaps
function M.setup_keymaps()
  local opts = { buffer = M.bufnr, nowait = true }

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)

  -- Quick actions
  vim.keymap.set("n", "g", function()
    M.close()
    require("ccasp.agents").open_grid()
  end, opts)

  vim.keymap.set("n", "p", function()
    M.close()
    require("ccasp.panels.control").open()
  end, opts)

  vim.keymap.set("n", "f", function()
    M.close()
    require("ccasp.panels.features").open()
  end, opts)

  vim.keymap.set("n", "h", function()
    M.close()
    require("ccasp.panels.hooks").open()
  end, opts)

  vim.keymap.set("n", "c", function()
    M.close()
    require("ccasp.telescope").commands()
  end, opts)

  vim.keymap.set("n", "s", function()
    M.close()
    require("ccasp.telescope").skills()
  end, opts)

  vim.keymap.set("n", "r", M.refresh, opts)
end

-- Close panel
function M.close()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_close(M.winid, true)
  end
  M.winid = nil
  M.bufnr = nil
end

return M
