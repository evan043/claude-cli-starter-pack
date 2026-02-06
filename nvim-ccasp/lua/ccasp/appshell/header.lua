-- ccasp/appshell/header.lua - Appshell Top Navbar
-- Renders project name, session tabs, and status indicators via tabline

local M = {}
local icons = require("ccasp.ui.icons")

local state = {
  enabled = false,
}

-- Open header (sets up tabline rendering)
function M.open(bounds)
  state.enabled = true
  vim.o.showtabline = 2
  vim.o.tabline = "%!v:lua.require('ccasp.appshell.header').render()"
end

-- Close header
function M.close()
  state.enabled = false
  -- Restore default tabline behavior
  vim.o.showtabline = 0
  vim.o.tabline = ""
end

-- Resize (tabline auto-adjusts to width, just re-render)
function M.resize(bounds)
  if state.enabled then
    M.refresh()
  end
end

-- Force refresh
function M.refresh()
  if state.enabled then
    vim.cmd("redrawtabline")
  end
end

-- Build session tab strip
local function get_session_tabs()
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if not sessions_ok then return "" end

  local all = sessions.list()
  if #all == 0 then return "" end

  local parts = {}
  local current_win = vim.api.nvim_get_current_win()

  for i, session in ipairs(all) do
    local is_active = session.winid == current_win
    local status_icon = session.claude_running and icons.claude_on or icons.claude_off
    local primary = session.is_primary and (" " .. icons.primary) or ""

    if is_active then
      table.insert(parts, string.format(
        "%%#CcaspHeaderTabActive# %s %s%s %%*",
        status_icon, session.name, primary
      ))
    else
      table.insert(parts, string.format(
        "%%#CcaspHeaderTab# %s %s%s %%*",
        status_icon, session.name, primary
      ))
    end
  end

  return table.concat(parts, "")
end

-- Build status indicators
local function get_status_indicators()
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  if not ccasp_ok then return "" end

  local status = ccasp.get_status()
  local perm_icon = icons.perm_mode(status.permissions_mode)
  local sync_icon = status.sync_status == "synced" and icons.sync_ok or icons.sync_warn

  return string.format(
    "%%#CcaspFooterLabel# %s %s %%*%%#CcaspFooterSep#%s%%*%%#CcaspFooterLabel# %s %%*%%#CcaspFooterSep#%s%%*%%#CcaspFooterValue# v%s %%*",
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    icons.pipe,
    sync_icon,
    icons.pipe,
    status.version
  )
end

-- Render the tabline (called by vim via tabline option)
function M.render()
  if not state.enabled then
    return ""
  end

  local parts = {}

  -- Left: CCASP logo + project name
  local project_name = vim.fn.fnamemodify(vim.fn.getcwd(), ":t")
  table.insert(parts, string.format(
    "%%#CcaspHeaderTitle# %s %s %%*",
    icons.ccasp, project_name
  ))

  -- Separator
  table.insert(parts, "%#CcaspFooterSep#" .. icons.pipe .. "%*")

  -- Center: Session tabs
  local tabs = get_session_tabs()
  if tabs ~= "" then
    table.insert(parts, tabs)
  else
    table.insert(parts, "%#CcaspHeaderTab# No sessions %*")
  end

  -- Right-align: Status indicators
  table.insert(parts, "%=")
  table.insert(parts, get_status_indicators())
  table.insert(parts, " ")

  return table.concat(parts, "")
end

return M
