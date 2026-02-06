-- Plenary test for nvim-ccasp Onboarding / Getting Started system
-- Tests: module loads, state management, panel lifecycle, page navigation

local helpers = require("tests.helpers")

describe("CCASP Onboarding", function()

  it("onboarding/state.lua loads without errors", helpers.with_clean_state(function()
    local ok, state = pcall(require, "ccasp.onboarding.state")
    assert.is_true(ok, "Failed to require onboarding.state: " .. tostring(state))
    assert.is_not_nil(state.check_first_launch)
    assert.is_not_nil(state.mark_completed)
    assert.is_not_nil(state.get_state)
    assert.is_not_nil(state.save_state)
    assert.is_not_nil(state.mark_step)
  end))

  it("check_first_launch returns true on fresh state", helpers.with_clean_state(function()
    local state = require("ccasp.onboarding.state")
    -- On fresh state (no file), should return true
    local is_first = state.check_first_launch()
    assert.is_true(is_first, "Expected first launch to be true on fresh state")
  end))

  it("onboarding/init.lua loads without errors", helpers.with_clean_state(function()
    local ok, onboarding = pcall(require, "ccasp.onboarding")
    assert.is_true(ok, "Failed to require onboarding: " .. tostring(onboarding))
    assert.is_not_nil(onboarding.open_welcome)
    assert.is_not_nil(onboarding.close_welcome)
    assert.is_not_nil(onboarding.toggle_welcome)
    assert.is_not_nil(onboarding.go_to_page)
  end))

  it("onboarding/pages.lua loads all 8 pages", helpers.with_clean_state(function()
    local ok, pages = pcall(require, "ccasp.onboarding.pages")
    assert.is_true(ok, "Failed to require onboarding.pages: " .. tostring(pages))

    assert.equals(8, pages.get_total_pages(), "Expected 8 pages")

    for i = 1, 8 do
      local page = pages.get_page(i)
      assert.is_not_nil(page, "Page " .. i .. " is nil")
      assert.is_not_nil(page.title, "Page " .. i .. " has no title")
      assert.is_not_nil(page.sections, "Page " .. i .. " has no sections")
      assert.is_true(#page.sections > 0, "Page " .. i .. " has empty sections")
    end
  end))

  it("onboarding/diagrams.lua returns valid diagrams", helpers.with_clean_state(function()
    local ok, diagrams = pcall(require, "ccasp.onboarding.diagrams")
    assert.is_true(ok, "Failed to require onboarding.diagrams: " .. tostring(diagrams))

    local diagram_fns = { "logo", "layout_overview", "sidebar_diagram", "session_grid", "panel_floating" }
    for _, fn_name in ipairs(diagram_fns) do
      assert.is_not_nil(diagrams[fn_name], "Missing diagram function: " .. fn_name)
      local result = diagrams[fn_name]()
      assert.is_table(result, fn_name .. " should return a table")
      assert.is_true(#result > 0, fn_name .. " should return non-empty lines")
    end
  end))

  it("onboarding/renderer.lua loads without errors", helpers.with_clean_state(function()
    local ok, renderer = pcall(require, "ccasp.onboarding.renderer")
    assert.is_true(ok, "Failed to require onboarding.renderer: " .. tostring(renderer))
    assert.is_not_nil(renderer.render_page)
    assert.is_not_nil(renderer.center_text)
    assert.is_not_nil(renderer.wrap_text)
  end))

  it("renderer.center_text centers correctly", helpers.with_clean_state(function()
    local renderer = require("ccasp.onboarding.renderer")
    local result = renderer.center_text("hello", 20)
    -- "hello" is 5 chars, centered in 20 = 7 spaces + "hello"
    assert.equals(string.rep(" ", 7) .. "hello", result)
  end))

  it("renderer.wrap_text wraps at word boundaries", helpers.with_clean_state(function()
    local renderer = require("ccasp.onboarding.renderer")
    local result = renderer.wrap_text("hello world foo bar baz", 12)
    assert.is_table(result)
    assert.is_true(#result >= 2, "Expected multiple lines from wrapping")
    for _, line in ipairs(result) do
      assert.is_true(#line <= 12, "Line exceeds max width: " .. line)
    end
  end))

  it("state.get_progress returns percentage", helpers.with_clean_state(function()
    local state = require("ccasp.onboarding.state")
    local progress = state.get_progress()
    assert.is_number(progress)
    assert.is_true(progress >= 0 and progress <= 100)
  end))

end)
