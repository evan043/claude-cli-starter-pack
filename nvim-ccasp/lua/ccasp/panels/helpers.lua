-- ccasp/panels/helpers.lua - Shared helper functions for panel modules
-- Eliminates cross-panel duplication for buffer/window creation, keybindings, and rendering

local M = {}

-- Create a standard panel buffer
-- @param name string: Buffer name (e.g., "ccasp://control-panel")
-- @return number: Buffer handle
function M.create_buffer(name)
  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[bufnr].buftype = "nofile"
  vim.bo[bufnr].bufhidden = "wipe"
  vim.bo[bufnr].swapfile = false
  pcall(vim.api.nvim_buf_set_name, bufnr, name)
  return bufnr
end

-- Calculate centered position for a panel
-- @param config table: { width, height, position? }
-- @return table: { width, height, row, col }
function M.calculate_position(config)
  local width = config.width
  local height = config.height

  -- Get effective editor bounds, accounting for appshell chrome if active
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local is_appshell = ccasp_ok and ccasp.is_appshell and ccasp.is_appshell()
  local content_zone = nil

  if is_appshell then
    local appshell_ok, appshell = pcall(require, "ccasp.appshell")
    if appshell_ok then
      content_zone = appshell.get_zone_bounds("content")
    end
  end

  local avail_w = content_zone and content_zone.width or vim.o.columns
  local avail_h = content_zone and content_zone.height or vim.o.lines
  local offset_row = content_zone and content_zone.row or 0
  local offset_col = content_zone and content_zone.col or 0

  local row = offset_row + math.floor((avail_h - height) / 2)
  local col = offset_col + math.floor((avail_w - width) / 2)

  -- Handle side positions
  if config.position == "right" then
    col = offset_col + avail_w - width - 2
    row = offset_row + 2
    height = avail_h - 4
  elseif config.position == "left" then
    col = offset_col + 2
    row = offset_row + 2
    height = avail_h - 4
  end

  return {
    width = width,
    height = height,
    row = row,
    col = col,
  }
end

-- Create a floating window for a panel
-- @param bufnr number: Buffer handle
-- @param config table: { width, height, row, col, border, title, title_pos?, footer?, footer_pos? }
-- @return number: Window handle
function M.create_window(bufnr, config)
  local win_config = {
    relative = "editor",
    width = config.width,
    height = config.height,
    row = config.row,
    col = config.col,
    style = "minimal",
    border = config.border or "rounded",
    title = config.title or "",
    title_pos = config.title_pos or "center",
  }

  -- Optional footer
  if config.footer then
    win_config.footer = config.footer
    win_config.footer_pos = config.footer_pos or "center"
  end

  return vim.api.nvim_open_win(bufnr, true, win_config)
end

-- Set buffer content (handles modifiable toggle)
-- @param bufnr number: Buffer handle
-- @param lines table: Array of lines to set
function M.set_buffer_content(bufnr, lines)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then
    return
  end

  vim.bo[bufnr].modifiable = true
  vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)
  vim.bo[bufnr].modifiable = false
end

