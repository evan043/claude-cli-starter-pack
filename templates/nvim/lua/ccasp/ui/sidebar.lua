-- CCASP Sidebar UI Component
-- Tabbed sidebar with command browser, settings, protected commands, and status

local M = {}

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

-- Word wrap text to fit within max_width, returning multiple lines
-- Supports up to max_words (default 20) and justifies text
local function wrap_text(text, max_width, indent, max_words)
  if not text or text == "" then
    return {}
  end

  indent = indent or "      "
  max_width = max_width or 32
  max_words = max_words or 20

  local lines = {}
  local words = {}

  -- Split into words and limit to max_words
  local word_count = 0
  for word in text:gmatch("%S+") do
    word_count = word_count + 1
    if word_count <= max_words then
      table.insert(words, word)
    else
      table.insert(words, "...")
      break
    end
  end

  local current_line = indent
  local available_width = max_width - #indent

  for i, word in ipairs(words) do
    local test_line = current_line == indent and (current_line .. word) or (current_line .. " " .. word)

    if #test_line - #indent <= available_width then
      current_line = test_line
    else
      -- Line is full, save it and start new line
      if current_line ~= indent then
        table.insert(lines, current_line)
      end
      current_line = indent .. word
    end
  end

  -- Don't forget the last line
  if current_line ~= indent then
    table.insert(lines, current_line)
  end

  return lines
end

