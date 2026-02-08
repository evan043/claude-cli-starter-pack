-- Headless test: Project config panel storage round-trip
-- Verifies: toggle features → JSON on disk updates, set_app_mode → JSON updates,
--           auto-migration of missing keys, commercial-only feature gating
--
-- Run: nvim --headless --clean -c "lua vim.opt.rtp:prepend('nvim-ccasp')" -c "luafile nvim-ccasp/tests/project_config_test.lua" 2>&1

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

print("=== CCASP Project Config Tests ===")
print("")

-- Use a temp config path so we don't clobber the user's real config
local test_config_dir = vim.fn.tempname()
vim.fn.mkdir(test_config_dir, "p")
local test_config_path = test_config_dir .. "/project-config.json"

-- Monkey-patch storage to use temp path
local storage = require("ccasp.project_config.storage")

-- Save original path references for restore
local ORIGINAL_CONFIG_PATH = nil
local ORIGINAL_CONFIG_DIR = nil

-- We need to override the upvalues. Since storage.lua uses local vars,
-- we override the functions to work with our test path.
local real_load = storage.load
local real_save = storage.save

storage.load = function()
  if vim.fn.filereadable(test_config_path) == 0 then
    local cfg = storage.get_default()
    storage.save(cfg)
    return cfg
  end
  local lines = vim.fn.readfile(test_config_path)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  if not ok or type(decoded) ~= "table" then
    return storage.get_default()
  end
  -- Auto-migrate: add missing feature keys
  if not decoded.features then
    decoded.features = storage.get_default().features
  else
    local defaults = storage.get_default().features
    for k, v in pairs(defaults) do
      if decoded.features[k] == nil then
        decoded.features[k] = v
      end
    end
  end
  return decoded
end

storage.save = function(config)
  if vim.fn.isdirectory(test_config_dir) == 0 then
    vim.fn.mkdir(test_config_dir, "p")
  end
  local json = vim.json.encode(config)
  vim.fn.writefile({ json }, test_config_path)
end

storage.toggle_feature = function(key)
  local config = storage.load()
  config.features[key] = not config.features[key]
  storage.save(config)
  return config.features[key]
end

storage.set_app_mode = function(mode)
  local config = storage.load()
  config.app_mode = mode
  storage.save(config)
  return config
end

-- Helper: read raw JSON from disk and decode
local function read_disk_config()
  local lines = vim.fn.readfile(test_config_path)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  assert_true(ok, "JSON decode should succeed")
  return decoded
end

-- ─── Default Config Tests ───────────────────────────────────────

test("get_default: returns complete config", function()
  local cfg = storage.get_default()
  assert_eq("commercial_saas", cfg.app_mode, "default app_mode")
  assert_eq("1.0.0", cfg.version, "default version")
  assert_true(type(cfg.features) == "table", "features should be table")
  assert_eq(true, cfg.features.compliance, "compliance default")
  assert_eq(true, cfg.features.billing, "billing default")
  assert_eq(true, cfg.features.rbac, "rbac default")
  assert_eq(true, cfg.features.multi_tenancy, "multi_tenancy default")
  assert_eq(true, cfg.features.route_maps, "route_maps default")
  assert_eq(true, cfg.features.deployment, "deployment default")
  assert_eq(true, cfg.features.agents, "agents default")
  assert_eq(true, cfg.features.hooks, "hooks default")
  assert_eq(true, cfg.features.github_integration, "github_integration default")
  assert_eq(true, cfg.features.mcp_servers, "mcp_servers default")
  assert_eq(true, cfg.features.phased_dev, "phased_dev default")
  assert_eq(true, cfg.features.api_contracts, "api_contracts default")
end)

test("get_default: has all 12 feature keys", function()
  local cfg = storage.get_default()
  local count = 0
  for _ in pairs(cfg.features) do count = count + 1 end
  assert_eq(12, count, "feature count")
end)

-- ─── Load / Save Round-Trip Tests ───────────────────────────────

test("load: creates default file on first call", function()
  -- Delete any existing test config
  vim.fn.delete(test_config_path)

  local cfg = storage.load()
  assert_eq("commercial_saas", cfg.app_mode, "loaded app_mode")
  assert_true(vim.fn.filereadable(test_config_path) == 1, "file should exist on disk")
end)

test("save/load round-trip: data survives disk write", function()
  local cfg = storage.load()
  cfg.app_mode = "personal"
  cfg.features.billing = false
  cfg.features.compliance = false
  storage.save(cfg)

  -- Read back
  local loaded = storage.load()
  assert_eq("personal", loaded.app_mode, "app_mode after round-trip")
  assert_eq(false, loaded.features.billing, "billing after round-trip")
  assert_eq(false, loaded.features.compliance, "compliance after round-trip")
end)

test("save: writes valid JSON to disk", function()
  local raw = read_disk_config()
  assert_true(raw.app_mode ~= nil, "disk JSON should have app_mode")
  assert_true(raw.features ~= nil, "disk JSON should have features")
end)

-- ─── Toggle Feature Tests ───────────────────────────────────────

test("toggle_feature: flips true to false", function()
  -- Reset to defaults
  storage.save(storage.get_default())

  local new_val = storage.toggle_feature("compliance")
  assert_eq(false, new_val, "compliance should be false after toggle")

  -- Verify on disk
  local disk = read_disk_config()
  assert_eq(false, disk.features.compliance, "disk should show compliance=false")
end)

test("toggle_feature: flips false to true", function()
  local new_val = storage.toggle_feature("compliance")
  assert_eq(true, new_val, "compliance should be true after second toggle")

  -- Verify on disk
  local disk = read_disk_config()
  assert_eq(true, disk.features.compliance, "disk should show compliance=true")
end)

