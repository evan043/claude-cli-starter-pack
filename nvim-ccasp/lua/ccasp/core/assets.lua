-- CCASP Assets Module
-- Scans and manages .claude/agents/, .claude/hooks/, .claude/skills/ directories

local M = {}

-- Assets cache
local agents_cache = nil
local hooks_cache = nil
local skills_cache = nil
local sections_cache = nil
local last_scan_time = 0

-- Asset type configurations
local ASSET_TYPES = {
  agents = {
    name = "🤖 Agents",
    dir = "agents",
    extension = ".md",
    order = 1,
    expanded_default = true,
  },
  hooks = {
    name = "⚡ Hooks",
    dir = "hooks",
    extension = ".js",
    order = 2,
    expanded_default = false,
  },
  skills = {
    name = "🎯 Skills",
    dir = "skills",
    extension = nil, -- Skills are folders
    order = 3,
    expanded_default = false,
  },
}

-- Get base directory path
local function get_base_dir()
  local ccasp = require("ccasp")
  local cwd = vim.fn.getcwd()
  return cwd .. "/" .. ccasp.config.ccasp_root
end

-- Parse YAML frontmatter from markdown content
local function parse_yaml_frontmatter(content)
  local frontmatter = {}

  if not content then
    return frontmatter
  end

  -- Check for YAML frontmatter (starts with ---)
  local fm_start = content:find("^%-%-%-\n")
  if not fm_start then
    return frontmatter
  end

  local fm_end = content:find("\n%-%-%-\n", 4)
  if not fm_end then
    return frontmatter
  end

  local fm_content = content:sub(4, fm_end - 1)

  -- Parse description
  local desc = fm_content:match("description:%s*([^\n]+)")
  if desc then
    frontmatter.description = desc:gsub("^%s+", ""):gsub("%s+$", "")
  end

  -- Parse model
  local model = fm_content:match("model:%s*([^\n]+)")
  if model then
    frontmatter.model = model:gsub("^%s+", ""):gsub("%s+$", "")
  end

  -- Parse tools (array format - YAML list with dashes)
  frontmatter.tools = {}
  local tools_section = fm_content:match("tools:%s*\n(.-)\n[^%s%-]")
  if not tools_section then
    -- Try to match until end of frontmatter
    tools_section = fm_content:match("tools:%s*\n(.+)$")
  end

  if tools_section then
    for tool in tools_section:gmatch("%-%s*([^\n]+)") do
      local trimmed = tool:gsub("^%s+", ""):gsub("%s+$", "")
      if trimmed ~= "" then
        table.insert(frontmatter.tools, trimmed)
      end
    end
  else
    -- Try inline array format: tools: [Read, Write]
    local inline_tools = fm_content:match("tools:%s*%[([^%]]+)%]")
    if inline_tools then
      for tool in inline_tools:gmatch("([^,]+)") do
        local trimmed = tool:gsub("^%s+", ""):gsub("%s+$", "")
        if trimmed ~= "" then
          table.insert(frontmatter.tools, trimmed)
        end
      end
    end
  end

  return frontmatter
end

-- Parse JSDoc header from JavaScript content
local function parse_jsdoc_header(content)
  local jsdoc = {}

  if not content then
    return jsdoc
  end

  -- Look for JSDoc block at start of file
  local jsdoc_match = content:match("^%s*/%*%*(.-)%*/")
  if not jsdoc_match then
    return jsdoc
  end

  -- Parse @description or first line
  local desc = jsdoc_match:match("@description%s+([^\n@]+)")
  if not desc then
    -- Try first non-empty line as description
    desc = jsdoc_match:match("%*%s*([^@\n][^\n]+)")
  end
  if desc then
    jsdoc.description = desc:gsub("^%s+", ""):gsub("%s+$", ""):gsub("^%*%s*", "")
  end

  -- Parse @event
  local event = jsdoc_match:match("@event%s+([^\n]+)")
  if event then
    jsdoc.event = event:gsub("^%s+", ""):gsub("%s+$", "")
  end

  -- Parse Event: in description
  if not jsdoc.event then
    local event_inline = jsdoc_match:match("Event:%s*([^\n]+)")
    if event_inline then
      jsdoc.event = event_inline:gsub("^%s+", ""):gsub("%s+$", "")
    end
  end

  return jsdoc
