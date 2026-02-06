-- CCASP Sidebar Helpers
-- Shared rendering utilities used across multiple tabs

local M = {}

-- Word wrap text to fit within max_width, returning multiple lines
-- Supports up to max_words (default 20) and justifies text
function M.wrap_text(text, max_width, indent, max_words)
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

-- Format description with word wrapping and add to lines/highlights
-- Returns the line numbers that were added
function M.format_description(desc, max_width, max_words)
  if not desc or desc == "" then
    return {
      lines = { "      (no description)" },
      highlight = "NonText",
      col_start = 6,
      col_end = 22
    }
  end

  local desc_lines = M.wrap_text(desc, max_width or 34, "      ", max_words or 20)
  return {
    lines = desc_lines,
    highlight = "Comment",
    col_start = 6,
    col_end = nil -- full line
  }
end

-- Render section header with icon and expansion state
function M.render_section_header(lines, title, is_collapsed, icon_override)
  local icon = is_collapsed and "► " or "▼ "
  if icon_override then
    icon = icon_override
  end
  table.insert(lines, icon .. title)
  return #lines -- Return line number for tracking
end

-- Render item line with selection indicator
function M.render_item_line(lines, item_name, is_selected, prefix_override)
  local prefix = is_selected and "  ► " or "    "
  if prefix_override then
    prefix = prefix_override
  end
  table.insert(lines, prefix .. item_name)
  return #lines -- Return line number for tracking
end

-- Validate window state
function M.validate_window(state)
  if not state.win or not vim.api.nvim_win_is_valid(state.win) then
    return false
  end
  return true
end

-- Validate buffer state
function M.validate_buffer(state)
  if not state.buf or not vim.api.nvim_buf_is_valid(state.buf) then
    return false
  end
  return true
end

-- Add description lines with highlighting
function M.add_description(lines, state, highlights, desc, max_width, max_words)
  if desc and desc ~= "" then
    local desc_lines = M.wrap_text(desc, max_width or 34, "      ", max_words or 20)
    for _, desc_line in ipairs(desc_lines) do
      table.insert(lines, desc_line)
      table.insert(state.description_lines, #lines)
      table.insert(highlights, { #lines, 6, #desc_line, "Comment" })
    end
  else
    table.insert(lines, "      (no description)")
    table.insert(state.description_lines, #lines)
    table.insert(highlights, { #lines, 6, 22, "NonText" })
  end
end

return M
