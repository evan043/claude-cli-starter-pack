-- ccasp/appshell/header.lua - Appshell Top Navbar
-- 2-line floating header with half-block ASCII art logo, gradient shading,
-- project info, and status indicators
-- When running in Neovide: adds close/minimize buttons (top-right, line 1)

local M = {}
local icons = require("ccasp.ui.icons")

local state = {
  win = nil,
  buf = nil,
  prev_showtabline = nil,
  -- Display column ranges of window buttons on line 1 (for click detection)
  close_btn_col_start = nil,
  close_btn_col_end = nil,
  max_btn_col_start = nil,
  max_btn_col_end = nil,
  min_btn_col_start = nil,
  min_btn_col_end = nil,
}

-- ─── Neovide detection (cached) ────────────────────────────────────────────
local function is_neovide()
  return vim.g.neovide == true
end

-- ─── Segment-based line builder ──────────────────────────────────────────────
-- Each segment: { text, highlight_group | nil }
-- Returns: full_string, { {start_byte, end_byte, hl_group}, ... }
local function build_line(segments)
  local parts = {}
  local hl_ranges = {}
  local byte_pos = 0

  for _, seg in ipairs(segments) do
    local text = seg[1]
    local hl = seg[2]
    table.insert(parts, text)
    if hl then
      table.insert(hl_ranges, { byte_pos, byte_pos + #text, hl })
    end
    byte_pos = byte_pos + #text
  end

  return table.concat(parts), hl_ranges
end

-- Assemble left + right segments with padding between them
local function assemble_line(left_segs, right_segs, total_width)
  local left_text, left_hl = build_line(left_segs)
  local right_text, right_hl = build_line(right_segs)

  local left_w = vim.fn.strdisplaywidth(left_text)
  local right_w = vim.fn.strdisplaywidth(right_text)
  local pad = math.max(1, total_width - left_w - right_w)
  local pad_str = string.rep(" ", pad)

  -- Offset right highlight byte positions
  local offset = #left_text + #pad_str
  local all_hl = {}
  for _, h in ipairs(left_hl) do
    table.insert(all_hl, h)
  end
  for _, h in ipairs(right_hl) do
    table.insert(all_hl, { h[1] + offset, h[2] + offset, h[3] })
  end

  return left_text .. pad_str .. right_text, all_hl
end

-- ─── Status indicators (right side) ──────────────────────────────────────────
local function get_status_segments()
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  if not ccasp_ok then return {} end

  local status = ccasp.get_status()
  local perm_mode = status.permissions_mode or "ask"
  local perm_icon = icons.perm_mode(perm_mode)
  local perm_label = perm_mode:sub(1, 1):upper() .. perm_mode:sub(2)
  local sync_icon = status.sync_status == "synced" and icons.sync_ok or icons.sync_warn
  local version = status.version or "?"

  return {
    { " " .. perm_icon .. " " .. perm_label .. " ", "CcaspFooterLabel" },
    { icons.pipe, "CcaspFooterSep" },
    { " " .. sync_icon .. " ", "CcaspFooterLabel" },
    { icons.pipe, "CcaspFooterSep" },
    { " v" .. version .. " ", "CcaspFooterValue" },
  }
end

-- ─── Click handler for header window buttons ─────────────────────────────
-- Uses GLOBAL <LeftRelease> mappings (normal + terminal modes) that check
-- screenrow/screencol to detect clicks in the header button region.
-- <LeftRelease> fires AFTER Neovim has fully updated mouse position data.
-- Window control uses LuaJIT FFI to call user32.dll directly (instant, no
-- PowerShell process spawn delay).

local debug_file = nil

local function log_click(msg)
  if not debug_file then
    debug_file = vim.fn.stdpath("cache") .. "/ccasp_click_debug.txt"
    local f = io.open(debug_file, "w")
    if f then f:write("CCASP Click Debug\n"); f:close() end
  end
  local f = io.open(debug_file, "a")
  if f then f:write(os.date("%H:%M:%S") .. " " .. msg .. "\n"); f:close() end
end

-- ─── Windows API via LuaJIT FFI ──────────────────────────────────────────
local ffi_ok, ffi = pcall(require, "ffi")
local user32 = nil

if ffi_ok then
  pcall(function()
    ffi.cdef[[
      void* GetForegroundWindow();
      bool ShowWindow(void* hWnd, int nCmdShow);
      bool IsZoomed(void* hWnd);
    ]]
    user32 = ffi.load("user32")
  end)
end

-- SW_MINIMIZE = 6, SW_MAXIMIZE = 3, SW_RESTORE = 9
local function win_minimize()
  if user32 then
    local hwnd = user32.GetForegroundWindow()
    log_click("  FFI: ShowWindow(hwnd, 6) minimize")
    user32.ShowWindow(hwnd, 6)
  else
    log_click("  FFI unavailable, falling back to PowerShell")
    vim.fn.jobstart({
      "powershell.exe", "-NoProfile", "-Command",
      "Add-Type -Name NW -Namespace Win -PassThru -MemberDefinition '"
      .. "[DllImport(\"user32.dll\")] public static extern bool ShowWindow(System.IntPtr h, int c);"
      .. "[DllImport(\"user32.dll\")] public static extern System.IntPtr GetForegroundWindow();';"
      .. "[Win.NW]::ShowWindow([Win.NW]::GetForegroundWindow(), 6)"
    }, { detach = true })
  end
end

local function win_maximize_toggle()
  if user32 then
    local hwnd = user32.GetForegroundWindow()
    local is_max = user32.IsZoomed(hwnd)
    if is_max then
      log_click("  FFI: ShowWindow(hwnd, 9) restore")
      user32.ShowWindow(hwnd, 9) -- SW_RESTORE
    else
      log_click("  FFI: ShowWindow(hwnd, 3) maximize")
      user32.ShowWindow(hwnd, 3) -- SW_MAXIMIZE
    end
    -- Refresh header after resize
    vim.defer_fn(function() M.refresh() end, 150)
  end
end

local function handle_header_click(mouse)
  if not mouse then
    log_click("  mouse=nil")
    return false
  end

  log_click(string.format("  check: row=%d col=%d | min=%s-%s max=%s-%s close=%s-%s",
    mouse.screenrow, mouse.screencol,
    tostring(state.min_btn_col_start), tostring(state.min_btn_col_end),
    tostring(state.max_btn_col_start), tostring(state.max_btn_col_end),
    tostring(state.close_btn_col_start), tostring(state.close_btn_col_end)))

  -- Only handle line 1 (button row); screenrow 2 = subtitle, ignore
  if mouse.screenrow ~= 1 then return false end

  local col = mouse.screencol -- 1-based screen column

  -- Check close button region
  if state.close_btn_col_start and state.close_btn_col_end then
    if col >= state.close_btn_col_start and col <= state.close_btn_col_end then
      log_click("  -> CLOSE matched")
      vim.schedule(function()
        local neovide_ok, neovide = pcall(require, "ccasp.neovide")
        if neovide_ok then neovide.quit() end
      end)
      return true
    end
  end

  -- Check maximize/restore button region
  if state.max_btn_col_start and state.max_btn_col_end then
    if col >= state.max_btn_col_start and col <= state.max_btn_col_end then
      log_click("  -> MAXIMIZE matched")
      vim.schedule(win_maximize_toggle)
      return true
    end
  end

  -- Check minimize button region
  if state.min_btn_col_start and state.min_btn_col_end then
    if col >= state.min_btn_col_start and col <= state.min_btn_col_end then
      log_click("  -> MINIMIZE matched")
      vim.schedule(win_minimize)
      return true
    end
  end

  log_click("  -> no button matched at col=" .. col)
  return false
end

local function setup_click_handler()
  log_click("setup_click_handler called")

  local opts = { noremap = true, silent = true, desc = "CCASP: Header button click" }

  -- Global <LeftRelease> for normal/visual/insert modes
  -- Fires AFTER mouse position is fully updated by Neovim
  vim.keymap.set({"n", "v", "i"}, "<LeftRelease>", function()
    local mouse = vim.fn.getmousepos()
    log_click(string.format("n-LeftRelease: row=%d col=%d", mouse.screenrow, mouse.screencol))
    if mouse.screenrow <= 2 then
      handle_header_click(mouse)
    end
  end, opts)

  -- Global <LeftRelease> for terminal mode
  vim.keymap.set("t", "<LeftRelease>", function()
    local mouse = vim.fn.getmousepos()
    log_click(string.format("t-LeftRelease: row=%d col=%d", mouse.screenrow, mouse.screencol))
    if mouse.screenrow <= 2 then
      -- Exit terminal mode, then dispatch
      local esc = vim.api.nvim_replace_termcodes("<C-\\><C-n>", true, false, true)
      vim.api.nvim_feedkeys(esc, "n", false)
      vim.schedule(function()
        handle_header_click(mouse)
      end)
    end
  end, opts)

  log_click("click handler ready")
end

-- ─── Lifecycle ───────────────────────────────────────────────────────────────

function M.open()
  -- Disable built-in tabline (we use a float instead)
  state.prev_showtabline = vim.o.showtabline
  vim.o.showtabline = 0

  -- Create buffer
  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  -- Create floating window (full width, 2 rows, top of editor)
  -- Non-focusable; clicks detected via global <LeftRelease> mapping
  state.win = vim.api.nvim_open_win(state.buf, false, {
    relative = "editor",
    row = 0,
    col = 0,
    width = vim.o.columns,
    height = 2,
    style = "minimal",
    focusable = false,
    zindex = 90,
    border = "none",
  })

  vim.wo[state.win].winhighlight = "Normal:CcaspHeaderBg,EndOfBuffer:CcaspHeaderBg"
  vim.wo[state.win].wrap = false
  vim.wo[state.win].cursorline = false

  -- Sandbox buffer
  local helpers_ok, helpers = pcall(require, "ccasp.panels.helpers")
  if helpers_ok and helpers.sandbox_buffer then
    helpers.sandbox_buffer(state.buf)
  end

  -- Setup global click handler for Neovide window buttons (minimize/maximize/close)
  if is_neovide() then
    setup_click_handler()
  end

  M.refresh()
end

function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil

  -- Restore tabline
  if state.prev_showtabline then
    vim.o.showtabline = state.prev_showtabline
    state.prev_showtabline = nil
  end
end

function M.resize(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = 0,
      col = 0,
      width = vim.o.columns,
      height = 2,
    })
    M.refresh()
  end
end

function M.refresh()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local w = vim.o.columns

  -- ─── Line 1: Gradient logo + project name + window buttons ──────────────
  --  Subtle gradient fade ░▒▓ around plain "CCASP" text
  local line1_left = {
    { " ░",      "CcaspHeaderGrad1" },
    { "▒",       "CcaspHeaderGrad2" },
    { "▓",       "CcaspHeaderGrad3" },
    { " CCASP ", "CcaspHeaderArt" },
    { "▓",       "CcaspHeaderGrad3" },
    { "▒",       "CcaspHeaderGrad2" },
    { "░",       "CcaspHeaderGrad1" },
  }

  -- Right side: window control buttons when in Neovide (minimize, maximize, close)
  local line1_right = {}
  if is_neovide() then
    local min_text = " " .. icons.win_minimize .. " "
    -- Detect maximized state via FFI IsZoomed (accurate) or fallback to neovide_fullscreen
    local is_maximized = false
    if user32 then
      pcall(function()
        local hwnd = user32.GetForegroundWindow()
        is_maximized = user32.IsZoomed(hwnd)
      end)
    else
      is_maximized = vim.g.neovide_fullscreen or false
    end
    local max_icon = is_maximized and icons.win_restore or icons.win_maximize
    local max_text = " " .. max_icon .. " "
    local close_text = " " .. icons.win_close .. " "
    line1_right = {
      { min_text,   "CcaspMinBtn" },
      { " ",        nil },
      { max_text,   "CcaspMaxBtn" },
      { " ",        nil },
      { close_text, "CcaspCloseBtn" },
      { " ",        nil },
    }
  end

  -- ─── Line 2: Subtitle + layout ────────────────────────────────────────
  local line2_left = {
    { "  ",                    nil },
    { "── Neovim Edition ──", "CcaspHeaderSub" },
  }

  local line2_right = {
    { string.format(" %s Layout 1 ", icons.layout), "CcaspHeaderTab" },
  }

  -- Assemble with right-alignment
  local text1, hl1 = assemble_line(line1_left, line1_right, w)
  local text2, hl2 = assemble_line(line2_left, line2_right, w)

  -- Calculate display column positions for click detection (Neovide only)
  if is_neovide() then
    -- The right-side buttons are at the end of line 1
    -- We need their display column positions for mouse click matching
    local left_text_1 = build_line(line1_left)
    local left_w_1 = vim.fn.strdisplaywidth(left_text_1)
    local right_text_1 = build_line(line1_right)
    local right_w_1 = vim.fn.strdisplaywidth(right_text_1)
    local pad_w = math.max(1, w - left_w_1 - right_w_1)

    -- Buttons start after left text + padding (1-based columns)
    local cursor = left_w_1 + pad_w + 1

    -- Minimize button
    local min_text = " " .. icons.win_minimize .. " "
    local min_w = vim.fn.strdisplaywidth(min_text)
    state.min_btn_col_start = cursor
    state.min_btn_col_end = cursor + min_w - 1
    cursor = state.min_btn_col_end + 2 -- +1 for space separator, +1 for next start

    -- Maximize button — use same icon logic as the rendered text above
    local max_icon_2 = icons.win_maximize
    if user32 then
      pcall(function()
        if user32.IsZoomed(user32.GetForegroundWindow()) then
          max_icon_2 = icons.win_restore
        end
      end)
    elseif vim.g.neovide_fullscreen then
      max_icon_2 = icons.win_restore
    end
    local max_text = " " .. max_icon_2 .. " "
    local max_w = vim.fn.strdisplaywidth(max_text)
    state.max_btn_col_start = cursor
    state.max_btn_col_end = cursor + max_w - 1
    cursor = state.max_btn_col_end + 2

    -- Close button
    local close_text = " " .. icons.win_close .. " "
    local close_w = vim.fn.strdisplaywidth(close_text)
    state.close_btn_col_start = cursor
    state.close_btn_col_end = cursor + close_w - 1
  end

  -- Write content
  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, { text1, text2 })
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  local ns = vim.api.nvim_create_namespace("ccasp_header")
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)

  for _, h in ipairs(hl1) do
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, h[3], 0, h[1], h[2])
  end
  for _, h in ipairs(hl2) do
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, h[3], 1, h[1], h[2])
  end
end

return M
