-- ccasp/statusline.lua - Statusline components for lualine and other statuslines
local M = {}

-- Cache for performance
M.cache = {
  token_usage = nil,
  token_usage_time = 0,
  agent_status = nil,
  agent_status_time = 0,
  version = nil,
  version_time = 0,
}

-- Cache TTL in seconds
M.cache_ttl = 5

-- Get dependencies
local function get_config()
  return require("ccasp.config")
end

local function get_agents()
  return require("ccasp.agents")
end

-- Check if cache is valid
local function cache_valid(key)
  return M.cache[key] ~= nil and (os.time() - M.cache[key .. "_time"]) < M.cache_ttl
end

-- Full statusline component (combines all info)
function M.component()
  local parts = {}

  -- Version
  local version = M.get_version()
  if version then
    table.insert(parts, version)
  end

  -- Token usage
  local tokens = M.get_token_usage()
  if tokens then
    table.insert(parts, tokens)
  end

  -- Agent status
  local agents = M.get_agent_status()
  if agents then
    table.insert(parts, agents)
  end

  if #parts == 0 then
    return ""
  end

  return table.concat(parts, " │ ")
end

-- Version component
function M.get_version()
  if not cache_valid("version") then
    local config = get_config()
    if not config.has_claude_dir() then
      M.cache.version = nil
      return nil
    end

    local state = config.load_state()
    if state.updateAvailable then
      M.cache.version = "⬆️ " .. (state.latestVersion or "update")
    elseif state.currentVersion then
      M.cache.version = "v" .. state.currentVersion
    else
      M.cache.version = nil
    end
    M.cache.version_time = os.time()
  end

  return M.cache.version
end

-- Token usage component
function M.get_token_usage()
  if not cache_valid("token_usage") then
    local config = get_config()
    local usage = config.get_token_usage()

    if usage then
      local used = usage.used or 0
      local budget = usage.budget or 200000
      local pct = math.floor((used / budget) * 100)

      local icon
      if pct > 90 then
        icon = "🔴"
      elseif pct > 75 then
        icon = "🟡"
      else
        icon = "🟢"
      end

      M.cache.token_usage = string.format("%s %d%%", icon, pct)
    else
      M.cache.token_usage = nil
    end
    M.cache.token_usage_time = os.time()
  end

  return M.cache.token_usage
end

-- Agent status component
function M.get_agent_status()
  if not cache_valid("agent_status") then
    local agents = get_agents()
    local status = agents.get_status()

    if status.total > 0 then
      M.cache.agent_status = string.format("🤖 %d/%d", status.running, status.total)
    else
      M.cache.agent_status = nil
    end
    M.cache.agent_status_time = os.time()
  end

  return M.cache.agent_status
end

-- Individual components for lualine sections

-- Token usage with color
function M.lualine_tokens()
  local config = get_config()
  local usage = config.get_token_usage()

  if not usage then
    return ""
  end

  local used = usage.used or 0
  local budget = usage.budget or 200000
  local pct = math.floor((used / budget) * 100)

  return string.format("%d%%", pct)
end

-- Token usage color function
function M.lualine_tokens_color()
  local config = get_config()
  local usage = config.get_token_usage()

  if not usage then
    return { fg = "#888888" }
  end

  local pct = math.floor(((usage.used or 0) / (usage.budget or 200000)) * 100)

  if pct > 90 then
    return { fg = "#ff6b6b" } -- Red
  elseif pct > 75 then
    return { fg = "#ffd93d" } -- Yellow
  else
    return { fg = "#6bcb77" } -- Green
  end
end

-- Agent count
function M.lualine_agents()
  local agents = get_agents()
  local status = agents.get_status()

  if status.total == 0 then
    return ""
  end

  return string.format("🤖 %d", status.running)
end

-- CCASP indicator (shows if project has .claude dir)
function M.lualine_indicator()
  local config = get_config()
  if config.has_claude_dir() then
    return "⚡"
  end
  return ""
end

-- Condition: only show if .claude exists
function M.has_ccasp()
  local config = get_config()
  return config.has_claude_dir()
end

-- Clear cache (call when config changes)
function M.clear_cache()
  M.cache = {
    token_usage = nil,
    token_usage_time = 0,
    agent_status = nil,
    agent_status_time = 0,
    version = nil,
    version_time = 0,
  }
end

-- Setup auto-clear on config changes
function M.setup()
  vim.api.nvim_create_autocmd("User", {
    pattern = "CcaspConfigReload",
    callback = M.clear_cache,
  })
end

-- Lualine configuration helper
-- Returns a table ready to use in lualine sections
function M.lualine_config()
  return {
    -- Full component
    {
      M.component,
      cond = M.has_ccasp,
    },
    -- Or individual components:
    -- {
    --   M.lualine_indicator,
    --   cond = M.has_ccasp,
    -- },
    -- {
    --   M.lualine_tokens,
    --   color = M.lualine_tokens_color,
    --   cond = M.has_ccasp,
    -- },
    -- {
    --   M.lualine_agents,
    --   cond = M.has_ccasp,
    -- },
  }
end

return M
