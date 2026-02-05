-- ccasp/panels/control.lua - Main control panel for CCASP
local M = {}

-- State
M.bufnr = nil
M.winid = nil
M.is_open = false

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

local function get_openai()
  return require("ccasp.openai")
end

-- Icons and formatting
local icons = {
  enabled = "",
  disabled = "",
  running = "",
  stopped = "",
  failed = "",
  model = "",
  agents = "",
  tokens = "",
  hook = "",
  section = "─",
}

-- Feature definitions with their config paths
M.features = {
  { key = "a", name = "Auto Commit", path = "hooks.autoCommit", default = false },
  { key = "w", name = "Write Files", path = "hooks.writeFiles", default = true },
  { key = "t", name = "Run Tests", path = "hooks.runTests", default = true },
  { key = "g", name = "GitHub Sync", path = "versionControl.autoSync", default = false },
  { key = "p", name = "Phased Dev", path = "phasedDevelopment.enabled", default = true },
  { key = "h", name = "Hooks", path = "hooks.enabled", default = true },
  { key = "k", name = "Token Tracking", path = "tokenManagement.enabled", default = false },
  { key = "i", name = "Prompt Injector", path = "promptInjector.enabled", default = false, special = "prompt_injector" },
}

-- Model options
M.models = { "haiku", "sonnet", "opus" }
M.current_model_idx = 2 -- Default to sonnet

-- Create the control panel content
function M.render()
  local ccasp = get_ccasp()
  local config = get_config()
  local agents = get_agents()

  local tech_stack = config.load_tech_stack()
  local agent_status = agents.get_status()
  local token_usage = config.get_token_usage()

  local lines = {}
  local highlights = {} -- { {line, col_start, col_end, hl_group} }

  -- Header
  table.insert(lines, "")
  table.insert(lines, "  ╔═══════════════════════════════════════╗")
  table.insert(lines, "  ║       CCASP Control Panel             ║")
  table.insert(lines, "  ╚═══════════════════════════════════════╝")
  table.insert(lines, "")

  -- Agent Status Section
  table.insert(lines, "  " .. icons.agents .. " Agents")
  table.insert(lines, "  " .. string.rep(icons.section, 39))

  local agent_line = string.format(
    "    Running: %d  │  Stopped: %d  │  Failed: %d",
    agent_status.running,
    agent_status.stopped,
    agent_status.failed
  )
  table.insert(lines, agent_line)
  table.insert(lines, "")

  -- Show individual agents if grid is open
  if agents.grid_open then
    for slot, agent in pairs(agents.agents) do
      local status_icon = agent.status == "running" and icons.running
        or agent.status == "failed" and icons.failed
        or icons.stopped
      local status_hl = agent.status == "running" and "DiagnosticOk"
        or agent.status == "failed" and "DiagnosticError"
        or "Comment"

      local line = string.format("    [%d] %s %s (%s)", slot, status_icon, agent.name, agent.model)
      table.insert(lines, line)
    end
    table.insert(lines, "")
  end

  -- Model Selection Section
  table.insert(lines, "  " .. icons.model .. " Default Model")
  table.insert(lines, "  " .. string.rep(icons.section, 39))

  local model_line = "    "
  for i, model in ipairs(M.models) do
    local is_selected = i == M.current_model_idx
    if is_selected then
      model_line = model_line .. "[" .. model .. "]"
    else
      model_line = model_line .. " " .. model .. " "
    end
    if i < #M.models then
      model_line = model_line .. "  "
    end
  end
  table.insert(lines, model_line)
  table.insert(lines, "    (Press m to cycle)")
  table.insert(lines, "")

  -- Token Usage Section (if enabled)
  if token_usage then
    table.insert(lines, "  " .. icons.tokens .. " Token Usage")
    table.insert(lines, "  " .. string.rep(icons.section, 39))

    local used = token_usage.used or 0
    local budget = token_usage.budget or 200000
    local pct = math.floor((used / budget) * 100)
    local bar_width = 30
    local filled = math.floor((pct / 100) * bar_width)

    local bar = string.rep("█", filled) .. string.rep("░", bar_width - filled)
    table.insert(lines, string.format("    [%s] %d%%", bar, pct))
    table.insert(lines, string.format("    %d / %d tokens", used, budget))
    table.insert(lines, "")
  end

  -- Prompt Injector Status Section
  local pi_ok, prompt_injector = pcall(get_prompt_injector)
  if pi_ok then
    local pi_status = prompt_injector.get_status()
    table.insert(lines, "   Prompt Injector")
    table.insert(lines, "  " .. string.rep(icons.section, 39))

    local pi_state = pi_status.enabled and "ENABLED" or "DISABLED"
    local pi_icon = pi_status.enabled and icons.enabled or icons.disabled
    table.insert(lines, string.format("    %s Status: %s", pi_icon, pi_state))

    if pi_status.openai_available then
      local openai = get_openai()
      table.insert(lines, string.format("    %s Model: %s", icons.model, pi_status.openai_model or "gpt-5.2"))
      table.insert(lines, string.format("      Requests: %d", pi_status.request_count or 0))
    else
      table.insert(lines, "     OpenAI: Not configured")
      table.insert(lines, "      Add OPENAI_API_KEY to .env")
    end

    if pi_status.auto_enhance then
      table.insert(lines, "    ✨ Auto-enhance: ON")
    end

    table.insert(lines, "")
  end

  -- Feature Toggles Section
  table.insert(lines, "  " .. icons.hook .. " Features")
  table.insert(lines, "  " .. string.rep(icons.section, 39))

  for _, feat in ipairs(M.features) do
    local enabled = config.get_nested(tech_stack, feat.path)
    if enabled == nil then
      enabled = feat.default
    end

    local icon = enabled and icons.enabled or icons.disabled
    local status = enabled and "ON " or "OFF"
    local line = string.format("    [%s] %s %s  %s", feat.key, icon, feat.name, status)
    table.insert(lines, line)
  end

  table.insert(lines, "")

  -- Actions Section
  table.insert(lines, "  Actions")
  table.insert(lines, "  " .. string.rep(icons.section, 39))
  table.insert(lines, "    [G] Open Agent Grid")
  table.insert(lines, "    [R] Restart All Agents")
  table.insert(lines, "    [K] Kill All Agents")
  table.insert(lines, "    [S] Save Settings")
  table.insert(lines, "    [D] Detect Tech Stack")
  table.insert(lines, "")
  table.insert(lines, "    [I] Toggle Prompt Injector")
  table.insert(lines, "    [A] Toggle Auto-Enhance")
  table.insert(lines, "    [E] Quick Enhance Selection")
  table.insert(lines, "")
  table.insert(lines, "  Navigation")
  table.insert(lines, "  " .. string.rep(icons.section, 39))
  table.insert(lines, "    [c] Browse Commands")
  table.insert(lines, "    [s] Browse Skills")
  table.insert(lines, "    [d] Dashboard")
  table.insert(lines, "    [q] Close Panel")
  table.insert(lines, "")

  return lines
