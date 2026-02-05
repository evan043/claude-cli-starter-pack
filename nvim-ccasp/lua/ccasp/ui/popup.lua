-- CCASP Popup Component
-- Full options popup and help dialogs

local M = {}

local state = {
  popup = nil,
  cmd_name = nil,
  options = {},
  option_lines = {},  -- Maps line numbers to option indices
  selected_line = 7,  -- First option line
}

-- Check if nui is available
local function has_nui()
  local ok, _ = pcall(require, "nui.popup")
  return ok
end

-- Show full options popup for a command
function M.show_options(cmd_name)
  if not has_nui() then
    vim.notify("nui.nvim required for popup", vim.log.levels.WARN)
    return
  end

  local commands = require("ccasp.core.commands")
  local parser = require("ccasp.core.parser")
  local Popup = require("nui.popup")

  local cmd = commands.get(cmd_name)
  if not cmd then
    vim.notify("Command not found: " .. cmd_name, vim.log.levels.ERROR)
    return
  end

  -- Read full content for parsing
  local file = io.open(cmd.path, "r")
  if not file then
    vim.notify("Cannot read command file", vim.log.levels.ERROR)
    return
  end

  local content = file:read("*all")
  file:close()

  local options = parser.parse_options(content)

  -- Store state for option toggling
  state.cmd_name = cmd_name
  state.options = options
  state.option_lines = {}
  state.selected_line = 7

  -- Create popup
  state.popup = Popup({
    position = "50%",
    size = {
      width = 70,
      height = math.min(30, 10 + #options * 3),
    },
    border = {
      style = "rounded",
      text = {
        top = " /" .. cmd_name .. " - Options ",
        top_align = "center",
        bottom = " [Space] Toggle  [Enter] Run  [Esc] Cancel  [r] Reset ",
        bottom_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
    },
    win_options = {
      winhighlight = "Normal:Normal,FloatBorder:FloatBorder",
      cursorline = true,
    },
  })

  state.popup:mount()
  M._render_options()
  M._setup_popup_keybindings()
end

-- Render options content
function M._render_options()
  if not state.popup or not state.cmd_name then
    return
  end

  local commands = require("ccasp.core.commands")
  local cmd = commands.get(state.cmd_name)

  local lines = {}
  state.option_lines = {}

  table.insert(lines, "")
  table.insert(lines, "  " .. (cmd.description or "No description"))
  table.insert(lines, "")
  table.insert(lines, "  " .. string.rep("─", 64))
  table.insert(lines, "  OPTIONS")
  table.insert(lines, "  " .. string.rep("─", 64))
  table.insert(lines, "")

  local ccasp = require("ccasp")
  ccasp.state.command_options = ccasp.state.command_options or {}
  ccasp.state.command_options[state.cmd_name] = ccasp.state.command_options[state.cmd_name] or {}

  for i, opt in ipairs(state.options) do
    local checked = ccasp.state.command_options[state.cmd_name][opt.label]

    if opt.type == "checkbox" or opt.type == "radio" then
      local mark_open, mark_close = "[", "]"
      if opt.type == "radio" then
        mark_open, mark_close = "(", ")"
      end

      local mark = checked and "x" or " "
      if opt.type == "radio" then
        mark = checked and "•" or " "
      end

      table.insert(lines, "    " .. mark_open .. mark .. mark_close .. " " .. opt.label)
      state.option_lines[#lines] = i

      if opt.description and opt.description ~= "" then
        table.insert(lines, "        " .. opt.description)
      end
    else
      -- Text input option
      local value = ccasp.state.command_options[state.cmd_name][opt.label] or ""
      table.insert(lines, "    " .. opt.label .. ": " .. value)
      state.option_lines[#lines] = i

      if opt.description and opt.description ~= "" then
        table.insert(lines, "        " .. opt.description)
      end
    end

    table.insert(lines, "")
  end

  if #state.options == 0 then
    table.insert(lines, "    No configurable options")
    table.insert(lines, "")
    table.insert(lines, "    Run command with default settings.")
  end

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)

  -- Position cursor on first option
  if state.selected_line and vim.api.nvim_win_is_valid(state.popup.winid) then
    pcall(vim.api.nvim_win_set_cursor, state.popup.winid, { state.selected_line, 0 })
  end
end

-- Set up popup keybindings
function M._setup_popup_keybindings()
  if not state.popup then
    return
  end

  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }
  local ccasp = require("ccasp")

  -- Close
  vim.keymap.set("n", "<Esc>", function()
    M.close()
  end, opts)

  vim.keymap.set("n", "q", function()
    M.close()
  end, opts)

  -- Run command
  vim.keymap.set("n", "<CR>", function()
    M.close()
    ccasp.run_command(state.cmd_name)
  end, opts)

  -- Toggle option
  vim.keymap.set("n", "<Space>", function()
    M._toggle_current_option()
  end, opts)

  vim.keymap.set("n", "x", function()
    M._toggle_current_option()
  end, opts)

  -- Navigate options
  vim.keymap.set("n", "j", function()
    M._next_option()
  end, opts)

  vim.keymap.set("n", "k", function()
    M._prev_option()
  end, opts)

  vim.keymap.set("n", "<Down>", function()
    M._next_option()
  end, opts)

  vim.keymap.set("n", "<Up>", function()
    M._prev_option()
  end, opts)

  -- Reset options
  vim.keymap.set("n", "r", function()
    ccasp.state.command_options[state.cmd_name] = {}
    M._render_options()
  end, opts)

  -- Run and close
  vim.keymap.set("n", "<C-CR>", function()
    M.close()
    ccasp.run_command(state.cmd_name)
  end, opts)
end

-- Toggle option at current cursor position
function M._toggle_current_option()
  if not state.popup or not vim.api.nvim_win_is_valid(state.popup.winid) then
    return
  end

  local cursor = vim.api.nvim_win_get_cursor(state.popup.winid)
  local line = cursor[1]
  local opt_idx = state.option_lines[line]

  if not opt_idx or not state.options[opt_idx] then
    return
  end

  local opt = state.options[opt_idx]
  local ccasp = require("ccasp")

  if opt.type == "radio" then
    -- For radio buttons, clear all in the same question group and select this one
    if opt.question then
      for _, o in ipairs(state.options) do
        if o.question == opt.question then
          ccasp.state.command_options[state.cmd_name][o.label] = false
        end
      end
    end
    ccasp.state.command_options[state.cmd_name][opt.label] = true
  else
    -- Toggle checkbox
    local current = ccasp.state.command_options[state.cmd_name][opt.label]
    ccasp.state.command_options[state.cmd_name][opt.label] = not current
  end

  state.selected_line = line
  M._render_options()
end

-- Navigate to next option line
function M._next_option()
  if not state.popup or not vim.api.nvim_win_is_valid(state.popup.winid) then
    return
  end

  local cursor = vim.api.nvim_win_get_cursor(state.popup.winid)
  local current_line = cursor[1]
  local total_lines = vim.api.nvim_buf_line_count(state.popup.bufnr)

  for line = current_line + 1, total_lines do
    if state.option_lines[line] then
      vim.api.nvim_win_set_cursor(state.popup.winid, { line, 0 })
      return
    end
  end
end

-- Navigate to previous option line
function M._prev_option()
  if not state.popup or not vim.api.nvim_win_is_valid(state.popup.winid) then
    return
  end

  local cursor = vim.api.nvim_win_get_cursor(state.popup.winid)
  local current_line = cursor[1]

  for line = current_line - 1, 1, -1 do
    if state.option_lines[line] then
      vim.api.nvim_win_set_cursor(state.popup.winid, { line, 0 })
      return
    end
  end
end

-- Show help popup
function M.show_help()
  if not has_nui() then
    vim.notify("nui.nvim required for popup", vim.log.levels.WARN)
    return
  end

  local Popup = require("nui.popup")

  state.popup = Popup({
    position = "50%",
    size = {
      width = 60,
      height = 40,
    },
    border = {
      style = "rounded",
      text = {
        top = " CCASP Keybindings ",
        top_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
    },
  })

  state.popup:mount()

  local lines = {
    "",
    "  GLOBAL",
    "  ──────────────────────────────────────────",
    "  <C-b>        Toggle sidebar",
    "  <C-\\>       Toggle focus sidebar/terminal",
    "  <Tab>        Cycle tabs",
    "  1/2/3/4      Jump to tab",
    "  ?            Show this help",
    "  q            Close popup/sidebar",
    "",
    "  NAVIGATION",
    "  ──────────────────────────────────────────",
    "  j/k          Move up/down",
    "  gg           Jump to top",
    "  G            Jump to bottom",
    "  {/}          Jump to prev/next section",
    "",
    "  SECTIONS",
    "  ──────────────────────────────────────────",
    "  zo           Expand section",
    "  zc           Collapse section",
    "  za           Toggle section",
    "  zM           Collapse all",
    "  zR           Expand all",
    "",
    "  COMMANDS",
    "  ──────────────────────────────────────────",
    "  /            Search commands",
    "  <Enter>      Run selected command",
    "  e            Expand options popup",
    "  <Space>      Toggle option",
    "  y            Yank command name",
    "  o            Open command source",
    "",
    "  LEADER KEYS",
    "  ──────────────────────────────────────────",
    "  <leader>cc   Open CCASP",
    "  <leader>cr   Run last command",
    "  <leader>cs   Quick search",
    "  <leader>cu   Check updates",
    "  <leader>cp   Toggle permissions",
    "",
  }

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)

  -- Close on any key
  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }
  vim.keymap.set("n", "<Esc>", function() M.close() end, opts)
  vim.keymap.set("n", "q", function() M.close() end, opts)
  vim.keymap.set("n", "?", function() M.close() end, opts)
end

-- Close popup
function M.close()
  if state.popup then
    state.popup:unmount()
    state.popup = nil
  end
  state.cmd_name = nil
  state.options = {}
  state.option_lines = {}
end

-- Show diff popup for protected command vs template
function M.show_diff(cmd_name)
  if not has_nui() then
    vim.notify("nui.nvim required for popup", vim.log.levels.WARN)
    return
  end

  local protected = require("ccasp.core.protected")
  local Popup = require("nui.popup")

  local diff, err = protected.get_diff(cmd_name)

  if not diff then
    vim.notify("Cannot generate diff: " .. (err or "unknown error"), vim.log.levels.WARN)
    -- Show info popup instead
    state.popup = Popup({
      position = "50%",
      size = { width = 50, height = 5 },
      border = {
        style = "rounded",
        text = { top = " No Diff Available ", top_align = "center" },
      },
    })
    state.popup:mount()
    local lines = { "", "  " .. (err or "Template not found"), "" }
    vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
    local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }
    vim.keymap.set("n", "<Esc>", function() M.close() end, opts)
    vim.keymap.set("n", "q", function() M.close() end, opts)
    return
  end

  -- Create popup
  state.popup = Popup({
    position = "50%",
    size = {
      width = 80,
      height = 40,
    },
    border = {
      style = "rounded",
      text = {
        top = " /" .. cmd_name .. " - Diff vs Template ",
        top_align = "center",
        bottom = " [Esc] Close ",
        bottom_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
      filetype = "diff",
    },
    win_options = {
      winhighlight = "Normal:Normal,FloatBorder:FloatBorder",
    },
  })

  state.popup:mount()

  -- Set content
  local lines = vim.split(diff, "\n")

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)

  -- Keybindings
  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }
  vim.keymap.set("n", "<Esc>", function() M.close() end, opts)
  vim.keymap.set("n", "q", function() M.close() end, opts)
