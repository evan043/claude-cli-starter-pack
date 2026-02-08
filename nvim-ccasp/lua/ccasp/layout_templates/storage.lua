-- CCASP Layout Templates - JSON Persistence
-- Stores saved layout templates in ~/.ccasp/layout-templates.json

local M = {}

local TEMPLATES_PATH = vim.fn.expand("~/.ccasp/layout-templates.json")
local TEMPLATES_DIR = vim.fn.expand("~/.ccasp")

local function empty_library()
  return {
    version = "1.0.0",
    templates = {},
  }
end

function M.now()
  return os.date("!%Y-%m-%dT%H:%M:%S.000Z")
end

function M.find_template(library, name)
  for i, tmpl in ipairs(library.templates) do
    if tmpl.name == name then
      return i, tmpl
    end
  end
  return nil, nil
end

function M.load()
  if vim.fn.filereadable(TEMPLATES_PATH) == 0 then
    local lib = empty_library()
    M.save(lib)
    return lib
  end
  local lines = vim.fn.readfile(TEMPLATES_PATH)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  if not ok or type(decoded) ~= "table" then
    return empty_library()
  end
  if not decoded.templates then
    decoded.templates = {}
  end
  return decoded
end

function M.save(library)
  if vim.fn.isdirectory(TEMPLATES_DIR) == 0 then
    vim.fn.mkdir(TEMPLATES_DIR, "p")
  end
  local json = vim.json.encode(library)
  vim.fn.writefile({ json }, TEMPLATES_PATH)
end

return M
