local M = {}

-- State
local state = {
  win = nil,
  buf = nil,
  timer = nil,
  animation_frame = 0,
}

-- Logo lines - large ASCII block art, centered
-- No nerd font dependency - pure Unicode box-drawing + block characters
local logo_lines = {
  "",
  "  ██████╗  ██████╗  █████╗  ███████╗ ██████╗  ",
  " ██╔════╝ ██╔════╝ ██╔══██╗ ██╔════╝ ██╔══██╗ ",
  " ██║      ██║      ███████║ ███████╗ ██████╔╝ ",
  " ██║      ██║      ██╔══██║ ╚════██║ ██╔═══╝  ",
  " ╚██████╗ ╚██████╗ ██║  ██║ ███████║ ██║      ",
  "  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝      ",
  "",
  "    Claude CLI · Advanced Starter Pack",
  "           ── Neovim Edition ──",
  "",
}

-- Line indices (0-based) for highlight targeting
local ART_FIRST = 1   -- first block art line
local ART_LAST  = 6   -- last block art line
local SUB_FIRST = 8   -- first subtitle line
local SUB_LAST  = 9   -- last subtitle line

-- Animation highlight groups (glow in → settle)
local animation_highlights = {
  "CcaspLogoGlow1",    -- Frame 1: dim blue
  "CcaspLogoGlow2",    -- Frame 2: medium blue
  "CcaspLogoGlow3",    -- Frame 3: bright blue
  "CcaspLogoPrimary",  -- Frame 4: settled bright blue
}

-- Animation frame duration
local FRAME_DURATION_MS = 150

-- Content width (display cells) for the widest line
local CONTENT_WIDTH = 48

---Setup the logo module
function M.setup()
  vim.api.nvim_create_autocmd("VimResized", {
    group = vim.api.nvim_create_augroup("CcaspLogoResize", { clear = true }),
    callback = function()
      if M.is_visible() then
        M.reposition()
      end
    end,
  })
end

---Calculate centered position for the floating window
---@return table Window config
local function get_window_config()
  local width = CONTENT_WIDTH
  local height = #logo_lines

  local editor_w = vim.o.columns
  local editor_h = vim.o.lines

  -- Center on screen
  local col = math.max(0, math.floor((editor_w - width - 2) / 2))
  local row = math.max(0, math.floor((editor_h - height - 2) / 2))

  return {
    relative = "editor",
    width = width,
    height = height,
    col = col,
    row = row,
    style = "minimal",
    border = "rounded",
    focusable = false,
    zindex = 200,
  }
end

---Apply highlight to the buffer for the current animation frame
---@param buf number Buffer handle
---@param hl_group string Highlight group for block art
local function apply_highlight(buf, hl_group)
  vim.api.nvim_buf_clear_namespace(buf, -1, 0, -1)

  -- Block art lines get the animated glow color
  for i = ART_FIRST, ART_LAST do
    vim.api.nvim_buf_add_highlight(buf, -1, hl_group, i, 0, -1)
  end

  -- Subtitle lines get a constant accent color
  for i = SUB_FIRST, SUB_LAST do
    vim.api.nvim_buf_add_highlight(buf, -1, "CcaspAccent", i, 0, -1)
  end

  -- Overlay border characters (╔╗╚╝═║╰╯╭╮─) with dim border highlight
  for i = ART_FIRST, ART_LAST do
    local line = logo_lines[i + 1]
    if line then
      local byte_pos = 0
      for char in line:gmatch(utf8 and utf8.charpattern or "[%z\1-\127\194-\244][\128-\191]*") do
        local byte_len = #char
        if char:match("[╔╗╚╝═║]") then
          vim.api.nvim_buf_add_highlight(buf, -1, "CcaspLogoBorder", i, byte_pos, byte_pos + byte_len)
        end
        byte_pos = byte_pos + byte_len
      end
    end
  end
end

---Advance animation to next frame
local function animate_frame()
  if not M.is_visible() then
    return
  end

  state.animation_frame = state.animation_frame + 1

  if state.animation_frame <= #animation_highlights then
    local hl_group = animation_highlights[state.animation_frame]
    apply_highlight(state.buf, hl_group)

    if state.animation_frame < #animation_highlights then
      state.timer = vim.defer_fn(animate_frame, FRAME_DURATION_MS)
    end
  end
end

---Show the logo with animation
function M.show()
  if M.is_visible() then
    return
  end

  -- Create buffer
  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].bufhidden = "wipe"

  -- Set logo content
  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, logo_lines)
  vim.bo[state.buf].modifiable = false

  -- Create centered floating window with rounded border
  local config = get_window_config()
  state.win = vim.api.nvim_open_win(state.buf, false, config)

  -- Theme the window and border
  vim.wo[state.win].winhl = "Normal:CcaspPanelBg,FloatBorder:CcaspBorderGlow"
  vim.wo[state.win].wrap = false
  vim.wo[state.win].cursorline = false

  -- Start glow animation
  state.animation_frame = 0
  animate_frame()
end

---Hide the logo
function M.hide()
  if state.timer then
    pcall(function() state.timer:close() end)
    state.timer = nil
  end

  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end

  if state.buf and vim.api.nvim_buf_is_valid(state.buf) then
    vim.api.nvim_buf_delete(state.buf, { force = true })
  end

  state.win = nil
  state.buf = nil
  state.animation_frame = 0
end

---Check if logo is currently visible
---@return boolean
function M.is_visible()
  return state.win ~= nil and vim.api.nvim_win_is_valid(state.win)
end

---Reposition the logo window (called on VimResized)
function M.reposition()
  if not M.is_visible() then
    return
  end

  local config = get_window_config()
  vim.api.nvim_win_set_config(state.win, config)
end

return M
