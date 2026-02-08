-- Headless test: Project Config → Implementation Bridge Verification
-- Verifies: panel config at ~/.ccasp/project-config.json is correctly structured
-- so that /project-implementation-for-ccasp can consume it per Step 0.5.
--
-- Tests:
-- 1. Config schema matches what the template expects
-- 2. All feature keys map to implementation steps
-- 3. App mode values map to compliance modes
-- 4. Stub behavior: commercial disabled = stub, personal disabled = skip
-- 5. Template file actually references project-config.json
--
-- Run: nvim --headless --clean -c "lua vim.opt.rtp:prepend('nvim-ccasp')" -c "luafile nvim-ccasp/tests/project_config_bridge_test.lua" 2>&1

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

local function assert_contains(str, pattern, msg)
  if not str:find(pattern, 1, true) then
    error(string.format("%s: '%s' not found in string", msg or "assertion", pattern))
  end
end

print("=== CCASP Config Bridge Tests ===")
print("")

local storage = require("ccasp.project_config.storage")

-- ─── Schema Contract Tests ──────────────────────────────────────
-- The implementation template (Step 0.5) expects a specific JSON schema.
-- These tests verify storage.lua produces configs matching that schema.

print("--- Schema Contract ---")

test("schema: config has version field", function()
  local cfg = storage.get_default()
  assert_eq("1.0.0", cfg.version, "version")
end)

test("schema: config has app_mode field", function()
  local cfg = storage.get_default()
  assert_true(cfg.app_mode ~= nil, "app_mode should exist")
  assert_true(type(cfg.app_mode) == "string", "app_mode should be string")
end)

test("schema: config has features table", function()
  local cfg = storage.get_default()
  assert_true(type(cfg.features) == "table", "features should be table")
end)

test("schema: app_mode is one of valid values", function()
  local cfg = storage.get_default()
  local valid_modes = { commercial_saas = true, commercial_single = true, personal = true }
  assert_true(valid_modes[cfg.app_mode], "app_mode should be a valid mode: " .. cfg.app_mode)
end)

-- ─── Feature Key Completeness Tests ────────────────────────────
-- The template's Step 0.5 mapping table references these exact feature keys.
-- If a key is missing from storage.lua, the bridge breaks.

print("")
print("--- Feature Key Completeness ---")

local EXPECTED_FEATURE_KEYS = {
  "compliance",
  "multi_tenancy",
  "rbac",
  "billing",
  "api_contracts",
  "route_maps",
  "deployment",
  "agents",
  "github_integration",
  "mcp_servers",
  "phased_dev",
  "hooks",
  "mobile_packaging",
  "competitor_research",
}

test("features: all expected keys present in default config", function()
  local cfg = storage.get_default()
  for _, key in ipairs(EXPECTED_FEATURE_KEYS) do
    assert_true(cfg.features[key] ~= nil,
      "missing feature key: " .. key .. " — template Step 0.5 depends on it")
  end
end)

test("features: no unexpected extra keys", function()
  local cfg = storage.get_default()
  local expected_set = {}
  for _, k in ipairs(EXPECTED_FEATURE_KEYS) do expected_set[k] = true end

  for k, _ in pairs(cfg.features) do
    assert_true(expected_set[k],
      "unexpected feature key: " .. k .. " — add it to the Step 0.5 mapping table")
  end
end)

test("features: all default to boolean", function()
  local cfg = storage.get_default()
  for _, key in ipairs(EXPECTED_FEATURE_KEYS) do
    assert_true(type(cfg.features[key]) == "boolean",
      "feature " .. key .. " should be boolean, got " .. type(cfg.features[key]))
  end
end)

-- ─── App Mode → Compliance Mode Mapping ─────────────────────────
-- Step 1.5 maps panel app_mode to compliance modes in tech-stack.json

print("")
print("--- App Mode Mapping ---")

local APP_MODE_TO_COMPLIANCE = {
  commercial_saas = "commercial-saas",
  commercial_single = "ip-only",
  personal = "disabled",
}

test("app_mode mapping: commercial_saas → compliance mode", function()
  local mode = APP_MODE_TO_COMPLIANCE["commercial_saas"]
  assert_eq("commercial-saas", mode, "commercial_saas mapping")
end)

test("app_mode mapping: commercial_single → compliance mode", function()
  local mode = APP_MODE_TO_COMPLIANCE["commercial_single"]
  assert_eq("ip-only", mode, "commercial_single mapping")
end)

test("app_mode mapping: personal → compliance mode", function()
  local mode = APP_MODE_TO_COMPLIANCE["personal"]
  assert_eq("disabled", mode, "personal mapping")
end)

