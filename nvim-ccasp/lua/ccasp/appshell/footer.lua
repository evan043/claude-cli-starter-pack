-- ccasp/appshell/footer.lua - Appshell Bottom Status Bar
-- Stacked layout: one row per layer (layer name + session tabs), plus a status row
-- Footer grows/shrinks dynamically as layers are created/closed
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
  taskbar_items = {},           -- { { title, type = "panel"|"session", ... }, ... }
  click_regions_by_line = {},   -- { [line_num] = { { col_start, col_end, action, ... }, ... } }
  status_line_num = nil,        -- which buffer line is the status row (1-indexed)
  grip_col_start = nil,         -- display column range of resize grip on status line (Neovide only)
  grip_col_end = nil,
}

-- Build session tabs for the ACTIVE layer (live data from sessions module)
-- Returns: { text, highlights, click_regions }
local function build_active_session_tabs()
  local text_parts = {}
  local highlights = {}
  local click_regions = {}
  local byte_pos = 1
  local display_pos = 0

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

      local tab_bytes = #tab_text
      local tab_display = vim.fn.strdisplaywidth(tab_text)
      local byte_start = byte_pos - 1
      local activity = sessions.get_activity and sessions.get_activity(session.id) or "idle"
      local hl_group
      if is_active then
        -- Active tab: underline indicator preserves status color visibility
        if activity == "working" then
          hl_group = "CcaspHeaderTabActiveWorking"
        elseif activity == "done" then
          hl_group = "CcaspHeaderTabActiveDone"
        else
          hl_group = "CcaspHeaderTabActiveIdle"
        end
      else
        if activity == "working" then
          hl_group = "CcaspHeaderTabWorking"
        elseif activity == "done" then
          hl_group = "CcaspHeaderTabDone"
        else
          hl_group = "CcaspHeaderTab"
        end
      end
      table.insert(highlights, { hl_group, byte_start, byte_start + tab_bytes })
      table.insert(click_regions, { col_start = display_pos, col_end = display_pos + tab_display, action = "focus", id = session.id })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + tab_bytes
      display_pos = display_pos + tab_display
    end
  end

  -- Minimized sessions (click → restore)
  if titlebar_ok then
    local min_sessions = titlebar.get_minimized()
    for _, s in ipairs(min_sessions) do
      local tab_text = string.format(" %s %s ", icons.win_minimize, s.name)
      local tab_bytes = #tab_text
      local tab_display = vim.fn.strdisplaywidth(tab_text)
      local byte_start = byte_pos - 1
      local hl_group = "CcaspHeaderTab"  -- Minimized: inactive style, no bg color
      table.insert(highlights, { hl_group, byte_start, byte_start + tab_bytes })
      table.insert(click_regions, { col_start = display_pos, col_end = display_pos + tab_display, action = "restore_session", id = s.id })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + tab_bytes
      display_pos = display_pos + tab_display
    end
  end

  -- Minimized panels (click → restore)
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok and taskbar.list then
    local panel_items = taskbar.list() or {}
    for _, item in ipairs(panel_items) do
      local tab_text = string.format(" %s %s ", icons.minimize, item.name)
      local tab_bytes = #tab_text
      local tab_display = vim.fn.strdisplaywidth(tab_text)
      local byte_start = byte_pos - 1
      table.insert(highlights, { "CcaspHeaderTab", byte_start, byte_start + tab_bytes })
      table.insert(click_regions, { col_start = display_pos, col_end = display_pos + tab_display, action = "restore_panel", id = item.id, index = item.index })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + tab_bytes
      display_pos = display_pos + tab_display
    end
  end

  if #text_parts == 0 then
    return { text = " No sessions", highlights = { { "Comment", 0, 12 } }, click_regions = {} }
  end

  return { text = table.concat(text_parts, ""), highlights = highlights, click_regions = click_regions }
end

