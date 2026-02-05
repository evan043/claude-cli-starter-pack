-- ccasp/panels/hooks.lua - Hook management panel
local M = {}

-- State
M.bufnr = nil
M.winid = nil
M.selected_line = 1

-- Get dependencies
local function get_config()
  return require("ccasp.config")
end

-- Hook event types
M.events = {
  { name = "PreToolUse", icon = "⚡", desc = "Before tool execution" },
  { name = "PostToolUse", icon = "✓", desc = "After tool completion" },
  { name = "UserPromptSubmit", icon = "💬", desc = "When user sends input" },
}

-- Built-in hook definitions
M.available_hooks = {
  PreToolUse = {
    { name = "file-guard", desc = "Protect sensitive files from edits" },
    { name = "branch-merge-checker", desc = "Validate main branch sync" },
    { name = "token-budget-loader", desc = "Pre-calculate token budget" },
    { name = "phase-validation-gates", desc = "5-gate phase validation" },
    { name = "context-guardian", desc = "Protect sensitive context" },
  },
  PostToolUse = {
    { name = "tool-output-cacher", desc = "Cache large outputs" },
    { name = "autonomous-decision-logger", desc = "JSONL audit trail" },
    { name = "git-commit-tracker", desc = "Update PROGRESS.json" },
    { name = "token-usage-monitor", desc = "Track token consumption" },
    { name = "github-progress-hook", desc = "Sync task completion" },
  },
  UserPromptSubmit = {
    { name = "context-injector", desc = "Inject session context" },
    { name = "session-id-generator", desc = "UUID session tracking" },
    { name = "happy-title-generator", desc = "Auto-generate titles" },
  },
}

-- Render the hooks panel
function M.render()
  local config = get_config()
  local settings = config.load_settings()
  local hooks = settings.hooks or {}

  local lines = {}

  table.insert(lines, "")
  table.insert(lines, "  ╭─────────────────────────────────────────────╮")
  table.insert(lines, "  │             Hook Manager                    │")
  table.insert(lines, "  ╰─────────────────────────────────────────────╯")
  table.insert(lines, "")

  -- Global hooks enabled toggle
  local hooks_enabled = hooks.enabled ~= false
  local global_icon = hooks_enabled and "✓" or "○"
  local global_status = hooks_enabled and "ENABLED" or "DISABLED"
  table.insert(lines, string.format("  [H] Hooks System: %s %s", global_icon, global_status))
  table.insert(lines, "")

  -- Hooks by event type
  for _, event in ipairs(M.events) do
    table.insert(lines, string.format("  %s %s", event.icon, event.name))
    table.insert(lines, "  " .. string.rep("─", 43))

    local event_hooks = M.available_hooks[event.name] or {}
    local active_hooks = hooks[event.name] or {}

    -- Convert active_hooks to lookup table
    local active_lookup = {}
    for _, h in ipairs(active_hooks) do
      local name = type(h) == "table" and h.name or h
      active_lookup[name] = true
    end

    for i, hook in ipairs(event_hooks) do
      local enabled = active_lookup[hook.name]
      local icon = enabled and "✓" or "○"
      local key = string.sub(event.name, 1, 1):lower() .. i

      local line = string.format("    [%s] %s %-22s", key, icon, hook.name)
      table.insert(lines, line)
      table.insert(lines, "          " .. hook.desc)
    end

    table.insert(lines, "")
  end

  table.insert(lines, "  ─────────────────────────────────────────────")
  table.insert(lines, "  Press key to toggle  │  H = Toggle all hooks")
  table.insert(lines, "  e = Edit hook config │  q = Close")
  table.insert(lines, "")

  return lines
end

