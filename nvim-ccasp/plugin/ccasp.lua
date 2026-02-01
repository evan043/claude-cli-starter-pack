-- plugin/ccasp.lua - Plugin entry point
-- Registers commands and sets up autoload

if vim.g.loaded_ccasp then
  return
end
vim.g.loaded_ccasp = true

-- Create user commands
vim.api.nvim_create_user_command("CcaspDashboard", function()
  require("ccasp.panels.dashboard").open()
end, { desc = "Open CCASP Dashboard" })

vim.api.nvim_create_user_command("CcaspControl", function()
  require("ccasp.panels.control").toggle()
end, { desc = "Toggle CCASP Control Panel" })

vim.api.nvim_create_user_command("CcaspFeatures", function()
  require("ccasp.panels.features").open()
end, { desc = "Open CCASP Feature Toggles" })

vim.api.nvim_create_user_command("CcaspHooks", function()
  require("ccasp.panels.hooks").open()
end, { desc = "Open CCASP Hook Manager" })

vim.api.nvim_create_user_command("CcaspGrid", function()
  require("ccasp.agents").open_grid()
end, { desc = "Open CCASP Agent Grid" })

vim.api.nvim_create_user_command("CcaspKillAll", function()
  require("ccasp.agents").kill_all()
end, { desc = "Kill all CCASP agents" })

vim.api.nvim_create_user_command("CcaspRestartAll", function()
  require("ccasp.agents").restart_all()
end, { desc = "Restart all CCASP agents" })

vim.api.nvim_create_user_command("CcaspCommands", function()
  require("ccasp.telescope").commands()
end, { desc = "Browse CCASP Commands" })

vim.api.nvim_create_user_command("CcaspSkills", function()
  require("ccasp.telescope").skills()
end, { desc = "Browse CCASP Skills" })

vim.api.nvim_create_user_command("CcaspHealth", function()
  vim.cmd("checkhealth ccasp")
end, { desc = "Check CCASP health" })

-- Health check registration
vim.api.nvim_create_autocmd("User", {
  pattern = "LazyHealth",
  callback = function()
    vim.health.start("ccasp")
    require("ccasp").health()
  end,
})
