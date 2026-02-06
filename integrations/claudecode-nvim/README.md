# Claude Code Neovim Plugin Integration

Integration guide for using nvim-ccasp alongside the official `claude-code.nvim` plugin.

## Overview

The `claude-code.nvim` plugin (by Gregory-Manley) provides a terminal-based Claude Code interface inside Neovim. The nvim-ccasp plugin extends this with a structured appshell layout, panel system, and testing framework.

## Compatibility

| Feature | claude-code.nvim | nvim-ccasp |
|---------|-----------------|------------|
| Terminal | Built-in split | Managed splits + floating |
| Layout | Simple | Appshell (icon rail, flyout, panels) |
| Keymaps | `<leader>ac` toggle | Full keymap set |
| Testing | None | plenary.nvim test suite |
| Window Mgmt | Basic | Window manager + taskbar |

## Using Together

### Recommended Setup
```lua
-- In your Neovim config (init.lua or lazy.nvim spec)

-- 1. claude-code.nvim for the terminal interface
{
  "gregory-Manley/claude-code.nvim",
  config = function()
    require("claude-code").setup({
      -- Let ccasp manage the terminal
      auto_open = false,
    })
  end,
}

-- 2. nvim-ccasp for the appshell and panels
{
  "your-org/nvim-ccasp",
  config = function()
    require("ccasp").setup({
      layout = "appshell",
      -- ccasp manages terminal placement
    })
  end,
}
```

### Key Differences
- `claude-code.nvim` opens Claude Code in a terminal split
- `nvim-ccasp` wraps the entire editor in an appshell with multiple panels
- They can coexist but should not both manage the same terminal

## Testing with ccasp

When using nvim-ccasp's testing framework:
```powershell
# Tests run headless and don't require claude-code.nvim
./scripts/nvim-test.ps1
```

The test harness uses `minimal_init.lua` which loads only nvim-ccasp and plenary.nvim.
