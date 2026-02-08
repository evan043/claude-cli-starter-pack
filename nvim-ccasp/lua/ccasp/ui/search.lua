-- CCASP Search Component
-- Fuzzy search for commands using telescope or fallback with categorized results

local M = {}

-- Open search
function M.open()
  -- Try telescope first
  local has_telescope, telescope = pcall(require, "telescope.builtin")

  if has_telescope then
    M._telescope_search()
  else
    M._fallback_search()
  end
end

-- Telescope-based search with categorized results
function M._telescope_search()
  local pickers = require("telescope.pickers")
  local finders = require("telescope.finders")
  local conf = require("telescope.config").values
  local actions = require("telescope.actions")
  local action_state = require("telescope.actions.state")
  local previewers = require("telescope.previewers")

  local commands = require("ccasp.core.commands")
  local all_commands = commands.get_all()
  local nf = require("ccasp.ui.icons")

  -- Build results list
  local results = {}
  for name, cmd in pairs(all_commands) do
    table.insert(results, {
      name = name,
      description = cmd.description or "",
      section = cmd.section or (nf.commands .. " OTHER"),
      options = cmd.options or {},
      path = cmd.path or "",
    })
  end

  -- Sort by section first, then by name
  table.sort(results, function(a, b)
    if a.section == b.section then
      return a.name < b.name
    end
    return a.section < b.section
  end)

  -- Create custom previewer
  local custom_previewer = previewers.new_buffer_previewer({
    title = "Command Details",
    define_preview = function(self, entry, status)
      local cmd = entry.value
      local lines = {}

      -- Description
      table.insert(lines, "Description:")
      table.insert(lines, "  " .. (cmd.description ~= "" and cmd.description or "No description available"))
      table.insert(lines, "")

      -- Section
      table.insert(lines, "Section:")
      table.insert(lines, "  " .. cmd.section)
      table.insert(lines, "")

      -- Options (if any)
      if cmd.options and #cmd.options > 0 then
        table.insert(lines, "Options:")
        for _, opt in ipairs(cmd.options) do
          table.insert(lines, "  • " .. opt.label)
          if opt.description and opt.description ~= "" then
            table.insert(lines, "    " .. opt.description)
          end
        end
        table.insert(lines, "")
      end

      -- File path
      table.insert(lines, "File:")
      table.insert(lines, "  " .. cmd.path)

      vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)

      -- Apply highlights
      vim.api.nvim_buf_add_highlight(self.state.bufnr, -1, "CcaspSearchSection", 0, 0, -1)
      vim.api.nvim_buf_add_highlight(self.state.bufnr, -1, "CcaspSearchSection", 4, 0, -1)
      if #cmd.options > 0 then
        vim.api.nvim_buf_add_highlight(self.state.bufnr, -1, "CcaspSearchSection", 6 + #lines - 2 - #cmd.options * 2, 0, -1)
      end
    end,
  })

  pickers.new({}, {
    prompt_title = "CCASP Commands (Categorized)",
    finder = finders.new_table({
      results = results,
      entry_maker = function(entry)
        -- Extract section name without icon for cleaner display
        local section_display = entry.section:gsub("^.-%s+", "")
        return {
          value = entry,
          display = "[" .. section_display .. "] /" .. entry.name .. " - " .. entry.description:sub(1, 40),
          ordinal = entry.name .. " " .. entry.description .. " " .. entry.section,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    previewer = custom_previewer,
    attach_mappings = function(prompt_bufnr, map)
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        if selection then
          local ccasp = require("ccasp")
          ccasp.state.selected_command = selection.value.name
          ccasp.ui.sidebar.refresh()
        end
      end)

      -- Run command directly with <C-CR>
      map("i", "<C-CR>", function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        if selection then
          local ccasp = require("ccasp")
          ccasp.run_command(selection.value.name)
        end
      end)

      return true
    end,
  }):find()

  -- Setup highlight groups if they don't exist
  vim.api.nvim_set_hl(0, "CcaspSearchMatch", { link = "IncSearch", default = true })
  vim.api.nvim_set_hl(0, "CcaspSearchSection", { link = "Title", default = true })
end

-- Fallback search using vim.ui.select with categorized groups
function M._fallback_search()
  local commands = require("ccasp.core.commands")
  local sections = commands.get_sections()

  -- Build categorized display items
  local display_items = {}
  local item_map = {} -- Maps display index to command name

  for _, section in ipairs(sections) do
    -- Section header
    local section_display = section.name:gsub("^.-%s+", "")
    table.insert(display_items, "── " .. section_display .. " " .. string.rep("─", 30))
    table.insert(item_map, nil) -- Header, not selectable

    -- Commands in this section
    for _, cmd_name in ipairs(section.commands) do
      local cmd = commands.get(cmd_name)
      if cmd then
        local desc = (cmd.description or ""):sub(1, 40)
        table.insert(display_items, "  /" .. cmd_name .. " - " .. desc)
        table.insert(item_map, cmd_name)
      end
    end
  end

  vim.ui.select(display_items, {
    prompt = "Select CCASP command:",
    format_item = function(item)
      return item
    end,
  }, function(choice, idx)
    if choice and idx and item_map[idx] then
      local ccasp = require("ccasp")
      ccasp.state.selected_command = item_map[idx]
      ccasp.ui.sidebar.refresh()
    end
  end)
end

-- Open categorized search in custom floating window
function M.open_categorized()
  local commands = require("ccasp.core.commands")
  local sections = commands.get_sections()
  local nf = require("ccasp.ui.icons")

  -- Build categorized items with expand/collapse state
  local state = {
    sections = {},
    items = {},
    selected = 1,
    filter = "",
    expanded = {},
  }

  -- Initialize sections with expand/collapse
  for _, section in ipairs(sections) do
    local section_name = section.name
    state.expanded[section_name] = true -- All expanded by default
    table.insert(state.sections, section)
  end

  -- Create buffer
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(buf, "bufhidden", "wipe")
  vim.api.nvim_buf_set_option(buf, "filetype", "ccasp-search")

  -- Calculate window size
  local width = 60
  local height = 20
  local win_height = vim.o.lines
  local win_width = vim.o.columns
  local row = math.floor((win_height - height) / 2)
  local col = math.floor((win_width - width) / 2)

  -- Window options
  local opts = {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = "rounded",
  }

  -- Create window
  local win = vim.api.nvim_open_win(buf, true, opts)

  -- Set window highlight for border glow
  vim.api.nvim_win_set_option(win, "winhighlight", "FloatBorder:CcaspBorderGlow")

  -- Setup highlight groups
  -- Fallback highlights (only set if not already defined by highlights.lua)
  vim.api.nvim_set_hl(0, "CcaspSearchMatch", { fg = "#61afef", bold = true, default = true })
  vim.api.nvim_set_hl(0, "CcaspSearchSection", { fg = "#56b6c2", bold = true, default = true })
  vim.api.nvim_set_hl(0, "CcaspCmdName", { fg = "#61afef", default = true })
  vim.api.nvim_set_hl(0, "CcaspCmdDesc", { fg = "#4a5568", default = true })
  vim.api.nvim_set_hl(0, "CcaspBorderGlow", { fg = "#1e3a5f", default = true })

  -- Render function
  local function render()
    local lines = {}
    state.items = {}

    -- Filter text at top
    if state.filter ~= "" then
      table.insert(lines, nf.search .. " Filter: " .. state.filter)
      table.insert(lines, string.rep("─", width - 2))
    end

    local line_offset = state.filter ~= "" and 2 or 0
    local current_line = line_offset + 1

    for _, section in ipairs(state.sections) do
      local section_name = section.name
      local section_display = section_name:gsub("^.-%s+", "")
      local is_expanded = state.expanded[section_name]

      -- Section header
      local icon = is_expanded and nf.expanded or nf.collapsed
      local header = icon .. " " .. section_display .. " (" .. #section.commands .. ")"
      table.insert(lines, header)
      table.insert(state.items, { type = "section", section = section_name, line = current_line })
      current_line = current_line + 1

      -- Commands (if expanded and match filter)
      if is_expanded then
        for _, cmd_name in ipairs(section.commands) do
          local cmd = commands.get(cmd_name)
          if cmd then
            -- Apply filter
            local matches = state.filter == ""
              or cmd_name:lower():find(state.filter:lower(), 1, true)
              or cmd.description:lower():find(state.filter:lower(), 1, true)

            if matches then
              local desc = (cmd.description or ""):sub(1, 35)
              local line = "  " .. nf.arrow_right .. " /" .. cmd_name .. " " .. nf.dot .. " " .. desc
              table.insert(lines, line)
              table.insert(state.items, { type = "command", name = cmd_name, line = current_line })
              current_line = current_line + 1
            end
          end
        end
      end
    end

    -- Set lines
    vim.api.nvim_buf_set_option(buf, "modifiable", true)
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
    vim.api.nvim_buf_set_option(buf, "modifiable", false)

    -- Apply highlights
    vim.api.nvim_buf_clear_namespace(buf, -1, 0, -1)

    if state.filter ~= "" then
      vim.api.nvim_buf_add_highlight(buf, -1, "CcaspSearchMatch", 0, 0, -1)
    end

    for i, line in ipairs(lines) do
      if line:match("^" .. nf.expanded) or line:match("^" .. nf.collapsed) then
        vim.api.nvim_buf_add_highlight(buf, -1, "CcaspSearchSection", i - 1, 0, -1)
      elseif line:match("^  " .. nf.arrow_right) then
        -- Highlight command name
        local cmd_start = line:find("/")
        local cmd_end = line:find(nf.dot) - 2
        if cmd_start and cmd_end then
          vim.api.nvim_buf_add_highlight(buf, -1, "CcaspCmdName", i - 1, cmd_start - 1, cmd_end)
          vim.api.nvim_buf_add_highlight(buf, -1, "CcaspCmdDesc", i - 1, cmd_end + 3, -1)
        end
      end

      -- Highlight current selection
      if i == state.selected then
        vim.api.nvim_buf_add_highlight(buf, -1, "Visual", i - 1, 0, -1)
      end
    end
  end

  -- Navigate
  local function navigate(delta)
    state.selected = math.max(1, math.min(state.selected + delta, #state.items + (state.filter ~= "" and 2 or 0)))
    render()
  end

  -- Toggle section
  local function toggle_section()
    local item_idx = state.selected - (state.filter ~= "" and 2 or 0)
    if item_idx > 0 and item_idx <= #state.items then
      local item = state.items[item_idx]
      if item.type == "section" then
        state.expanded[item.section] = not state.expanded[item.section]
        render()
      end
    end
  end

  -- Select command
  local function select_command()
    local item_idx = state.selected - (state.filter ~= "" and 2 or 0)
    if item_idx > 0 and item_idx <= #state.items then
      local item = state.items[item_idx]
      if item.type == "command" then
        vim.api.nvim_win_close(win, true)
        local ccasp = require("ccasp")
        ccasp.state.selected_command = item.name
        ccasp.ui.sidebar.refresh()
      elseif item.type == "section" then
        toggle_section()
      end
    end
  end

  -- Filter prompt
  local function start_filter()
    vim.ui.input({ prompt = "Filter: " }, function(input)
      if input then
        state.filter = input
        state.selected = 1
        render()
      end
    end)
  end

  -- Keymaps
  vim.keymap.set("n", "j", function() navigate(1) end, { buffer = buf, nowait = true })
  vim.keymap.set("n", "k", function() navigate(-1) end, { buffer = buf, nowait = true })
  vim.keymap.set("n", "<Down>", function() navigate(1) end, { buffer = buf, nowait = true })
  vim.keymap.set("n", "<Up>", function() navigate(-1) end, { buffer = buf, nowait = true })
  vim.keymap.set("n", "<CR>", select_command, { buffer = buf, nowait = true })
  vim.keymap.set("n", "<Space>", toggle_section, { buffer = buf, nowait = true })
  vim.keymap.set("n", "/", start_filter, { buffer = buf, nowait = true })
  vim.keymap.set("n", "q", function()
    vim.api.nvim_win_close(win, true)
  end, { buffer = buf, nowait = true })
  vim.keymap.set("n", "<Esc>", function()
    vim.api.nvim_win_close(win, true)
  end, { buffer = buf, nowait = true })

  -- Initial render
  render()
end

-- Simple fuzzy match function
function M.fuzzy_match(str, pattern)
  if not pattern or pattern == "" then
    return true, 0
  end

  str = str:lower()
  pattern = pattern:lower()

  -- Exact substring match has highest score
  local exact_pos = str:find(pattern, 1, true)
  if exact_pos then
    return true, 1000 - exact_pos
  end

  -- Character-by-character fuzzy match
  local pattern_idx = 1
  local score = 0
  local consecutive = 0

  for i = 1, #str do
    if pattern_idx <= #pattern then
      if str:sub(i, i) == pattern:sub(pattern_idx, pattern_idx) then
        pattern_idx = pattern_idx + 1
        consecutive = consecutive + 1
        score = score + consecutive * 10
      else
        consecutive = 0
      end
    end
  end

  -- Must match all characters
  if pattern_idx > #pattern then
    return true, score
  end

  return false, 0
end

return M
