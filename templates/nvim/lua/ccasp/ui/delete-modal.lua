-- CCASP Delete Modal UI Component
-- Two-mode deletion: temporary (skip) vs permanent (exclude)

local M = {}

-- Modal state
local state = {
  popup = nil,
  asset_type = nil,
  asset_name = nil,
  on_complete = nil,
}

-- Check if nui is available
local function has_nui()
  local ok, _ = pcall(require, "nui.popup")
  return ok
end

-- Get icon for asset type
local function get_icon(asset_type)
  local icons = {
    agent = "🤖",
    agents = "🤖",
    hook = "⚡",
    hooks = "⚡",
    skill = "🎯",
    skills = "🎯",
  }
  return icons[asset_type] or "📄"
end

-- Perform deletion
local function perform_delete(mode)
  local assets = require("ccasp.core.assets")

  local success, err = assets.delete(state.asset_type, state.asset_name, mode)

  if success then
    local mode_text = mode == "permanent" and "permanently deleted" or "temporarily deleted"
    vim.notify(state.asset_name .. " " .. mode_text, vim.log.levels.INFO)

    -- Refresh sidebar
    local sidebar = require("ccasp.ui.sidebar")
    sidebar.refresh()

    -- Clear selection
    local ccasp = require("ccasp")
    if ccasp.state.selected_asset == state.asset_name then
      ccasp.state.selected_asset = nil
      ccasp.state.selected_asset_type = nil
    end

    M.close(true)
  else
    vim.notify("Failed to delete: " .. (err or "unknown error"), vim.log.levels.ERROR)
    M.close(false)
  end
end

-- Show delete confirmation modal
function M.show(asset_type, asset_name, on_complete)
  if not has_nui() then
    -- Fallback to vim.ui.select
    vim.ui.select({
      "Delete temporarily (can be re-added)",
      "Delete permanently (excluded from updates)",
      "Cancel"
    }, {
      prompt = "Delete " .. asset_name .. "?",
    }, function(choice)
      if choice == "Delete temporarily (can be re-added)" then
        local assets = require("ccasp.core.assets")
        assets.delete(asset_type, asset_name, "temporary")
        if on_complete then on_complete(true) end
      elseif choice == "Delete permanently (excluded from updates)" then
        local assets = require("ccasp.core.assets")
        assets.delete(asset_type, asset_name, "permanent")
        if on_complete then on_complete(true) end
      else
        if on_complete then on_complete(false) end
      end
    end)
    return
  end

  -- Store state
  state.asset_type = asset_type
  state.asset_name = asset_name
  state.on_complete = on_complete

  local Popup = require("nui.popup")
  local icon = get_icon(asset_type)

  state.popup = Popup({
    position = "50%",
    size = {
      width = 50,
      height = 16,
    },
    border = {
      style = "rounded",
      text = {
        top = " ⚠️  Delete " .. icon .. " " .. asset_type .. " ",
        top_align = "center",
      },
    },
    buf_options = {
      modifiable = false,
    },
    win_options = {
      winhighlight = "Normal:Normal,FloatBorder:WarningMsg",
    },
    enter = true,
    focusable = true,
  })

  state.popup:mount()

  -- Render content
  local lines = {
    "",
    "  Delete \"" .. asset_name .. "\"?",
    "",
    string.rep("─", 46),
    "",
    "  [1] Delete temporarily",
    "      Can be re-added via /update-check",
    "      Good for: trying something different",
    "",
    "  [2] Delete permanently",
    "      Excluded from all future updates",
    "      Backed up to .claude/backups/deleted/",
    "",
    string.rep("─", 46),
    "",
    "  [Esc] Cancel",
  }

  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", true)
  vim.api.nvim_buf_set_lines(state.popup.bufnr, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(state.popup.bufnr, "modifiable", false)

  -- Apply highlights
  local ns_id = vim.api.nvim_create_namespace("ccasp_delete_modal")

  -- Highlight asset name
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "WarningMsg", 1, 10, 10 + #asset_name + 2)

  -- Highlight option 1
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "Title", 5, 2, 24)
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "Comment", 6, 6, 46)
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "Comment", 7, 6, 46)

  -- Highlight option 2
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "ErrorMsg", 9, 2, 24)
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "Comment", 10, 6, 46)
  vim.api.nvim_buf_add_highlight(state.popup.bufnr, ns_id, "Comment", 11, 6, 46)

  -- Setup keybindings
  local opts = { buffer = state.popup.bufnr, noremap = true, silent = true }

  -- Option 1: Temporary delete
  vim.keymap.set("n", "1", function()
    perform_delete("temporary")
  end, opts)

  -- Option 2: Permanent delete
  vim.keymap.set("n", "2", function()
    perform_delete("permanent")
  end, opts)

  -- Cancel
  vim.keymap.set("n", "<Esc>", function()
    M.close(false)
  end, opts)

  vim.keymap.set("n", "q", function()
    M.close(false)
  end, opts)

  vim.keymap.set("n", "n", function()
    M.close(false)
  end, opts)
end

-- Close modal
function M.close(deleted)
  if state.popup then
    state.popup:unmount()
    state.popup = nil
  end

  local on_complete = state.on_complete

  state.asset_type = nil
  state.asset_name = nil
  state.on_complete = nil

  if on_complete then
    on_complete(deleted or false)
  end
end

-- Check if modal is open
function M.is_open()
  return state.popup ~= nil
end

return M
