-- CCASP Nerd Font Icon Definitions
-- Centralized icon module - requires a Nerd Font in terminal
-- No plugin dependency (raw codepoints)

local M = {}

-- Navigation / Tabs
M.search      = "󰍉"    -- nf-md-magnify
M.commands    = "󰆍"    -- nf-md-console
M.settings    = "󰒓"    -- nf-md-cog
M.shield      = "󰒃"    -- nf-md-shield_check
M.status      = "󰗶"    -- nf-md-heart_pulse
M.keyboard    = "󰌌"    -- nf-md-keyboard
M.assets      = "󰆧"    -- nf-md-cube_outline
M.shortcuts   = "󰌌"    -- nf-md-keyboard
M.dashboard   = "󰃨"    -- nf-md-apps
M.hooks       = "󰛢"    -- nf-md-hook
M.features    = "󰐱"    -- nf-md-puzzle

-- Modes / Permissions
M.auto        = "󰁪"    -- nf-md-robot
M.plan        = "󰏫"    -- nf-md-note_text
M.ask         = "󰋖"    -- nf-md-help_circle

-- Status indicators
M.sync_ok     = "󰗠"    -- nf-md-check_circle
M.sync_warn   = "󰀦"    -- nf-md-alert
M.update_auto = "󰑐"    -- nf-md-refresh
M.update_man  = "󰩿"    -- nf-md-hand_back_right
M.update_prompt = "󰆈"    -- nf-md-comment_outline

-- Feature toggles
M.enabled     = "󰔡"    -- nf-md-toggle_switch
M.disabled    = "󰔢"    -- nf-md-toggle_switch_off
M.running     = "󰐊"    -- nf-md-play
M.stopped     = "󰓛"    -- nf-md-stop
M.failed      = "󰅙"    -- nf-md-close_circle
M.model       = "󰘦"    -- nf-md-brain
M.agents      = "󰡉"    -- nf-md-account_group
M.tokens      = "󰄨"    -- nf-md-chart_bar
M.hook        = "󰛢"    -- nf-md-hook

-- Session / Terminal
M.claude_on   = "󰝥"    -- nf-md-circle
M.claude_off  = "󰝦"    -- nf-md-circle_outline
M.primary     = "󰓎"    -- nf-md-star
M.terminal    = "󰆍"    -- nf-md-console
M.session     = "󰕓"    -- nf-md-window_maximize
M.minimize    = "󰍴"    -- nf-md-minus
M.maximize    = "󰐕"    -- nf-md-plus
M.close       = "󰅖"    -- nf-md-close

-- Window management buttons (Material Design - better cross-platform rendering)
M.win_cycle    = "󰑐"    -- nf-md-refresh (cycle sessions)
M.win_rename   = "󰏪"    -- nf-md-pencil (rename)
M.win_minimize = "󰖰"    -- nf-md-window_minimize
M.win_maximize = "󰖯"    -- nf-md-window_maximize
M.win_restore  = "󰖳"    -- nf-md-window_restore
M.win_close    = "󰖭"    -- nf-md-window_close
M.win_save_note = "󰠘"   -- nf-md-content_save (save session note)
M.win_screenshot = "󰄀"    -- nf-md-camera (paste recent screenshot)
M.win_screenshot_browse = "󰋩"  -- nf-md-image_multiple (browse screenshots)
M.win_todo     = "󰄵"    -- nf-md-checkbox_marked_outline (todo list)
M.resize_grip  = "◢"    -- resize grip indicator (bottom-right corner)

-- Expand / Collapse
M.expanded    = "󰅀"    -- nf-md-chevron_down
M.collapsed   = "󰅂"    -- nf-md-chevron_right
M.section     = "󰉋"    -- nf-md-folder
M.section_open = "󰉋"    -- nf-md-folder

-- Actions
M.run         = "󰐋"    -- nf-md-play_circle
M.palette     = "󰏘"    -- nf-md-palette
M.edit        = "󰏫"    -- nf-md-pencil
M.delete      = "󰩹"    -- nf-md-trash_can
M.reload      = "󰑐"    -- nf-md-refresh
M.save        = "󰠘"    -- nf-md-content_save
M.yank        = "󰅇"    -- nf-md-clipboard_text
M.open_file   = "󰏌"    -- nf-md-open_in_new
M.help        = "󰋼"    -- nf-md-information

-- Special
M.ccasp       = "󰚩"    -- nf-md-robot_outline
M.claude      = "󰚩"    -- nf-md-robot_outline
M.pin         = "󰐃"    -- nf-md-pin
M.git_branch  = "󰘬"    -- nf-md-source_branch
M.worktree    = "󰘬"    -- nf-md-source_branch

-- Repository launcher
M.repo         = "󰬣"    -- nf-md-source_repository
M.clock        = "󰅐"    -- nf-md-clock_outline
M.path_input   = "󰉋"    -- nf-md-folder_open

-- Layout
M.layout      = "󰕰"    -- nf-md-view_dashboard_variant
M.reorder     = "󰒺"    -- nf-md-sort

-- Browser / Web
M.globe       = "󰖟"    -- nf-md-earth

-- Categories (for command sections)
M.deploy      = "󰣆"    -- nf-md-rocket_launch
M.test        = "󰈷"    -- nf-md-flask
M.dev         = "󰅴"    -- nf-md-code_tags
M.docs        = "󰂽"    -- nf-md-book_open_variant
M.workflow    = "󰃻"    -- nf-md-sitemap
M.ai          = "󰧑"    -- nf-md-creation
M.config      = "󰻇"    -- nf-md-wrench
M.todo        = "☑"    -- nf-fa-check_square_o

-- Onboarding / Getting Started
M.welcome     = "󰋗"    -- nf-md-help_circle
M.book        = "󰂽"    -- nf-md-book_open_variant
M.lightbulb   = "󰌶"    -- nf-md-lightbulb_outline
M.check       = "󰄬"    -- nf-md-check
M.star_filled = "󰓎"    -- nf-md-star
M.wiki        = "󰖬"    -- nf-md-wikipedia
M.search_help = "󰍉"    -- nf-md-magnify
M.topic       = "󰈚"    -- nf-md-file_document
M.breadcrumb  = "󰅂"    -- nf-md-chevron_right

-- Decorative separators
M.separator   = "─"
M.dot         = "·"
M.pipe        = "│"
M.arrow_right = "󰁔"    -- nf-md-arrow_right
M.arrow_left  = "󰁍"    -- nf-md-arrow_left

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
