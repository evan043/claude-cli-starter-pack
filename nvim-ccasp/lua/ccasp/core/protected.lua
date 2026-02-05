-- CCASP Protected Commands Module
-- Manages user-customized commands and assets that are safe from auto-updates

local M = {}

-- Protected commands cache
local protected_cache = nil

-- Protected assets cache (agents, hooks, skills)
local protected_assets = {
  agents = {},
  hooks = {},
  skills = {},
}

-- Get protected file path
local function get_protected_path()
  local ccasp = require("ccasp")
  local cwd = vim.fn.getcwd()
  return cwd .. "/" .. ccasp.config.protected_file
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
    return nil
  end

  return result
end

-- Write JSON file
local function write_json(path, data)
  local dir = vim.fn.fnamemodify(path, ":h")
  vim.fn.mkdir(dir, "p")

  local file = io.open(path, "w")
  if not file then
    return false
  end

  local ok, content = pcall(vim.fn.json_encode, data)
  if not ok then
    file:close()
    return false
  end

  file:write(content)
  file:close()

  return true
end

-- Load protected list
function M.load()
  local path = get_protected_path()
  local loaded = read_json(path)

  if loaded then
    -- Load commands (backward compatible - simple array)
    if loaded.commands then
      protected_cache = loaded.commands
    else
      protected_cache = {}
    end

    -- Load assets (new extended format)
    if loaded.agents then
      protected_assets.agents = loaded.agents
    else
      protected_assets.agents = {}
    end

    if loaded.hooks then
      protected_assets.hooks = loaded.hooks
    else
      protected_assets.hooks = {}
    end

    if loaded.skills then
      protected_assets.skills = loaded.skills
    else
      protected_assets.skills = {}
    end
  else
    protected_cache = {}
    protected_assets = {
      agents = {},
      hooks = {},
      skills = {},
    }
  end

  return protected_cache
end

-- Save protected list
function M.save()
  if not protected_cache then
    protected_cache = {}
  end

  local path = get_protected_path()
  return write_json(path, {
    commands = protected_cache,
    agents = protected_assets.agents,
    hooks = protected_assets.hooks,
    skills = protected_assets.skills,
    updated_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),
  })
end

-- List all protected commands
function M.list()
  if not protected_cache then
    M.load()
  end
  return protected_cache
end

-- Check if a command is protected
function M.is_protected(cmd_name)
  if not protected_cache then
    M.load()
  end

  for _, name in ipairs(protected_cache) do
    if name == cmd_name then
      return true
    end
  end

  return false
end

-- Add a command to protected list
function M.add(cmd_name)
  if not protected_cache then
    M.load()
  end

  -- Check if already protected
  if M.is_protected(cmd_name) then
    return false
  end

  table.insert(protected_cache, cmd_name)
  table.sort(protected_cache)

  return M.save()
end

-- Remove a command from protected list
function M.remove(cmd_name)
  if not protected_cache then
    M.load()
  end

  for i, name in ipairs(protected_cache) do
    if name == cmd_name then
      table.remove(protected_cache, i)
      return M.save()
    end
  end

  return false
end

-- Toggle protection for a command
function M.toggle(cmd_name)
  if M.is_protected(cmd_name) then
    return M.remove(cmd_name)
  else
    return M.add(cmd_name)
  end
end

-- ============================================
-- Asset Protection (Agents, Hooks, Skills)
-- ============================================

-- Check if an asset is marked for deletion
-- Returns: nil (not deleted), "skip" (temporary), "exclude" (permanent)
function M.get_asset_deletion_mode(asset_type, name)
  if not protected_assets[asset_type] then
    M.load()
  end

  local assets = protected_assets[asset_type] or {}
  for _, asset in ipairs(assets) do
    if asset.name == name then
      return asset.mode
    end
  end

  return nil
end

-- Check if asset is temporarily deleted (skip mode)
function M.is_asset_skipped(asset_type, name)
  return M.get_asset_deletion_mode(asset_type, name) == "skip"
end

-- Check if asset is permanently deleted (exclude mode)
function M.is_asset_excluded(asset_type, name)
  return M.get_asset_deletion_mode(asset_type, name) == "exclude"
end

-- Add asset to deletion tracking
-- mode: "skip" (temporary) or "exclude" (permanent)
function M.add_deleted_asset(asset_type, name, mode)
  if not protected_assets[asset_type] then
    M.load()
  end

  -- Check if already tracked
  for i, asset in ipairs(protected_assets[asset_type]) do
    if asset.name == name then
      -- Update existing entry
      protected_assets[asset_type][i] = {
        name = name,
        mode = mode,
        deleted_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),
      }
      return M.save()
    end
  end

  -- Add new entry
  table.insert(protected_assets[asset_type], {
    name = name,
    mode = mode,
    deleted_at = os.date("!%Y-%m-%dT%H:%M:%SZ"),
  })

  return M.save()
end

-- Remove asset from deletion tracking (restore it)
function M.restore_asset(asset_type, name)
  if not protected_assets[asset_type] then
    M.load()
  end

  for i, asset in ipairs(protected_assets[asset_type]) do
    if asset.name == name then
      table.remove(protected_assets[asset_type], i)
      return M.save()
    end
  end

  return false
end

-- List all deleted assets of a type
function M.list_deleted_assets(asset_type)
  if not protected_assets[asset_type] then
    M.load()
  end

  return protected_assets[asset_type] or {}
end

-- List all excluded assets (permanent deletions)
function M.list_excluded_assets(asset_type)
  local deleted = M.list_deleted_assets(asset_type)
  local excluded = {}

  for _, asset in ipairs(deleted) do
    if asset.mode == "exclude" then
      table.insert(excluded, asset)
    end
  end

  return excluded
end

-- List all skipped assets (temporary deletions)
function M.list_skipped_assets(asset_type)
  local deleted = M.list_deleted_assets(asset_type)
  local skipped = {}

  for _, asset in ipairs(deleted) do
    if asset.mode == "skip" then
      table.insert(skipped, asset)
    end
  end

  return skipped
end

-- Get diff between protected command and template
function M.get_diff(cmd_name)
  local commands = require("ccasp.core.commands")
  local cmd = commands.get(cmd_name)

  if not cmd then
    return nil, "Command not found"
  end

  -- Read local version
  local local_file = io.open(cmd.path, "r")
  if not local_file then
    return nil, "Cannot read local file"
  end
  local local_content = local_file:read("*all")
  local_file:close()

  -- Try to read template version
  -- This would need to know where templates are stored
  local template_path = vim.fn.fnamemodify(cmd.path, ":h:h:h")
    .. "/node_modules/claude-cli-advanced-starter-pack/templates/commands/"
    .. cmd_name
    .. ".template.md"

  local template_file = io.open(template_path, "r")
  if not template_file then
    return nil, "Template not found"
  end
  local template_content = template_file:read("*all")
  template_file:close()

  -- Use vim's diff functionality
  local diff = vim.diff(template_content, local_content, {
    algorithm = "histogram",
    ctxlen = 3,
  })

  return diff, nil
end

return M
