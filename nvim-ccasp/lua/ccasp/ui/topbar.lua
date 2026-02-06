---@class CcaspTopbar
---@field config table Configuration options
---@field state table Runtime state
local M = {}

local icons = require("ccasp.ui.icons")
local commands = require("ccasp.core.commands")
local settings = require("ccasp.core.settings")

-- Default configuration
local default_config = {
  max_items = 10,           -- Maximum commands to show per section
  max_pinned = 5,           -- Maximum pinned commands
  max_most_used = 3,        -- Maximum most-used commands
  max_recent = 2,           -- Maximum recent commands
  show_icons = true,        -- Show Nerd Font icons
  show_overflow = true,     -- Show overflow indicators
  separator = icons.pipe,   -- Section separator
  min_usage_count = 2,      -- Minimum usage count to show in most-used
}

-- Module state
M.config = {}
M.state = {
  scroll_offset = 0,        -- For horizontal scrolling
  hover_index = nil,        -- For hover effects
  last_render = "",         -- Cache last render
}

---Initialize the topbar module
---@param opts? table Configuration options
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", default_config, opts or {})

  -- Load persisted state from settings
  local saved = settings.get()
  if not saved.topbar then
    saved.topbar = {
      pinned_commands = {},
      command_usage = {},
      recent_commands = {},
    }
    settings.set("topbar", saved.topbar)
  end

  -- Set up autocommands for refresh
  vim.api.nvim_create_autocmd({ "VimEnter", "VimResized" }, {
    group = vim.api.nvim_create_augroup("CcaspTopbar", { clear = true }),
    callback = function()
      M.refresh()
    end,
  })
end

---Get command icon based on name or section
---@param cmd_name string Command name
---@param cmd_data table Command metadata
---@return string icon Nerd Font icon
local function get_command_icon(cmd_name, cmd_data)
  -- Map command names to icons
  local icon_map = {
    ["deploy"] = icons.deploy,
    ["test"] = icons.test,
    ["dev"] = icons.dev,
    ["docs"] = icons.docs,
    ["workflow"] = icons.workflow,
    ["ai"] = icons.ai,
    ["config"] = icons.config,
    ["pr-merge"] = icons.workflow,
    ["github-task-start"] = icons.workflow,
    ["phase-dev-plan"] = icons.ai,
    ["create-task-list"] = icons.ai,
  }

  -- Check for exact match
  if icon_map[cmd_name] then
    return icon_map[cmd_name]
  end

  -- Check for partial match
  for key, icon in pairs(icon_map) do
    if cmd_name:find(key) then
      return icon
    end
  end

  -- Default based on section
  if cmd_data and cmd_data.section then
    local section = cmd_data.section:lower()
    if section:find("deploy") then return icons.deploy end
    if section:find("test") then return icons.test end
    if section:find("dev") then return icons.dev end
    if section:find("doc") then return icons.docs end
    if section:find("work") then return icons.workflow end
    if section:find("ai") then return icons.ai end
  end

  return icons.commands -- Default fallback
end

---Truncate text to fit width
---@param text string Text to truncate
---@param max_width number Maximum width
---@return string truncated Truncated text
local function truncate(text, max_width)
  if #text <= max_width then
    return text
  end
  return text:sub(1, max_width - 1) .. "…"
end

---Get pinned commands
---@return table pinned Array of command names
function M.get_pinned()
  local saved = settings.get()
  return saved.topbar and saved.topbar.pinned_commands or {}
end