-- Sandbox a buffer to prevent Neovim behavior from leaking through CCASP UI.
-- Blocks all editing keys, mode changes, and command-line access as silent no-ops.
-- MUST be called BEFORE panel-specific keymaps so panels can override specific keys.
-- @param bufnr number: Buffer handle
function M.sandbox_buffer(bufnr)
  local nop = function() end
  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Block insert mode entry
  for _, key in ipairs({ "i", "I", "a", "A", "o", "O" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block change/substitute/replace
  for _, key in ipairs({ "c", "C", "s", "S", "r", "R" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block delete
  for _, key in ipairs({ "d", "D", "x", "X" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block paste
  for _, key in ipairs({ "p", "P" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block undo/redo, repeat, join, case toggle
  for _, key in ipairs({ "u", "<C-r>", ".", "J", "~" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block visual mode
  for _, key in ipairs({ "v", "V", "<C-v>" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block command-line mode (no : access in CCASP panels)
  vim.keymap.set("n", ":", nop, opts)

  -- Block macro record/execute
  for _, key in ipairs({ "Q", "@" }) do
    vim.keymap.set("n", key, nop, opts)
  end

  -- Block suspend
  vim.keymap.set("n", "<C-z>", nop, opts)

  -- Safety net: if insert mode is somehow entered, immediately exit
  vim.api.nvim_create_autocmd("InsertEnter", {
    buffer = bufnr,
    callback = function()
      vim.cmd("stopinsert")
    end,
  })
end

-- Restore focus to the active terminal session after closing a panel.
-- Tries sessions (appshell), then classic terminal, as fallback.
function M.restore_terminal_focus()
  vim.schedule(function()
    -- Check if a floating window grabbed focus already (another panel opening)
    local current_win = vim.api.nvim_get_current_win()
    local win_config = vim.api.nvim_win_get_config(current_win)
    if win_config.relative and win_config.relative ~= "" then
      return -- Another floating panel has focus, don't steal it
    end

    -- Try sessions module (appshell layout)
    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local primary = sessions.get_primary()
      if primary and primary.winid and vim.api.nvim_win_is_valid(primary.winid) then
        vim.api.nvim_set_current_win(primary.winid)
        -- Ensure the terminal buffer is still displayed in this window
        -- (it may have been detached during panel open/close cycles)
        if primary.bufnr and vim.api.nvim_buf_is_valid(primary.bufnr) then
          local current_buf = vim.api.nvim_win_get_buf(primary.winid)
          if current_buf ~= primary.bufnr then
            vim.api.nvim_win_set_buf(primary.winid, primary.bufnr)
          end
        end
        -- Scroll to bottom so terminal output is visible, then enter terminal mode
        vim.cmd("normal! G")
        vim.cmd("startinsert")
        return
      end
      -- Fallback: first available session
      local all = sessions.list()
      if #all > 0 then
        sessions.focus(all[1].id)
        return
      end
    end

    -- Try classic terminal module
    local terminal_ok, terminal = pcall(require, "ccasp.terminal")
    if terminal_ok and terminal.focus then
      terminal.focus()
    end
  end)
end

-- Standard close function for panels
-- @param state table: Panel state with winid, bufnr fields
function M.close_panel(state)
  if state.winid and vim.api.nvim_win_is_valid(state.winid) then
    vim.api.nvim_win_close(state.winid, true)
  end
  state.winid = nil
  state.bufnr = nil
  if state.is_open ~= nil then
    state.is_open = false
  end

  -- Return focus to the terminal
  M.restore_terminal_focus()
end

-- Setup standard panel keybindings (q/Esc to close)
-- @param bufnr number: Buffer handle
-- @param close_fn function: Function to call on close
-- @return table: opts for additional keymaps
function M.setup_close_keymaps(bufnr, close_fn)
  local opts = { buffer = bufnr, nowait = true }
  vim.keymap.set("n", "q", close_fn, opts)
  vim.keymap.set("n", "<Esc>", close_fn, opts)
  return opts
end

-- Setup window manager integration (move/resize keymaps)
-- @param bufnr number: Buffer handle
-- @param winid number: Window handle
-- @param title string: Panel title for window manager
function M.setup_window_manager(bufnr, winid, title)
  local wm_ok, window_manager = pcall(require, "ccasp.window_manager")
  if wm_ok and winid then
    window_manager.register(winid, title, "")
    window_manager.setup_keymaps(bufnr, winid)
  end
end

-- Setup taskbar minimize functionality
-- @param bufnr number: Buffer handle
-- @param winid number: Window handle
-- @param title string: Panel title for taskbar
-- @param state table: Panel state to update on minimize
function M.setup_minimize(bufnr, winid, title, state)
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    local opts = { buffer = bufnr, nowait = true }
    vim.keymap.set("n", "_", function()
      taskbar.minimize(winid, title, "")
      state.winid = nil
      state.bufnr = nil
      if state.is_open ~= nil then
        state.is_open = false
      end
      -- Return focus to terminal after minimize
      M.restore_terminal_focus()
    end, opts)
  end
end

-- Complete panel initialization (sandbox + window manager + minimize + close)
-- Sandbox is applied FIRST so panel-specific keymaps can override individual keys.
-- @param bufnr number: Buffer handle
-- @param winid number: Window handle
-- @param title string: Panel title
-- @param state table: Panel state
-- @param close_fn function: Close function
-- @return table: opts for additional keymaps
function M.setup_standard_keymaps(bufnr, winid, title, state, close_fn)
  M.sandbox_buffer(bufnr)
  M.setup_window_manager(bufnr, winid, title)
  M.setup_minimize(bufnr, winid, title, state)
  return M.setup_close_keymaps(bufnr, close_fn)
end

-- Create namespace and clear for highlights
-- @param name string: Namespace name
-- @param bufnr number: Buffer handle
-- @return number: Namespace id
function M.prepare_highlights(name, bufnr)
  local ns = vim.api.nvim_create_namespace(name)
  vim.api.nvim_buf_clear_namespace(bufnr, ns, 0, -1)
  return ns
end

-- Add highlight to buffer
-- @param bufnr number: Buffer handle
-- @param ns number: Namespace id
-- @param hl_group string: Highlight group
-- @param line number: Line number (0-indexed)
-- @param col_start number: Start column
-- @param col_end number: End column
function M.add_highlight(bufnr, ns, hl_group, line, col_start, col_end)
  vim.api.nvim_buf_add_highlight(bufnr, ns, hl_group, line, col_start, col_end)
end

-- Highlight all keybinding patterns [x] in lines
-- @param bufnr number: Buffer handle
-- @param ns number: Namespace id
-- @param lines table: Array of lines
function M.highlight_keybindings(bufnr, ns, lines)
  for i, line in ipairs(lines) do
    for s, e in line:gmatch("()%[%w+%]()") do
      M.add_highlight(bufnr, ns, "Special", i - 1, s - 1, e - 1)
    end
  end
end

-- Render a standard panel header
-- @param title string: Header title
-- @param width number: Width of header box
-- @return table: Array of header lines
function M.render_header(title, width)
  local lines = {}
  local padding = math.floor((width - #title - 2) / 2)
  local title_line = "│" .. string.rep(" ", padding) .. title .. string.rep(" ", width - padding - #title - 2) .. "│"

  table.insert(lines, "")
  table.insert(lines, "  ╭" .. string.rep("─", width - 2) .. "╮")
  table.insert(lines, "  " .. title_line)
  table.insert(lines, "  ╰" .. string.rep("─", width - 2) .. "╯")
  table.insert(lines, "")

  return lines
end

-- Check if window is already open and focus it
-- @param winid number: Window handle
-- @return boolean: true if focused existing window, false otherwise
function M.focus_if_open(winid)
  if winid and vim.api.nvim_win_is_valid(winid) then
    vim.api.nvim_set_current_win(winid)
    return true
  end
  return false
end

return M
