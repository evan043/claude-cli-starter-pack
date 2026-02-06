-- Form Editor (stub)
-- Referenced by sidebar.lua but not yet implemented.
-- Provides safe no-op functions to prevent require() crashes.

local M = {}

function M.open(asset_type, asset_name)
  vim.notify(
    string.format("ccasp: form editor not yet implemented (type=%s, name=%s)", tostring(asset_type), tostring(asset_name)),
    vim.log.levels.INFO
  )
end

return M