---Get most used commands
---@param n? number Number of commands to return (default: config.max_most_used)
---@return table most_used Array of {name, count} sorted by count
function M.get_most_used(n)
  n = n or M.config.max_most_used
  local saved = settings.get()
  local usage = saved.topbar and saved.topbar.command_usage or {}

  -- Convert to array and sort
  local sorted = {}
  for cmd, count in pairs(usage) do
    if count >= M.config.min_usage_count then
      table.insert(sorted, { name = cmd, count = count })
    end
  end

  table.sort(sorted, function(a, b)
    return a.count > b.count
  end)

  -- Return top N
  local result = {}
  for i = 1, math.min(n, #sorted) do
    table.insert(result, sorted[i].name)
  end

  return result
end

---Get recent commands
---@param n? number Number of commands to return (default: config.max_recent)
---@return table recent Array of command names
function M.get_recent(n)
  n = n or M.config.max_recent
  local saved = settings.get()
  local recent = saved.topbar and saved.topbar.recent_commands or {}

  -- Return last N (already in reverse chronological order)
  local result = {}
  for i = 1, math.min(n, #recent) do
    table.insert(result, recent[i])
  end

  return result
end

---Pin a command
---@param cmd string Command name to pin
function M.pin(cmd)
  local saved = settings.get()
  if not saved.topbar then
    saved.topbar = { pinned_commands = {}, command_usage = {}, recent_commands = {} }
  end

  local pinned = saved.topbar.pinned_commands

  -- Check if already pinned
  for _, pinned_cmd in ipairs(pinned) do
    if pinned_cmd == cmd then
      return -- Already pinned
    end
  end

  -- Check max pinned limit
  if #pinned >= M.config.max_pinned then
    vim.notify(
      string.format("Maximum %d pinned commands reached", M.config.max_pinned),
      vim.log.levels.WARN
    )
    return
  end

  table.insert(pinned, cmd)
  settings.set("topbar", saved.topbar)
  M.refresh()
end

---Unpin a command
---@param cmd string Command name to unpin
function M.unpin(cmd)
  local saved = settings.get()
  if not saved.topbar then
    return
  end

  local pinned = saved.topbar.pinned_commands
  for i, pinned_cmd in ipairs(pinned) do
    if pinned_cmd == cmd then
      table.remove(pinned, i)
      settings.set("topbar", saved.topbar)
      M.refresh()
      return
    end
  end
end

---Record command usage
---@param cmd string Command name that was used
function M.record_usage(cmd)
  local saved = settings.get()
  if not saved.topbar then
    saved.topbar = { pinned_commands = {}, command_usage = {}, recent_commands = {} }
  end

  -- Update usage count
  local usage = saved.topbar.command_usage
  usage[cmd] = (usage[cmd] or 0) + 1

  -- Update recent commands
  local recent = saved.topbar.recent_commands

  -- Remove if already in recent
  for i, recent_cmd in ipairs(recent) do
    if recent_cmd == cmd then
      table.remove(recent, i)
      break
    end
  end

  -- Add to front
  table.insert(recent, 1, cmd)

  -- Keep only last 10
  while #recent > 10 do
    table.remove(recent)
  end

  settings.set("topbar", saved.topbar)
  M.refresh()
end

---Check if a command is user-created (not built-in CCASP)
---@param cmd_name string Command name
---@param cmd_data table Command metadata
---@return boolean is_custom True if user-created command
local function is_custom_command(cmd_name, cmd_data)
  -- Check if command has custom marker or is not in CCASP templates
  if cmd_data.options and cmd_data.options.custom then
    return true
  end

  -- Built-in CCASP commands typically have specific sections
  local builtin_sections = {
    "Deployment",
    "GitHub Integration",
    "AI Development",
    "Phased Development",
    "CI/CD",
    "Testing",
    "Development Tools",
  }

  if cmd_data.section then
    for _, section in ipairs(builtin_sections) do
      if cmd_data.section == section then
        return false
      end
    end
  end

  return true -- Assume custom if no matching section
end

---Build a command item for tabline
---@param cmd_name string Command name
---@param cmd_data table Command metadata
---@param is_pinned boolean Whether command is pinned
---@param is_custom boolean Whether command is custom
---@param index number Index for click handling
---@return string item Tabline formatted item
local function build_command_item(cmd_name, cmd_data, is_pinned, is_custom, index)
  local icon = M.config.show_icons and get_command_icon(cmd_name, cmd_data) or ""

  -- Truncate command name for display
  local display_name = cmd_name:gsub("^/", ""):gsub("%-", " ")
  display_name = truncate(display_name, 12)

  -- Build item text
  local item_text = icon ~= "" and (icon .. " " .. display_name) or display_name

  -- Add pin indicator
  if is_pinned then
    item_text = icons.pin .. " " .. item_text
  end

  -- Choose highlight based on type
  local hl_group = "CcaspTopbarItem"
  if is_pinned then
    hl_group = "CcaspTopbarPinned"
  elseif is_custom then
    hl_group = "CcaspTopbarActive"
  end

  -- Build with click handler
  -- Click handler: @CcaspTopbarClick@{index}@
  local item = string.format(
    "%%#%s#%%@CcaspTopbarClick@%s%%X%%*",
    hl_group,
    " " .. item_text .. " "
  )

  return item
end

---Render the topbar
---@return string tabline Formatted tabline string
function M.render()
  local all_commands = commands.get_all()
  if not all_commands then
    return "%#CcaspTopbarBg# CCASP %*"
  end

  local pinned = M.get_pinned()
  local most_used = M.get_most_used()
  local recent = M.get_recent()

  -- Remove duplicates (pinned takes priority)
  local pinned_set = {}
  for _, cmd in ipairs(pinned) do
    pinned_set[cmd] = true
  end

  local filtered_most_used = {}
  for _, cmd in ipairs(most_used) do
    if not pinned_set[cmd] then
      table.insert(filtered_most_used, cmd)
      pinned_set[cmd] = true -- Prevent in recent too
    end
  end

  local filtered_recent = {}
  for _, cmd in ipairs(recent) do
    if not pinned_set[cmd] then
      table.insert(filtered_recent, cmd)
    end
  end

  -- Build sections
  local sections = {}

  -- Pinned section
  if #pinned > 0 then
    local items = {}
    for i, cmd_name in ipairs(pinned) do
      local cmd_data = all_commands[cmd_name]
      if cmd_data then
        local is_custom = is_custom_command(cmd_name, cmd_data)
        table.insert(items, build_command_item(cmd_name, cmd_data, true, is_custom, i))
      end
    end

    if #items > 0 then
      local section = "%#CcaspTopbarSection# Pinned %* " .. table.concat(items, " ")
      table.insert(sections, section)
    end
  end

  -- Most Used section
  if #filtered_most_used > 0 then
    local items = {}
    for i, cmd_name in ipairs(filtered_most_used) do
      local cmd_data = all_commands[cmd_name]
      if cmd_data then
        local is_custom = is_custom_command(cmd_name, cmd_data)
        table.insert(items, build_command_item(cmd_name, cmd_data, false, is_custom, #pinned + i))
      end
    end

    if #items > 0 then
      local section = "%#CcaspTopbarSection# Most Used %* " .. table.concat(items, " ")
      table.insert(sections, section)
    end
  end

  -- Recent section
  if #filtered_recent > 0 then
    local items = {}
    for i, cmd_name in ipairs(filtered_recent) do
      local cmd_data = all_commands[cmd_name]
      if cmd_data then
        local is_custom = is_custom_command(cmd_name, cmd_data)
        table.insert(items, build_command_item(cmd_name, cmd_data, false, is_custom, #pinned + #filtered_most_used + i))
      end
    end

    if #items > 0 then
      local section = "%#CcaspTopbarSection# Recent %* " .. table.concat(items, " ")
      table.insert(sections, section)
    end
  end

  -- Build final tabline
  local tabline = "%#CcaspTopbarBg# "

  if #sections > 0 then
    tabline = tabline .. table.concat(sections, " %#CcaspTopbarSection#" .. icons.pipe .. "%* ")
  else
    tabline = tabline .. "%#CcaspTopbarSection#No commands yet%*"
  end

  -- Right-align CCASP logo
  tabline = tabline .. "%=%#CcaspTopbarSection# " .. icons.ccasp .. " CCASP %* "

  M.state.last_render = tabline
  return tabline
end

---Force refresh the topbar
function M.refresh()
  if vim.o.showtabline == 0 then
    return -- Tabline is hidden
  end

  local tabline = M.render()
  vim.o.tabline = tabline

  -- Force redraw
  vim.cmd("redrawtabline")
end

---Handle topbar click events
---@param index number Clicked item index
function _G.CcaspTopbarClick(index)
  -- This is a placeholder for click handling
  -- In a full implementation, you'd:
  -- 1. Map index to command name
  -- 2. Execute the command or show a menu
  -- 3. Record usage

  local pinned = M.get_pinned()
  local most_used = M.get_most_used()
  local recent = M.get_recent()

  local all_items = {}
  vim.list_extend(all_items, pinned)
  vim.list_extend(all_items, most_used)
  vim.list_extend(all_items, recent)

  if index <= #all_items then
    local cmd_name = all_items[index]
    vim.notify("Clicked: " .. cmd_name, vim.log.levels.INFO)
    -- TODO: Execute command or show context menu
  end
end

---Get topbar statistics
---@return table stats Statistics about topbar state
function M.get_stats()
  local saved = settings.get()
  local topbar_data = saved.topbar or {}

  return {
    pinned_count = #(topbar_data.pinned_commands or {}),
    total_usage = vim.tbl_count(topbar_data.command_usage or {}),
    recent_count = #(topbar_data.recent_commands or {}),
  }
end

---Clear all topbar data (for testing/reset)
function M.clear()
  settings.set("topbar", {
    pinned_commands = {},
    command_usage = {},
    recent_commands = {},
  })
  M.refresh()
end

return M
