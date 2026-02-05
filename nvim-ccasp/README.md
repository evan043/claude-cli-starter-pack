# ccasp.nvim

Neovim integration for Claude CLI Advanced Starter Pack (CCASP). Build a terminal-based AI command center with multi-agent grids, feature toggles, and comprehensive project management.

## Features

- **Multi-Agent Grid**: Run 6 Claude CLI sessions in a perfectly aligned grid layout
- **Control Panel**: Floating panel to toggle features, restart agents, change models
- **Feature Toggles**: Enable/disable CCASP features without editing JSON
- **Hook Manager**: Visual management of Pre/Post tool use hooks
- **Dashboard**: Overview of project status, token usage, installed components
- **Telescope Integration**: Browse commands, skills, hooks with fuzzy finding
- **Statusline**: Token usage, agent status, version info for lualine/etc
- **Prompt Injector** *(v1.1.0)*: Intercept prompts before sending to Claude, optionally enhance with GPT-5.2

## Installation

### lazy.nvim

```lua
{
  "your-username/ccasp.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",      -- Required
    "nvim-telescope/telescope.nvim", -- Optional, for browsing
  },
  config = function()
    require("ccasp").setup({
      -- your config here
    })
  end,
}
```

### packer.nvim

```lua
use {
  "your-username/ccasp.nvim",
  requires = {
    "nvim-lua/plenary.nvim",
    "nvim-telescope/telescope.nvim",
  },
  config = function()
    require("ccasp").setup()
  end,
}
```

## Configuration

```lua
require("ccasp").setup({
  -- Grid layout for multi-agent view
  grid = {
    rows = 3,
    cols = 2,
    agents = {
      { name = "planner", role = "Architecture & Planning", model = "opus" },
      { name = "implementer", role = "Code Implementation", model = "sonnet" },
      { name = "tester", role = "Test Generation", model = "sonnet" },
      { name = "reviewer", role = "Code Review", model = "sonnet" },
      { name = "debugger", role = "Debugging & Fixes", model = "sonnet" },
      { name = "docs", role = "Documentation", model = "haiku" },
    },
  },

  -- Control panel appearance
  control_panel = {
    width = 45,
    height = 25,
    position = "right", -- "right", "left", or "float"
    border = "rounded",
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
    prompt_injector = "i",
    quick_enhance = "e",
  },

  -- Prompt Injector (v1.1.0)
  prompt_injector = {
    enabled = false,           -- Enable prompt interception
    auto_enhance = false,      -- Auto-enhance prompts with GPT-5.2
    openai = {
      model = "gpt-5.2",       -- OpenAI model for enhancement
      max_tokens = 1000,
      temperature = 0.3,
    },
  },
})
```

## Keybindings

Default keybindings (with `<leader>c` prefix):

| Key | Action |
|-----|--------|
| `<leader>cg` | Open Agent Grid (6 Claude sessions) |
| `<leader>cp` | Toggle Control Panel |
| `<leader>cf` | Feature Toggles |
| `<leader>ch` | Hook Manager |
| `<leader>cc` | Browse Commands (Telescope) |
| `<leader>cs` | Browse Skills (Telescope) |
| `<leader>cd` | Dashboard |
| `<leader>cR` | Restart All Agents |
| `<leader>cK` | Kill All Agents |
| `<leader>ci` | Toggle Prompt Injector |
| `<leader>ce` | Quick Enhance (current line/selection) |

## Commands

| Command | Description |
|---------|-------------|
| `:CcaspDashboard` | Open the dashboard |
| `:CcaspControl` | Toggle control panel |
| `:CcaspFeatures` | Open feature toggles |
| `:CcaspHooks` | Open hook manager |
| `:CcaspGrid` | Open agent grid |
| `:CcaspCommands` | Browse slash commands |
| `:CcaspSkills` | Browse skills |
| `:CcaspKillAll` | Kill all agents |
| `:CcaspRestartAll` | Restart all agents |
| `:CcaspHealth` | Check plugin health |
| `:CcaspPromptInjector` | Toggle Prompt Injector |
| `:CcaspQuickEnhance` | Enhance current line with GPT-5.2 |

## Panels

### Agent Grid

```
┌──────── Claude 1 ────────┬──────── Claude 2 ────────┐
│ agent: planner           │ agent: implementer       │
│ model: opus              │ model: sonnet            │
├──────── Claude 3 ────────┼──────── Claude 4 ────────┤
│ agent: tester            │ agent: reviewer          │
│ model: sonnet            │ model: sonnet            │
├──────── Claude 5 ────────┼──────── Claude 6 ────────┤
│ agent: debugger          │ agent: docs              │
│ model: sonnet            │ model: haiku             │
└──────────────────────────┴──────────────────────────┘
```

### Control Panel