end

-- Load all agents from .claude/agents/
function M.load_agents()
  local base_dir = get_base_dir()
  local agents_dir = base_dir .. "/agents"

  agents_cache = {}

  -- Check if directory exists
  if vim.fn.isdirectory(agents_dir) ~= 1 then
    return agents_cache
  end

  -- Scan for .md files
  local files = vim.fn.glob(agents_dir .. "/*.md", false, true)

  for _, file in ipairs(files) do
    local filename = vim.fn.fnamemodify(file, ":t:r")

    -- Read file content
    local f = io.open(file, "r")
    if f then
      local content = f:read("*all")
      f:close()

      -- Parse frontmatter
      local frontmatter = parse_yaml_frontmatter(content)

      -- Create agent entry
      local agent = {
        name = filename,
        path = file,
        type = "agent",
        description = frontmatter.description or "",
        model = frontmatter.model or "sonnet",
        tools = frontmatter.tools or {},
        content = content,
      }

      agents_cache[filename] = agent
    end
  end

  return agents_cache
end

-- Load all hooks from .claude/hooks/
function M.load_hooks()
  local base_dir = get_base_dir()
  local hooks_dir = base_dir .. "/hooks"

  hooks_cache = {}

  -- Check if directory exists
  if vim.fn.isdirectory(hooks_dir) ~= 1 then
    return hooks_cache
  end

  -- Scan for .js and .cjs files
  local js_files = vim.fn.glob(hooks_dir .. "/*.js", false, true)
  local cjs_files = vim.fn.glob(hooks_dir .. "/*.cjs", false, true)

  local files = {}
  for _, f in ipairs(js_files) do
    table.insert(files, f)
  end
  for _, f in ipairs(cjs_files) do
    table.insert(files, f)
  end

  for _, file in ipairs(files) do
    local filename = vim.fn.fnamemodify(file, ":t:r")

    -- Read file content
    local f = io.open(file, "r")
    if f then
      local content = f:read("*all")
      f:close()

      -- Parse JSDoc header
      local jsdoc = parse_jsdoc_header(content)

      -- Create hook entry
      local hook = {
        name = filename,
        path = file,
        type = "hook",
        description = jsdoc.description or "",
        event = jsdoc.event or "PreToolUse",
        content = content,
      }

      hooks_cache[filename] = hook
    end
  end

  return hooks_cache
end

-- Load all skills from .claude/skills/
function M.load_skills()
  local base_dir = get_base_dir()
  local skills_dir = base_dir .. "/skills"

  skills_cache = {}

  -- Check if directory exists
  if vim.fn.isdirectory(skills_dir) ~= 1 then
    return skills_cache
  end

  -- Skills are folders, not files
  local entries = vim.fn.readdir(skills_dir)

  for _, entry in ipairs(entries) do
    local skill_path = skills_dir .. "/" .. entry

    -- Check if it's a directory
    if vim.fn.isdirectory(skill_path) == 1 then
      local skill_json_path = skill_path .. "/skill.json"
      local skill_md_path = skill_path .. "/skill.md"

      local skill = {
        name = entry,
        path = skill_path,
        type = "skill",
        description = "",
        category = "general",
        features = {},
        content = "",
      }

      -- Try to read skill.json
      if vim.fn.filereadable(skill_json_path) == 1 then
        local f = io.open(skill_json_path, "r")
        if f then
          local json_content = f:read("*all")
          f:close()

          -- Parse JSON
          local ok, data = pcall(vim.fn.json_decode, json_content)
          if ok and data then
            skill.description = data.description or ""
            skill.category = data.category or "general"
            skill.features = data.features or {}
            skill.version = data.version or "1.0.0"
            skill.required_tools = data.requiredTools or {}
            skill.suggested_model = data.suggestedModel or "sonnet"
          end
        end
      end

      -- Try to read skill.md for content
      if vim.fn.filereadable(skill_md_path) == 1 then
        local f = io.open(skill_md_path, "r")
        if f then
          skill.content = f:read("*all")
          f:close()

          -- If no description from JSON, try frontmatter
          if skill.description == "" then
            local frontmatter = parse_yaml_frontmatter(skill.content)
            skill.description = frontmatter.description or ""
          end
        end
      end

      skills_cache[entry] = skill
    end
  end

  return skills_cache
