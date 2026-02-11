-- CCASP Saved Notes - Browser Panel
-- CRUD browser with search/filter for saved session notes.
-- Pattern: repo_launcher/ui.lua browser + panels/commands.lua search

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

local browser_state = {
  bufnr = nil,
  winid = nil,
  item_lines = {},
  search_query = "",
  search_active = false,
}

-------------------------------------------------------------------------------
-- Utility: relative time display (same pattern as repo_launcher/ui.lua)
-------------------------------------------------------------------------------

local function relative_time(iso_string)
  if not iso_string then return "" end

  local y, mo, d, h, mi, s = iso_string:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
  if not y then return "" end

  local then_time = os.time({
    year = tonumber(y), month = tonumber(mo), day = tonumber(d),
    hour = tonumber(h), min = tonumber(mi), sec = tonumber(s),
  })
  local now_time = os.time(os.date("!*t"))
  local diff = now_time - then_time

  if diff < 0 then return "just now" end
  if diff < 60 then return "just now" end
  if diff < 3600 then return math.floor(diff / 60) .. "m ago" end
  if diff < 86400 then return math.floor(diff / 3600) .. "h ago" end
  if diff < 604800 then return math.floor(diff / 86400) .. "d ago" end
  return math.floor(diff / 604800) .. "w ago"
end

-------------------------------------------------------------------------------
-- Close helpers
-------------------------------------------------------------------------------

local function close_browser()
  if browser_state.winid and vim.api.nvim_win_is_valid(browser_state.winid) then
    vim.api.nvim_win_close(browser_state.winid, true)
  end
  browser_state.winid = nil
  browser_state.bufnr = nil
  browser_state.item_lines = {}
end

local function close_browser_and_restore()
  close_browser()
  helpers.restore_terminal_focus()
end

-------------------------------------------------------------------------------
-- Navigation
-------------------------------------------------------------------------------

local function navigate(direction)
  if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then
    return
  end
  local cursor = vim.api.nvim_win_get_cursor(browser_state.winid)
  local line = cursor[1]
  local total = vim.api.nvim_buf_line_count(browser_state.bufnr)

  local next_line = line + direction
  while next_line >= 1 and next_line <= total do
    if browser_state.item_lines[next_line] then
      vim.api.nvim_win_set_cursor(browser_state.winid, { next_line, 2 })
      return
    end
    next_line = next_line + direction
  end
end

local function move_to_first_item()
  if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then
    return
  end
  local total = vim.api.nvim_buf_line_count(browser_state.bufnr)
  for i = 1, total do
    if browser_state.item_lines[i] then
      vim.api.nvim_win_set_cursor(browser_state.winid, { i, 2 })
      return
    end
  end
end

-------------------------------------------------------------------------------
-- Rendering
-------------------------------------------------------------------------------

