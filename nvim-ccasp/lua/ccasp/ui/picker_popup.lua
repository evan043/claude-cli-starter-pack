-- ccasp/ui/picker_popup.lua - Unified popup factory for menus and pickers
-- Consolidates duplicated popup creation logic from browser_tabs.lua

local M = {}

-- Create and show a picker/menu popup window
-- @param config table:
--   items: table of {label, action?, separator?}
--   on_select: function(item, index) callback when item selected
--   title: string (optional, for border title)
--   position: {row, col} (optional, defaults to mouse position)
--   min_width: number (optional)
--   centered: boolean (optional, center window on screen)
--   cursorline: boolean (optional, defaults to true)
-- @return { winid, bufnr } for caller to extend if needed
function M.show(config)
  local items = config.items or {}
  local on_select = config.on_select
  local title = config.title
  local position = config.position
  local min_width = config.min_width or 0
  local centered = config.centered or false
  local cursorline = config.cursorline ~= false -- default true

  -- Build lines and calculate width
  local lines = {}
  local max_width = title and (#title + 6) or 0

  for _, item in ipairs(items) do
    local line = "  " .. item.label .. "  "
    table.insert(lines, line)
    max_width = math.max(max_width, #line)
  end

  max_width = math.max(max_width, min_width)

  -- Create buffer
  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)
  vim.bo[bufnr].modifiable = false
  vim.bo[bufnr].bufhidden = "wipe"

  -- Calculate position
  local row, col
  local height = math.min(#lines, 20)

  if centered then
    -- Center on screen
    row = math.floor((vim.o.lines - height) / 2)
    col = math.floor((vim.o.columns - max_width) / 2)
  elseif position then
    -- Use provided position
    row = position.row
    col = position.col
  else
    -- Use mouse position and adjust to stay on screen
    local mouse = vim.fn.getmousepos()
    row = mouse.screenrow or 5
    col = mouse.screencol or 10

    if row + height > vim.o.lines - 2 then
      row = vim.o.lines - height - 3
    end
    if col + max_width > vim.o.columns - 2 then
      col = vim.o.columns - max_width - 2
    end
  end

  -- Create floating window
  local win_opts = {
    relative = "editor",
    row = row,
    col = col,
    width = max_width,
    height = height,
    style = "minimal",
    border = "rounded",
  }

  if title then
    win_opts.title = " " .. title .. " "
    win_opts.title_pos = "center"
  end

  local winid = vim.api.nvim_open_win(bufnr, true, win_opts)
  vim.wo[winid].cursorline = cursorline

  -- Setup keymaps
  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Close on q or Escape
  vim.keymap.set("n", "q", function()
    vim.api.nvim_win_close(winid, true)
  end, opts)

  vim.keymap.set("n", "<Esc>", function()
    vim.api.nvim_win_close(winid, true)
  end, opts)

  -- Enter to select
  vim.keymap.set("n", "<CR>", function()
    local cursor = vim.api.nvim_win_get_cursor(winid)
    local line_num = cursor[1]
    local item = items[line_num]

    vim.api.nvim_win_close(winid, true)

    if item and on_select then
      on_select(item, line_num)
    end
  end, opts)

  -- Left click to select (single-click for menu, position cursor for picker)
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse_pos = vim.fn.getmousepos()
    if mouse_pos.winid == winid and mouse_pos.line > 0 then
      if centered then
        -- For centered pickers, just move cursor
        vim.api.nvim_win_set_cursor(winid, { mouse_pos.line, 0 })
      else
        -- For mouse-positioned menus, select immediately
        local item = items[mouse_pos.line]
        vim.api.nvim_win_close(winid, true)
        if item and on_select then
          on_select(item, mouse_pos.line)
        end
      end
    else
      -- Click outside window closes it
      vim.api.nvim_win_close(winid, true)
    end
  end, opts)

  -- Double-click to select (for centered pickers)
  if centered then
    vim.keymap.set("n", "<2-LeftMouse>", function()
      local mouse_pos = vim.fn.getmousepos()
      if mouse_pos.winid == winid and mouse_pos.line > 0 then
        local item = items[mouse_pos.line]
        vim.api.nvim_win_close(winid, true)
        if item and on_select then
          on_select(item, mouse_pos.line)
        end
      end
    end, opts)
  end

  -- Highlight separators
  local ns = vim.api.nvim_create_namespace("ccasp_picker_popup")
  for i, item in ipairs(items) do
    if item.label:match("^─") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    end
  end

  return { winid = winid, bufnr = bufnr }
end

return M
