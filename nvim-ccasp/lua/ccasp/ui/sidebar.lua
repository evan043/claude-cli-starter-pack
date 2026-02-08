-- CCASP Sidebar UI Component
-- Tabbed sidebar with command browser, settings, protected commands, and status
-- Modernized with Nerd Font icons and dark theme

local M = {}
local renderers = require("ccasp.ui.sidebar.renderers")
local keybindings = require("ccasp.ui.sidebar.keybindings")
local helpers = require("ccasp.ui.sidebar.helpers")
local nf = require("ccasp.ui.icons")

-- UI state
local state = {
  win = nil,
  buf = nil,
  popup = nil,
  focused = false,
  cursor_line = 1,
  command_lines = {},  -- Map line numbers to command names
  section_lines = {},  -- Map line numbers to section names
  description_lines = {},  -- Track description lines for highlighting
}

-- Check if nui is available
local function has_nui()
  local ok, _ = pcall(require, "nui.popup")
  return ok
end

-- Create the sidebar buffer content using tab renderers
local function render_content()
  local ccasp = require("ccasp")

  local lines = {}
  local highlights = {}

  -- Reset line maps
  state.command_lines = {}
  state.section_lines = {}
  state.description_lines = {}

  -- Compact tab indicator (single line instead of vertical list)
  local tab_names = { "Cmds", "Set", "Prot", "Stat", "Keys", "Ast", "Act" }
  local tab_icons = { nf.commands, nf.settings, nf.shield, nf.status, nf.keyboard, nf.assets, nf.shortcuts }
  local tab_parts = {}
  for i, name in ipairs(tab_names) do
    if i == ccasp.state.active_tab then
      table.insert(tab_parts, "[" .. tab_icons[i] .. name .. "]")
    else
      table.insert(tab_parts, " " .. i .. " ")
    end
  end
  table.insert(lines, table.concat(tab_parts, ""))
  table.insert(lines, string.rep("─", 40))

  -- Dispatch to tab-specific renderer
  local tab_renderers = {
    [1] = renderers.render_commands_tab,
    [2] = renderers.render_settings_tab,
    [3] = renderers.render_agents_tab,
    [4] = renderers.render_sessions_tab,
    [5] = renderers.render_help_tab,
    [6] = renderers.render_assets_tab,
    [7] = renderers.render_shortcuts_tab,
  }

  local renderer = tab_renderers[ccasp.state.active_tab]
  if renderer then
    local query = ccasp.state.search_query or ""
    local tab_highlights = renderer(lines, state, ccasp, query)
    if tab_highlights then
      for _, hl in ipairs(tab_highlights) do
        table.insert(highlights, hl)
      end
    end
  end

  -- Add bottom status bar (shown on all tabs)
  local statusbar = require("ccasp.ui.statusbar")
  local status = ccasp.get_status()
  local terminal = require("ccasp.terminal")

  -- Add spacing to push status bar to bottom
  table.insert(lines, "")
  table.insert(lines, string.rep("─", 42))

  -- Status indicators row 1: Mode & Updates
  local perm_icon = nf.perm_mode(status.permissions_mode)
  local update_icon = nf.update_mode(status.update_mode)
  table.insert(lines, string.format(" %s %s %s %s %s %s %d",
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    nf.pipe,
    update_icon .. " " .. status.update_mode:sub(1, 1):upper() .. status.update_mode:sub(2),
    nf.pipe,
    nf.shield,
    status.protected_count
  ))

  -- Status indicators row 2: Claude CLI & Sync
  local claude_icon = terminal.is_claude_running() and nf.claude_on or nf.claude_off
  local claude_status = claude_icon .. " Claude"
  local sync_icon = status.sync_status == "synced" and nf.sync_ok or nf.sync_warn
  table.insert(lines, string.format(" %s %s Sync: %s %s v%s",
    claude_status,
    nf.pipe,
    sync_icon,
    nf.pipe,
    status.version
  ))

  table.insert(lines, string.rep("─", 42))

  return lines, highlights
end

