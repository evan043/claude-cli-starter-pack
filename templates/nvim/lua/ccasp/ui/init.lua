-- CCASP UI Module
-- Provides UI components using nui.nvim

local M = {}

-- Load submodules
M.sidebar = require("ccasp.ui.sidebar")
M.statusbar = require("ccasp.ui.statusbar")
M.popup = require("ccasp.ui.popup")
M.search = require("ccasp.ui.search")
M.form_editor = require("ccasp.ui.form-editor")
M.delete_modal = require("ccasp.ui.delete-modal")

return M
