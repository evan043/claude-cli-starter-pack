-- ccasp/appshell/footer.lua - Appshell Bottom Status Bar
-- Line 1: Session tabs (active + minimized) styled like header tabs
-- Line 2: Status indicators (mode, sync, version)
-- Positioned to the right of icon rail / flyout (aligned with content area)

local M = {}
local icons = require("ccasp.ui.icons")

-- Neovide detection (cached)
local function is_neovide()
  return vim.g.neovide == true
end

local state = {
  win = nil,
  buf = nil,
  taskbar_items = {},   -- { { title, type = "panel"|"session", ... }, ... }
  click_regions = {},   -- { { col_start, col_end, action, id }, ... } for line 1 mouse clicks
  grip_col_start = nil, -- display column range of resize grip on line 2 (Neovide only)
  grip_col_end = nil,
}

-- Build layer tab line with highlight spans and click regions
-- Returns: { text, highlights, click_regions } (same format as build_session_tabs)
local function build_layer_tabs()
  local text_parts = {}
  local highlights = {}
  local click_regions = {}
  local byte_pos = 1

  local layers_ok, layers = pcall(require, "ccasp.layers")
  if not layers_ok or not layers.is_initialized() then
    return { text = "", highlights = {}, click_regions = {} }
  end

  local all = layers.list()
  for _, layer in ipairs(all) do
    local tab_text = string.format(" %d %s (%d) ", layer.num, layer.name, layer.session_count)
    local col_start = byte_pos - 1
    local col_end = col_start + #tab_text
    local hl_group = layer.is_active and "CcaspLayerTabActive" or "CcaspLayerTab"
    table.insert(highlights, { hl_group, col_start, col_end })
    table.insert(click_regions, { col_start = col_start, col_end = col_end, action = "switch_layer", layer_num = layer.num })
    table.insert(text_parts, tab_text)
    byte_pos = byte_pos + #tab_text
  end

  return { text = table.concat(text_parts, ""), highlights = highlights, click_regions = click_regions }
end

-- Build session tab line with highlight spans and click regions
-- Returns: { text, highlights = { { group, col_start, col_end }, ... },
--            click_regions = { { col_start, col_end, action, id }, ... } }
local function build_session_tabs()
  local text_parts = {}
  local highlights = {}
  local click_regions = {}
  local byte_pos = 1 -- 1-indexed byte position in the final string

  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  local titlebar_ok, titlebar = pcall(require, "ccasp.session_titlebar")
  local current_win = vim.api.nvim_get_current_win()

  -- Active sessions (click → focus)
  if sessions_ok then
    local all = sessions.list()
    for _, session in ipairs(all) do
      local is_active = session.winid == current_win
      local status_icon = session.claude_running and icons.claude_on or icons.claude_off
      local primary = session.is_primary and (" " .. icons.primary) or ""
      local tab_text = string.format(" %s %s%s ", status_icon, session.name, primary)

      local col_start = byte_pos - 1
      local col_end = col_start + #tab_text
      local hl_group = is_active and "CcaspHeaderTabActive" or "CcaspHeaderTab"
      table.insert(highlights, { hl_group, col_start, col_end })
      table.insert(click_regions, { col_start = col_start, col_end = col_end, action = "focus", id = session.id })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + #tab_text
    end
  end

  -- Minimized sessions (click → restore)
  if titlebar_ok then
    local min_sessions = titlebar.get_minimized()
    for _, s in ipairs(min_sessions) do
      local tab_text = string.format(" %s %s ", icons.win_minimize, s.name)
      local col_start = byte_pos - 1
      local col_end = col_start + #tab_text
      local color_idx = s.color_idx or 1
      local hl_group = "CcaspWinbar" .. color_idx
      table.insert(highlights, { hl_group, col_start, col_end })
      table.insert(click_regions, { col_start = col_start, col_end = col_end, action = "restore_session", id = s.id })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + #tab_text
    end
  end

  -- Minimized panels (click → restore)
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok and taskbar.list then
    local panel_items = taskbar.list() or {}
    for _, item in ipairs(panel_items) do
      local tab_text = string.format(" %s %s ", icons.minimize, item.name)
      local col_start = byte_pos - 1
      local col_end = col_start + #tab_text
      table.insert(highlights, { "CcaspHeaderTab", col_start, col_end })
      table.insert(click_regions, { col_start = col_start, col_end = col_end, action = "restore_panel", id = item.id, index = item.index })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + #tab_text
    end
  end

  if #text_parts == 0 then
    return { text = " No sessions", highlights = { { "Comment", 0, 12 } }, click_regions = {} }
  end

  return { text = table.concat(text_parts, ""), highlights = highlights, click_regions = click_regions }
end

