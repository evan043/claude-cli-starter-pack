local M = {}

-- State
local state = {
  win = nil,
  buf = nil,
  timer = nil,
  animation_frame = 0,
}

-- Logo lines
local logo_lines = {
  " ╔══════════╗ ",
  " ║  CCASP   ║ ",
  " ║ 󰚩 v1.4  ║ ",
  " ╚══════════╝ ",
}

-- Animation highlight groups
local animation_highlights = {
  "CcaspLogoGlow1",    -- Frame 1: dim
  "CcaspLogoGlow2",    -- Frame 2: medium
  "CcaspLogoGlow3",    -- Frame 3: bright
  "CcaspLogoPrimary",  -- Frame 4: settled
}

-- Animation frame duration
local FRAME_DURATION_MS = 150

---Setup the logo module
function M.setup()
  -- Create autocommand for window resize
  vim.api.nvim_create_autocmd("VimResized", {
    group = vim.api.nvim_create_augroup("CcaspLogoResize", { clear = true }),
    callback = function()
      if M.is_visible() then
        M.reposition()
      end
    end,
  })
end

---Calculate top-right position for the floating window
---@return table Window config
local function get_window_config()
  local width = #logo_lines[1]
  local height = #logo_lines

  -- Get editor dimensions
  local ui = vim.api.nvim_list_uis()[1]
  local editor_width = ui and ui.width or vim.o.columns

  -- Position in top-right corner with small padding
  local col = editor_width - width - 2
  local row = 0

  return {
    relative = "editor",
    width = width,
    height = height,
    col = col,
    row = row,
    style = "minimal",
    border = "none",
    focusable = false,
    zindex = 200,
  }
end

---Apply highlight to the entire buffer
---@param buf number Buffer handle
---@param hl_group string Highlight group name
local function apply_highlight(buf, hl_group)
  -- Clear existing highlights
  vim.api.nvim_buf_clear_namespace(buf, -1, 0, -1)

  -- Apply highlight to all lines
  for i = 0, #logo_lines - 1 do
    vim.api.nvim_buf_add_highlight(buf, -1, hl_group, i, 0, -1)
  end

  -- Apply border highlight to border characters
  for i = 0, #logo_lines - 1 do
    local line = logo_lines[i + 1]
    for j = 0, #line - 1 do
      local char = line:sub(j + 1, j + 1)
      if char:match("[╔╗╚╝═║]") then
        vim.api.nvim_buf_add_highlight(buf, -1, "CcaspLogoBorder", i, j, j + 1)
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

    -- Schedule next frame if not the last one
    if state.animation_frame < #animation_highlights then
      state.timer = vim.defer_fn(animate_frame, FRAME_DURATION_MS)
    end
  end
end

---Show the logo with animation
function M.show()
  -- Don't create duplicate windows
  if M.is_visible() then
    return
  end

  -- Create buffer
  state.buf = vim.api.nvim_create_buf(false, true)

  -- Set buffer options
  vim.api.nvim_buf_set_option(state.buf, "bufhidden", "wipe")
  vim.api.nvim_buf_set_option(state.buf, "modifiable", false)

  -- Set logo content
  vim.api.nvim_buf_set_option(state.buf, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, logo_lines)
  vim.api.nvim_buf_set_option(state.buf, "modifiable", false)

  -- Create floating window
  local config = get_window_config()
  state.win = vim.api.nvim_open_win(state.buf, false, config)

  -- Set window options
  vim.api.nvim_win_set_option(state.win, "winhl", "Normal:Normal")
  vim.api.nvim_win_set_option(state.win, "wrap", false)
  vim.api.nvim_win_set_option(state.win, "cursorline", false)

  -- Start animation
  state.animation_frame = 0
  animate_frame()
end

---Hide the logo
function M.hide()
  -- Cancel animation timer if running
  if state.timer then
    state.timer:close()
    state.timer = nil
  end

  -- Close window
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end

  -- Delete buffer
  if state.buf and vim.api.nvim_buf_is_valid(state.buf) then
    vim.api.nvim_buf_delete(state.buf, { force = true })
  end

  -- Reset state
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
