-- ccasp/taskbar.lua - Taskbar for minimized floating windows
-- Provides minimize/restore functionality with statusline component

local M = {}

-- Configuration
M.config = {
  enabled = true,
  max_items = 9, -- Maximum windows in taskbar (1-9 for quick restore)
  show_icons = true,
  statusline_position = "right", -- "left", "center", "right"
  persist = false, -- Persist taskbar state across sessions
  cache_file = ".claude/cache/nvim-taskbar.json",
}

-- State for minimized windows
M.taskbar = {
  minimized = {}, -- { id = { bufnr, config, name, icon, minimized_at } }
  order = {}, -- Ordered list of minimized window IDs
}

-- Counter for unique IDs
local id_counter = 0

-- Setup with user config
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})

  -- Load persisted state if enabled
  if M.config.persist then
    M.load_state()
  end
end

-- Generate unique ID
local function generate_id()
  id_counter = id_counter + 1
  return string.format("win_%d_%d", os.time(), id_counter)
end

-- Extract row/col from window config (handles number or table)
local function extract_position(value)
  return type(value) == "table" and (value[false] or value[true] or 0) or value
end

-- Create minimal window config for storage
local function create_window_config(config)
  return {
    relative = config.relative,
    row = extract_position(config.row),
    col = extract_position(config.col),
    width = config.width,
    height = config.height,
    style = config.style,
    border = config.border,
    title = config.title,
    title_pos = config.title_pos,
    zindex = config.zindex,
  }
end

-- Validate window for minimization
local function validate_minimize(winid)
  if not M.config.enabled then return false, nil end

  if not winid or not vim.api.nvim_win_is_valid(winid) then
    vim.notify("CCASP: Cannot minimize - invalid window", vim.log.levels.WARN)
    return false, nil
  end

  if #M.taskbar.order >= M.config.max_items then
    vim.notify("CCASP: Taskbar full - restore a window first", vim.log.levels.WARN)
    return false, nil
  end

  local config = vim.api.nvim_win_get_config(winid)
  if config.relative == "" then
    vim.notify("CCASP: Can only minimize floating windows", vim.log.levels.WARN)
    return false, nil
  end

  return true, config
end

