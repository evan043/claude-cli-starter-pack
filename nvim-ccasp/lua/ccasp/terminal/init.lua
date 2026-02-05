-- CCASP Terminal Module
-- Integrates with toggleterm.nvim for Claude CLI terminal

local M = {}

local state = {
  terminal = nil,
  win = nil,
  bufnr = nil,
  last_command = nil,
  last_options = {},
  original_size = nil,
  claude_running = false, -- Track if claude CLI is running in terminal
  pending_slash_cmd = nil, -- Slash command waiting to be sent after claude starts
}

-- Check if toggleterm is available
local function has_toggleterm()
  local ok, _ = pcall(require, "toggleterm")
  return ok
end

-- Reset terminal state (useful when config changes)
local function reset_terminal()
  if state.terminal then
    pcall(function() state.terminal:close() end)
  end
  state.terminal = nil
  state.win = nil
  state.bufnr = nil
  state.claude_running = false
  state.pending_slash_cmd = nil
end

-- Create/get terminal instance
local function get_terminal()
  if state.terminal then
    return state.terminal
  end

  if not has_toggleterm() then
    return nil
  end

  local Terminal = require("toggleterm.terminal").Terminal
  local ccasp = require("ccasp")

  -- Use system shell, not claude directly
  -- Claude will be launched via send() after terminal opens
  local shell_cmd = vim.o.shell

  -- Get direction with safe default
  local direction = "vertical"
  if ccasp.config and ccasp.config.terminal and ccasp.config.terminal.direction then
    direction = ccasp.config.terminal.direction
  end

  -- Validate direction (toggleterm only accepts: horizontal, vertical, float, tab)
  if direction ~= "horizontal" and direction ~= "vertical" and direction ~= "float" and direction ~= "tab" then
    direction = "vertical"
  end

  -- Calculate size based on direction
  local term_size = 80
  if ccasp.config and ccasp.config.terminal and ccasp.config.terminal.size then
    term_size = ccasp.config.terminal.size
  end

  if direction == "vertical" then
    -- For vertical, use percentage of columns
    term_size = math.floor(vim.o.columns * (term_size / 100))
  elseif direction == "horizontal" then
    -- For horizontal, use fixed rows
    term_size = 15
  end

  -- Debug output
  vim.notify("Creating terminal: direction=" .. tostring(direction) .. " size=" .. tostring(term_size), vim.log.levels.INFO)

  state.terminal = Terminal:new({
    cmd = shell_cmd,
    dir = vim.fn.getcwd(),
    direction = direction,
    size = term_size,
    close_on_exit = false,
    on_open = function(term)
      state.win = term.window
      state.bufnr = term.bufnr

      -- Set up terminal keybindings
      local opts = { buffer = term.bufnr, noremap = true, silent = true }

      -- Exit terminal mode with double escape
      vim.keymap.set("t", "<Esc><Esc>", [[<C-\><C-n>]], opts)

      -- Clear terminal
      vim.keymap.set("t", "<C-l>", function()
        M.clear()
      end, opts)

      -- Interrupt process
      vim.keymap.set("t", "<C-c>", function()
        M.interrupt()
      end, opts)

      -- Scroll in terminal mode
      vim.keymap.set("t", "<C-u>", [[<C-\><C-n><C-u>]], opts)
      vim.keymap.set("t", "<C-d>", [[<C-\><C-n><C-d>]], opts)

      -- Normal mode keybindings when in terminal buffer
      local nopts = { buffer = term.bufnr, noremap = true, silent = true }
      vim.keymap.set("n", "i", function()
        vim.cmd("startinsert")
      end, nopts)
      vim.keymap.set("n", "a", function()
        vim.cmd("startinsert!")
      end, nopts)
      vim.keymap.set("n", "<C-y>", function()
        M.yank_output()
      end, nopts)
    end,
    on_close = function()
      state.win = nil
    end,
  })

  return state.terminal
end

-- Open terminal
function M.open()
  if has_toggleterm() then
    local term = get_terminal()
    if term then
      term:open()
    end
  else
    -- Fallback: open split with shell
    local ccasp = require("ccasp")
    local direction = ccasp.config.terminal.direction

    if direction == "vertical" then
      vim.cmd("rightbelow vsplit | terminal " .. ccasp.config.terminal.shell)
    else
      vim.cmd("rightbelow split | terminal " .. ccasp.config.terminal.shell)
    end

    state.win = vim.api.nvim_get_current_win()
    state.bufnr = vim.api.nvim_get_current_buf()
  end
end

-- Close terminal
function M.close()
  if state.terminal then
    state.terminal:close()
  elseif state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end
  state.claude_running = false
  state.pending_slash_cmd = nil
