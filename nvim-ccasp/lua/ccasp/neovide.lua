-- ccasp/neovide.lua - Neovide GUI integration
-- Detects Neovide and applies GUI-specific settings (font, padding, cursor)
-- Provides quit confirmation modal for standalone app experience

local M = {}
local icons = require("ccasp.ui.icons")

-- ─── Detection ─────────────────────────────────────────────────────────────

function M.is_neovide()
  return vim.g.neovide == true
end

-- ─── Windows API via LuaJIT FFI ──────────────────────────────────────────
-- Neovide's --frame none disables ALL native window management ("Window cannot
-- be moved nor resized after this" per Neovide docs). WM_NCLBUTTONDOWN messages
-- are ignored on frameless windows. To restore move/resize, we:
--   1. Add WS_THICKFRAME back via SetWindowLongPtrA (native edge resize handles)
--   2. Custom drag loop via GetCursorPos + SetWindowPos (title bar drag-to-move)
--   3. Custom resize loop via GetCursorPos + MoveWindow (edge/corner resize)

local ffi_ok, ffi = pcall(require, "ffi")
local bit_ok, bit
if ffi_ok then
  bit_ok, bit = pcall(require, "bit")
end
local user32 = nil
local ffi_error = nil

if ffi_ok then
  -- Separate pcall: cdef may fail on re-require (duplicate definitions) but
  -- ffi.load should still succeed since user32.dll is already cached.
  pcall(function()
    ffi.cdef[[
      typedef struct { long x; long y; } POINT;
      typedef struct { long left; long top; long right; long bottom; } RECT;
      void* GetForegroundWindow();
      bool ShowWindow(void* hWnd, int nCmdShow);
      bool IsZoomed(void* hWnd);
      bool ReleaseCapture();
      intptr_t SendMessageA(void* hWnd, unsigned int Msg, uintptr_t wParam, intptr_t lParam);
      bool PostMessageA(void* hWnd, unsigned int Msg, uintptr_t wParam, intptr_t lParam);
      intptr_t GetWindowLongPtrA(void* hWnd, int nIndex);
      intptr_t SetWindowLongPtrA(void* hWnd, int nIndex, intptr_t dwNewLong);
      bool SetWindowPos(void* hWnd, void* hWndInsertAfter, int X, int Y, int cx, int cy, unsigned int uFlags);
      bool GetCursorPos(POINT* lpPoint);
      short GetAsyncKeyState(int vKey);
      bool GetWindowRect(void* hWnd, RECT* lpRect);
      bool MoveWindow(void* hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
      int GetSystemMetrics(int nIndex);
    ]]
  end)
  local ok, err = pcall(function()
    user32 = ffi.load("user32")
  end)
  if not ok then
    ffi_error = tostring(err)
  end
else
  ffi_error = "LuaJIT FFI not available"
end

-- Warn if FFI failed in Neovide (helps diagnose silent failures)
if ffi_error then
  vim.schedule(function()
    if vim.g.neovide then
      vim.notify("[CCASP] Window control unavailable: " .. ffi_error, vim.log.levels.WARN)
    end
  end)
end

function M.ffi_available()
  return user32 ~= nil
end

-- ─── Win32 constants ─────────────────────────────────────────────────────
local GWL_STYLE       = -16
local WS_THICKFRAME   = 0x00040000
local WS_CAPTION      = 0x00C00000
local WS_MINIMIZEBOX  = 0x00020000
local WS_MAXIMIZEBOX  = 0x00010000
local SWP_FRAMECHANGED = 0x0020
local SWP_NOSIZE      = 0x0001
local SWP_NOMOVE      = 0x0002
local SWP_NOZORDER    = 0x0004
local VK_LBUTTON      = 0x01
local SM_CXSCREEN     = 0
local SM_CYSCREEN     = 1

-- ─── Window style management ─────────────────────────────────────────────

-- Cache the Neovide HWND (set once during restore_window_styles)
local cached_hwnd = nil

local function get_hwnd()
  if cached_hwnd then return cached_hwnd end
  if user32 then return user32.GetForegroundWindow() end
  return nil
end

-- Restore WS_THICKFRAME on the frameless window to enable native resize handles.
-- Called from setup() after Neovide creates the window with --frame none.
-- Adds a very thin (1px on Win11) border that enables OS-level edge resize.
function M.restore_window_styles()
  if not user32 or not bit_ok then return false end
  local hwnd = user32.GetForegroundWindow()
  if not hwnd then return false end

  cached_hwnd = hwnd
  local style = tonumber(user32.GetWindowLongPtrA(hwnd, GWL_STYLE))
  if not style then return false end

  -- Add thick frame (resize handles) + min/max box support
  style = bit.bor(style, WS_THICKFRAME, WS_MINIMIZEBOX, WS_MAXIMIZEBOX)
  user32.SetWindowLongPtrA(hwnd, GWL_STYLE, ffi.cast("intptr_t", style))

  -- Force Windows to recalculate non-client area (applies the new styles)
  user32.SetWindowPos(hwnd, nil, 0, 0, 0, 0,
    SWP_FRAMECHANGED + SWP_NOSIZE + SWP_NOMOVE + SWP_NOZORDER)

  return true
end

-- Toggle native title bar ("Resize Mode").
-- When enabled: shows native Windows title bar for easy drag/resize.
-- When disabled: returns to frameless custom chrome.
local native_frame_visible = false

function M.toggle_native_frame()
  if not user32 or not bit_ok then return end
  local hwnd = get_hwnd()
  if not hwnd then return end

  local style = tonumber(user32.GetWindowLongPtrA(hwnd, GWL_STYLE))
  if not style then return end

  if native_frame_visible then
    -- Remove caption, keep thick frame
    style = bit.band(style, bit.bnot(WS_CAPTION))
    native_frame_visible = false
  else
    -- Add caption + thick frame
    style = bit.bor(style, WS_CAPTION, WS_THICKFRAME)
    native_frame_visible = true
  end

  user32.SetWindowLongPtrA(hwnd, GWL_STYLE, ffi.cast("intptr_t", style))
  user32.SetWindowPos(hwnd, nil, 0, 0, 0, 0,
    SWP_FRAMECHANGED + SWP_NOSIZE + SWP_NOMOVE + SWP_NOZORDER)

  -- Refresh header to hide/show custom buttons
  vim.schedule(function()
    local header_ok, header = pcall(require, "ccasp.appshell.header")
    if header_ok and header.refresh then header.refresh() end
  end)
end

function M.is_native_frame_visible()
  return native_frame_visible
end

-- ─── Window control functions ────────────────────────────────────────────

-- SW_MINIMIZE = 6, SW_MAXIMIZE = 3, SW_RESTORE = 9

function M.win_minimize()
  if user32 then
    local hwnd = get_hwnd()
    user32.ShowWindow(hwnd, 6)
  end
end

function M.win_maximize_toggle()
  if user32 then
    local hwnd = get_hwnd()
    if user32.IsZoomed(hwnd) then
      user32.ShowWindow(hwnd, 9) -- SW_RESTORE
    else
      user32.ShowWindow(hwnd, 3) -- SW_MAXIMIZE
    end
  end
end

function M.is_maximized()
  if user32 then
    local ok, result = pcall(function()
      local hwnd = get_hwnd()
      return user32.IsZoomed(hwnd)
    end)
    if ok then return result end
  end
  return vim.g.neovide_fullscreen or false
end

-- ─── Custom drag-to-move (polling loop) ──────────────────────────────────
-- Neovide --frame none ignores WM_NCLBUTTONDOWN, so we manually poll cursor
-- position and call SetWindowPos to move the window. Uses a libuv timer at
-- ~60fps for smooth movement. Stops when the mouse button is released.

local drag_state = { active = false, timer = nil }

function M.win_drag_start()
  if not user32 or drag_state.active then return end

  local hwnd = get_hwnd()
  if not hwnd then return end

  -- Capture starting positions
  local cursor_start = ffi.new("POINT")
  user32.GetCursorPos(cursor_start)

  local rect = ffi.new("RECT")
  user32.GetWindowRect(hwnd, rect)
  local win_x, win_y = rect.left, rect.top
  local start_cx, start_cy = cursor_start.x, cursor_start.y

  drag_state.active = true
  drag_state.timer = vim.loop.new_timer()
  drag_state.timer:start(0, 16, vim.schedule_wrap(function()
    -- Check if left mouse button still held
    local btn = user32.GetAsyncKeyState(VK_LBUTTON)
    if bit_ok and bit.band(tonumber(btn), 0x8000) == 0 then
      M.win_drag_stop()
      return
    end

    -- Get current cursor and compute delta
    local cur = ffi.new("POINT")
    user32.GetCursorPos(cur)
    local dx = cur.x - start_cx
    local dy = cur.y - start_cy

    -- Move window (keep size, skip z-order)
    user32.SetWindowPos(hwnd, nil, win_x + dx, win_y + dy, 0, 0,
      SWP_NOSIZE + SWP_NOZORDER)
  end))
end

function M.win_drag_stop()
  if drag_state.timer then
    pcall(function()
      drag_state.timer:stop()
      drag_state.timer:close()
    end)
    drag_state.timer = nil
  end
  drag_state.active = false
end

-- ─── Custom resize (polling loop) ────────────────────────────────────────
-- Same approach as drag: poll cursor + resize window via MoveWindow.
-- Handles all 8 edges/corners. Enforces a minimum window size.

local MIN_WIDTH = 600
local MIN_HEIGHT = 400

function M.win_resize_start(edge)
  if not user32 or drag_state.active then return end
  if not edge then return end

  local hwnd = get_hwnd()
  if not hwnd then return end

  local cursor_start = ffi.new("POINT")
  user32.GetCursorPos(cursor_start)

  local rect = ffi.new("RECT")
  user32.GetWindowRect(hwnd, rect)
  local s_left, s_top = rect.left, rect.top
  local s_right, s_bottom = rect.right, rect.bottom
  local start_cx, start_cy = cursor_start.x, cursor_start.y

  -- Which edges move?
  local move_left = edge == "left" or edge == "topleft" or edge == "bottomleft"
  local move_right = edge == "right" or edge == "topright" or edge == "bottomright"
  local move_top = edge == "top" or edge == "topleft" or edge == "topright"
  local move_bottom = edge == "bottom" or edge == "bottomleft" or edge == "bottomright"

  drag_state.active = true
  drag_state.timer = vim.loop.new_timer()
  drag_state.timer:start(0, 16, vim.schedule_wrap(function()
    local btn = user32.GetAsyncKeyState(VK_LBUTTON)
    if bit_ok and bit.band(tonumber(btn), 0x8000) == 0 then
      M.win_drag_stop()
      return
    end

    local cur = ffi.new("POINT")
    user32.GetCursorPos(cur)
    local dx = cur.x - start_cx
    local dy = cur.y - start_cy

    local new_left = s_left
    local new_top = s_top
    local new_right = s_right
    local new_bottom = s_bottom

    if move_left then new_left = s_left + dx end
    if move_right then new_right = s_right + dx end
    if move_top then new_top = s_top + dy end
    if move_bottom then new_bottom = s_bottom + dy end

    -- Enforce minimum size
    local w = new_right - new_left
    local h = new_bottom - new_top
    if w < MIN_WIDTH then
      if move_left then new_left = new_right - MIN_WIDTH
      else new_right = new_left + MIN_WIDTH end
    end
    if h < MIN_HEIGHT then
      if move_top then new_top = new_bottom - MIN_HEIGHT
      else new_bottom = new_top + MIN_HEIGHT end
    end

    user32.MoveWindow(hwnd,
      new_left, new_top,
      new_right - new_left, new_bottom - new_top,
      true)
  end))
end

-- ─── Window sizing ───────────────────────────────────────────────────────

-- Size and center the window to a fraction of the primary screen.
-- Called from setup() to fix the tiny-window problem that occurs when
-- vim.o.lines/columns doesn't translate well to pixel size.
function M.size_to_screen(fraction)
  if not user32 then return end
  fraction = fraction or 0.85

  local hwnd = get_hwnd()
  if not hwnd then return end

  local sw = user32.GetSystemMetrics(SM_CXSCREEN)
  local sh = user32.GetSystemMetrics(SM_CYSCREEN)
  local ww = math.floor(sw * fraction)
  local wh = math.floor(sh * fraction)
  local x = math.floor((sw - ww) / 2)
  local y = math.floor((sh - wh) / 2)

  user32.MoveWindow(hwnd, x, y, ww, wh, true)
end

-- ─── Edge resize detection ────────────────────────────────────────────────
-- Determine if the mouse is on a resize edge/corner of the Neovide window.
-- Used by header.lua and footer.lua to trigger custom resize from any border.
local RESIZE_BORDER = 4  -- screen columns/rows from edge that trigger resize

function M.get_resize_edge(mouse)
  local rows = vim.o.lines
  local cols = vim.o.columns
  local r = mouse.screenrow
  local c = mouse.screencol

  local at_top = (r <= 1)
  local at_bottom = (r >= rows)
  local at_left = (c <= RESIZE_BORDER)
  local at_right = (c > cols - RESIZE_BORDER)

  if at_top and at_left then return "topleft"
  elseif at_top and at_right then return "topright"
  elseif at_bottom and at_left then return "bottomleft"
  elseif at_bottom and at_right then return "bottomright"
  elseif at_top then return "top"
  elseif at_bottom then return "bottom"
  elseif at_left then return "left"
  elseif at_right then return "right"
  end
  return nil
end

-- ─── Diagnostics ───────────────────────────────────────────────────────────
-- Call via :lua print(vim.inspect(require("ccasp.neovide").diagnose()))
function M.diagnose()
  local info = {
    is_neovide = M.is_neovide(),
    ffi_available = M.ffi_available(),
    ffi_error = ffi_error,
    luajit = jit ~= nil,
    bit_available = bit_ok,
    native_frame = native_frame_visible,
  }
  if user32 then
    local ok, hwnd = pcall(function() return get_hwnd() end)
    info.hwnd_ok = ok
    info.hwnd = ok and tostring(hwnd) or nil
    if ok and hwnd then
      local style = tonumber(user32.GetWindowLongPtrA(hwnd, GWL_STYLE))
      info.has_thickframe = bit_ok and bit.band(style, WS_THICKFRAME) ~= 0
      info.has_caption = bit_ok and bit.band(style, WS_CAPTION) ~= 0
      info.screen_w = user32.GetSystemMetrics(SM_CXSCREEN)
      info.screen_h = user32.GetSystemMetrics(SM_CYSCREEN)
    end
  end
  return info
end

-- ─── Quit confirmation modal ───────────────────────────────────────────────
-- Reuses the same modal pattern as session_titlebar.close_session

function M.quit()
  local helpers = require("ccasp.panels.helpers")

  local width = 36
  local height = 7

  local buf = helpers.create_buffer("ccasp://quit-confirm")
  local pos = helpers.calculate_position({ width = width, height = height })
  local win = helpers.create_window(buf, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. icons.win_close .. "  Quit CCASP ",
    footer = " y: Yes │ n/Esc: No ",
    footer_pos = "center",
  })

  vim.wo[win].cursorline = true

  -- Build content
  local lines = {}
  local item_lines = {}

  table.insert(lines, "")
  table.insert(lines, "  Quit CCASP?")
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", width - 4))
  table.insert(lines, "    Yes - Exit application")
  item_lines[#lines] = { action = "yes" }
  table.insert(lines, "    No  - Cancel")
  item_lines[#lines] = { action = "no" }
  table.insert(lines, "")

  helpers.set_buffer_content(buf, lines)
  helpers.sandbox_buffer(buf)

  -- Highlights
  local ns = helpers.prepare_highlights("ccasp_quit_confirm", buf)
  for i, line_text in ipairs(lines) do
    if line_text:match("Quit CCASP") then
      vim.api.nvim_buf_add_highlight(buf, ns, "WarningMsg", i - 1, 0, -1)
    elseif line_text:match("^  ─") then
      vim.api.nvim_buf_add_highlight(buf, ns, "Comment", i - 1, 0, -1)
    elseif line_text:match("^    Yes") then
      vim.api.nvim_buf_add_highlight(buf, ns, "DiagnosticError", i - 1, 4, 7)
    elseif line_text:match("^    No") then
      vim.api.nvim_buf_add_highlight(buf, ns, "DiagnosticOk", i - 1, 4, 6)
    end
  end

  local panel = { bufnr = buf, winid = win }
  local function close_modal()
    helpers.close_panel(panel)
  end

  local function do_quit()
    close_modal()
    vim.schedule(function() vim.cmd("qa!") end)
  end

  local function execute_at_cursor()
    if not win or not vim.api.nvim_win_is_valid(win) then return end
    local cursor = vim.api.nvim_win_get_cursor(win)
    local item = item_lines[cursor[1]]
    if item then
      if item.action == "yes" then do_quit()
      elseif item.action == "no" then close_modal() end
    end
  end

  -- Keymaps
  local opts = { buffer = buf, noremap = true, silent = true }
  vim.keymap.set("n", "<CR>", execute_at_cursor, opts)
  vim.keymap.set("n", "y", do_quit, opts)
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

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, win, { line, 0 })
    local item = item_lines[line]
    if item then
      if item.action == "yes" then do_quit()
      elseif item.action == "no" then close_modal() end
    end
  end, opts)

  -- Default cursor on "No" (safe default)
  for line = #lines, 1, -1 do
    if item_lines[line] and item_lines[line].action == "no" then
      vim.api.nvim_win_set_cursor(win, { line, 0 })
      break
    end
  end
