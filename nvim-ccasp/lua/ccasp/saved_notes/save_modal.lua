-- CCASP Saved Notes - Save Modal
-- Dual-input dialog (name + tag) for saving terminal session content.

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

--- Open the save modal for a given session.
--- @param session_id string
function M.open(session_id)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(session_id)
  if not session then
    vim.notify("Session not found", vim.log.levels.ERROR)
    helpers.restore_terminal_focus()
    return
  end

  -- Check for empty terminal
  if not session.bufnr or not vim.api.nvim_buf_is_valid(session.bufnr) then
    vim.notify("No terminal buffer to save", vim.log.levels.WARN)
    helpers.restore_terminal_focus()
    return
  end

  local term_lines = vim.api.nvim_buf_get_lines(session.bufnr, 0, -1, false)
  -- Strip trailing empty lines
  while #term_lines > 0 and term_lines[#term_lines] == "" do
    table.remove(term_lines)
  end

  if #term_lines == 0 then
    vim.notify("Terminal is empty — nothing to save", vim.log.levels.WARN)
    helpers.restore_terminal_focus()
    return
  end

  -- Modal dimensions
  local width = 50
  local height = 2
  local pos = helpers.calculate_position({ width = width, height = height })

  -- Create editable buffer with 2 lines: Name and Tag
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].buftype = "nofile"
  vim.bo[buf].bufhidden = "wipe"
  vim.bo[buf].swapfile = false

  -- Default name from session name + timestamp
  local default_name = (session.name or "session"):lower():gsub("%s+", "-")
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, {
    "Name: " .. default_name,
    "Tag:  ",
  })

  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = pos.width,
    height = height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.win_save_note .. "  Save Session Note ",
    title_pos = "center",
    footer = " Tab: Next │ Enter: Save │ Esc: Cancel ",
    footer_pos = "center",
    style = "minimal",
  })

  -- Position cursor after "Name: "
  vim.api.nvim_win_set_cursor(win, { 1, 6 })
  vim.cmd("startinsert")

  local function close_modal()
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    helpers.restore_terminal_focus()
  end

  local function extract_field(line, prefix)
    if not line then return "" end
    local value = line:match("^" .. prefix .. "%s*(.*)$")
    return vim.trim(value or "")
  end

  local function confirm()
    local buf_lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
    local name = extract_field(buf_lines[1], "Name:")
    local tag = extract_field(buf_lines[2], "Tag:")

    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end

    if name == "" then
      vim.notify("Name cannot be empty", vim.log.levels.WARN)
      helpers.restore_terminal_focus()
      return
    end

    -- Gather context
    local layer_name = ""
    local layers_ok, layers = pcall(require, "ccasp.layers")
    if layers_ok and layers.is_initialized() then
      local active_num = layers.get_active()
      local layer = layers.get(active_num)
      if layer then layer_name = layer.name end
    end

    local ccasp_ok, ccasp = pcall(require, "ccasp")
    local project_path = session.path or vim.fn.getcwd()
    local raw_name = vim.fn.fnamemodify(project_path, ":t")
    local project_name = (ccasp_ok and ccasp.mask_name) and ccasp.mask_name(raw_name) or raw_name

    -- Save via storage
    local storage = require("ccasp.saved_notes.storage")
    local entry = storage.add_note({
      name = name,
      tag = tag,
      content_lines = term_lines,
      project_path = project_path,
      project_name = project_name,
      session_name = session.name or "",
      layer_name = layer_name,
    })

    vim.notify(
      string.format("Note saved: %s (%d lines)", entry.name, entry.line_count),
      vim.log.levels.INFO
    )
    helpers.restore_terminal_focus()
  end

  -- Keymaps
  local opts = { buffer = buf, noremap = true, silent = true }

  -- Tab: move between Name and Tag lines
  vim.keymap.set("i", "<Tab>", function()
    local cursor = vim.api.nvim_win_get_cursor(win)
    if cursor[1] == 1 then
      -- Move to Tag line
      vim.api.nvim_win_set_cursor(win, { 2, 6 })
    else
      -- Move to Name line
      vim.api.nvim_win_set_cursor(win, { 1, 6 })
    end
  end, opts)

  vim.keymap.set("i", "<S-Tab>", function()
    local cursor = vim.api.nvim_win_get_cursor(win)
    if cursor[1] == 2 then
      vim.api.nvim_win_set_cursor(win, { 1, 6 })
    else
      vim.api.nvim_win_set_cursor(win, { 2, 6 })
    end
  end, opts)

  -- Enter: save
  vim.keymap.set("i", "<CR>", confirm, opts)
  vim.keymap.set("n", "<CR>", confirm, opts)

  -- Esc: cancel
  vim.keymap.set("i", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "q", close_modal, opts)

  -- Prevent cursor from moving into the "Name: " / "Tag:  " prefix
  vim.api.nvim_create_autocmd("CursorMovedI", {
    buffer = buf,
    callback = function()
      if not win or not vim.api.nvim_win_is_valid(win) then return end
      local cursor = vim.api.nvim_win_get_cursor(win)
      if cursor[2] < 6 then
        vim.api.nvim_win_set_cursor(win, { cursor[1], 6 })
      end
    end,
  })

  -- Prevent adding new lines (keep exactly 2 lines)
  vim.api.nvim_create_autocmd("TextChangedI", {
    buffer = buf,
    callback = function()
      if not buf or not vim.api.nvim_buf_is_valid(buf) then return end
      local line_count = vim.api.nvim_buf_line_count(buf)
      if line_count > 2 then
        -- Truncate back to 2 lines
        local current_lines = vim.api.nvim_buf_get_lines(buf, 0, 2, false)
        vim.api.nvim_buf_set_lines(buf, 0, -1, false, current_lines)
      end
      -- Ensure prefixes remain
      local current_lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
      if current_lines[1] and not current_lines[1]:match("^Name:") then
        vim.api.nvim_buf_set_lines(buf, 0, 1, false, { "Name: " })
        vim.api.nvim_win_set_cursor(win, { 1, 6 })
      end
      if current_lines[2] and not current_lines[2]:match("^Tag:") then
        vim.api.nvim_buf_set_lines(buf, 1, 2, false, { "Tag:  " })
        vim.api.nvim_win_set_cursor(win, { 2, 6 })
      end
    end,
  })
end

return M