-- Create the sidebar buffer content
local function render_content()
  local ccasp = require("ccasp")
  local commands = require("ccasp.core.commands")
  local settings = require("ccasp.core.settings")
  local protected = require("ccasp.core.protected")

  local lines = {}
  local highlights = {}  -- { {line, col_start, col_end, hl_group}, ... }

  -- Reset line maps
  state.command_lines = {}
  state.section_lines = {}
  state.description_lines = {}  -- Track description lines for italic highlighting

  -- Tab bar (compact vertical format)
  local tabs = {
    { num = "1", name = "Commands" },
    { num = "2", name = "Settings" },
    { num = "3", name = "Protected" },
    { num = "4", name = "Status" },
    { num = "5", name = "Keys" },
    { num = "6", name = "Assets" },
  }
  for i, tab in ipairs(tabs) do
    local indicator = (i == ccasp.state.active_tab) and "▸" or " "
    local bracket_l = (i == ccasp.state.active_tab) and "[" or " "
    local bracket_r = (i == ccasp.state.active_tab) and "]" or " "
    table.insert(lines, string.format("%s%s%s%s %s", indicator, bracket_l, tab.num, bracket_r, tab.name))
  end
  table.insert(lines, string.rep("─", 40))

  if ccasp.state.active_tab == 1 then
    -- Commands tab
    table.insert(lines, "🔍 " .. (ccasp.state.search_query ~= "" and ccasp.state.search_query or "Search commands...") .. "  [/]")
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, "")

    -- Get sections
    local sections = commands.get_sections()

    for _, section in ipairs(sections) do
      local expanded = ccasp.state.expanded_sections[section.name] ~= false

      -- Section header (emoji already included in section name)
      local icon = expanded and "▼ " or "► "
      table.insert(lines, icon .. section.name)
      state.section_lines[#lines] = section.name

      if expanded then
        -- Commands in section
        for _, cmd_name in ipairs(section.commands) do
          local cmd = commands.get(cmd_name)
          local selected = ccasp.state.selected_command == cmd_name

          -- Apply search filter
          local show = true
          if ccasp.state.search_query and ccasp.state.search_query ~= "" then
            local query = ccasp.state.search_query:lower()
            show = cmd_name:lower():find(query, 1, true) ~= nil
            if cmd and cmd.description then
              show = show or cmd.description:lower():find(query, 1, true) ~= nil
            end
          end

          if show then
            -- Command name
            local prefix = selected and "  ► " or "    "
            table.insert(lines, prefix .. cmd_name)
            state.command_lines[#lines] = cmd_name

            -- Description (if selected) - word wrapped, italic, different color
            if selected then
              local desc = cmd and cmd.description or nil
              if desc and desc ~= "" then
                -- Wrap description to multiple lines (max 32 chars, max 20 words)
                local desc_lines = wrap_text(desc, 34, "      ", 20)
                for _, desc_line in ipairs(desc_lines) do
                  table.insert(lines, desc_line)
                  -- Track for italic highlighting
                  table.insert(state.description_lines, #lines)
                  table.insert(highlights, { #lines, 6, #desc_line, "Comment" })
                end
              else
                -- No description available - show placeholder
                table.insert(lines, "      (no description)")
                table.insert(state.description_lines, #lines)
                table.insert(highlights, { #lines, 6, 22, "NonText" })
              end
            end
          end
        end
      end

      table.insert(lines, "")
    end

    -- Quick preview at bottom
    if ccasp.state.selected_command then
      table.insert(lines, string.rep("─", 38))
      table.insert(lines, "QUICK PREVIEW: " .. ccasp.state.selected_command)
      table.insert(lines, string.rep("─", 38))

      local cmd = commands.get(ccasp.state.selected_command)
      if cmd and cmd.description then
        -- Wrap description
        local desc = cmd.description
        while #desc > 36 do
          table.insert(lines, desc:sub(1, 36))
          desc = desc:sub(37)
        end
        if #desc > 0 then
          table.insert(lines, desc)
        end
      end

      -- Options
      if cmd and cmd.options and #cmd.options > 0 then
        table.insert(lines, "")
        table.insert(lines, "Options:")
        for _, opt in ipairs(cmd.options) do
          local checked = " "
          if ccasp.state.command_options and
             ccasp.state.command_options[ccasp.state.selected_command] and
             ccasp.state.command_options[ccasp.state.selected_command][opt.label] then
            checked = "x"
          end
          table.insert(lines, " [" .. checked .. "] " .. opt.label)
        end
      end

      table.insert(lines, "")
      table.insert(lines, "[↵] Run  [e] Expand  [?] Help")
    end

  elseif ccasp.state.active_tab == 2 then
    -- Settings tab
    local s = settings.get()

    table.insert(lines, "")
    table.insert(lines, "Permissions Mode:")
    local modes = { "auto", "plan", "ask" }
    for _, mode in ipairs(modes) do
      local checked = s.permissions_mode == mode and "•" or " "
      table.insert(lines, " (" .. checked .. ") " .. mode)
    end

    table.insert(lines, "")
    table.insert(lines, "Update Mode:")
    local update_modes = { "auto", "manual", "prompt" }
    for _, mode in ipairs(update_modes) do
      local checked = s.update_mode == mode and "•" or " "
      table.insert(lines, " (" .. checked .. ") " .. mode)
    end

    table.insert(lines, "")
    table.insert(lines, "/update-check Defaults:")
    local defaults = s.update_check_defaults or {}
    table.insert(lines, " [" .. (defaults.sync_commands and "x" or " ") .. "] Sync commands")
    table.insert(lines, " [" .. (defaults.sync_hooks and "x" or " ") .. "] Sync hooks")
    table.insert(lines, " [" .. (defaults.sync_agents and "x" or " ") .. "] Sync agents")

    table.insert(lines, "")
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, "")

    -- AI Constitution section
    table.insert(lines, "📜 AI Constitution:")
    local constitution_editor = require("ccasp.ui.constitution-editor")
    local has_constitution = constitution_editor.exists()
    local constitution_status = has_constitution and "✓ Configured" or "○ Not initialized"
    table.insert(lines, "   Status: " .. constitution_status)

    if has_constitution then
      local constitution = constitution_editor.get_constitution()
      if constitution then
        local enabled_sections = 0
        for _, section in pairs(constitution.sections or {}) do
          if section.enabled ~= false then
            enabled_sections = enabled_sections + 1
          end
        end
        table.insert(lines, "   Sections: " .. enabled_sections .. " enabled")
        local sampling = constitution.enforcement and constitution.enforcement.sampling_rate or 0.05
        table.insert(lines, "   Sampling: " .. (sampling * 100) .. "%")
      end
    end

    table.insert(lines, "")
    table.insert(lines, "   [c] Edit Constitution")
    table.insert(lines, "")
    table.insert(lines, "[Space] Toggle  [s] Save  [r] Reset")

  elseif ccasp.state.active_tab == 3 then
    -- Protected tab
    local list = protected.list()

    table.insert(lines, "")
    table.insert(lines, "Protected Commands (" .. #list .. ")")
    table.insert(lines, "Safe from auto-updates")
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, "")

    if #list == 0 then
      table.insert(lines, "  No protected commands")
      table.insert(lines, "")
      table.insert(lines, "  Use [a] on a command to protect it")
    else
      for _, cmd_name in ipairs(list) do
        table.insert(lines, "  ✓ " .. cmd_name)
      end
    end

    table.insert(lines, "")
    table.insert(lines, "[a] Add  [d] Remove  [D] Diff")

  elseif ccasp.state.active_tab == 4 then
    -- Status tab
    local status = ccasp.get_status()
    local statusbar = require("ccasp.ui.statusbar")

    table.insert(lines, "")
    table.insert(lines, "CCASP Status")
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, "")
    table.insert(lines, "Version: " .. status.version)
    table.insert(lines, "Permissions: " .. status.permissions_mode)
    table.insert(lines, "Updates: " .. status.update_mode)
    table.insert(lines, "Protected: " .. status.protected_count .. " commands")
    table.insert(lines, "Sync: " .. status.sync_status)

    table.insert(lines, "")
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, "Commands loaded: " .. (commands.get_sync_status() == "synced" and "Yes" or "No"))

    -- Add health check section
    local health_lines = statusbar.format_health_check()
    for _, line in ipairs(health_lines) do
      table.insert(lines, line)
    end

    table.insert(lines, "")
    table.insert(lines, "[r] Refresh  [u] Check Updates")

  elseif ccasp.state.active_tab == 5 then
    -- Keyboard Shortcuts tab
    table.insert(lines, "")
    table.insert(lines, "⌨️  Keyboard Shortcuts")
    table.insert(lines, string.rep("─", 42))
    table.insert(lines, "")

    -- Panel Controls
    table.insert(lines, "▶ Panel Controls")
    table.insert(lines, "  Space z      Zoom/restore current panel")
    table.insert(lines, "  Ctrl+W z     Zoom/restore (vim style)")
    table.insert(lines, "  Space =      Equal split sizes")
    table.insert(lines, "  Ctrl+Arrow   Resize panel (5 cols/3 rows)")
    table.insert(lines, "")

    -- Navigation
    table.insert(lines, "▶ Window Navigation")
    table.insert(lines, "  Ctrl+h/j/k/l Move to left/down/up/right")
    table.insert(lines, "  Ctrl+B       Toggle CCASP sidebar")
    table.insert(lines, "  Ctrl+\\       Toggle terminal (toggleterm)")
    table.insert(lines, "")

    -- Resize Mode (smart-splits)
    table.insert(lines, "▶ Resize Mode (smart-splits)")
    table.insert(lines, "  Space r      Enter resize mode")
    table.insert(lines, "  Alt+h/j/k/l  Resize left/down/up/right")
    table.insert(lines, "  ESC          Exit resize mode")
    table.insert(lines, "")

    -- Terminal Controls
    table.insert(lines, "▶ Terminal Controls")
    table.insert(lines, "  Esc Esc      Exit terminal mode")
    table.insert(lines, "  Ctrl+C       Interrupt process")
    table.insert(lines, "  Ctrl+L       Clear terminal")
    table.insert(lines, "  Ctrl+U/D     Scroll up/down (page)")
    table.insert(lines, "")

    -- Sidebar Navigation
    table.insert(lines, "▶ Sidebar Navigation")
    table.insert(lines, "  1-6          Switch tabs")
    table.insert(lines, "  Tab/S-Tab    Next/prev tab")
    table.insert(lines, "  j/k          Next/prev command")
    table.insert(lines, "  {/}          Next/prev section")
    table.insert(lines, "  Enter        Run selected command")
    table.insert(lines, "  /            Search commands")
    table.insert(lines, "  q            Close sidebar")
    table.insert(lines, "")

    -- Section Controls
    table.insert(lines, "▶ Section Folding")
    table.insert(lines, "  Space        Toggle section")
    table.insert(lines, "  zo/zc        Open/close section")
    table.insert(lines, "  zR/zM        Expand/collapse all")
    table.insert(lines, "")

    -- Miscellaneous
    table.insert(lines, "▶ Other")
    table.insert(lines, "  y            Yank command name")
    table.insert(lines, "  o            Open command source")
    table.insert(lines, "  e            Expand options popup")
    table.insert(lines, "  ?            Show help")

  elseif ccasp.state.active_tab == 6 then
    -- Assets tab (Agents, Hooks, Skills)
    local assets = require("ccasp.core.assets")

    table.insert(lines, "")
    table.insert(lines, "🔧 Assets Manager")
    table.insert(lines, string.rep("─", 42))
    table.insert(lines, "")

    -- Get sections (agents, hooks, skills)
    local sections = assets.get_sections()

    for _, section in ipairs(sections) do
      -- Initialize expanded state if not set (use section's default)
      local section_key = "assets_" .. section.key
      if ccasp.state.expanded_sections[section_key] == nil then
        ccasp.state.expanded_sections[section_key] = section.expanded_default
      end

      local expanded = ccasp.state.expanded_sections[section_key]

      -- Section header with count
      local icon = expanded and "▼ " or "► "
      local count = #section.assets
      table.insert(lines, icon .. section.name .. " (" .. count .. ")")
      state.section_lines[#lines] = section_key

      if expanded then
        -- Assets in section
        for _, asset_name in ipairs(section.assets) do
          local asset = assets.get(section.key, asset_name)
          local selected = ccasp.state.selected_asset == asset_name and
                          ccasp.state.selected_asset_type == section.key

          -- Asset name
          local prefix = selected and "  ► " or "    "
          table.insert(lines, prefix .. asset_name)

          -- Track asset line (store type and name)
          state.command_lines[#lines] = section.key .. ":" .. asset_name

          -- Description (if selected) - word wrapped, italic, different color
          if selected and asset then
            local desc = asset.description
            if desc and desc ~= "" then
              -- Wrap description to multiple lines (max 32 chars, max 20 words)
              local desc_lines = wrap_text(desc, 34, "      ", 20)
              for _, desc_line in ipairs(desc_lines) do
                table.insert(lines, desc_line)
                -- Track for italic highlighting
                table.insert(state.description_lines, #lines)
                table.insert(highlights, { #lines, 6, #desc_line, "Comment" })
              end

              -- Show additional metadata based on type
              if section.key == "agents" then
                if asset.model then
                  table.insert(lines, "      Model: " .. asset.model)
                  table.insert(highlights, { #lines, 6, #lines, "Special" })
                end
                if asset.tools and #asset.tools > 0 then
                  local tools_str = table.concat(asset.tools, ", ")
                  if #tools_str > 28 then
                    tools_str = tools_str:sub(1, 25) .. "..."
                  end
                  table.insert(lines, "      Tools: " .. tools_str)
                  table.insert(highlights, { #lines, 6, #lines, "Special" })
                end
              elseif section.key == "hooks" then
                if asset.event then
                  table.insert(lines, "      Event: " .. asset.event)
                  table.insert(highlights, { #lines, 6, #lines, "Special" })
                end
              elseif section.key == "skills" then
                if asset.category then
                  table.insert(lines, "      Category: " .. asset.category)
                  table.insert(highlights, { #lines, 6, #lines, "Special" })
                end
              end
            else
              -- No description available - show placeholder
              table.insert(lines, "      (no description)")
              table.insert(state.description_lines, #lines)
              table.insert(highlights, { #lines, 6, 22, "NonText" })
            end
          end
        end

        -- Show empty message if no assets
        if #section.assets == 0 then
          table.insert(lines, "    (none)")
          table.insert(highlights, { #lines, 4, 10, "NonText" })
        end
      end

      table.insert(lines, "")
    end

    -- Asset counts summary
    local counts = assets.get_counts()
    table.insert(lines, string.rep("─", 38))
    table.insert(lines, string.format(" Total: %d agents, %d hooks, %d skills",
      counts.agents, counts.hooks, counts.skills))

    -- Action bar
    table.insert(lines, "")
    table.insert(lines, "[↵] Edit  [d] Delete  [o] Open  [r] Reload")
  end

  -- Add bottom status bar (shown on all tabs)
  local statusbar = require("ccasp.ui.statusbar")
  local status = ccasp.get_status()
  local terminal = require("ccasp.terminal")

  -- Add spacing to push status bar to bottom
  table.insert(lines, "")
  table.insert(lines, string.rep("─", 42))

  -- Status indicators row 1: Mode & Updates
  local perm_icon = ({ auto = "🤖", plan = "📝", ask = "❓" })[status.permissions_mode] or "⚙️"
  local update_icon = ({ auto = "🔄", manual = "✋", prompt = "💬" })[status.update_mode] or "⚙️"
  table.insert(lines, string.format(" %s %s │ %s %s │ 🛡️ %d",
    perm_icon,
    status.permissions_mode:sub(1, 1):upper() .. status.permissions_mode:sub(2),
    update_icon,
    status.update_mode:sub(1, 1):upper() .. status.update_mode:sub(2),
    status.protected_count
  ))

  -- Status indicators row 2: Claude CLI & Sync
  local claude_status = terminal.is_claude_running() and "✅ Claude" or "⏳ Claude"
  local sync_icon = status.sync_status == "synced" and "✅" or "⚠️"
  table.insert(lines, string.format(" %s │ Sync: %s │ v%s",
    claude_status,
    sync_icon,
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

  if has_nui() then
    -- Use nui.nvim for nice borders
    local Popup = require("nui.popup")

    state.popup = Popup({
      position = {
        row = 0,
        col = 0,
      },
      size = {
        width = ccasp.config.sidebar.width,
        height = "100%",
      },
      relative = "editor",
      border = {
        style = "rounded",
        text = {
          top = " CCASP ",
          top_align = "center",
        },
      },
      buf_options = {
        modifiable = false,
        buftype = "nofile",
        bufhidden = "wipe",
        swapfile = false,
      },
      win_options = {
        winhighlight = "Normal:Normal,FloatBorder:FloatBorder",
      },
    })

    state.popup:mount()
    state.win = state.popup.winid
    state.buf = state.popup.bufnr
  else
    -- Fallback to simple split
    vim.cmd("topleft " .. ccasp.config.sidebar.width .. "vnew")
    state.win = vim.api.nvim_get_current_win()
    state.buf = vim.api.nvim_get_current_buf()

    vim.api.nvim_buf_set_option(state.buf, "buftype", "nofile")
    vim.api.nvim_buf_set_option(state.buf, "bufhidden", "wipe")
    vim.api.nvim_buf_set_option(state.buf, "swapfile", false)
  end

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

    -- Open terminal split on the right
    vim.cmd("rightbelow vsplit")
    vim.cmd("lcd " .. vim.fn.fnameescape(project_root))
    vim.cmd("terminal")

    -- Store terminal state
    local term_bufnr = vim.api.nvim_get_current_buf()
    local term_win = vim.api.nvim_get_current_win()

    -- Update terminal module state directly
    terminal._set_state(term_bufnr, term_win)

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
  if state.popup then
    state.popup:unmount()
    state.popup = nil
  elseif state.win and vim.api.nvim_win_is_valid(state.win) then
    vim.api.nvim_win_close(state.win, true)
  end

  state.win = nil
  state.buf = nil
  state.focused = false
end

-- Refresh sidebar content
function M.refresh()
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then
    return
  end

  local lines, highlights = render_content()

  vim.api.nvim_buf_set_option(state.buf, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.buf, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.buf, "modifiable", false)

  -- Apply highlights for description lines (italic, different color)
  -- Create namespace for highlights if not exists
  local ns_id = vim.api.nvim_create_namespace("ccasp_sidebar")
  vim.api.nvim_buf_clear_namespace(state.buf, ns_id, 0, -1)

  -- Apply each highlight
  for _, hl in ipairs(highlights) do
    local line_num, col_start, col_end, hl_group = hl[1], hl[2], hl[3], hl[4]
    -- Line numbers are 1-indexed in our array but 0-indexed for nvim API
    pcall(vim.api.nvim_buf_add_highlight, state.buf, ns_id, hl_group, line_num - 1, col_start, col_end)
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

-- Select command/asset and update preview
function M.select_at_cursor()
  local ccasp = require("ccasp")
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

-- Navigate to next command
function M.next_command()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local ccasp = require("ccasp")
  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]
  local total_lines = vim.api.nvim_buf_line_count(state.buf)

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

-- Navigate to previous command
function M.prev_command()
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return
  end

  local ccasp = require("ccasp")
  local cursor = vim.api.nvim_win_get_cursor(state.win)
  local current_line = cursor[1]

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

-- Set up sidebar keybindings
function M._setup_keybindings()
  if not state.buf then
    return
  end

  local opts = { buffer = state.buf, noremap = true, silent = true }
  local ccasp = require("ccasp")

  -- Tab switching (6 tabs now)
  for i = 1, 6 do
    vim.keymap.set("n", tostring(i), function()
      ccasp.state.active_tab = i
      M.refresh()
    end, opts)
  end

  vim.keymap.set("n", "<Tab>", function()
    ccasp.state.active_tab = (ccasp.state.active_tab % 6) + 1
    M.refresh()
  end, opts)

  vim.keymap.set("n", "<S-Tab>", function()
    ccasp.state.active_tab = ((ccasp.state.active_tab - 2) % 6) + 1
    M.refresh()
  end, opts)

  -- Navigation - move and select
  vim.keymap.set("n", "j", function()
    M.next_command()
  end, opts)

  vim.keymap.set("n", "k", function()
    M.prev_command()
  end, opts)

  vim.keymap.set("n", "<Down>", function()
    M.next_command()
  end, opts)

  vim.keymap.set("n", "<Up>", function()
    M.prev_command()
  end, opts)

  -- Jump to top/bottom
  vim.keymap.set("n", "gg", function()
    vim.cmd("normal! gg")
    M.next_command() -- Select first command
  end, opts)

  vim.keymap.set("n", "G", function()
    vim.cmd("normal! G")
  end, opts)

  -- Section navigation
  vim.keymap.set("n", "}", function()
    M.next_section()
  end, opts)

  vim.keymap.set("n", "{", function()
    M.prev_section()
  end, opts)

  -- Search
  vim.keymap.set("n", "/", function()
    ccasp.quick_search()
  end, opts)

  vim.keymap.set("n", "<Esc>", function()
    if ccasp.state.search_query and ccasp.state.search_query ~= "" then
      ccasp.state.search_query = ""
      M.refresh()
    end
  end, opts)

  -- Run command / Edit asset / Toggle section
  vim.keymap.set("n", "<CR>", function()
    -- Check if on a section header first (works on all tabs)
    local section = M.get_section_at_cursor()
    if section then
      M.toggle_section_at_cursor()
      return
    end

    if ccasp.state.active_tab == 6 then
      -- On Assets tab, open form editor
      local asset_ref = M.get_command_at_cursor() -- Returns "type:name" format
      if asset_ref then
        local asset_type, asset_name = asset_ref:match("^([^:]+):(.+)$")
        if asset_type and asset_name then
          ccasp.state.selected_asset = asset_name
          ccasp.state.selected_asset_type = asset_type
          require("ccasp.ui.form-editor").open(asset_type, asset_name)
        end
      elseif ccasp.state.selected_asset and ccasp.state.selected_asset_type then
        require("ccasp.ui.form-editor").open(ccasp.state.selected_asset_type, ccasp.state.selected_asset)
      end
    else
      -- On other tabs, run command
      local cmd = M.get_command_at_cursor()
      if cmd then
        ccasp.state.selected_command = cmd
        ccasp.run_command(cmd)
      elseif ccasp.state.selected_command then
        ccasp.run_command(ccasp.state.selected_command)
      end
    end
  end, opts)

  -- Expand popup
  vim.keymap.set("n", "e", function()
    local cmd = M.get_command_at_cursor() or ccasp.state.selected_command
    if cmd then
      require("ccasp.ui.popup").show_options(cmd)
    end
  end, opts)

  -- Toggle option / Toggle section
  vim.keymap.set("n", "<Space>", function()
    -- Toggle section if on section header (works on all tabs)
    local section = M.get_section_at_cursor()
    if section then
      M.toggle_section_at_cursor()
      return
    end

    -- Tab-specific behavior
    if ccasp.state.active_tab == 2 then
      -- On Settings tab, toggle setting at cursor
      -- TODO: implement settings toggle
    end
    M.refresh()
  end, opts)

  -- Section collapse/expand (vim fold keybindings)
  vim.keymap.set("n", "zo", function()
    local section = M.get_section_at_cursor()
    if section then
      ccasp.state.expanded_sections[section] = true
      M.refresh()
    end
  end, opts)

  vim.keymap.set("n", "zc", function()
    local section = M.get_section_at_cursor()
    if section then
      ccasp.state.expanded_sections[section] = false
      M.refresh()
    end
  end, opts)

  vim.keymap.set("n", "za", function()
    M.toggle_section_at_cursor()
  end, opts)

  vim.keymap.set("n", "zM", function()
    M.collapse_all_sections()
  end, opts)

  vim.keymap.set("n", "zR", function()
    M.expand_all_sections()
  end, opts)

  -- Yank command
  vim.keymap.set("n", "y", function()
    M.yank_command()
  end, opts)

  -- Open source file
  vim.keymap.set("n", "o", function()
    if ccasp.state.active_tab == 6 then
      -- Open asset source file
      if ccasp.state.selected_asset and ccasp.state.selected_asset_type then
        local assets = require("ccasp.core.assets")
        local asset = assets.get(ccasp.state.selected_asset_type, ccasp.state.selected_asset)
        if asset and asset.path then
          vim.cmd("edit " .. asset.path)
        end
      end
    else
      M.open_source()
    end
  end, opts)

  -- Delete asset (Tab 6 only)
  vim.keymap.set("n", "d", function()
    if ccasp.state.active_tab == 6 then
      if ccasp.state.selected_asset and ccasp.state.selected_asset_type then
        require("ccasp.ui.delete-modal").show(
          ccasp.state.selected_asset_type,
          ccasp.state.selected_asset
        )
      end
    end
  end, opts)

  -- Reload assets (Tab 6)
  vim.keymap.set("n", "r", function()
    if ccasp.state.active_tab == 6 then
      local assets = require("ccasp.core.assets")
      assets.reload()
      M.refresh()
      vim.notify("Assets reloaded", vim.log.levels.INFO)
    end
  end, opts)

  -- Close
  vim.keymap.set("n", "q", function()
    M.close()
  end, opts)

  -- Help
  vim.keymap.set("n", "?", function()
    require("ccasp.ui.popup").show_help()
  end, opts)

  -- Constitution editor (from Settings tab)
  vim.keymap.set("n", "c", function()
    if ccasp.state.active_tab == 2 then
      require("ccasp.ui.constitution-editor").show()
    end
  end, opts)

  -- Mouse click support
  vim.keymap.set("n", "<LeftMouse>", function()
    -- First let the click position the cursor
    vim.cmd("normal! <LeftMouse>")

    -- Then handle the click based on what's at cursor
    local section = M.get_section_at_cursor()
    if section then
      -- Clicking on section header toggles it
      M.toggle_section_at_cursor()
    else
      -- Clicking on an item selects it
      M.select_at_cursor()
    end
  end, opts)

  -- Double-click to open/run
  vim.keymap.set("n", "<2-LeftMouse>", function()
    vim.cmd("normal! <LeftMouse>")

    local section = M.get_section_at_cursor()
    if section then
      -- Double-click on section - just toggle
      M.toggle_section_at_cursor()
      return
    end

    if ccasp.state.active_tab == 6 then
      -- Double-click on asset - open form editor
      local asset_ref = M.get_command_at_cursor()
      if asset_ref then
        local asset_type, asset_name = asset_ref:match("^([^:]+):(.+)$")
        if asset_type and asset_name then
          ccasp.state.selected_asset = asset_name
          ccasp.state.selected_asset_type = asset_type
          require("ccasp.ui.form-editor").open(asset_type, asset_name)
        end
      end
    else
      -- Double-click on command - run it
      local cmd = M.get_command_at_cursor()
      if cmd then
        ccasp.state.selected_command = cmd
        ccasp.run_command(cmd)
      end
    end
  end, opts)

  -- Right-click context menu
  vim.keymap.set("n", "<RightMouse>", function()
    vim.cmd("normal! <RightMouse>")
    M.show_context_menu()
  end, opts)
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