-- Open the hooks panel
function M.open()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_set_current_win(M.winid)
    return
  end

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(M.bufnr, "buftype", "nofile")
  vim.api.nvim_buf_set_option(M.bufnr, "bufhidden", "wipe")
  vim.api.nvim_buf_set_name(M.bufnr, "ccasp://hooks")

  -- Calculate size
  local width = 51
  local height = 45
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
    title = " Hooks ",
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
  local ns = vim.api.nvim_create_namespace("ccasp_hooks")
  vim.api.nvim_buf_clear_namespace(M.bufnr, ns, 0, -1)

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    if line:match("^  [⚡✓💬]") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  ─") or line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("ENABLED") then
      local s = line:find("ENABLED")
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, s - 1, s + 7)
    elseif line:match("DISABLED") then
      local s = line:find("DISABLED")
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticError", i - 1, s - 1, s + 8)
    elseif line:match("    %[") then
      if line:match("✓") then
        local s = line:find("✓")
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "DiagnosticOk", i - 1, s - 1, s + 3)
      end
    elseif line:match("^          ") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    end

    -- Highlight key bindings
    for s, e in line:gmatch("()%[%w+%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Special", i - 1, s - 1, e - 1)
    end
  end
end

-- Setup keymaps
function M.setup_keymaps()
  local opts = { buffer = M.bufnr, nowait = true }

  -- Window manager keymaps (move/resize)
  local wm_ok, window_manager = pcall(require, "ccasp.window_manager")
  if wm_ok and M.winid then
    window_manager.register(M.winid, "Hooks", "")
    window_manager.setup_keymaps(M.bufnr, M.winid)
  end

  -- Minimize keymap
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    vim.keymap.set("n", "_", function()
      taskbar.minimize(M.winid, "Hooks", "")
      M.winid = nil
      M.bufnr = nil
    end, opts)
  end

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", M.close, opts)

  -- Toggle all hooks
  vim.keymap.set("n", "H", function()
    M.toggle_all_hooks()
  end, opts)

  -- Individual hook toggles (p1-p5 for PreToolUse, o1-o5 for PostToolUse, u1-u3 for UserPromptSubmit)
  for _, event in ipairs(M.events) do
    local prefix = string.sub(event.name, 1, 1):lower()
    local event_hooks = M.available_hooks[event.name] or {}

    for i, hook in ipairs(event_hooks) do
      local key = prefix .. i
      vim.keymap.set("n", key, function()
        M.toggle_hook(event.name, hook.name)
      end, opts)
    end
  end

  -- Edit hook config
  vim.keymap.set("n", "e", function()
    M.close()
    local config_path = vim.fn.getcwd() .. "/.claude/config/settings.json"
    vim.cmd("edit " .. config_path)
  end, opts)

  -- Refresh
  vim.keymap.set("n", "r", M.refresh, opts)
end

-- Toggle a specific hook
function M.toggle_hook(event_name, hook_name)
  local config = get_config()
  local settings = config.load_settings()

  if not settings.hooks then
    settings.hooks = {}
  end
  if not settings.hooks[event_name] then
    settings.hooks[event_name] = {}
  end

  local event_hooks = settings.hooks[event_name]
  local found_idx = nil

  for i, h in ipairs(event_hooks) do
    local name = type(h) == "table" and h.name or h
    if name == hook_name then
      found_idx = i
      break
    end
  end

  if found_idx then
    -- Remove hook
    table.remove(event_hooks, found_idx)
    vim.notify("CCASP: Disabled " .. hook_name, vim.log.levels.INFO)
  else
    -- Add hook
    table.insert(event_hooks, { name = hook_name })
    vim.notify("CCASP: Enabled " .. hook_name, vim.log.levels.INFO)
  end

  config.save_settings(settings)
  M.refresh()
end

-- Toggle all hooks
function M.toggle_all_hooks()
  local config = get_config()
  local settings = config.load_settings()

  if not settings.hooks then
    settings.hooks = { enabled = true }
  else
    settings.hooks.enabled = not settings.hooks.enabled
  end

  config.save_settings(settings)
  vim.notify(
    "CCASP: Hooks " .. (settings.hooks.enabled and "enabled" or "disabled"),
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
