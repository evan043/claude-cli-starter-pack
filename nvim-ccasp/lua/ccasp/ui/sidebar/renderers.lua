-- CCASP Sidebar Tab Renderers
-- Each tab's rendering logic extracted from the main render_content function

local M = {}
local helpers = require("ccasp.ui.sidebar.helpers")

-- Tab 0: Commands (originally tab 1)
function M.render_commands_tab(lines, state, ccasp, query)
  local commands = require("ccasp.core.commands")
  local highlights = {}

  table.insert(lines, "🔍 " .. (query ~= "" and query or "Search commands...") .. "  [/]")
  table.insert(lines, string.rep("─", 38))
  table.insert(lines, "")

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
        if query and query ~= "" then
          local q = query:lower()
          show = cmd_name:lower():find(q, 1, true) ~= nil
          if cmd and cmd.description then
            show = show or cmd.description:lower():find(q, 1, true) ~= nil
          end
        end

        if show then
          -- Command name
          local prefix = selected and "  ► " or "    "
          table.insert(lines, prefix .. cmd_name)
          state.command_lines[#lines] = cmd_name

          -- Description (if selected)
          if selected then
            local desc = cmd and cmd.description or nil
            helpers.add_description(lines, state, highlights, desc, 34, 20)
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

  return highlights
end

-- Tab 1: Assets (originally tab 6)
function M.render_assets_tab(lines, state, ccasp, query)
  local assets = require("ccasp.core.assets")
  local highlights = {}

  table.insert(lines, "")
  table.insert(lines, "🔧 Assets Manager")
  table.insert(lines, string.rep("─", 42))
  table.insert(lines, "")

  local sections = assets.get_sections()

  for _, section in ipairs(sections) do
    -- Initialize expanded state if not set
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
      M._render_assets_in_section(lines, state, highlights, ccasp, section)

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

  return highlights
end

-- Helper: Render assets within a section (flattened from 9-level nesting)
function M._render_assets_in_section(lines, state, highlights, ccasp, section)
  local assets = require("ccasp.core.assets")

  for _, asset_name in ipairs(section.assets) do
    local asset = assets.get(section.key, asset_name)
    local selected = ccasp.state.selected_asset == asset_name and
                    ccasp.state.selected_asset_type == section.key

    -- Asset name
    local prefix = selected and "  ► " or "    "
    table.insert(lines, prefix .. asset_name)
    state.command_lines[#lines] = section.key .. ":" .. asset_name

    -- Description and metadata (if selected)
    if selected and asset then
      M._render_asset_details(lines, state, highlights, asset, section.key)
    end
  end
end

-- Helper: Render asset details (description + metadata)
function M._render_asset_details(lines, state, highlights, asset, asset_type)
  local desc = asset.description
  helpers.add_description(lines, state, highlights, desc, 34, 20)

  -- Show additional metadata based on type
  if asset_type == "agents" then
    M._render_agent_metadata(lines, highlights, asset)
  elseif asset_type == "hooks" then
    M._render_hook_metadata(lines, highlights, asset)
  elseif asset_type == "skills" then
    M._render_skill_metadata(lines, highlights, asset)
  end
end

-- Helper: Render agent metadata
function M._render_agent_metadata(lines, highlights, asset)
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
end

-- Helper: Render hook metadata
function M._render_hook_metadata(lines, highlights, asset)
  if asset.event then
    table.insert(lines, "      Event: " .. asset.event)
    table.insert(highlights, { #lines, 6, #lines, "Special" })
  end
end

-- Helper: Render skill metadata
function M._render_skill_metadata(lines, highlights, asset)
  if asset.category then
    table.insert(lines, "      Category: " .. asset.category)
    table.insert(highlights, { #lines, 6, #lines, "Special" })
  end
end

-- Tab 2: Settings (originally tab 2)
function M.render_settings_tab(lines, state, ccasp)
  local settings = require("ccasp.core.settings")
  local highlights = {}

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
  M._render_constitution_section(lines)

  table.insert(lines, "")
  table.insert(lines, "[Space] Toggle  [s] Save  [r] Reset")

  return highlights
end

-- Helper: Render AI Constitution section
function M._render_constitution_section(lines)
  table.insert(lines, "📜 AI Constitution:")
  local ce_ok, constitution_editor = pcall(require, "ccasp.ui.constitution-editor")
  if ce_ok and constitution_editor then
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
  else
    table.insert(lines, "   Status: ○ Module not available")
  end

  table.insert(lines, "")
  table.insert(lines, "   [c] Edit Constitution")
end

-- Tab 3: Sessions (originally tab 4 Status)
function M.render_sessions_tab(lines, state, ccasp)
  local highlights = {}
  local status = ccasp.get_status()
  local commands = require("ccasp.core.commands")
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

  return highlights
end

-- Tab 4: Agents (originally tab 3 Protected)
function M.render_agents_tab(lines, state, ccasp, query)
  local protected = require("ccasp.core.protected")
  local highlights = {}

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

  return highlights
end

-- Tab 5: Shortcuts (originally tab 7)
function M.render_shortcuts_tab(lines, state, ccasp)
  local sessions = require("ccasp.sessions")
  local highlights = {}

  table.insert(lines, "")
  table.insert(lines, "⚡ Quick Actions")
  table.insert(lines, string.rep("─", 42))
  table.insert(lines, "")

  -- Get session count for dynamic display
  local session_count = sessions.count()
  local layout = sessions.get_layout()
  local minimized_count = #sessions.get_minimized()

  -- Define all shortcuts with their actions
  local shortcuts = {
    { section = "Terminal Sessions (" .. session_count .. "/8 - " .. layout .. ")", items = {
      { name = "+ New Claude Session", action = "new_session" },
      { name = "Session Picker", action = "session_picker" },
      { name = "Rename Current Session", action = "session_rename" },
      { name = "Change Session Color", action = "session_color" },
      { name = "Minimize Current Session", action = "session_minimize" },
      { name = "Restore Minimized (" .. minimized_count .. ")", action = "session_restore" },
      { name = "Next Session", action = "session_next" },
      { name = "Previous Session", action = "session_prev" },
      { name = "Close All Sessions", action = "session_close_all" },
    }},
    { section = "Panels", items = {
      { name = "Control Panel", action = "control" },
      { name = "Dashboard", action = "dashboard" },
      { name = "Features", action = "features" },
      { name = "Hooks", action = "hooks" },
      { name = "Taskbar", action = "taskbar" },
    }},
    { section = "Agents", items = {
      { name = "Agent Grid", action = "grid" },
      { name = "Restart All Agents", action = "restart_all" },
      { name = "Kill All Agents", action = "kill_all" },
    }},
    { section = "Prompt Injector", items = {
      { name = "Toggle Prompt Injector", action = "prompt_injector" },
      { name = "Quick Enhance", action = "quick_enhance" },
      { name = "Toggle Auto-Enhance", action = "auto_enhance" },
    }},
    { section = "Browse", items = {
      { name = "Commands (Telescope)", action = "commands" },
      { name = "Skills (Telescope)", action = "skills" },
    }},
    { section = "System", items = {
      { name = "Save Settings", action = "save_settings" },
      { name = "Detect Tech Stack", action = "detect_stack" },
      { name = "Refresh", action = "refresh" },
    }},
  }

  -- Track shortcut lines for selection
  state.shortcut_lines = state.shortcut_lines or {}
  state.shortcut_lines = {}

  for _, section in ipairs(shortcuts) do
    -- Section header
    table.insert(lines, "▶ " .. section.section)

    for _, item in ipairs(section.items) do
      local selected = ccasp.state.selected_shortcut == item.action
      local prefix = selected and "  ► " or "    "
      table.insert(lines, prefix .. item.name)
      state.shortcut_lines[#lines] = item.action
    end

    table.insert(lines, "")
  end

  -- Action bar
  table.insert(lines, string.rep("─", 38))
  table.insert(lines, "[↵] Execute  [j/k] Navigate  [q] Close")

  return highlights
end

-- Tab 6: Help (originally tab 5 Keyboard Shortcuts)
function M.render_help_tab(lines, state, ccasp)
  local highlights = {}

  table.insert(lines, "")
  table.insert(lines, "⌨️  Keyboard Shortcuts")
  table.insert(lines, string.rep("─", 42))
  table.insert(lines, "")
  table.insert(lines, "Click section header to expand/collapse")
  table.insert(lines, "")

  -- Define all keyboard shortcut sections
  local key_sections = {
    {
      key = "keys_panel",
      name = "Panel Controls",
      shortcuts = {
        { "Space z", "Zoom/restore current panel" },
        { "Ctrl+W z", "Zoom/restore (vim style)" },
        { "Space =", "Equal split sizes" },
        { "Ctrl+Arrow", "Resize panel (5 cols/3 rows)" },
      },
    },
    {
      key = "keys_nav",
      name = "Window Navigation",
      shortcuts = {
        { "Ctrl+h/j/k/l", "Move to left/down/up/right" },
        { "Ctrl+B", "Toggle CCASP sidebar" },
        { "Ctrl+\\", "Toggle terminal (toggleterm)" },
      },
    },
    {
      key = "keys_resize",
      name = "Resize Mode (smart-splits)",
      shortcuts = {
        { "Space r", "Enter resize mode" },
        { "Alt+h/j/k/l", "Resize left/down/up/right" },
        { "ESC", "Exit resize mode" },
      },
    },
    {
      key = "keys_terminal",
      name = "Terminal Controls",
      shortcuts = {
        { "Esc Esc", "Exit terminal mode" },
        { "Ctrl+C", "Interrupt process" },
        { "Ctrl+L", "Clear terminal" },
        { "Ctrl+U/D", "Scroll up/down (page)" },
      },
    },
    {
      key = "keys_sidebar",
      name = "Sidebar Navigation",
      shortcuts = {
        { "1-6", "Switch tabs" },
        { "Tab/S-Tab", "Next/prev tab" },
        { "j/k", "Next/prev command" },
        { "{/}", "Next/prev section" },
        { "Enter", "Run selected command" },
        { "/", "Search commands" },
        { "q", "Close sidebar" },
      },
    },
    {
      key = "keys_folding",
      name = "Section Folding",
      shortcuts = {
        { "Space", "Toggle section" },
        { "zo/zc", "Open/close section" },
        { "zR/zM", "Expand/collapse all" },
      },
    },
    {
      key = "keys_session",
      name = "Session Controls",
      shortcuts = {
        { "`", "Quick toggle to next session" },
        { "~", "Quick toggle to prev session" },
        { "Tab", "Next session (in terminal)" },
        { "Ctrl+Tab", "Next session (terminal mode)" },
        { "r", "Rename session" },
        { "c", "Change session color" },
        { "_", "Minimize session" },
        { "x", "Close session" },
      },
    },
    {
      key = "keys_other",
      name = "Other",
      shortcuts = {
        { "y", "Yank command name" },
        { "o", "Open command source" },
        { "e", "Expand options popup" },
        { "?", "Show help" },
      },
    },
  }

  -- Render each section
  for _, section in ipairs(key_sections) do
    -- Initialize expanded state if not set (collapsed by default)
    if ccasp.state.expanded_sections[section.key] == nil then
      ccasp.state.expanded_sections[section.key] = false
    end

    local expanded = ccasp.state.expanded_sections[section.key]

    -- Section header with fold icon
    local icon = expanded and "▼ " or "► "
    table.insert(lines, icon .. section.name)
    state.section_lines[#lines] = section.key

    if expanded then
      -- Show shortcuts when expanded
      for _, shortcut in ipairs(section.shortcuts) do
        local key_str = string.format("  %-14s", shortcut[1])
        table.insert(lines, key_str .. shortcut[2])
      end
    end

    table.insert(lines, "")
  end

  return highlights
end

return M
