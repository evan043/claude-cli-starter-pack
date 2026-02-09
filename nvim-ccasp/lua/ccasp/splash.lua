-- ccasp/splash.lua - Splash screen shown when all sessions are minimized
-- Renders centered CCASP ASCII art in the content window

local M = {}

-- State
M.bufnr = nil      -- splash buffer handle (reusable)
M.active_win = nil  -- window currently showing splash

-- ASCII art lines
local ASCII_ART = {
  "   ██████╗ ██████╗ █████╗ ███████╗██████╗ ",
  "  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗",
  "  ██║     ██║     ███████║███████╗██████╔╝ ",
  "  ██║     ██║     ██╔══██║╚════██║██╔═══╝  ",
  "  ╚██████╗╚██████╗██║  ██║███████║██║      ",
  "   ╚═════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝     ",
}

local SUBTITLE = "Claude CLI Advanced Starter Pack"
local HINT = "(Press Tab to open Command Panel and start a New Session)"

-- Get or create the splash buffer (lazy, reusable)
function M.get_or_create_buf()
  if M.bufnr and vim.api.nvim_buf_is_valid(M.bufnr) then
    return M.bufnr
  end

  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[M.bufnr].buftype = "nofile"
  vim.bo[M.bufnr].bufhidden = "hide"  -- reusable, don't wipe
  vim.bo[M.bufnr].swapfile = false
  pcall(vim.api.nvim_buf_set_name, M.bufnr, "ccasp://splash")

  return M.bufnr
end

-- Render centered content into the buffer for a given window size
local function render_content(winid)
  local buf = M.get_or_create_buf()
  local win_h = vim.api.nvim_win_get_height(winid)
  local win_w = vim.api.nvim_win_get_width(winid)

  -- Calculate vertical centering
  -- Content: art (6 lines) + blank + subtitle + blank + hint = 10 lines
  local content_height = #ASCII_ART + 4
  local top_pad = math.max(0, math.floor((win_h - content_height) / 2))

  local lines = {}

  -- Top padding
  for _ = 1, top_pad do
    table.insert(lines, "")
  end

  -- ASCII art (centered horizontally)
  for _, art_line in ipairs(ASCII_ART) do
    local art_w = vim.fn.strdisplaywidth(art_line)
    local left_pad = math.max(0, math.floor((win_w - art_w) / 2))
    table.insert(lines, string.rep(" ", left_pad) .. art_line)
  end

  -- Blank line
  table.insert(lines, "")

  -- Subtitle (centered)
  local sub_pad = math.max(0, math.floor((win_w - #SUBTITLE) / 2))
  table.insert(lines, string.rep(" ", sub_pad) .. SUBTITLE)

  -- Blank line
  table.insert(lines, "")

  -- Hint (centered)
  local hint_pad = math.max(0, math.floor((win_w - #HINT) / 2))
  table.insert(lines, string.rep(" ", hint_pad) .. HINT)

  -- Fill remaining lines
  local remaining = win_h - #lines
  for _ = 1, remaining do
    table.insert(lines, "")
  end

  -- Write to buffer
  vim.bo[buf].modifiable = true
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false

  -- Apply highlights
  local ns = vim.api.nvim_create_namespace("ccasp_splash")
  vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)

  -- Highlight ASCII art lines
  for i = 1, #ASCII_ART do
    local line_idx = top_pad + i - 1
    if line_idx < #lines then
      vim.api.nvim_buf_add_highlight(buf, ns, "CcaspOnboardingTitle", line_idx, 0, -1)
    end
  end

  -- Highlight subtitle
  local subtitle_idx = top_pad + #ASCII_ART + 1
  if subtitle_idx < #lines then
    vim.api.nvim_buf_add_highlight(buf, ns, "CcaspOnboardingTitle", subtitle_idx, 0, -1)
  end

  -- Highlight hint
  local hint_idx = top_pad + #ASCII_ART + 3
  if hint_idx < #lines then
    vim.api.nvim_buf_add_highlight(buf, ns, "Comment", hint_idx, 0, -1)
  end

  -- Sandbox buffer to prevent editing
  local helpers_ok, helpers = pcall(require, "ccasp.panels.helpers")
  if helpers_ok then
    helpers.sandbox_buffer(buf)
  end
end

-- Setup keymaps on splash buffer so users can interact from splash screen
local function setup_splash_keymaps(buf)
  local opts = { buffer = buf, nowait = true, silent = true }

  -- Tab: toggle flyout (matches terminal-mode Tab behavior)
  vim.keymap.set("n", "<Tab>", function()
    local flyout_ok, flyout = pcall(require, "ccasp.appshell.flyout")
    if flyout_ok then
      flyout.toggle()
    end
  end, opts)

  -- LeftMouse: dispatch cross-window clicks to footer for minimized session restore
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local current_win = vim.api.nvim_get_current_win()

    if mouse.winid ~= 0 and mouse.winid ~= current_win then
      -- Footer click: dispatch directly
      local ft_ok, footer = pcall(require, "ccasp.appshell.footer")
      if ft_ok and footer.get_win and footer.get_win() == mouse.winid then
        footer.handle_click(mouse)
        return
      end
      -- Other cross-window click: focus target
      vim.schedule(function()
        if vim.api.nvim_win_is_valid(mouse.winid) then
          vim.api.nvim_set_current_win(mouse.winid)
        end
      end)
    end
  end, opts)
end

-- Show splash in the given window (swaps buffer)
function M.show(winid)
  if not winid or not vim.api.nvim_win_is_valid(winid) then return end

  local buf = M.get_or_create_buf()

  -- Swap the window's buffer to splash
  vim.api.nvim_win_set_buf(winid, buf)

  -- Clear winbar (no session title on splash)
  vim.wo[winid].winbar = ""

  -- Render content centered for this window
  render_content(winid)

  -- Setup keymaps AFTER sandbox so they override sandbox nops
  setup_splash_keymaps(buf)

  M.active_win = winid

  -- Exit terminal/insert mode if active
  local mode = vim.api.nvim_get_mode().mode
  if mode == "t" or mode == "i" then
    vim.cmd("stopinsert")
  end
end

-- Hide splash from window, restore terminal buffer
function M.hide(winid, bufnr)
  if not M.active_win then return end

  winid = winid or M.active_win

  if winid and vim.api.nvim_win_is_valid(winid) then
    if bufnr and vim.api.nvim_buf_is_valid(bufnr) then
      vim.api.nvim_win_set_buf(winid, bufnr)
    end
  end

  M.active_win = nil
end

-- Check if splash is currently showing
function M.is_showing()
  return M.active_win ~= nil
    and vim.api.nvim_win_is_valid(M.active_win)
    and vim.api.nvim_buf_is_valid(M.bufnr or -1)
    and vim.api.nvim_win_get_buf(M.active_win) == M.bufnr
end

-- Get the window splash is displayed in
function M.get_win()
  return M.active_win
end

return M
