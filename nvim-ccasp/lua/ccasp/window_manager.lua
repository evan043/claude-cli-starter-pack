-- ccasp/window_manager.lua - Window management for floating panels
-- Provides move, resize, and window tracking functionality

local M = {}

-- Configuration defaults
M.config = {
  move_step = 5,
  resize_step = 2,
  min_width = 20,
  min_height = 5,
  max_width_ratio = 0.9, -- Max 90% of editor width
  max_height_ratio = 0.9, -- Max 90% of editor height
  snap_threshold = 5, -- Pixels to snap to edge
  enabled = true,
}

-- Track all managed floating windows
M.windows = {}

-- Setup with user config
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
end

-- Register a floating window for management
function M.register(winid, name, icon)
  if not vim.api.nvim_win_is_valid(winid) then
    return false
  end

  M.windows[winid] = {
    name = name or "Window",
    icon = icon or "",
    registered_at = os.time(),
  }

  return true
end

-- Get editor bounds (accounts for appshell chrome if active)
local function get_editor_bounds()
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local is_appshell = ccasp_ok and ccasp.is_appshell and ccasp.is_appshell()

  if is_appshell then
    local appshell_ok, appshell = pcall(require, "ccasp.appshell")
    if appshell_ok then
      local content = appshell.get_zone_bounds("content")
      if content then
        return {
          width = content.width,
          height = content.height,
        }
      end
    end
  end

  return {
    width = vim.o.columns,
    height = vim.o.lines - vim.o.cmdheight - 1,
  }
end

-- Get current window config with safe handling
local function get_win_config(winid)
  if not vim.api.nvim_win_is_valid(winid) then
    return nil
  end

  local config = vim.api.nvim_win_get_config(winid)

  -- Handle relative positioning
  if config.relative == "" then
    return nil -- Not a floating window
  end

  -- Handle row/col which can be number or table with [false] key
  local row = type(config.row) == "table" and (config.row[false] or config.row[true] or 0) or config.row
  local col = type(config.col) == "table" and (config.col[false] or config.col[true] or 0) or config.col

  return {
    row = row,
    col = col,
    width = config.width,
    height = config.height,
    relative = config.relative,
    border = config.border,
    title = config.title,
    title_pos = config.title_pos,
    style = config.style,
    zindex = config.zindex,
  }
end

-- Move a floating window by delta
function M.move_window(winid, delta_row, delta_col)
  if not M.config.enabled then
    return false
  end

  local config = get_win_config(winid)
  if not config then
    return false
  end

  local bounds = get_editor_bounds()
  local new_row = config.row + delta_row
  local new_col = config.col + delta_col

  -- Boundary checks - keep window visible
  new_row = math.max(0, math.min(new_row, bounds.height - config.height - 1))
  new_col = math.max(0, math.min(new_col, bounds.width - config.width - 1))

  -- Apply snap to edge if close
  if new_row <= M.config.snap_threshold then
    new_row = 0
  end
  if new_col <= M.config.snap_threshold then
    new_col = 0
  end
  if new_row >= bounds.height - config.height - M.config.snap_threshold - 1 then
    new_row = bounds.height - config.height - 1
  end
  if new_col >= bounds.width - config.width - M.config.snap_threshold - 1 then
    new_col = bounds.width - config.width - 1
  end

  vim.api.nvim_win_set_config(winid, {
    relative = config.relative,
    row = new_row,
    col = new_col,
  })

  return true
end

-- Resize a floating window by delta
function M.resize_window(winid, delta_width, delta_height)
  if not M.config.enabled then
    return false
  end

  local config = get_win_config(winid)
  if not config then
    return false
  end

  local bounds = get_editor_bounds()
  local max_width = math.floor(bounds.width * M.config.max_width_ratio)
  local max_height = math.floor(bounds.height * M.config.max_height_ratio)

  local new_width = config.width + delta_width
  local new_height = config.height + delta_height

  -- Apply constraints
  new_width = math.max(M.config.min_width, math.min(new_width, max_width))
  new_height = math.max(M.config.min_height, math.min(new_height, max_height))

  -- Adjust position if window would go off screen
  local new_row = config.row
  local new_col = config.col

  if new_col + new_width > bounds.width then
    new_col = bounds.width - new_width - 1
  end
  if new_row + new_height > bounds.height then
    new_row = bounds.height - new_height - 1
  end

  vim.api.nvim_win_set_config(winid, {
    relative = config.relative,
    row = new_row,
    col = new_col,
    width = new_width,
    height = new_height,
  })

  return true