-- Open sidebar
function M.open()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local ccasp = require("ccasp")

  -- Always use a proper split-based sidebar (not floating) for predictable terminal placement
  -- Create sidebar on the left as a vertical split
  vim.cmd("topleft " .. ccasp.config.sidebar.width .. "vnew")
  state.win = vim.api.nvim_get_current_win()
  state.buf = vim.api.nvim_get_current_buf()

  vim.bo[state.buf].buftype = "nofile"
  vim.bo[state.buf].bufhidden = "wipe"
  vim.bo[state.buf].swapfile = false

  -- Set window options
  vim.wo[state.win].number = false
  vim.wo[state.win].relativenumber = false
  vim.wo[state.win].signcolumn = "no"
  vim.wo[state.win].winfixwidth = true

  -- Modern dark theme
  vim.wo[state.win].winhighlight = "Normal:CcaspSidebarBg,EndOfBuffer:CcaspSidebarBg,WinSeparator:CcaspBorderGlow"

  -- Set up keybindings
  M._setup_keybindings()

  -- Render content
  M.refresh()

  state.focused = true

  -- Auto-launch Claude CLI in terminal when sidebar opens
  local terminal = require("ccasp.terminal")
  if not terminal.is_open() then
    -- Get project root
    local project_root = vim.fn.getcwd()

    -- Move to the window to the right of sidebar (or create one)
    -- First go back to sidebar, then split to the right
    vim.api.nvim_set_current_win(state.win)
    vim.cmd("wincmd l") -- Move right - if there's a window there, use it

    -- If we're still in sidebar (no window to the right), create one
    if vim.api.nvim_get_current_win() == state.win then
      vim.cmd("vsplit") -- Creates window to the right of sidebar
    end

    -- Now create terminal in this window
    vim.cmd("lcd " .. vim.fn.fnameescape(project_root))
    vim.cmd("terminal")

    -- Store terminal state
    local term_bufnr = vim.api.nvim_get_current_buf()
    local term_win = vim.api.nvim_get_current_win()

    -- Update terminal module state directly
    terminal._set_state(term_bufnr, term_win)

    -- Register as primary session in multi-session manager
    local sessions = require("ccasp.sessions")
    local session_id = sessions.register_primary(term_bufnr, term_win)

    -- Wait for terminal to be fully ready, then launch claude
    vim.defer_fn(function()
      if vim.api.nvim_buf_is_valid(term_bufnr) then
        local job_id = vim.b[term_bufnr].terminal_job_id
        if job_id and job_id > 0 then
          -- Send claude command with carriage return
          vim.fn.chansend(job_id, "claude\r")
          vim.notify("Claude CLI starting... Press Ctrl+B to toggle sidebar", vim.log.levels.INFO)

          -- Mark claude as running after giving it time to start
          vim.defer_fn(function()
            terminal._set_claude_running(true)
            -- Also mark in sessions module
            local sessions_mod = require("ccasp.sessions")
            local primary = sessions_mod.get_primary()
            if primary then
              sessions_mod.set_claude_running(primary.id, true)
            end
          end, 3000)

          -- Keep focus in terminal so user can interact with Claude
          vim.cmd("startinsert")
        else
          vim.notify("Terminal job not ready, retrying...", vim.log.levels.WARN)
          -- Retry after another delay
          vim.defer_fn(function()
            local jid = vim.b[term_bufnr].terminal_job_id
            if jid and jid > 0 then
              vim.fn.chansend(jid, "claude\r")
              terminal._set_claude_running(true)
              -- Also mark in sessions module
              local sessions_mod = require("ccasp.sessions")
              local primary = sessions_mod.get_primary()
              if primary then
                sessions_mod.set_claude_running(primary.id, true)
              end
              vim.notify("Claude CLI starting...", vim.log.levels.INFO)
              vim.cmd("startinsert")
            end
          end, 500)
        end
      end
    end, 1000)
    -- Focus stays in terminal so user can type in Claude CLI
    -- Use Ctrl+B to toggle sidebar, Esc Esc to exit terminal mode
  end
end

-- Close sidebar
function M.close()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end

  state.win = nil
  state.buf = nil
  state.popup = nil
  state.focused = false
end