-- ─── Stub Behavior Tests ───────────────────────────────────────
-- Commercial mode: disabled features are stubbed (CCASP:STUB)
-- Personal mode: disabled features are skipped entirely

print("")
print("--- Stub Behavior ---")

-- Simulate what the implementation would do with different configs
local function get_feature_behavior(app_mode, feature_enabled)
  if not feature_enabled then
    if app_mode == "personal" then
      return "skip"
    else
      return "stub"
    end
  end
  return "enabled"
end

test("stub: commercial_saas disabled → stub", function()
  assert_eq("stub", get_feature_behavior("commercial_saas", false), "commercial disabled = stub")
end)

test("stub: commercial_saas enabled → enabled", function()
  assert_eq("enabled", get_feature_behavior("commercial_saas", true), "commercial enabled = enabled")
end)

test("stub: commercial_single disabled → stub", function()
  assert_eq("stub", get_feature_behavior("commercial_single", false), "single disabled = stub")
end)

test("stub: personal disabled → skip", function()
  assert_eq("skip", get_feature_behavior("personal", false), "personal disabled = skip")
end)

test("stub: personal enabled → enabled", function()
  assert_eq("enabled", get_feature_behavior("personal", true), "personal enabled = enabled")
end)

-- ─── Feature → Step Mapping Validation ─────────────────────────
-- Verify every feature key has a defined step mapping

print("")
print("--- Feature → Step Mapping ---")

local FEATURE_STEP_MAP = {
  compliance    = "Step 7k",
  multi_tenancy = "Step 1.6b",
  rbac          = "Step 1.6c",
  billing       = "Step 1.6",
  api_contracts = "Step 7k",
  route_maps    = "Step 7k",
  deployment    = "Step 5",
  agents        = "Step 2",
  github_integration = "Step 4",
  mcp_servers   = "Step 5",
  phased_dev    = "Step 7l",
  hooks         = "Step 2e",
  mobile_packaging = "Step 1.7",
  competitor_research = "Step 1.8",
}

test("feature→step: every feature key has a mapped step", function()
  for _, key in ipairs(EXPECTED_FEATURE_KEYS) do
    assert_true(FEATURE_STEP_MAP[key] ~= nil,
      "feature '" .. key .. "' has no step mapping — add it to the template")
  end
end)

