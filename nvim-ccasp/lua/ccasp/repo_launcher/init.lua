-- CCASP Repo Launcher - Public API
-- Provides quick-launch of Claude CLI sessions in specific repo directories

local M = {}

-- Open the repo launcher (path input dialog)
function M.open_launcher()
  require("ccasp.repo_launcher.ui").open_path_dialog()
end

-- Open the repo browser (library panel)
function M.open_browser()
  require("ccasp.repo_launcher.ui").open_browser()
end

-- Quick-launch most recent repo (no UI, just opens it)
function M.quick_recent()
  local storage = require("ccasp.repo_launcher.storage")
  local recent = storage.get_recent(1)
  if #recent == 0 then
    vim.notify("No recent repos in library", vim.log.levels.INFO)
    return
  end
  M.open_repo(recent[1].path)
end

-- Open a specific repo path (core action)
function M.open_repo(path)
  if vim.fn.isdirectory(path) == 0 then
    vim.notify("Directory not found: " .. path, vim.log.levels.ERROR)
    return
  end

  -- Add to library
  local storage = require("ccasp.repo_launcher.storage")
  storage.add(path)
  storage.prune()

  -- Spawn session at path
  local sessions = require("ccasp.sessions")
  sessions.spawn_at_path(path)
end

-- Open a specific repo path with Happy CLI instead of Claude
function M.open_repo_happy(path)
  if vim.fn.isdirectory(path) == 0 then
    vim.notify("Directory not found: " .. path, vim.log.levels.ERROR)
    return
  end

  -- Add to library
  local storage = require("ccasp.repo_launcher.storage")
  storage.add(path)
  storage.prune()

  -- Spawn session at path with Happy command, gold titlebar, "Happy" name
  local sessions = require("ccasp.sessions")
  local titlebar = require("ccasp.session_titlebar")
  sessions.spawn_at_path(path, {
    command = "happy",
    name = "Happy",
    color_idx = titlebar.COLOR_GOLD,
  })
end

-- Open the Happy repo picker (select repo to launch Happy session)
function M.open_happy_picker()
  require("ccasp.repo_launcher.ui").open_happy_browser()
end

-- Open a Clawdbot session (launches "openclawd tui" in H:\Clawdbot)
function M.open_repo_clawdbot()
  local path = "H:\\Clawdbot"

  if vim.fn.isdirectory(path) == 0 then
    vim.notify("Clawdbot directory not found: " .. path, vim.log.levels.ERROR)
    return
  end

  local storage = require("ccasp.repo_launcher.storage")
  storage.add(path)
  storage.prune()

  local sessions = require("ccasp.sessions")
  local titlebar = require("ccasp.session_titlebar")
  sessions.spawn_at_path(path, {
    command = "openclawd tui",
    name = "Clawdbot",
    color_idx = titlebar.COLOR_GOLD,
  })
end

return M
