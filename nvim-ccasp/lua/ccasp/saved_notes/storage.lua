-- CCASP Saved Notes - JSON + File Persistence
-- Stores note metadata in ~/.ccasp/saved-notes.json
-- Stores note content in ~/.ccasp/saved-notes/{id}.txt

local M = {}

local NOTES_JSON_PATH = vim.fn.expand("~/.ccasp/saved-notes.json")
local NOTES_DIR = vim.fn.expand("~/.ccasp/saved-notes")
local CCASP_DIR = vim.fn.expand("~/.ccasp")

local function empty_library()
  return {
    version = "1.0.0",
    notes = {},
  }
end

function M.now()
  return os.date("!%Y-%m-%dT%H:%M:%S.000Z")
end

--- Generate a unique note ID: epoch-hex4
function M.generate_id()
  local epoch = os.time()
  local hex = string.format("%04x", math.random(0, 0xFFFF))
  return tostring(epoch) .. "-" .. hex
end

--- Load the notes metadata library from disk.
--- @return table library
function M.load()
  if vim.fn.filereadable(NOTES_JSON_PATH) == 0 then
    local lib = empty_library()
    M.save(lib)
    return lib
  end
  local lines = vim.fn.readfile(NOTES_JSON_PATH)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  if not ok or type(decoded) ~= "table" then
    return empty_library()
  end
  if not decoded.notes then
    decoded.notes = {}
  end
  return decoded
end

--- Persist the notes metadata library to disk.
--- @param library table
function M.save(library)
  if vim.fn.isdirectory(CCASP_DIR) == 0 then
    vim.fn.mkdir(CCASP_DIR, "p")
  end
  local json = vim.json.encode(library)
  vim.fn.writefile({ json }, NOTES_JSON_PATH)
end

--- Ensure the content directory exists.
local function ensure_notes_dir()
  if vim.fn.isdirectory(NOTES_DIR) == 0 then
    vim.fn.mkdir(NOTES_DIR, "p")
  end
end

--- Add a new note (writes both .txt content file and JSON metadata).
--- @param data table { name, tag, content_lines, project_path, project_name, session_name, layer_name }
--- @return table note_entry The created note metadata
function M.add_note(data)
  ensure_notes_dir()

  local id = M.generate_id()
  local content_lines = data.content_lines or {}
  local txt_path = NOTES_DIR .. "/" .. id .. ".txt"

  -- Write content file
  vim.fn.writefile(content_lines, txt_path)

  -- Build metadata entry
  local entry = {
    id = id,
    name = data.name or "Untitled",
    tag = data.tag or "",
    project_path = data.project_path or vim.fn.getcwd(),
    project_name = data.project_name or vim.fn.fnamemodify(vim.fn.getcwd(), ":t"),
    session_name = data.session_name or "",
    layer_name = data.layer_name or "",
    saved_at = M.now(),
    line_count = #content_lines,
  }

  local library = M.load()
  table.insert(library.notes, 1, entry) -- prepend (most recent first)
  M.save(library)

  return entry
end

--- Delete a note (removes both .txt file and JSON entry).
--- @param id string Note ID
--- @return boolean success
function M.delete_note(id)
  local library = M.load()

  local found_idx = nil
  for i, note in ipairs(library.notes) do
    if note.id == id then
      found_idx = i
      break
    end
  end

  if not found_idx then return false end

  table.remove(library.notes, found_idx)
  M.save(library)

  -- Remove content file
  local txt_path = NOTES_DIR .. "/" .. id .. ".txt"
  if vim.fn.filereadable(txt_path) == 1 then
    vim.fn.delete(txt_path)
  end

  return true
end

--- Update fields on an existing note (metadata only).
--- @param id string Note ID
--- @param fields table Key-value pairs to update (e.g. { name = "new-name", tag = "new-tag" })
--- @return boolean success
function M.update_note(id, fields)
  local library = M.load()

  for _, note in ipairs(library.notes) do
    if note.id == id then
      for k, v in pairs(fields) do
        note[k] = v
      end
      M.save(library)
      return true
    end
  end

  return false
end

--- Read the content of a saved note.
--- @param id string Note ID
--- @return string[]|nil lines
function M.get_content(id)
  local txt_path = NOTES_DIR .. "/" .. id .. ".txt"
  if vim.fn.filereadable(txt_path) == 0 then
    return nil
  end
  return vim.fn.readfile(txt_path)
end

--- Get the file path for a note's content.
--- @param id string Note ID
--- @return string path
function M.get_content_path(id)
  return NOTES_DIR .. "/" .. id .. ".txt"
end

--- Find a note by ID in a library.
--- @param library table
--- @param id string
--- @return number|nil index
--- @return table|nil note
function M.find_note(library, id)
  for i, note in ipairs(library.notes) do
    if note.id == id then
      return i, note
    end
  end
  return nil, nil
end

return M
