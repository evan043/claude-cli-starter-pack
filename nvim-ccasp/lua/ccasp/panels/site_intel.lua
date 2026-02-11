-- ccasp/panels/site_intel.lua - Site Intelligence panel
-- Interactive floating panel for all site-intel features.
-- Reads last scan state for summary banner, injects slash commands into Claude session.
local M = {}
local helpers = require("ccasp.panels.helpers")

-- State
M.bufnr = nil
M.winid = nil
M.item_lines = {} -- line -> action mapping for navigation

-- Action definitions (matches menu.js MENU_ACTIONS)
M.actions = {
  -- Scan & Analyze
  { key = "1", label = "Full Site Scan",  action = "scan",        section = "scan",     duration = "2-5 min" },
  { key = "2", label = "Dev Scan (Auto)", action = "dev-scan",    section = "scan",     duration = "30-90s" },
  { key = "3", label = "Quick Check",     action = "quick-check", section = "scan",     duration = "<10s" },
  { key = "4", label = "Feature Audit",   action = "audit",       section = "scan",     duration = "20-60s" },
  -- Review & Explore
  { key = "5", label = "Recommendations", action = "recommend",   section = "review",   duration = "Instant" },
  { key = "6", label = "Open Dashboard",  action = "dashboard",   section = "review",   duration = "Instant" },
  { key = "7", label = "View Status",     action = "status",      section = "review",   duration = "Instant" },
  { key = "8", label = "View Graph",      action = "graph",       section = "review",   duration = "Instant" },
  { key = "9", label = "Drift Detection", action = "drift",       section = "review",   duration = "Instant" },
  -- Advanced
  { key = "A", label = "Page Detail",     action = "page",        section = "advanced", duration = "Instant" },
  { key = "B", label = "Semantic Search", action = "search",      section = "advanced", duration = "Instant" },
  { key = "C", label = "Contract Tests",  action = "contract",    section = "advanced", duration = "10-30s" },
}

-- ── Helpers ──────────────────────────────────────────────────────────

-- Build the slash command string for an action
local function build_command(action_name)
  local map = {
    scan        = "/site-intel scan",
    ["dev-scan"]    = "/site-intel dev-scan",
    ["quick-check"] = "/site-intel quick-check",
    audit       = "/site-intel audit",
    recommend   = "/site-intel recommend",
    dashboard   = "/site-intel dashboard",
    status      = "/site-intel status",
    graph       = "/site-intel graph",
    drift       = "/site-intel drift",
    page        = "/site-intel page",
    search      = "/site-intel search",
    contract    = "/site-intel contract",
  }
  return map[action_name] or ("/site-intel " .. action_name)
end

-- Close panel and inject slash command into Claude session
local function inject_slash_command(cmd)
  M.close()
  vim.schedule(function()
    local sessions_ok, sessions = pcall(require, "ccasp.sessions")
    if sessions_ok then
      local primary = sessions.get_primary()
      if primary and primary.bufnr and vim.api.nvim_buf_is_valid(primary.bufnr) then
        local job_id = vim.b[primary.bufnr].terminal_job_id
        if job_id and job_id > 0 then
          vim.fn.chansend(job_id, cmd .. "\n")
          return
        end
      end
    end
    vim.notify("No active Claude session to send command", vim.log.levels.WARN)
  end)
end

-- Execute an action by name
local function execute_action(action_name)
  local cmd = build_command(action_name)
  inject_slash_command(cmd)
end

-- Load site-intel state JSON from disk
local function load_site_intel_state()
  local ccasp_ok, ccasp = pcall(require, "ccasp")
  local project_root = ccasp_ok and ccasp.config and ccasp.config.project_root or vim.fn.getcwd()
  local state_path = project_root .. "/.claude/site-intel/dev-app/site-intel-state.json"

  local ok, content = pcall(vim.fn.readfile, state_path)
  if not ok or not content or #content == 0 then
    return nil
  end

  local json_str = table.concat(content, "\n")
  local decode_ok, state = pcall(vim.fn.json_decode, json_str)
  if not decode_ok or type(state) ~= "table" then
    return nil
  end

  return state
end

