-- ccasp/panels/prompt_editor.lua - Prompt Editor Popup for Prompt Injector
-- Floating window for editing and enhancing prompts before sending to Claude

local M = {}

-- State
M.bufnr = nil
M.winid = nil
M.is_open = false
M.current_opts = nil

-- UI Configuration
local UI = {
  width_ratio = 0.6,  -- 60% of screen width
  height_ratio = 0.5, -- 50% of screen height
  min_width = 60,
  min_height = 15,
  border = "rounded",
  title = " CCASP Prompt Editor ",
}

-- Icons
local icons = {
  send = "",
  enhance = "",
  regenerate = "",
  cancel = "",
  original = "",
  enhanced = "✨",
  loading = "",
}

-- Create the prompt editor window
function M.open(opts)
  opts = opts or {}
  M.current_opts = opts

  local prompt = opts.prompt or ""
  local original = opts.original
  local is_enhanced = opts.is_enhanced or false

  -- Close existing window if open
  if M.is_open then
    M.close()
  end

  -- Calculate dimensions
  local width = math.max(UI.min_width, math.floor(vim.o.columns * UI.width_ratio))
  local height = math.max(UI.min_height, math.floor(vim.o.lines * UI.height_ratio))
  local row = math.floor((vim.o.lines - height) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  -- Create buffer
  M.bufnr = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_option(M.bufnr, "buftype", "nofile")
  vim.api.nvim_buf_set_option(M.bufnr, "bufhidden", "wipe")
  vim.api.nvim_buf_set_option(M.bufnr, "swapfile", false)
  vim.api.nvim_buf_set_option(M.bufnr, "filetype", "markdown")
  vim.api.nvim_buf_set_name(M.bufnr, "ccasp://prompt-editor")

  -- Create window
  local title = is_enhanced and " CCASP Prompt Editor (Enhanced) " or " CCASP Prompt Editor "
  M.winid = vim.api.nvim_open_win(M.bufnr, true, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    border = UI.border,
    title = title,
    title_pos = "center",
    footer = M.render_footer(is_enhanced),
    footer_pos = "center",
  })

  -- Set window options
  vim.wo[M.winid].cursorline = false
  vim.wo[M.winid].wrap = true
  vim.wo[M.winid].linebreak = true
  vim.wo[M.winid].number = false
  vim.wo[M.winid].relativenumber = false

  -- Set initial content
  M.set_content(prompt, original, is_enhanced)

  -- Make buffer modifiable for editing
  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", true)

  -- Setup keymaps
  M.setup_keymaps(opts)

  M.is_open = true

  -- Start in insert mode at end of prompt
  vim.cmd("normal! G$")
  vim.cmd("startinsert!")
end

-- Render footer with keybindings
function M.render_footer(is_enhanced)
  if is_enhanced then
    return " <CR>:Send | <C-e>:Enhance Again | <C-o>:Show Original | <Esc>:Cancel "
  else
    return " <CR>:Send | <C-e>:Enhance with GPT-5.2 | <Esc>:Cancel "
  end
end

-- Set buffer content
function M.set_content(prompt, original, is_enhanced)
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local lines = {}

  -- Header
  if is_enhanced and original then
    table.insert(lines, "# " .. icons.enhanced .. " Enhanced Prompt")
    table.insert(lines, "")
    table.insert(lines, "> Original: " .. original:sub(1, 50) .. (original:len() > 50 and "..." or ""))
    table.insert(lines, "")
    table.insert(lines, "---")
    table.insert(lines, "")
  else
    table.insert(lines, "# " .. icons.original .. " Your Prompt")
    table.insert(lines, "")
  end

  -- Add prompt content
  for line in prompt:gmatch("[^\n]+") do
    table.insert(lines, line)
  end

  -- Ensure at least one empty line at the end for editing
  if lines[#lines] ~= "" then
    table.insert(lines, "")
  end

  vim.api.nvim_buf_set_option(M.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(M.bufnr, 0, -1, false, lines)

  -- Apply highlights
  M.apply_highlights()
end

-- Apply syntax highlighting
function M.apply_highlights()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end

  local ns = vim.api.nvim_create_namespace("ccasp_prompt_editor")
  vim.api.nvim_buf_clear_namespace(M.bufnr, ns, 0, -1)

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    if line:match("^#") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Title", i - 1, 0, -1)
    elseif line:match("^>") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^%-%-%-") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Comment", i - 1, 0, -1)
    elseif line:match("^%d+%.") then
      -- Numbered list items
      local num_end = line:find("%.")
      if num_end then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "Number", i - 1, 0, num_end)
      end
    end
  end
