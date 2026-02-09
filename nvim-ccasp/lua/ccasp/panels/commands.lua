-- ccasp/panels/commands.lua - Commands Browser Panel
-- Dashboard-styled command browser with section grouping and live preview
--
-- Layout: Two floating windows side by side
--   Left:  Section-organized command list with smart navigation
--   Right: Markdown preview of selected command (auto-updates on cursor move)
--
-- Controls:
--   j/k, arrows:  Navigate commands (smart: skips headers/blanks)
--   Enter:        Inject command into active Claude session
--   y:            Copy command name to clipboard
--   e:            Open command file in editor
--   /:            Search/filter commands
--   r:            Reload commands from disk
--   Tab:          Switch focus between list and preview
--   _:            Minimize to taskbar
--   q, Esc:       Close (Esc also clears active search first)

local M = {}
local helpers = require("ccasp.panels.helpers")
local nf = require("ccasp.ui.icons")

-- Panel state
M.bufnr_list = nil
M.winid_list = nil
M.bufnr_preview = nil
M.winid_preview = nil
M.is_open = false
M.item_lines = {} -- line_number -> { name, path } for navigation
M.search_query = ""

-- Lazy-load dependencies
local function get_commands_module()
  return require("ccasp.core.commands")
end

-- Close the panel and inject a slash command into the active Claude session
local function inject_slash_command(cmd_name)
  M.close()
  vim.schedule(function()
    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local active = sessions.get_active()
      if active and active.bufnr and vim.api.nvim_buf_is_valid(active.bufnr) then
        if active.winid and vim.api.nvim_win_is_valid(active.winid) then
          vim.api.nvim_set_current_win(active.winid)
        end
        local job_id = vim.b[active.bufnr].terminal_job_id
        if job_id and job_id > 0 then
          vim.fn.chansend(job_id, "/" .. cmd_name .. "\n")
          return
        end
      end
    end
    vim.notify("No active Claude session to send command", vim.log.levels.WARN)
  end)
end

-- Pad text to a target display width (handles multi-byte / nerd font chars)
local function pad_to_display_width(text, target)
  local dw = vim.fn.strdisplaywidth(text)
  local gap = target - dw
  if gap < 0 then gap = 0 end
  return text .. string.rep(" ", gap)
end