-- Render footer content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local ns = vim.api.nvim_create_namespace("ccasp_footer")

  -- Left padding: footer spans full width but content starts after icon rail / flyout
  local zone = require("ccasp.appshell").get_zone_bounds("footer")
  local content_col = zone and zone.content_col or 0
  local left_pad = string.rep(" ", content_col)

  -- Line 1: Layer tabs (left) │ Session tabs (right)
  local layer_tabs = build_layer_tabs()
  local session_tabs = build_session_tabs()

  local separator = ""
  if layer_tabs.text ~= "" and session_tabs.text ~= "" then
    separator = " " .. icons.pipe .. " "
  end

  local line1 = left_pad .. layer_tabs.text .. separator .. session_tabs.text

  -- Build combined click regions (shifted by left padding)
  state.click_regions = {}
  local layer_offset = content_col
  for _, region in ipairs(layer_tabs.click_regions or {}) do
    table.insert(state.click_regions, {
      col_start = region.col_start + layer_offset,
      col_end = region.col_end + layer_offset,
      action = region.action,
      layer_num = region.layer_num,
    })
  end

  local session_offset = content_col + #layer_tabs.text + #separator
  for _, region in ipairs(session_tabs.click_regions or {}) do
    table.insert(state.click_regions, {
      col_start = region.col_start + session_offset,
      col_end = region.col_end + session_offset,
      action = region.action,
      id = region.id,
      index = region.index,
    })
  end

  -- Line 2: Status indicators
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local status = ccasp_ok and ccasp.get_status() or {
    version = "?", permissions_mode = "auto", update_mode = "manual",
    protected_count = 0, sync_status = "unknown",
  }

  local perm_icon = icons.perm_mode(status.permissions_mode)
  local update_icon = icons.update_mode(status.update_mode)
  local sync_icon = status.sync_status == "synced" and icons.sync_ok or icons.sync_warn

  local terminal_ok, terminal = pcall(require, "ccasp.terminal")
  local claude_icon = (terminal_ok and terminal.is_claude_running()) and icons.claude_on or icons.claude_off

  local status_text = string.format(
    "%s %s %s %s %s %s %d %s %s Claude %s Sync: %s %s v%s ",
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    icons.pipe,
    update_icon,
    status.update_mode:sub(1, 1):upper() .. status.update_mode:sub(2),
    icons.pipe,
    status.protected_count,
    icons.pipe,
    claude_icon,
    icons.pipe,
    sync_icon,
    icons.pipe,
    status.version
  )

  -- Resize grip (Neovide only): appended at the far right of line 2
  local grip_text = ""
  if is_neovide() then
    grip_text = " " .. icons.resize_grip .. " "
  end

  -- Right-align status text + grip within footer width
  local total_w = zone and zone.width or vim.o.columns
  local status_w = vim.fn.strdisplaywidth(status_text)
  local grip_w = vim.fn.strdisplaywidth(grip_text)
  local pad = math.max(0, total_w - status_w - grip_w)
  local line2 = string.rep(" ", pad) .. status_text .. grip_text

  -- Track grip column range for click detection (0-indexed byte offset)
  if is_neovide() and grip_w > 0 then
    state.grip_col_start = pad + #status_text
    state.grip_col_end = state.grip_col_start + #grip_text
  else
    state.grip_col_start = nil
    state.grip_col_end = nil
  end

  local lines = { line1, line2 }

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)

  -- Line 1: Per-tab highlights from layer tabs + session tabs (shifted appropriately)
  for _, hl in ipairs(layer_tabs.highlights) do
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, hl[1], 0, hl[2] + layer_offset, hl[3] + layer_offset)
  end
  -- Separator highlight
  if separator ~= "" then
    local sep_start = content_col + #layer_tabs.text
    local sep_end = sep_start + #separator
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFooterSep", 0, sep_start, sep_end)
  end
  for _, hl in ipairs(session_tabs.highlights) do
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, hl[1], 0, hl[2] + session_offset, hl[3] + session_offset)
  end

  -- Line 2: Status line (light greyish blue, same as "No sessions")
  pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "Comment", 1, 0, -1)

  -- Resize grip highlight (slightly brighter so it's discoverable)
  if state.grip_col_start and state.grip_col_end then
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspHeaderSub", 1, state.grip_col_start, state.grip_col_end)
  end
end

-- Sync minimized items and rebuild taskbar_items for number-key restore
function M.sync_taskbar()
  state.taskbar_items = {}

  -- Gather all items in order: active sessions, minimized sessions, minimized panels
  -- (only minimized items are restorable via number keys)
  local titlebar_ok, titlebar = pcall(require, "ccasp.session_titlebar")
  if titlebar_ok then
    local min_sessions = titlebar.get_minimized()
    for _, s in ipairs(min_sessions) do
      table.insert(state.taskbar_items, {
        title = s.name,
        type = "session",
        id = s.id,
        color_idx = s.color_idx,
      })
    end
  end

  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok and taskbar.list then
    local panel_items = taskbar.list() or {}
    for _, item in ipairs(panel_items) do
      table.insert(state.taskbar_items, {
        title = item.name,
        type = "panel",
        panel_index = item.index,
        panel_id = item.id,
      })
    end
  end
end

-- Handle mouse click on line 1 (session tabs) or line 2 (resize grip)
-- Public: called directly by session_titlebar's t/n <LeftMouse> handler
-- when clicking the footer from a terminal buffer (avoids needing two clicks).
function M.handle_click()
  local mouse = vim.fn.getmousepos()
  if not mouse then return end

  -- Line 2: check resize grip (Neovide only)
  if mouse.line == 2 and is_neovide() and state.grip_col_start and state.grip_col_end then
    local col = mouse.column - 1 -- 0-indexed
    if col >= state.grip_col_start and col < state.grip_col_end then
      local nv_ok, nv = pcall(require, "ccasp.neovide")
      if nv_ok and nv.ffi_available() then
        nv.win_resize_start("bottomright")
      end
      return
    end
  end

  -- Line 1: session tab clicks
  if mouse.line ~= 1 then return end

  -- mouse.column is 1-indexed display column; click_regions use 0-indexed byte offsets
  local col = mouse.column - 1

  for _, region in ipairs(state.click_regions) do
    if col >= region.col_start and col < region.col_end then
      if region.action == "switch_layer" then
        -- Switch to layer
        local layers_ok, layers = pcall(require, "ccasp.layers")
        if layers_ok then
          layers.switch_to(region.layer_num)
        end
      elseif region.action == "focus" then
        -- Focus active session
        local sessions_ok, sessions = pcall(require, "ccasp.sessions")
        if sessions_ok then
          sessions.focus(region.id)
        end
      elseif region.action == "restore_session" then
        -- Restore minimized session
        local titlebar_ok, titlebar = pcall(require, "ccasp.session_titlebar")
        if titlebar_ok then
          titlebar.restore(region.id)
        end
        M.sync_taskbar()
        -- render() is called by titlebar.restore → footer.refresh()
      elseif region.action == "restore_panel" then
        -- Restore minimized panel
        local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
        if tb_ok then
          taskbar.restore_by_index(region.index)
        end
        M.sync_taskbar()
      end
      return
    end
  end
end

-- Setup keymaps for footer
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  -- Mouse click on session tabs (line 1) or resize grip (line 2)
  vim.keymap.set("n", "<LeftMouse>", function() M.handle_click() end, opts)

  -- Number keys to switch layers (1-9)
  for i = 1, 9 do
    vim.keymap.set("n", tostring(i), function()
      local layers_ok, layers = pcall(require, "ccasp.layers")
      if layers_ok and layers.is_initialized() then
        layers.switch_to(i)
      end
    end, opts)
  end
end

-- Open footer
function M.open(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then return end

  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  state.win = vim.api.nvim_open_win(state.buf, false, {
    relative = "editor",
    row = bounds.row,
    col = bounds.col,
    width = bounds.width,
    height = bounds.height,
    style = "minimal",
    focusable = true,
    zindex = 50,
    border = "none",
  })

  vim.wo[state.win].winhighlight = "Normal:CcaspFooterBg,EndOfBuffer:CcaspFooterBg"
  vim.wo[state.win].wrap = false
  vim.wo[state.win].cursorline = false

  -- Sync taskbar items
  M.sync_taskbar()

  -- Sandbox buffer to prevent Neovim errors on unmapped keys
  local helpers_ok, helpers = pcall(require, "ccasp.panels.helpers")
  if helpers_ok then
    helpers.sandbox_buffer(state.buf)
  end

  setup_keymaps()
  render()
end

-- Close footer
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil
end

-- Resize footer
function M.resize(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = bounds.row,
      col = bounds.col,
      width = bounds.width,
      height = bounds.height,
    })
    render()
  end
end

-- Refresh footer content
function M.refresh()
  M.sync_taskbar()
  render()
end

-- Restore a minimized item by index
function M.restore_item(index)
  local item = state.taskbar_items[index]
  if not item then return end

  if item.type == "session" then
    local titlebar_ok, titlebar = pcall(require, "ccasp.session_titlebar")
    if titlebar_ok then
      titlebar.restore(item.id)
    end
  else
    local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
    if tb_ok then
      taskbar.restore_by_index(item.panel_index)
    end
  end

  M.sync_taskbar()
  render()
end

-- Get footer window
function M.get_win()
  return state.win
end

return M
