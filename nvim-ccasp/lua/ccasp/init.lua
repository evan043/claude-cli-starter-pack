-- ccasp.nvim - Neovim integration for Claude CLI Advanced Starter Pack
-- A terminal-based AI command center for managing multiple Claude sessions

local M = {}

-- Plugin version
M.version = "1.1.0"

-- Default configuration
M.config = {
  -- Grid layout settings
  grid = {
    rows = 3,
    cols = 2,
    -- Agent definitions for each cell
    agents = {
      { name = "planner", role = "Architecture & Planning", model = "opus" },
      { name = "implementer", role = "Code Implementation", model = "sonnet" },
      { name = "tester", role = "Test Generation", model = "sonnet" },
      { name = "reviewer", role = "Code Review", model = "sonnet" },
      { name = "debugger", role = "Debugging & Fixes", model = "sonnet" },
      { name = "docs", role = "Documentation", model = "haiku" },
    },
  },
  -- Control panel settings
  control_panel = {
    width = 45,
    height = 30, -- Increased for Prompt Injector section
    position = "right", -- "right", "left", "float"
    border = "rounded",
  },
  -- Prompt Injector settings (NEW in v1.1.0)
  prompt_injector = {
    enabled = false,
    auto_enhance = false,
    openai = {
      model = "gpt-5.2",
      max_tokens = 1000,
      temperature = 0.3,
    },
  },
  -- CCASP paths (relative to project root)
  paths = {
    settings = ".claude/config/settings.json",
    tech_stack = ".claude/config/tech-stack.json",
    state = ".claude/config/ccasp-state.json",
    hooks_dir = ".claude/hooks/tools",
    commands_dir = ".claude/commands",
    skills_dir = ".claude/skills",
    cache_dir = ".claude/hooks/cache",
  },
  -- Default Claude CLI options
  claude = {
    command = "claude",
    default_model = "sonnet",
    auto_commit = false,
    write_files = true,
    run_tests = true,
  },
  -- Keymaps
  keys = {
    prefix = "<leader>c",
    grid = "g",
    control = "p",
    features = "f",
    hooks = "h",
    commands = "c",
    skills = "s",
    dashboard = "d",
    restart_all = "R",
    kill_all = "K",
    -- Prompt Injector keymaps
    prompt_injector = "i",
    quick_enhance = "e",
  },
}

-- State tracking
M.state = {
  agents = {}, -- { bufnr, winid, job_id, name, status }
  control_panel = nil, -- { bufnr, winid }
  dashboard = nil,
  initialized = false,
}

-- Setup function
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})

  -- Load submodules
  M.utils = require("ccasp.config")
  M.panels = {
    control = require("ccasp.panels.control"),
    features = require("ccasp.panels.features"),
    hooks = require("ccasp.panels.hooks"),
    dashboard = require("ccasp.panels.dashboard"),
    prompt_editor = require("ccasp.panels.prompt_editor"),
  }
  M.agents = require("ccasp.agents")
  M.telescope = require("ccasp.telescope")
  M.statusline = require("ccasp.statusline")

  -- Load Prompt Injector modules
  M.openai = require("ccasp.openai")
  M.prompt_injector = require("ccasp.prompt_injector")

  -- Initialize Prompt Injector with config
  M.prompt_injector.setup({
    enabled = M.config.prompt_injector.enabled,
    auto_enhance = M.config.prompt_injector.auto_enhance,
    openai = M.config.prompt_injector.openai,
  })

  -- Setup keymaps
  M.setup_keymaps()

  -- Setup autocommands
  M.setup_autocmds()

  M.state.initialized = true

  vim.notify("CCASP.nvim loaded", vim.log.levels.INFO)
end

