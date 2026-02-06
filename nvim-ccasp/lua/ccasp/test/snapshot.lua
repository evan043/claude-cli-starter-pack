-- ccasp/test/snapshot.lua - Layout Snapshot Utility
-- Captures complete window state including appshell zones, floating windows, and sessions
-- Provides comparison and diff capabilities for UI regression testing

local M = {}

-- Capture current appshell state (if active)
local function capture_appshell_state()
  local ok, appshell = pcall(require, "ccasp.appshell")
  if not ok or not appshell.is_active or not appshell.is_active() then
    return nil
  end

  local state = {
    active = true,
    active_section = appshell.state.active_section,
    flyout_visible = appshell.config.flyout.visible,
    rail_visible = appshell.config.icon_rail.visible,
    right_panel_visible = appshell.config.right_panel.visible,
    zones = {},
  }

  -- Capture zone bounds
  if appshell.state.zones then
    for zone_name, bounds in pairs(appshell.state.zones) do
      state.zones[zone_name] = vim.deepcopy(bounds)
    end
  end

  return state
end

-- Capture all active sessions
local function capture_sessions()
  local ok, sessions_mod = pcall(require, "ccasp.sessions")
  if not ok or not sessions_mod.list then
    return {}
  end

  local sessions = {}
  local session_list = sessions_mod.list()

  for _, session in ipairs(session_list) do
    table.insert(sessions, {
      id = session.id,
      name = session.name,
      bufnr = session.bufnr,
      winid = session.winid,
      claude_running = session.claude_running,
      is_primary = session.is_primary,
    })
  end

  return sessions
end

-- Capture window info safely
local function capture_window(winid)
  if not vim.api.nvim_win_is_valid(winid) then
    return nil
  end

  local ok, config = pcall(vim.api.nvim_win_get_config, winid)
  if not ok then
    return nil
  end

  local bufnr = vim.api.nvim_win_get_buf(winid)
  local is_float = config.relative and config.relative ~= ""

  -- Handle row/col that might be tables
  local row = config.row
  if type(row) == "table" then
    row = row[false] or 0
  end

  local col = config.col
  if type(col) == "table" then
    col = col[false] or 0
  end

  -- Get cursor position
  local cursor = { 1, 0 }
  ok = pcall(function()
    cursor = vim.api.nvim_win_get_cursor(winid)
  end)

  -- Get window highlights
  local winhighlight = ""
  ok = pcall(function()
    winhighlight = vim.wo[winid].winhighlight or ""
  end)

  return {
    winid = winid,
    bufnr = bufnr,
    bufname = vim.api.nvim_buf_get_name(bufnr),
    filetype = vim.bo[bufnr].filetype or "",
    is_float = is_float,
    width = config.width or vim.api.nvim_win_get_width(winid),
    height = config.height or vim.api.nvim_win_get_height(winid),
    row = row,
    col = col,
    zindex = config.zindex or 50,
    border = config.border or "none",
    relative = config.relative or "",
    winhighlight = winhighlight,
    active = winid == vim.api.nvim_get_current_win(),
    cursor = { line = cursor[1], col = cursor[2] },
  }
end

-- Capture complete layout snapshot
-- @return table: Snapshot containing timestamp, editor info, windows, appshell state, sessions
function M.capture()
  local snapshot = {
    timestamp = os.date("%Y-%m-%d %H:%M:%S"),
    editor = {
      columns = vim.o.columns,
      lines = vim.o.lines,
      cmdheight = vim.o.cmdheight,
    },
    windows = {},
    active_win = vim.api.nvim_get_current_win(),
    cursor = { line = 1, col = 0 },
    appshell_state = nil,
    sessions = {},
  }

  -- Capture active window cursor
  local ok = pcall(function()
    local cursor = vim.api.nvim_win_get_cursor(snapshot.active_win)
    snapshot.cursor = { line = cursor[1], col = cursor[2] }
  end)

  -- Capture all windows
  for _, winid in ipairs(vim.api.nvim_list_wins()) do
    local win_info = capture_window(winid)
    if win_info then
      table.insert(snapshot.windows, win_info)
    end
  end

  -- Capture appshell state if active
  snapshot.appshell_state = capture_appshell_state()

  -- Capture sessions
  snapshot.sessions = capture_sessions()

  return snapshot
end