end

-- Open the control panel
function M.open()
  local ccasp = get_ccasp()
  local panel_config = ccasp.config.control_panel

  if M.is_open and M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_set_current_win(M.winid)
    return
  end

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(M.bufnr, "buftype", "nofile")
  vim.api.nvim_buf_set_option(M.bufnr, "bufhidden", "wipe")
  vim.api.nvim_buf_set_option(M.bufnr, "swapfile", false)
  vim.api.nvim_buf_set_name(M.bufnr, "ccasp://control-panel")

  -- Calculate position
  local width = panel_config.width
  local height = panel_config.height
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  if panel_config.position == "right" then
    col = vim.o.columns - width - 2
    row = 2
    height = vim.o.lines - 6
  elseif panel_config.position == "left" then
    col = 2
    row = 2
    height = vim.o.lines - 6
  end

  -- Create floating window
  M.winid = vim.api.nvim_open_win(M.bufnr, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = panel_config.border,
    title = " CCASP ",
    title_pos = "center",
  })

  -- Set window options
  vim.wo[M.winid].cursorline = true
  vim.wo[M.winid].wrap = false

  -- Render content
  M.refresh()

  -- Setup keymaps
  M.setup_keymaps()

  M.is_open = true
end

-- Refresh panel content
function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local lines = M.render()
  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(M.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", false)

  -- Apply highlights
  M.apply_highlights()
end

-- Apply syntax highlighting
function M.apply_highlights()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local ns = vim.api.nvim_create_namespace("ccasp_control")
  vim.api.nvim_buf_clear_namespace(M.bufnr, ns, 0, -1)

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    -- Highlight headers
    if line:match("^  ╔") or line:match("^  ║") or line:match("^  ╚") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  " .. icons.section) then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match(icons.enabled) then
      local start = line:find(icons.enabled)
      if start then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, start - 1, start + #icons.enabled)
      end
    elseif line:match(icons.disabled) then
      local start = line:find(icons.disabled)
      if start then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", i - 1, start - 1, start + #icons.disabled)
      end
    elseif line:match("ON ") then
      local start = line:find("ON ")
      if start then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, start - 1, start + 2)
      end
    elseif line:match("OFF") then
      local start = line:find("OFF")
      if start then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", i - 1, start - 1, start + 3)
      end
    elseif line:match("%[%w%]") then
      -- Highlight key bindings
      for s, e in line:gmatch("()%[%w%]()") do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Special", i - 1, s - 1, e - 1)
      end
    end
  end
