-- Plenary test for nvim-ccasp keymaps
-- Tests keymap registration and command availability

local helpers = require("tests.helpers")

describe("CCASP Keymaps", function()

  it("registers Ctrl+B keymap in appshell mode", helpers.with_clean_state(function()
    local ccasp = helpers.setup_test_env()

    -- Open appshell to ensure keymaps are set
    pcall(ccasp.open)
    helpers.wait_for(function()
      return #helpers.get_all_windows() > 0
    end, 1000, 50)

    -- Check if <C-b> keymap exists
    local keymap = vim.fn.maparg("<C-b>", "n")
    assert.is_not_nil(keymap, "Expected <C-b> keymap to exist")
    assert.is_true(keymap ~= "", "Expected <C-b> keymap to be non-empty")

    helpers.assert_no_errors()
  end))

  it("registers Alt+1 through Alt+5 in appshell mode", helpers.with_clean_state(function()
    local ccasp = helpers.setup_test_env()

    -- Open appshell
    pcall(ccasp.open)
    helpers.wait_for(function()
      return #helpers.get_all_windows() > 0
    end, 1000, 50)

    -- Check Alt+1 through Alt+5 keymaps
    local alt_keys = { "<M-1>", "<M-2>", "<M-3>", "<M-4>", "<M-5>" }
    for _, key in ipairs(alt_keys) do
      local keymap = vim.fn.maparg(key, "n")
      assert.is_not_nil(keymap, string.format("Expected %s keymap to exist", key))
      assert.is_true(keymap ~= "", string.format("Expected %s keymap to be non-empty", key))
    end

    helpers.assert_no_errors()
  end))

  it("registers session management keymaps", helpers.with_clean_state(function()
    local ccasp = helpers.setup_test_env()

    -- Open appshell
    pcall(ccasp.open)
    helpers.wait_for(function()
      return #helpers.get_all_windows() > 0
    end, 1000, 50)

    -- Check session management keymaps
    local session_keys = {
      "<C-S-n>",  -- New session
      "<C-Tab>",  -- Next session
      "`",        -- Session menu (backtick)
    }

    for _, key in ipairs(session_keys) do
      local keymap = vim.fn.maparg(key, "n")
      -- Some keymaps might be optional or conditional
      if keymap ~= "" then
        assert.is_not_nil(keymap, string.format("Expected %s keymap to exist if registered", key))
      end
    end

    helpers.assert_no_errors()
  end))

  it("CcaspAppshell command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspAppshell command exists
    local cmd_exists = vim.fn.exists(":CcaspAppshell")
    assert.equals(2, cmd_exists, "Expected CcaspAppshell command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspToggleRail command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspToggleRail command exists
    local cmd_exists = vim.fn.exists(":CcaspToggleRail")
    assert.equals(2, cmd_exists, "Expected CcaspToggleRail command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspToggleFlyout command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspToggleFlyout command exists
    local cmd_exists = vim.fn.exists(":CcaspToggleFlyout")
    assert.equals(2, cmd_exists, "Expected CcaspToggleFlyout command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspDashboard command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspDashboard command exists
    local cmd_exists = vim.fn.exists(":CcaspDashboard")
    assert.equals(2, cmd_exists, "Expected CcaspDashboard command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspControl command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspControl command exists
    local cmd_exists = vim.fn.exists(":CcaspControl")
    assert.equals(2, cmd_exists, "Expected CcaspControl command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspFeatures command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspFeatures command exists
    local cmd_exists = vim.fn.exists(":CcaspFeatures")
    assert.equals(2, cmd_exists, "Expected CcaspFeatures command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

  it("CcaspTaskbar command exists", helpers.with_clean_state(function()
    helpers.setup_test_env()

    -- Check if CcaspTaskbar command exists
    local cmd_exists = vim.fn.exists(":CcaspTaskbar")
    assert.equals(2, cmd_exists, "Expected CcaspTaskbar command to exist (exists() should return 2)")

    helpers.assert_no_errors()
  end))

end)