end

-- Get the edited prompt from buffer
function M.get_prompt()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return nil
  end

  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)
  local prompt_lines = {}
  local in_prompt = false

  for _, line in ipairs(lines) do
    -- Skip header lines
    if line:match("^#") or line:match("^>") or line:match("^%-%-%-") then
      in_prompt = true
    elseif in_prompt or not line:match("^#") then
      in_prompt = true
      table.insert(prompt_lines, line)
    end
  end

  -- Join and trim
  local prompt = table.concat(prompt_lines, "\n")
  prompt = prompt:gsub("^%s+", ""):gsub("%s+$", "")

  return prompt
end

-- Setup keymaps
function M.setup_keymaps(opts)
  local buf_opts = { buffer = M.bufnr, nowait = true }

  -- Window manager keymaps (move/resize)
  local wm_ok, window_manager = pcall(require, "ccasp.window_manager")
  if wm_ok and M.winid then
    window_manager.register(M.winid, "Prompt Editor", "")
    window_manager.setup_keymaps(M.bufnr, M.winid)
  end

  -- Minimize keymap
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    vim.keymap.set("n", "_", function()
      taskbar.minimize(M.winid, "Prompt Editor", "")
      M.winid = nil
      M.bufnr = nil
      M.is_open = false
    end, buf_opts)
  end

  -- Send prompt (Enter in normal mode, Ctrl+Enter in insert)
  vim.keymap.set("n", "<CR>", function()
    M.send(opts)
  end, buf_opts)

  vim.keymap.set("i", "<C-CR>", function()
    vim.cmd("stopinsert")
    M.send(opts)
  end, buf_opts)

  -- Also allow Ctrl+S to send
  vim.keymap.set({ "n", "i" }, "<C-s>", function()
    vim.cmd("stopinsert")
    M.send(opts)
  end, buf_opts)

  -- Enhance with GPT-5.2
  vim.keymap.set({ "n", "i" }, "<C-e>", function()
    vim.cmd("stopinsert")
    M.enhance(opts)
  end, buf_opts)

  vim.keymap.set("n", "e", function()
    M.enhance(opts)
  end, buf_opts)

  vim.keymap.set("n", "E", function()
    M.enhance(opts)
  end, buf_opts)

  -- Show original (if enhanced)
  vim.keymap.set({ "n", "i" }, "<C-o>", function()
    vim.cmd("stopinsert")
    M.show_original(opts)
  end, buf_opts)

  -- Cancel
  vim.keymap.set({ "n", "i" }, "<Esc>", function()
    vim.cmd("stopinsert")
    M.cancel(opts)
  end, buf_opts)

  vim.keymap.set("n", "q", function()
    M.cancel(opts)
  end, buf_opts)

  -- Help
  vim.keymap.set("n", "?", function()
    M.show_help()
  end, buf_opts)
end

-- Send the prompt
function M.send(opts)
  local prompt = M.get_prompt()

  if not prompt or prompt == "" then
    vim.notify("CCASP: Cannot send empty prompt", vim.log.levels.WARN)
    return
  end

  M.close()

  if opts.on_send then
    opts.on_send(prompt)
  end
end

