-- ccasp/panels/control.lua - CCASP Control Panel (Bottom Stripe)
-- Fixed 4-line horizontal stripe at the bottom of the editor
-- Dense, information-rich layout with Nerd Font icons and glow styling
local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

-- State
M.bufnr = nil
M.winid = nil
M.is_open = false

-- Height of the bottom stripe (lines)
local STRIPE_HEIGHT = 4

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
  { key = "a", name = "Commit", path = "hooks.autoCommit", default = false },
  { key = "w", name = "Write", path = "hooks.writeFiles", default = true },
  { key = "t", name = "Test", path = "hooks.runTests", default = true },
  { key = "g", name = "GitHub", path = "versionControl.autoSync", default = false },
  { key = "p", name = "Phased", path = "phasedDevelopment.enabled", default = true },
  { key = "h", name = "Hooks", path = "hooks.enabled", default = true },
  { key = "k", name = "Tokens", path = "tokenManagement.enabled", default = false },
  { key = "i", name = "PI", path = "promptInjector.enabled", default = false, special = "prompt_injector" },
}

-- Model options
M.models = { "haiku", "sonnet", "opus" }
M.current_model_idx = 2

-- Render the dense bottom stripe content (4 lines)
function M.render()
  local config = get_config()
  local agents = get_agents()

  local tech_stack = config.load_tech_stack()
  local agent_status = agents.get_status()
  local token_usage = config.get_token_usage()

  -- Get prompt injector status
  local pi_state = "OFF"
  local pi_ok, prompt_injector = pcall(get_prompt_injector)
  if pi_ok then
    local pi_status = prompt_injector.get_status()
    pi_state = pi_status.enabled and "ON" or "OFF"
  end

  -- Get sync status
  local ccasp = get_ccasp()
  local status = ccasp.get_status()
  local sync_icon = status.sync_status == "synced" and nf.sync_ok or nf.sync_warn

  -- Get current model
  local current_model = M.models[M.current_model_idx]

  -- Token info
  local token_str = ""
  if token_usage then
    local used = token_usage.used or 0
    local budget = token_usage.budget or 200000
    local pct = math.floor((used / budget) * 100)
    token_str = string.format("%s %dK/%dK (%d%%)", nf.tokens, math.floor(used / 1000), math.floor(budget / 1000), pct)
  end

  -- Agent counts
  local agent_str = string.format("%s %d%s/%d%s/%d%s",
    nf.agents,
    agent_status.running, nf.running,
    agent_status.stopped, nf.stopped,
    agent_status.failed, nf.failed
  )

  -- ─── Line 1: Status indicators ──────────────────────────────
  local line1 = string.format(
    " %s CCASP  %s  %s %s  %s  %s  %s %s  %s  %s PI:%s",
    nf.ccasp,
    nf.pipe,
    nf.model, current_model,
    nf.pipe,
    agent_str,
    nf.pipe,
    token_str ~= "" and token_str or (nf.tokens .. " --"),
    nf.pipe,
    nf.pipe,
    pi_state
  )

  -- ─── Line 2: Feature toggles ───────────────────────────────
  local toggle_parts = {}
  for _, feat in ipairs(M.features) do
    local enabled = config.get_nested(tech_stack, feat.path)
    if enabled == nil then
      enabled = feat.default
    end
    local icon = enabled and nf.enabled or nf.disabled
    table.insert(toggle_parts, string.format("[%s]%s %s", feat.key, icon, feat.name))
  end
  local line2 = " " .. table.concat(toggle_parts, "  ")

  -- ─── Line 3: Actions & Navigation ──────────────────────────
  local line3 = string.format(
    " [G]rid  [R]estart  [K]ill  [S]ave  [D]etect  [I]njector  [E]nhance  %s  [m]odel  [c]mds  [s]kills  [d]ash",
    nf.pipe
  )

  -- ─── Line 4: Version + mode + help ─────────────────────────
  local perm_icon = nf.perm_mode(status.permissions_mode)
  local update_icon = nf.update_mode(status.update_mode)
  local line4 = string.format(
    " v%s  %s  %s %s  %s %s  %s %d protected  %s Sync:%s  %s  [?]help  [q]close",
    status.version,
    nf.pipe,
    perm_icon, status.permissions_mode,
    nf.pipe,
    update_icon .. " " .. status.update_mode,
    nf.pipe,
    status.protected_count,
    nf.pipe,
    sync_icon,
    nf.pipe
  )

  return { line1, line2, line3, line4 }
