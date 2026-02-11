-- ccasp/panels/screenshot_browser.lua - Screenshot browser panel
-- Displays recent screenshots from Windows Snipping Tool directory
-- Navigate with j/k, open in viewer with Enter, paste path with p

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

-- ─── Configuration ──────────────────────────────────────────────
local SNIP_DIR = vim.fn.expand("~/OneDrive/Pictures/Snipping Tool")
local IMAGE_EXTS = { ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp" }

-- ─── State ──────────────────────────────────────────────────────
local state = {
  winid = nil,
  bufnr = nil,
  item_lines = {},   -- line_number -> { path, name, size, mtime }
  files = {},        -- sorted file list
  session_id = nil,  -- target session for paste
}

-- Persistent registry: tracks which images were pasted per session
-- Survives browser open/close within the same Neovim instance
-- { [session_id] = { [filename] = true, ... }, ... }
local pasted_registry = {}

function M.is_open()
  return state.winid ~= nil and vim.api.nvim_win_is_valid(state.winid)
end

-- ─── Helpers ────────────────────────────────────────────────────

-- Check if a file has an image extension
local function is_image(path)
  local ext = path:lower():match("(%.[^.]+)$")
  if not ext then return false end
  for _, e in ipairs(IMAGE_EXTS) do
    if ext == e then return true end
  end
  return false
end

-- Format file size for display
local function format_size(bytes)
  if bytes < 1024 then return string.format("%d B", bytes) end
  if bytes < 1024 * 1024 then return string.format("%.1f KB", bytes / 1024) end
  return string.format("%.1f MB", bytes / (1024 * 1024))
end

-- Format timestamp for display
local function format_time(mtime)
  if mtime <= 0 then return "unknown" end
  return vim.fn.strftime("%Y-%m-%d %H:%M", mtime)
end

-- Scan the Snipping Tool directory for images, sorted newest first
local function scan_screenshots()
  local raw = vim.fn.glob(SNIP_DIR .. "/*", false, true)
  local files = {}

  for _, path in ipairs(raw) do
    if is_image(path) then
      local mtime = vim.fn.getftime(path)
      local size = vim.fn.getfsize(path)
      table.insert(files, {
        path = path,
        name = vim.fn.fnamemodify(path, ":t"),
        size = size > 0 and size or 0,
        mtime = mtime,
      })
    end
  end

  -- Sort newest first
  table.sort(files, function(a, b) return a.mtime > b.mtime end)
  return files
end

-- Open file in default Windows viewer
local function open_in_viewer(path)
  if not path or path == "" then return end
  vim.fn.system(string.format('cmd.exe /c start "" "%s"', path))
  vim.notify("Opened: " .. vim.fn.fnamemodify(path, ":t"), vim.log.levels.INFO)
end

-- Paste file path into the target session terminal
local function paste_to_session(path)
  if not path or path == "" then return end
  if not state.session_id then return end

  local sessions = require("ccasp.sessions")
  local session = sessions.get(state.session_id)
  if not session or not session.bufnr or not vim.api.nvim_buf_is_valid(session.bufnr) then
    vim.notify("Target session not available", vim.log.levels.WARN)
    return
  end

  local chan = vim.bo[session.bufnr].channel
  if chan and chan > 0 then
    vim.fn.chansend(chan, path)
    -- Track this file as pasted for this session
    local fname = vim.fn.fnamemodify(path, ":t")
    if not pasted_registry[state.session_id] then
      pasted_registry[state.session_id] = {}
    end
    pasted_registry[state.session_id][fname] = true
    vim.notify("Pasted: " .. fname, vim.log.levels.INFO)
  end
end

-- Get the file entry at the current cursor position
local function get_selected_file()
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return nil end
  local cursor = vim.api.nvim_win_get_cursor(state.winid)
  local item = state.item_lines[cursor[1]]
  return item
end

-- ─── Pasted Image Detection ─────────────────────────────────────

-- Returns a set of filenames that have been pasted into the session's chat.
-- Primary source: pasted_registry (tracks images pasted via this browser).
-- Fallback: scans terminal buffer for filenames (catches manual path pastes).
local function get_pasted_images(files)
  local pasted = {}
  if not state.session_id then return pasted end

  -- 1) Registry: images pasted through this browser panel
  local registry = pasted_registry[state.session_id]
  if registry then
    for name, _ in pairs(registry) do
      pasted[name] = true
    end
  end

  -- 2) Fallback: scan terminal buffer for filenames (catches typed/pasted paths)
  local sessions = require("ccasp.sessions")
  local session = sessions.get(state.session_id)
  if session and session.bufnr and vim.api.nvim_buf_is_valid(session.bufnr) then
    local line_count = vim.api.nvim_buf_line_count(session.bufnr)
    local start_line = math.max(0, line_count - 500)
    local ok, buf_lines = pcall(vim.api.nvim_buf_get_lines, session.bufnr, start_line, line_count, false)
    if ok and buf_lines then
      local buf_text = table.concat(buf_lines, "\n")
      for _, file in ipairs(files) do
        if not pasted[file.name] and buf_text:find(file.name, 1, true) then
          pasted[file.name] = true
        end
      end
    end
  end

  return pasted
