-- ccasp/appshell/right_panel.lua - Right Side Panel
-- Optional auxiliary panel for context, logs, or AI output
-- Opens on the right edge between header and footer

local M = {}
local icons = require("ccasp.ui.icons")

local state = {
  win = nil,
  buf = nil,
  mode = "context", -- "context", "logs", "output"
}

-- Mode renderers
local mode_renderers = {
  context = function(lines)
    table.insert(lines, "  " .. icons.dashboard .. " Context")
    table.insert(lines, "  " .. string.rep("─", 34))
    table.insert(lines, "")
    table.insert(lines, "  Project: " .. vim.fn.fnamemodify(vim.fn.getcwd(), ":t"))
    table.insert(lines, "  CWD: " .. vim.fn.getcwd())
    table.insert(lines, "")

    -- Git info
    local branch = vim.fn.system("git rev-parse --abbrev-ref HEAD 2>/dev/null"):gsub("%s+$", "")
    if branch ~= "" and not branch:match("^fatal") then
      table.insert(lines, "  " .. icons.branch .. " Branch: " .. branch)
      local status = vim.fn.system("git status --porcelain 2>/dev/null")
      local changed = select(2, status:gsub("\n", "\n"))
      table.insert(lines, "  " .. icons.edit .. " Changed: " .. changed .. " files")
    end

    table.insert(lines, "")
    table.insert(lines, "  " .. string.rep("─", 34))
    table.insert(lines, "")

    -- Session info
    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local all = sessions.list()
      table.insert(lines, "  " .. icons.terminal .. " Sessions: " .. #all)
      table.insert(lines, "  " .. icons.settings .. " Layout: " .. sessions.get_layout())
    end
  end,

  logs = function(lines)
    table.insert(lines, "  " .. icons.terminal .. " Logs")
    table.insert(lines, "  " .. string.rep("─", 34))
    table.insert(lines, "")
    table.insert(lines, "  (Log output will appear here)")
  end,

  output = function(lines)
    table.insert(lines, "  " .. icons.ai .. " AI Output")
    table.insert(lines, "  " .. string.rep("─", 34))
    table.insert(lines, "")
    table.insert(lines, "  (AI response output will appear here)")
  end,
}

-- Render panel content
local function render()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  local lines = {}
  local renderer = mode_renderers[state.mode]
  if renderer then
    renderer(lines)
  end

  local ns = vim.api.nvim_create_namespace("ccasp_right_panel")

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Highlights
  vim.api.nvim_buf_clear_namespace(state.buf, ns, 0, -1)
  for i, line in ipairs(lines) do
    if line:match("^  [─]+$") then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspSeparator", i - 1, 0, -1)
    elseif i == 1 then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns, "CcaspFlyoutTitle", i - 1, 0, -1)
    end
  end
end

-- Setup keymaps
local function setup_keymaps()
  if not state.buf then return end
  local opts = { buffer = state.buf, nowait = true, silent = true }

  vim.keymap.set("n", "q", function() M.close() end, opts)
  vim.keymap.set("n", "<Esc>", function() M.close() end, opts)

  -- Switch modes
  vim.keymap.set("n", "1", function() M.set_mode("context") end, opts)
  vim.keymap.set("n", "2", function() M.set_mode("logs") end, opts)
  vim.keymap.set("n", "3", function() M.set_mode("output") end, opts)

  -- Refresh
  vim.keymap.set("n", "r", function() render() end, opts)
end

-- Open right panel
function M.open(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    render()
    return
  end

  state.buf = vim.api.nvim_create_buf(false, true)
  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  state.win = vim.api.nvim_open_win(state.buf, false, {
    relative = "editor",
    row = bounds.row,
    col = bounds.col,
    width = bounds.width,
    height = bounds.height,
    style = "minimal",
    focusable = true,
    zindex = 50,
    border = { "│", "", "", "", "", "", "│", "│" },
  })

  vim.wo[state.win].winhighlight = "Normal:CcaspRightPanelBg,EndOfBuffer:CcaspRightPanelBg,FloatBorder:CcaspRightPanelBorder"
  vim.wo[state.win].wrap = false
  vim.wo[state.win].cursorline = false

  setup_keymaps()
  render()
end

-- Close right panel
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.win = nil
  state.buf = nil

  -- Notify appshell
  local appshell_ok, appshell = pcall(require, "ccasp.appshell")
  if appshell_ok then
    appshell.config.right_panel.visible = false
  end
end

-- Resize
function M.resize(bounds)
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_set_config(state.win, {
      relative = "editor",
      row = bounds.row,
      col = bounds.col,
      width = bounds.width,
      height = bounds.height,
    })
    render()
  end
end

-- Set display mode
function M.set_mode(mode)
  if mode_renderers[mode] then
    state.mode = mode
    render()
  end
end

-- Check if open
function M.is_open()
  return state.win ~= nil and vim.api.nvim_win_is_valid(state.win)
end

-- Get window
function M.get_win()
  return state.win
end

-- Append log line (for logs mode)
function M.append_log(line)
  if state.mode ~= "logs" then return end
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then return end

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, -1, -1, false, { "  " .. line })
  vim.bo[state.buf].modifiable = false
end

return M
