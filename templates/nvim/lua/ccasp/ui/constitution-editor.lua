-- CCASP Constitution Editor
-- Modal editor for AI Constitution YAML configuration
-- Tab 2 in the sidebar navigation

local M = {}

local state = {
  popup = nil,
  constitution = nil,
  sections = {},
  current_section = 1,
  modified = false,
  word_counts = {},
}

-- Default word limits per section
local DEFAULT_WORD_LIMITS = {
  code_style = 200,
  architecture = 250,
  security = 150,
  performance = 150,
  git = 100,
  dependencies = 100,
  custom = 200,
}

-- Section display order
local SECTION_ORDER = {
  "code_style",
  "architecture",
  "security",
  "performance",
  "git",
  "dependencies",
  "custom",
}

-- Check if nui is available
local function has_nui()
  local ok, _ = pcall(require, "nui.popup")
  return ok
end

-- Get constitution file path
local function get_constitution_path()
  local cwd = vim.fn.getcwd()
  return cwd .. "/.claude/config/constitution.yaml"
end

-- Get backup path
local function get_backup_path()
  local cwd = vim.fn.getcwd()
  return cwd .. "/.claude/config/constitution.yaml.backup"
end

-- Read YAML file
local function read_yaml(path)
  local file = io.open(path, "r")
  if not file then
    return nil, "File not found: " .. path
  end

  local content = file:read("*all")
  file:close()

  return content, nil
end

-- Write YAML file
local function write_yaml(path, content)
  -- Ensure directory exists
  local dir = path:match("(.*/)")
  if dir then
    vim.fn.mkdir(dir, "p")
  end

  local file = io.open(path, "w")
  if not file then
    return false, "Cannot write to: " .. path
  end

  file:write(content)
  file:close()

  return true, nil
end

-- Simple YAML parser (focused on constitution structure)
local function parse_constitution(content)
  local constitution = {
    version = "1.0.0",
    project_name = "",
    enforcement = {
      enabled = true,
      sampling_rate = 0.05,
      tools = { "Edit", "Write" },
      sensitive_patterns = {},
    },
    word_limits = vim.tbl_deep_extend("force", {}, DEFAULT_WORD_LIMITS),
    sections = {},
  }

  local lines = vim.split(content, "\n")
  local current_section = nil
  local current_rule = nil
  local in_rules = false
  local in_array = nil

  for _, line in ipairs(lines) do
    if line:match("^%s*#") or line:match("^%s*$") then
      -- Skip comments and empty lines
      goto continue
    end

    -- Top-level fields
    local key, value = line:match("^([%w_]+):%s*(.*)$")
    if key and value and value ~= "" then
      if key == "version" then
        constitution.version = value:gsub('"', "")
      elseif key == "project_name" then
        constitution.project_name = value:gsub('"', "")
      end
    end

    -- Section headers
    local section_name = line:match("^%s%s([%w_]+):$")
    if section_name and SECTION_ORDER[section_name] ~= nil or vim.tbl_contains(SECTION_ORDER, section_name) then
      current_section = section_name
      in_rules = false
      constitution.sections[current_section] = constitution.sections[current_section] or {
        title = section_name:gsub("_", " "):gsub("^%l", string.upper),
        enabled = true,
        rules = {},
      }
    end

    -- Section properties
    if current_section then
      local indent_key, indent_value = line:match("^%s%s%s%s([%w_]+):%s*(.*)$")
      if indent_key then
        if indent_key == "title" then
          constitution.sections[current_section].title = indent_value:gsub('"', "")
        elseif indent_key == "enabled" then
          constitution.sections[current_section].enabled = indent_value == "true"
        elseif indent_key == "rules" then
          in_rules = true
        end
      end
    end

    -- Rule items
    if in_rules and current_section then
      -- New rule item
      if line:match("^%s%s%s%s%s%s%-%s*id:") then
        local id = line:match('id:%s*"?([%w_%-]+)"?')
        if id then
          current_rule = {
            id = id,
            description = "",
            severity = "warning",
            enabled = true,
          }
          table.insert(constitution.sections[current_section].rules, current_rule)
        end
      elseif current_rule then
        -- Rule properties
        local rule_key, rule_value = line:match("^%s%s%s%s%s%s%s%s([%w_]+):%s*(.*)$")
        if rule_key and rule_value then
          if rule_key == "description" then
            current_rule.description = rule_value:gsub('"', "")
          elseif rule_key == "severity" then
            current_rule.severity = rule_value
          elseif rule_key == "enabled" then
            current_rule.enabled = rule_value == "true"
          elseif rule_key == "rationale" then
            current_rule.rationale = rule_value:gsub('"', "")
          elseif rule_key == "auto_fix" then
            current_rule.auto_fix = rule_value == "true"
          end
        end
      end
    end

    ::continue::
  end

  return constitution