end

-- ─── Render ─────────────────────────────────────────────────────

local function render(bufnr)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then return end

  state.files = scan_screenshots()
  state.item_lines = {}

  -- Detect which images are already in the chat session
  local pasted = get_pasted_images(state.files)
  local pasted_count = vim.tbl_count(pasted)

  local lines = {}
  local max_shown = 30

  table.insert(lines, "")
  local header = "  " .. nf.win_screenshot .. "  Screenshots  (" .. #state.files .. " found"
  if pasted_count > 0 then
    header = header .. ", " .. pasted_count .. " in chat"
  end
  header = header .. ")"
  table.insert(lines, header)
  table.insert(lines, "  " .. string.rep("─", 52))
  table.insert(lines, "")

  if #state.files == 0 then
    table.insert(lines, "    No screenshots found in:")
    table.insert(lines, "    " .. SNIP_DIR)
    table.insert(lines, "")
  else
    for i, file in ipairs(state.files) do
      if i > max_shown then
        table.insert(lines, "")
        table.insert(lines, string.format("    ... and %d more", #state.files - max_shown))
        break
      end

      local age = ""
      local now = os.time()
      local diff = now - file.mtime
      if diff < 60 then
        age = "just now"
      elseif diff < 3600 then
        age = string.format("%dm ago", math.floor(diff / 60))
      elseif diff < 86400 then
        age = string.format("%dh ago", math.floor(diff / 3600))
      else
        age = format_time(file.mtime)
      end

      local size_str = format_size(file.size)

      -- Star files that are already pasted into the chat session
      local marker = pasted[file.name] and "★" or "·"
      local name_line = string.format("    %s  %s", marker, file.name)
      local meta_line = string.format("         %s  │  %s", size_str, age)

      table.insert(lines, name_line)
      state.item_lines[#lines] = file
      table.insert(lines, meta_line)
      table.insert(lines, "")
    end
  end

  -- Footer hints
  table.insert(lines, "  " .. string.rep("─", 52))
  table.insert(lines, "  [Enter] Open  [p] Paste path  [y] Yank path  [r] Refresh")
  table.insert(lines, "  [q/Esc] Close")
  table.insert(lines, "")

  helpers.set_buffer_content(bufnr, lines)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_screenshot_browser", bufnr)
  for i, line in ipairs(lines) do
    if line:match("Screenshots") and line:match(nf.win_screenshot) then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^  ─") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^%s+★") then
      -- Files already pasted into chat get special highlight
      vim.api.nvim_buf_add_highlight(bufnr, ns, "DiagnosticInfo", i - 1, 0, -1)
    elseif line:match("^%s+·") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Normal", i - 1, 0, -1)
    elseif line:match("^%s+%d") and line:match("│") then
      -- Metadata lines
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("%[%w") then
      -- Keybinding hints
      for s, e in line:gmatch("()%[%w+%]()") do
        vim.api.nvim_buf_add_highlight(bufnr, ns, "Special", i - 1, s - 1, e - 1)
      end
    elseif line:match("No screenshots") or line:match("and %d+ more") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    end
  end
end

-- ─── Navigation ─────────────────────────────────────────────────

local function nav_down()
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end
  local cursor = vim.api.nvim_win_get_cursor(state.winid)
  local total = vim.api.nvim_buf_line_count(state.bufnr)
  for line = cursor[1] + 1, total do
    if state.item_lines[line] then
      vim.api.nvim_win_set_cursor(state.winid, { line, 0 })
      return
    end
  end
end

local function nav_up()
  if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end
  local cursor = vim.api.nvim_win_get_cursor(state.winid)
  for line = cursor[1] - 1, 1, -1 do
    if state.item_lines[line] then
      vim.api.nvim_win_set_cursor(state.winid, { line, 0 })
      return
    end
  end
end

-- ─── Close ──────────────────────────────────────────────────────

function M.close()
  helpers.close_panel(state)
end

-- ─── Open ───────────────────────────────────────────────────────

function M.open(session_id)
  -- If already open, focus it
  if M.is_open() then
    vim.api.nvim_set_current_win(state.winid)
    return
  end

  state.session_id = session_id

  local width = 60
  local height = 35

  local bufnr = helpers.create_buffer("ccasp://screenshot-browser")
  local pos = helpers.calculate_position({ width = width, height = height })
  local winid = helpers.create_window(bufnr, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. nf.win_screenshot .. "  Screenshot Browser ",
    footer = " Enter: Open │ p: Paste │ q: Close ",
    footer_pos = "center",
  })

  state.winid = winid
  state.bufnr = bufnr

  vim.wo[winid].cursorline = true

  -- Render content
  render(bufnr)

  -- Standard keymaps (sandbox + close + minimize + window manager)
  local opts = helpers.setup_standard_keymaps(bufnr, winid, "Screenshots", state, M.close)

  -- Navigation
  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Open in external viewer
  vim.keymap.set("n", "<CR>", function()
    local file = get_selected_file()
    if file then open_in_viewer(file.path) end
  end, opts)

  vim.keymap.set("n", "o", function()
    local file = get_selected_file()
    if file then open_in_viewer(file.path) end
  end, opts)

  -- Paste path to session (override sandbox 'p' block)
  vim.keymap.set("n", "p", function()
    local file = get_selected_file()
    if file then
      M.close()
      vim.schedule(function()
        paste_to_session(file.path)
      end)
    end
  end, opts)

  -- Yank path to clipboard
  vim.keymap.set("n", "y", function()
    local file = get_selected_file()
    if file then
      vim.fn.setreg("+", file.path)
      vim.notify("Copied: " .. file.name, vim.log.levels.INFO)
    end
  end, opts)

  -- Refresh
  vim.keymap.set("n", "r", function()
    render(bufnr)
    vim.notify("Refreshed", vim.log.levels.INFO)
  end, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse.winid ~= winid then return end
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, winid, { line, 0 })
  end, opts)

  -- Double-click opens in viewer
  vim.keymap.set("n", "<2-LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse.winid ~= winid then return end
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, winid, { line, 0 })
    local file = state.item_lines[line]
    if file then open_in_viewer(file.path) end
  end, opts)

  -- Position cursor on first file (newest)
  vim.schedule(function()
    if not state.winid or not vim.api.nvim_win_is_valid(state.winid) then return end
    for line = 1, vim.api.nvim_buf_line_count(bufnr) do
      if state.item_lines[line] then
        vim.api.nvim_win_set_cursor(state.winid, { line, 0 })
        break
      end
    end
  end)
end

-- ─── Toggle ─────────────────────────────────────────────────────

function M.toggle(session_id)
  if M.is_open() then
    M.close()
  else
    M.open(session_id)
  end
end

return M
