-- CCASP Parser Module
-- Parses .md templates to extract AskUserQuestion options

local M = {}

-- Parse options from AskUserQuestion patterns in markdown
function M.parse_options(content)
  local options = {}

  -- Pattern 1: YAML frontmatter options
  local fm_options = M._parse_frontmatter_options(content)
  for _, opt in ipairs(fm_options) do
    table.insert(options, opt)
  end

  -- Pattern 2: AskUserQuestion tool calls
  local ask_options = M._parse_ask_user_options(content)
  for _, opt in ipairs(ask_options) do
    table.insert(options, opt)
  end

  return options
end

-- Parse options from YAML frontmatter
function M._parse_frontmatter_options(content)
  local options = {}

  -- Find frontmatter
  local fm_start = content:find("^%-%-%-\n")
  if not fm_start then
    return options
  end

  local fm_end = content:find("\n%-%-%-\n", 4)
  if not fm_end then
    return options
  end

  local fm_content = content:sub(4, fm_end - 1)

  -- Parse options array
  local in_options = false
  local current_option = nil

  for line in fm_content:gmatch("[^\n]+") do
    if line:match("^options:") then
      in_options = true
    elseif in_options then
      -- New option starts with "  - label:"
      local label = line:match('label:%s*"([^"]+)"')
      if label then
        if current_option then
          table.insert(options, current_option)
        end
        current_option = {
          type = "radio",
          label = label,
          description = "",
          default = false,
        }
      end

      -- Description
      local desc = line:match('description:%s*"([^"]+)"')
      if desc and current_option then
        current_option.description = desc
      end
    end
  end

  if current_option then
    table.insert(options, current_option)
  end

  -- Mark first option as default
  if #options > 0 then
    options[1].default = true
  end

  return options
end

-- Parse AskUserQuestion options from content
function M._parse_ask_user_options(content)
  local options = {}

  -- Look for AskUserQuestion patterns
  -- Pattern: questions: [{ question: "...", options: [{ label: "...", description: "..." }] }]

  -- Find question blocks
  for question_block in content:gmatch('questions"?:%s*%[([^%]]+)%]') do
    -- Find question text
    local question = question_block:match('question"?:%s*"([^"]+)"')

    -- Find multiSelect
    local multi = question_block:match('multiSelect"?:%s*(true)')

    -- Find options array
    for opt_block in question_block:gmatch('options"?:%s*%[([^%]]+)%]') do
      for opt in opt_block:gmatch("{([^}]+)}") do
        local label = opt:match('label"?:%s*"([^"]+)"')
        local desc = opt:match('description"?:%s*"([^"]+)"')

        if label then
          table.insert(options, {
            type = multi and "checkbox" or "radio",
            label = label,
            description = desc or "",
            question = question,
            default = false,
          })
        end
      end
    end
  end

  return options
end

-- Parse command description from content
function M.parse_description(content)
  -- Try frontmatter first
  local fm_start = content:find("^%-%-%-\n")
  if fm_start then
    local fm_end = content:find("\n%-%-%-\n", 4)
    if fm_end then
      local fm_content = content:sub(4, fm_end - 1)
      local desc = fm_content:match("description:%s*([^\n]+)")
      if desc then
        return desc:gsub("^%s+", ""):gsub("%s+$", "")
      end
    end
  end

  -- Try first markdown heading
  local heading = content:match("^#%s+([^\n]+)")
  if heading then
    return heading
  end

  -- Try first paragraph
  local para = content:match("\n\n([^\n]+)")
  if para then
    return para:sub(1, 100)
  end

  return ""
end

-- Parse sections/headers from content
function M.parse_sections(content)
  local sections = {}

  for level, title in content:gmatch("\n(#+)%s+([^\n]+)") do
    table.insert(sections, {
      level = #level,
      title = title,
    })
  end

  return sections
end

-- Extract code blocks
function M.parse_code_blocks(content)
  local blocks = {}

  for lang, code in content:gmatch("```(%w*)\n(.-)\n```") do
    table.insert(blocks, {
      language = lang ~= "" and lang or "text",
      code = code,
    })
  end

  return blocks
end

return M