-- Render the command list organized by sections with box-drawing headers
function M.render_list(list_width)
  local commands_mod = get_commands_module()
  local sections = commands_mod.get_sections()
  local all_cmds = commands_mod.get_all()

  local lines = {}
  M.item_lines = {}

  -- Box inner width: total display width minus "  ╭" (3) and "╮" (1) = 4
  local box_inner = (list_width or 42) - 4
  if box_inner < 20 then box_inner = 20 end

  -- Panel header
  table.insert(lines, "")
  table.insert(lines, "  " .. nf.commands .. " Slash Commands")
  table.insert(lines, "")

  -- Active search indicator
  if M.search_query ~= "" then
    table.insert(lines, string.format("  %s Filter: %s", nf.search, M.search_query))
    table.insert(lines, "")
  end

  local query = M.search_query:lower()
  local total_count = 0
  local shown_count = 0

  for _, section in ipairs(sections) do
    -- Collect commands matching the search query
    local section_cmds = {}
    for _, cmd_name in ipairs(section.commands) do
      local cmd = all_cmds[cmd_name]
      if cmd then
        total_count = total_count + 1
        if query == ""
            or cmd_name:lower():find(query, 1, true)
            or (cmd.description or ""):lower():find(query, 1, true) then
          table.insert(section_cmds, cmd)
          shown_count = shown_count + 1
        end
      end
    end

    if #section_cmds > 0 then
      -- Section header with box-drawing (matches dashboard/control panel style)
      table.insert(lines, "  ╭" .. string.rep("─", box_inner) .. "╮")
      table.insert(lines, "  │  " .. pad_to_display_width(section.name, box_inner - 4) .. "  │")
      table.insert(lines, "  ╰" .. string.rep("─", box_inner) .. "╯")

      -- Command entries
      for _, cmd in ipairs(section_cmds) do
        local name_part = "/" .. cmd.name
        local desc = cmd.description or ""

        -- Truncate name if too long
        local max_name = list_width - 6
        if #name_part > max_name then
          name_part = name_part:sub(1, max_name - 3) .. "..."
        end

        -- Build display line with description
        local display
        if desc ~= "" then
          local avail = list_width - #name_part - 7
          if avail > 8 then
            if #desc > avail then
              desc = desc:sub(1, avail - 3) .. "..."
            end
            display = string.format("    %s - %s", name_part, desc)
          else
            display = "    " .. name_part
          end
        else
          display = "    " .. name_part
        end

        table.insert(lines, display)
        M.item_lines[#lines] = { name = cmd.name, path = cmd.path }
      end
      table.insert(lines, "")
    end
  end

  -- Footer counter
  table.insert(lines, "")
  if M.search_query ~= "" then
    table.insert(lines, string.format("  %d / %d commands", shown_count, total_count))
  else
    table.insert(lines, string.format("  %d commands", total_count))
  end
  table.insert(lines, "")

  return lines
end

-- Update the preview pane for the currently selected command
function M.update_preview()
  if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
  if not M.bufnr_preview or not vim.api.nvim_buf_is_valid(M.bufnr_preview) then return end

  local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
  local item = M.item_lines[cursor[1]]

  if not item then
    helpers.set_buffer_content(M.bufnr_preview, { "", "  Select a command to preview", "" })
    return
  end

  -- Read the command markdown file
  if vim.fn.filereadable(item.path) == 1 then
    local content = vim.fn.readfile(item.path)
    vim.bo[M.bufnr_preview].modifiable = true
    vim.api.nvim_buf_set_lines(M.bufnr_preview, 0, -1, false, content)
    vim.bo[M.bufnr_preview].modifiable = false
    vim.bo[M.bufnr_preview].filetype = "markdown"
  else
    helpers.set_buffer_content(M.bufnr_preview, { "", "  File not found: " .. item.path, "" })
  end

  -- Update preview window title to show selected command
  if M.winid_preview and vim.api.nvim_win_is_valid(M.winid_preview) then
    pcall(vim.api.nvim_win_set_config, M.winid_preview, {
      title = string.format(" /%s ", item.name),
      title_pos = "center",
    })
  end
end

-- Move cursor to the first command entry
function M.nav_to_first()
  if not M.bufnr_list or not vim.api.nvim_buf_is_valid(M.bufnr_list) then return end
  if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
  for line = 1, vim.api.nvim_buf_line_count(M.bufnr_list) do
    if M.item_lines[line] then
      pcall(vim.api.nvim_win_set_cursor, M.winid_list, { line, 0 })
      M.update_preview()
      return
    end
  end
end

-- Refresh the list content and highlights
function M.refresh()
  if not M.bufnr_list or not vim.api.nvim_buf_is_valid(M.bufnr_list) then return end
  local width = nil
  if M.winid_list and vim.api.nvim_win_is_valid(M.winid_list) then
    width = vim.api.nvim_win_get_width(M.winid_list)
  end
  local lines = M.render_list(width)
  helpers.set_buffer_content(M.bufnr_list, lines)
  M.apply_highlights()
end

-- Apply syntax highlighting to the list pane
function M.apply_highlights()
  if not M.bufnr_list or not vim.api.nvim_buf_is_valid(M.bufnr_list) then return end

  local ns = helpers.prepare_highlights("ccasp_commands_panel", M.bufnr_list)
  local lines = vim.api.nvim_buf_get_lines(M.bufnr_list, 0, -1, false)

  for i, line in ipairs(lines) do
    local idx = i - 1

    if line:match("Slash Commands") then
      -- Panel header
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "Title", idx, 0, -1)
    elseif line:match("^  ╭") or line:match("^  ╰") then
      -- Section box borders (top/bottom)
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "Comment", idx, 0, -1)
    elseif line:match("^  │") then
      -- Section name inside box
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "CcaspCmdSection", idx, 0, -1)
    elseif line:match("^    /") then
      -- Command name (highlight the /name portion)
      local dash_pos = line:find(" %- ")
      local name_end = dash_pos and (dash_pos - 1) or #line
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "CcaspCmdName", idx, 4, name_end)
      -- Description after " - "
      if dash_pos then
        vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "Comment", idx, dash_pos + 2, -1)
      end
    elseif line:match("Filter:") then
      -- Active search indicator
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "DiagnosticInfo", idx, 0, -1)
    elseif line:match("commands$") then
      -- Counter
      vim.api.nvim_buf_add_highlight(M.bufnr_list, ns, "Comment", idx, 0, -1)
    end
  end
end