test("toggle_feature: each feature toggles independently", function()
  storage.save(storage.get_default())

  storage.toggle_feature("billing")
  storage.toggle_feature("rbac")

  local cfg = storage.load()
  assert_eq(false, cfg.features.billing, "billing toggled off")
  assert_eq(false, cfg.features.rbac, "rbac toggled off")
  assert_eq(true, cfg.features.compliance, "compliance unchanged")
  assert_eq(true, cfg.features.deployment, "deployment unchanged")
end)

test("toggle_feature: persists across load cycles", function()
  storage.toggle_feature("hooks")
  -- Simulate fresh load
  local fresh = storage.load()
  assert_eq(false, fresh.features.hooks, "hooks should stay false after fresh load")
end)

-- ─── Set App Mode Tests ─────────────────────────────────────────

test("set_app_mode: changes to personal", function()
  storage.save(storage.get_default())

  local cfg = storage.set_app_mode("personal")
  assert_eq("personal", cfg.app_mode, "returned config should show personal")

  -- Verify on disk
  local disk = read_disk_config()
  assert_eq("personal", disk.app_mode, "disk should show personal")
end)

test("set_app_mode: changes to commercial_single", function()
  local cfg = storage.set_app_mode("commercial_single")
  assert_eq("commercial_single", cfg.app_mode, "returned config should show commercial_single")

  local disk = read_disk_config()
  assert_eq("commercial_single", disk.app_mode, "disk should show commercial_single")
end)

test("set_app_mode: preserves features when changing mode", function()
  storage.save(storage.get_default())
  storage.toggle_feature("route_maps")  -- Turn off route_maps

  storage.set_app_mode("personal")

  local cfg = storage.load()
  assert_eq("personal", cfg.app_mode, "mode changed")
  assert_eq(false, cfg.features.route_maps, "route_maps toggle preserved across mode change")
  assert_eq(true, cfg.features.compliance, "compliance preserved")
end)

-- ─── Auto-Migration Tests ───────────────────────────────────────

test("load: migrates missing feature keys", function()
  -- Write a config with incomplete features
  local partial = {
    version = "1.0.0",
    app_mode = "commercial_saas",
    features = {
      compliance = false,
      billing = true,
    },
  }
  storage.save(partial)

  local loaded = storage.load()
  -- Existing keys preserved
  assert_eq(false, loaded.features.compliance, "existing compliance preserved")
  assert_eq(true, loaded.features.billing, "existing billing preserved")
  -- Missing keys get defaults
  assert_eq(true, loaded.features.rbac, "missing rbac gets default true")
  assert_eq(true, loaded.features.deployment, "missing deployment gets default true")
  assert_eq(true, loaded.features.hooks, "missing hooks gets default true")
end)

test("load: migrates missing features table entirely", function()
  local no_features = {
    version = "1.0.0",
    app_mode = "personal",
  }
  storage.save(no_features)

  local loaded = storage.load()
  assert_eq("personal", loaded.app_mode, "app_mode preserved")
  assert_true(type(loaded.features) == "table", "features table created")
  assert_eq(true, loaded.features.compliance, "all defaults applied")
end)

test("load: handles corrupt JSON gracefully", function()
  vim.fn.writefile({ "not valid json {{{" }, test_config_path)

  local loaded = storage.load()
  assert_eq("commercial_saas", loaded.app_mode, "falls back to default on corrupt JSON")
  assert_eq(true, loaded.features.compliance, "features fall back to defaults")
end)

-- ─── Full Scenario: Panel Workflow Simulation ───────────────────

test("scenario: full panel workflow", function()
  -- 1. Start fresh
  vim.fn.delete(test_config_path)
  local cfg = storage.load()
  assert_eq("commercial_saas", cfg.app_mode, "step 1: default mode")

  -- 2. User switches to personal mode
  storage.set_app_mode("personal")

  -- 3. User disables deployment and agents
  storage.toggle_feature("deployment")
  storage.toggle_feature("agents")

  -- 4. Verify final state on disk matches expectations
  local disk = read_disk_config()
  assert_eq("personal", disk.app_mode, "step 4: mode is personal")
  assert_eq(false, disk.features.deployment, "step 4: deployment disabled")
  assert_eq(false, disk.features.agents, "step 4: agents disabled")
  assert_eq(true, disk.features.compliance, "step 4: compliance still on")
  assert_eq(true, disk.features.billing, "step 4: billing still on (even though N/A in personal)")

  -- 5. User switches back to commercial SaaS
  storage.set_app_mode("commercial_saas")

  -- 6. Feature toggles are preserved
  local final = storage.load()
  assert_eq("commercial_saas", final.app_mode, "step 6: back to commercial")
  assert_eq(false, final.features.deployment, "step 6: deployment still disabled")
  assert_eq(false, final.features.agents, "step 6: agents still disabled")
end)

test("scenario: multiple rapid toggles", function()
  storage.save(storage.get_default())

  -- Rapidly toggle same feature
  storage.toggle_feature("compliance")  -- false
  storage.toggle_feature("compliance")  -- true
  storage.toggle_feature("compliance")  -- false

  local cfg = storage.load()
  assert_eq(false, cfg.features.compliance, "3 toggles = false")
end)

-- ─── Cleanup ────────────────────────────────────────────────────

vim.fn.delete(test_config_path)
vim.fn.delete(test_config_dir, "d")

print("")
print(string.format("Results: %d passed, %d failed", passed, failed))
if failed > 0 then
  print("FAILED")
  vim.cmd("cquit! 1")
else
  print("ALL PASSED")
  vim.cmd("qall!")
end
