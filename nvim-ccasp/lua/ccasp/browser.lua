-- ccasp/browser.lua - Cross-platform browser launcher for Site Intel Dashboard
local M = {}

local DASHBOARD_PORT = 3847
local DASHBOARD_HOST = "localhost"

--- Open a URL in the user's default web browser
---@param url string The URL to open
---@return boolean success
function M.open_url(url)
  local cmd
  if vim.fn.has("win32") == 1 then
    cmd = string.format('cmd.exe /c start "" "%s"', url)
  elseif vim.fn.has("mac") == 1 then
    cmd = string.format('open "%s"', url)
  elseif vim.fn.has("unix") == 1 then
    cmd = string.format('xdg-open "%s" &', url)
  else
    vim.notify("CCASP: Unsupported platform for browser launch", vim.log.levels.ERROR)
    return false
  end

  vim.fn.system(cmd)
  vim.notify("CCASP: Opening " .. url, vim.log.levels.INFO)
  return true
end

--- Open the Site Intel Dashboard in a browser, optionally at a specific tab
---@param tab? string Tab to open: "feature-audit", "dev-scan", "graph", "performance", "recommendations", "pages"
---@return boolean success
function M.open_dashboard(tab)
  local url = string.format("http://%s:%d", DASHBOARD_HOST, DASHBOARD_PORT)
  if tab and tab ~= "" then
    url = url .. "#" .. tab
  end
  return M.open_url(url)
end

return M
