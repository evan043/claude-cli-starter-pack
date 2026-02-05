# CCASP.nvim - Neovim Control Center

A full-featured Neovim control center for Claude CLI Advanced Starter Pack (CCASP).

## Features

- **Tabbed Sidebar** - Commands, Settings, Protected, Status tabs
- **Command Browser** - Search and browse all CCASP slash commands
- **Pre-execution Options** - Configure command options before running
- **Settings Panel** - Manage permissions, update mode, defaults
- **Protected Commands** - Mark commands as safe from auto-updates
- **Claude CLI Terminal** - Integrated terminal pane for Claude CLI
- **Vim-native Keybindings** - Feels like home

## Installation

### Using lazy.nvim

```lua
{
  "evan043/ccasp.nvim",
  dependencies = {
    "MunifTanjim/nui.nvim",
    "nvim-telescope/telescope.nvim",
    "akinsho/toggleterm.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      -- your config here
    })
  end,
  keys = {
    { "<C-b>", "<cmd>CCASPToggle<cr>", desc = "Toggle CCASP sidebar" },
    { "<leader>cc", "<cmd>CCASPOpen<cr>", desc = "Open CCASP" },
  },
}
```

### Manual Installation

Copy the `lua/ccasp` directory to your Neovim config:

```bash
cp -r lua/ccasp ~/.config/nvim/lua/
```

Then add to your init.lua:

```lua
require("ccasp").setup()
```

## Requirements

- Neovim 0.9+
- [nui.nvim](https://github.com/MunifTanjim/nui.nvim) - UI components
- [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) - Fuzzy search
- [toggleterm.nvim](https://github.com/akinsho/toggleterm.nvim) - Terminal integration
- [Claude CLI](https://claude.ai/code) - Anthropic's Claude Code CLI

## Configuration

```lua
require("ccasp").setup({
  -- Sidebar settings
  sidebar = {
    width = 40,           -- sidebar width
    position = "left",    -- "left" or "right"
    auto_open = false,    -- open on startup
  },

  -- Terminal settings
  terminal = {
    shell = "claude",     -- command to run
    size = 60,           -- percentage of window
    direction = "vertical", -- "horizontal", "vertical", "float"
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

  -- CCASP paths
  ccasp_root = ".claude",
  settings_file = ".claude/settings.json",
  protected_file = ".claude/protected.json",
})
```

## Keybindings

### Global

| Key | Action |
|-----|--------|
| `<C-b>` | Toggle sidebar |
| `<C-\>` | Toggle focus sidebar/terminal |
| `<Tab>` | Cycle tabs |
| `1-4` | Jump to tab |
| `?` | Show help |
| `q` | Close popup/sidebar |

### Navigation

| Key | Action |
|-----|--------|
| `j/k` | Move up/down |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `{/}` | Prev/next section |

### Sections

| Key | Action |
|-----|--------|
| `zo` | Expand section |
| `zc` | Collapse section |
| `za` | Toggle section |
| `zM` | Collapse all |
| `zR` | Expand all |

### Commands

| Key | Action |
|-----|--------|
| `/` | Search commands |
| `<Enter>` | Run command |
| `e` | Expand options popup |
| `<Space>` | Toggle option |
| `y` | Yank command name |
| `o` | Open command source |

### Leader Keys

| Key | Action |
|-----|--------|
| `<leader>cc` | Open CCASP |
| `<leader>cr` | Run last command |
| `<leader>cs` | Quick search |
| `<leader>cu` | Check updates |
| `<leader>cp` | Toggle permissions |

## Commands

| Command | Description |
|---------|-------------|
| `:CCASPOpen` | Open CCASP Control Center |
| `:CCASPClose` | Close CCASP Control Center |
| `:CCASPToggle` | Toggle sidebar |
| `:CCASPRun [cmd]` | Run a command |
| `:CCASPSearch [query]` | Search commands |

## Layout

```
┌─────────────────────────────────────┬───────────────────────────────────────┐
│ [1] Commands [2] Settings [3] Safe  │                                       │
│ ─────────────────────────────────── │  $ claude                             │
│ 🔍 Search commands...          [/]  │                                       │
│ ─────────────────────────────────── │  Welcome to Claude Code CLI           │
│                                     │                                       │
│ ▼ VISION MODE                       │  > Ready for input...                 │
│   ► vision-init                     │                                       │
│     Initialize autonomous MVP       │                                       │
│                                     │                                       │
│ ▼ REFACTORING                       │                                       │
│   refactor-analyze                  │                                       │
│                                     │                                       │
│ ► GITHUB & ISSUES (collapsed)       │                                       │
│ ► DEPLOYMENT (collapsed)            │                                       │
│                                     │                                       │
│ ─────────────────────────────────── │                                       │
│ QUICK PREVIEW: vision-init          │                                       │
│ Options:                            │                                       │
│  [x] Quick start mode               │                                       │
│                                     │                                       │
│ [↵] Run  [e] Expand  [?] Help       │                                       │
├─────────────────────────────────────┴───────────────────────────────────────┤
│ CCASP v2.2.18 │ Perms: Auto │ Updates: Manual │ Protected: 3 │ Sync: ✓     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## License

MIT
