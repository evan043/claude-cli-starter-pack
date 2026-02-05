-- ccasp/drag.lua - Mouse drag support for floating windows
-- Enables click-and-drag repositioning of floating panels

local M = {}

-- Configuration
M.config = {
  enabled = true,
  title_height = 2, -- Rows considered as "title bar" for drag detection
  visual_feedback = true, -- Change border color during drag
  drag_highlight = "CursorLine", -- Highlight group during drag
}

-- Drag state
M.state = {
  active = false,
  winid = nil,
  start_mouse = nil,
  start_row = nil,
  start_col = nil,
  key_handler_id = nil,
}

-- Setup with user config
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
end

-- Check if Neovim version supports mouse tracking
local function check_mouse_support()
  -- Mouse drag events require Neovim 0.10+
  local version = vim.version()
  if version.major < 0 or (version.major == 0 and version.minor < 10) then
    return false
  end
  return true
end

-- Get mouse position
local function get_mouse_pos()
  local ok, pos = pcall(vim.fn.getmousepos)
  if not ok then
    return nil
  end
  return {
    screenrow = pos.screenrow,
    screencol = pos.screencol,
    winid = pos.winid,
    winrow = pos.winrow,
    wincol = pos.wincol,
  }
end

-- Check if click is in title bar area
local function is_in_title_bar(winid, winrow)
  -- Title bar is the first N rows of the window
  return winrow <= M.config.title_height
end

-- Start dragging a window
function M.start_drag(winid)
  if not M.config.enabled then
    return false
  end

  if not check_mouse_support() then
    vim.notify("CCASP: Mouse drag requires Neovim 0.10+", vim.log.levels.WARN)
    return false
  end

  if not vim.api.nvim_win_is_valid(winid) then
    return false
  end

  local config = vim.api.nvim_win_get_config(winid)
  if config.relative == "" then
    return false -- Not a floating window
  end

  local mouse = get_mouse_pos()
  if not mouse then
    return false
  end

  -- Store initial state
  M.state.active = true
  M.state.winid = winid
  M.state.start_mouse = mouse
  -- Handle row/col which can be number or table with [false] key
  M.state.start_row = type(config.row) == "table" and (config.row[false] or config.row[true] or 0) or config.row
  M.state.start_col = type(config.col) == "table" and (config.col[false] or config.col[true] or 0) or config.col

  -- Visual feedback - highlight border
  if M.config.visual_feedback then
    vim.wo[winid].winhl = "FloatBorder:CursorLine"
  end

  return true
end

-- Update window position during drag
function M.update_drag()
  if not M.state.active or not M.state.winid then
    return false
  end

  if not vim.api.nvim_win_is_valid(M.state.winid) then
    M.stop_drag()
    return false
  end

  local mouse = get_mouse_pos()
  if not mouse then
    return false
  end

  -- Calculate delta
  local delta_row = mouse.screenrow - M.state.start_mouse.screenrow
  local delta_col = mouse.screencol - M.state.start_mouse.screencol

  -- Calculate new position
  local new_row = M.state.start_row + delta_row
  local new_col = M.state.start_col + delta_col

  -- Get editor bounds
  local max_row = vim.o.lines - vim.o.cmdheight - 1
  local max_col = vim.o.columns

  -- Get window size
  local config = vim.api.nvim_win_get_config(M.state.winid)
  local width = config.width
  local height = config.height

  -- Clamp to bounds
  new_row = math.max(0, math.min(new_row, max_row - height - 1))
  new_col = math.max(0, math.min(new_col, max_col - width - 1))

  -- Update window position
  vim.api.nvim_win_set_config(M.state.winid, {
    relative = config.relative,
    row = new_row,
    col = new_col,
  })

  return true
end

-- Stop dragging
function M.stop_drag()
  if M.state.winid and vim.api.nvim_win_is_valid(M.state.winid) then
    -- Remove visual feedback
    if M.config.visual_feedback then
      vim.wo[M.state.winid].winhl = ""
    end
  end

  -- Clear state
  M.state.active = false
  M.state.winid = nil
  M.state.start_mouse = nil
  M.state.start_row = nil
  M.state.start_col = nil

  -- Remove key handler
  if M.state.key_handler_id then
    vim.on_key(nil, M.state.key_handler_id)
    M.state.key_handler_id = nil
  end
end

-- Enable drag support for a floating window
function M.enable_for_window(bufnr, winid)
  if not M.config.enabled then
    return false
  end

  if not check_mouse_support() then
    return false
  end

  local opts = { buffer = bufnr, silent = true }

  -- Handle left mouse button press in title area
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = get_mouse_pos()
    if not mouse then
      -- Fall through to default behavior (position cursor at click)
      local mouse_pos = vim.fn.getmousepos()
      if mouse_pos.line > 0 then
        pcall(vim.api.nvim_win_set_cursor, 0, { mouse_pos.line, math.max(0, mouse_pos.column - 1) })
      end
      return
    end

    -- Check if click is on our window's title bar
    if mouse.winid == winid and is_in_title_bar(winid, mouse.winrow) then
      M.start_drag(winid)
    else
      -- Normal click behavior
      vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<LeftMouse>", true, false, true), "n", false)
    end
  end, opts)

  -- Handle drag event
  vim.keymap.set("n", "<LeftDrag>", function()
    if M.state.active then
      M.update_drag()
    end
  end, opts)

  -- Handle mouse release
  vim.keymap.set("n", "<LeftRelease>", function()
    if M.state.active then
      M.stop_drag()
    end
  end, opts)

  return true
end

-- Check if currently dragging
function M.is_dragging()
  return M.state.active
end

-- Get drag state
function M.get_state()
  return {
    active = M.state.active,
    winid = M.state.winid,
  }
end

return M
