-- CCASP Sidebar Keybindings
-- Split into logical groups: navigation, actions, tabs, mouse, misc

local M = {}

-- Setup navigation keys (j/k/Tab/arrows/gg/G/sections)
function M.setup_navigation_keys(buf, opts, sidebar)
  -- Navigate and select
  vim.keymap.set("n", "j", function()
    sidebar.next_command()
  end, opts)

  vim.keymap.set("n", "k", function()
    sidebar.prev_command()
  end, opts)

  vim.keymap.set("n", "<Down>", function()
    sidebar.next_command()
  end, opts)

  vim.keymap.set("n", "<Up>", function()
    sidebar.prev_command()
  end, opts)

  -- Jump to top/bottom
  vim.keymap.set("n", "gg", function()
    vim.cmd("normal! gg")
    sidebar.next_command() -- Select first command
  end, opts)

  vim.keymap.set("n", "G", function()
    vim.cmd("normal! G")
  end, opts)

  -- Section navigation
  vim.keymap.set("n", "}", function()
    sidebar.next_section()
  end, opts)

  vim.keymap.set("n", "{", function()
    sidebar.prev_section()
  end, opts)

  -- Search
  vim.keymap.set("n", "/", function()
    local ccasp = require("ccasp")
    ccasp.quick_search()
  end, opts)

  vim.keymap.set("n", "<Esc>", function()
    local ccasp = require("ccasp")
    if ccasp.state.search_query and ccasp.state.search_query ~= "" then
      ccasp.state.search_query = ""
      sidebar.refresh()
    end
  end, opts)
end

-- Setup action keys (Enter/Space/d/e/r/s/n/y/o)
function M.setup_action_keys(buf, opts, sidebar)
  local ccasp = require("ccasp")

  -- Run command / Edit asset / Toggle section / Execute shortcut
  vim.keymap.set("n", "<CR>", function()
    -- Check if on a section header first (works on all tabs)
    local section = sidebar.get_section_at_cursor()
    if section then
      sidebar.toggle_section_at_cursor()
      return
    end

    if ccasp.state.active_tab == 7 then
      -- On Shortcuts tab, execute the selected shortcut
      local shortcut = sidebar.get_shortcut_at_cursor()
      if shortcut then
        ccasp.state.selected_shortcut = shortcut
        sidebar.execute_shortcut(shortcut)
      elseif ccasp.state.selected_shortcut then
        sidebar.execute_shortcut(ccasp.state.selected_shortcut)
      end
    elseif ccasp.state.active_tab == 6 then
      -- On Assets tab, open form editor
      local asset_ref = sidebar.get_command_at_cursor() -- Returns "type:name" format
      if asset_ref then
        local asset_type, asset_name = asset_ref:match("^([^:]+):(.+)$")
        if asset_type and asset_name then
          ccasp.state.selected_asset = asset_name
          ccasp.state.selected_asset_type = asset_type
          local fe_ok, form_editor = pcall(require, "ccasp.ui.form-editor")
          if fe_ok and form_editor then form_editor.open(asset_type, asset_name) end
        end
      elseif ccasp.state.selected_asset and ccasp.state.selected_asset_type then
        local fe_ok, form_editor = pcall(require, "ccasp.ui.form-editor")
        if fe_ok and form_editor then form_editor.open(ccasp.state.selected_asset_type, ccasp.state.selected_asset) end
      end
    else
      -- On other tabs, run command
      local cmd = sidebar.get_command_at_cursor()
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
    local cmd = sidebar.get_command_at_cursor() or ccasp.state.selected_command
    if cmd then
      require("ccasp.ui.popup").show_options(cmd)
    end
  end, opts)

  -- Toggle option / Toggle section
  vim.keymap.set("n", "<Space>", function()
    -- Toggle section if on section header (works on all tabs)
    local section = sidebar.get_section_at_cursor()
    if section then
      sidebar.toggle_section_at_cursor()
      return
    end

    -- Tab-specific behavior
    if ccasp.state.active_tab == 2 then
      -- On Settings tab, toggle setting at cursor
      -- TODO: implement settings toggle
    end
    sidebar.refresh()
  end, opts)

  -- Section collapse/expand (vim fold keybindings)
  vim.keymap.set("n", "zo", function()
    local section = sidebar.get_section_at_cursor()
    if section then
      ccasp.state.expanded_sections[section] = true
      sidebar.refresh()
    end
  end, opts)

  vim.keymap.set("n", "zc", function()
    local section = sidebar.get_section_at_cursor()
    if section then
      ccasp.state.expanded_sections[section] = false
      sidebar.refresh()
    end
  end, opts)

  vim.keymap.set("n", "za", function()
    sidebar.toggle_section_at_cursor()
  end, opts)

  vim.keymap.set("n", "zM", function()
    sidebar.collapse_all_sections()
  end, opts)

  vim.keymap.set("n", "zR", function()
    sidebar.expand_all_sections()
  end, opts)

  -- Yank command
  vim.keymap.set("n", "y", function()
    sidebar.yank_command()
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
      sidebar.open_source()
    end
  end, opts)

  -- Delete asset (Tab 6 only)
  vim.keymap.set("n", "d", function()
    if ccasp.state.active_tab == 6 then
      if ccasp.state.selected_asset and ccasp.state.selected_asset_type then
        local dm_ok, delete_modal = pcall(require, "ccasp.ui.delete-modal")
        if dm_ok and delete_modal then
          delete_modal.show(ccasp.state.selected_asset_type, ccasp.state.selected_asset)
        end
      end
    end
  end, opts)

  -- Reload assets (Tab 6)
  vim.keymap.set("n", "r", function()
    if ccasp.state.active_tab == 6 then
      local assets = require("ccasp.core.assets")
      assets.reload()
      sidebar.refresh()
      vim.notify("Assets reloaded", vim.log.levels.INFO)
    end
  end, opts)