end

-- Toggle terminal
function M.toggle()
  if state.terminal then
    state.terminal:toggle()
  elseif state.win and vim.api.nvim_win_is_valid(state.win) then
    M.close()
  else
    M.open()
  end
end

-- Focus terminal
function M.focus()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_set_current_win(state.win)
    vim.cmd("startinsert")
  end
end

-- Send command to terminal
function M.send(cmd)
  if not cmd or cmd == "" then
    return
  end

  -- Store the command to send
  state.pending_cmd = cmd

  -- Try simple approach: use vim's built-in terminal
  if not state.bufnr or not vim.api.nvim_buf_is_valid(state.bufnr) then
    -- Open a new terminal split
    vim.cmd("vsplit | terminal")
    state.bufnr = vim.api.nvim_get_current_buf()
    state.win = vim.api.nvim_get_current_win()

    -- Wait for terminal to initialize
    vim.defer_fn(function()
      M._send_pending()
    end, 500)
  else
    -- Terminal exists, switch to it and send
    if state.win and vim.api.nvim_win_is_valid(state.win) then
      vim.api.nvim_set_current_win(state.win)
    end
    M._send_to_terminal(cmd)
  end
end

-- Send pending command
function M._send_pending()
  if state.pending_cmd then
    local cmd = state.pending_cmd
    state.pending_cmd = nil
    M._send_to_terminal(cmd)
  end
end

-- Internal: send to terminal
function M._send_to_terminal(cmd)
  -- Use direct chansend to terminal buffer
  if state.bufnr and vim.api.nvim_buf_is_valid(state.bufnr) then
    local job_id = vim.b[state.bufnr].terminal_job_id
    if job_id and job_id > 0 then
      vim.fn.chansend(job_id, cmd .. "\n")
      -- Focus the terminal window
      if state.win and vim.api.nvim_win_is_valid(state.win) then
        vim.api.nvim_set_current_win(state.win)
        vim.cmd("startinsert")
      end
      return
    end
  end

  -- Retry once more after a delay
  if state.pending_cmd == nil and cmd then
    state.pending_cmd = cmd
    vim.defer_fn(function()
      M._send_pending()
    end, 500)
  else
    vim.notify("Terminal not ready. Try again.", vim.log.levels.WARN)
  end
end

-- Clear terminal
function M.clear()
  M.send("clear")
end

-- Get terminal status
function M.is_open()
  return state.win and vim.api.nvim_win_is_valid(state.win)
end

-- Set terminal state (called from sidebar when it opens terminal)
function M._set_state(bufnr, win)
  state.bufnr = bufnr
  state.win = win
end

-- Set claude running state
function M._set_claude_running(running)
  state.claude_running = running
end

-- Check if claude is running
function M.is_claude_running()
  return state.claude_running
end

-- Launch interactive Claude CLI session
function M.launch_claude()
  -- Open terminal if not already open
  if not state.bufnr or not vim.api.nvim_buf_is_valid(state.bufnr) then
    vim.cmd("vsplit | terminal")
    state.bufnr = vim.api.nvim_get_current_buf()
    state.win = vim.api.nvim_get_current_win()
  end

  -- Wait for terminal, then launch claude
  vim.defer_fn(function()
    if state.bufnr and vim.api.nvim_buf_is_valid(state.bufnr) then
      local job_id = vim.b[state.bufnr].terminal_job_id
      if job_id and job_id > 0 then
        vim.fn.chansend(job_id, "claude\n")
        state.claude_running = true
        vim.notify("Launching Claude CLI...", vim.log.levels.INFO)
      end
    end
  end, 300)
end

-- Run CCASP command with options
function M.run_command(cmd_name, options)
  if not cmd_name then
    return
  end

  -- Build slash command string
  local slash_cmd = "/" .. cmd_name

  -- Add options as arguments if provided
  if options and type(options) == "table" then
    local args = {}
    for key, value in pairs(options) do
      if type(value) == "boolean" then
        if value then
          table.insert(args, "--" .. key)
        end
      elseif type(value) == "string" and value ~= "" then
        -- Quote strings with spaces
        if value:find(" ") then
          table.insert(args, string.format('--%s="%s"', key, value))
        else
          table.insert(args, string.format("--%s=%s", key, value))
        end
      elseif type(value) == "number" then
        table.insert(args, string.format("--%s=%d", key, value))
      end
    end

    if #args > 0 then
      slash_cmd = slash_cmd .. " " .. table.concat(args, " ")
    end
  end

  -- Store for re-run
  state.last_command = cmd_name
  state.last_options = options or {}

  -- Check if terminal and claude are ready
  if not state.bufnr or not vim.api.nvim_buf_is_valid(state.bufnr) then
    vim.notify("Terminal not open. Press Ctrl+B to open sidebar first.", vim.log.levels.WARN)
    return
  end

  if not state.claude_running then
    vim.notify("Claude CLI not ready yet. Please wait a moment and try again.", vim.log.levels.WARN)
    return
  end

  -- Claude is running - send the slash command directly
  local job_id = vim.b[state.bufnr].terminal_job_id
  if job_id and job_id > 0 then
    vim.fn.chansend(job_id, slash_cmd .. "\n")
    -- Focus terminal
    if state.win and vim.api.nvim_win_is_valid(state.win) then
      vim.api.nvim_set_current_win(state.win)
      vim.cmd("startinsert")
    end
  else
    vim.notify("Terminal job not found. Please reopen sidebar.", vim.log.levels.WARN)
  end
