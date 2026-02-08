-- ccasp/neovide.lua - Neovide GUI integration
-- Detects Neovide and applies GUI-specific settings (font, padding, cursor)
-- Provides quit confirmation modal for standalone app experience

local M = {}
local icons = require("ccasp.ui.icons")

-- ─── Detection ─────────────────────────────────────────────────────────────

function M.is_neovide()
  return vim.g.neovide == true
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
  local font = opts.font or "JetBrainsMono NF:h12"
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

  -- Fill ~85% of the screen: large enough to be useful, small enough to not cover taskbar
  -- Neovide respects vim.o.lines/columns as the grid size; the pixel size depends on font
  vim.o.lines = 55
  vim.o.columns = 200

  -- Hide native title bar for standalone app experience
  -- (CCASP header provides its own close/minimize/maximize buttons)
  vim.g.neovide_title_bar = ""

  -- Cursor animation (subtle)
  vim.g.neovide_cursor_animation_length = 0.06
  vim.g.neovide_cursor_trail_size = 0.3

  -- Clean typing UX
  vim.g.neovide_hide_mouse_when_typing = true

  -- Global quit keybinds (Neovide only)
  local keyopts = { noremap = true, silent = true }

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
