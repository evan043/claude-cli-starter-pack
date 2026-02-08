-- ccasp/project_config/init.lua - Public API for Project Configuration panel

local M = {}

function M.open()
  require("ccasp.project_config.ui").open_panel()
end

function M.close()
  require("ccasp.project_config.ui").close_panel()
end

function M.toggle()
  local ui = require("ccasp.project_config.ui")
  if ui.is_open and ui.is_open() then
    ui.close_panel()
  else
    ui.open_panel()
  end
end

function M.get_config()
  return require("ccasp.project_config.storage").load()
end

return M