-- Refresh sidebar content
function M.refresh()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then
    return
  end

  local lines, highlights = render_content()

  vim.bo[state.buf].modifiable = true
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.bo[state.buf].modifiable = false

  -- Apply highlights
  local ns_id = vim.api.nvim_create_namespace("ccasp_sidebar")
  vim.api.nvim_buf_clear_namespace(state.buf, ns_id, 0, -1)

  -- Apply explicit highlights from renderers
  for _, hl in ipairs(highlights) do
    local line_num, col_start, col_end, hl_group = hl[1], hl[2], hl[3], hl[4]
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, hl_group, line_num - 1, col_start, col_end)
  end

  -- Apply modern highlights to structural elements
  local total_lines = vim.api.nvim_buf_line_count(state.buf)
  for i = 0, total_lines - 1 do
    local line = vim.api.nvim_buf_get_lines(state.buf, i, i + 1, false)[1] or ""
    -- Tab indicator line (first line)
    if i == 0 then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, "CcaspTopbarBg", i, 0, -1)
    -- Separator lines
    elseif line:match("^[─]+$") then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, "CcaspSeparator", i, 0, -1)
    -- Section headers (▼ or ► prefix)
    elseif line:match("^[▼►]") then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, "CcaspCmdSection", i, 0, -1)
    -- Selected command (► prefix with indent)
    elseif line:match("^  ► ") then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, "CcaspCmdSelected", i, 0, -1)
    -- Regular command (indented)
    elseif state.command_lines[i + 1] then
      pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, "CcaspCmdName", i, 0, -1)
    end
  end
end

-- Focus sidebar
function M.focus()
  if state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_set_current_win(state.win)
    state.focused = true
  end
end

-- Check if sidebar is focused
function M.is_focused()
  return state.focused and state.win == vim.api.nvim_get_current_win()
end

-- Get sidebar window ID (used by sessions module)
function M.get_win()
  return state.win
end

-- Filter commands by search query
function M.filter(query)
  local ccasp = require("ccasp")
  ccasp.state.search_query = query
  M.refresh()
end

-- Get command at current cursor line
function M.get_command_at_cursor()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return nil
  end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local line = cursor[1]

  return state.command_lines[line]
end

-- Get section at current cursor line
function M.get_section_at_cursor()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return nil
  end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local line = cursor[1]

  return state.section_lines[line]
end

-- Get shortcut at current cursor line (for tab 7)
function M.get_shortcut_at_cursor()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return nil
  end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local line = cursor[1]

  return state.shortcut_lines and state.shortcut_lines[line] or nil
end

