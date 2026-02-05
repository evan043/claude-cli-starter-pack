-- ccasp/ui - UI module index
-- Loads all UI components for classic layout

local M = {}

-- Lazy-load submodules
M.sidebar = require("ccasp.ui.sidebar")
M.statusbar = require("ccasp.ui.statusbar")
M.search = require("ccasp.ui.search")
M.popup = require("ccasp.ui.popup")

return M