-- Minimize a floating window
function M.minimize(winid, name, icon)
  local valid, config = validate_minimize(winid)
  if not valid then return nil end

  local id = generate_id()
  M.taskbar.minimized[id] = {
    bufnr = vim.api.nvim_win_get_buf(winid),
    config = create_window_config(config),
    name = name or "Window",
    icon = icon or "",
    minimized_at = os.time(),
  }

  table.insert(M.taskbar.order, id)
  vim.api.nvim_win_close(winid, false)

  vim.notify(string.format("CCASP: %s minimized to taskbar [%d]", name or "Window", #M.taskbar.order), vim.log.levels.INFO)
  vim.cmd("redrawstatus")

  if M.config.persist then M.save_state() end

  return id
end

-- Restore a window by ID
function M.restore(id)
  if not M.config.enabled then
    return nil
  end

  local item = M.taskbar.minimized[id]
  if not item then
    vim.notify("CCASP: Window not found in taskbar", vim.log.levels.WARN)
    return nil
  end

  -- Check if buffer still exists
  if not vim.api.nvim_buf_is_valid(item.bufnr) then
    -- Buffer was deleted, remove from taskbar
    M.remove_from_taskbar(id)
    vim.notify("CCASP: Window buffer no longer exists", vim.log.levels.WARN)
    return nil
  end

  -- Restore window with saved config
  local winid = vim.api.nvim_open_win(item.bufnr, true, item.config)

  -- Remove from taskbar
  M.remove_from_taskbar(id)

  -- Notify
  vim.notify(string.format("CCASP: %s restored", item.name), vim.log.levels.INFO)

  -- Trigger statusline update
  vim.cmd("redrawstatus")

  -- Persist if enabled
  if M.config.persist then
    M.save_state()
  end

  return winid
end

-- Restore by index (1-9)
function M.restore_by_index(index)
  if index < 1 or index > #M.taskbar.order then
    vim.notify(string.format("CCASP: No window at taskbar position %d", index), vim.log.levels.WARN)
    return nil
  end

  local id = M.taskbar.order[index]
  return M.restore(id)
end

-- Remove from taskbar without restoring
function M.remove_from_taskbar(id)
  M.taskbar.minimized[id] = nil

  -- Remove from order
  for i, oid in ipairs(M.taskbar.order) do
    if oid == id then
      table.remove(M.taskbar.order, i)
      break
    end
  end
end

-- Get taskbar count
function M.count()
  return #M.taskbar.order
end

-- Check if taskbar has items
function M.has_items()
  return #M.taskbar.order > 0
end

-- Get list of minimized windows
function M.list()
  local items = {}
  for i, id in ipairs(M.taskbar.order) do
    local item = M.taskbar.minimized[id]
    if item then
      table.insert(items, {
        index = i,
        id = id,
        name = item.name,
        icon = item.icon,
        minimized_at = item.minimized_at,
      })
    end
  end
  return items
end

-- Format statusline item
local function format_item(i, item, with_highlight)
  local icon = M.config.show_icons and item.icon ~= "" and item.icon .. " " or ""

  if with_highlight then
    return string.format("%%#DiagnosticInfo#[%d]%%* %s%s", i, icon, item.name)
  else
    return string.format("[%d:%s%s]", i, icon, item.name)
  end
end

-- Build statusline items
local function build_statusline_items(with_highlight)
  if not M.config.enabled or #M.taskbar.order == 0 then return "" end

  local items = {}
  for i, id in ipairs(M.taskbar.order) do
    local item = M.taskbar.minimized[id]
    if item then
      table.insert(items, format_item(i, item, with_highlight))
    end
  end

  return #items > 0 and " " .. table.concat(items, " ") or ""
end

-- Statusline component
function M.statusline()
  return build_statusline_items(false)
end

-- Statusline component with highlight groups
function M.statusline_hl()
  return build_statusline_items(true)
end

-- Show taskbar picker (floating window with all items)
function M.show_picker()
  if #M.taskbar.order == 0 then
    vim.notify("CCASP: Taskbar is empty", vim.log.levels.INFO)
    return
  end

  local lines = {
    "",
    "  ╭─────────────────────────────────╮",
    "  │       Minimized Windows         │",
    "  ╰─────────────────────────────────╯",
    "",
  }

  for i, id in ipairs(M.taskbar.order) do
    local item = M.taskbar.minimized[id]
    if item then
      local icon = M.config.show_icons and item.icon ~= "" and item.icon .. " " or ""
      table.insert(lines, string.format("    [%d] %s%s", i, icon, item.name))
    end
  end

  table.insert(lines, "")
  table.insert(lines, "  Press 1-9 to restore | q to close")
  table.insert(lines, "")

  -- Create buffer
  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)
  vim.bo[bufnr].modifiable = false
  vim.bo[bufnr].bufhidden = "wipe"

  -- Calculate size
  local width = 39
  local height = #lines
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  -- Create window
  local winid = vim.api.nvim_open_win(bufnr, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = "rounded",
    title = " Taskbar ",
    title_pos = "center",
  })

  -- Setup keymaps
  local opts = { buffer = bufnr, nowait = true }

  vim.keymap.set("n", "q", function()
    vim.api.nvim_win_close(winid, true)
  end, opts)

  vim.keymap.set("n", "<Esc>", function()
    vim.api.nvim_win_close(winid, true)
  end, opts)

  -- Number keys to restore
  for i = 1, 9 do
    vim.keymap.set("n", tostring(i), function()
      vim.api.nvim_win_close(winid, true)
      M.restore_by_index(i)
    end, opts)
  end

  -- Apply highlights
  local ns = vim.api.nvim_create_namespace("ccasp_taskbar_picker")
  for i, line in ipairs(lines) do
    if line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^    %[%d%]") then
      local s = line:find("%[")
      local e = line:find("%]")
      if s and e then
        vim.api.nvim_buf_add_highlight(bufnr, ns, "Special", i - 1, s - 1, e)
      end
    end
  end
end

-- Save state to file
function M.save_state()
  local cache_path = vim.fn.getcwd() .. "/" .. M.config.cache_file

  -- Create cache directory if needed
  local cache_dir = vim.fn.fnamemodify(cache_path, ":h")
  vim.fn.mkdir(cache_dir, "p")

  -- Build save data (exclude bufnr as it won't be valid next session)
  local save_data = {
    order = M.taskbar.order,
    items = {},
  }

  for id, item in pairs(M.taskbar.minimized) do
    save_data.items[id] = {
      config = item.config,
      name = item.name,
      icon = item.icon,
      minimized_at = item.minimized_at,
    }
  end

  -- Write file
  local json = vim.fn.json_encode(save_data)
  local file = io.open(cache_path, "w")
  if file then
    file:write(json)
    file:close()
  end
end

-- Load state from file (note: buffers won't be restored)
function M.load_state()
  local cache_path = vim.fn.getcwd() .. "/" .. M.config.cache_file

  local file = io.open(cache_path, "r")
  if not file then
    return
  end

  local content = file:read("*a")
  file:close()

  local ok, data = pcall(vim.fn.json_decode, content)
  if not ok or not data then
    return
  end

  -- Note: We can't fully restore windows without the original buffers
  -- This just restores the metadata for reference
  vim.notify("CCASP: Taskbar state loaded (windows need manual restore)", vim.log.levels.INFO)
end

-- Clear all items from taskbar
function M.clear()
  M.taskbar.minimized = {}
  M.taskbar.order = {}
  vim.cmd("redrawstatus")

  if M.config.persist then
    M.save_state()
  end
end

return M