-- Open the commands browser panel
function M.open()
  -- Focus existing panel if already open
  if M.is_open then
    if helpers.focus_if_open(M.winid_list) then return end
  end

  -- Load commands from disk
  get_commands_module().load_all()

  -- Calculate layout: two panes side by side, centered
  local total_width = math.min(vim.o.columns - 4, 130)
  local total_height = math.min(vim.o.lines - 4, 45)
  local list_width = math.floor(total_width * 0.38)
  local preview_width = total_width - list_width - 2

  local start_row = math.floor((vim.o.lines - total_height) / 2)
  local start_col = math.floor((vim.o.columns - total_width) / 2)

  -- Account for appshell chrome if active
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local is_appshell = ccasp_ok and ccasp.is_appshell and ccasp.is_appshell()
  if is_appshell then
    local appshell_ok, appshell = pcall(require, "ccasp.appshell")
    if appshell_ok then
      local zone = appshell.get_zone_bounds("content")
      if zone then
        start_row = zone.row + math.floor((zone.height - total_height) / 2)
        start_col = zone.col + math.floor((zone.width - total_width) / 2)
      end
    end
  end

  -- Create list buffer and window (left pane, focused)
  M.bufnr_list = helpers.create_buffer("ccasp://commands-list")

  M.winid_list = vim.api.nvim_open_win(M.bufnr_list, true, {
    relative = "editor",
    width = list_width,
    height = total_height,
    row = start_row,
    col = start_col,
    style = "minimal",
    border = "rounded",
    title = " " .. nf.commands .. " Commands ",
    title_pos = "center",
    footer = " [/]search [Enter]run [y]copy [e]edit [q]close ",
    footer_pos = "center",
  })
  vim.wo[M.winid_list].cursorline = true

  -- Create preview buffer and window (right pane, not focused)
  M.bufnr_preview = helpers.create_buffer("ccasp://commands-preview")

  M.winid_preview = vim.api.nvim_open_win(M.bufnr_preview, false, {
    relative = "editor",
    width = preview_width,
    height = total_height,
    row = start_row,
    col = start_col + list_width + 2,
    style = "minimal",
    border = "rounded",
    title = " Command Preview ",
    title_pos = "center",
  })
  vim.wo[M.winid_preview].wrap = true
  vim.wo[M.winid_preview].linebreak = true

  -- Render list content
  M.refresh()

  -- Setup all keymaps for both panes
  M.setup_keymaps()

  -- Move cursor to first command and trigger preview
  M.nav_to_first()

  -- Auto-update preview when cursor moves in the list
  vim.api.nvim_create_autocmd("CursorMoved", {
    buffer = M.bufnr_list,
    callback = function()
      M.update_preview()
    end,
  })

  -- Cross-window cleanup: if either buffer is wiped, close the other
  vim.api.nvim_create_autocmd("BufWipeout", {
    buffer = M.bufnr_list,
    callback = function()
      vim.schedule(function()
        if M.winid_preview and vim.api.nvim_win_is_valid(M.winid_preview) then
          vim.api.nvim_win_close(M.winid_preview, true)
        end
        M.winid_list = nil
        M.bufnr_list = nil
        M.winid_preview = nil
        M.bufnr_preview = nil
        M.is_open = false
        M.search_query = ""
      end)
    end,
    once = true,
  })

  vim.api.nvim_create_autocmd("BufWipeout", {
    buffer = M.bufnr_preview,
    callback = function()
      vim.schedule(function()
        if M.winid_list and vim.api.nvim_win_is_valid(M.winid_list) then
          vim.api.nvim_win_close(M.winid_list, true)
        end
        M.winid_list = nil
        M.bufnr_list = nil
        M.winid_preview = nil
        M.bufnr_preview = nil
        M.is_open = false
        M.search_query = ""
      end)
    end,
    once = true,
  })

  M.is_open = true
end