end

-- Generate YAML from constitution object
local function generate_yaml(constitution)
  local lines = {}

  table.insert(lines, "# AI Constitution for " .. (constitution.project_name or "Project"))
  table.insert(lines, "# Generated by CCASP Neovim Constitution Editor")
  table.insert(lines, "")
  table.insert(lines, 'version: "' .. (constitution.version or "1.0.0") .. '"')
  table.insert(lines, 'project_name: "' .. (constitution.project_name or "") .. '"')
  table.insert(lines, "")

  -- Enforcement section
  table.insert(lines, "enforcement:")
  table.insert(lines, "  enabled: " .. tostring(constitution.enforcement.enabled))
  table.insert(lines, "  sampling_rate: " .. tostring(constitution.enforcement.sampling_rate))
  table.insert(lines, "  tools:")
  for _, tool in ipairs(constitution.enforcement.tools or {}) do
    table.insert(lines, "    - " .. tool)
  end
  table.insert(lines, "  sensitive_patterns:")
  for _, pattern in ipairs(constitution.enforcement.sensitive_patterns or {}) do
    table.insert(lines, "    - " .. pattern)
  end
  table.insert(lines, "")

  -- Word limits
  table.insert(lines, "word_limits:")
  for section, limit in pairs(constitution.word_limits or DEFAULT_WORD_LIMITS) do
    table.insert(lines, "  " .. section .. ": " .. tostring(limit))
  end
  table.insert(lines, "")

  -- Sections
  table.insert(lines, "sections:")

  for _, section_name in ipairs(SECTION_ORDER) do
    local section = constitution.sections[section_name]
    if section then
      table.insert(lines, "  " .. section_name .. ":")
      table.insert(lines, '    title: "' .. (section.title or section_name) .. '"')
      table.insert(lines, "    enabled: " .. tostring(section.enabled ~= false))
      table.insert(lines, "    rules:")

      for _, rule in ipairs(section.rules or {}) do
        table.insert(lines, '      - id: "' .. (rule.id or "RULE-000") .. '"')
        table.insert(lines, '        description: "' .. (rule.description or "") .. '"')
        table.insert(lines, "        severity: " .. (rule.severity or "warning"))
        if rule.enabled ~= nil then
          table.insert(lines, "        enabled: " .. tostring(rule.enabled))
        end
        if rule.rationale then
          table.insert(lines, '        rationale: "' .. rule.rationale .. '"')
        end
        if rule.auto_fix then
          table.insert(lines, "        auto_fix: " .. tostring(rule.auto_fix))
        end
      end

      table.insert(lines, "")
    end
  end

  return table.concat(lines, "\n")
end

-- Count words in a section
local function count_section_words(section)
  local count = 0
  if section.title then
    count = count + #vim.split(section.title, "%s+")
  end
  if section.description then
    count = count + #vim.split(section.description, "%s+")
  end
  for _, rule in ipairs(section.rules or {}) do
    if rule.description then
      count = count + #vim.split(rule.description, "%s+")
    end
    if rule.rationale then
      count = count + #vim.split(rule.rationale, "%s+")
    end
  end
  return count
end

-- Load constitution from file
function M.load()
  local path = get_constitution_path()
  local content, err = read_yaml(path)

  if not content then
    -- Create default constitution
    state.constitution = {
      version = "1.0.0",
      project_name = vim.fn.fnamemodify(vim.fn.getcwd(), ":t"),
      enforcement = {
        enabled = true,
        sampling_rate = 0.05,
        tools = { "Edit", "Write" },
        sensitive_patterns = { "password", "secret", "api_key", "token" },
      },
      word_limits = vim.tbl_deep_extend("force", {}, DEFAULT_WORD_LIMITS),
      sections = {},
    }
    state.modified = true
    return state.constitution
  end

  state.constitution = parse_constitution(content)
  state.modified = false

  -- Calculate word counts
  for section_name, section in pairs(state.constitution.sections) do
    state.word_counts[section_name] = count_section_words(section)
  end

  return state.constitution
end

-- Save constitution to file
function M.save()
  if not state.constitution then
    vim.notify("No constitution loaded", vim.log.levels.ERROR)
    return false
  end

  local path = get_constitution_path()
  local backup_path = get_backup_path()

  -- Create backup if file exists
  local existing = read_yaml(path)
  if existing then
    write_yaml(backup_path, existing)
  end

  local content = generate_yaml(state.constitution)
  local ok, err = write_yaml(path, content)

  if not ok then
    vim.notify("Failed to save: " .. (err or "unknown error"), vim.log.levels.ERROR)
    return false
  end

  state.modified = false
  vim.notify("Constitution saved", vim.log.levels.INFO)
  return true
end

