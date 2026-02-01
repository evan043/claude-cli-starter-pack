-- ccasp/panels/features.lua - Feature toggles panel
local M = {}

-- State
M.bufnr = nil
M.winid = nil

-- Get dependencies
local function get_config()
  return require("ccasp.config")
end

-- Feature definitions with categories
M.features = {
  {
    category = "Core Features",
    items = {
      { key = "1", name = "Token Management", path = "tokenManagement.enabled", desc = "Track and budget token usage" },
      { key = "2", name = "Happy Mode", path = "happyMode.enabled", desc = "Mobile app integration" },
      { key = "3", name = "Phased Development", path = "phasedDevelopment.enabled", desc = "95%+ success planning" },
      { key = "4", name = "Agents", path = "agents.enabled", desc = "L1/L2/L3 agent hierarchy" },
    },
  },
  {
    category = "Hooks & Automation",
    items = {
      { key = "5", name = "Hooks Enabled", path = "hooks.enabled", desc = "Pre/Post tool use hooks" },
      { key = "6", name = "Auto Commit", path = "hooks.autoCommit", desc = "Auto-commit on completion" },
      { key = "7", name = "Git Tracking", path = "hooks.gitTracking", desc = "Track commits in PROGRESS.json" },
      { key = "8", name = "Decision Logging", path = "hooks.decisionLogging", desc = "JSONL audit trail" },
    },
  },
  {
    category = "Integrations",
    items = {
      { key = "9", name = "GitHub Sync", path = "versionControl.autoSync", desc = "Sync with Project Board" },
      { key = "0", name = "Deployment", path = "deployment.enabled", desc = "Auto-deployment workflows" },
    },
  },
}

-- Render the features panel
function M.render()
  local config = get_config()
  local tech_stack = config.load_tech_stack()

  local lines = {}

  table.insert(lines, "")
  table.insert(lines, "  ╭─────────────────────────────────────────╮")
  table.insert(lines, "  │          Feature Toggles                │")
  table.insert(lines, "  ╰─────────────────────────────────────────╯")
  table.insert(lines, "")

  for _, category in ipairs(M.features) do
    table.insert(lines, "  " .. category.category)
    table.insert(lines, "  " .. string.rep("─", 41))

    for _, feat in ipairs(category.items) do
      local enabled = config.get_nested(tech_stack, feat.path)
      local icon = enabled and "✓" or "○"
      local status = enabled and "ON " or "OFF"
      local status_color = enabled and "" or ""

      local line = string.format("    [%s] %s %-20s %s", feat.key, icon, feat.name, status)
      table.insert(lines, line)
      table.insert(lines, "        " .. feat.desc)
    end

    table.insert(lines, "")
  end

  table.insert(lines, "  ─────────────────────────────────────────")
  table.insert(lines, "  Press number to toggle  │  q to close")
  table.insert(lines, "  A = Enable All          │  N = Disable All")
  table.insert(lines, "")

  return lines
end

-- Open the features panel
function M.open()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_set_current_win(M.winid)
    return
  end

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(M.bufnr, "buftype", "nofile")
  vim.api.nvim_buf_set_option(M.bufnr, "bufhidden", "wipe")
  vim.api.nvim_buf_set_name(M.bufnr, "ccasp://features")

  -- Calculate size
  local width = 47
  local height = 35
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
    title = " Features ",
    title_pos = "center",
  })

  vim.wo[M.winid].cursorline = true

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
  local ns = vim.api.nvim_create_namespace("ccasp_features")
  vim.api.nvim_buf_clear_namespace(M.bufnr, ns, 0, -1)

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    if line:match("^  [A-Z]") and not line:match("^  %[") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  ─") or line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("✓") then
      local s = line:find("✓")
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, s - 1, s + 3)
      local on_s = line:find("ON ")
      if on_s then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, on_s - 1, on_s + 2)
      end
    elseif line:match("○") then
      local s = line:find("○")
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, s - 1, s + 3)
      local off_s = line:find("OFF")
      if off_s then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", i - 1, off_s - 1, off_s + 3)
      end
    elseif line:match("^        ") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
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
  local config = get_config()

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)

  -- Feature toggles
  for _, category in ipairs(M.features) do
    for _, feat in ipairs(category.items) do
      vim.keymap.set("n", feat.key, function()
        M.toggle_feature(feat.path, feat.name)
      end, opts)
    end
  end

  -- Enable all
  vim.keymap.set("n", "A", function()
    M.set_all(true)
  end, opts)

  -- Disable all
  vim.keymap.set("n", "N", function()
    M.set_all(false)
  end, opts)

  -- Refresh
  vim.keymap.set("n", "r", M.refresh, opts)
end

-- Toggle a feature
function M.toggle_feature(path, name)
  local config = get_config()
  local tech_stack = config.load_tech_stack()

  local new_value = config.toggle_nested(tech_stack, path)
  config.save_tech_stack(tech_stack)

  vim.notify(
    string.format("CCASP: %s %s", name, new_value and "enabled" or "disabled"),
    vim.log.levels.INFO
  )

  M.refresh()
end

-- Set all features
function M.set_all(enabled)
  local config = get_config()
  local tech_stack = config.load_tech_stack()

  for _, category in ipairs(M.features) do
    for _, feat in ipairs(category.items) do
      config.set_nested(tech_stack, feat.path, enabled)
    end
  end

  config.save_tech_stack(tech_stack)
  vim.notify(
    string.format("CCASP: All features %s", enabled and "enabled" or "disabled"),
    vim.log.levels.INFO
  )

  M.refresh()
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
