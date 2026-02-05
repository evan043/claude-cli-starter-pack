-- CCASP Search Component
-- Fuzzy search for commands using telescope or fallback

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

-- Telescope-based search
function M._telescope_search()
  local pickers = require("telescope.pickers")
  local finders = require("telescope.finders")
  local conf = require("telescope.config").values
  local actions = require("telescope.actions")
  local action_state = require("telescope.actions.state")

  local commands = require("ccasp.core.commands")
  local all_commands = commands.get_all()

  -- Build results list
  local results = {}
  for name, cmd in pairs(all_commands) do
    table.insert(results, {
      name = name,
      description = cmd.description or "",
      section = cmd.section or "OTHER",
    })
  end

  -- Sort by name
  table.sort(results, function(a, b)
    return a.name < b.name
  end)

  pickers.new({}, {
    prompt_title = "CCASP Commands",
    finder = finders.new_table({
      results = results,
      entry_maker = function(entry)
        return {
          value = entry,
          display = "/" .. entry.name .. " - " .. entry.description:sub(1, 40),
          ordinal = entry.name .. " " .. entry.description .. " " .. entry.section,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
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
end

-- Fallback search using vim.ui.select
function M._fallback_search()
  local commands = require("ccasp.core.commands")
  local all_commands = commands.get_all()

  -- Build list
  local items = {}
  local names = {}
  for name, cmd in pairs(all_commands) do
    table.insert(names, name)
    items[name] = "/" .. name .. " - " .. (cmd.description or ""):sub(1, 40)
  end

  table.sort(names)

  local display_items = {}
  for _, name in ipairs(names) do
    table.insert(display_items, items[name])
  end

  vim.ui.select(display_items, {
    prompt = "Select CCASP command:",
  }, function(choice, idx)
    if choice and idx then
      local ccasp = require("ccasp")
      ccasp.state.selected_command = names[idx]
      ccasp.ui.sidebar.refresh()
    end
  end)
end

-- Inline search - filters sidebar list without popup
function M.inline_search()
  local ccasp = require("ccasp")

  vim.ui.input({
    prompt = "Search commands: ",
    default = ccasp.state.search_query or "",
  }, function(input)
    if input ~= nil then
      ccasp.state.search_query = input
      require("ccasp.ui.sidebar").refresh()
    end
  end)
end

-- Clear search
function M.clear()
  local ccasp = require("ccasp")
  ccasp.state.search_query = ""
  require("ccasp.ui.sidebar").refresh()
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

-- Filter and sort commands by search query
function M.filter_commands(commands_table, query)
  if not query or query == "" then
    return commands_table
  end

  local results = {}

  for name, cmd in pairs(commands_table) do
    local match_name, score_name = M.fuzzy_match(name, query)
    local match_desc, score_desc = false, 0

    if cmd.description then
      match_desc, score_desc = M.fuzzy_match(cmd.description, query)
    end

    if match_name or match_desc then
      table.insert(results, {
        name = name,
        cmd = cmd,
        score = math.max(score_name * 2, score_desc), -- Prioritize name matches
      })
    end
  end

  -- Sort by score descending
  table.sort(results, function(a, b)
    return a.score > b.score
  end)

  -- Return filtered commands table
  local filtered = {}
  for _, result in ipairs(results) do
    filtered[result.name] = result.cmd
  end

  return filtered
end

return M
