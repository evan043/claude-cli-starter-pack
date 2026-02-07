-- ccasp/appshell/init.lua - Appshell Layout Orchestrator
-- Manages all appshell zones: icon rail, flyout, header, content, footer, right panel
-- Calculates zone bounds and coordinates between components

local M = {}

-- Default appshell configuration
M.config = {
  icon_rail = { width = 3, visible = true },
  flyout = { width = 35, visible = false },
  header = { height = 1, visible = true },
  footer = { height = 2, visible = true },
  right_panel = { width = 40, visible = false },
}

-- Zone state tracking
M.state = {
  active = false,
  active_section = nil, -- Current flyout section
  zones = {}, -- Cached zone bounds
}

-- Setup with user config
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
end

-- Calculate bounds for all zones based on current editor dimensions and visibility
function M.calculate_zones()
  local editor_w = vim.o.columns
  local editor_h = vim.o.lines

  local rail_w = M.config.icon_rail.visible and M.config.icon_rail.width or 0
  local flyout_w = M.config.flyout.visible and M.config.flyout.width or 0
  local header_h = M.config.header.visible and M.config.header.height or 0
  local footer_h = M.config.footer.visible and M.config.footer.height or 0
  local rpanel_w = M.config.right_panel.visible and M.config.right_panel.width or 0

  -- cmdline takes rows at bottom (respect user's cmdheight setting)
  local cmdline_h = vim.o.cmdheight or 1

  local zones = {}

  -- Icon rail: far left, full height between header and footer
  zones.icon_rail = {
    row = header_h,
    col = 0,
    width = rail_w,
    height = editor_h - header_h - footer_h - cmdline_h,
  }

  -- Flyout: next to icon rail, overlays content area
  zones.flyout = {
    row = header_h,
    col = rail_w,
    width = flyout_w,
    height = editor_h - header_h - footer_h - cmdline_h,
  }

  -- Header: full width, top of editor
  zones.header = {
    row = 0,
    col = 0,
    width = editor_w,
    height = header_h,
  }

  -- Footer: full width, bottom of editor (above cmdline)
  zones.footer = {
    row = editor_h - footer_h - cmdline_h,
    col = 0,
    width = editor_w,
    height = footer_h,
  }

  -- Right panel: right side, between header and footer
  zones.right_panel = {
    row = header_h,
    col = editor_w - rpanel_w,
    width = rpanel_w,
    height = editor_h - header_h - footer_h - cmdline_h,
  }

  -- Content: fills remaining space (between rail and right panel, between header and footer)
  zones.content = {
    row = header_h,
    col = rail_w,
    width = editor_w - rail_w - rpanel_w,
    height = editor_h - header_h - footer_h - cmdline_h,
  }

  M.state.zones = zones
  return zones
end

-- Get bounds for a specific zone
function M.get_zone_bounds(zone_name)
  if not M.state.zones or not M.state.zones[zone_name] then
    M.calculate_zones()
  end
  return M.state.zones[zone_name]
end

-- Open the appshell layout
function M.open()
  if M.state.active then return end

  M.calculate_zones()
  M.state.active = true

  -- Load and open components
  local icon_rail = require("ccasp.appshell.icon_rail")
  local header = require("ccasp.appshell.header")
  local footer = require("ccasp.appshell.footer")
  local content = require("ccasp.appshell.content")

  -- Open zones in order: header, footer, icon rail, content
  if M.config.header.visible then
    header.open(M.state.zones.header)
  end

  if M.config.footer.visible then
    footer.open(M.state.zones.footer)
  end

  if M.config.icon_rail.visible then
    icon_rail.open(M.state.zones.icon_rail)
  end

  content.open(M.state.zones.content)

  vim.notify("CCASP Appshell active", vim.log.levels.INFO)
end

-- Close the appshell layout
function M.close()
  if not M.state.active then return end

  local icon_rail = require("ccasp.appshell.icon_rail")
  local header = require("ccasp.appshell.header")
  local footer = require("ccasp.appshell.footer")
  local content = require("ccasp.appshell.content")
  local flyout = require("ccasp.appshell.flyout")

  flyout.close()
  icon_rail.close()
  header.close()
  footer.close()
  content.close()

  -- Close right panel if open
  local rp_ok, right_panel = pcall(require, "ccasp.appshell.right_panel")
  if rp_ok and right_panel.close then
    right_panel.close()
  end

  M.state.active = false
  M.state.active_section = nil
end

-- Toggle flyout for a section
function M.toggle_flyout(section)
  local flyout = require("ccasp.appshell.flyout")

  if M.config.flyout.visible and M.state.active_section == section then
    -- Same section clicked again → close flyout
    flyout.close()
    M.config.flyout.visible = false
    M.state.active_section = nil
  else
    -- Open or switch section
    M.config.flyout.visible = true
    M.state.active_section = section
    M.calculate_zones()
    flyout.open(M.state.zones.flyout, section)
  end

  -- Update icon rail to reflect active section
  local icon_rail = require("ccasp.appshell.icon_rail")
  icon_rail.set_active(section)
end

-- Toggle right panel visibility
function M.toggle_right_panel()
  M.config.right_panel.visible = not M.config.right_panel.visible
  M.calculate_zones()

  local rp_ok, right_panel = pcall(require, "ccasp.appshell.right_panel")
  if not rp_ok then return end

  if M.config.right_panel.visible then
    right_panel.open(M.state.zones.right_panel)
  else
    right_panel.close()
  end

  -- Update content area bounds
  local content = require("ccasp.appshell.content")
  content.resize(M.state.zones.content)
end

-- Toggle icon rail visibility
function M.toggle_rail()
  M.config.icon_rail.visible = not M.config.icon_rail.visible

  -- If hiding rail, also close flyout
  if not M.config.icon_rail.visible then
    M.config.flyout.visible = false
    M.state.active_section = nil
    local flyout = require("ccasp.appshell.flyout")
    flyout.close()
  end

  M.calculate_zones()

  local icon_rail = require("ccasp.appshell.icon_rail")
  if M.config.icon_rail.visible then
    icon_rail.open(M.state.zones.icon_rail)
  else
    icon_rail.close()
  end

  -- Update content area bounds
  local content = require("ccasp.appshell.content")
  content.resize(M.state.zones.content)
end

-- Handle terminal resize
function M.resize()
  if not M.state.active then return end

  M.calculate_zones()

  local icon_rail = require("ccasp.appshell.icon_rail")
  local header = require("ccasp.appshell.header")
  local footer = require("ccasp.appshell.footer")
  local content = require("ccasp.appshell.content")

  if M.config.header.visible then
    header.resize(M.state.zones.header)
  end

  if M.config.footer.visible then
    footer.resize(M.state.zones.footer)
  end

  if M.config.icon_rail.visible then
    icon_rail.resize(M.state.zones.icon_rail)
  end

  if M.config.flyout.visible then
    local flyout = require("ccasp.appshell.flyout")
    flyout.resize(M.state.zones.flyout)
  end

  if M.config.right_panel.visible then
    local rp_ok, right_panel = pcall(require, "ccasp.appshell.right_panel")
    if rp_ok then right_panel.resize(M.state.zones.right_panel) end
  end

  content.resize(M.state.zones.content)
end

-- Check if appshell is active
function M.is_active()
  return M.state.active
end

-- VimResized autocommand
vim.api.nvim_create_autocmd("VimResized", {
  group = vim.api.nvim_create_augroup("CcaspAppshell", { clear = true }),
  callback = function()
    vim.defer_fn(function()
      M.resize()
    end, 50)
  end,
})

return M