end

-- Move window to a specific position
function M.move_to(winid, row, col)
  if not M.config.enabled then
    return false
  end

  local config = get_win_config(winid)
  if not config then
    return false
  end

  local bounds = get_editor_bounds()

  -- Clamp to bounds
  row = math.max(0, math.min(row, bounds.height - config.height - 1))
  col = math.max(0, math.min(col, bounds.width - config.width - 1))

  vim.api.nvim_win_set_config(winid, {
    relative = config.relative,
    row = row,
    col = col,
  })

  return true
end

-- Center window in editor
function M.center(winid)
  local config = get_win_config(winid)
  if not config then
    return false
  end

  local bounds = get_editor_bounds()
  local row = math.floor((bounds.height - config.height) / 2)
  local col = math.floor((bounds.width - config.width) / 2)

  return M.move_to(winid, row, col)
end

-- Setup keymaps for a floating window
function M.setup_keymaps(bufnr, winid)
  local opts = { buffer = bufnr, nowait = true, silent = true }
  local step = M.config.move_step
  local resize_step = M.config.resize_step

  -- Movement keymaps (Ctrl + Arrow)
  vim.keymap.set("n", "<C-Up>", function()
    M.move_window(winid, -step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Move window up" }))

  vim.keymap.set("n", "<C-Down>", function()
    M.move_window(winid, step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Move window down" }))

  vim.keymap.set("n", "<C-Left>", function()
    M.move_window(winid, 0, -step)
  end, vim.tbl_extend("force", opts, { desc = "Move window left" }))

  vim.keymap.set("n", "<C-Right>", function()
    M.move_window(winid, 0, step)
  end, vim.tbl_extend("force", opts, { desc = "Move window right" }))

  -- Resize keymaps (Ctrl + Shift + Arrow)
  vim.keymap.set("n", "<C-S-Up>", function()
    M.resize_window(winid, 0, -resize_step)
  end, vim.tbl_extend("force", opts, { desc = "Shrink window height" }))

  vim.keymap.set("n", "<C-S-Down>", function()
    M.resize_window(winid, 0, resize_step)
  end, vim.tbl_extend("force", opts, { desc = "Grow window height" }))

  vim.keymap.set("n", "<C-S-Left>", function()
    M.resize_window(winid, -resize_step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Shrink window width" }))

  vim.keymap.set("n", "<C-S-Right>", function()
    M.resize_window(winid, resize_step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Grow window width" }))

  -- Quick position keymaps
  vim.keymap.set("n", "<C-c>", function()
    M.center(winid)
  end, vim.tbl_extend("force", opts, { desc = "Center window" }))

  -- Alternative hjkl-based keymaps (Alt + h/j/k/l for move)
  vim.keymap.set("n", "<M-k>", function()
    M.move_window(winid, -step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Move window up" }))

  vim.keymap.set("n", "<M-j>", function()
    M.move_window(winid, step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Move window down" }))

  vim.keymap.set("n", "<M-h>", function()
    M.move_window(winid, 0, -step)
  end, vim.tbl_extend("force", opts, { desc = "Move window left" }))

  vim.keymap.set("n", "<M-l>", function()
    M.move_window(winid, 0, step)
  end, vim.tbl_extend("force", opts, { desc = "Move window right" }))

  -- Alternative resize keymaps (Alt + Shift + h/j/k/l)
  vim.keymap.set("n", "<M-K>", function()
    M.resize_window(winid, 0, -resize_step)
  end, vim.tbl_extend("force", opts, { desc = "Shrink window height" }))

  vim.keymap.set("n", "<M-J>", function()
    M.resize_window(winid, 0, resize_step)
  end, vim.tbl_extend("force", opts, { desc = "Grow window height" }))

  vim.keymap.set("n", "<M-H>", function()
    M.resize_window(winid, -resize_step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Shrink window width" }))

  vim.keymap.set("n", "<M-L>", function()
    M.resize_window(winid, resize_step, 0)
  end, vim.tbl_extend("force", opts, { desc = "Grow window width" }))
end

return M
