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
local nf = require("ccasp.ui.icons")

local SECTION_PATTERNS = {
  -- CORE NAVIGATION & ENTRY POINTS
  { name = nf.dashboard .. " NAVIGATION", pattern = "^menu$", order = 1 },
  { name = nf.dashboard .. " NAVIGATION", pattern = "^menu%-", order = 1 },
  { name = nf.dashboard .. " NAVIGATION", pattern = "^ccasp%-panel", order = 1 },
  { name = nf.dashboard .. " NAVIGATION", pattern = "^INDEX$", order = 1 },
  { name = nf.dashboard .. " NAVIGATION", pattern = "^README$", order = 1 },

  -- PROJECT INITIALIZATION & SETUP
  { name = nf.config .. " SETUP", pattern = "^init%-ccasp", order = 2 },
  { name = nf.config .. " SETUP", pattern = "^ccasp%-setup", order = 2 },
  { name = nf.config .. " SETUP", pattern = "^project%-implementation", order = 2 },
  { name = nf.config .. " SETUP", pattern = "^detect%-tech", order = 2 },
  { name = nf.config .. " SETUP", pattern = "^generate%-agents", order = 2 },
  { name = nf.config .. " SETUP", pattern = "^orchestration%-guide", order = 2 },

  -- EXPLORATION & DISCOVERY
  { name = nf.search .. " EXPLORE", pattern = "^project%-explorer", order = 3 },
  { name = nf.search .. " EXPLORE", pattern = "^codebase%-explorer", order = 3 },
  { name = nf.search .. " EXPLORE", pattern = "^explore%-mcp", order = 3 },
  { name = nf.search .. " EXPLORE", pattern = "^research%-", order = 3 },
  { name = nf.search .. " EXPLORE", pattern = "^context%-audit", order = 3 },
  { name = nf.search .. " EXPLORE", pattern = "^claude%-audit", order = 3 },

  -- PLANNING & ROADMAP
  { name = nf.model .. " PLANNING", pattern = "^phase%-dev%-plan", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^phase%-track", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^phase%-", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^roadmap%-edit", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^roadmap%-status", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^roadmap%-track", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^roadmap%-", order = 4 },
  { name = nf.model .. " PLANNING", pattern = "^create%-roadmap", order = 4 },

  -- AGENTS, SKILLS & AUTOMATION
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-agent", order = 5 },
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-skill", order = 5 },
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-hook", order = 5 },
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-smoke%-test", order = 5 },
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-task%-list%-for%-issue", order = 5 },
  { name = nf.auto .. " AUTOMATION", pattern = "^create%-task%-list", order = 5 },

  -- TASKS, ISSUES & GITHUB FLOW
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-epic%-menu", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-epic%-status", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-menu%-issues%-list", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-project%-menu", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-task%-multiple", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-task%-start", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-task", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^github%-", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^create%-github%-epic", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^issue%-templates%-sync%-executor", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^issue%-templates%-sync", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^issue%-templates", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^pr%-merge", order = 6 },
  { name = nf.git_branch .. " GITHUB", pattern = "^pr%-", order = 6 },

  -- DEVELOPMENT & EXECUTION
  { name = nf.dev .. " DEVELOP", pattern = "^dev%-mode%-deploy%-to%-projects", order = 7 },
  { name = nf.dev .. " DEVELOP", pattern = "^dev%-mode%-merge", order = 7 },
  { name = nf.dev .. " DEVELOP", pattern = "^dev%-mode", order = 7 },
  { name = nf.dev .. " DEVELOP", pattern = "^ask%-claude", order = 7 },
  { name = nf.dev .. " DEVELOP", pattern = "^ralph$", order = 7 },

  -- REFACTORING & CODE HEALTH
  { name = nf.reload .. " REFACTOR", pattern = "^enhanced%-refactor%-analyze%-executor", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^enhanced%-refactor%-analyze", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^enhanced%-refactor", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-analyze", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-check", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-cleanup", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-prep", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-workflow", order = 8 },
  { name = nf.reload .. " REFACTOR", pattern = "^refactor%-", order = 8 },

  -- TESTING & QUALITY
  { name = nf.test .. " TESTING", pattern = "^e2e%-test", order = 9 },
  { name = nf.test .. " TESTING", pattern = "^e2e%-", order = 9 },
  { name = nf.test .. " TESTING", pattern = "^golden%-master", order = 9 },

  -- DEPLOYMENT
  { name = nf.deploy .. " DEPLOY", pattern = "^deploy%-full", order = 10 },
  { name = nf.deploy .. " DEPLOY", pattern = "^deploy%-", order = 10 },
  { name = nf.deploy .. " DEPLOY", pattern = "^tunnel%-start", order = 10 },
  { name = nf.deploy .. " DEPLOY", pattern = "^tunnel%-stop", order = 10 },
  { name = nf.deploy .. " DEPLOY", pattern = "^tunnel%-", order = 10 },

  -- VISION MODE
  { name = nf.ai .. " VISION", pattern = "^vision%-init", order = 11 },
  { name = nf.ai .. " VISION", pattern = "^vision%-status", order = 11 },
  { name = nf.ai .. " VISION", pattern = "^vision%-adjust", order = 11 },
  { name = nf.ai .. " VISION", pattern = "^vision%-run", order = 11 },
  { name = nf.ai .. " VISION", pattern = "^vision%-dashboard", order = 11 },
  { name = nf.ai .. " VISION", pattern = "^vision%-", order = 11 },

  -- VDB (VECTOR/DATA/BRAIN)
  { name = nf.model .. " VDB", pattern = "^vdb%-execute%-next", order = 12 },
  { name = nf.model .. " VDB", pattern = "^vdb%-init", order = 12 },
  { name = nf.model .. " VDB", pattern = "^vdb%-scan", order = 12 },
  { name = nf.model .. " VDB", pattern = "^vdb%-status", order = 12 },
  { name = nf.model .. " VDB", pattern = "^vdb%-", order = 12 },

  -- HAPPY / UX FLOW
  { name = nf.primary .. " HAPPY", pattern = "^happy%-start%-cd", order = 13 },
  { name = nf.primary .. " HAPPY", pattern = "^happy%-start", order = 13 },
  { name = nf.primary .. " HAPPY", pattern = "^happy%-", order = 13 },

  -- UPDATES & MAINTENANCE
  { name = nf.reload .. " MAINTAIN", pattern = "^update%-check", order = 14 },
  { name = nf.reload .. " MAINTAIN", pattern = "^update%-smart", order = 14 },
  { name = nf.reload .. " MAINTAIN", pattern = "^update%-", order = 14 },

  -- CATCH-ALL (must be last)
  { name = nf.commands .. " OTHER", pattern = ".*", order = 99 },
}

-- Get commands directory path
local function get_commands_dir()
  local ccasp = require("ccasp")
  local cwd = vim.fn.getcwd()
  return cwd .. "/" .. ccasp.config.ccasp_root .. "/commands"
end

-- Extract frontmatter bounds from content
local function extract_frontmatter_content(content)
  local fm_start = content:find("^%-%-%-\n")
  if not fm_start then return nil end

  local fm_end = content:find("\n%-%-%-\n", 4)
  if not fm_end then return nil end

  return content:sub(4, fm_end - 1)
end

-- Parse description from frontmatter
local function parse_description(fm_content)
  local desc = fm_content:match("description:%s*([^\n]+)")
  return desc and desc:gsub("^%s+", ""):gsub("%s+$", "") or nil
end

-- Parse options from frontmatter
local function parse_options(fm_content)
  local options = {}
  if not fm_content:find("options:") then return options end

  local in_options = false
  for line in fm_content:gmatch("[^\n]+") do
    if line:match("^options:") then
      in_options = true
    elseif in_options then
      local label = line:match('label:%s*"([^"]+)"')
      if label then
        local option_desc = line:match('description:%s*"([^"]+)"')
        table.insert(options, { label = label, description = option_desc or "" })
      end
    end
  end
  return options
end

-- Parse command frontmatter
local function parse_frontmatter(content)
  local fm_content = extract_frontmatter_content(content)
  if not fm_content then return {} end

  return {
    description = parse_description(fm_content),
    options = parse_options(fm_content),
  }
end

-- Get section for a command
local function get_section(cmd_name)
  for _, section in ipairs(SECTION_PATTERNS) do
    if cmd_name:match(section.pattern) then
      return section.name, section.order
    end
  end
  return nf.commands .. " OTHER", 99
end

-- Initialize empty sections
local function init_sections()
  local sections = {}
  for _, section in ipairs(SECTION_PATTERNS) do
    if not sections[section.name] then
      sections[section.name] = { order = section.order, commands = {} }
    end
  end
  return sections
end

-- Read command file and create entry
local function load_command_file(file)
  local filename = vim.fn.fnamemodify(file, ":t:r")
  if filename:sub(1, 2) == "__" then return nil end

  local f = io.open(file, "r")
  if not f then return nil end

  local content = f:read("*all")
  f:close()

  local frontmatter = parse_frontmatter(content)
  return {
    name = filename,
    path = file,
    description = frontmatter.description or "",
    options = frontmatter.options or {},
    section = get_section(filename),
  }
end

-- Scan commands directory
function M.load_all()
  local dir = get_commands_dir()

  if vim.fn.isdirectory(dir) ~= 1 then
    commands_cache, sections_cache = {}, {}
    return commands_cache
  end

  commands_cache = {}
  sections_cache = init_sections()

  local files = vim.fn.glob(dir .. "/*.md", false, true)
  for _, file in ipairs(files) do
    local cmd = load_command_file(file)
    if cmd then
      commands_cache[cmd.name] = cmd
      if sections_cache[cmd.section] then
        table.insert(sections_cache[cmd.section].commands, cmd.name)
      end
    end
  end

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