local function render()
  local bufnr = browser_state.bufnr
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  local storage = require("ccasp.saved_notes.storage")
  local library = storage.load()
  local all_notes = library.notes or {}

  -- Filter by search query
  local notes = all_notes
  if browser_state.search_active and browser_state.search_query ~= "" then
    local query = browser_state.search_query:lower()
    notes = {}
    for _, note in ipairs(all_notes) do
      local name_match = (note.name or ""):lower():find(query, 1, true)
      local tag_match = (note.tag or ""):lower():find(query, 1, true)
      local project_match = (note.project_name or ""):lower():find(query, 1, true)
      if name_match or tag_match or project_match then
        table.insert(notes, note)
      end
    end
  end

  local lines = {}
  browser_state.item_lines = {}

  -- Header
  table.insert(lines, "")
  if browser_state.search_active and browser_state.search_query ~= "" then
    table.insert(lines, string.format(
      "  %s Search: %s  (%d results)", nf.search, browser_state.search_query, #notes
    ))
  else
    table.insert(lines, string.format("  %s Saved Notes (%d)", nf.save, #notes))
  end
  table.insert(lines, "  " .. string.rep("─", 54))
  table.insert(lines, "")

  if #notes == 0 then
    if browser_state.search_active then
      table.insert(lines, "  No matching notes found")
    else
      table.insert(lines, "  No saved notes yet")
      table.insert(lines, "  Use the " .. nf.win_save_note .. " button in the titlebar to save")
    end
  else
    for _, note in ipairs(notes) do
      -- Line 1: name + relative time
      local time_str = relative_time(note.saved_at)
      local name_line = string.format("  %s %s", nf.save, note.name or "Untitled")
      -- Right-align time
      local pad = math.max(1, 56 - vim.fn.strdisplaywidth(name_line) - #time_str)
      name_line = name_line .. string.rep(" ", pad) .. time_str

      table.insert(lines, name_line)
      browser_state.item_lines[#lines] = note

      -- Line 2: metadata (tag, project, line count)
      local meta_parts = {}
      if note.tag and note.tag ~= "" then
        table.insert(meta_parts, "#" .. note.tag)
      end
      if note.project_name and note.project_name ~= "" then
        table.insert(meta_parts, require("ccasp").mask_name(note.project_name))
      end
      table.insert(meta_parts, (note.line_count or 0) .. " ln")
      local meta_line = "    " .. table.concat(meta_parts, " " .. nf.pipe .. " ")
      table.insert(lines, meta_line)

      -- Line 3: blank separator
      table.insert(lines, "")
    end
  end

  -- Bottom padding
  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_saved_notes_browser", bufnr)
  for i, line in ipairs(lines) do
    if line:match("Saved Notes") or line:match("Search:") then
      helpers.add_highlight(bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  " .. string.rep("─", 5)) then
      helpers.add_highlight(bufnr, ns, "NonText", i - 1, 0, -1)
    elseif line:match("^  No ") or line:match("^  Use the") then
      helpers.add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^    #") then
      -- Metadata line: dim it
      helpers.add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    end
  end
end

-------------------------------------------------------------------------------
-- Inline rename/tag edit modal (reuses session_titlebar rename pattern)
-------------------------------------------------------------------------------

local function show_edit_modal(note, field, title_label, prefix)
  local current_value = note[field] or ""
  local width = 44
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, { current_value })

  local pos = helpers.calculate_position({ width = width, height = 1 })
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = pos.width,
    height = 1,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.edit .. "  " .. title_label .. " ",
    title_pos = "center",
    footer = " Enter: Apply │ Esc: Cancel ",
    footer_pos = "center",
    style = "minimal",
  })

  vim.cmd("startinsert!")

  local function close_modal()
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    -- Re-focus browser
    if browser_state.winid and vim.api.nvim_win_is_valid(browser_state.winid) then
      vim.api.nvim_set_current_win(browser_state.winid)
    end
  end

  local function confirm_edit()
    local new_value = vim.trim(vim.api.nvim_buf_get_lines(buf, 0, 1, false)[1] or "")
    vim.cmd("stopinsert")
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end

    if field == "name" and new_value == "" then
      vim.notify("Name cannot be empty", vim.log.levels.WARN)
    elseif new_value ~= current_value then
      local storage = require("ccasp.saved_notes.storage")
      storage.update_note(note.id, { [field] = new_value })
      vim.notify(title_label .. " updated", vim.log.levels.INFO)
      render()
    end

    -- Re-focus browser
    if browser_state.winid and vim.api.nvim_win_is_valid(browser_state.winid) then
      vim.api.nvim_set_current_win(browser_state.winid)
    end
  end

  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("i", "<CR>", confirm_edit, opts)
  vim.keymap.set("n", "<CR>", confirm_edit, opts)
  vim.keymap.set("i", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)
  vim.keymap.set("n", "q", close_modal, opts)
end

-------------------------------------------------------------------------------
-- Delete confirmation
-------------------------------------------------------------------------------

local function confirm_delete(note)
  local width = 40
  local height = 7

  local buf = helpers.create_buffer("ccasp://delete-note")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.delete .. "  Delete Note ",
    footer = " y: Yes │ n/Esc: No ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true

  local lines = {}
  local item_lines = {}

  table.insert(lines, "")
  local display_name = note.name or "Untitled"
  if #display_name > 30 then
    display_name = display_name:sub(1, 27) .. "..."
  end
  table.insert(lines, '  Delete "' .. display_name .. '"?')
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", width - 4))
  table.insert(lines, "    Yes - Delete note")
  item_lines[#lines] = { action = "yes" }
  table.insert(lines, "    No  - Cancel")
  item_lines[#lines] = { action = "no" }
  table.insert(lines, "")

  helpers.set_buffer_content(buf, lines)
  helpers.sandbox_buffer(buf)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_delete_note", buf)
  for i, line in ipairs(lines) do
    if line:match('Delete "') then
      helpers.add_highlight(buf, ns, "WarningMsg", i - 1, 0, -1)
    elseif line:match("^  ─") then
      helpers.add_highlight(buf, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^    Yes") then
      helpers.add_highlight(buf, ns, "DiagnosticError", i - 1, 4, 7)
    elseif line:match("^    No") then
      helpers.add_highlight(buf, ns, "DiagnosticOk", i - 1, 4, 6)
    end
  end

  local panel = { bufnr = buf, winid = win }
  local function close_modal()
    if win and vim.api.nvim_win_is_valid(win) then
      vim.api.nvim_win_close(win, true)
    end
    -- Re-focus browser
    if browser_state.winid and vim.api.nvim_win_is_valid(browser_state.winid) then
      vim.api.nvim_set_current_win(browser_state.winid)
    end
  end

  local function do_delete()
    close_modal()
    vim.schedule(function()
      local storage = require("ccasp.saved_notes.storage")
      local ok = storage.delete_note(note.id)
      if ok then
        vim.notify("Note deleted: " .. (note.name or ""), vim.log.levels.INFO)
      else
        vim.notify("Failed to delete note", vim.log.levels.ERROR)
      end
      render()
      move_to_first_item()
    end)
  end

  local function execute_at_cursor()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local item = item_lines[cursor[1]]
    if item then
      if item.action == "yes" then do_delete()
      elseif item.action == "no" then close_modal() end
    end
  end

  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("n", "<CR>", execute_at_cursor, opts)
  vim.keymap.set("n", "y", do_delete, opts)
  vim.keymap.set("n", "n", close_modal, opts)
  vim.keymap.set("n", "q", close_modal, opts)
  vim.keymap.set("n", "<Esc>", close_modal, opts)

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

  -- Default cursor on "No" (safe default)
  for line = #lines, 1, -1 do
    if item_lines[line] and item_lines[line].action == "no" then
      vim.api.nvim_win_set_cursor(win, { line, 0 })
      break
    end
  end
end

-------------------------------------------------------------------------------
-- Public: Open browser
-------------------------------------------------------------------------------

function M.open()
  -- If already open, just focus it
  if helpers.focus_if_open(browser_state.winid) then
    return
  end

  local width = 60
  local height = 24
  local pos = helpers.calculate_position({ width = width, height = height })

  local bufnr = helpers.create_buffer("ccasp://saved-notes-browser")
  local winid = helpers.create_window(bufnr, {
    width = width,
    height = height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.save .. " Saved Notes ",
    title_pos = "center",
    footer = " j/k Move  Enter View  r Rename  t Tag  d Del  / Search  Esc/q Close ",
    footer_pos = "center",
  })

  browser_state.bufnr = bufnr
  browser_state.winid = winid
  browser_state.search_query = ""
  browser_state.search_active = false
  browser_state.item_lines = {}

  -- Sandbox first, then override specific keys
  helpers.sandbox_buffer(bufnr)
  helpers.setup_window_manager(bufnr, winid, "Saved Notes")
  helpers.setup_minimize(bufnr, winid, "Saved Notes", browser_state)

  vim.wo[winid].cursorline = true

  -- Render content
  render()

  -- Keymaps
  local opts = { buffer = bufnr, nowait = true, silent = true }

  -- Close
  vim.keymap.set("n", "q", close_browser_and_restore, opts)
  vim.keymap.set("n", "<Esc>", function()
    if browser_state.search_active then
      browser_state.search_query = ""
      browser_state.search_active = false
      render()
      move_to_first_item()
    else
      close_browser_and_restore()
    end
  end, opts)

  -- Navigation
  vim.keymap.set("n", "j", function() navigate(1) end, opts)
  vim.keymap.set("n", "k", function() navigate(-1) end, opts)
  vim.keymap.set("n", "<Down>", function() navigate(1) end, opts)
  vim.keymap.set("n", "<Up>", function() navigate(-1) end, opts)

  -- Enter: open viewer for selected note
  vim.keymap.set("n", "<CR>", function()
    if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then return end
    local line = vim.api.nvim_win_get_cursor(browser_state.winid)[1]
    local note = browser_state.item_lines[line]
    if note then
      local note_id = note.id
      close_browser()
      -- Open viewer synchronously so it gets focus BEFORE the WinEnter
      -- startinsert guard fires (the guard checks current_win and skips
      -- if focus has already moved away from the terminal window).
      require("ccasp.saved_notes").open_viewer(note_id)
    end
  end, opts)

  -- Mouse click: navigate (single), open viewer (double)
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse and mouse.line and browser_state.item_lines[mouse.line] then
      pcall(vim.api.nvim_win_set_cursor, browser_state.winid, { mouse.line, 2 })
    end
  end, opts)
  vim.keymap.set("n", "<2-LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse and mouse.line then
      local note = browser_state.item_lines[mouse.line]
      if note then
        local note_id = note.id
        close_browser()
        require("ccasp.saved_notes").open_viewer(note_id)
      end
    end
  end, opts)

  -- r: rename selected note
  vim.keymap.set("n", "r", function()
    if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then return end
    local line = vim.api.nvim_win_get_cursor(browser_state.winid)[1]
    local note = browser_state.item_lines[line]
    if note then
      show_edit_modal(note, "name", "Rename Note")
    end
  end, opts)

  -- t: edit tag
  vim.keymap.set("n", "t", function()
    if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then return end
    local line = vim.api.nvim_win_get_cursor(browser_state.winid)[1]
    local note = browser_state.item_lines[line]
    if note then
      show_edit_modal(note, "tag", "Edit Tag")
    end
  end, opts)

  -- d: delete with confirmation
  vim.keymap.set("n", "d", function()
    if not browser_state.winid or not vim.api.nvim_win_is_valid(browser_state.winid) then return end
    local line = vim.api.nvim_win_get_cursor(browser_state.winid)[1]
    local note = browser_state.item_lines[line]
    if note then
      confirm_delete(note)
    end
  end, opts)

  -- /: search mode
  vim.keymap.set("n", "/", function()
    vim.ui.input({ prompt = "Search notes: " }, function(query)
      if query and query ~= "" then
        browser_state.search_query = query
        browser_state.search_active = true
      else
        browser_state.search_query = ""
        browser_state.search_active = false
      end
      render()
      move_to_first_item()
      -- Refocus browser after vim.ui.input closes
      if browser_state.winid and vim.api.nvim_win_is_valid(browser_state.winid) then
        vim.api.nvim_set_current_win(browser_state.winid)
      end
    end)
  end, opts)

  -- Place cursor on first item
  move_to_first_item()

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

--- Close browser panel (for external callers).
function M.close()
  close_browser()
end

--- Check if browser is currently open.
function M.is_open()
  return browser_state.winid ~= nil and vim.api.nvim_win_is_valid(browser_state.winid)
end

return M