end

-- Setup tab switching keys (1-7, Tab/S-Tab, h/l)
function M.setup_tab_keys(buf, opts, sidebar)
  local ccasp = require("ccasp")

  -- Tab switching (7 tabs)
  for i = 1, 7 do
    vim.keymap.set("n", tostring(i), function()
      ccasp.state.active_tab = i
      sidebar.refresh()
    end, opts)
  end

  vim.keymap.set("n", "<Tab>", function()
    ccasp.state.active_tab = (ccasp.state.active_tab % 7) + 1
    sidebar.refresh()
  end, opts)

  vim.keymap.set("n", "<S-Tab>", function()
    ccasp.state.active_tab = ((ccasp.state.active_tab - 2) % 7) + 1
    sidebar.refresh()
  end, opts)
end

-- Setup mouse handlers (LeftMouse, 2-LeftMouse, RightMouse)
function M.setup_mouse_handlers(buf, opts, sidebar)
  local ccasp = require("ccasp")

  -- Mouse click support
  vim.keymap.set("n", "<LeftMouse>", function()
    -- Position cursor at click location (works on non-modifiable buffers)
    local mouse_pos = vim.fn.getmousepos()
    -- CRITICAL: Preserve the buffer bounds check fix
    local line_count = vim.api.nvim_buf_line_count(0)
    if mouse_pos.line > 0 and mouse_pos.line <= line_count then
      vim.api.nvim_win_set_cursor(0, { mouse_pos.line, mouse_pos.column - 1 })
    end

    -- Then handle the click based on what's at cursor
    local section = sidebar.get_section_at_cursor()
    if section then
      -- Clicking on section header toggles it
      sidebar.toggle_section_at_cursor()
    else
      -- Clicking on an item selects it
      sidebar.select_at_cursor()
    end
  end, opts)

  -- Double-click to open/run
  vim.keymap.set("n", "<2-LeftMouse>", function()
    local mouse_pos = vim.fn.getmousepos()
    local line_count = vim.api.nvim_buf_line_count(0)
    if mouse_pos.line > 0 and mouse_pos.line <= line_count then
      vim.api.nvim_win_set_cursor(0, { mouse_pos.line, mouse_pos.column - 1 })
    end

    local section = sidebar.get_section_at_cursor()
    if section then
      -- Double-click on section - just toggle
      sidebar.toggle_section_at_cursor()
      return
    end

    if ccasp.state.active_tab == 6 then
      -- Double-click on asset - open form editor
      local asset_ref = sidebar.get_command_at_cursor()
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
      local cmd = sidebar.get_command_at_cursor()
      if cmd then
        ccasp.state.selected_command = cmd
        ccasp.run_command(cmd)
      end
    end
  end, opts)

  -- Right-click context menu
  vim.keymap.set("n", "<RightMouse>", function()
    local mouse_pos = vim.fn.getmousepos()
    local line_count = vim.api.nvim_buf_line_count(0)
    if mouse_pos.line > 0 and mouse_pos.line <= line_count then
      vim.api.nvim_win_set_cursor(0, { mouse_pos.line, mouse_pos.column - 1 })
    end
    sidebar.show_context_menu()
  end, opts)
end

-- Setup miscellaneous keys (q/Esc close, ? help, c constitution)
function M.setup_misc_keys(buf, opts, sidebar)
  local ccasp = require("ccasp")

  -- Close
  vim.keymap.set("n", "q", function()
    sidebar.close()
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
end

return M
