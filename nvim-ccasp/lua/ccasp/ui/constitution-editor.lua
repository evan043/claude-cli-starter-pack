-- Constitution Editor (stub)
-- Referenced by sidebar.lua but not yet implemented.
-- Provides safe no-op functions to prevent require() crashes.

local M = {}

function M.exists()
  return false
end

function M.get_constitution()
  return nil
end

function M.open()
  vim.notify("ccasp: constitution editor not yet implemented", vim.log.levels.INFO)
end

return M
