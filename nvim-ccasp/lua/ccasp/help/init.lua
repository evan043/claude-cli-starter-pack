-- ccasp/help/init.lua - Help panel lifecycle and topic navigation
-- Provides persistent help access with searchable wiki content

local M = {}

local helpers = require("ccasp.panels.helpers")
local icons = require("ccasp.ui.icons")

-- Panel state
local panel = {
  bufnr = nil,
  winid = nil,
  is_open = false,
  current_view = "topics", -- "topics" or "content"
  current_topic = nil,
}

-- Calculate help panel dimensions (80% of screen)
local function get_panel_config()
  local width = math.floor(vim.o.columns * 0.8)
  local height = math.floor(vim.o.lines * 0.8)
  width = math.max(width, 70)
  height = math.max(height, 20)

  local pos = helpers.calculate_position({ width = width, height = height })

  return {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " " .. icons.help .. " CCASP Help ",
    title_pos = "center",
    footer = " [/] search  [q] close  [Backspace] back ",
    footer_pos = "center",
  }
end

-- Open help panel
function M.open(topic_id)
  -- Focus existing window if already open
  if helpers.focus_if_open(panel.winid) then
    if topic_id then
      M.show_topic(topic_id)
    end
    return
  end

  -- Track help usage
  local state_ok, onboarding_state = pcall(require, "ccasp.onboarding.state")
  if state_ok then
    onboarding_state.increment_help_count()
  end

  -- Create buffer
  panel.bufnr = helpers.create_buffer("ccasp://help")

  -- Create floating window
  local config = get_panel_config()
  panel.winid = helpers.create_window(panel.bufnr, config)
  panel.is_open = true

  -- Set window options
  vim.wo[panel.winid].wrap = true
  vim.wo[panel.winid].linebreak = true
  vim.wo[panel.winid].cursorline = true
  vim.wo[panel.winid].number = false
  vim.wo[panel.winid].relativenumber = false
  vim.wo[panel.winid].signcolumn = "no"

  -- Set window highlights
  vim.wo[panel.winid].winhighlight = "Normal:CcaspPanelBg,FloatBorder:CcaspBorderActive,FloatTitle:CcaspHelpTitle,CursorLine:CcaspCmdSelected"

  -- Setup keymaps
  helpers.setup_standard_keymaps(panel.bufnr, panel.winid, "CCASP Help", panel, M.close)

  -- Show topic or topic list
  if topic_id then
    M.show_topic(topic_id)
  else
    M.show_topic_list()
  end
end

-- Close help panel
function M.close()
  helpers.close_panel(panel)
end

-- Toggle help panel
function M.toggle()
  if panel.is_open and panel.winid and vim.api.nvim_win_is_valid(panel.winid) then
    M.close()
  else
    M.open()
  end
end