-- Show the constitution editor popup
function M.show()
  if not has_nui() then
    vim.notify("nui.nvim required for constitution editor", vim.log.levels.WARN)
    return
  end

  -- Load constitution
  M.load()

  local Popup = require("nui.popup")

  -- Create main popup
  state.popup = Popup({
    position = "50%",
    size = {
      width = 80,
      height = 40,
    },
    border = {
      style = "rounded",
      text = {
        top = " AI Constitution Editor ",
        top_align = "center",
        bottom = " [Tab] Section  [e] Edit  [t] Toggle  [s] Save  [Esc] Close ",
        bottom_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
      filetype = "yaml",
    },
    win_options = {
      winhighlight = "Normal:Normal,FloatBorder:FloatBorder",
      cursorline = true,
    },
  })

  state.popup:mount()
  M._render()
  M._setup_keybindings()
end

-- Render the constitution content
function M._render()
  if not state.popup or not state.constitution then
    return
  end

  local lines = {}
  local constitution = state.constitution

  -- Header
  table.insert(lines, "")
  table.insert(lines, "  Project: " .. (constitution.project_name or "Unknown"))
  table.insert(lines, "  Version: " .. (constitution.version or "1.0.0"))
  table.insert(lines, "  Status: " .. (state.modified and "Modified *" or "Saved"))
  table.insert(lines, "")

  -- Enforcement settings
  table.insert(lines, "  ╭─ Enforcement ─────────────────────────────────────────────╮")
  table.insert(lines, "  │ Enabled: " .. tostring(constitution.enforcement.enabled) .. string.rep(" ", 50 - #tostring(constitution.enforcement.enabled)) .. "│")
  table.insert(lines, "  │ Sampling: " .. (constitution.enforcement.sampling_rate * 100) .. "% (1-in-" .. math.floor(1 / constitution.enforcement.sampling_rate) .. ")" .. string.rep(" ", 35) .. "│")
  table.insert(lines, "  ╰────────────────────────────────────────────────────────────╯")
  table.insert(lines, "")

  -- Sections
  table.insert(lines, "  ══════════════════════════════════════════════════════════════")
  table.insert(lines, "  SECTIONS")
  table.insert(lines, "  ══════════════════════════════════════════════════════════════")
  table.insert(lines, "")

  for i, section_name in ipairs(SECTION_ORDER) do
    local section = constitution.sections[section_name]
    local word_count = state.word_counts[section_name] or 0
    local word_limit = constitution.word_limits[section_name] or DEFAULT_WORD_LIMITS[section_name] or 200
    local usage_pct = math.floor((word_count / word_limit) * 100)

    local status = section and section.enabled ~= false and "✓" or "○"
    local rules_count = section and #(section.rules or {}) or 0

    local marker = i == state.current_section and "▶" or " "

    table.insert(lines, string.format(
      "  %s %s %s (%d rules, %d/%d words %d%%)",
      marker,
      status,
      section and section.title or section_name:gsub("_", " "),
      rules_count,
      word_count,
      word_limit,
      usage_pct
    ))

    -- Show rules if this is the current section
    if i == state.current_section and section and section.rules then
      for j, rule in ipairs(section.rules) do
        local rule_status = rule.enabled ~= false and "•" or "○"
        local severity_icon = rule.severity == "error" and "❌" or
                             rule.severity == "warning" and "⚠" or "ℹ"
        table.insert(lines, string.format(
          "      %s %s %s: %s",
          rule_status,
          severity_icon,
          rule.id,
          rule.description:sub(1, 45) .. (#rule.description > 45 and "..." or "")
        ))
      end
    end

    table.insert(lines, "")
  end

  -- Footer
  table.insert(lines, "  ──────────────────────────────────────────────────────────────")
  table.insert(lines, "  Keybindings:")
  table.insert(lines, "  [Tab/j/k] Navigate sections  [e] Edit section  [t] Toggle enabled")
  table.insert(lines, "  [a] Add rule  [d] Delete rule  [s] Save  [q/Esc] Close")
  table.insert(lines, "")

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)
end

-- Set up keybindings for the editor
function M._setup_keybindings()
  if not state.popup then
    return
  end

  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }

  -- Close
  vim.keymap.set("n", "<Esc>", function()
    if state.modified then
      vim.ui.select({ "Save and close", "Discard changes", "Cancel" }, {
        prompt = "You have unsaved changes:",
      }, function(choice)
        if choice == "Save and close" then
          M.save()
          M.close()
        elseif choice == "Discard changes" then
          M.close()
        end
      end)
    else
      M.close()
    end
  end, opts)

  vim.keymap.set("n", "q", function()
    M.close()
  end, opts)

  -- Navigation
  vim.keymap.set("n", "<Tab>", function()
    state.current_section = (state.current_section % #SECTION_ORDER) + 1
    M._render()
  end, opts)

  vim.keymap.set("n", "<S-Tab>", function()
    state.current_section = ((state.current_section - 2) % #SECTION_ORDER) + 1
    M._render()
  end, opts)

  vim.keymap.set("n", "j", function()
    state.current_section = math.min(state.current_section + 1, #SECTION_ORDER)
    M._render()
  end, opts)

  vim.keymap.set("n", "k", function()
    state.current_section = math.max(state.current_section - 1, 1)
    M._render()
  end, opts)

  -- Toggle section enabled
  vim.keymap.set("n", "t", function()
    local section_name = SECTION_ORDER[state.current_section]
    if state.constitution.sections[section_name] then
      state.constitution.sections[section_name].enabled =
        not state.constitution.sections[section_name].enabled
      state.modified = true
      M._render()
    end
  end, opts)

  -- Save
  vim.keymap.set("n", "s", function()
    M.save()
    M._render()
  end, opts)

  vim.keymap.set("n", "<C-s>", function()
    M.save()
    M._render()
  end, opts)

  -- Edit section (opens input for section title)
  vim.keymap.set("n", "e", function()
    local section_name = SECTION_ORDER[state.current_section]
    local section = state.constitution.sections[section_name]
    if not section then return end

    vim.ui.input({
      prompt = "Section title: ",
      default = section.title or section_name,
    }, function(input)
      if input and input ~= "" then
        section.title = input
        state.modified = true
        M._render()
      end
    end)
  end, opts)

  -- Add rule
  vim.keymap.set("n", "a", function()
    local section_name = SECTION_ORDER[state.current_section]
    local section = state.constitution.sections[section_name]
    if not section then
      state.constitution.sections[section_name] = {
        title = section_name:gsub("_", " "):gsub("^%l", string.upper),
        enabled = true,
        rules = {},
      }
      section = state.constitution.sections[section_name]
    end

    local prefix = section_name:sub(1, 2):upper()
    if section_name == "code_style" then prefix = "CS"
    elseif section_name == "architecture" then prefix = "ARCH"
    elseif section_name == "security" then prefix = "SEC"
    elseif section_name == "performance" then prefix = "PERF"
    elseif section_name == "git" then prefix = "GIT"
    elseif section_name == "dependencies" then prefix = "DEP"
    elseif section_name == "custom" then prefix = "CUST"
    end

    local next_num = string.format("%03d", #(section.rules or {}) + 1)

    vim.ui.input({
      prompt = "Rule description: ",
    }, function(input)
      if input and input ~= "" then
        table.insert(section.rules, {
          id = prefix .. "-" .. next_num,
          description = input,
          severity = "warning",
          enabled = true,
        })
        state.modified = true
        state.word_counts[section_name] = count_section_words(section)
        M._render()
      end
    end)
  end, opts)

  -- Delete rule (last one in section)
  vim.keymap.set("n", "d", function()
    local section_name = SECTION_ORDER[state.current_section]
    local section = state.constitution.sections[section_name]
    if section and section.rules and #section.rules > 0 then
      vim.ui.select({ "Yes", "No" }, {
        prompt = "Delete last rule in " .. section_name .. "?",
      }, function(choice)
        if choice == "Yes" then
          table.remove(section.rules)
          state.modified = true
          state.word_counts[section_name] = count_section_words(section)
          M._render()
        end
      end)
    end
  end, opts)
end

-- Close the editor
function M.close()
  if state.popup then
    state.popup:unmount()
    state.popup = nil
  end
end

-- Get validation status
function M.is_valid()
  if not state.constitution then
    return false, "No constitution loaded"
  end

  local errors = {}

  -- Check required fields
  if not state.constitution.version then
    table.insert(errors, "Missing version")
  end

  -- Check word limits
  for section_name, section in pairs(state.constitution.sections) do
    local count = count_section_words(section)
    local limit = state.constitution.word_limits[section_name] or DEFAULT_WORD_LIMITS[section_name] or 200
    if count > limit then
      table.insert(errors, section_name .. " exceeds word limit (" .. count .. "/" .. limit .. ")")
    end
  end

  -- Check rule IDs
  local rule_ids = {}
  for section_name, section in pairs(state.constitution.sections) do
    for _, rule in ipairs(section.rules or {}) do
      if rule_ids[rule.id] then
        table.insert(errors, "Duplicate rule ID: " .. rule.id)
      end
      rule_ids[rule.id] = true

      if not rule.id:match("^[A-Z]+-[0-9]+$") then
        table.insert(errors, "Invalid rule ID format: " .. rule.id)
      end
    end
  end

  if #errors > 0 then
    return false, table.concat(errors, "\n")
  end

  return true, nil
end

-- Get current constitution data
function M.get_constitution()
  return state.constitution
end

-- Check if constitution exists
function M.exists()
  local path = get_constitution_path()
  local file = io.open(path, "r")
  if file then
    file:close()
    return true
  end
  return false
end

return M
