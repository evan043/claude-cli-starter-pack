-- Simple keybindings preset for CCASP
-- No leader key required - uses comma (,) + single key
--
-- USAGE: Just add this to your init.lua:
--   require("ccasp").setup(require("ccasp.presets.simple"))
--
-- KEYBINDINGS:
--   ,g  = Agent Grid (6 Claude sessions)
--   ,p  = Control Panel
--   ,f  = Feature Toggles
--   ,h  = Hook Manager
--   ,c  = Browse Commands
--   ,s  = Browse Skills
--   ,d  = Dashboard
--   ,i  = Toggle Prompt Injector
--   ,e  = Quick Enhance
--   ,R  = Restart All Agents
--   ,K  = Kill All Agents
--   ,q  = Quit/Close panel
--
-- ALTERNATIVE SHIFT KEYS (also work):
--   <S-F1>  = Control Panel
--   <S-F2>  = Agent Grid
--   <S-F3>  = Dashboard
--   <S-F4>  = Prompt Injector Toggle

return {
  keys = {
    prefix = ",",  -- Comma instead of <leader>
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

  -- Also set up Shift+Function keys as alternatives
  extra_keymaps = {
    { "<S-F1>", "control", "Control Panel" },
    { "<S-F2>", "grid", "Agent Grid" },
    { "<S-F3>", "dashboard", "Dashboard" },
    { "<S-F4>", "prompt_injector", "Prompt Injector" },
    { "<S-F5>", "features", "Features" },
    { "<Tab>p", "control", "Control Panel" },
    { "<Tab>g", "grid", "Agent Grid" },
    { "<Tab>i", "prompt_injector", "Prompt Injector" },
  },

  -- Enable prompt injector by default
  prompt_injector = {
    enabled = true,
    auto_enhance = false,
  },
}
