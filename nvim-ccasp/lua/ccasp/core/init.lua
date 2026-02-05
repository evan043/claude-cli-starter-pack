-- CCASP Core Module
-- Provides core functionality: settings, commands, assets, protected list management

local M = {}

-- Load submodules
M.settings = require("ccasp.core.settings")
M.commands = require("ccasp.core.commands")
M.protected = require("ccasp.core.protected")
M.parser = require("ccasp.core.parser")
M.assets = require("ccasp.core.assets")

return M
