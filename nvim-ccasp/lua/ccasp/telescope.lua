-- ccasp/telescope.lua - Telescope integration for browsing CCASP components
local M = {}

-- Check if telescope is available
local has_telescope, telescope = pcall(require, "telescope")
if not has_telescope then
  -- Fallback implementations without telescope
  function M.commands()
    vim.notify("CCASP: Telescope not installed, using fallback", vim.log.levels.WARN)
    M.fallback_commands()
  end

  function M.skills()
    vim.notify("CCASP: Telescope not installed, using fallback", vim.log.levels.WARN)
    M.fallback_skills()
  end

  function M.agents()
    vim.notify("CCASP: Telescope not installed, using fallback", vim.log.levels.WARN)
    M.fallback_agents()
  end

  function M.hooks()
    vim.notify("CCASP: Telescope not installed, using fallback", vim.log.levels.WARN)
    M.fallback_hooks()
  end

  return M
end

local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local previewers = require("telescope.previewers")

-- Get config utilities
local function get_config()
  return require("ccasp.config")
end

-- Create markdown previewer
local function create_markdown_previewer(title)
  return previewers.new_buffer_previewer({
    title = title,
    define_preview = function(self, entry)
      local lines = vim.fn.readfile(entry.path)
      vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
      vim.bo[self.state.bufnr].filetype = "markdown"
    end,
  })
end

-- Create default action (edit file)
local function create_edit_action()
  return function(prompt_bufnr)
    actions.close(prompt_bufnr)
    local selection = action_state.get_selected_entry()
    vim.cmd("edit " .. selection.path)
  end
end