end

-- Open the control panel as a bottom stripe
function M.open()
  if helpers.focus_if_open(M.winid) then
    return
  end

  -- Create buffer
  M.bufnr = helpers.create_buffer("ccasp://control-stripe")

  -- Create bottom-anchored split
  vim.cmd("botright " .. STRIPE_HEIGHT .. "new")
  M.winid = vim.api.nvim_get_current_win()

  -- Replace the new buffer with our named buffer
  vim.api.nvim_win_set_buf(M.winid, M.bufnr)

  -- Set window options for bottom stripe
  vim.wo[M.winid].number = false
  vim.wo[M.winid].relativenumber = false
  vim.wo[M.winid].signcolumn = "no"
  vim.wo[M.winid].winfixheight = true
  vim.wo[M.winid].wrap = false
  vim.wo[M.winid].cursorline = false
  vim.wo[M.winid].winhighlight = "Normal:CcaspBottomBarBg,NormalFloat:CcaspBottomBarBg,WinBar:CcaspBarLabel,EndOfBuffer:CcaspBottomBarBg"

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
  helpers.set_buffer_content(M.bufnr, lines)
  M.apply_highlights()
end

-- Apply syntax highlighting to the stripe
function M.apply_highlights()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local ns = helpers.prepare_highlights("ccasp_control", M.bufnr)
  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    local line_idx = i - 1

    -- Line 1: Status line - highlight labels and values
    if i == 1 then
      -- Highlight "CCASP" brand
      local ccasp_start = line:find("CCASP")
      if ccasp_start then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspTitle", line_idx, 0, ccasp_start + 5)
      end
      -- Highlight pipe separators
      for s in line:gmatch("()" .. nf.pipe) do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspBarSep", line_idx, s - 1, s + #nf.pipe - 1)
      end
      -- Highlight PI status
      local pi_on = line:find("PI:ON")
      if pi_on then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspToggleOn", line_idx, pi_on - 1, pi_on + 4)
      end
      local pi_off = line:find("PI:OFF")
      if pi_off then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspToggleOff", line_idx, pi_off - 1, pi_off + 5)
      end
    end

    -- Line 2: Feature toggles - highlight toggle icons
    if i == 2 then
      -- Highlight ON toggles (nf.enabled)
      for s in line:gmatch("()" .. nf.enabled) do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspToggleOn", line_idx, s - 1, s + #nf.enabled - 1)
      end
      -- Highlight OFF toggles (nf.disabled)
      for s in line:gmatch("()" .. nf.disabled) do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspToggleOff", line_idx, s - 1, s + #nf.disabled - 1)
      end
    end

    -- All lines: Highlight [key] patterns
    for s, e in line:gmatch("()%[%w+%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspToggleKey", line_idx, s - 1, e - 1)
    end

    -- Line 4: version and mode info
    if i == 4 then
      for s in line:gmatch("()" .. nf.pipe) do
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspBarSep", line_idx, s - 1, s + #nf.pipe - 1)
      end
    end
  end
end

-- Setup keymaps for the control panel
function M.setup_keymaps()
  local config = get_config()
  local agents = get_agents()

  local opts = { buffer = M.bufnr, nowait = true, silent = true }

  -- Close
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
    vim.defer_fn(function() M.refresh() end, 1000)
  end, opts)

  -- Prompt Injector actions
  vim.keymap.set("n", "I", function()
    local pi_ok, prompt_injector = pcall(get_prompt_injector)
    if pi_ok then
      prompt_injector.toggle()
      M.refresh()
    else
      vim.notify("CCASP: Prompt Injector not available", vim.log.levels.ERROR)
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

  -- Help
  vim.keymap.set("n", "?", function()
    vim.notify(table.concat({
      "CCASP Control Stripe Keys:",
      "  [a-k] Toggle features  [m] Cycle model",
      "  [G] Agent grid  [R] Restart  [K] Kill",
      "  [S] Save  [D] Detect  [I] Injector",
      "  [c] Commands  [s] Skills  [d] Dashboard",
      "  [q/Esc] Close",
    }, "\n"), vim.log.levels.INFO)
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