end

-- Setup keymaps for the control panel
function M.setup_keymaps()
  local opts = { buffer = M.bufnr, nowait = true }
  local config = get_config()
  local agents = get_agents()

  -- Window manager keymaps (move/resize)
  local wm_ok, window_manager = pcall(require, "ccasp.window_manager")
  if wm_ok and M.winid then
    window_manager.register(M.winid, "Control Panel", "")
    window_manager.setup_keymaps(M.bufnr, M.winid)
  end

  -- Minimize keymap
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    vim.keymap.set("n", "_", function()
      taskbar.minimize(M.winid, "Control Panel", "")
      M.winid = nil
      M.bufnr = nil
      M.is_open = false
    end, opts)
  end

  -- Close panel
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)

  -- Feature toggles
  for _, feat in ipairs(M.features) do
    vim.keymap.set("n", feat.key, function()
      M.toggle_feature(feat.path)
    end, opts)
  end

  -- Model cycling
  vim.keymap.set("n", "m", function()
    M.current_model_idx = (M.current_model_idx % #M.models) + 1
    local new_model = M.models[M.current_model_idx]
    vim.notify("CCASP: Default model set to " .. new_model, vim.log.levels.INFO)
    M.refresh()
  end, opts)

  -- Agent actions
  vim.keymap.set("n", "G", function()
    M.close()
    agents.open_grid()
  end, opts)

  vim.keymap.set("n", "R", function()
    agents.restart_all()
    M.refresh()
  end, opts)

  vim.keymap.set("n", "K", function()
    agents.kill_all()
    M.refresh()
  end, opts)

  -- Save settings
  vim.keymap.set("n", "S", function()
    M.save_all_settings()
  end, opts)

  -- Detect tech stack
  vim.keymap.set("n", "D", function()
    vim.cmd("!ccasp detect-stack")
    vim.defer_fn(function()
      M.refresh()
    end, 1000)
  end, opts)

  -- Prompt Injector actions
  vim.keymap.set("n", "I", function()
    local pi_ok, prompt_injector = pcall(get_prompt_injector)
    if pi_ok then
      prompt_injector.toggle()
      M.refresh()
    else
      vim.notify("CCASP: Prompt Injector module not available", vim.log.levels.ERROR)
    end
  end, opts)

  vim.keymap.set("n", "A", function()
    local pi_ok, prompt_injector = pcall(get_prompt_injector)
    if pi_ok then
      prompt_injector.toggle_auto_enhance()
      M.refresh()
    end
  end, opts)

  vim.keymap.set("n", "E", function()
    local pi_ok, prompt_injector = pcall(get_prompt_injector)
    if pi_ok then
      M.close()
      prompt_injector.quick_enhance()
    end
  end, opts)

  -- Refresh
  vim.keymap.set("n", "r", M.refresh, opts)

  -- Navigation to other panels
  vim.keymap.set("n", "c", function()
    M.close()
    require("ccasp.telescope").commands()
  end, opts)

  vim.keymap.set("n", "s", function()
    M.close()
    require("ccasp.telescope").skills()
  end, opts)

  vim.keymap.set("n", "d", function()
    M.close()
    require("ccasp.panels.dashboard").open()
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

  -- Build settings from current state
  local settings = config.load_settings()
  settings.defaultModel = M.models[M.current_model_idx]

  config.save_settings(settings)
  vim.notify("CCASP: Settings saved", vim.log.levels.INFO)
end

-- Close the panel
function M.close()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_close(M.winid, true)
  end
  M.winid = nil
  M.bufnr = nil
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