-- Build session tabs for an INACTIVE layer (from snapshot data)
-- Uses global activity registry for LIVE status colors (not frozen snapshot)
-- Returns: { text, highlights, click_regions }
local function build_inactive_session_tabs(layer_data)
  local text_parts = {}
  local highlights = {}
  local click_regions = {}
  local byte_pos = 1
  local display_pos = 0

  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  local sess_data = layer_data.sessions_data
  local tb_data = layer_data.titlebar_data

  if not sess_data or not sess_data.session_order then
    return { text = " No sessions", highlights = { { "Comment", 0, 12 } }, click_regions = {} }
  end

  for _, id in ipairs(sess_data.session_order) do
    local session = sess_data.sessions[id]
    if session then
      -- Show status icon based on live activity (not snapshot)
      local activity = (sessions_ok and sessions.get_global_activity)
        and sessions.get_global_activity(id) or "idle"
      local status_icon = session.claude_running and icons.claude_on or icons.claude_off
      local tab_text = string.format(" %s %s ", status_icon, session.name or "Claude")
      local tab_bytes = #tab_text
      local tab_display = vim.fn.strdisplaywidth(tab_text)
      local byte_start = byte_pos - 1
      -- Live status colors for inactive layer sessions
      local hl_group
      if activity == "working" then
        hl_group = "CcaspHeaderTabWorking"
      elseif activity == "done" then
        hl_group = "CcaspHeaderTabDone"
      else
        hl_group = "CcaspHeaderTab"
      end
      table.insert(highlights, { hl_group, byte_start, byte_start + tab_bytes })
      -- Clicking a session on an inactive layer switches to that layer
      table.insert(click_regions, { col_start = display_pos, col_end = display_pos + tab_display, action = "switch_layer_and_focus", layer_num = nil, session_id = id })
      table.insert(text_parts, tab_text)
      byte_pos = byte_pos + tab_bytes
      display_pos = display_pos + tab_display
    end
  end

  if #text_parts == 0 then
    return { text = " No sessions", highlights = { { "Comment", 0, 12 } }, click_regions = {} }
  end

  return { text = table.concat(text_parts, ""), highlights = highlights, click_regions = click_regions }
end

-- Build one footer row for a layer: [layer name tab] [⇅] │ [session tabs...]
-- Returns: { text, highlights, click_regions } (click_regions already offset by content_col)
local function build_layer_row(layer_info, layer_data, content_col)
  local left_pad = string.rep(" ", content_col)

  -- Layer name tab
  local layer_tab = string.format(" %s ", layer_info.name)
  local layer_bytes = #layer_tab
  local layer_display = vim.fn.strdisplaywidth(layer_tab)
  local hl_group = layer_info.is_active and "CcaspLayerTabActive" or "CcaspLayerTab"

  -- Reorder button: only for active layer with 2+ sessions
  local reorder_btn = ""
  local reorder_bytes = 0
  local reorder_display = 0
  local show_reorder = false
  if layer_info.is_active and layer_info.session_count and layer_info.session_count >= 2 then
    show_reorder = true
    reorder_btn = " " .. icons.reorder .. " "
    reorder_bytes = #reorder_btn
    reorder_display = vim.fn.strdisplaywidth(reorder_btn)
  end

  -- Separator
  local separator = " " .. icons.pipe .. " "
  local sep_bytes = #separator

  -- Session tabs
  local session_tabs
  if layer_info.is_active then
    session_tabs = build_active_session_tabs()
  else
    session_tabs = build_inactive_session_tabs(layer_data)
  end

  local text = left_pad .. layer_tab .. reorder_btn .. separator .. session_tabs.text

  -- Highlights (byte offsets into the full line)
  local highlights = {}
  local layer_byte_start = content_col
  table.insert(highlights, { hl_group, layer_byte_start, layer_byte_start + layer_bytes })
  local reorder_byte_start = layer_byte_start + layer_bytes
  if show_reorder then
    table.insert(highlights, { "CcaspHeaderSub", reorder_byte_start, reorder_byte_start + reorder_bytes })
  end
  local sep_byte_start = reorder_byte_start + reorder_bytes
  table.insert(highlights, { "CcaspFooterSep", sep_byte_start, sep_byte_start + sep_bytes })
  local session_byte_offset = sep_byte_start + sep_bytes
  for _, hl in ipairs(session_tabs.highlights) do
    table.insert(highlights, { hl[1], hl[2] + session_byte_offset, hl[3] + session_byte_offset })
  end

  -- Click regions (display column offsets)
  local click_regions = {}
  -- Layer name click region
  table.insert(click_regions, {
    col_start = content_col,
    col_end = content_col + layer_display,
    action = "switch_layer",
    layer_num = layer_info.num,
  })
  -- Reorder button click region
  if show_reorder then
    table.insert(click_regions, {
      col_start = content_col + layer_display,
      col_end = content_col + layer_display + reorder_display,
      action = "reorder_sessions",
    })
  end
  -- Session click regions
  local session_display_offset = content_col + layer_display + reorder_display + vim.fn.strdisplaywidth(separator)
  for _, region in ipairs(session_tabs.click_regions) do
    local r = {
      col_start = region.col_start + session_display_offset,
      col_end = region.col_end + session_display_offset,
      action = region.action,
      id = region.id,
      index = region.index,
    }
    -- Carry through layer_num for inactive layer session clicks
    if region.action == "switch_layer_and_focus" then
      r.layer_num = layer_info.num
      r.session_id = region.session_id
    end
    table.insert(click_regions, r)
  end

  return { text = text, highlights = highlights, click_regions = click_regions }
