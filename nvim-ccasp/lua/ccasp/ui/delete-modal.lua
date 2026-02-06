-- Delete Modal (stub)
-- Referenced by sidebar.lua but not yet implemented.
-- Provides safe no-op functions to prevent require() crashes.

local M = {}

function M.show(asset_type, asset_name)
  vim.notify(
    string.format("ccasp: delete modal not yet implemented (type=%s, name=%s)", tostring(asset_type), tostring(asset_name)),
    vim.log.levels.INFO
  )
end

return M
