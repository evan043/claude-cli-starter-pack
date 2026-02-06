-- ccasp/agents.lua - Multi-agent grid management for Claude CLI sessions
local M = {}

-- Get the root CCASP config
local function get_ccasp()
  return require("ccasp")
end

local function get_config()
  return require("ccasp.config")
end

-- Agent state tracking
M.agents = {} -- { [slot] = { bufnr, winid, job_id, name, role, model, status } }
M.grid_open = false

-- Build Claude CLI command for an agent
function M.build_command(agent)
  local ccasp = get_ccasp()
  local cmd = ccasp.config.claude.command

  -- Add model flag
  local model = agent.model or ccasp.config.claude.default_model
  cmd = cmd .. " --model " .. model

  -- Add agent-specific prompt/context
  if agent.prompt then
    cmd = cmd .. " --print " .. vim.fn.shellescape(agent.prompt)
  end

  return cmd
end

-- Create a single agent terminal
function M.spawn_agent(slot, agent)
  local ccasp = get_ccasp()

  -- Create terminal buffer
  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[bufnr].bufhidden = "wipe"

  -- Set buffer name
  local buf_name = string.format("claude://%s [%d]", agent.name, slot)
  pcall(vim.api.nvim_buf_set_name, bufnr, buf_name)

  -- Build command
  local cmd = M.build_command(agent)

  -- Store agent info before spawning
  M.agents[slot] = {
    bufnr = bufnr,
    winid = nil, -- Set when window is created
    job_id = nil,
    name = agent.name,
    role = agent.role or "",
    model = agent.model or ccasp.config.claude.default_model,
    status = "starting",
    command = cmd,
  }

  return bufnr
end

-- Create grid layout with all agents
function M.open_grid()
  local ccasp = get_ccasp()
  local grid = ccasp.config.grid

  if M.grid_open then
    vim.notify("CCASP: Grid already open", vim.log.levels.WARN)
    return
  end

  -- Close all existing windows first
  vim.cmd("only")

  local agents = grid.agents
  local rows = grid.rows
  local cols = grid.cols
  local total = rows * cols

  -- Limit to available agents
  total = math.min(total, #agents)

  -- Create windows in grid pattern
  local wins = {}
  local slot = 1

  for row = 1, rows do
    if row > 1 then
      vim.cmd("split")
    end

    for col = 1, cols do
      if col > 1 then
        vim.cmd("vsplit")
      end

      if slot <= total then
        local agent = agents[slot]
        local bufnr = M.spawn_agent(slot, agent)

        -- Switch to buffer
        vim.api.nvim_set_current_buf(bufnr)

        -- Store window ID
        local winid = vim.api.nvim_get_current_win()
        M.agents[slot].winid = winid
        wins[slot] = winid

        -- Start terminal
        local job_id = vim.fn.termopen(M.agents[slot].command, {
          on_exit = function(_, exit_code, _)
            if M.agents[slot] then
              M.agents[slot].status = exit_code == 0 and "exited" or "failed"
              M.agents[slot].job_id = nil
            end
          end,
        })

        M.agents[slot].job_id = job_id
        M.agents[slot].status = "running"

        -- Set window options
        vim.wo[winid].number = false
        vim.wo[winid].relativenumber = false
        vim.wo[winid].signcolumn = "no"
        vim.wo[winid].statusline = string.format(
          "%%#StatusLine# %s %%#Comment#│ %s %%#StatusLine#│ %s ",
          agent.name,
          agent.role or "",
          agent.model or "sonnet"
        )

        slot = slot + 1
      end
    end

    -- Move to next row
    if row < rows then
      vim.cmd("wincmd j")
      vim.cmd("wincmd h")
    end
  end

  -- Equalize all windows
  vim.cmd("wincmd =")

  -- Go to first window
  if wins[1] then
    vim.api.nvim_set_current_win(wins[1])
  end

  M.grid_open = true
  vim.notify(string.format("CCASP: Started %d agents", total), vim.log.levels.INFO)
end

-- Restart a specific agent
function M.restart_agent(slot)
  local agent = M.agents[slot]
  if not agent then
    vim.notify("CCASP: Agent " .. slot .. " not found", vim.log.levels.WARN)
    return
  end

  -- Kill existing job
  if agent.job_id then
    vim.fn.jobstop(agent.job_id)
  end

  -- Check if window still exists
  if not vim.api.nvim_win_is_valid(agent.winid) then
    vim.notify("CCASP: Agent window closed", vim.log.levels.WARN)
    return
  end

  -- Create new buffer
  local bufnr = vim.api.nvim_create_buf(false, true)
  vim.bo[bufnr].bufhidden = "wipe"

  -- Switch to new buffer in agent's window
  vim.api.nvim_win_set_buf(agent.winid, bufnr)

  -- Start new terminal
  local job_id = vim.fn.termopen(agent.command, {
    on_exit = function(_, exit_code, _)
      if M.agents[slot] then
        M.agents[slot].status = exit_code == 0 and "exited" or "failed"
        M.agents[slot].job_id = nil
      end
    end,
  })

  M.agents[slot].bufnr = bufnr
  M.agents[slot].job_id = job_id
  M.agents[slot].status = "running"

  vim.notify("CCASP: Restarted agent " .. agent.name, vim.log.levels.INFO)
end

-- Restart all agents
function M.restart_all()
  for slot, _ in pairs(M.agents) do
    M.restart_agent(slot)
  end
  vim.notify("CCASP: Restarted all agents", vim.log.levels.INFO)
end

-- Kill a specific agent
function M.kill_agent(slot)
  local agent = M.agents[slot]
  if not agent then
    return
  end

  if agent.job_id then
    vim.fn.jobstop(agent.job_id)
    agent.job_id = nil
    agent.status = "stopped"
  end
end

-- Kill all agents
function M.kill_all()
  for slot, agent in pairs(M.agents) do
    if agent.job_id then
      vim.fn.jobstop(agent.job_id)
    end
  end
  M.agents = {}
  M.grid_open = false
  vim.notify("CCASP: Killed all agents", vim.log.levels.INFO)
end

-- Get agent status summary
function M.get_status()
  local summary = {
    total = 0,
    running = 0,
    stopped = 0,
    failed = 0,
  }

  for _, agent in pairs(M.agents) do
    summary.total = summary.total + 1
    if agent.status == "running" then
      summary.running = summary.running + 1
    elseif agent.status == "stopped" or agent.status == "exited" then
      summary.stopped = summary.stopped + 1
    elseif agent.status == "failed" then
      summary.failed = summary.failed + 1
    end
  end

  return summary
end

-- Quick spawn single agent in current window
function M.quick_spawn(name, model)
  local ccasp = get_ccasp()

  local cmd = ccasp.config.claude.command
  if model then
    cmd = cmd .. " --model " .. model
  end

  vim.cmd("terminal " .. cmd)
  vim.cmd("startinsert")
end

return M
