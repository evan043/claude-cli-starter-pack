-- ccasp/project_config/storage.lua - JSON persistence for project configuration
-- Stores app mode + feature toggles at ~/.ccasp/project-config.json

local M = {}

local CONFIG_PATH = vim.fn.expand("~/.ccasp/project-config.json")
local CONFIG_DIR = vim.fn.expand("~/.ccasp")

function M.get_default()
  return {
    version = "1.0.0",
    app_mode = "commercial_saas",
    features = {
      compliance = true,
      multi_tenancy = true,
      rbac = true,
      billing = true,
      api_contracts = true,
      route_maps = true,
      deployment = true,
      agents = true,
      github_integration = true,
      mcp_servers = true,
      phased_dev = true,
      hooks = true,
      mobile_packaging = false,
    },
  }
end

function M.load()
  if vim.fn.filereadable(CONFIG_PATH) == 0 then
    local cfg = M.get_default()
    M.save(cfg)
    return cfg
  end
  local lines = vim.fn.readfile(CONFIG_PATH)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  if not ok or type(decoded) ~= "table" then
    return M.get_default()
  end
  -- Ensure features table exists with all keys
  if not decoded.features then
    decoded.features = M.get_default().features
  else
    local defaults = M.get_default().features
    for k, v in pairs(defaults) do
      if decoded.features[k] == nil then
        decoded.features[k] = v
      end
    end
  end
  return decoded
end

function M.save(config)
  if vim.fn.isdirectory(CONFIG_DIR) == 0 then
    vim.fn.mkdir(CONFIG_DIR, "p")
  end
  local json = vim.json.encode(config)
  vim.fn.writefile({ json }, CONFIG_PATH)
end

function M.toggle_feature(key)
  local config = M.load()
  config.features[key] = not config.features[key]
  M.save(config)
  return config.features[key]
end

function M.set_app_mode(mode)
  local config = M.load()
  config.app_mode = mode
  M.save(config)
  return config
end

return M
