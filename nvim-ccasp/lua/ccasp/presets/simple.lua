-- Simple keybindings preset for CCASP
-- Uses Ctrl as modifier - no leader key needed
--
-- USAGE: Just add this to your init.lua:
--   require("ccasp").setup(require("ccasp.presets.simple"))
--
-- KEYBINDINGS:
--   Ctrl+g  = Agent Grid (6 Claude sessions)
--   Ctrl+p  = Control Panel
--   Ctrl+d  = Dashboard
--   Ctrl+i  = Toggle Prompt Injector
--   Ctrl+e  = Quick Enhance
--   Ctrl+t  = Taskbar
--   Ctrl+f  = Feature Toggles
--   Ctrl+h  = Hook Manager
--   Ctrl+s  = Browse Skills
--   Ctrl+k  = Kill All Agents
--
-- Note: Some Ctrl keys may conflict with terminal/system shortcuts.
-- Use extra_keymaps to customize if needed.

return {
  keys = {
    prefix = "",  -- No prefix - using direct Ctrl mappings
    grid = "g",
    control = "p",
    features = "f",
    hooks = "h",
    commands = "c",
    skills = "s",
    dashboard = "d",
    restart_all = "R",
    kill_all = "k",
    prompt_injector = "i",
    quick_enhance = "e",
    taskbar = "t",
  },

  -- Direct Ctrl+key mappings
  extra_keymaps = {
    { "<C-g>", "grid", "Agent Grid" },
    { "<C-p>", "control", "Control Panel" },
    { "<C-d>", "dashboard", "Dashboard" },
    { "<C-i>", "prompt_injector", "Prompt Injector" },
    { "<C-e>", "quick_enhance", "Quick Enhance" },
    { "<C-t>", "taskbar", "Taskbar" },
    { "<C-f>", "features", "Features" },
    { "<C-h>", "hooks", "Hooks" },
    { "<C-s>", "skills", "Skills" },
    { "<C-k>", "kill_all", "Kill All" },
    { "<C-r>", "restart_all", "Restart All" },
  },

  -- Enable prompt injector by default
  prompt_injector = {
    enabled = true,
    auto_enhance = false,
  },

  -- Enable window manager
  window_manager = {
    enabled = true,
    taskbar = {
      enabled = true,
    },
  },
}