-- Setup keybindings
function M.setup_keymaps()
  local prefix = M.config.keys.prefix
  local keys = M.config.keys

  -- Function lookup table
  local actions = {
    grid = function() M.agents.open_grid() end,
    control = function() M.panels.control.toggle() end,
    features = function() M.panels.features.open() end,
    hooks = function() M.panels.hooks.open() end,
    commands = function() M.telescope.commands() end,
    skills = function() M.telescope.skills() end,
    dashboard = function() M.panels.dashboard.open() end,
    restart_all = function() M.agents.restart_all() end,
    kill_all = function() M.agents.kill_all() end,
    prompt_injector = function() M.prompt_injector.toggle() end,
    quick_enhance = function() M.prompt_injector.quick_enhance() end,
  }

  local mappings = {
    { keys.grid, actions.grid, "Open Agent Grid" },
    { keys.control, actions.control, "Control Panel" },
    { keys.features, actions.features, "Feature Toggles" },
    { keys.hooks, actions.hooks, "Hook Manager" },
    { keys.commands, actions.commands, "Browse Commands" },
    { keys.skills, actions.skills, "Browse Skills" },
    { keys.dashboard, actions.dashboard, "Dashboard" },
    { keys.restart_all, actions.restart_all, "Restart All Agents" },
    { keys.kill_all, actions.kill_all, "Kill All Agents" },
    { keys.prompt_injector, actions.prompt_injector, "Toggle Prompt Injector" },
    { keys.quick_enhance, actions.quick_enhance, "Quick Enhance" },
  }

  -- Standard prefix mappings (e.g., ,g or <leader>cg)
  for _, map in ipairs(mappings) do
    vim.keymap.set("n", prefix .. map[1], map[2], { desc = "CCASP: " .. map[3] })
  end

  -- Extra keymaps from presets (e.g., <S-F1>, <Tab>p)
  if M.config.extra_keymaps then
    for _, map in ipairs(M.config.extra_keymaps) do
      local key, action_name, desc = map[1], map[2], map[3]
      if actions[action_name] then
        vim.keymap.set("n", key, actions[action_name], { desc = "CCASP: " .. desc })
      end
    end
  end
end

-- Setup autocommands
function M.setup_autocmds()
  local group = vim.api.nvim_create_augroup("CCASP", { clear = true })

  -- Watch for config file changes
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    pattern = "*/.claude/config/*.json",
    callback = function(args)
      local ok, err = pcall(function()
        local content = table.concat(vim.fn.readfile(args.file), "\n")
        vim.fn.json_decode(content)
      end)
      if not ok then
        vim.notify("CCASP: Invalid JSON - " .. tostring(err), vim.log.levels.ERROR)
      else
        vim.notify("CCASP: Config updated", vim.log.levels.INFO)
        vim.api.nvim_exec_autocmds("User", { pattern = "CcaspConfigReload" })
      end
    end,
  })

  -- Cleanup on exit
  vim.api.nvim_create_autocmd("VimLeavePre", {
    group = group,
    callback = function()
      M.agents.kill_all()
    end,
  })
end

-- Health check
function M.health()
  local health = vim.health or require("health")

  health.start("CCASP.nvim")

  -- Check Claude CLI
  if vim.fn.executable("claude") == 1 then
    health.ok("Claude CLI found")
  else
    health.error("Claude CLI not found", { "Install Claude CLI: npm install -g @anthropic-ai/claude-code" })
  end

  -- Check ccasp
  if vim.fn.executable("ccasp") == 1 then
    health.ok("CCASP CLI found")
  else
    health.warn("CCASP CLI not found", { "Install: npm install -g claude-cli-advanced-starter-pack" })
  end

  -- Check for .claude directory
  local claude_dir = vim.fn.getcwd() .. "/.claude"
  if vim.fn.isdirectory(claude_dir) == 1 then
    health.ok(".claude directory exists")
  else
    health.warn(".claude directory not found", { "Run: ccasp init" })
  end

  -- Check dependencies
  local has_plenary, _ = pcall(require, "plenary")
  if has_plenary then
    health.ok("plenary.nvim found")
  else
    health.error("plenary.nvim not found", { "Required for async operations" })
  end

  local has_telescope, _ = pcall(require, "telescope")
  if has_telescope then
    health.ok("telescope.nvim found")
  else
    health.warn("telescope.nvim not found", { "Optional: enables command/skill browsing" })
  end
end

return M