end

-- Load all assets
function M.load_all()
  M.load_agents()
  M.load_hooks()
  M.load_skills()

  -- Build sections cache
  sections_cache = {}

  for type_key, type_config in pairs(ASSET_TYPES) do
    local cache = nil
    if type_key == "agents" then
      cache = agents_cache
    elseif type_key == "hooks" then
      cache = hooks_cache
    elseif type_key == "skills" then
      cache = skills_cache
    end

    -- Get sorted asset names
    local asset_names = {}
    if cache then
      for name, _ in pairs(cache) do
        table.insert(asset_names, name)
      end
      table.sort(asset_names)
    end

    sections_cache[type_key] = {
      name = type_config.name,
      order = type_config.order,
      expanded_default = type_config.expanded_default,
      assets = asset_names,
    }
  end

  last_scan_time = os.time()

  return {
    agents = agents_cache,
    hooks = hooks_cache,
    skills = skills_cache,
  }
end

-- Get all agents
function M.get_agents()
  if not agents_cache then
    M.load_agents()
  end
  return agents_cache
end

-- Get all hooks
function M.get_hooks()
  if not hooks_cache then
    M.load_hooks()
  end
  return hooks_cache
end

-- Get all skills
function M.get_skills()
  if not skills_cache then
    M.load_skills()
  end
  return skills_cache
end

-- Get a specific asset by type and name
function M.get(asset_type, name)
  if asset_type == "agent" or asset_type == "agents" then
    if not agents_cache then
      M.load_agents()
    end
    return agents_cache[name]
  elseif asset_type == "hook" or asset_type == "hooks" then
    if not hooks_cache then
      M.load_hooks()
    end
    return hooks_cache[name]
  elseif asset_type == "skill" or asset_type == "skills" then
    if not skills_cache then
      M.load_skills()
    end
    return skills_cache[name]
  end
  return nil
end

-- Get all sections with their assets (for sidebar display)
function M.get_sections()
  if not sections_cache then
    M.load_all()
  end

  -- Sort sections by order
  local sorted = {}
  for type_key, section in pairs(sections_cache) do
    table.insert(sorted, {
      key = type_key,
      name = section.name,
      order = section.order,
      expanded_default = section.expanded_default,
      assets = section.assets,
    })
  end

  table.sort(sorted, function(a, b)
    return a.order < b.order
  end)

  return sorted
end

-- Get asset counts
function M.get_counts()
  if not agents_cache then
    M.load_agents()
  end
  if not hooks_cache then
    M.load_hooks()
  end
  if not skills_cache then
    M.load_skills()
  end

  local agent_count = 0
  local hook_count = 0
  local skill_count = 0

  for _ in pairs(agents_cache or {}) do
    agent_count = agent_count + 1
  end
  for _ in pairs(hooks_cache or {}) do
    hook_count = hook_count + 1
  end
  for _ in pairs(skills_cache or {}) do
    skill_count = skill_count + 1
  end

  return {
    agents = agent_count,
    hooks = hook_count,
    skills = skill_count,
    total = agent_count + hook_count + skill_count,
  }
