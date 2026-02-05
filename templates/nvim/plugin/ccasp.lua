-- CCASP Plugin Auto-loader
-- This file is automatically loaded by Neovim when the plugin is installed

-- Prevent loading twice
if vim.g.loaded_ccasp then
  return
end
vim.g.loaded_ccasp = true

-- Check Neovim version
if vim.fn.has("nvim-0.9.0") ~= 1 then
  vim.notify("CCASP requires Neovim 0.9+", vim.log.levels.ERROR)
  return
end

-- Register commands (setup can be called later)
vim.api.nvim_create_user_command("CCASPOpen", function()
  require("ccasp").open()
end, { desc = "Open CCASP Control Center" })

vim.api.nvim_create_user_command("CCASPClose", function()
  require("ccasp").close()
end, { desc = "Close CCASP Control Center" })

vim.api.nvim_create_user_command("CCASPToggle", function()
  require("ccasp").toggle_sidebar()
end, { desc = "Toggle CCASP sidebar" })

vim.api.nvim_create_user_command("CCASPRun", function(opts)
  require("ccasp").run_command(opts.args)
end, { nargs = "?", desc = "Run CCASP command" })

vim.api.nvim_create_user_command("CCASPSearch", function(opts)
  require("ccasp").search_commands(opts.args)
end, { nargs = "?", desc = "Search CCASP commands" })

vim.api.nvim_create_user_command("CCASPSetup", function()
  require("ccasp").setup()
end, { desc = "Setup CCASP with defaults" })