end

-- Check if footer height needs to change, and trigger resize if so
local function check_height_change(required_height)
  local appshell = require("ccasp.appshell")

  -- Cap footer at 30% of screen to prevent consuming too much space
  local max_height = math.max(2, math.floor(vim.o.lines * 0.3))
  local new_height = math.min(required_height, max_height)

  if appshell.config.footer.height == new_height then return end

  appshell.config.footer.height = new_height
  appshell.calculate_zones()

  -- Resize footer float
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    local zone = appshell.state.zones.footer
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = zone.row,
      col = zone.col,
      width = zone.width,
      height = zone.height,
    })
  end

  -- Resize content area (updates bottom spacer + session grid)
  local content_ok, content = pcall(require, "ccasp.appshell.content")
  if content_ok then
    content.resize(appshell.state.zones.content)
  end
end

-- Render footer content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local ns = vim.api.nvim_create_namespace("ccasp_footer")

  -- Left padding: footer spans full width but content starts after icon rail / flyout
  local zone = require("ccasp.appshell").get_zone_bounds("footer")
  local content_col = zone and zone.content_col or 0

  local layers_ok, layers = pcall(require, "ccasp.layers")
  local all_layers = (layers_ok and layers.is_initialized()) and layers.list() or {}

  -- Build one row per layer
  local lines = {}
  local line_highlights = {} -- { [line_num] = { highlights } }
  state.click_regions_by_line = {}

  for _, layer_info in ipairs(all_layers) do
    local layer_data = layers.get(layer_info.num) or {}
    local row = build_layer_row(layer_info, layer_data, content_col)
    table.insert(lines, row.text)
    local line_num = #lines
    line_highlights[line_num] = row.highlights
    state.click_regions_by_line[line_num] = row.click_regions
  end

  -- Fallback: if no layers, show single empty row
  if #lines == 0 then
    local left_pad = string.rep(" ", content_col)
    table.insert(lines, left_pad .. " No layers")
    line_highlights[1] = { { "Comment", content_col, content_col + 10 } }
    state.click_regions_by_line[1] = {}
  end

  -- Status line (always last)
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

  -- Resize grip (Neovide only): appended at the far right of status line
  local grip_text = ""
  if is_neovide() then
    grip_text = " " .. icons.resize_grip .. " "
  end

  -- Right-align status text + grip within footer width
  local total_w = zone and zone.width or vim.o.columns
  local status_w = vim.fn.strdisplaywidth(status_text)
  local grip_w = vim.fn.strdisplaywidth(grip_text)
  local pad = math.max(0, total_w - status_w - grip_w)
  local status_line = string.rep(" ", pad) .. status_text .. grip_text

  table.insert(lines, status_line)
  state.status_line_num = #lines

  -- Track grip column range for click detection (0-indexed display columns)
  if is_neovide() and grip_w > 0 then
    state.grip_col_start = pad + status_w
    state.grip_col_end = state.grip_col_start + grip_w
    state.grip_byte_start = pad + #status_text
    state.grip_byte_end = state.grip_byte_start + #grip_text
  else
    state.grip_col_start = nil
    state.grip_col_end = nil
    state.grip_byte_start = nil
    state.grip_byte_end = nil
  end

  -- Dynamic height: layer_count + 1 (status row)
  check_height_change(#lines)

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)

  -- Layer row highlights
  for line_num, hls in pairs(line_highlights) do
    for _, hl in ipairs(hls) do
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, hl[1], line_num - 1, hl[2], hl[3])
    end
  end

  -- Status line highlight
  local status_line_idx = state.status_line_num - 1
  pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "Comment", status_line_idx, 0, -1)

  -- Resize grip highlight (slightly brighter so it's discoverable)
  if state.grip_byte_start and state.grip_byte_end then
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspHeaderSub", status_line_idx, state.grip_byte_start, state.grip_byte_end)
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

-- Handle mouse click on layer rows or status line
-- Public: called directly by session_titlebar's t/n <LeftMouse> handler
-- when clicking the footer from a terminal buffer (avoids needing two clicks).
function M.handle_click(saved_mouse)
  local mouse = saved_mouse or vim.fn.getmousepos()
  if not mouse then return end

  -- wincol is 1-indexed display column; click_regions use 0-indexed display columns
  local col = mouse.wincol - 1
  local line = mouse.line

  -- Status line: check resize grip (Neovide only)
  if line == state.status_line_num and is_neovide() and state.grip_col_start and state.grip_col_end then
    if col >= state.grip_col_start and col < state.grip_col_end then
      local nv_ok, nv = pcall(require, "ccasp.neovide")
      if nv_ok and nv.ffi_available() then
        nv.win_resize_start("bottomright")
      end
      return
    end
  end

  -- Layer row clicks
  local regions = state.click_regions_by_line[line]
  if not regions then return end

  for _, region in ipairs(regions) do
    if col >= region.col_start and col < region.col_end then
      if region.action == "switch_layer" then
        local layers_ok, layers = pcall(require, "ccasp.layers")
        if layers_ok then
          layers.switch_to(region.layer_num)
        end
      elseif region.action == "switch_layer_and_focus" then
        -- Clicked a session tab on an inactive layer → switch to that layer
        local layers_ok, layers = pcall(require, "ccasp.layers")
        if layers_ok then
          layers.switch_to(region.layer_num)
        end
      elseif region.action == "focus" then
        local sessions_ok, sessions = pcall(require, "ccasp.sessions")
        if sessions_ok then
          sessions.focus(region.id)
        end
      elseif region.action == "restore_session" then
        local titlebar_ok, titlebar = pcall(require, "ccasp.session_titlebar")
        if titlebar_ok then
          titlebar.restore(region.id)
        end
        M.sync_taskbar()
      elseif region.action == "restore_panel" then
        local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
        if tb_ok then
          taskbar.restore_by_index(region.index)
        end
        M.sync_taskbar()
      elseif region.action == "reorder_sessions" then
        local sessions_ok, sessions = pcall(require, "ccasp.sessions")
        if sessions_ok then
          sessions.show_reorder_modal()
        end
      end
      return
    end
  end
end

-- Setup keymaps for footer
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  -- Mouse click on layer rows or status line
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
