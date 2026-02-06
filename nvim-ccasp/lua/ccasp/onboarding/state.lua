-- ccasp/onboarding/state.lua - Onboarding state management
-- Tracks first-launch detection, page progress, and step completion
-- Persists to ccasp-state.json via config.lua JSON read/write

local M = {}

local config = require("ccasp.config")

-- State key in ccasp-state.json
local STATE_KEY = "onboarding"

-- Default onboarding state
local defaults = {
  first_launch_completed = false,
  last_page_viewed = 1,
  steps_completed = {},
  help_opened_count = 0,
  version_seen = nil,
}

-- Load onboarding state from ccasp-state.json
function M.get_state()
  local state = config.load_state()
  local onboarding = state[STATE_KEY]
  if not onboarding then
    return vim.tbl_deep_extend("force", {}, defaults)
  end
  return vim.tbl_deep_extend("force", {}, defaults, onboarding)
end

-- Save onboarding state to ccasp-state.json
function M.save_state(onboarding_state)
  local path = config.get_path("state")
  if not path then
    return false
  end

  local state = config.load_state()
  state[STATE_KEY] = onboarding_state

  local ok, err = config.write_json(path, state)
  if not ok then
    vim.notify("CCASP: Failed to save onboarding state: " .. tostring(err), vim.log.levels.WARN)
    return false
  end
  return true
end

-- Check if this is the first launch (onboarding not yet completed)
function M.check_first_launch()
  local state = M.get_state()
  return not state.first_launch_completed
end

-- Mark onboarding as completed
function M.mark_completed()
  local state = M.get_state()
  state.first_launch_completed = true
  local ccasp = require("ccasp")
  state.version_seen = ccasp.version
  return M.save_state(state)
end

-- Mark a specific step/page as completed
function M.mark_step(step_id)
  local state = M.get_state()
  if not vim.tbl_contains(state.steps_completed, step_id) then
    table.insert(state.steps_completed, step_id)
  end
  return M.save_state(state)
end

-- Check if a specific step has been completed
function M.is_step_completed(step_id)
  local state = M.get_state()
  return vim.tbl_contains(state.steps_completed, step_id)
end

-- Update the last page viewed
function M.set_last_page(page_num)
  local state = M.get_state()
  state.last_page_viewed = page_num
  return M.save_state(state)
end

-- Get the last page viewed
function M.get_last_page()
  local state = M.get_state()
  return state.last_page_viewed or 1
end

-- Increment help opened count
function M.increment_help_count()
  local state = M.get_state()
  state.help_opened_count = (state.help_opened_count or 0) + 1
  return M.save_state(state)
end

-- Get completion progress (percentage)
function M.get_progress()
  local state = M.get_state()
  local total_steps = 8 -- Total onboarding pages
  local completed = #(state.steps_completed or {})
  return math.floor((completed / total_steps) * 100)
end

return M
