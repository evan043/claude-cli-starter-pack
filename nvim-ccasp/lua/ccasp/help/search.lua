-- ccasp/help/search.lua - Help search with Telescope fuzzy finder + fallback
-- Builds search index from wiki_content, provides Telescope picker or vim.ui.select

local M = {}

local icons = require("ccasp.ui.icons")

-- Open search interface (Telescope or fallback)
function M.open()
  local has_telescope, _ = pcall(require, "telescope")
  if has_telescope then
    M.telescope_search()
  else
    M.fallback_search()
  end
end

-- Telescope-based fuzzy search
function M.telescope_search()
  local pickers = require("telescope.pickers")
  local finders = require("telescope.finders")
  local conf = require("telescope.config").values
  local actions = require("telescope.actions")
  local action_state = require("telescope.actions.state")
  local previewers = require("telescope.previewers")

  local wiki = require("ccasp.help.wiki_content")
  local all_topics = wiki.get_all_topics()

  -- Build entries from all topics and their content
  local entries = {}
  for _, topic in ipairs(all_topics) do
    -- Add topic as entry
    table.insert(entries, {
      display = topic.icon .. "  " .. topic.title .. "  (" .. topic.description .. ")",
      topic_id = topic.id,
      title = topic.title,
      content = topic.content,
      ordinal = topic.title .. " " .. topic.description .. " " .. table.concat(topic.content or {}, " "),
    })
  end

  pickers.new({}, {
    prompt_title = icons.search_help .. " CCASP Help Search",
    finder = finders.new_table({
      results = entries,
      entry_maker = function(entry)
        return {
          value = entry,
          display = entry.display,
          ordinal = entry.ordinal,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    previewer = previewers.new_buffer_previewer({
      title = "Help Preview",
      define_preview = function(self, entry)
        local content = entry.value.content or {}
        local preview_lines = {}
        table.insert(preview_lines, "# " .. entry.value.title)
        table.insert(preview_lines, "")
        for _, line in ipairs(content) do
          table.insert(preview_lines, line)
        end
        vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, preview_lines)
        vim.bo[self.state.bufnr].filetype = "markdown"
      end,
    }),
    attach_mappings = function(prompt_bufnr, _)
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        if selection and selection.value then
          local help = require("ccasp.help")
          help.open(selection.value.topic_id)
        end
      end)
      return true
    end,
  }):find()
end

-- Fallback search using vim.ui.select
function M.fallback_search()
  vim.ui.input({ prompt = icons.search_help .. " Search help: " }, function(query)
    if not query or query == "" then
      return
    end

    local wiki = require("ccasp.help.wiki_content")
    local results = wiki.search(query)

    if #results == 0 then
      vim.notify("CCASP Help: No results for '" .. query .. "'", vim.log.levels.INFO)
      return
    end

    -- Build display items
    local items = {}
    local topic_ids = {}
    for _, result in ipairs(results) do
      table.insert(items, result.icon .. "  " .. result.title .. " (score: " .. result.score .. ")")
      table.insert(topic_ids, result.id)
    end

    vim.ui.select(items, {
      prompt = "Search results for '" .. query .. "':",
    }, function(_, idx)
      if idx then
        local help = require("ccasp.help")
        help.open(topic_ids[idx])
      end
    end)
  end)
end

return M
