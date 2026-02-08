-- Headless test: Layout templates storage, save, apply, rename, delete, default
-- Run: nvim --headless --clean -c "lua vim.opt.rtp:prepend('nvim-ccasp')" -c "luafile nvim-ccasp/tests/layout_templates_test.lua" 2>&1

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

print("=== CCASP Layout Templates Tests ===")
print("")

-- Setup
local ccasp = require("ccasp")
ccasp.setup({ layout = "appshell" })

-- Pre-load modules at top level
local layout_templates = require("ccasp.layout_templates")
local storage = require("ccasp.layout_templates.storage")

pcall(ccasp.open)
vim.wait(1500, function() return false end)

local sessions = require("ccasp.sessions")
local layers = require("ccasp.layers")
local titlebar = require("ccasp.session_titlebar")

-- Use temp directories as repos
local test_dir1 = vim.fn.tempname()
vim.fn.mkdir(test_dir1, "p")
local test_dir2 = vim.fn.tempname()
vim.fn.mkdir(test_dir2, "p")
local test_dir3 = vim.fn.tempname()
vim.fn.mkdir(test_dir3, "p")

print("Test dirs: " .. test_dir1)
print("           " .. test_dir2)
print("           " .. test_dir3)
print("")

-- ─── Storage Tests ───────────────────────────────────────────────

test("storage: load creates empty library", function()
  local lib = storage.load()
  assert_true(type(lib) == "table", "library should be a table")
  assert_true(type(lib.templates) == "table", "templates should be a table")
end)

test("storage: find_template returns nil for missing", function()
  local lib = storage.load()
  local idx, tmpl = storage.find_template(lib, "nonexistent")
  assert_true(idx == nil, "idx should be nil")
  assert_true(tmpl == nil, "tmpl should be nil")
end)

test("storage: now returns ISO 8601", function()
  local ts = storage.now()
  assert_true(ts:match("^%d%d%d%d%-%d%d%-%d%dT"), "should be ISO 8601: " .. ts)
end)

-- ─── Save Current Tests ─────────────────────────────────────────

test("save_current: empty name fails", function()
  local ok, err = layout_templates.save_current("")
  assert_true(not ok, "should fail")
  assert_true(err:match("empty"), "error should mention empty: " .. tostring(err))
end)