-- Execute a shortcut action (for tab 7) - Table-driven dispatch
function M.execute_shortcut(action)
  local ccasp = require("ccasp")
  local sessions = require("ccasp.sessions")

  -- Action handlers dispatch table
  local shortcut_actions = {
    -- Terminal Sessions
    new_session = function()
      sessions.spawn()
      vim.defer_fn(function() M.refresh() end, 1000)
    end,
    session_picker = function() sessions.show_picker() end,
    session_next = function() sessions.focus_next() end,
    session_prev = function() sessions.focus_prev() end,
    session_close_all = function()
      vim.ui.select({ "Yes", "No" }, { prompt = "Close all Claude sessions?" }, function(choice)
        if choice == "Yes" then
          sessions.close_all()
          vim.notify("All Claude sessions closed", vim.log.levels.INFO)
          M.refresh()
        end
      end)
    end,
    session_rename = function()
      local primary = sessions.get_primary()
      if primary then
        sessions.rename(primary.id)
      else
        M._pick_session_for_action(sessions.list(), "Rename which session?", function(s)
          sessions.rename(s.id)
        end)
      end
    end,
    session_color = function()
      local primary = sessions.get_primary()
      if primary then
        sessions.change_color(primary.id)
      else
        M._pick_session_for_action(sessions.list(), "Change color for which session?", function(s)
          sessions.change_color(s.id)
        end)
      end
    end,
    session_minimize = function()
      local primary = sessions.get_primary()
      if primary then
        sessions.minimize(primary.id)
        M.refresh()
      else
        vim.notify("No active session to minimize", vim.log.levels.INFO)
      end
    end,
    session_restore = function()
      sessions.show_minimized_picker()
      vim.defer_fn(function() M.refresh() end, 500)
    end,

    -- Panels
    control = function() M._call_panel(ccasp, "control", "toggle") end,
    dashboard = function() M._call_panel(ccasp, "dashboard", "open") end,
    features = function() M._call_panel(ccasp, "features", "open") end,
    hooks = function() M._call_panel(ccasp, "hooks", "open") end,
    taskbar = function()
      if ccasp.taskbar then
        ccasp.taskbar.show_picker()
      else
        vim.notify("CCASP: Taskbar not available", vim.log.levels.WARN)
      end
    end,

    -- Agents
    grid = function() M._call_agent_action(ccasp, "open_grid", "Agent grid not available") end,
    restart_all = function()
      M._call_agent_action(ccasp, "restart_all", "Agents not available", "All agents restarted")
    end,
    kill_all = function()
      M._call_agent_action(ccasp, "kill_all", "Agents not available", "All agents killed")
    end,

    -- Prompt Injector
    prompt_injector = function()
      if ccasp.prompt_injector then
        ccasp.prompt_injector.toggle()
        M.refresh()
      else
        vim.notify("CCASP: Prompt Injector not available", vim.log.levels.WARN)
      end
    end,
    quick_enhance = function()
      if ccasp.prompt_injector then
        ccasp.prompt_injector.quick_enhance()
      else
        vim.notify("CCASP: Prompt Injector not available", vim.log.levels.WARN)
      end
    end,
    auto_enhance = function()
      if ccasp.prompt_injector and ccasp.prompt_injector.toggle_auto_enhance then
        ccasp.prompt_injector.toggle_auto_enhance()
        M.refresh()
      else
        vim.notify("CCASP: Prompt Injector not available", vim.log.levels.WARN)
      end
    end,

    -- Browse
    commands = function()
      if ccasp.panels and ccasp.panels.commands then
        ccasp.panels.commands.toggle()
      else
        M._browse_with_telescope(ccasp, "commands")
      end
    end,
    skills = function() M._browse_with_telescope(ccasp, "skills") end,

    -- System
    save_settings = function()
      if ccasp.core and ccasp.core.settings then
        ccasp.core.settings.save()
      else
        local config = require("ccasp.config")
        config.save_settings(config.load_settings())
      end
      vim.notify("CCASP: Settings saved", vim.log.levels.INFO)
    end,
    detect_stack = function()
      vim.cmd("!ccasp detect-stack")
      vim.defer_fn(function() M.refresh() end, 1000)
    end,
    refresh = function()
      M.refresh()
      vim.notify("CCASP: Refreshed", vim.log.levels.INFO)
    end,
  }

  local handler = shortcut_actions[action]
  if handler then
    handler()
  else
    vim.notify("CCASP: Unknown shortcut action: " .. tostring(action), vim.log.levels.WARN)
  end
end

-- Helper: Pick session from list and execute action
function M._pick_session_for_action(all_sessions, prompt, callback)
  if #all_sessions == 0 then
    vim.notify("No active sessions", vim.log.levels.INFO)
    return
  end
  local items = {}
  for i, s in ipairs(all_sessions) do
    table.insert(items, string.format("[%d] %s", i, s.name))
  end
  vim.ui.select(items, { prompt = prompt }, function(_, idx)
    if idx then callback(all_sessions[idx]) end
  end)
end

-- Helper: Call panel method with availability check
function M._call_panel(ccasp, panel_name, method_name)
  if ccasp.panels and ccasp.panels[panel_name] then
    ccasp.panels[panel_name][method_name]()
  else
    vim.notify("CCASP: " .. panel_name:gsub("^%l", string.upper) .. " panel not available", vim.log.levels.WARN)
  end
end

-- Helper: Call agent action with availability check
function M._call_agent_action(ccasp, action_name, error_msg, success_msg)
  if ccasp.agents and ccasp.agents[action_name] then
    ccasp.agents[action_name]()
    if success_msg then
      vim.notify("CCASP: " .. success_msg, vim.log.levels.INFO)
    end
  else
    vim.notify("CCASP: " .. error_msg, vim.log.levels.WARN)
  end
end

-- Helper: Browse with Telescope
function M._browse_with_telescope(ccasp, browse_type)
  if ccasp.telescope then
    M.close()
    ccasp.telescope[browse_type]()
  else
    vim.notify("CCASP: Telescope not available", vim.log.levels.WARN)
  end
end

