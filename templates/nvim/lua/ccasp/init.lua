-- CCASP Neovim Control Center
-- Main entry point for the ccasp.nvim plugin
--
-- Provides a visual control panel for Claude CLI Advanced Starter Pack:
-- - Command browser with sections and search
-- - Pre-execution option configuration
-- - Settings panel (permissions, updates, defaults)
-- - Protected commands management
-- - Assets management (agents, hooks, skills)
-- - Claude CLI terminal integration

local M = {}

-- Plugin version
M.version = "0.1.0"

-- Default configuration
M.defaults = {
  -- Sidebar settings
  sidebar = {
    width = 40,
    position = "left", -- "left" or "right"
    auto_open = false,
  },

  -- Terminal settings
  terminal = {
    shell = "claude",
    size = 60, -- percentage of window
    direction = "vertical", -- "horizontal", "vertical", or "float"
  },

  -- Keybindings
  keybindings = {
    toggle_sidebar = "<C-b>",
    toggle_focus = "<C-\\>",
    open_ccasp = "<leader>cc",
    run_last = "<leader>cr",
    quick_search = "<leader>cs",
    check_updates = "<leader>cu",
    toggle_perms = "<leader>cp",
  },

  -- CCASP settings path
  ccasp_root = ".claude",
  settings_file = ".claude/settings.json",
  protected_file = ".claude/protected.json",
}

-- Current configuration (merged with defaults)
M.config = {}

-- Plugin state
M.state = {
  sidebar_open = false,
  active_tab = 1, -- 1=Commands, 2=Settings, 3=Protected, 4=Status, 5=Keys, 6=Assets
  selected_command = nil,
  selected_asset = nil,       -- Currently selected asset name
  selected_asset_type = nil,  -- Type of selected asset (agents/hooks/skills)
  search_query = "",
  expanded_sections = {},
  expanded_asset_sections = { agents = true, hooks = false, skills = false }, -- Asset sections expansion state
  commands_cache = nil,
  assets_cache = nil,
  last_command = nil,
}

-- Setup function - call this from your init.lua
function M.setup(opts)
  -- Merge user options with defaults
  M.config = vim.tbl_deep_extend("force", M.defaults, opts or {})

  -- Load submodules
  M.core = require("ccasp.core")
  M.ui = require("ccasp.ui")
  M.terminal = require("ccasp.terminal")

  -- Initialize state from saved settings
  M.core.settings.load()

  -- Set up keybindings
  M._setup_keybindings()

  -- Set up autocommands
  M._setup_autocmds()

  -- Register commands
  M._register_commands()

  return M
end

-- Set up global keybindings
function M._setup_keybindings()
  local keys = M.config.keybindings
  local opts = { noremap = true, silent = true }

  vim.keymap.set("n", keys.toggle_sidebar, function()
    M.toggle_sidebar()
  end, vim.tbl_extend("force", opts, { desc = "Toggle CCASP sidebar" }))

  vim.keymap.set("n", keys.toggle_focus, function()
    M.toggle_focus()
  end, vim.tbl_extend("force", opts, { desc = "Toggle focus sidebar/terminal" }))

  vim.keymap.set("n", keys.open_ccasp, function()
    M.open()
  end, vim.tbl_extend("force", opts, { desc = "Open CCASP Control Center" }))

  vim.keymap.set("n", keys.run_last, function()
    M.run_last_command()
  end, vim.tbl_extend("force", opts, { desc = "Run last CCASP command" }))

  vim.keymap.set("n", keys.quick_search, function()
    M.quick_search()
  end, vim.tbl_extend("force", opts, { desc = "Quick search commands" }))

  vim.keymap.set("n", keys.check_updates, function()
    M.check_updates()
  end, vim.tbl_extend("force", opts, { desc = "Check for CCASP updates" }))

  vim.keymap.set("n", keys.toggle_perms, function()
    M.toggle_permissions()
  end, vim.tbl_extend("force", opts, { desc = "Toggle permissions mode" }))
end

-- Set up autocommands
function M._setup_autocmds()
  local group = vim.api.nvim_create_augroup("CCASP", { clear = true })

  -- Save settings on exit
  vim.api.nvim_create_autocmd("VimLeavePre", {
    group = group,
    callback = function()
      M.core.settings.save()
    end,
  })

  -- Reload commands when .claude/commands/ changes
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    pattern = "*/.claude/commands/*.md",
    callback = function()
      M.reload_commands()
    end,
  })

  -- Reload assets when .claude/agents/ changes
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    pattern = "*/.claude/agents/*.md",
    callback = function()
      M.reload_assets()
    end,
  })

  -- Reload assets when .claude/hooks/ changes
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    pattern = "*/.claude/hooks/*.js",
    callback = function()
      M.reload_assets()
    end,
  })

  -- Reload assets when .claude/skills/ changes
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    pattern = { "*/.claude/skills/*/skill.json", "*/.claude/skills/*/skill.md" },
    callback = function()
      M.reload_assets()
    end,
  })