end

-- Save an asset (update file)
function M.save(asset_type, name, data)
  local asset = M.get(asset_type, name)
  if not asset then
    return false, "Asset not found"
  end

  if asset_type == "agent" or asset_type == "agents" then
    -- Rebuild agent markdown with frontmatter
    local lines = {
      "---",
      "description: " .. (data.description or asset.description or ""),
    }

    -- Add tools if present
    if data.tools and #data.tools > 0 then
      table.insert(lines, "tools:")
      for _, tool in ipairs(data.tools) do
        table.insert(lines, "  - " .. tool)
      end
    elseif asset.tools and #asset.tools > 0 then
      table.insert(lines, "tools:")
      for _, tool in ipairs(asset.tools) do
        table.insert(lines, "  - " .. tool)
      end
    end

    -- Add model if present
    local model = data.model or asset.model
    if model then
      table.insert(lines, "model: " .. model)
    end

    table.insert(lines, "---")
    table.insert(lines, "")

    -- Add body content (preserve existing or use new)
    local body = data.body or ""
    if body == "" and asset.content then
      -- Extract body from existing content (after frontmatter)
      local _, fm_end = asset.content:find("\n%-%-%-\n")
      if fm_end then
        body = asset.content:sub(fm_end + 1)
      end
    end
    table.insert(lines, body)

    local content = table.concat(lines, "\n")

    -- Write to file
    local f = io.open(asset.path, "w")
    if f then
      f:write(content)
      f:close()
      -- Update cache
      asset.description = data.description or asset.description
      asset.tools = data.tools or asset.tools
      asset.model = data.model or asset.model
      asset.content = content
      return true
    else
      return false, "Failed to write file"
    end

  elseif asset_type == "hook" or asset_type == "hooks" then
    -- For hooks, we update the JSDoc header
    local content = asset.content or ""

    -- Update description in JSDoc
    if data.description then
      -- Try to update existing JSDoc
      local new_jsdoc = string.format(
        "/**\n * %s\n *\n * Event: %s\n */",
        data.description,
        data.event or asset.event or "PreToolUse"
      )

      -- Replace existing JSDoc or prepend
      local jsdoc_pattern = "^%s*/%*%*.-*%*/"
      if content:match(jsdoc_pattern) then
        content = content:gsub(jsdoc_pattern, new_jsdoc)
      else
        content = new_jsdoc .. "\n\n" .. content
      end
    end

    -- Write to file
    local f = io.open(asset.path, "w")
    if f then
      f:write(content)
      f:close()
      -- Update cache
      asset.description = data.description or asset.description
      asset.event = data.event or asset.event
      asset.content = content
      return true
    else
      return false, "Failed to write file"
    end

  elseif asset_type == "skill" or asset_type == "skills" then
    -- For skills, update skill.json
    local skill_json_path = asset.path .. "/skill.json"

    local json_data = {
      name = name,
      description = data.description or asset.description or "",
      category = data.category or asset.category or "general",
      features = data.features or asset.features or {},
      version = data.version or asset.version or "1.0.0",
      requiredTools = data.required_tools or asset.required_tools or {},
      suggestedModel = data.suggested_model or asset.suggested_model or "sonnet",
    }

    local ok, json_content = pcall(vim.fn.json_encode, json_data)
    if not ok then
      return false, "Failed to encode JSON"
    end

    -- Pretty print JSON
    json_content = json_content:gsub(",", ",\n  ")
    json_content = "{\n  " .. json_content:sub(2, -2) .. "\n}"

    local f = io.open(skill_json_path, "w")
    if f then
      f:write(json_content)
      f:close()
      -- Update cache
      asset.description = data.description or asset.description
      asset.category = data.category or asset.category
      asset.features = data.features or asset.features
      return true
    else
      return false, "Failed to write file"
    end
  end

  return false, "Unknown asset type"
end