-- Browse slash commands
function M.commands()
  local config = get_config()
  local commands = config.get_commands()

  if #commands == 0 then
    vim.notify("CCASP: No commands found. Run 'ccasp init' first.", vim.log.levels.WARN)
    return
  end

  pickers.new({}, {
    prompt_title = "CCASP Slash Commands",
    finder = finders.new_table({
      results = commands,
      entry_maker = function(cmd)
        return {
          value = cmd,
          display = string.format("/%s - %s", cmd.name, cmd.description or ""),
          ordinal = cmd.name .. " " .. (cmd.description or ""),
          path = cmd.path,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    previewer = create_markdown_previewer("Command Preview"),
    attach_mappings = function(prompt_bufnr, map)
      actions.select_default:replace(create_edit_action())

      map("i", "<C-y>", function()
        local selection = action_state.get_selected_entry()
        vim.fn.setreg("+", "/" .. selection.value.name)
        vim.notify("Copied: /" .. selection.value.name)
      end)

      return true
    end,
  }):find()
end

-- Create skill previewer with fallback
local function create_skill_previewer()
  return previewers.new_buffer_previewer({
    title = "Skill Preview",
    define_preview = function(self, entry)
      local preview_path = entry.value.entry_point or (entry.value.path .. "/skill.md")
      if vim.fn.filereadable(preview_path) == 1 then
        local lines = vim.fn.readfile(preview_path)
        vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
        vim.bo[self.state.bufnr].filetype = "markdown"
      else
        vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, { "No preview available" })
      end
    end,
  })
end

-- Browse skills
function M.skills()
  local config = get_config()
  local skills = config.get_skills()

  if #skills == 0 then
    vim.notify("CCASP: No skills found. Create one with 'ccasp create-skill'.", vim.log.levels.WARN)
    return
  end

  pickers.new({}, {
    prompt_title = "CCASP Skills",
    finder = finders.new_table({
      results = skills,
      entry_maker = function(skill)
        return {
          value = skill,
          display = string.format("📦 %s [%s] - %s", skill.name, skill.version or "1.0.0", skill.description or ""),
          ordinal = skill.name .. " " .. (skill.description or ""),
          path = skill.entry_point or skill.path,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    previewer = create_skill_previewer(),
    attach_mappings = function(prompt_bufnr, map)
      actions.select_default:replace(function()
        actions.close(prompt_bufnr)
        local selection = action_state.get_selected_entry()
        local path = selection.value.entry_point or (selection.value.path .. "/skill.md")
        vim.cmd("edit " .. path)
      end)

      map("i", "<C-d>", function()
        local selection = action_state.get_selected_entry()
        actions.close(prompt_bufnr)
        vim.cmd("edit " .. selection.value.path)
      end)

      return true
    end,
  }):find()
end

-- Create javascript previewer
local function create_js_previewer(title)
  return previewers.new_buffer_previewer({
    title = title,
    define_preview = function(self, entry)
      local lines = vim.fn.readfile(entry.path)
      vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, lines)
      vim.bo[self.state.bufnr].filetype = "javascript"
    end,
  })
end

-- Browse hooks
function M.hooks()
  local config = get_config()
  local hooks = config.get_hooks()

  if #hooks == 0 then
    vim.notify("CCASP: No hooks found.", vim.log.levels.WARN)
    return
  end

  pickers.new({}, {
    prompt_title = "CCASP Hooks",
    finder = finders.new_table({
      results = hooks,
      entry_maker = function(hook)
        local icon = hook.enabled and "✓" or "○"
        return {
          value = hook,
          display = string.format("%s 🔧 %s", icon, hook.name),
          ordinal = hook.name,
          path = hook.path,
        }
      end,
    }),
    sorter = conf.generic_sorter({}),
    previewer = create_js_previewer("Hook Preview"),
    attach_mappings = function(prompt_bufnr, map)
      actions.select_default:replace(create_edit_action())
      return true
    end,
  }):find()
end

-- Browse agents (from grid config)
function M.agents()
  local ccasp = require("ccasp")
  local agents_config = ccasp.config.grid.agents

  pickers
    .new({}, {
      prompt_title = "CCASP Agents",
      finder = finders.new_table({
        results = agents_config,
        entry_maker = function(agent)
          return {
            value = agent,
            display = string.format("🤖 %s (%s) - %s", agent.name, agent.model, agent.role or ""),
            ordinal = agent.name .. " " .. (agent.role or ""),
          }
        end,
      }),
      sorter = conf.generic_sorter({}),
      attach_mappings = function(prompt_bufnr, map)
        actions.select_default:replace(function()
          actions.close(prompt_bufnr)
          local selection = action_state.get_selected_entry()
          -- Quick spawn single agent
          require("ccasp.agents").quick_spawn(selection.value.name, selection.value.model)
        end)

        return true
      end,
    })
    :find()
end


-- Fallback implementations without telescope
function M.fallback_commands()
  local config = get_config()
  local commands = config.get_commands()

  local lines = { "CCASP Commands:", "" }
  for _, cmd in ipairs(commands) do
    table.insert(lines, string.format("  /%s - %s", cmd.name, cmd.description or ""))
    table.insert(lines, "    " .. cmd.path)
  end

  M.show_floating_list(lines, "Commands")
end

function M.fallback_skills()
  local config = get_config()
  local skills = config.get_skills()

  local lines = { "CCASP Skills:", "" }
  for _, skill in ipairs(skills) do
    table.insert(lines, string.format("  📦 %s - %s", skill.name, skill.description or ""))
    table.insert(lines, "    " .. skill.path)
  end

  M.show_floating_list(lines, "Skills")
end

function M.fallback_agents()
  local ccasp = require("ccasp")
  local agents_config = ccasp.config.grid.agents

  local lines = { "CCASP Agents:", "" }
  for _, agent in ipairs(agents_config) do
    table.insert(lines, string.format("  🤖 %s (%s) - %s", agent.name, agent.model, agent.role or ""))
  end

  M.show_floating_list(lines, "Agents")
end

function M.fallback_hooks()
  local config = get_config()
  local hooks = config.get_hooks()

  local lines = { "CCASP Hooks:", "" }
  for _, hook in ipairs(hooks) do
    local icon = hook.enabled and "✓" or "○"
    table.insert(lines, string.format("  %s %s", icon, hook.name))
  end

  M.show_floating_list(lines, "Hooks")
end

-- Helper to show floating list
function M.show_floating_list(lines, title)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false

  local width = 60
  local height = math.min(#lines + 2, 30)
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = "rounded",
    title = " " .. title .. " ",
    title_pos = "center",
  })

  vim.keymap.set("n", "q", function()
    vim.api.nvim_win_close(win, true)
  end, { buffer = buf })

  vim.keymap.set("n", "<Esc>", function()
    vim.api.nvim_win_close(win, true)
  end, { buffer = buf })
end

-- Register as telescope extension (but still return M for direct access)
if has_telescope then
  telescope.register_extension({
    exports = {
      commands = M.commands,
      skills = M.skills,
      hooks = M.hooks,
      agents = M.agents,
    },
  })
end

return M
