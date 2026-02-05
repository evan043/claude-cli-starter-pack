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

-- Window Manager commands (NEW in v1.2.0)
vim.api.nvim_create_user_command("CcaspTaskbar", function()
  require("ccasp.taskbar").show_picker()
end, { desc = "Show CCASP Taskbar picker" })

vim.api.nvim_create_user_command("CcaspMinimize", function()
  local winid = vim.api.nvim_get_current_win()
  local config = vim.api.nvim_win_get_config(winid)
  if config.relative ~= "" then
    local bufname = vim.api.nvim_buf_get_name(vim.api.nvim_win_get_buf(winid))
    local name = bufname:match("ccasp://(.+)") or "Window"
    require("ccasp.taskbar").minimize(winid, name, "")
  else
    vim.notify("CCASP: Can only minimize floating windows", vim.log.levels.WARN)
  end
end, { desc = "Minimize current floating window to taskbar" })

vim.api.nvim_create_user_command("CcaspRestore", function(opts)
  local index = tonumber(opts.args)
  if index then
    require("ccasp.taskbar").restore_by_index(index)
  else
    require("ccasp.taskbar").show_picker()
  end
end, { desc = "Restore window from taskbar", nargs = "?" })

vim.api.nvim_create_user_command("CcaspCenterWindow", function()
  local winid = vim.api.nvim_get_current_win()
  require("ccasp.window_manager").center(winid)
end, { desc = "Center current floating window" })

-- Health check registration
vim.api.nvim_create_autocmd("User", {
  pattern = "LazyHealth",
  callback = function()
    vim.health.start("ccasp")
    require("ccasp").health()
  end,
})