-- Delete an asset
function M.delete(asset_type, name, mode)
  local asset = M.get(asset_type, name)
  if not asset then
    return false, "Asset not found"
  end

  mode = mode or "temporary"

  local protected = require("ccasp.core.protected")

  if asset_type == "skill" or asset_type == "skills" then
    -- Skills are directories - need to delete recursively
    -- For safety, just mark as deleted in protected.json
    if mode == "permanent" then
      -- Create backup before deleting
      local backup_dir = get_base_dir() .. "/backups/deleted"
      vim.fn.mkdir(backup_dir, "p")

      local timestamp = os.date("%Y-%m-%d-%H%M%S")
      local backup_path = backup_dir .. "/" .. name .. "." .. timestamp .. ".backup"

      -- Copy directory (simplified - just note in protected)
      -- Full directory copy would require more complex logic
    end

    -- Remove directory
    local rm_cmd = vim.fn.has("win32") == 1
        and string.format('rmdir /s /q "%s"', asset.path)
        or string.format('rm -rf "%s"', asset.path)
    vim.fn.system(rm_cmd)
  else
    -- Regular file deletion
    if mode == "permanent" then
      -- Create backup
      local backup_dir = get_base_dir() .. "/backups/deleted"
      vim.fn.mkdir(backup_dir, "p")

      local timestamp = os.date("%Y-%m-%d-%H%M%S")
      local ext = asset_type == "agent" and ".md" or ".js"
      local backup_path = backup_dir .. "/" .. name .. ext .. "." .. timestamp .. ".bak"

      -- Copy file to backup
      local f_in = io.open(asset.path, "r")
      if f_in then
        local content = f_in:read("*all")
        f_in:close()

        local f_out = io.open(backup_path, "w")
        if f_out then
          f_out:write(content)
          f_out:close()
        end
      end
    end

    -- Delete file
    os.remove(asset.path)
  end

  -- Add to protected list with appropriate mode
  local protected_mode = mode == "permanent" and "exclude" or "skip"
  protected.add_asset(asset_type, name, protected_mode)

  -- Clear cache
  if asset_type == "agent" or asset_type == "agents" then
    agents_cache[name] = nil
  elseif asset_type == "hook" or asset_type == "hooks" then
    hooks_cache[name] = nil
  elseif asset_type == "skill" or asset_type == "skills" then
    skills_cache[name] = nil
  end

  -- Rebuild sections cache
  M.load_all()

  return true
end

-- Search assets
function M.search(query)
  if not agents_cache then
    M.load_all()
  end

  if not query or query == "" then
    return {
      agents = agents_cache,
      hooks = hooks_cache,
      skills = skills_cache,
    }
  end

  local results = {
    agents = {},
    hooks = {},
    skills = {},
  }

  local pattern = query:lower()

  -- Search agents
  for name, asset in pairs(agents_cache or {}) do
    local name_lower = name:lower()
    local desc_lower = (asset.description or ""):lower()

    if name_lower:find(pattern, 1, true) or desc_lower:find(pattern, 1, true) then
      results.agents[name] = asset
    end
  end

  -- Search hooks
  for name, asset in pairs(hooks_cache or {}) do
    local name_lower = name:lower()
    local desc_lower = (asset.description or ""):lower()

    if name_lower:find(pattern, 1, true) or desc_lower:find(pattern, 1, true) then
      results.hooks[name] = asset
    end
  end

  -- Search skills
  for name, asset in pairs(skills_cache or {}) do
    local name_lower = name:lower()
    local desc_lower = (asset.description or ""):lower()

    if name_lower:find(pattern, 1, true) or desc_lower:find(pattern, 1, true) then
      results.skills[name] = asset
    end
  end

  return results
end

-- Force reload
function M.reload()
  agents_cache = nil
  hooks_cache = nil
  skills_cache = nil
  sections_cache = nil
  return M.load_all()
end

return M