-- Select command/asset/shortcut and update preview
function M.select_at_cursor()
  local ccasp = require("ccasp")

  if ccasp.state.active_tab == 7 then
    -- On Shortcuts tab
    local shortcut = M.get_shortcut_at_cursor()
    if shortcut then
      ccasp.state.selected_shortcut = shortcut
      M.refresh()
    end
    return
  end

  local item = M.get_command_at_cursor()

  if item then
    if ccasp.state.active_tab == 6 then
      -- On Assets tab, parse "type:name" format
      local asset_type, asset_name = item:match("^([^:]+):(.+)$")
      if asset_type and asset_name then
        ccasp.state.selected_asset = asset_name
        ccasp.state.selected_asset_type = asset_type
      end
    else
      ccasp.state.selected_command = item
    end
    M.refresh()
  end
end

-- Navigate to next command/shortcut
function M.next_command()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local ccasp = require("ccasp")
  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]
  local total_lines = vim.api.nvim_buf_line_count(state.buf)

  -- On Shortcuts tab, navigate shortcut_lines
  if ccasp.state.active_tab == 7 and state.shortcut_lines then
    for line = current_line + 1, total_lines do
      if state.shortcut_lines[line] then
        vim.api.nvim_win_set_cursor(state.win, { line, 0 })
        M.select_at_cursor()
        return
      end
    end
    return
  end

  -- Find next command line
  for line = current_line + 1, total_lines do
    if state.command_lines[line] then
      vim.api.nvim_win_set_cursor(state.win, { line, 0 })
      M.select_at_cursor()
      return
    end
  end

  -- No more commands found - try to expand next collapsed section
  for line = current_line + 1, total_lines do
    if state.section_lines[line] then
      local section = state.section_lines[line]
      if not ccasp.state.expanded_sections[section] then
        -- Expand this section and refresh
        ccasp.state.expanded_sections[section] = true
        M.refresh()
        -- After refresh, try to select first item in section
        vim.defer_fn(function()
          M.next_command()
        end, 10)
        return
      end
    end
  end
end

-- Navigate to previous command/shortcut
function M.prev_command()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local ccasp = require("ccasp")
  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]

  -- On Shortcuts tab, navigate shortcut_lines
  if ccasp.state.active_tab == 7 and state.shortcut_lines then
    for line = current_line - 1, 1, -1 do
      if state.shortcut_lines[line] then
        vim.api.nvim_win_set_cursor(state.win, { line, 0 })
        M.select_at_cursor()
        return
      end
    end
    return
  end

  -- Find previous command line
  for line = current_line - 1, 1, -1 do
    if state.command_lines[line] then
      vim.api.nvim_win_set_cursor(state.win, { line, 0 })
      M.select_at_cursor()
      return
    end
  end

  -- No more commands found - try to expand previous collapsed section
  for line = current_line - 1, 1, -1 do
    if state.section_lines[line] then
      local section = state.section_lines[line]
      if not ccasp.state.expanded_sections[section] then
        -- Expand this section and refresh
        ccasp.state.expanded_sections[section] = true
        M.refresh()
        return
      end
    end
  end
end

-- Navigate to next section
function M.next_section()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]
  local total_lines = vim.api.nvim_buf_line_count(state.buf)

  for line = current_line + 1, total_lines do
    if state.section_lines[line] then
      vim.api.nvim_win_set_cursor(state.win, { line, 0 })
      return
    end
  end
end

-- Navigate to previous section
function M.prev_section()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]

  for line = current_line - 1, 1, -1 do
    if state.section_lines[line] then
      vim.api.nvim_win_set_cursor(state.win, { line, 0 })
      return
    end
  end
end

-- Toggle section under cursor
function M.toggle_section_at_cursor()
  local ccasp = require("ccasp")
  local section = M.get_section_at_cursor()

  if section then
    local current = ccasp.state.expanded_sections[section]
    ccasp.state.expanded_sections[section] = current == false
    M.refresh()
  end
end

-- Expand all sections
function M.expand_all_sections()
  local ccasp = require("ccasp")
  local commands = require("ccasp.core.commands")
  local sections = commands.get_sections()

  for _, section in ipairs(sections) do
    ccasp.state.expanded_sections[section.name] = true
  end
  M.refresh()
end

