-- ccasp/ui - UI module index
-- Loads all UI components for classic layout

local M = {}

-- Lazy-load submodules
M.sidebar = require("ccasp.ui.sidebar")
M.statusbar = require("ccasp.ui.statusbar")
M.search = require("ccasp.ui.search")
M.popup = require("ccasp.ui.popup")

-- New modern UI modules
M.icons = require("ccasp.ui.icons")
M.highlights = require("ccasp.ui.highlights")
M.topbar = require("ccasp.ui.topbar")
M.logo = require("ccasp.ui.logo")

return M
