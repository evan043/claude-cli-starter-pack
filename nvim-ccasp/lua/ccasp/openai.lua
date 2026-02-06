-- ccasp/openai.lua - OpenAI API client for Prompt Injector feature
-- Provides GPT-5.2 integration for prompt enhancement

local M = {}

-- Configuration defaults
M.config = {
  api_key = nil,
  model = "gpt-5.2",
  max_tokens = 1000,
  temperature = 0.3,
  timeout = 30000, -- 30 seconds
  base_url = "https://api.openai.com/v1",
}

-- State
M.state = {
  initialized = false,
  last_error = nil,
  request_count = 0,
}

-- System prompt for prompt enhancement
M.ENHANCE_SYSTEM_PROMPT = [[You are a prompt enhancement specialist for Claude Code CLI. Your job is to take user prompts and improve them for clarity, specificity, and effectiveness.

Rules:
1. Preserve the user's intent exactly - do NOT add features they didn't request
2. Add structure (numbered steps if the task is complex)
3. Clarify ambiguous terms
4. Add helpful context if it improves the prompt
5. Keep the enhanced prompt concise and actionable
6. If the prompt is already clear and specific, make minimal changes
7. For code-related prompts, specify file types/frameworks if evident
8. Return ONLY the enhanced prompt text, no explanations or meta-commentary

Focus on making the prompt clear enough that Claude can execute it without follow-up questions.]]

-- Load environment variables
local function load_env()
  local env = {}

  -- Try to load from .env file in project root
  local cwd = vim.fn.getcwd()
  local env_paths = {
    cwd .. "/.env",
    cwd .. "/tools/claude-cli-advanced-starter-pack/.env",
    vim.fn.expand("~/.ccasp/.env"),
  }

  for _, env_path in ipairs(env_paths) do
    if vim.fn.filereadable(env_path) == 1 then
      local lines = vim.fn.readfile(env_path)
      for _, line in ipairs(lines) do
        -- Skip comments and empty lines
        if not line:match("^%s*#") and line:match("=") then
          local key, value = line:match("^%s*([%w_]+)%s*=%s*(.*)%s*$")
          if key and value then
            -- Remove quotes if present
            value = value:gsub("^['\"]", ""):gsub("['\"]$", "")
            env[key] = value
          end
        end
      end
      break
    end
  end

  -- Also check system environment variables
  local system_keys = { "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_MAX_TOKENS", "OPENAI_TEMPERATURE" }
  for _, key in ipairs(system_keys) do
    local val = vim.fn.getenv(key)
    if val and val ~= "" and val ~= vim.NIL then
      env[key] = val
    end
  end

  return env
end

-- Initialize the OpenAI client
function M.setup(opts)
  opts = opts or {}

  -- Load environment
  local env = load_env()

  -- Apply configuration
  M.config.api_key = opts.api_key or env.OPENAI_API_KEY
  M.config.model = opts.model or env.OPENAI_MODEL or M.config.model
  M.config.max_tokens = tonumber(opts.max_tokens or env.OPENAI_MAX_TOKENS) or M.config.max_tokens
  M.config.temperature = tonumber(opts.temperature or env.OPENAI_TEMPERATURE) or M.config.temperature

  -- Validate API key
  if not M.config.api_key or M.config.api_key == "" or M.config.api_key:match("^sk%-%.%.%.") then
    M.state.initialized = false
    M.state.last_error = "OpenAI API key not configured"
    return false
  end

  M.state.initialized = true
  M.state.last_error = nil
  return true
end

-- Check if OpenAI is available
function M.is_available()
  if not M.state.initialized then
    M.setup()
  end
  return M.state.initialized
end

-- Get last error
function M.get_error()
  return M.state.last_error
end

-- Make API request using curl (via plenary or vim.fn.system)
-- Uses a temp header file to avoid exposing API key in process list
local function make_request(endpoint, body, callback)
  local url = M.config.base_url .. endpoint

  -- Build curl command
  local json_body = vim.fn.json_encode(body)

  -- Escape for shell
  json_body = json_body:gsub("'", "'\\''")

  -- Write auth header to temp file (avoids API key in ps output)
  local header_file = vim.fn.tempname()
  vim.fn.writefile({ "Authorization: Bearer " .. M.config.api_key }, header_file)

  local curl_cmd = string.format(
    "curl -s -X POST '%s' " ..
    "-H 'Content-Type: application/json' " ..
    "-H @%s " ..
    "-d '%s' " ..
    "--max-time %d",
    url,
    vim.fn.shellescape(header_file),
    json_body,
    math.floor(M.config.timeout / 1000)
  )

  -- Try to use plenary for async, fall back to sync
  local has_plenary, Job = pcall(require, "plenary.job")

  if has_plenary and callback then
    -- Async with plenary
    Job:new({
      command = "curl",
      args = {
        "-s", "-X", "POST", url,
        "-H", "Content-Type: application/json",
        "-H", "@" .. header_file,
        "-d", json_body,
        "--max-time", tostring(math.floor(M.config.timeout / 1000)),
      },
      on_exit = function(j, return_val)
        -- Clean up temp header file
        os.remove(header_file)

        vim.schedule(function()
          if return_val ~= 0 then
            callback(nil, "Request failed with code " .. return_val)
            return
          end

          local result = table.concat(j:result(), "\n")
          local ok, decoded = pcall(vim.fn.json_decode, result)

          if not ok then
            callback(nil, "Failed to parse response: " .. result)
            return
          end

          if decoded.error then
            callback(nil, decoded.error.message or "Unknown API error")
            return
          end

          callback(decoded, nil)
        end)
      end,
    }):start()
  else
    -- Sync fallback
    local result = vim.fn.system(curl_cmd)
    -- Clean up temp header file
    os.remove(header_file)

    local ok, decoded = pcall(vim.fn.json_decode, result)

    if not ok then
      local err = "Failed to parse response"
      if callback then callback(nil, err) end
      return nil, err
    end

    if decoded.error then
      local err = decoded.error.message or "Unknown API error"
      if callback then callback(nil, err) end
      return nil, err
    end

    if callback then
      callback(decoded, nil)
    end
    return decoded, nil
  end
end

-- Enhance a prompt using GPT-5.2
function M.enhance_prompt(prompt, callback)
  if not M.is_available() then
    local err = M.state.last_error or "OpenAI not initialized"
    if callback then
      callback(nil, err)
    end
    return nil, err
  end

  M.state.request_count = M.state.request_count + 1

  local body = {
    model = M.config.model,
    messages = {
      { role = "system", content = M.ENHANCE_SYSTEM_PROMPT },
      { role = "user", content = "Original prompt:\n" .. prompt .. "\n\nEnhanced prompt:" },
    },
    max_tokens = M.config.max_tokens,
    temperature = M.config.temperature,
  }

  make_request("/chat/completions", body, function(response, err)
    if err then
      M.state.last_error = err
      if callback then
        callback(nil, err)
      end
      return
    end

    -- Extract the enhanced prompt from the response
    local enhanced = nil
    if response.choices and response.choices[1] and response.choices[1].message then
      enhanced = response.choices[1].message.content
      -- Clean up any leading/trailing whitespace
      enhanced = enhanced:gsub("^%s+", ""):gsub("%s+$", "")
    end

    if callback then
      callback(enhanced, nil)
    end
  end)
end

-- Get current model
function M.get_model()
  return M.config.model
end

-- Get status for display
function M.get_status()
  return {
    available = M.is_available(),
    model = M.config.model,
    request_count = M.state.request_count,
    last_error = M.state.last_error,
  }
end

return M
