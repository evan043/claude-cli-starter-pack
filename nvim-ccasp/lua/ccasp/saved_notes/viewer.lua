-- CCASP Saved Notes - Content Viewer
-- Full-screen scrollable float showing saved session text.
-- Keys: y (copy), p (path), s (paste active), S (pick session), q/Esc (back to browser)

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

local viewer_state = {
  bufnr = nil,
  winid = nil,
  note_id = nil,
}

local function close_viewer()
  if viewer_state.winid and vim.api.nvim_win_is_valid(viewer_state.winid) then
    vim.api.nvim_win_close(viewer_state.winid, true)
  end
  viewer_state.winid = nil
  viewer_state.bufnr = nil
  viewer_state.note_id = nil
end

local function close_and_return_to_browser()
  close_viewer()
  -- Open browser synchronously so it gets focus BEFORE the WinEnter
  -- startinsert guard fires (the guard checks current_win and skips
  -- if focus has already moved away from the terminal window).
  require("ccasp.saved_notes").open_browser()
end

-- Forward declaration
local send_content_to_session

-------------------------------------------------------------------------------
-- Session Picker Modal (for S key: send content to any session in any layer)
-------------------------------------------------------------------------------

local function show_session_picker(content_lines)
  local sessions = require("ccasp.sessions")
  local layers_ok, layers = pcall(require, "ccasp.layers")

  -- Build list of all sessions: active layer (live) + inactive layers (snapshots)
  local entries = {}

  if layers_ok and layers.is_initialized() then
    local active_num = layers.get_active()

    for num = 1, 9 do
      local layer = layers.get(num)
      if layer then
        if num == active_num then
          -- Live sessions
          local all = sessions.list()
          for _, s in ipairs(all) do
            table.insert(entries, {
              label = string.format("%s > %s", layer.name, s.name),
              session_id = s.id,
              bufnr = s.bufnr,
              layer_num = num,
              is_current_layer = true,
            })
          end
        else
          -- Snapshot sessions
          local sess_data = layer.sessions_data
          if sess_data and sess_data.session_order then
            for _, id in ipairs(sess_data.session_order) do
              local s = sess_data.sessions[id]
              if s then
                table.insert(entries, {
                  label = string.format("%s > %s", layer.name, s.name or "Session"),
                  session_id = id,
                  bufnr = s.bufnr,
                  layer_num = num,
                  is_current_layer = false,
                })
              end
            end
          end
        end
      end
    end
  else
    -- No layers, just list sessions
    local all = sessions.list()
    for _, s in ipairs(all) do
      table.insert(entries, {
        label = s.name,
        session_id = s.id,
        bufnr = s.bufnr,
        layer_num = nil,
        is_current_layer = true,
      })
    end
  end

  if #entries == 0 then
    vim.notify("No sessions available", vim.log.levels.WARN)
    return
  end

  -- Build picker UI
  local width = 44
  local display_lines = {}
  local item_lines = {}

  table.insert(display_lines, "")
  table.insert(display_lines, "  Select target session:")
  table.insert(display_lines, "  " .. string.rep("─", 38))
  table.insert(display_lines, "")

  for _, entry in ipairs(entries) do
    local icon = entry.is_current_layer and nf.terminal or nf.session
    table.insert(display_lines, "  " .. icon .. " " .. entry.label)
    item_lines[#display_lines] = entry
  end
  table.insert(display_lines, "")

  local height = #display_lines
  local buf = helpers.create_buffer("ccasp://note-session-picker")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.terminal .. "  Send to Session ",
    footer = " Enter: Send │ Esc: Cancel ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true
  helpers.set_buffer_content(buf, display_lines)
  helpers.sandbox_buffer(buf)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_note_session_picker", buf)
  for i, line in ipairs(display_lines) do
    if line:match("Select target") then
      helpers.add_highlight(buf, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  " .. string.rep("─", 5)) then
      helpers.add_highlight(buf, ns, "NonText", i - 1, 0, -1)
    end
  end

  local function close_picker()
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    -- Re-focus viewer
    if viewer_state.winid and vim.api.nvim_win_is_valid(viewer_state.winid) then
      vim.api.nvim_set_current_win(viewer_state.winid)
    end
  end

  local function send_to_entry(entry)
    if not entry then return end

    -- Safety: confirm if content is large
    if #content_lines > 100 then
      close_picker()
      vim.schedule(function()
        vim.ui.input({
          prompt = string.format("Send %d lines to %s? (y/n): ", #content_lines, entry.label),
        }, function(answer)
          if answer and answer:lower() == "y" then
            send_content_to_session(entry, content_lines)
          end
          -- Re-focus viewer
          if viewer_state.winid and vim.api.nvim_win_is_valid(viewer_state.winid) then
            vim.api.nvim_set_current_win(viewer_state.winid)
          end
        end)
      end)
      return
    end

    close_picker()
    send_content_to_session(entry, content_lines)
  end

  local function execute_at_cursor()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local item = item_lines[cursor[1]]
    if item then send_to_entry(item) end
  end

  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("n", "<CR>", execute_at_cursor, opts)
  vim.keymap.set("n", "<Esc>", close_picker, opts)
  vim.keymap.set("n", "q", close_picker, opts)

  -- Navigation
  local function nav_down()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local total = vim.api.nvim_buf_line_count(buf)
    for line = cursor[1] + 1, total do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    for line = cursor[1] - 1, 1, -1 do
      if item_lines[line] then
        vim.api.nvim_win_set_cursor(win, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse and mouse.line and item_lines[mouse.line] then
      pcall(vim.api.nvim_win_set_cursor, win, { mouse.line, 0 })
      send_to_entry(item_lines[mouse.line])
    end
  end, opts)

  -- Default cursor on first item
  for line = 1, #display_lines do
    if item_lines[line] then
      vim.api.nvim_win_set_cursor(win, { line, 0 })
      break
    end
  end
end

-------------------------------------------------------------------------------
-- Send content to a terminal session
-------------------------------------------------------------------------------

-- Implementation of the forward-declared function
send_content_to_session = function(entry, content_lines)
  if not entry.bufnr or not vim.api.nvim_buf_is_valid(entry.bufnr) then
    vim.notify("Target session buffer no longer valid", vim.log.levels.WARN)
    return
  end

  local job_id = vim.b[entry.bufnr].terminal_job_id
  if not job_id or job_id <= 0 then
    vim.notify("No terminal job for target session", vim.log.levels.WARN)
    return
  end

  -- Send the file path as a single-line reference instead of dumping all content
  local storage = require("ccasp.saved_notes.storage")
  local txt_path = storage.get_content_path(viewer_state.note_id or "")
  vim.fn.chansend(job_id, txt_path)
  vim.notify("Sent note path to: " .. require("ccasp").mask_name(entry.label), vim.log.levels.INFO)
end

-------------------------------------------------------------------------------
-- Public: Open viewer
-------------------------------------------------------------------------------

--- Open the viewer for a specific note.
--- @param note_id string
function M.open(note_id)
  -- If already viewing this note, just focus it
  if viewer_state.note_id == note_id and helpers.focus_if_open(viewer_state.winid) then
    return
  end

  -- Close previous viewer if open
  close_viewer()

  local storage = require("ccasp.saved_notes.storage")
  local library = storage.load()
  local _, note = storage.find_note(library, note_id)

  if not note then
    vim.notify("Note not found", vim.log.levels.ERROR)
    helpers.restore_terminal_focus()
    return
  end

  local content_lines = storage.get_content(note_id)
  if not content_lines then
    vim.notify("Note content file not found", vim.log.levels.ERROR)
    helpers.restore_terminal_focus()
    return
  end

  -- Dimensions: near-full content area
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

  local width = math.max(40, avail_w - 4)
  local height = math.max(10, avail_h - 4)
  local row = offset_row + 2
  local col = offset_col + math.floor((avail_w - width) / 2)

  local bufnr = helpers.create_buffer("ccasp://saved-note-viewer")
  local note_name = note.name or "Untitled"
  local line_count = note.line_count or #content_lines

  local winid = helpers.create_window(bufnr, {
    width = width,
    height = height,
    row = row,
    col = col,
    border = "rounded",
    title = string.format(" %s %s (%d lines) ", nf.save, note_name, line_count),
    footer = " y: Copy │ p: Path │ s: Paste Active │ S: Pick Session │ q: Back ",
    footer_pos = "center",
  })

  viewer_state.bufnr = bufnr
  viewer_state.winid = winid
  viewer_state.note_id = note_id

  -- Set content
  helpers.set_buffer_content(bufnr, content_lines)

  -- Sandbox buffer (blocks editing), then re-enable scroll keys
  helpers.sandbox_buffer(bufnr)

  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Scroll keys (override sandbox blocks)
  vim.keymap.set("n", "j", "j", opts)
  vim.keymap.set("n", "k", "k", opts)
  vim.keymap.set("n", "<Down>", "j", opts)
  vim.keymap.set("n", "<Up>", "k", opts)
  vim.keymap.set("n", "G", "G", opts)
  vim.keymap.set("n", "gg", "gg", opts)
  vim.keymap.set("n", "<C-d>", "<C-d>", opts)
  vim.keymap.set("n", "<C-u>", "<C-u>", opts)
  vim.keymap.set("n", "<C-f>", "<C-f>", opts)
  vim.keymap.set("n", "<C-b>", "<C-b>", opts)

  -- q/Esc: close and return to browser
  vim.keymap.set("n", "q", close_and_return_to_browser, opts)
  vim.keymap.set("n", "<Esc>", close_and_return_to_browser, opts)

  -- y: copy entire content to clipboard and unnamed register
  vim.keymap.set("n", "y", function()
    local text = table.concat(content_lines, "\n")
    vim.fn.setreg("+", text)
    vim.fn.setreg('"', text)
    vim.notify(string.format("Copied %d lines to clipboard", #content_lines), vim.log.levels.INFO)
  end, opts)

  -- p: copy file path to clipboard
  vim.keymap.set("n", "p", function()
    local path = storage.get_content_path(note_id)
    vim.fn.setreg("+", path)
    vim.notify("Path copied: " .. require("ccasp").mask_path(path), vim.log.levels.INFO)
  end, opts)

  -- s: send content to active (primary) session
  vim.keymap.set("n", "s", function()
    local sessions = require("ccasp.sessions")
    local active = sessions.get_active() or sessions.get_primary()
    if not active then
      vim.notify("No active session", vim.log.levels.WARN)
      return
    end

    if not active.bufnr or not vim.api.nvim_buf_is_valid(active.bufnr) then
      vim.notify("Active session buffer not valid", vim.log.levels.WARN)
      return
    end

    local job_id = vim.b[active.bufnr].terminal_job_id
    if not job_id or job_id <= 0 then
      vim.notify("No terminal job for active session", vim.log.levels.WARN)
      return
    end

    -- Safety: for large content, send just the file path
    local path = storage.get_content_path(note_id)
    if #content_lines > 100 then
      vim.fn.chansend(job_id, path)
      vim.notify("Sent note path to: " .. require("ccasp").mask_name(active.name), vim.log.levels.INFO)
    else
      vim.fn.chansend(job_id, path)
      vim.notify("Sent note path to: " .. require("ccasp").mask_name(active.name), vim.log.levels.INFO)
    end
  end, opts)

  -- S: open session picker across all layers
  vim.keymap.set("n", "S", function()
    show_session_picker(content_lines)
  end, opts)

  -- Enable line numbers for reference
  vim.wo[winid].number = true
  vim.wo[winid].relativenumber = false
  vim.wo[winid].wrap = true

  -- Defensive focus: ensure this float has focus after all setup.
  -- The WinEnter autocmd on terminal windows schedules startinsert via vim.schedule,
  -- which can race with float creation from close_and_run_modal. Explicitly assert
  -- focus here, and again on next tick as a safety net against async focus stealing.
  vim.api.nvim_set_current_win(winid)
  vim.defer_fn(function()
    if winid and vim.api.nvim_win_is_valid(winid) then
      vim.api.nvim_set_current_win(winid)
    end
  end, 50)
end

--- Close the viewer (for external callers).
function M.close()
  close_viewer()
end

return M
