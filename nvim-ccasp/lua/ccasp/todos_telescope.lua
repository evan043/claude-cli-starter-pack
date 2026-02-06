-- ccasp/todos_telescope.lua - Telescope integration for todo fuzzy finding
-- Search and select todos with preview

local M = {}

local has_telescope, _ = pcall(require, "telescope")
if not has_telescope then
  function M.pick()
    vim.notify("CCASP: Telescope not installed", vim.log.levels.WARN)
  end
  return M
end

local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local previewers = require("telescope.previewers")

local todos_mod = require("ccasp.todos")

-- Create a previewer that shows todo details
local function create_todo_previewer()
  return previewers.new_buffer_previewer({
    title = "Todo Details",
    define_preview = function(self, entry)
      local todo = entry.value
      local lines = {}
      table.insert(lines, "# " .. (todo.title or ""))
      table.insert(lines, "")

      if todo.detail and todo.detail ~= "" then
        table.insert(lines, "## Detail")
        table.insert(lines, todo.detail)
        table.insert(lines, "")
      end

      table.insert(lines, "## Info")
      table.insert(lines, "- **Status:** " .. (todo.status or "pending"))
      table.insert(lines, "- **Priority:** " .. (todo.priority or "medium"))
      table.insert(lines, "- **Created:** " .. (todo.created_at or ""))

      if todo.tags and #todo.tags > 0 then
        table.insert(lines, "- **Tags:** " .. table.concat(todo.tags, ", "))
      end

      if todo.routed_to then
        table.insert(lines, "")
        table.insert(lines, "## Routed To")
        table.insert(lines, "- **Workflow:** " .. todo.routed_to)
        if todo.route_ref then
          table.insert(lines, "- **Reference:** " .. todo.route_ref)
        end
      end

      vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
      vim.bo[self.state.bufnr].filetype = "markdown"
    end,
  })
end

-- Main telescope picker for todos
function M.pick(opts)
  opts = opts or {}

  local todos = todos_mod.get_sorted()

  if #todos == 0 then
    vim.notify("No todos found. Use /todo-add to create one.", vim.log.levels.INFO)
    return
  end

  pickers.new(opts, {
    prompt_title = "CCASP Todos",
    finder = finders.new_table({
      results = todos,
      entry_maker = function(todo)
        local display = todos_mod.format_short(todo)
        return {
          value = todo,
          display = display,
          ordinal = (todo.title or "") .. " " .. (todo.detail or "") .. " " .. (todo.status or ""),
        }
      end,
    }),
    sorter = conf.generic_sorter(opts),
    previewer = create_todo_previewer(),
    attach_mappings = function(prompt_bufnr, map)
      -- Enter: work on the selected todo
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        if selection and selection.value then
          todos_mod.work_on(selection.value)
        end
      end)

      -- Ctrl-d: show detail
      map("i", "<C-d>", function()
        local selection = action_state.get_selected_entry()
        if selection and selection.value then
          local detail = todos_mod.format_detail(selection.value)
          vim.notify(table.concat(detail, "\n"), vim.log.levels.INFO)
        end
      end)

      -- Ctrl-x: mark complete
      map("i", "<C-x>", function()
        local selection = action_state.get_selected_entry()
        if selection and selection.value then
          local terminal = require("ccasp.terminal")
          terminal.send("/todo complete " .. selection.value.id)
          actions.close(prompt_bufnr)
        end
      end)

      -- Ctrl-a: quick add
      map("i", "<C-a>", function()
        actions.close(prompt_bufnr)
        vim.ui.input({ prompt = "New todo: " }, function(input)
          if input and input ~= "" then
            todos_mod.quick_add(input)
          end
        end)
      end)

      return true
    end,
  }):find()
end

return M