end

-- ─── Setup ─────────────────────────────────────────────────────────────────

function M.setup(opts)
  if not M.is_neovide() then return end

  opts = opts or {}

  -- Font
  local font = opts.font or "JetBrainsMono Nerd Font Mono:h12"
  vim.o.guifont = font

  -- Window padding
  local padding = opts.padding or 4
  vim.g.neovide_padding_top = padding
  vim.g.neovide_padding_bottom = padding
  vim.g.neovide_padding_left = padding
  vim.g.neovide_padding_right = padding

  -- Window behavior — don't remember size (we set it explicitly each launch)
  vim.g.neovide_remember_window_size = false
  vim.g.neovide_fullscreen = false

  -- Hide native title bar for standalone app experience
  -- (CCASP header provides its own close/minimize/maximize buttons)
  vim.g.neovide_title_bar = ""

  -- Cursor animation (subtle)
  vim.g.neovide_cursor_animation_length = 0.06
  vim.g.neovide_cursor_trail_size = 0.3

  -- Clean typing UX
  vim.g.neovide_hide_mouse_when_typing = true

  -- ── Window sizing + style restoration (must run after Neovide renders) ──
  -- Deferred: Neovide needs a frame before we can query/modify its HWND.
  vim.schedule(function()
    -- 1. Restore WS_THICKFRAME so native edge resize handles work
    M.restore_window_styles()
    -- 2. Size window to ~85% of screen and center it (fixes tiny-window bug)
    M.size_to_screen(0.85)
  end)

  -- Resize Mode toggle: Ctrl+Shift+F temporarily shows native title bar
  local keyopts = { noremap = true, silent = true }
  vim.keymap.set({ "n", "t" }, "<C-S-f>", function()
    M.toggle_native_frame()
    local msg = M.is_native_frame_visible()
      and "Resize Mode ON — native title bar visible (Ctrl+Shift+F to toggle)"
      or "Resize Mode OFF — custom chrome restored"
    vim.notify(msg, vim.log.levels.INFO)
  end, vim.tbl_extend("force", keyopts, { desc = "CCASP: Toggle native frame (Resize Mode)" }))

  -- ── Clipboard (Neovide doesn't add these - must be explicit) ──
  -- Uses nvim_paste() which handles all modes correctly (insert, normal, terminal, cmdline)
  local function paste()
    vim.api.nvim_paste(vim.fn.getreg("+"), true, -1)
  end
  vim.keymap.set({ "n", "v", "i", "c", "t" }, "<C-S-v>", paste, { silent = true, desc = "Paste from clipboard" })
  -- Ctrl+V: remap to paste in insert/cmdline/terminal (keep visual block in normal mode)
  vim.keymap.set({ "i", "c", "t" }, "<C-v>", paste, { silent = true, desc = "Paste from clipboard" })

  -- Right-click paste (standard GUI behavior - Neovide has no built-in context menu)
  vim.keymap.set({ "n", "v", "i", "c", "t" }, "<RightMouse>", paste, { silent = true, desc = "Right-click paste" })

  -- Copy: Ctrl+C in visual mode copies selection to system clipboard
  vim.keymap.set("v", "<C-c>", '"+y', { noremap = true, silent = true, desc = "Copy to clipboard" })
  -- Ctrl+Shift+C: also copy in visual mode (matches terminal conventions)
  vim.keymap.set("v", "<C-S-c>", '"+y', { noremap = true, silent = true, desc = "Copy to clipboard" })

  -- Global quit keybinds (Neovide only)

  -- Ctrl+Q — common app quit shortcut
  vim.keymap.set("n", "<C-q>", M.quit, vim.tbl_extend("force", keyopts, { desc = "CCASP: Quit application" }))
  vim.keymap.set("t", "<C-q>", function()
    local esc = vim.api.nvim_replace_termcodes("<C-\\><C-n>", true, false, true)
    vim.api.nvim_feedkeys(esc, "n", false)
    vim.schedule(M.quit)
  end, vim.tbl_extend("force", keyopts, { desc = "CCASP: Quit application (terminal)" }))

  -- Alt+F4 — Windows standard close
  vim.keymap.set("n", "<M-F4>", M.quit, vim.tbl_extend("force", keyopts, { desc = "CCASP: Quit application (Alt+F4)" }))
  vim.keymap.set("t", "<M-F4>", function()
    local esc = vim.api.nvim_replace_termcodes("<C-\\><C-n>", true, false, true)
    vim.api.nvim_feedkeys(esc, "n", false)
    vim.schedule(M.quit)
  end, vim.tbl_extend("force", keyopts, { desc = "CCASP: Quit application (Alt+F4, terminal)" }))
end

return M