-- Collapse all sections
function M.collapse_all_sections()
  local ccasp = require("ccasp")
  local commands = require("ccasp.core.commands")
  local sections = commands.get_sections()

  for _, section in ipairs(sections) do
    ccasp.state.expanded_sections[section.name] = false
  end
  M.refresh()
end

-- Yank command name to clipboard
function M.yank_command()
  local ccasp = require("ccasp")

  if ccasp.state.selected_command then
    local cmd_text = "/" .. ccasp.state.selected_command
    vim.fn.setreg("+", cmd_text)
    vim.fn.setreg('"', cmd_text)
    vim.notify("Yanked: " .. cmd_text, vim.log.levels.INFO)
  end
end

-- Open command source file
function M.open_source()
  local ccasp = require("ccasp")
  local commands = require("ccasp.core.commands")

  if ccasp.state.selected_command then
    local cmd = commands.get(ccasp.state.selected_command)
    if cmd and cmd.path then
      vim.cmd("edit " .. cmd.path)
    end
  end
end

-- Set up sidebar keybindings using modular keybinding groups
function M._setup_keybindings()
  if not state.buf then
    return
  end

  local opts = { buffer = state.buf, noremap = true, silent = true }

  -- Setup all keybinding groups
  keybindings.setup_navigation_keys(state.buf, opts, M)
  keybindings.setup_action_keys(state.buf, opts, M)
  keybindings.setup_tab_keys(state.buf, opts, M)
  keybindings.setup_mouse_handlers(state.buf, opts, M)
  keybindings.setup_misc_keys(state.buf, opts, M)
end

-- Show context menu at cursor position
function M.show_context_menu()
  local ccasp = require("ccasp")

  -- Build menu items based on current context
  local items = {}

  local section = M.get_section_at_cursor()
  if section then
    -- Section context menu
    local expanded = ccasp.state.expanded_sections[section]
    if expanded then
      table.insert(items, { label = "Collapse Section", action = function() M.toggle_section_at_cursor() end })
    else
      table.insert(items, { label = "Expand Section", action = function() M.toggle_section_at_cursor() end })
    end
    table.insert(items, { label = "Expand All", action = function() M.expand_all_sections() end })
    table.insert(items, { label = "Collapse All", action = function() M.collapse_all_sections() end })
  elseif ccasp.state.active_tab == 6 then
    -- Asset context menu
    local asset_ref = M.get_command_at_cursor()
    if asset_ref then
      local asset_type, asset_name = asset_ref:match("^([^:]+):(.+)$")
      if asset_type and asset_name then
        table.insert(items, { label = "Edit " .. asset_name, action = function()
          require("ccasp.ui.form-editor").open(asset_type, asset_name)
        end })
        table.insert(items, { label = "Open Source File", action = function()
          local assets = require("ccasp.core.assets")
          local asset = assets.get(asset_type, asset_name)
          if asset and asset.path then
            vim.cmd("edit " .. asset.path)
          end
        end })
        table.insert(items, { label = "Delete", action = function()
          require("ccasp.ui.delete-modal").show(asset_type, asset_name)
        end })
      end
    end
    table.insert(items, { label = "---" })
    table.insert(items, { label = "Reload Assets", action = function()
      require("ccasp.core.assets").reload()
      M.refresh()
    end })
  elseif ccasp.state.active_tab == 1 then
    -- Command context menu
    local cmd = M.get_command_at_cursor()
    if cmd then
      table.insert(items, { label = "Run /" .. cmd, action = function()
        ccasp.run_command(cmd)
      end })
      table.insert(items, { label = "Open Source", action = function()
        M.open_source()
      end })
      table.insert(items, { label = "Yank Command", action = function()
        M.yank_command()
      end })
      table.insert(items, { label = "Toggle Protection", action = function()
        local protected = require("ccasp.core.protected")
        protected.toggle(cmd)
        M.refresh()
      end })
    end
  end

  if #items == 0 then
    return
  end

  -- Create popup menu using vim.ui.select
  local labels = {}
  local actions = {}
  for _, item in ipairs(items) do
    if item.label ~= "---" then
      table.insert(labels, item.label)
      table.insert(actions, item.action)
    end
  end

  vim.ui.select(labels, {
    prompt = "Action:",
  }, function(choice, idx)
    if choice and actions[idx] then
      actions[idx]()
    end
  end)
end

return M
