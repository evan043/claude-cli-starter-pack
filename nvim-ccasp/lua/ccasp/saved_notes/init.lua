-- CCASP Saved Notes - Public API
-- Save terminal session content to persistent text files for later retrieval.

local M = {}

-- Lazy-loaded modules
local function get_storage() return require("ccasp.saved_notes.storage") end
local function get_save_modal() return require("ccasp.saved_notes.save_modal") end
local function get_browser() return require("ccasp.saved_notes.browser") end
local function get_viewer() return require("ccasp.saved_notes.viewer") end

--- Open the save dialog for a specific session.
--- @param session_id string
function M.save_note(session_id)
  get_save_modal().open(session_id)
end

--- Open the saved notes browser panel.
function M.open_browser()
  get_browser().open()
end

--- Open the content viewer for a specific note.
--- @param note_id string
function M.open_viewer(note_id)
  get_viewer().open(note_id)
end

--- Get all saved notes (delegates to storage).
--- @return table[] notes
function M.list()
  return get_storage().load().notes
end

return M