```
╔═══════════════════════════════════════╗
║       CCASP Control Panel             ║
╚═══════════════════════════════════════╝

 Agents
───────────────────────────────────────
   Running: 6  │  Stopped: 0  │  Failed: 0

 Default Model
───────────────────────────────────────
   [haiku]   sonnet   opus
   (Press m to cycle)

 Features
───────────────────────────────────────
   [a]  Auto Commit    OFF
   [w]  Write Files    ON
   [t]  Run Tests      ON
   [g]  GitHub Sync    OFF
   [p]  Phased Dev     ON
   [h]  Hooks          ON
   [i]  Prompt Inj.    OFF

 Prompt Injector
───────────────────────────────────────
   Status: Disabled
   Model:  gpt-5.2
   Auto:   OFF

   [I] Toggle | [A] Auto-Enhance | [E] Quick

 Actions
───────────────────────────────────────
   [G] Open Agent Grid
   [R] Restart All Agents
   [K] Kill All Agents
   [S] Save Settings
   [q] Close Panel
```

### Feature Toggles

Toggle CCASP features with single keypresses:

- `1-0`: Toggle individual features
- `A`: Enable all features
- `N`: Disable all features
- `q`: Close panel

### Hook Manager

Manage hooks by lifecycle event:

- `p1-p5`: Toggle PreToolUse hooks
- `o1-o5`: Toggle PostToolUse hooks
- `u1-u3`: Toggle UserPromptSubmit hooks
- `H`: Toggle all hooks globally
- `e`: Edit settings.json directly

### Prompt Injector *(v1.1.0)*

Intercept prompts before they're sent to Claude CLI, with optional GPT-5.2 enhancement:

```
╔═══════════════════════════════════════════════════╗
║           CCASP Prompt Editor (Enhanced)          ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  # ✨ Enhanced Prompt                             ║
║                                                   ║
║  > Original: refactor this function...            ║
║                                                   ║
║  ---                                              ║
║                                                   ║
║  1. Analyze the function structure                ║
║  2. Identify code smells and duplication          ║
║  3. Apply Extract Method pattern where needed     ║
║  4. Ensure all tests pass after refactoring       ║
║                                                   ║
╠═══════════════════════════════════════════════════╣
║ <CR>:Send | <C-e>:Enhance Again | <C-o>:Original  ║
╚═══════════════════════════════════════════════════╝
```

**Control Panel Keys:**
- `[I]` Toggle Prompt Injector mode
- `[A]` Toggle Auto-Enhance (automatically enhance all prompts)
- `[E]` Quick Enhance current line/selection

**Prompt Editor Keys:**
- `<Enter>` / `<C-s>` - Send prompt to Claude
- `<C-e>` / `e` / `E` - Enhance with GPT-5.2
- `<C-o>` - Show original prompt (if enhanced)
- `<Esc>` / `q` - Cancel and close
- `?` - Show help

**Setup:**

1. Create a `.env` file in your project root:
```bash
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_MODEL=gpt-5.2
CCASP_PROMPT_INJECTOR_ENABLED=true
```

2. Enable in config or toggle with `[I]` in the Control Panel

**Supported Models:**
- `gpt-5.2` - Best balance of quality and cost (default)
- `gpt-5.2-codex` - Optimized for code
- `o3` - Advanced reasoning
- `o4-mini` - Fast and lightweight
- `gpt-4.1` - 1M token context

## Statusline Integration

### Lualine

```lua
require("lualine").setup({
  sections = {
    lualine_x = {
      -- Full component
      {
        require("ccasp.statusline").component,
        cond = require("ccasp.statusline").has_ccasp,
      },
    },
  },
})
```

Or use individual components:

```lua
lualine_x = {
  -- CCASP indicator
  { require("ccasp.statusline").lualine_indicator },
  -- Token usage with color
  {
    require("ccasp.statusline").lualine_tokens,
    color = require("ccasp.statusline").lualine_tokens_color,
  },
  -- Agent count
  { require("ccasp.statusline").lualine_agents },
}
```

## Telescope Extension

```lua
-- Load extension
require("telescope").load_extension("ccasp")

-- Use pickers
:Telescope ccasp commands
:Telescope ccasp skills
:Telescope ccasp hooks
:Telescope ccasp agents
:Telescope ccasp files
:Telescope ccasp grep
```

## Which-Key Integration

```lua
local wk = require("which-key")

wk.add({
  { "<leader>c", group = "CCASP" },
  { "<leader>cg", function() require("ccasp.agents").open_grid() end, desc = "Agent Grid" },
  { "<leader>cp", function() require("ccasp.panels.control").toggle() end, desc = "Control Panel" },
  { "<leader>cf", function() require("ccasp.panels.features").open() end, desc = "Features" },
  { "<leader>ch", function() require("ccasp.panels.hooks").open() end, desc = "Hooks" },
  { "<leader>cc", function() require("ccasp.telescope").commands() end, desc = "Commands" },
  { "<leader>cs", function() require("ccasp.telescope").skills() end, desc = "Skills" },
  { "<leader>cd", function() require("ccasp.panels.dashboard").open() end, desc = "Dashboard" },
})
```

## Requirements

- Neovim 0.9+
- Claude CLI (`npm install -g @anthropic-ai/claude-code`)
- CCASP (`npm install -g claude-cli-advanced-starter-pack`)
- plenary.nvim (required)
- telescope.nvim (optional, for browsing)

## Health Check

Run `:checkhealth ccasp` to verify your setup.

## License

MIT
