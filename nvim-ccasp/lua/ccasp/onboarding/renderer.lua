-- ccasp/onboarding/renderer.lua - Buffer rendering engine for welcome pages
-- Dashboard-style cards with dark blue/teal/steel theme

local M = {}

local helpers = require("ccasp.panels.helpers")

-- Namespace for extmark highlights
local ns_name = "ccasp_onboarding"

-- Card width (used for all card borders)
local CARD_WIDTH = 55

-- Build a card top border with optional title
local function card_top(title, width)
  width = width or CARD_WIDTH
  if title then
    local inner = width - 4 - vim.fn.strdisplaywidth(title)
    local left = math.floor(inner / 2)
    local right = inner - left
    return "  " .. string.rep("─", left) .. "  " .. title .. "  " .. string.rep("─", right)
  else
    return "  ╭" .. string.rep("─", width - 2) .. "╮"
  end
end

local function card_bottom(width)
  width = width or CARD_WIDTH
  return "  ╰" .. string.rep("─", width - 2) .. "╯"
end

local function card_line(text, width)
  width = width or CARD_WIDTH
  local display_w = vim.fn.strdisplaywidth(text)
  local padding = math.max(0, width - 4 - display_w)
  return "  │ " .. text .. string.rep(" ", padding) .. " │"
end

local function card_empty(width)
  return card_line("", width)
end

-- Render a page into the buffer
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

  -- Top padding
  table.insert(lines, "")

  -- Page title (large, centered)
  local title_line = M.center_text(page_data.title or "Untitled", win_width)
  table.insert(lines, title_line)
  table.insert(highlights, { #lines - 1, 0, #title_line, "CcaspOnboardingTitle" })

  -- Subtle page indicator
  local subtitle = string.format("Page %d of %d", current_page, total_pages)
  local subtitle_line = M.center_text(subtitle, win_width)
  table.insert(lines, subtitle_line)
  table.insert(highlights, { #lines - 1, 0, #subtitle_line, "CcaspOnboardingPage" })

  -- Thin separator
  table.insert(lines, "")

  -- Render each section with dashboard-style cards
  for _, section in ipairs(page_data.sections or {}) do
    M.render_section(lines, highlights, section, win_width)
  end

  -- Try-it action card
  if page_data.try_it then
    M.render_try_it(lines, highlights, page_data.try_it, win_width)
  end

  -- Finish button on last page
  if current_page == total_pages then
    table.insert(lines, "")
    local finish_line = M.center_text("[ F ] Finish Getting Started", win_width)
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
    -- Section header as a card title bar
    table.insert(lines, "")
    local header_text = (section.icon or "") .. "  " .. section.text
    local top = card_top(header_text)
    table.insert(lines, top)
    table.insert(highlights, { #lines - 1, 0, #top, "CcaspOnboardingCard" })
    -- Highlight just the title text portion
    local title_start = top:find(header_text, 1, true)
    if title_start then
      table.insert(highlights, { #lines - 1, title_start - 1, title_start - 1 + #header_text, "CcaspOnboardingCardTitle" })
    end

  elseif section.type == "text" then
    -- Body text inside current card context
    local wrapped = M.wrap_text(section.text, win_width - 10)
    for _, wline in ipairs(wrapped) do
      table.insert(lines, indent .. wline)
    end
    table.insert(lines, "")

  elseif section.type == "diagram" then
    -- ASCII diagram in a subtle card
    table.insert(lines, "")
    local dtop = card_top(nil)
    table.insert(lines, dtop)
    table.insert(highlights, { #lines - 1, 0, #dtop, "CcaspOnboardingCard" })

    for _, dline in ipairs(section.lines or {}) do
      local dl = card_line(dline)
      table.insert(lines, dl)
      -- Card border in card color, content in diagram color
      table.insert(highlights, { #lines - 1, 0, 4, "CcaspOnboardingCard" })
      table.insert(highlights, { #lines - 1, 4, #dl - 3, "CcaspOnboardingDiagram" })
      table.insert(highlights, { #lines - 1, #dl - 3, #dl, "CcaspOnboardingCard" })
    end

    local dbot = card_bottom()
    table.insert(lines, dbot)
    table.insert(highlights, { #lines - 1, 0, #dbot, "CcaspOnboardingCard" })
    table.insert(lines, "")

  elseif section.type == "table" then
    -- Key-value table with aligned columns
    for _, row in ipairs(section.rows or {}) do
      local key_str = string.format("%-20s", row[1] or "")
      local val_str = row[2] or ""
      local tline = indent .. key_str .. val_str
      table.insert(lines, tline)
      -- Key in steel blue, value in default
      table.insert(highlights, { #lines - 1, #indent, #indent + #key_str, "CcaspOnboardingKey" })
    end
    table.insert(lines, "")

  elseif section.type == "tip" then
    -- Tip in a subtle inline card
    table.insert(lines, "")
    local tip_text = "  " .. section.text
    table.insert(lines, tip_text)
    table.insert(highlights, { #lines - 1, 0, #tip_text, "CcaspOnboardingTip" })

  elseif section.type == "list" then
    for _, item in ipairs(section.items or {}) do
      local list_line = indent .. "  " .. item
      table.insert(lines, list_line)
    end

  elseif section.type == "link" then
    local link_line = indent .. "  " .. section.text
    table.insert(lines, link_line)
    table.insert(highlights, { #lines - 1, 0, #link_line, "CcaspOnboardingLink" })
  end
end

-- Render try-it action card
function M.render_try_it(lines, highlights, try_it, win_width)
  table.insert(lines, "")
  local action_text = try_it.description .. "  [ Enter ]"
  local top = card_top(action_text)
  table.insert(lines, top)
  table.insert(highlights, { #lines - 1, 0, #top, "CcaspOnboardingCard" })
  local title_start = top:find(action_text, 1, true)
  if title_start then
    table.insert(highlights, { #lines - 1, title_start - 1, title_start - 1 + #action_text, "CcaspOnboardingTryIt" })
  end
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

  -- Enter key: try-it action if available, otherwise next page (or finish on last page)
  if try_it and try_it.action then
    vim.keymap.set("n", "<CR>", function()
      onboarding.close_welcome()
      vim.defer_fn(function()
        local action_ok, err = pcall(try_it.action)
        if not action_ok then
          vim.notify("CCASP: Try-it action failed: " .. tostring(err), vim.log.levels.WARN)
        end
        local state = require("ccasp.onboarding.state")
        state.mark_step("page_" .. current_page)
      end, 200)
    end, opts)
  elseif current_page == total_pages then
    vim.keymap.set("n", "<CR>", onboarding.finish, opts)
  else
    vim.keymap.set("n", "<CR>", onboarding.next_page, opts)
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

  local result = {}
  local current_line = ""

  for word in text:gmatch("%S+") do
    if #current_line + #word + 1 > max_width then
      table.insert(result, current_line)
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
    table.insert(result, current_line)
  end

  return result
end

return M
