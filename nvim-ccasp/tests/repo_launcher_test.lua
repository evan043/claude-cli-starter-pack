-- Headless test: Repo launcher and spawn_at_path functionality
-- Run: nvim --headless --clean -c "lua vim.opt.rtp:prepend('nvim-ccasp')" -c "luafile nvim-ccasp/tests/repo_launcher_test.lua" 2>&1

local passed, failed = 0, 0

local function test(name, fn)
  local ok, err = pcall(fn)
  if ok then
    passed = passed + 1
    print("  PASS: " .. name)
  else
    failed = failed + 1
    print("  FAIL: " .. name .. " — " .. tostring(err))
  end
end

local function assert_eq(expected, actual, msg)
  if expected ~= actual then
    error(string.format("%s: expected %s, got %s", msg or "assertion", tostring(expected), tostring(actual)))
  end
end

local function assert_true(val, msg)
  if not val then error(msg or "expected true") end
end

print("=== CCASP Repo Launcher Tests ===")
print("")

-- Setup
local ccasp = require("ccasp")
ccasp.setup({ layout = "appshell" })

-- Pre-load repo_launcher at top level (Neovim's rtp-based loader works here)
local repo_launcher = require("ccasp.repo_launcher")
pcall(ccasp.open)
vim.wait(1500, function() return false end)

local sessions = require("ccasp.sessions")

-- Use a temp directory as "repo"
local test_repo = vim.fn.tempname()
vim.fn.mkdir(test_repo, "p")
local test_repo2 = vim.fn.tempname()
vim.fn.mkdir(test_repo2, "p")

print("Test repo 1: " .. test_repo)
print("Test repo 2: " .. test_repo2)
print("")

-- ─── Storage Tests ───────────────────────────────────────────────

test("storage: load creates empty library", function()
  local storage = require("ccasp.repo_launcher.storage")
  local lib = storage.load()
  assert_true(type(lib) == "table", "library should be a table")
  assert_true(type(lib.repos) == "table", "repos should be a table")
end)

test("storage: add repo works", function()
  local storage = require("ccasp.repo_launcher.storage")
  local repo = storage.add(test_repo)
  assert_true(repo ~= nil, "add should return repo entry")
  assert_eq(test_repo, repo.path, "repo path")
  assert_true(repo.name ~= nil and repo.name ~= "", "repo should have a name")
end)

test("storage: get_recent returns added repo", function()
  local storage = require("ccasp.repo_launcher.storage")
  local recent = storage.get_recent(5)
  assert_true(#recent >= 1, "should have at least 1 recent repo")
  local found = false
  for _, r in ipairs(recent) do
    if r.path == test_repo then found = true; break end
  end
  assert_true(found, "test repo should be in recent list")
end)

test("storage: search finds repo by name", function()
  local storage = require("ccasp.repo_launcher.storage")
  local repo_name = vim.fn.fnamemodify(test_repo, ":t")
  local results = storage.search(repo_name)
  assert_true(#results >= 1, "search should find at least 1 result")
end)

-- ─── spawn_at_path Tests ─────────────────────────────────────────

test("spawn_at_path: initial session count is 1", function()
  assert_eq(1, sessions.count(), "session count before spawn_at_path")
end)

test("spawn_at_path: spawns session at repo", function()
  local id = sessions.spawn_at_path(test_repo)
  vim.wait(1000, function() return false end)
  assert_true(id ~= nil, "spawn_at_path should return a session ID")
  assert_eq(2, sessions.count(), "session count after spawn_at_path")
end)

test("spawn_at_path: session has correct name", function()
  local all = sessions.list()
  local repo_name = vim.fn.fnamemodify(test_repo, ":t")
  local found = false
  for _, s in ipairs(all) do
    if s.name == repo_name then found = true; break end
  end
  assert_true(found, "session name should match repo directory name: " .. repo_name)
end)

test("spawn_at_path: second repo creates third session", function()
  local id = sessions.spawn_at_path(test_repo2)
  vim.wait(1000, function() return false end)
  assert_true(id ~= nil, "spawn_at_path should return a session ID")
  assert_eq(3, sessions.count(), "session count after second spawn_at_path")
end)

test("spawn_at_path: invalid path returns nil", function()
  local id = sessions.spawn_at_path("/nonexistent/path/that/should/not/exist")
  assert_true(id == nil, "spawn_at_path with invalid path should return nil")
end)

-- ─── open_repo Tests ─────────────────────────────────────────────

test("open_repo: adds to library and spawns session", function()
  local test_repo3 = vim.fn.tempname()
  vim.fn.mkdir(test_repo3, "p")

  local count_before = sessions.count()
  repo_launcher.open_repo(test_repo3)
  vim.wait(1000, function() return false end)

  assert_eq(count_before + 1, sessions.count(), "session count after open_repo")

  -- Verify it was added to storage
  local storage = require("ccasp.repo_launcher.storage")
  local recent = storage.get_recent(20)
  local found = false
  for _, r in ipairs(recent) do
    if r.path == test_repo3 then found = true; break end
  end
  assert_true(found, "repo should be in storage after open_repo")

  -- Cleanup
  vim.fn.delete(test_repo3, "d")
end)

-- ─── Cleanup ─────────────────────────────────────────────────────

vim.fn.delete(test_repo, "d")
vim.fn.delete(test_repo2, "d")

print("")
print(string.format("Results: %d passed, %d failed", passed, failed))
if failed > 0 then
  print("FAILED")
  vim.cmd("cquit! 1")
else
  print("ALL PASSED")
  vim.cmd("qall!")
end