-- Show the topic list view
function M.show_topic_list()
  if not panel.bufnr or not vim.api.nvim_buf_is_valid(panel.bufnr) then
    return
  end

  panel.current_view = "topics"
  panel.current_topic = nil

  local wiki = require("ccasp.help.wiki_content")
  local topics = wiki.get_topic_list()

  local lines = {}
  local highlights = {}

  table.insert(lines, "")
  table.insert(lines, "  " .. icons.book .. "  CCASP Help - Wiki Guides")
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspHelpTitle" })
  table.insert(lines, "")
  table.insert(lines, "  Select a topic to read, or press [/] to search.")
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", 50))
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspSeparator" })
  table.insert(lines, "")

  for i, topic in ipairs(topics) do
    local prefix = string.format("  %2d. ", i)
    local line = prefix .. topic.icon .. "  " .. topic.title
    table.insert(lines, line)
    table.insert(highlights, { #lines - 1, #prefix, -1, "CcaspHelpTopic" })
    if topic.description then
      table.insert(lines, "      " .. topic.description)
    end
    table.insert(lines, "")
  end

  table.insert(lines, "  " .. string.rep("─", 50))
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspSeparator" })
  table.insert(lines, "")
  table.insert(lines, "  [Enter] Open topic  [/] Search  [q] Close")
  table.insert(lines, "")

  helpers.set_buffer_content(panel.bufnr, lines)

  -- Apply highlights
  local ns = helpers.prepare_highlights("ccasp_help", panel.bufnr)
  for _, hl in ipairs(highlights) do
    helpers.add_highlight(panel.bufnr, ns, hl[4], hl[1], hl[2], hl[3])
  end

  -- Setup topic list keymaps
  M.setup_topic_list_keymaps(topics)
end

-- Show a specific topic's content
function M.show_topic(topic_id)
  if not panel.bufnr or not vim.api.nvim_buf_is_valid(panel.bufnr) then
    return
  end

  local wiki = require("ccasp.help.wiki_content")
  local content = wiki.get_topic(topic_id)

  if not content then
    vim.notify("CCASP Help: Topic not found: " .. tostring(topic_id), vim.log.levels.WARN)
    return
  end

  panel.current_view = "content"
  panel.current_topic = topic_id

  local lines = {}
  local highlights = {}

  -- Breadcrumb
  table.insert(lines, "")
  local breadcrumb = "  " .. icons.book .. " Help " .. icons.breadcrumb .. " " .. content.title
  table.insert(lines, breadcrumb)
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspHelpTitle" })
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", 50))
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspSeparator" })
  table.insert(lines, "")

  -- Content lines
  for _, line in ipairs(content.content or {}) do
    if line:match("^##") then
      -- Section header
      table.insert(lines, "")
      local header = "  " .. line:gsub("^##%s*", "")
      table.insert(lines, header)
      table.insert(highlights, { #lines - 1, 0, -1, "CcaspOnboardingHeader" })
      table.insert(lines, "")
    elseif line:match("^%-") then
      -- Bullet point
      table.insert(lines, "    " .. icons.arrow_right .. " " .. line:gsub("^%-%s*", ""))
    elseif line == "" then
      table.insert(lines, "")
    else
      table.insert(lines, "    " .. line)
    end
  end

  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", 50))
  table.insert(highlights, { #lines - 1, 0, -1, "CcaspSeparator" })
  table.insert(lines, "")
  table.insert(lines, "  [Backspace] Back to topics  [/] Search  [q] Close")
  table.insert(lines, "")

  helpers.set_buffer_content(panel.bufnr, lines)

  -- Apply highlights
  local ns = helpers.prepare_highlights("ccasp_help", panel.bufnr)
  for _, hl in ipairs(highlights) do
    helpers.add_highlight(panel.bufnr, ns, hl[4], hl[1], hl[2], hl[3])
  end

  -- Setup content view keymaps
  M.setup_content_keymaps()

  -- Update footer
  pcall(vim.api.nvim_win_set_config, panel.winid, {
    footer = " [Backspace] back  [/] search  [q] close ",
    footer_pos = "center",
  })
end

-- Setup keymaps for topic list view
function M.setup_topic_list_keymaps(topics)
  if not panel.bufnr then return end
  local opts = { buffer = panel.bufnr, nowait = true, silent = true }

  -- Enter to open topic under cursor
  vim.keymap.set("n", "<CR>", function()
    local cursor_line = vim.api.nvim_win_get_cursor(panel.winid)[1]
    -- Calculate which topic based on cursor position
    -- Topics start at line 8 (1-indexed), each takes 3 lines (title, desc, blank)
    local topic_idx = math.floor((cursor_line - 7) / 3) + 1
    if topic_idx >= 1 and topic_idx <= #topics then
      M.show_topic(topics[topic_idx].id)
    end
  end, opts)

  -- Number keys to jump to topic
  for i = 1, math.min(#topics, 9) do
    vim.keymap.set("n", tostring(i), function()
      if topics[i] then
        M.show_topic(topics[i].id)
      end
    end, opts)
  end

  -- Search
  vim.keymap.set("n", "/", function()
    local search_ok, search = pcall(require, "ccasp.help.search")
    if search_ok then
      search.open()
    end
  end, opts)
end

-- Setup keymaps for content view
function M.setup_content_keymaps()
  if not panel.bufnr then return end
  local opts = { buffer = panel.bufnr, nowait = true, silent = true }

  -- Backspace / Enter to go back to topic list
  vim.keymap.set("n", "<BS>", M.show_topic_list, opts)
  vim.keymap.set("n", "<Backspace>", M.show_topic_list, opts)
  vim.keymap.set("n", "<CR>", M.show_topic_list, opts)

  -- Search
  vim.keymap.set("n", "/", function()
    local search_ok, search = pcall(require, "ccasp.help.search")
    if search_ok then
      search.open()
    end
  end, opts)
end

return M