end

-- Re-run last command
function M.run_last()
  if state.last_command then
    M.run_command(state.last_command, state.last_options)
  else
    vim.notify("No previous command to re-run", vim.log.levels.WARN)
  end
end

-- Get last command info
function M.get_last_command()
  return {
    command = state.last_command,
    options = state.last_options,
  }
end

-- Resize terminal
function M.resize(size)
  if not M.is_open() then
    return
  end

  local ccasp = require("ccasp")
  local direction = ccasp.config.terminal.direction

  if direction == "vertical" then
    local new_width = size or math.floor(vim.o.columns * 0.6)
    vim.api.nvim_win_set_width(state.win, new_width)
  else
    local new_height = size or 15
    vim.api.nvim_win_set_height(state.win, new_height)
  end
end

-- Toggle maximize/restore terminal
function M.toggle_maximize()
  if not M.is_open() then
    return
  end

  local ccasp = require("ccasp")
  local direction = ccasp.config.terminal.direction

  if direction == "vertical" then
    local current_width = vim.api.nvim_win_get_width(state.win)
    local max_width = vim.o.columns - 10

    if current_width < max_width * 0.9 then
      -- Store original size and maximize
      state.original_size = current_width
      vim.api.nvim_win_set_width(state.win, max_width)
    else
      -- Restore original size
      local restore_width = state.original_size or math.floor(vim.o.columns * 0.6)
      vim.api.nvim_win_set_width(state.win, restore_width)
      state.original_size = nil
    end
  else
    local current_height = vim.api.nvim_win_get_height(state.win)
    local max_height = vim.o.lines - 10

    if current_height < max_height * 0.9 then
      state.original_size = current_height
      vim.api.nvim_win_set_height(state.win, max_height)
    else
      local restore_height = state.original_size or 15
      vim.api.nvim_win_set_height(state.win, restore_height)
      state.original_size = nil
    end
  end
end

-- Scroll terminal up
function M.scroll_up()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    local current_win = vim.api.nvim_get_current_win()
    vim.api.nvim_set_current_win(state.win)
    vim.cmd("normal! \\<C-u>")
    vim.api.nvim_set_current_win(current_win)
  end
end

-- Scroll terminal down
function M.scroll_down()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    local current_win = vim.api.nvim_get_current_win()
    vim.api.nvim_set_current_win(state.win)
    vim.cmd("normal! \\<C-d>")
    vim.api.nvim_set_current_win(current_win)
  end
end

-- Interrupt running process
function M.interrupt()
  if state.bufnr and vim.api.nvim_buf_is_valid(state.bufnr) then
    local job_id = vim.b[state.bufnr].terminal_job_id
    if job_id then
      vim.fn.chansend(job_id, "\x03") -- Ctrl+C
    end
  end
end

-- Yank last output (basic implementation)
function M.yank_output()
  if state.bufnr and vim.api.nvim_buf_is_valid(state.bufnr) then
    local lines = vim.api.nvim_buf_get_lines(state.bufnr, 0, -1, false)
    -- Get last 50 lines or all if less
    local start_idx = math.max(1, #lines - 50)
    local output = table.concat(vim.list_slice(lines, start_idx), "\n")
    vim.fn.setreg("+", output)
    vim.fn.setreg('"', output)
    vim.notify("Terminal output yanked to clipboard", vim.log.levels.INFO)
  end
end

-- Setup terminal keybindings
function M.setup_keybindings()
  local ccasp = require("ccasp")
  local keybindings = ccasp.config.keybindings

  -- Global keybindings for terminal control
  vim.keymap.set("n", keybindings.toggle_sidebar, function()
    -- This will be handled by main plugin, but define here for reference
    M.toggle()
  end, { desc = "Toggle CCASP terminal" })

  -- Terminal-specific keybindings are set in on_open callback
end

return M
