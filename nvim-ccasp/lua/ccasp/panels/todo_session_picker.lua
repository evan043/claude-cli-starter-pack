-- ccasp/panels/todo_session_picker.lua - Session picker for todo panel
-- Shows sessions grouped by layer using picker_popup pattern.

local M = {}

-- Show the session picker popup.
-- @param config table: { on_select = function(session_id, session_label) }
function M.show(config)
  local on_select = config and config.on_select
  local picker = require("ccasp.ui.picker_popup")

  local items = {}
  local sessions_ok, sessions = pcall(require, "ccasp.sessions")
  if not sessions_ok then
    vim.notify("CCASP: sessions module not available", vim.log.levels.WARN)
    return
  end

  local layers_ok, layers = pcall(require, "ccasp.layers")
  if layers_ok and layers.is_initialized() then
    for _, layer in ipairs(layers.list()) do
      -- Layer separator header
      table.insert(items, {
        label = "─── " .. layer.name .. (layer.is_active and " (active)" or " (inactive)") .. " ───",
        separator = true,
      })

      if layer.is_active then
        -- Active layer: list live sessions
        local layer_sessions = sessions.list()
        table.sort(layer_sessions, function(a, b)
          return (a.name or ""):lower() < (b.name or ""):lower()
        end)
        for _, s in ipairs(layer_sessions) do
          local prefix = s.is_primary and "● " or "  "
          table.insert(items, {
            label = prefix .. (s.name or s.id),
            session_id = s.id,
            layer_name = layer.name,
          })
        end
      else
        -- Inactive layer: show dimmed from snapshot
        local layer_data = layers.get(layer.num)
        if layer_data and layer_data.sessions_data and layer_data.sessions_data.session_order then
          for _, sid in ipairs(layer_data.sessions_data.session_order) do
            local sdata = layer_data.sessions_data.sessions and layer_data.sessions_data.sessions[sid]
            local name = sdata and sdata.name or sid
            table.insert(items, {
              label = "  " .. name .. " (inactive)",
              session_id = sid,
              layer_name = layer.name,
              inactive = true,
            })
          end
        end
      end
    end
  else
    -- No layers, just list sessions
    for _, s in ipairs(sessions.list()) do
      local prefix = s.is_primary and "● " or "  "
      table.insert(items, {
        label = prefix .. (s.name or s.id),
        session_id = s.id,
      })
    end
  end

  if #items == 0 then
    vim.notify("No sessions available", vim.log.levels.WARN)
    return
  end

  picker.show({
    items = items,
    title = "Target Session",
    centered = true,
    min_width = 30,
    on_select = function(item)
      if item.separator then return end
      if item.inactive then
        vim.notify("Cannot target inactive layer session", vim.log.levels.WARN)
        return
      end
      if on_select and item.session_id then
        on_select(item.session_id, item.label)
      end
    end,
  })
end

return M