-- Enhance the current prompt
function M.enhance(opts)
  local prompt = M.get_prompt()

  if not prompt or prompt == "" then
    vim.notify("CCASP: Cannot enhance empty prompt", vim.log.levels.WARN)
    return
  end

  -- Show loading indicator
  M.show_loading()

  if opts.on_enhance then
    opts.on_enhance(prompt, function(enhanced, err)
      if err then
        M.hide_loading()
        vim.notify("CCASP: Enhancement failed - " .. err, vim.log.levels.ERROR)
        return
      end

      -- Update content with enhanced prompt
      M.hide_loading()
      M.set_content(enhanced, prompt, true)

      -- Update window title
      if M.winid and vim.api.nvim_win_is_valid(M.winid) then
        vim.api.nvim_win_set_config(M.winid, {
          title = " CCASP Prompt Editor (Enhanced) ",
          footer = M.render_footer(true),
        })
      end
    end)
  end
end

-- Show original prompt (swap back)
function M.show_original(opts)
  if opts.original then
    M.set_content(opts.original, nil, false)

    -- Update window title
    if M.winid and vim.api.nvim_win_is_valid(M.winid) then
      vim.api.nvim_win_set_config(M.winid, {
        title = " CCASP Prompt Editor ",
        footer = M.render_footer(false),
      })
    end
  end
end

-- Cancel and close
function M.cancel(opts)
  M.close()

  if opts.on_cancel then
    opts.on_cancel()
  end
end

-- Show loading indicator
function M.show_loading()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_set_config(M.winid, {
      title = " " .. icons.loading .. " Enhancing with GPT-5.2... ",
    })
  end
end

-- Hide loading indicator
function M.hide_loading()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_set_config(M.winid, {
      title = " CCASP Prompt Editor ",
    })
  end
end

-- Show help
function M.show_help()
  local help_lines = {
    "",
    "  CCASP Prompt Editor - Keybindings",
    "  ══════════════════════════════════",
    "",
    "  <Enter>       Send prompt to Claude",
    "  <C-Enter>     Send prompt (from insert mode)",
    "  <C-s>         Send prompt (save & send)",
    "",
    "  e / E / <C-e> Enhance with GPT-5.2",
    "  <C-o>         Show original prompt",
    "",
    "  <Esc> / q     Cancel and close",
    "  ?             Show this help",
    "",
    "  Press any key to close help...",
    "",
  }

  -- Create help popup
  local help_buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(help_buf, 0, -1, false, help_lines)
  vim.api.nvim_buf_set_option(help_buf, "modifiable", false)

  local help_width = 45
  local help_height = #help_lines
  local help_row = math.floor((vim.o.lines - help_height) / 2)
  local help_col = math.floor((vim.o.columns - help_width) / 2)

  local help_win = vim.api.nvim_open_win(help_buf, true, {
    relative = "editor",
    width = help_width,
    height = help_height,
    row = help_row,
    col = help_col,
    style = "minimal",
    border = "rounded",
    title = " Help ",
    title_pos = "center",
  })

  -- Close on any key
  vim.keymap.set("n", "<Esc>", function()
    vim.api.nvim_win_close(help_win, true)
  end, { buffer = help_buf })

  -- Auto-close after key press
  vim.api.nvim_create_autocmd("CursorMoved", {
    buffer = help_buf,
    once = true,
    callback = function()
      vim.schedule(function()
        if vim.api.nvim_win_is_valid(help_win) then
          vim.api.nvim_win_close(help_win, true)
        end
      end)
    end,
  })
end

-- Close the editor
function M.close()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    vim.api.nvim_win_close(M.winid, true)
  end
  M.winid = nil
  M.bufnr = nil
  M.is_open = false
  M.current_opts = nil
end

-- Toggle editor (open/close)
function M.toggle(opts)
  if M.is_open then
    M.close()
  else
    M.open(opts)
  end
end

return M
