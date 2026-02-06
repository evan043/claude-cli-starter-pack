-- ccasp/onboarding/renderer.lua - Buffer rendering engine for welcome pages
-- Renders page content with highlights, navigation, and try-it actions

local M = {}

local helpers = require("ccasp.panels.helpers")
local icons = require("ccasp.ui.icons")

-- Namespace for extmark highlights
local ns_name = "ccasp_onboarding"

-- Render a page into the buffer
-- @param bufnr number: Buffer handle
-- @param page_data table: { title, sections[], try_it? }
-- @param current_page number: Current page number
-- @param total_pages number: Total pages
function M.render_page(bufnr, page_data, current_page, total_pages)
  if not bufnr or not vim.api.nvim_buf_is_valid(bufnr) then
    return
  end

  local lines = {}
  local highlights = {} -- { line, col_start, col_end, hl_group }

  -- Get window width for centering
  local win_width = 80
  local onboarding = require("ccasp.onboarding")
  local panel = onboarding.get_panel()
  if panel.winid and vim.api.nvim_win_is_valid(panel.winid) then
    win_width = vim.api.nvim_win_get_width(panel.winid)
  end

  -- Add top padding
  table.insert(lines, "")

  -- Render page title
  local title_line = M.center_text(page_data.title or "Untitled", win_width)
  table.insert(lines, title_line)
  table.insert(highlights, { #lines - 1, 0, #title_line, "CcaspOnboardingTitle" })

  -- Subtitle with page number
  local subtitle = string.format("Page %d of %d", current_page, total_pages)
  local subtitle_line = M.center_text(subtitle, win_width)
  table.insert(lines, subtitle_line)
  table.insert(highlights, { #lines - 1, 0, #subtitle_line, "CcaspOnboardingPage" })

  -- Separator
  table.insert(lines, "")
  local sep = M.center_text(string.rep("─", math.min(60, win_width - 10)), win_width)
  table.insert(lines, sep)
  table.insert(highlights, { #lines - 1, 0, #sep, "CcaspSeparator" })
  table.insert(lines, "")

  -- Render each section
  for _, section in ipairs(page_data.sections or {}) do
    M.render_section(lines, highlights, section, win_width)
  end

  -- Render try-it action if present
  if page_data.try_it then
    M.render_try_it(lines, highlights, page_data.try_it, win_width)
  end

  -- Navigation hints
  table.insert(lines, "")
  local nav_sep = M.center_text(string.rep("─", math.min(60, win_width - 10)), win_width)
  table.insert(lines, nav_sep)
  table.insert(highlights, { #lines - 1, 0, #nav_sep, "CcaspSeparator" })

  local nav_line = M.center_text(
    icons.arrow_left .. " [p]rev   [n]ext " .. icons.arrow_right .. "   [1-8] Jump   [q] Close",
    win_width
  )
  table.insert(lines, nav_line)
  table.insert(highlights, { #lines - 1, 0, #nav_line, "CcaspOnboardingNav" })

  -- Finish button on last page
  if current_page == total_pages then
    table.insert(lines, "")
    local finish_line = M.center_text(">>> Press [F] to Finish & Close <<<", win_width)
    table.insert(lines, finish_line)
    table.insert(highlights, { #lines - 1, 0, #finish_line, "CcaspOnboardingTryIt" })
  end

  table.insert(lines, "")

  -- Set buffer content
  helpers.set_buffer_content(bufnr, lines)

  -- Apply highlights
  local ns = helpers.prepare_highlights(ns_name, bufnr)
  for _, hl in ipairs(highlights) do
    helpers.add_highlight(bufnr, ns, hl[4], hl[1], hl[2], hl[3])
  end

  -- Setup page-specific keymaps
  M.setup_page_keymaps(bufnr, current_page, total_pages, page_data.try_it)
end

-- Render a content section
function M.render_section(lines, highlights, section, win_width)
  local indent = "    "

  if section.type == "header" then
    table.insert(lines, "")
    local header_line = indent .. (section.icon or "") .. "  " .. section.text
    table.insert(lines, header_line)
    table.insert(highlights, { #lines - 1, 0, #header_line, "CcaspOnboardingHeader" })
    table.insert(lines, "")

  elseif section.type == "text" then
    -- Wrap text to fit window
    local wrapped = M.wrap_text(section.text, win_width - 8)
    for _, wline in ipairs(wrapped) do
      table.insert(lines, indent .. wline)
    end

  elseif section.type == "diagram" then
    -- ASCII diagram lines
    table.insert(lines, "")
    for _, dline in ipairs(section.lines or {}) do
      table.insert(lines, indent .. dline)
      table.insert(highlights, { #lines - 1, 0, #(indent .. dline), "CcaspOnboardingDiagram" })
    end
    table.insert(lines, "")

  elseif section.type == "table" then
    -- Render a key-value table
    table.insert(lines, "")
    for _, row in ipairs(section.rows or {}) do
      local key_str = string.format("  %-20s", row[1] or "")
      local val_str = row[2] or ""
      local tline = indent .. key_str .. val_str
      table.insert(lines, tline)
      -- Highlight key portion
      table.insert(highlights, { #lines - 1, #indent, #indent + #key_str, "CcaspOnboardingKey" })
    end
    table.insert(lines, "")

  elseif section.type == "tip" then
    table.insert(lines, "")
    local tip_line = indent .. " TIP: " .. section.text
    table.insert(lines, tip_line)
    table.insert(highlights, { #lines - 1, 0, #tip_line, "CcaspOnboardingTip" })

  elseif section.type == "list" then
    for _, item in ipairs(section.items or {}) do
      local list_line = indent .. "  " .. icons.arrow_right .. "  " .. item
      table.insert(lines, list_line)
    end

  elseif section.type == "link" then
    local link_line = indent .. "  " .. icons.open_file .. "  " .. section.text
    table.insert(lines, link_line)
    table.insert(highlights, { #lines - 1, 0, #link_line, "CcaspOnboardingLink" })
  end
end

-- Render try-it action block
function M.render_try_it(lines, highlights, try_it, win_width)
  table.insert(lines, "")
  local sep = M.center_text(string.rep("·", math.min(40, win_width - 20)), win_width)
  table.insert(lines, sep)
  table.insert(lines, "")

  local try_line = M.center_text(
    " Try it! " .. try_it.description .. "  [Enter] to try",
    win_width
  )
  table.insert(lines, try_line)
  table.insert(highlights, { #lines - 1, 0, #try_line, "CcaspOnboardingTryIt" })
end

-- Setup page-specific keymaps
function M.setup_page_keymaps(bufnr, current_page, total_pages, try_it)
  local opts = { buffer = bufnr, nowait = true, silent = true }
  local onboarding = require("ccasp.onboarding")

  -- Navigation: n/l/Right = next, p/h/Left = prev
  vim.keymap.set("n", "n", onboarding.next_page, opts)
  vim.keymap.set("n", "l", onboarding.next_page, opts)
  vim.keymap.set("n", "<Right>", onboarding.next_page, opts)

  vim.keymap.set("n", "p", onboarding.prev_page, opts)
  vim.keymap.set("n", "h", onboarding.prev_page, opts)
  vim.keymap.set("n", "<Left>", onboarding.prev_page, opts)

  -- Direct page jump (1-8)
  for i = 1, total_pages do
    vim.keymap.set("n", tostring(i), function()
      onboarding.go_to_page(i)
    end, opts)
  end

  -- Try-it action (Enter)
  if try_it and try_it.action then
    vim.keymap.set("n", "<CR>", function()
      -- Close panel first, then execute action
      onboarding.close_welcome()
      vim.defer_fn(function()
        local action_ok, err = pcall(try_it.action)
        if not action_ok then
          vim.notify("CCASP: Try-it action failed: " .. tostring(err), vim.log.levels.WARN)
        end
        -- Mark step as completed
        local state = require("ccasp.onboarding.state")
        state.mark_step("page_" .. current_page)
      end, 200)
    end, opts)
  end

  -- Finish (F on last page)
  if current_page == total_pages then
    vim.keymap.set("n", "F", onboarding.finish, opts)
    vim.keymap.set("n", "f", onboarding.finish, opts)
  end
end

-- Utility: Center text in a given width
function M.center_text(text, width)
  local text_len = vim.fn.strdisplaywidth(text)
  local padding = math.max(0, math.floor((width - text_len) / 2))
  return string.rep(" ", padding) .. text
end

-- Utility: Wrap text at word boundaries
function M.wrap_text(text, max_width)
  if not text or text == "" then return { "" } end

  local lines = {}
  local current_line = ""

  for word in text:gmatch("%S+") do
    if #current_line + #word + 1 > max_width then
      table.insert(lines, current_line)
      current_line = word
    else
      if current_line == "" then
        current_line = word
      else
        current_line = current_line .. " " .. word
      end
    end
  end

  if current_line ~= "" then
    table.insert(lines, current_line)
  end

  return lines
end

return M
