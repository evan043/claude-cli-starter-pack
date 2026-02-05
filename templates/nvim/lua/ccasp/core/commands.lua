-- CCASP Commands Module
-- Scans and manages .claude/commands/ directory

local M = {}

-- Commands cache
local commands_cache = nil
local sections_cache = nil
local last_scan_time = 0

-- Command sections mapping (organized by developer workflow lifecycle)
-- Setup → Explore → Plan → Build → Refactor → Test → Deploy → Operate → Maintain
-- NOTE: Pattern order matters! More specific patterns should come before general ones
local SECTION_PATTERNS = {
  -- 🧭 CORE NAVIGATION & ENTRY POINTS
  { name = "🧭 NAVIGATION", pattern = "^menu$", order = 1 },
  { name = "🧭 NAVIGATION", pattern = "^menu%-", order = 1 },
  { name = "🧭 NAVIGATION", pattern = "^ccasp%-panel", order = 1 },
  { name = "🧭 NAVIGATION", pattern = "^INDEX$", order = 1 },
  { name = "🧭 NAVIGATION", pattern = "^README$", order = 1 },

  -- 🛠 PROJECT INITIALIZATION & SETUP
  { name = "🛠 SETUP", pattern = "^init%-ccasp", order = 2 },
  { name = "🛠 SETUP", pattern = "^ccasp%-setup", order = 2 },
  { name = "🛠 SETUP", pattern = "^project%-implementation", order = 2 },
  { name = "🛠 SETUP", pattern = "^detect%-tech", order = 2 },
  { name = "🛠 SETUP", pattern = "^generate%-agents", order = 2 },
  { name = "🛠 SETUP", pattern = "^orchestration%-guide", order = 2 },

  -- 🔍 EXPLORATION & DISCOVERY
  { name = "🔍 EXPLORE", pattern = "^project%-explorer", order = 3 },
  { name = "🔍 EXPLORE", pattern = "^codebase%-explorer", order = 3 },
  { name = "🔍 EXPLORE", pattern = "^explore%-mcp", order = 3 },
  { name = "🔍 EXPLORE", pattern = "^research%-", order = 3 },
  { name = "🔍 EXPLORE", pattern = "^context%-audit", order = 3 },
  { name = "🔍 EXPLORE", pattern = "^claude%-audit", order = 3 },

  -- 🧠 PLANNING & ROADMAP
  { name = "🧠 PLANNING", pattern = "^phase%-dev%-plan", order = 4 },
  { name = "🧠 PLANNING", pattern = "^phase%-track", order = 4 },
  { name = "🧠 PLANNING", pattern = "^phase%-", order = 4 },
  { name = "🧠 PLANNING", pattern = "^roadmap%-edit", order = 4 },
  { name = "🧠 PLANNING", pattern = "^roadmap%-status", order = 4 },
  { name = "🧠 PLANNING", pattern = "^roadmap%-track", order = 4 },
  { name = "🧠 PLANNING", pattern = "^roadmap%-", order = 4 },
  { name = "🧠 PLANNING", pattern = "^create%-roadmap", order = 4 },

  -- 🤖 AGENTS, SKILLS & AUTOMATION
  { name = "🤖 AUTOMATION", pattern = "^create%-agent", order = 5 },
  { name = "🤖 AUTOMATION", pattern = "^create%-skill", order = 5 },
  { name = "🤖 AUTOMATION", pattern = "^create%-hook", order = 5 },
  { name = "🤖 AUTOMATION", pattern = "^create%-smoke%-test", order = 5 },
  { name = "🤖 AUTOMATION", pattern = "^create%-task%-list%-for%-issue", order = 5 },
  { name = "🤖 AUTOMATION", pattern = "^create%-task%-list", order = 5 },

  -- 🧩 TASKS, ISSUES & GITHUB FLOW
  { name = "🧩 GITHUB", pattern = "^github%-epic%-menu", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-epic%-status", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-menu%-issues%-list", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-project%-menu", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-task%-multiple", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-task%-start", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-task", order = 6 },
  { name = "🧩 GITHUB", pattern = "^github%-", order = 6 },
  { name = "🧩 GITHUB", pattern = "^create%-github%-epic", order = 6 },
  { name = "🧩 GITHUB", pattern = "^issue%-templates%-sync%-executor", order = 6 },
  { name = "🧩 GITHUB", pattern = "^issue%-templates%-sync", order = 6 },
  { name = "🧩 GITHUB", pattern = "^issue%-templates", order = 6 },
  { name = "🧩 GITHUB", pattern = "^pr%-merge", order = 6 },
  { name = "🧩 GITHUB", pattern = "^pr%-", order = 6 },

  -- 🧱 DEVELOPMENT & EXECUTION
  { name = "🧱 DEVELOP", pattern = "^dev%-mode%-deploy%-to%-projects", order = 7 },
  { name = "🧱 DEVELOP", pattern = "^dev%-mode%-merge", order = 7 },
  { name = "🧱 DEVELOP", pattern = "^dev%-mode", order = 7 },
  { name = "🧱 DEVELOP", pattern = "^ask%-claude", order = 7 },
  { name = "🧱 DEVELOP", pattern = "^ralph$", order = 7 },

  -- ♻️ REFACTORING & CODE HEALTH
  { name = "♻️ REFACTOR", pattern = "^enhanced%-refactor%-analyze%-executor", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^enhanced%-refactor%-analyze", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^enhanced%-refactor", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-analyze", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-check", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-cleanup", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-prep", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-workflow", order = 8 },
  { name = "♻️ REFACTOR", pattern = "^refactor%-", order = 8 },

  -- 🧪 TESTING & QUALITY
  { name = "🧪 TESTING", pattern = "^e2e%-test", order = 9 },
  { name = "🧪 TESTING", pattern = "^e2e%-", order = 9 },
  { name = "🧪 TESTING", pattern = "^golden%-master", order = 9 },

  -- 🚀 DEPLOYMENT
  { name = "🚀 DEPLOY", pattern = "^deploy%-full", order = 10 },
  { name = "🚀 DEPLOY", pattern = "^deploy%-", order = 10 },
  { name = "🚀 DEPLOY", pattern = "^tunnel%-start", order = 10 },
  { name = "🚀 DEPLOY", pattern = "^tunnel%-stop", order = 10 },
  { name = "🚀 DEPLOY", pattern = "^tunnel%-", order = 10 },

  -- 👁 VISION MODE
  { name = "👁 VISION", pattern = "^vision%-init", order = 11 },
  { name = "👁 VISION", pattern = "^vision%-status", order = 11 },
  { name = "👁 VISION", pattern = "^vision%-adjust", order = 11 },
  { name = "👁 VISION", pattern = "^vision%-run", order = 11 },
  { name = "👁 VISION", pattern = "^vision%-dashboard", order = 11 },
  { name = "👁 VISION", pattern = "^vision%-", order = 11 },

  -- 🧬 VDB (VECTOR/DATA/BRAIN)
  { name = "🧬 VDB", pattern = "^vdb%-execute%-next", order = 12 },
  { name = "🧬 VDB", pattern = "^vdb%-init", order = 12 },
  { name = "🧬 VDB", pattern = "^vdb%-scan", order = 12 },
  { name = "🧬 VDB", pattern = "^vdb%-status", order = 12 },
  { name = "🧬 VDB", pattern = "^vdb%-", order = 12 },

  -- 😊 HAPPY / UX FLOW
  { name = "😊 HAPPY", pattern = "^happy%-start%-cd", order = 13 },
  { name = "😊 HAPPY", pattern = "^happy%-start", order = 13 },
  { name = "😊 HAPPY", pattern = "^happy%-", order = 13 },

  -- 🔄 UPDATES & MAINTENANCE
  { name = "🔄 MAINTAIN", pattern = "^update%-check", order = 14 },
  { name = "🔄 MAINTAIN", pattern = "^update%-smart", order = 14 },
  { name = "🔄 MAINTAIN", pattern = "^update%-", order = 14 },

  -- CATCH-ALL (must be last)
  { name = "📦 OTHER", pattern = ".*", order = 99 },
}

-- Get commands directory path
local function get_commands_dir()
  local ccasp = require("ccasp")
  local cwd = vim.fn.getcwd()
  return cwd .. "/" .. ccasp.config.ccasp_root .. "/commands"
end

-- Parse command frontmatter
local function parse_frontmatter(content)
  local frontmatter = {}

  -- Check for YAML frontmatter
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

  -- Parse options
  frontmatter.options = {}
  local options_start = fm_content:find("options:")
  if options_start then
    local in_options = false
    for line in fm_content:gmatch("[^\n]+") do
      if line:match("^options:") then
        in_options = true
      elseif in_options then
        local label = line:match('label:%s*"([^"]+)"')
        local option_desc = line:match('description:%s*"([^"]+)"')
        if label then
          table.insert(frontmatter.options, {
            label = label,
            description = option_desc or "",
          })
        end
      end
    end
  end

  return frontmatter
end

-- Get section for a command
local function get_section(cmd_name)
  for _, section in ipairs(SECTION_PATTERNS) do
    if cmd_name:match(section.pattern) then
      return section.name, section.order
    end
  end
  return "📦 OTHER", 99
end

-- Scan commands directory
function M.load_all()
  local dir = get_commands_dir()

  -- Check if directory exists
  if vim.fn.isdirectory(dir) ~= 1 then
    commands_cache = {}
    sections_cache = {}
    return commands_cache
  end

  commands_cache = {}
  sections_cache = {}

  -- Initialize sections (handle duplicate section names by only creating once)
  for _, section in ipairs(SECTION_PATTERNS) do
    if not sections_cache[section.name] then
      sections_cache[section.name] = {
        order = section.order,
        commands = {},
      }
    end
  end

  -- Scan for .md files
  local files = vim.fn.glob(dir .. "/*.md", false, true)

  for _, file in ipairs(files) do
    local filename = vim.fn.fnamemodify(file, ":t:r")

    -- Skip internal commands
    if filename:sub(1, 2) == "__" then
      goto continue
    end

    -- Read file content
    local f = io.open(file, "r")
    if not f then
      goto continue
    end

    local content = f:read("*all")
    f:close()

    -- Parse frontmatter
    local frontmatter = parse_frontmatter(content)

    -- Create command entry
    local cmd = {
      name = filename,
      path = file,
      description = frontmatter.description or "",
      options = frontmatter.options or {},
      section = get_section(filename),
    }

    commands_cache[filename] = cmd

    -- Add to section
    local section_name = cmd.section
    if sections_cache[section_name] then
      table.insert(sections_cache[section_name].commands, filename)
    end

    ::continue::
  end

  -- Sort commands within sections
  for _, section in pairs(sections_cache) do
    table.sort(section.commands)
  end

  last_scan_time = os.time()

  return commands_cache
end

-- Get all commands
function M.get_all()
  if not commands_cache then
    M.load_all()
  end
  return commands_cache
end

-- Get a specific command
function M.get(name)
  if not commands_cache then
    M.load_all()
  end
  return commands_cache[name]
end

-- Get all sections with their commands
function M.get_sections()
  if not sections_cache then
    M.load_all()
  end

  -- Sort sections by order
  local sorted = {}
  for name, section in pairs(sections_cache) do
    if #section.commands > 0 then
      table.insert(sorted, {
        name = name,
        order = section.order,
        commands = section.commands,
      })
    end
  end

  table.sort(sorted, function(a, b)
    return a.order < b.order
  end)

  return sorted
end

-- Search commands
function M.search(query)
  if not commands_cache then
    M.load_all()
  end

  if not query or query == "" then
    return commands_cache
  end

  local results = {}
  local pattern = query:lower()

  for name, cmd in pairs(commands_cache) do
    local name_lower = name:lower()
    local desc_lower = (cmd.description or ""):lower()

    if name_lower:find(pattern, 1, true) or desc_lower:find(pattern, 1, true) then
      results[name] = cmd
    end
  end

  return results
end

-- Get sync status
function M.get_sync_status()
  -- Check if commands are loaded
  if not commands_cache then
    return "unknown"
  end

  -- Count commands
  local count = 0
  for _ in pairs(commands_cache) do
    count = count + 1
  end

  if count == 0 then
    return "empty"
  end

  return "synced"
end

-- Force reload
function M.reload()
  commands_cache = nil
  sections_cache = nil
  return M.load_all()
end

return M
