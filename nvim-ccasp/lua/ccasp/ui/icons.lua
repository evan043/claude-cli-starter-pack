-- CCASP Nerd Font Icon Definitions
-- Centralized icon module - requires a Nerd Font in terminal
-- No plugin dependency (raw codepoints)

local M = {}

-- Navigation / Tabs
M.search      = ""    -- nf-fa-search
M.commands    = ""    -- nf-oct-terminal
M.settings    = ""    -- nf-fa-cog
M.shield      = "󰒃"    -- nf-md-shield_check
M.status      = ""    -- nf-fa-heartbeat
M.keyboard    = ""    -- nf-fa-keyboard_o
M.assets      = ""    -- nf-fa-cubes
M.shortcuts   = "󰌌"    -- nf-md-keyboard
M.dashboard   = ""    -- nf-fa-th_large
M.hooks       = "󰛢"    -- nf-md-hook
M.features    = ""    -- nf-fa-puzzle_piece

-- Modes / Permissions
M.auto        = "󰁪"    -- nf-md-robot
M.plan        = "󰏫"    -- nf-md-note_text
M.ask         = ""    -- nf-fa-question_circle

-- Status indicators
M.sync_ok     = ""    -- nf-fa-check_circle
M.sync_warn   = ""    -- nf-fa-warning
M.update_auto = "󰑐"    -- nf-md-refresh
M.update_man  = ""    -- nf-fa-hand_paper_o
M.update_prompt = ""  -- nf-fa-comment_o

-- Feature toggles
M.enabled     = ""    -- nf-fa-toggle_on
M.disabled    = ""    -- nf-fa-toggle_off
M.running     = ""    -- nf-fa-play
M.stopped     = ""    -- nf-fa-stop
M.failed      = ""    -- nf-fa-times_circle
M.model       = "󰘦"    -- nf-md-brain
M.agents      = ""    -- nf-fa-users
M.tokens      = ""    -- nf-fa-bar_chart
M.hook        = "󰛢"    -- nf-md-hook

-- Session / Terminal
M.claude_on   = ""    -- nf-fa-circle (filled)
M.claude_off  = ""    -- nf-fa-circle_o (outline)
M.primary     = ""    -- nf-fa-star
M.terminal    = ""    -- nf-oct-terminal
M.session     = ""    -- nf-fa-window_maximize
M.minimize    = ""    -- nf-fa-minus
M.maximize    = ""    -- nf-fa-plus
M.close       = ""    -- nf-fa-times

-- Expand / Collapse
M.expanded    = ""    -- nf-fa-chevron_down
M.collapsed   = ""    -- nf-fa-chevron_right
M.section     = ""    -- nf-fa-folder
M.section_open = ""   -- nf-fa-folder_open

-- Actions
M.run         = ""    -- nf-fa-play_circle
M.edit        = ""    -- nf-fa-pencil
M.delete      = ""    -- nf-fa-trash
M.reload      = "󰑐"    -- nf-md-refresh
M.save        = ""    -- nf-fa-floppy_o
M.yank        = ""    -- nf-fa-clipboard
M.open_file   = ""    -- nf-fa-external_link
M.help        = ""    -- nf-fa-info_circle

-- Special
M.ccasp       = "󰚩"    -- nf-md-robot_outline
M.claude      = "󰚩"    -- nf-md-robot_outline
M.pin         = ""    -- nf-oct-pin
M.git_branch  = ""    -- nf-oct-git_branch
M.worktree    = ""    -- nf-fa-code_fork

-- Categories (for command sections)
M.deploy      = "󰣆"    -- nf-md-rocket_launch
M.test        = ""    -- nf-fa-flask
M.dev         = ""    -- nf-fa-code
M.docs        = ""    -- nf-fa-book
M.workflow    = "󰃻"    -- nf-md-sitemap
M.ai          = "󰧑"    -- nf-md-creation
M.config      = ""    -- nf-fa-wrench

-- Decorative separators
M.separator   = "─"
M.dot         = "·"
M.pipe        = "│"
M.arrow_right = ""    -- nf-fa-arrow_right
M.arrow_left  = ""    -- nf-fa-arrow_left

-- Convenience: get permission mode icon
function M.perm_mode(mode)
  local map = { auto = M.auto, plan = M.plan, ask = M.ask }
  return map[mode] or M.settings
end

-- Convenience: get update mode icon
function M.update_mode(mode)
  local map = { auto = M.update_auto, manual = M.update_man, prompt = M.update_prompt }
  return map[mode] or M.settings
end

-- Convenience: get toggle icon
function M.toggle(enabled)
  return enabled and M.enabled or M.disabled
end

-- Convenience: get session status icon
function M.session_status(claude_running)
  return claude_running and M.claude_on or M.claude_off
end

return M