-- Convert snapshot to human-readable string
-- @param snapshot table: Snapshot from capture()
-- @return string: Formatted snapshot description
function M.to_string(snapshot)
  if not snapshot then
    return "No snapshot data"
  end

  local lines = {}

  -- Header
  table.insert(lines, "=== CCASP Layout Snapshot ===")
  table.insert(lines, string.format("Timestamp: %s", snapshot.timestamp))
  table.insert(lines, "")

  -- Editor info
  table.insert(lines, "Editor:")
  table.insert(lines, string.format("  Dimensions: %dx%d", snapshot.editor.columns, snapshot.editor.lines))
  table.insert(lines, string.format("  Cmdheight:  %d", snapshot.editor.cmdheight))
  table.insert(lines, string.format("  Active win: %d", snapshot.active_win))
  table.insert(lines, string.format("  Cursor:     line=%d col=%d", snapshot.cursor.line, snapshot.cursor.col))
  table.insert(lines, "")

  -- Appshell state
  if snapshot.appshell_state then
    table.insert(lines, "Appshell State:")
    table.insert(lines, string.format("  Active:        %s", snapshot.appshell_state.active and "yes" or "no"))
    table.insert(lines, string.format("  Section:       %s", snapshot.appshell_state.active_section or "none"))
    table.insert(lines, string.format("  Flyout:        %s", snapshot.appshell_state.flyout_visible and "visible" or "hidden"))
    table.insert(lines, string.format("  Rail:          %s", snapshot.appshell_state.rail_visible and "visible" or "hidden"))
    table.insert(lines, string.format("  Right Panel:   %s", snapshot.appshell_state.right_panel_visible and "visible" or "hidden"))

    if next(snapshot.appshell_state.zones) then
      table.insert(lines, "  Zones:")
      for zone_name, bounds in pairs(snapshot.appshell_state.zones) do
        table.insert(lines, string.format(
          "    %-12s row=%-3d col=%-3d w=%-3d h=%-3d",
          zone_name .. ":",
          bounds.row,
          bounds.col,
          bounds.width,
          bounds.height
        ))
      end
    end
    table.insert(lines, "")
  else
    table.insert(lines, "Appshell State: inactive")
    table.insert(lines, "")
  end

  -- Sessions
  if #snapshot.sessions > 0 then
    table.insert(lines, string.format("Sessions (%d):", #snapshot.sessions))
    for i, session in ipairs(snapshot.sessions) do
      local status = session.claude_running and "●" or "○"
      local primary = session.is_primary and " ★" or ""
      table.insert(lines, string.format(
        "  [%d] %s %-12s win=%-5d buf=%-5d%s",
        i,
        status,
        session.name,
        session.winid,
        session.bufnr,
        primary
      ))
    end
    table.insert(lines, "")
  else
    table.insert(lines, "Sessions: none")
    table.insert(lines, "")
  end

  -- Windows
  table.insert(lines, string.format("Windows (%d):", #snapshot.windows))
  table.insert(lines, string.format(
    "  %-5s %-5s %-6s %-20s %-3s %-3s %-3s %-3s %-5s %s",
    "win",
    "buf",
    "type",
    "filetype",
    "w",
    "h",
    "row",
    "col",
    "z",
    "active"
  ))
  table.insert(lines, string.format("  %s", string.rep("-", 80)))

  for _, win in ipairs(snapshot.windows) do
    local win_type = win.is_float and "float" or "split"
    local active_mark = win.active and "●" or " "
    local filetype = win.filetype ~= "" and win.filetype or "-"
    if #filetype > 20 then
      filetype = filetype:sub(1, 17) .. "..."
    end

    table.insert(lines, string.format(
      "  %-5d %-5d %-6s %-20s %-3d %-3d %-3d %-3d %-5s %s",
      win.winid,
      win.bufnr,
      win_type,
      filetype,
      win.width,
      win.height,
      win.row,
      win.col,
      win.zindex,
      active_mark
    ))
  end

  table.insert(lines, "")
  table.insert(lines, "=== End Snapshot ===")

  return table.concat(lines, "\n")
end

-- Write snapshot to file
-- @param snapshot table: Snapshot from capture()
-- @param filepath string: Destination file path
-- @return boolean: success status
-- @return string|nil: error message if failed
function M.to_file(snapshot, filepath)
  if not snapshot then
    return false, "No snapshot data"
  end

  if not filepath or filepath == "" then
    return false, "Invalid filepath"
  end

  local content = M.to_string(snapshot)

  local ok, err = pcall(function()
    local file = io.open(filepath, "w")
    if not file then
      error("Failed to open file for writing")
    end

    file:write(content)
    file:close()
  end)

  if not ok then
    return false, tostring(err)
  end

  return true, nil
end

-- Compare two snapshots and return differences
-- @param snap1 table: First snapshot
-- @param snap2 table: Second snapshot
-- @return table: Array of difference descriptions
function M.diff(snap1, snap2)
  if not snap1 or not snap2 then
    return { "One or both snapshots are nil" }
  end

  local diffs = {}

  -- Compare editor dimensions
  if snap1.editor.columns ~= snap2.editor.columns or snap1.editor.lines ~= snap2.editor.lines then
    table.insert(diffs, string.format(
      "Editor dimensions changed: %dx%d → %dx%d",
      snap1.editor.columns,
      snap1.editor.lines,
      snap2.editor.columns,
      snap2.editor.lines
    ))
  end

  -- Compare window counts
  local win_count1 = #snap1.windows
  local win_count2 = #snap2.windows
  if win_count1 ~= win_count2 then
    table.insert(diffs, string.format(
      "Window count changed: %d → %d",
      win_count1,
      win_count2
    ))
  end

  -- Build window lookup tables by winid
  local wins1_by_id = {}
  for _, win in ipairs(snap1.windows) do
    wins1_by_id[win.winid] = win
  end

  local wins2_by_id = {}
  for _, win in ipairs(snap2.windows) do
    wins2_by_id[win.winid] = win
  end

  -- Find windows added in snap2
  for winid, win in pairs(wins2_by_id) do
    if not wins1_by_id[winid] then
      table.insert(diffs, string.format(
        "Window added: id=%d type=%s filetype=%s",
        winid,
        win.is_float and "float" or "split",
        win.filetype
      ))
    end
  end

  -- Find windows removed from snap1
  for winid, win in pairs(wins1_by_id) do
    if not wins2_by_id[winid] then
      table.insert(diffs, string.format(
        "Window removed: id=%d type=%s filetype=%s",
        winid,
        win.is_float and "float" or "split",
        win.filetype
      ))
    end
  end

  -- Compare common windows
  for winid, win1 in pairs(wins1_by_id) do
    local win2 = wins2_by_id[winid]
    if win2 then
      -- Check position changes
      if win1.row ~= win2.row or win1.col ~= win2.col then
        table.insert(diffs, string.format(
          "Window %d position changed: (%d,%d) → (%d,%d)",
          winid,
          win1.row,
          win1.col,
          win2.row,
          win2.col
        ))
      end

      -- Check size changes
      if win1.width ~= win2.width or win1.height ~= win2.height then
        table.insert(diffs, string.format(
          "Window %d size changed: %dx%d → %dx%d",
          winid,
          win1.width,
          win1.height,
          win2.width,
          win2.height
        ))
      end

      -- Check active state
      if win1.active ~= win2.active then
        table.insert(diffs, string.format(
          "Window %d active state changed: %s → %s",
          winid,
          win1.active and "active" or "inactive",
          win2.active and "active" or "inactive"
        ))
      end
    end
  end

  -- Compare appshell state
  local as1 = snap1.appshell_state
  local as2 = snap2.appshell_state

  if (as1 == nil) ~= (as2 == nil) then
    table.insert(diffs, string.format(
      "Appshell state changed: %s → %s",
      as1 and "active" or "inactive",
      as2 and "active" or "inactive"
    ))
  elseif as1 and as2 then
    if as1.active_section ~= as2.active_section then
      table.insert(diffs, string.format(
        "Appshell active section changed: %s → %s",
        as1.active_section or "none",
        as2.active_section or "none"
      ))
    end

    if as1.flyout_visible ~= as2.flyout_visible then
      table.insert(diffs, string.format(
        "Appshell flyout visibility changed: %s → %s",
        as1.flyout_visible and "visible" or "hidden",
        as2.flyout_visible and "visible" or "hidden"
      ))
    end

    if as1.rail_visible ~= as2.rail_visible then
      table.insert(diffs, string.format(
        "Appshell rail visibility changed: %s → %s",
        as1.rail_visible and "visible" or "hidden",
        as2.rail_visible and "visible" or "hidden"
      ))
    end
  end

  -- Compare session counts
  local sess_count1 = #snap1.sessions
  local sess_count2 = #snap2.sessions
  if sess_count1 ~= sess_count2 then
    table.insert(diffs, string.format(
      "Session count changed: %d → %d",
      sess_count1,
      sess_count2
    ))
  end

  if #diffs == 0 then
    table.insert(diffs, "No differences found")
  end

  return diffs
end

-- Convenience: capture and immediately write to file
-- @param filepath string: Destination file path
-- @return boolean: success status
-- @return string|nil: error message if failed
function M.capture_to_file(filepath)
  local snapshot = M.capture()
  return M.to_file(snapshot, filepath)
end

-- Print snapshot to Neovim messages
-- @param snapshot table: Snapshot from capture()
function M.print(snapshot)
  if not snapshot then
    print("No snapshot to print")
    return
  end

  local str = M.to_string(snapshot)
  for line in str:gmatch("[^\n]+") do
    print(line)
  end
end

-- Print diff between two snapshots
-- @param snap1 table: First snapshot
-- @param snap2 table: Second snapshot
function M.print_diff(snap1, snap2)
  local diffs = M.diff(snap1, snap2)

  print("=== Snapshot Diff ===")
  if snap1 then
    print(string.format("Snapshot 1: %s", snap1.timestamp))
  end
  if snap2 then
    print(string.format("Snapshot 2: %s", snap2.timestamp))
  end
  print("")

  for i, diff in ipairs(diffs) do
    print(string.format("  [%d] %s", i, diff))
  end
  print("")
  print(string.format("Total differences: %d", #diffs))
end

return M
