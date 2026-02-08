-- Headless test: Layer switch should NOT create extra windows
-- Run: nvim --headless --clean -c "lua vim.opt.rtp:prepend('nvim-ccasp')" -c "luafile nvim-ccasp/tests/layer_switch_test.lua" 2>&1
--
-- Verifies that switching to a new (empty) layer and back does not
-- leave ghost windows that split the content area in half.

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

-- Count non-spacer, non-float windows (content windows)
local function count_content_windows()
  local content_ok, content = pcall(require, "ccasp.appshell.content")
  local count = 0
  for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    if vim.api.nvim_win_is_valid(win) then
      local cfg = vim.api.nvim_win_get_config(win)
      local is_float = cfg.relative and cfg.relative ~= ""
      local is_spacer = content_ok and content.is_spacer_win and content.is_spacer_win(win)
      if not is_float and not is_spacer then
        count = count + 1
      end
    end
  end
  return count
end

print("=== CCASP Layer Switch Tests ===")
print("")

-- Setup
local ccasp = require("ccasp")
ccasp.setup({ layout = "appshell" })

-- Open appshell (creates first session + spacers + floats)
pcall(ccasp.open)
vim.wait(1500, function() return false end)

local sessions = require("ccasp.sessions")
local layers = require("ccasp.layers")

test("initial state: 1 content window (terminal session)", function()
  local cw = count_content_windows()
  assert_eq(1, cw, "content windows after open")
end)

test("initial state: 1 session", function()
  assert_eq(1, sessions.count(), "session count after open")
end)

test("initial state: layer 1 active", function()
  assert_eq(1, layers.get_active(), "active layer")
end)

-- Switch to a new empty layer
test("switch to layer 2 (new, empty) creates 1 content window", function()
  layers.switch_to(2)
  vim.wait(1000, function() return false end)
  local cw = count_content_windows()
  assert_eq(1, cw, "content windows after switch to empty layer 2")
end)

test("layer 2 has 1 session after switch", function()
  assert_eq(1, sessions.count(), "session count on layer 2")
end)

test("layer 2 is now active", function()
  assert_eq(2, layers.get_active(), "active layer after switch")
end)

-- Switch back to layer 1 (has 1 session from snapshot)
test("switch back to layer 1 restores 1 content window", function()
  layers.switch_to(1)
  vim.wait(1000, function() return false end)
  local cw = count_content_windows()
  assert_eq(1, cw, "content windows after switch back to layer 1")
end)

test("layer 1 has 1 session after switch back", function()
  assert_eq(1, sessions.count(), "session count on layer 1")
end)

-- Switch to layer 2 again (now has 1 session from snapshot)
test("switch to layer 2 again restores 1 content window", function()
  layers.switch_to(2)
  vim.wait(1000, function() return false end)
  local cw = count_content_windows()
  assert_eq(1, cw, "content windows after second switch to layer 2")
end)

-- Switch to layer 3 (new, empty)
test("switch to layer 3 (new, empty) creates 1 content window", function()
  layers.switch_to(3)
  vim.wait(1000, function() return false end)
  local cw = count_content_windows()
  assert_eq(1, cw, "content windows after switch to empty layer 3")
end)

print("")
print(string.format("Results: %d passed, %d failed", passed, failed))
if failed > 0 then
  print("FAILED")
  vim.cmd("cquit! 1")
else
  print("ALL PASSED")
  vim.cmd("qall!")
end