end

-- Show confirmation dialog
function M.confirm(title, message, on_confirm)
  if not has_nui() then
    -- Fallback to vim.ui.select
    vim.ui.select({ "Yes", "No" }, {
      prompt = title .. ": " .. message,
    }, function(choice)
      if choice == "Yes" and on_confirm then
        on_confirm()
      end
    end)
    return
  end

  local Popup = require("nui.popup")

  state.popup = Popup({
    position = "50%",
    size = {
      width = 50,
      height = 7,
    },
    border = {
      style = "rounded",
      text = {
        top = " " .. title .. " ",
        top_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
    },
  })

  state.popup:mount()

  local lines = {
    "",
    "  " .. message,
    "",
    "  [y] Yes    [n] No",
    "",
  }

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)

  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }

  vim.keymap.set("n", "y", function()
    M.close()
    if on_confirm then
      on_confirm()
    end
  end, opts)

  vim.keymap.set("n", "<CR>", function()
    M.close()
    if on_confirm then
      on_confirm()
    end
  end, opts)

  vim.keymap.set("n", "n", function()
    M.close()
  end, opts)

  vim.keymap.set("n", "<Esc>", function()
    M.close()
  end, opts)

  vim.keymap.set("n", "q", function()
    M.close()
  end, opts)
end

return M