test("feature→step: mapping covers all expected features", function()
  local count = 0
  for _ in pairs(FEATURE_STEP_MAP) do count = count + 1 end
  assert_eq(#EXPECTED_FEATURE_KEYS, count, "mapping count should match feature count")
end)

-- ─── Template File References ──────────────────────────────────
-- Verify the implementation template actually references the config file

print("")
print("--- Template References ---")

-- Find the template file
local template_paths = {
  "templates/commands/project-implementation-for-ccasp.template.md",
}

local template_content = nil
for _, path in ipairs(template_paths) do
  local full = vim.fn.getcwd() .. "/" .. path
  if vim.fn.filereadable(full) == 1 then
    local lines = vim.fn.readfile(full)
    template_content = table.concat(lines, "\n")
    break
  end
end

if template_content then
  test("template: references project-config.json", function()
    assert_contains(template_content, "project-config.json",
      "template should reference the panel config file")
  end)

  test("template: has Step 0.5 section", function()
    assert_contains(template_content, "Step 0.5",
      "template should have Step 0.5 for panel config loading")
  end)

  test("template: references panel_config in Step 1.5", function()
    assert_contains(template_content, "panel_config",
      "template should use panel_config variable")
  end)

  test("template: references CCASP:STUB behavior", function()
    assert_contains(template_content, "CCASP:STUB",
      "template should describe stub behavior for disabled features")
  end)

  test("template: has feature gates for agents step", function()
    assert_contains(template_content, "panel_config.features.agents",
      "template should gate agent generation on panel config")
  end)

  test("template: has feature gates for billing step", function()
    assert_contains(template_content, "panel_config.features.billing",
      "template should gate billing on panel config")
  end)

  test("template: has feature gates for github step", function()
    assert_contains(template_content, "panel_config.features.github_integration",
      "template should gate GitHub on panel config")
  end)

  test("template: has feature gates for compliance step", function()
    assert_contains(template_content, "panel_config.features.compliance",
      "template should gate compliance on panel config")
  end)

  test("template: has feature gates for MCP step", function()
    assert_contains(template_content, "panel_config.features.mcp_servers",
      "template should gate MCP discovery on panel config")
  end)

  test("template: has feature gates for phased dev step", function()
    assert_contains(template_content, "panel_config.features.phased_dev",
      "template should gate roadmap enforcement on panel config")
  end)
else
  print("  SKIP: Template file not found at expected path (run from project root)")
end

-- ─── End-to-End Scenario: Config Written by Panel, Readable by CLI ──

print("")
print("--- End-to-End Scenario ---")

test("e2e: panel writes config, CLI can read it", function()
  -- Use temp path
  local tmp_dir = vim.fn.tempname()
  vim.fn.mkdir(tmp_dir, "p")
  local tmp_path = tmp_dir .. "/project-config.json"

  -- Panel writes a config (simulating user interaction)
  local panel_config = {
    version = "1.0.0",
    app_mode = "commercial_saas",
    features = {
      compliance = true,
      multi_tenancy = true,
      rbac = true,
      billing = false,      -- User disabled billing
      api_contracts = true,
      route_maps = false,    -- User disabled route maps
      deployment = true,
      agents = true,
      github_integration = false,  -- User disabled GitHub
      mcp_servers = true,
      phased_dev = true,
      hooks = true,
    },
  }

  local json = vim.json.encode(panel_config)
  vim.fn.writefile({ json }, tmp_path)

  -- CLI reads the config (simulating project-implementation Step 0.5)
  local lines = vim.fn.readfile(tmp_path)
  local raw = table.concat(lines, "\n")
  local ok, loaded = pcall(vim.json.decode, raw)
  assert_true(ok, "CLI should decode the JSON written by panel")

  -- Verify the CLI gets the correct config
  assert_eq("commercial_saas", loaded.app_mode, "app_mode read correctly")
  assert_eq(true, loaded.features.compliance, "compliance read correctly")
  assert_eq(false, loaded.features.billing, "billing disabled read correctly")
  assert_eq(false, loaded.features.route_maps, "route_maps disabled read correctly")
  assert_eq(false, loaded.features.github_integration, "github disabled read correctly")
  assert_eq(true, loaded.features.agents, "agents read correctly")

  -- Verify stub behavior decisions
  assert_eq("stub", get_feature_behavior(loaded.app_mode, loaded.features.billing),
    "billing should be stubbed in commercial mode")
  assert_eq("stub", get_feature_behavior(loaded.app_mode, loaded.features.route_maps),
    "route_maps should be stubbed in commercial mode")
  assert_eq("enabled", get_feature_behavior(loaded.app_mode, loaded.features.compliance),
    "compliance should be enabled")

  -- Cleanup
  vim.fn.delete(tmp_path)
  vim.fn.delete(tmp_dir, "d")
end)

test("e2e: personal mode skips disabled features entirely", function()
  local tmp_dir = vim.fn.tempname()
  vim.fn.mkdir(tmp_dir, "p")
  local tmp_path = tmp_dir .. "/project-config.json"

  local panel_config = {
    version = "1.0.0",
    app_mode = "personal",
    features = {
      compliance = false,
      multi_tenancy = false,  -- N/A in personal
      rbac = false,
      billing = false,        -- N/A in personal
      api_contracts = false,
      route_maps = false,
      deployment = true,
      agents = true,
      github_integration = true,
      mcp_servers = true,
      phased_dev = true,
      hooks = true,
    },
  }

  local json = vim.json.encode(panel_config)
  vim.fn.writefile({ json }, tmp_path)

  local lines = vim.fn.readfile(tmp_path)
  local raw = table.concat(lines, "\n")
  local ok, loaded = pcall(vim.json.decode, raw)
  assert_true(ok, "decode should succeed")

  -- Personal mode: disabled features should be skipped, not stubbed
  assert_eq("skip", get_feature_behavior(loaded.app_mode, loaded.features.compliance),
    "compliance should be skipped in personal mode")
  assert_eq("skip", get_feature_behavior(loaded.app_mode, loaded.features.billing),
    "billing should be skipped in personal mode")
  assert_eq("enabled", get_feature_behavior(loaded.app_mode, loaded.features.deployment),
    "deployment should be enabled")

  -- Compliance mode should be "disabled" for personal
  assert_eq("disabled", APP_MODE_TO_COMPLIANCE[loaded.app_mode],
    "personal → disabled compliance mode")

  vim.fn.delete(tmp_path)
  vim.fn.delete(tmp_dir, "d")
end)

-- ─── Results ────────────────────────────────────────────────────

print("")
print(string.format("Results: %d passed, %d failed", passed, failed))
if failed > 0 then
  print("FAILED")
  vim.cmd("cquit! 1")
else
  print("ALL PASSED")
  vim.cmd("qall!")
end