end

-- Register user commands
function M._register_commands()
  vim.api.nvim_create_user_command("CCASPOpen", function()
    M.open()
  end, { desc = "Open CCASP Control Center" })

  vim.api.nvim_create_user_command("CCASPClose", function()
    M.close()
  end, { desc = "Close CCASP Control Center" })

  vim.api.nvim_create_user_command("CCASPToggle", function()
    M.toggle_sidebar()
  end, { desc = "Toggle CCASP sidebar" })

  vim.api.nvim_create_user_command("CCASPRun", function(opts)
    M.run_command(opts.args)
  end, { nargs = "?", desc = "Run CCASP command" })

  vim.api.nvim_create_user_command("CCASPSearch", function(opts)
    M.search_commands(opts.args)
  end, { nargs = "?", desc = "Search CCASP commands" })
end

-- Open CCASP Control Center
function M.open()
  M.ui.sidebar.open()
  M.terminal.open()
  M.state.sidebar_open = true
end

-- Close CCASP Control Center
function M.close()
  M.ui.sidebar.close()
  M.terminal.close()
  M.state.sidebar_open = false
end

-- Toggle sidebar
function M.toggle_sidebar()
  if M.state.sidebar_open then
    M.ui.sidebar.close()
    M.state.sidebar_open = false
  else
    M.ui.sidebar.open()
    M.state.sidebar_open = true
  end
end

-- Toggle focus between sidebar and terminal
function M.toggle_focus()
  if M.ui.sidebar.is_focused() then
    M.terminal.focus()
  else
    M.ui.sidebar.focus()
  end
end

-- Run a command
function M.run_command(cmd_name)
  if not cmd_name or cmd_name == "" then
    cmd_name = M.state.selected_command
  end

  if not cmd_name then
    vim.notify("No command selected", vim.log.levels.WARN)
    return
  end

  -- Get command options
  local options = M.state.command_options and M.state.command_options[cmd_name] or {}

  -- Build command string
  local cmd_str = "/" .. cmd_name
  for key, value in pairs(options) do
    if value == true then
      cmd_str = cmd_str .. " --" .. key
    elseif value ~= false then
      cmd_str = cmd_str .. " --" .. key .. "=" .. tostring(value)
    end
  end

  -- Execute in terminal
  M.terminal.send(cmd_str)

  -- Save as last command
  M.state.last_command = cmd_name
end

-- Run last command
function M.run_last_command()
  if M.state.last_command then
    M.run_command(M.state.last_command)
  else
    vim.notify("No previous command", vim.log.levels.INFO)
  end
end

-- Quick search commands
function M.quick_search()
  M.ui.search.open()
end

-- Check for updates
function M.check_updates()
  M.terminal.send("/update-check")
end

-- Toggle permissions mode
function M.toggle_permissions()
  local settings = M.core.settings.get()
  local modes = { "auto", "plan", "ask" }
  local current_idx = 1

  for i, mode in ipairs(modes) do
    if mode == settings.permissions_mode then
      current_idx = i
      break
    end
  end

  local next_idx = (current_idx % #modes) + 1
  settings.permissions_mode = modes[next_idx]
  M.core.settings.set("permissions_mode", settings.permissions_mode)

  vim.notify("Permissions mode: " .. settings.permissions_mode, vim.log.levels.INFO)
  M.ui.statusbar.update()
end

-- Reload commands cache
function M.reload_commands()
  M.state.commands_cache = nil
  M.core.commands.load_all()
  M.ui.sidebar.refresh()
end

-- Reload assets cache
function M.reload_assets()
  M.state.assets_cache = nil
  M.core.assets.reload()
  M.ui.sidebar.refresh()
end

-- Search commands
function M.search_commands(query)
  M.state.search_query = query or ""
  M.ui.sidebar.filter(M.state.search_query)
end

-- Get plugin status for statusbar
function M.get_status()
  local settings = M.core.settings.get()
  local protected = M.core.protected.list()

  return {
    version = M.version,
    permissions_mode = settings.permissions_mode or "auto",
    update_mode = settings.update_mode or "manual",
    protected_count = #protected,
    sync_status = M.core.commands.get_sync_status(),
  }
end

return M
