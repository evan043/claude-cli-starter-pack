-- CCASP Settings Module
-- Manages CCASP settings persistence (JSON read/write)

local M = {}

-- In-memory settings cache
local settings_cache = nil

-- Default settings
local defaults = {
  permissions_mode = "auto", -- "auto", "plan", "ask"
  update_mode = "manual", -- "auto", "manual", "prompt"
  update_check_defaults = {
    sync_commands = true,
    sync_hooks = true,
    sync_agents = false,
  },
}

-- Get the settings file path
local function get_settings_path()
  local ccasp = require("ccasp")
  local cwd = vim.fn.getcwd()
  return cwd .. "/" .. ccasp.config.settings_file
end

-- Read JSON file
local function read_json(path)
  local file = io.open(path, "r")
  if not file then
    return nil
  end

  local content = file:read("*all")
  file:close()

  if not content or content == "" then
    return nil
  end

  local ok, result = pcall(vim.fn.json_decode, content)
  if not ok then
    vim.notify("Error parsing settings: " .. tostring(result), vim.log.levels.ERROR)
    return nil
  end

  return result
end

-- Write JSON file
local function write_json(path, data)
  -- Ensure directory exists
  local dir = vim.fn.fnamemodify(path, ":h")
  vim.fn.mkdir(dir, "p")

  local file = io.open(path, "w")
  if not file then
    vim.notify("Cannot write settings file: " .. path, vim.log.levels.ERROR)
    return false
  end

  local ok, content = pcall(vim.fn.json_encode, data)
  if not ok then
    file:close()
    vim.notify("Error encoding settings: " .. tostring(content), vim.log.levels.ERROR)
    return false
  end

  -- Pretty print JSON
  content = content:gsub(",", ",\n  ")
  content = content:gsub("{", "{\n  ")
  content = content:gsub("}", "\n}")

  file:write(content)
  file:close()

  return true
end

-- Load settings from file
function M.load()
  local path = get_settings_path()
  local loaded = read_json(path)

  if loaded then
    settings_cache = vim.tbl_deep_extend("force", defaults, loaded)
  else
    settings_cache = vim.tbl_deep_extend("force", {}, defaults)
  end

  return settings_cache
end

-- Save settings to file
function M.save()
  if not settings_cache then
    return false
  end

  local path = get_settings_path()
  return write_json(path, settings_cache)
end

-- Get all settings
function M.get()
  if not settings_cache then
    M.load()
  end
  return settings_cache
end

-- Get a specific setting
function M.get_value(key)
  if not settings_cache then
    M.load()
  end
  return settings_cache[key]
end

-- Set a specific setting
function M.set(key, value)
  if not settings_cache then
    M.load()
  end

  settings_cache[key] = value
  return M.save()
end

-- Update multiple settings
function M.update(updates)
  if not settings_cache then
    M.load()
  end

  settings_cache = vim.tbl_deep_extend("force", settings_cache, updates)
  return M.save()
end

-- Reset to defaults
function M.reset()
  settings_cache = vim.tbl_deep_extend("force", {}, defaults)
  return M.save()
end

return M
