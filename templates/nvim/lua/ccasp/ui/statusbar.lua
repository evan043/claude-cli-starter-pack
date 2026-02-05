-- CCASP Statusbar Component
-- Shows CCASP status in the statusline

local M = {}

-- Get short status string for statusline
function M.get()
  local ccasp = require("ccasp")
  local status = ccasp.get_status()

  local parts = {
    "CCASP",
    "v" .. status.version,
    "Perms: " .. status.permissions_mode,
    "Updates: " .. status.update_mode,
    "Protected: " .. status.protected_count,
    "Sync: " .. (status.sync_status == "synced" and "✓" or "✗"),
  }

  return table.concat(parts, " │ ")
end

-- Get full status line for sidebar footer
function M.get_full()
  local ccasp = require("ccasp")
  local status = ccasp.get_status()

  -- Permission mode indicator with icon
  local perm_icons = {
    auto = "🤖",
    plan = "📝",
    ask = "❓",
  }
  local perm_icon = perm_icons[status.permissions_mode] or "⚙️"

  -- Update mode indicator
  local update_icons = {
    auto = "🔄",
    manual = "✋",
    prompt = "💬",
  }
  local update_icon = update_icons[status.update_mode] or "⚙️"

  -- Sync status
  local sync_icon = status.sync_status == "synced" and "✅" or "⚠️"

  return string.format(
    "CCASP v%s │ %s %s │ %s %s │ 🛡️ %d │ %s",
    status.version,
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    update_icon,
    status.update_mode:sub(1, 1):upper() .. status.update_mode:sub(2),
    status.protected_count,
    sync_icon
  )
end

-- Get minimal status (for narrow displays)
function M.get_minimal()
  local ccasp = require("ccasp")
  local status = ccasp.get_status()

  local perm_char = status.permissions_mode:sub(1, 1):upper()
  local update_char = status.update_mode:sub(1, 1):upper()
  local sync_char = status.sync_status == "synced" and "✓" or "✗"

  return string.format("[%s|%s|%d|%s]", perm_char, update_char, status.protected_count, sync_char)
end

-- Update statusbar (trigger redraw)
function M.update()
  vim.cmd("redrawstatus")
end

-- Get lualine component
function M.lualine()
  return {
    function()
      return M.get()
    end,
    cond = function()
      -- Only show when CCASP is open
      local ccasp = require("ccasp")
      return ccasp.state.sidebar_open
    end,
  }
end

-- Get lualine component (minimal version)
function M.lualine_mini()
  return {
    function()
      return M.get_minimal()
    end,
    cond = function()
      local ccasp = require("ccasp")
      return ccasp.state.sidebar_open
    end,
  }
end

-- Render status bar line for sidebar bottom
function M.render_line(width)
  local status = M.get_full()

  -- Truncate or pad to fit width
  if #status > width then
    status = status:sub(1, width - 3) .. "..."
  elseif #status < width then
    status = status .. string.rep(" ", width - #status)
  end

  return status
end

-- Get health check status
function M.health_check()
  local checks = {}

  -- Check Claude CLI
  local claude_check = vim.fn.executable("claude") == 1
  table.insert(checks, {
    name = "Claude CLI",
    status = claude_check,
    message = claude_check and "Available" or "Not found in PATH",
  })

  -- Check .claude directory
  local cwd = vim.fn.getcwd()
  local claude_dir = cwd .. "/.claude"
  local dir_check = vim.fn.isdirectory(claude_dir) == 1
  table.insert(checks, {
    name = ".claude directory",
    status = dir_check,
    message = dir_check and "Found" or "Not found - run ccasp init",
  })

  -- Check commands directory
  local cmd_dir = cwd .. "/.claude/commands"
  local cmd_check = vim.fn.isdirectory(cmd_dir) == 1
  table.insert(checks, {
    name = "Commands directory",
    status = cmd_check,
    message = cmd_check and "Found" or "Not found",
  })

  -- Check nui.nvim
  local nui_ok, _ = pcall(require, "nui.popup")
  table.insert(checks, {
    name = "nui.nvim",
    status = nui_ok,
    message = nui_ok and "Loaded" or "Not installed",
  })

  -- Check telescope
  local telescope_ok, _ = pcall(require, "telescope")
  table.insert(checks, {
    name = "telescope.nvim",
    status = telescope_ok,
    message = telescope_ok and "Loaded" or "Not installed (optional)",
  })

  -- Check toggleterm
  local toggleterm_ok, _ = pcall(require, "toggleterm")
  table.insert(checks, {
    name = "toggleterm.nvim",
    status = toggleterm_ok,
    message = toggleterm_ok and "Loaded" or "Not installed (optional)",
  })

  return checks
end

-- Format health check for display
function M.format_health_check()
  local checks = M.health_check()
  local lines = {
    "",
    "Health Check",
    string.rep("─", 38),
    "",
  }

  for _, check in ipairs(checks) do
    local icon = check.status and "✓" or "✗"
    table.insert(lines, string.format("  %s %s", icon, check.name))
    table.insert(lines, string.format("      %s", check.message))
  end

  return lines
end

return M
