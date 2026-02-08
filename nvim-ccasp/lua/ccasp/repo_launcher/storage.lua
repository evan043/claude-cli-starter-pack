local M = {}

local LIB_PATH = vim.fn.expand("~/.ccasp/repo-library.json")
local LIB_DIR = vim.fn.expand("~/.ccasp")

local function empty_library()
  return {
    version = "1.0.0",
    repos = {},
  }
end

local function now()
  return os.date("!%Y-%m-%dT%H:%M:%S.000Z")
end

local function find_repo(library, path)
  for i, repo in ipairs(library.repos) do
    if repo.path == path then
      return i, repo
    end
  end
  return nil, nil
end

function M.load()
  if vim.fn.filereadable(LIB_PATH) == 0 then
    local lib = empty_library()
    M.save(lib)
    return lib
  end
  local lines = vim.fn.readfile(LIB_PATH)
  local raw = table.concat(lines, "\n")
  local ok, decoded = pcall(vim.json.decode, raw)
  if not ok or type(decoded) ~= "table" then
    return empty_library()
  end
  if not decoded.repos then
    decoded.repos = {}
  end
  return decoded
end

function M.save(library)
  if vim.fn.isdirectory(LIB_DIR) == 0 then
    vim.fn.mkdir(LIB_DIR, "p")
  end
  local json = vim.json.encode(library)
  vim.fn.writefile({ json }, LIB_PATH)
end

function M.add(path)
  if vim.fn.isdirectory(path) == 0 then
    return nil
  end
  local library = M.load()
  local idx, repo = find_repo(library, path)
  if idx then
    repo.last_opened = now()
    repo.open_count = (repo.open_count or 0) + 1
    library.repos[idx] = repo
  else
    repo = {
      path = path,
      name = vim.fn.fnamemodify(path, ":t"),
      last_opened = now(),
      open_count = 1,
      pinned = false,
    }
    table.insert(library.repos, repo)
  end
  M.save(library)
  return repo
end

function M.remove(path)
  local library = M.load()
  local idx = find_repo(library, path)
  if idx then
    table.remove(library.repos, idx)
    M.save(library)
  end
end

function M.toggle_pin(path)
  local library = M.load()
  local idx, repo = find_repo(library, path)
  if idx then
    repo.pinned = not repo.pinned
    library.repos[idx] = repo
    M.save(library)
  end
end

local function sort_by_last_opened_desc(a, b)
  return (a.last_opened or "") > (b.last_opened or "")
end

function M.get_recent(limit)
  limit = limit or 10
  local library = M.load()
  local repos = vim.deepcopy(library.repos)
  table.sort(repos, sort_by_last_opened_desc)
  local result = {}
  for i = 1, math.min(limit, #repos) do
    result[i] = repos[i]
  end
  return result
end

function M.get_pinned()
  local library = M.load()
  local pinned = {}
  for _, repo in ipairs(library.repos) do
    if repo.pinned then
      table.insert(pinned, repo)
    end
  end
  table.sort(pinned, function(a, b)
    return (a.name or "") < (b.name or "")
  end)
  return pinned
end

function M.search(query)
  local library = M.load()
  local q = query:lower()
  local results = {}
  for _, repo in ipairs(library.repos) do
    local name_match = repo.name and repo.name:lower():find(q, 1, true)
    local path_match = repo.path and repo.path:lower():find(q, 1, true)
    if name_match or path_match then
      table.insert(results, repo)
    end
  end
  table.sort(results, sort_by_last_opened_desc)
  return results
end

function M.get_all()
  local library = M.load()
  local pinned = {}
  local unpinned = {}
  for _, repo in ipairs(library.repos) do
    if repo.pinned then
      table.insert(pinned, repo)
    else
      table.insert(unpinned, repo)
    end
  end
  table.sort(pinned, function(a, b)
    return (a.name or "") < (b.name or "")
  end)
  table.sort(unpinned, sort_by_last_opened_desc)
  local result = {}
  for _, r in ipairs(pinned) do
    table.insert(result, r)
  end
  for _, r in ipairs(unpinned) do
    table.insert(result, r)
  end
  return result
end

function M.prune(max_entries)
  max_entries = max_entries or 50
  local library = M.load()
  if #library.repos <= max_entries then
    return
  end
  local pinned = {}
  local unpinned = {}
  for _, repo in ipairs(library.repos) do
    if repo.pinned then
      table.insert(pinned, repo)
    else
      table.insert(unpinned, repo)
    end
  end
  table.sort(unpinned, sort_by_last_opened_desc)
  local keep_unpinned = max_entries - #pinned
  if keep_unpinned < 0 then
    keep_unpinned = 0
  end
  local new_repos = {}
  for _, r in ipairs(pinned) do
    table.insert(new_repos, r)
  end
  for i = 1, math.min(keep_unpinned, #unpinned) do
    table.insert(new_repos, unpinned[i])
  end
  library.repos = new_repos
  M.save(library)
end

return M