test("save_current: saves current workspace", function()
  local ok, result = layout_templates.save_current("Test Layout")
  assert_true(ok, "save should succeed: " .. tostring(result))
  assert_true(type(result) == "table", "should return template table")
  assert_eq("Test Layout", result.name, "template name")
  assert_true(#result.layers > 0, "should have at least 1 layer")
end)

test("save_current: duplicate name fails", function()
  local ok, err = layout_templates.save_current("Test Layout")
  assert_true(not ok, "should fail for duplicate")
  assert_true(err:match("already exists"), "error should mention exists: " .. tostring(err))
end)

-- ─── List Tests ─────────────────────────────────────────────────

test("list: returns saved templates", function()
  local all = layout_templates.list()
  assert_true(#all >= 1, "should have at least 1 template")
  assert_eq("Test Layout", all[1].name, "template name")
  assert_true(all[1].layer_count > 0, "should report layer count")
  assert_true(all[1].session_count > 0, "should report session count")
end)

-- ─── Rename Tests ────────────────────────────────────────────────

test("rename: renames template", function()
  local ok = layout_templates.rename("Test Layout", "Renamed Layout")
  assert_true(ok, "rename should succeed")

  local all = layout_templates.list()
  local found = false
  for _, t in ipairs(all) do
    if t.name == "Renamed Layout" then found = true end
  end
  assert_true(found, "renamed template should be in list")
end)

test("rename: duplicate name fails", function()
  -- Save another template first
  sessions.spawn_at_path(test_dir1)
  vim.wait(500, function() return false end)
  layout_templates.save_current("Second Layout")

  local ok, err = layout_templates.rename("Second Layout", "Renamed Layout")
  assert_true(not ok, "should fail for duplicate name")
  assert_true(err:match("already exists"), "error: " .. tostring(err))
end)

-- ─── Default Tests ──────────────────────────────────────────────

test("get_default: returns nil when no default", function()
  local d = layout_templates.get_default()
  assert_true(d == nil, "no default should be set yet")
end)

test("set_default: sets default template", function()
  local ok = layout_templates.set_default("Renamed Layout")
  assert_true(ok, "set_default should succeed")

  local d = layout_templates.get_default()
  assert_true(d ~= nil, "default should be set")
  assert_eq("Renamed Layout", d.name, "default name")
end)

test("set_default: clears previous default", function()
  layout_templates.set_default("Second Layout")
  local d = layout_templates.get_default()
  assert_eq("Second Layout", d.name, "default should be Second Layout")

  -- Check that Renamed Layout is no longer default
  local all = layout_templates.list()
  for _, t in ipairs(all) do
    if t.name == "Renamed Layout" then
      assert_true(not t.is_default, "Renamed Layout should not be default")
    end
  end
end)

test("clear_default: removes all defaults", function()
  layout_templates.clear_default()
  local d = layout_templates.get_default()
  assert_true(d == nil, "no default after clear")
end)

-- ─── Delete Tests ───────────────────────────────────────────────

test("delete: removes template", function()
  local ok = layout_templates.delete("Second Layout")
  assert_true(ok, "delete should succeed")

  local all = layout_templates.list()
  for _, t in ipairs(all) do
    if t.name == "Second Layout" then
      error("deleted template should not be in list")
    end
  end
end)

test("delete: nonexistent fails", function()
  local ok, err = layout_templates.delete("Nonexistent")
  assert_true(not ok, "should fail")
  assert_true(err:match("not found"), "error: " .. tostring(err))
end)

-- ─── Apply Tests ────────────────────────────────────────────────

test("apply: nonexistent template fails", function()
  local ok, err = layout_templates.apply("Nonexistent")
  assert_true(not ok, "should fail")
  assert_true(err:match("not found"), "error: " .. tostring(err))
end)

-- Save a multi-session template for apply testing
test("save a multi-session template for apply test", function()
  -- Create sessions at test directories
  sessions.spawn_at_path(test_dir2)
  vim.wait(500, function() return false end)
  sessions.spawn_at_path(test_dir3)
  vim.wait(500, function() return false end)

  local count = sessions.count()
  assert_true(count >= 3, "should have 3+ sessions, got: " .. count)

  local ok, result = layout_templates.save_current("Multi Session")
  assert_true(ok, "save multi-session should succeed: " .. tostring(result))
end)

test("apply: recreates workspace from template", function()
  -- Remember current session count
  local before = sessions.count()

  -- Apply the renamed layout (single session)
  local ok, err = layout_templates.apply("Renamed Layout")
  assert_true(ok, "apply should succeed: " .. tostring(err))

  -- Give it time to stabilize
  vim.wait(1000, function() return false end)

  -- Should have sessions running
  local after = sessions.count()
  assert_true(after >= 1, "should have at least 1 session after apply, got: " .. after)
end)

-- ─── set_name / set_color Tests ────────────────────────────────

test("sessions.set_name: changes session name", function()
  local all = sessions.list()
  assert_true(#all > 0, "should have sessions")
  local id = all[1].id
  sessions.set_name(id, "Custom Name")
  local session = sessions.get(id)
  assert_eq("Custom Name", session.name, "session name after set_name")
end)

test("titlebar.set_color: changes session color", function()
  local all = sessions.list()
  assert_true(#all > 0, "should have sessions")
  local id = all[1].id
  -- Just verify it doesn't error
  local ok, err = pcall(titlebar.set_color, id, 3)
  assert_true(ok, "set_color should not error: " .. tostring(err))
end)

-- ─── Cleanup ────────────────────────────────────────────────────

-- Clean up test templates
layout_templates.delete("Renamed Layout")
layout_templates.delete("Multi Session")

vim.fn.delete(test_dir1, "d")
vim.fn.delete(test_dir2, "d")
vim.fn.delete(test_dir3, "d")

print("")
print(string.format("Results: %d passed, %d failed", passed, failed))
if failed > 0 then
  print("FAILED")
  vim.cmd("cquit! 1")
else
  print("ALL PASSED")
  vim.cmd("qall!")
end
