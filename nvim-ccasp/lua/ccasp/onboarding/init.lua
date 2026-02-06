-- ccasp/onboarding/init.lua - Welcome panel lifecycle
-- Manages the Getting Started floating window (open/close/toggle)
-- Uses panels/helpers.lua pattern for consistent panel behavior

local M = {}

local helpers = require("ccasp.panels.helpers")
local state_mod = require("ccasp.onboarding.state")

-- Panel state
local panel = {
  bufnr = nil,
  winid = nil,
  is_open = false,
  current_page = 1,
  total_pages = 8,
}

-- Get panel state (for external access)
function M.get_panel()
  return panel
end

-- Calculate welcome panel dimensions (90% of screen)
local function get_panel_config()
  local width = math.floor(vim.o.columns * 0.9)
  local height = math.floor(vim.o.lines * 0.85)

  -- Minimum dimensions
  width = math.max(width, 80)
  height = math.max(height, 24)

  local pos = helpers.calculate_position({ width = width, height = height })

  return {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " 󰚩 CCASP Getting Started ",
    title_pos = "center",
    footer = " [n]ext  [p]rev  [1-8] jump  [q] close ",
    footer_pos = "center",
  }
end

-- Open the welcome panel
function M.open_welcome()
  -- Focus existing window if already open
  if helpers.focus_if_open(panel.winid) then
    return
  end

  -- Restore last viewed page
  panel.current_page = state_mod.get_last_page()

  -- Create buffer
  panel.bufnr = helpers.create_buffer("ccasp://getting-started")

  -- Create floating window
  local config = get_panel_config()
  panel.winid = helpers.create_window(panel.bufnr, config)
  panel.is_open = true

  -- Set window options
  vim.wo[panel.winid].wrap = true
  vim.wo[panel.winid].linebreak = true
  vim.wo[panel.winid].cursorline = false
  vim.wo[panel.winid].number = false
  vim.wo[panel.winid].relativenumber = false
  vim.wo[panel.winid].signcolumn = "no"

  -- Set window highlights
  vim.wo[panel.winid].winhighlight = "Normal:CcaspPanelBg,FloatBorder:CcaspBorderGlow,FloatTitle:CcaspTitle,FloatFooter:CcaspBarKey"

  -- Setup keymaps (close, window manager, minimize)
  helpers.setup_standard_keymaps(panel.bufnr, panel.winid, "Getting Started", panel, M.close_welcome)

  -- Render current page
  M.render_current_page()

  -- Track in window manager
  local wm_ok, wm = pcall(require, "ccasp.window_manager")
  if wm_ok then
    wm.register(panel.winid, "Getting Started", "󰚩")
  end
end

-- Close the welcome panel
function M.close_welcome()
  -- Save current page before closing
  if panel.current_page then
    state_mod.set_last_page(panel.current_page)
  end

  helpers.close_panel(panel)
end

-- Toggle the welcome panel
function M.toggle_welcome()
  if panel.is_open and panel.winid and vim.api.nvim_win_is_valid(panel.winid) then
    M.close_welcome()
  else
    M.open_welcome()
  end
end

-- Navigate to a specific page
function M.go_to_page(page_num)
  if page_num < 1 then page_num = 1 end
  if page_num > panel.total_pages then page_num = panel.total_pages end

  panel.current_page = page_num
  state_mod.set_last_page(page_num)
  M.render_current_page()
end

-- Navigate to next page
function M.next_page()
  M.go_to_page(panel.current_page + 1)
end

-- Navigate to previous page
function M.prev_page()
  M.go_to_page(panel.current_page - 1)
end

-- Render the current page content
function M.render_current_page()
  if not panel.bufnr or not vim.api.nvim_buf_is_valid(panel.bufnr) then
    return
  end

  -- Load pages module (lazy to avoid circular deps)
  local pages_ok, pages = pcall(require, "ccasp.onboarding.pages")
  if not pages_ok then
    helpers.set_buffer_content(panel.bufnr, {
      "",
      "  Error loading pages module:",
      "  " .. tostring(pages),
      "",
    })
    return
  end

  -- Load renderer module
  local renderer_ok, renderer = pcall(require, "ccasp.onboarding.renderer")
  if not renderer_ok then
    helpers.set_buffer_content(panel.bufnr, {
      "",
      "  Error loading renderer:",
      "  " .. tostring(renderer),
      "",
    })
    return
  end

  -- Get page data and render
  local page_data = pages.get_page(panel.current_page)
  if page_data then
    renderer.render_page(panel.bufnr, page_data, panel.current_page, panel.total_pages)
  end

  -- Update footer with current page info
  M.update_footer()
end

-- Update the window footer with page indicator
function M.update_footer()
  if not panel.winid or not vim.api.nvim_win_is_valid(panel.winid) then
    return
  end

  -- Build page dots
  local dots = {}
  for i = 1, panel.total_pages do
    if i == panel.current_page then
      table.insert(dots, "●")
    else
      table.insert(dots, "○")
    end
  end
  local dot_str = table.concat(dots, " ")

  local footer_text = string.format(" [n]ext [p]rev [1-%d] jump  %s  Page %d/%d  [q] close ",
    panel.total_pages, dot_str, panel.current_page, panel.total_pages)

  pcall(vim.api.nvim_win_set_config, panel.winid, {
    footer = footer_text,
    footer_pos = "center",
  })
end

-- Finish onboarding
function M.finish()
  state_mod.mark_completed()
  M.close_welcome()
  vim.notify("CCASP: Getting Started complete! Use :CcaspWelcome to reopen anytime.", vim.log.levels.INFO)
end

return M