-- Format time elapsed since ISO date string
local function time_since(iso_date)
  if not iso_date then return "never" end
  -- Parse ISO date to epoch (approximate)
  local y, mo, d, h, mi, s = iso_date:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
  if not y then return "unknown" end
  local t = os.time({ year = tonumber(y), month = tonumber(mo), day = tonumber(d), hour = tonumber(h), min = tonumber(mi), sec = tonumber(s) })
  local diff = os.time() - t
  if diff < 60 then return diff .. "s ago" end
  if diff < 3600 then return math.floor(diff / 60) .. "m ago" end
  if diff < 86400 then return math.floor(diff / 3600) .. "h ago" end
  return math.floor(diff / 86400) .. "d ago"
end

-- ── Render ───────────────────────────────────────────────────────────

function M.render()
  local lines = {}
  M.item_lines = {}

  -- Header
  table.insert(lines, "")
  table.insert(lines, "   ╔══════════════════════════════════════════════════╗")
  table.insert(lines, "   ║          SITE INTELLIGENCE                      ║")
  table.insert(lines, "   ╚══════════════════════════════════════════════════╝")
  table.insert(lines, "")

  -- Summary Banner
  local state = load_site_intel_state()
  if state and state.lastScanTime then
    local health = state.overallHealth or {}
    local diffs = state.latestDiffs or {}
    local grade = health.grade or "N/A"
    local score = health.score or 0
    local routes = state.totalRoutes or 0
    local coverage = math.floor((health.testIdCoverage or 0) * 100)
    local impr = diffs.improvements and #diffs.improvements or 0
    local regr = diffs.regressions and #diffs.regressions or 0
    local elapsed = time_since(state.lastScanTime)
    local scan_type = state.lastScanType or "unknown"

    table.insert(lines, "  ╭──────────────────────────────────────────────────╮")
    table.insert(lines, "  │  Last Scan Summary                               │")
    table.insert(lines, "  ╰──────────────────────────────────────────────────╯")
    table.insert(lines, string.format("    Health: %d/100 (%s)  │  Routes: %d  │  TestID: %d%%", score, grade, routes, coverage))
    table.insert(lines, string.format("    Last: %s (%s)  │  Diffs: %d up, %d down", elapsed, scan_type, impr, regr))
  else
    table.insert(lines, "  ╭──────────────────────────────────────────────────╮")
    table.insert(lines, "  │  No scan data yet                                │")
    table.insert(lines, "  ╰──────────────────────────────────────────────────╯")
    table.insert(lines, "    Run a Dev Scan or Full Scan to get started")
  end
  table.insert(lines, "")

  -- Sections
  local function render_section(title, section_key)
    table.insert(lines, string.format("  ── %s %s", title, string.rep("─", math.max(0, 44 - #title))))
    table.insert(lines, "")
    for _, act in ipairs(M.actions) do
      if act.section == section_key then
        table.insert(lines, string.format("    [%s]  %-18s  (%s)", act.key, act.label, act.duration))
        M.item_lines[#lines] = { action = act.action }
      end
    end
    table.insert(lines, "")
  end

  render_section("Scan & Analyze", "scan")
  render_section("Review & Explore", "review")
  render_section("Advanced", "advanced")

  -- Footer
  table.insert(lines, "  ── Help ──────────────────────────────────────────")
  table.insert(lines, "    j/k or arrows to navigate  │  Enter to select")
  table.insert(lines, "    q or Esc to close  │  _ to minimize")
  table.insert(lines, "")

  return lines
end

-- ── Open / Close / Refresh ───────────────────────────────────────────

function M.open()
  if helpers.focus_if_open(M.winid) then
    return
  end

  M.bufnr = helpers.create_buffer("ccasp://site-intel")
  local pos = helpers.calculate_position({ width = 56, height = 42 })

  M.winid = helpers.create_window(M.bufnr, {
    width = pos.width,
    height = pos.height,
    row = pos.row,
    col = pos.col,
    border = "rounded",
    title = " Site Intelligence ",
  })

  vim.wo[M.winid].cursorline = true
  M.refresh()
  M.setup_keymaps()

  -- Move cursor to first actionable item
  if M.bufnr and vim.api.nvim_buf_is_valid(M.bufnr) then
    for line = 1, vim.api.nvim_buf_line_count(M.bufnr) do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        break
      end
    end
  end
end

function M.toggle()
  if M.winid and vim.api.nvim_win_is_valid(M.winid) then
    M.close()
  else
    M.open()
  end
end

function M.refresh()
  if not M.bufnr or not vim.api.nvim_buf_is_valid(M.bufnr) then
    return
  end
  local lines = M.render()
  helpers.set_buffer_content(M.bufnr, lines)
  M.apply_highlights()
end

-- ── Highlights ───────────────────────────────────────────────────────

function M.apply_highlights()
  local ns = helpers.prepare_highlights("ccasp_site_intel", M.bufnr)
  local lines = vim.api.nvim_buf_get_lines(M.bufnr, 0, -1, false)

  for i, line in ipairs(lines) do
    -- Header box (bright blue)
    if line:match("^   ╔") or line:match("^   ║") or line:match("^   ╚") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingTitle", i - 1, 0, -1)
    -- Card borders (section summaries)
    elseif line:match("^  ╭") or line:match("^  │") or line:match("^  ╰") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingCard", i - 1, 0, -1)
      local title_s, title_e = line:find("│  (.-)%s*│")
      if title_s and line:match("^  │") then
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingCardTitle", i - 1, title_s + 2, title_e - 2)
      end
    -- Section headers
    elseif line:match("^  ──") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingHeader", i - 1, 0, -1)
    -- Help footer (dim)
    elseif line:match("j/k or arrows") or line:match("q or Esc") then
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspMuted", i - 1, 0, -1)
    end

    -- Key bindings [x] in accent color
    for s, e in line:gmatch("()%[%w%?%]()") do
      vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspOnboardingKey", i - 1, s - 1, e - 1)
    end

    -- Duration tags (dim)
    for s, e in line:gmatch("()%(.-%)()") do
      if line:match("%[%w%]") then -- only on action lines
        vim.api.nvim_buf_add_highlight(M.bufnr, ns, "CcaspMuted", i - 1, s - 1, e - 1)
      end
    end
  end
end

-- ── Keymaps ──────────────────────────────────────────────────────────

function M.setup_keymaps()
  local opts = helpers.setup_standard_keymaps(M.bufnr, M.winid, "Site Intel", M, M.close)

  -- Letter/number shortcuts
  for _, act in ipairs(M.actions) do
    vim.keymap.set("n", act.key, function()
      execute_action(act.action)
    end, opts)
  end

  -- Enter -> execute action at cursor
  vim.keymap.set("n", "<CR>", function()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    local item = M.item_lines[cursor[1]]
    if item then
      execute_action(item.action)
    end
  end, opts)

  -- Smart j/k navigation (skip non-actionable lines)
  local function nav_down()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    local total = vim.api.nvim_buf_line_count(M.bufnr)
    for line = cursor[1] + 1, total do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        return
      end
    end
  end

  local function nav_up()
    if not M.winid or not vim.api.nvim_win_is_valid(M.winid) then return end
    local cursor = vim.api.nvim_win_get_cursor(M.winid)
    for line = cursor[1] - 1, 1, -1 do
      if M.item_lines[line] then
        vim.api.nvim_win_set_cursor(M.winid, { line, 0 })
        return
      end
    end
  end

  vim.keymap.set("n", "j", nav_down, opts)
  vim.keymap.set("n", "k", nav_up, opts)
  vim.keymap.set("n", "<Down>", nav_down, opts)
  vim.keymap.set("n", "<Up>", nav_up, opts)

  -- Refresh
  vim.keymap.set("n", "r", function()
    M.refresh()
  end, opts)

  -- Mouse click
  vim.keymap.set("n", "<LeftMouse>", function()
    local mouse = vim.fn.getmousepos()
    local line = mouse.line
    if line < 1 then return end
    pcall(vim.api.nvim_win_set_cursor, M.winid, { line, 0 })
    local item = M.item_lines[line]
    if item then
      execute_action(item.action)
    end
  end, opts)
end

-- ── Close ────────────────────────────────────────────────────────────

function M.close()
  helpers.close_panel(M)
end

return M
