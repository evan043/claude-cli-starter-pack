-- ccasp/appshell/footer.lua - Appshell Bottom Status Bar
-- Shows mode, sync, version, and minimized windows (taskbar)

local M = {}
local icons = require("ccasp.ui.icons")

local state = {
  win = nil,
  buf = nil,
  taskbar_items = {}, -- { { title = "...", winid = ... }, ... }
}

-- Render footer content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local status = ccasp_ok and ccasp.get_status() or {
    version = "?", permissions_mode = "auto", update_mode = "manual",
    protected_count = 0, sync_status = "unknown",
  }

  local ns = vim.api.nvim_create_namespace("ccasp_footer")

  -- Line 1: Status indicators
  local perm_icon = icons.perm_mode(status.permissions_mode)
  local update_icon = icons.update_mode(status.update_mode)
  local sync_icon = status.sync_status == "synced" and icons.sync_ok or icons.sync_warn

  local terminal_ok, terminal = pcall(require, "ccasp.terminal")
  local claude_icon = (terminal_ok and terminal.is_claude_running()) and icons.claude_on or icons.claude_off

  local line1 = string.format(
    " %s %s %s %s %s %s %d %s %s Claude %s Sync: %s %s v%s",
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    icons.pipe,
    update_icon,
    status.update_mode:sub(1, 1):upper() .. status.update_mode:sub(2),
    icons.pipe,
    status.protected_count,
    icons.pipe,
    claude_icon,
    icons.pipe,
    sync_icon,
    icons.pipe,
    status.version
  )

  -- Line 2: Taskbar (minimized windows)
  local line2 = " "
  if #state.taskbar_items > 0 then
    local items = {}
    for i, item in ipairs(state.taskbar_items) do
      table.insert(items, string.format("[%d] %s %s", i, icons.minimize, item.title))
    end
    line2 = " " .. table.concat(items, "  ")
  else
    line2 = " " .. icons.minimize .. " No minimized windows"
  end

  local lines = { line1, line2 }

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)
  pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFooterLabel", 0, 0, -1)
  pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFooterTaskbar", 1, 0, -1)
end

-- Setup keymaps for footer
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  -- Number keys to restore taskbar items
  for i = 1, 9 do
    vim.keymap.set("n", tostring(i), function()
      if state.taskbar_items[i] then
        M.restore_item(i)
      end
    end, opts)
  end
end

-- Open footer
function M.open(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then return end

  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  state.win = vim.api.nvim_open_win(state.buf, false, {
    relative = "editor",
    row = bounds.row,
    col = bounds.col,
    width = bounds.width,
    height = bounds.height,
    style = "minimal",
    focusable = true,
    zindex = 50,
    border = "none",
  })

  vim.wo[state.win].winhighlight = "Normal:CcaspFooterBg,EndOfBuffer:CcaspFooterBg"
  vim.wo[state.win].wrap = false
  vim.wo[state.win].cursorline = false

  -- Sync taskbar items from taskbar module
  M.sync_taskbar()

  setup_keymaps()
  render()
end

-- Close footer
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil
end

-- Resize footer
function M.resize(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = bounds.row,
      col = bounds.col,
      width = bounds.width,
      height = bounds.height,
    })
    render()
  end
end

-- Refresh footer content
function M.refresh()
  M.sync_taskbar()
  render()
end

-- Sync minimized windows from taskbar module
function M.sync_taskbar()
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok and taskbar.get_items then
    state.taskbar_items = taskbar.get_items() or {}
  end
end

-- Add a minimized window to footer
function M.add_taskbar_item(title, winid)
  table.insert(state.taskbar_items, { title = title, winid = winid })
  render()
end

-- Restore a minimized window by index
function M.restore_item(index)
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    taskbar.restore_by_index(index)
    M.sync_taskbar()
    render()
  end
end

-- Get footer window
function M.get_win()
  return state.win
end

return M