-- Setup keymaps for both panes
function M.setup_keymaps()
  -- ═══════════════════════════════════════════════════
  -- LIST PANE keymaps
  -- ═══════════════════════════════════════════════════
  helpers.sandbox_buffer(M.bufnr_list)
  helpers.setup_window_manager(M.bufnr_list, M.winid_list, "Commands")

  local opts = { buffer = M.bufnr_list, nowait = true }

  -- Minimize (custom: closes preview first, then minimizes list to taskbar)
  local tb_ok, taskbar = pcall(require, "ccasp.taskbar")
  if tb_ok then
    vim.keymap.set("n", "_", function()
      if M.winid_preview and vim.api.nvim_win_is_valid(M.winid_preview) then
        vim.api.nvim_win_close(M.winid_preview, true)
      end
      taskbar.minimize(M.winid_list, "Commands", nf.commands)
      M.winid_list = nil
      M.bufnr_list = nil
      M.winid_preview = nil
      M.bufnr_preview = nil
      M.is_open = false
      helpers.restore_terminal_focus()
    end, opts)
  end

  -- Close
  vim.keymap.set("n", "q", M.close, opts)
  vim.keymap.set("n", "<Esc>", function()
    if M.search_query ~= "" then
      -- First Esc clears search; second Esc closes
      M.search_query = ""
      M.refresh()
      M.nav_to_first()
    else
      M.close()
    end
  end, opts)

  -- Smart navigation: j/k skip non-command lines
  local function nav_down()
    if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
    local total = vim.api.nvim_buf_line_count(M.bufnr_list)
    for line = cursor[1] + 1, total do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid_list, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
    for line = cursor[1] - 1, 1, -1 do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid_list, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Enter: inject selected command into Claude session
  vim.keymap.set("n", "<CR>", function()
    if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
    local item = M.item_lines[cursor[1]]
    if item then
      inject_slash_command(item.name)
    end
  end, opts)

  -- y: copy command name to system clipboard
  vim.keymap.set("n", "y", function()
    if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
    local item = M.item_lines[cursor[1]]
    if item then
      vim.fn.setreg("+", "/" .. item.name)
      vim.notify("Copied: /" .. item.name, vim.log.levels.INFO)
    end
  end, opts)

  -- e: open command file in editor
  vim.keymap.set("n", "e", function()
    if not M.winid_list or not vim.api.nvim_win_is_valid(M.winid_list) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid_list)
    local item = M.item_lines[cursor[1]]
    if item then
      M.close()
      vim.schedule(function()
        vim.cmd("edit " .. vim.fn.fnameescape(item.path))
      end)
    end
  end, opts)

  -- /: search/filter commands
  vim.keymap.set("n", "/", function()
    vim.ui.input({ prompt = nf.search .. " Filter: " }, function(input)
      if input ~= nil then
        M.search_query = input
        M.refresh()
        M.nav_to_first()
      end
    end)
  end, opts)

  -- r: reload commands from disk (overrides sandbox nop)
  vim.keymap.set("n", "r", function()
    get_commands_module().reload()
    M.search_query = ""
    M.refresh()
    M.nav_to_first()
    vim.notify("CCASP: Commands reloaded", vim.log.levels.INFO)
  end, opts)

  -- Tab: switch focus to preview pane
  vim.keymap.set("n", "<Tab>", function()
    if M.winid_preview and vim.api.nvim_win_is_valid(M.winid_preview) then
      vim.api.nvim_set_current_win(M.winid_preview)
    end
  end, opts)

  -- Mouse: click to select
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse.line >= 1 then
      pcall(vim.api.nvim_win_set_cursor, M.winid_list, { mouse.line, 0 })
    end
  end, opts)

  -- Double-click: execute
  vim.keymap.set("n", "<2-LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    if mouse.line >= 1 then
      pcall(vim.api.nvim_win_set_cursor, M.winid_list, { mouse.line, 0 })
      local item = M.item_lines[mouse.line]
      if item then
        inject_slash_command(item.name)
      end
    end
  end, opts)

  -- ═══════════════════════════════════════════════════
  -- PREVIEW PANE keymaps
  -- ═══════════════════════════════════════════════════
  if M.bufnr_preview and vim.api.nvim_buf_is_valid(M.bufnr_preview) then
    helpers.sandbox_buffer(M.bufnr_preview)

    local preview_opts = { buffer = M.bufnr_preview, nowait = true }

    -- Close from preview
    vim.keymap.set("n", "q", M.close, preview_opts)
    vim.keymap.set("n", "<Esc>", M.close, preview_opts)

    -- Tab: switch back to list pane
    vim.keymap.set("n", "<Tab>", function()
      if M.winid_list and vim.api.nvim_win_is_valid(M.winid_list) then
        vim.api.nvim_set_current_win(M.winid_list)
      end
    end, preview_opts)

    -- Allow scrolling in preview (override sandbox nop for movement)
    vim.keymap.set("n", "j", "j", preview_opts)
    vim.keymap.set("n", "k", "k", preview_opts)
    vim.keymap.set("n", "<Down>", "j", preview_opts)
    vim.keymap.set("n", "<Up>", "k", preview_opts)
    vim.keymap.set("n", "G", "G", preview_opts)
    vim.keymap.set("n", "g", "g", preview_opts)
    vim.keymap.set("n", "<C-d>", "<C-d>", preview_opts)
    vim.keymap.set("n", "<C-u>", "<C-u>", preview_opts)
  end
end

-- Close both panes and restore terminal focus
function M.close()
  if M.winid_preview and vim.api.nvim_win_is_valid(M.winid_preview) then
    vim.api.nvim_win_close(M.winid_preview, true)
  end
  if M.winid_list and vim.api.nvim_win_is_valid(M.winid_list) then
    vim.api.nvim_win_close(M.winid_list, true)
  end

  M.winid_list = nil
  M.bufnr_list = nil
  M.winid_preview = nil
  M.bufnr_preview = nil
  M.is_open = false
  M.search_query = ""

  helpers.restore_terminal_focus()
end

-- Toggle panel visibility
function M.toggle()
  if M.is_open then
    M.close()
  else
    M.open()
  end
end

-- Refresh commands when the active terminal session changes.
-- Each session may be in a different project with different .claude/commands/.
vim.api.nvim_create_autocmd("User", {
  pattern = "CcaspActiveSessionChanged",
  callback = function()
    if M.is_open and M.bufnr_list and vim.api.nvim_buf_is_valid(M.bufnr_list) then
      get_commands_module().reload()
      M.refresh()
      M.nav_to_first()
    end
  end,
})

return M
