-- ccasp/prompt_injector.lua - Prompt Injector Mode for CCASP
-- Intercepts prompts before sending to Claude CLI, optionally enhances with GPT-5.2

local M = {}

-- State
M.state = {
  enabled = false,
  auto_enhance = false,
  intercepting = false,
  last_prompt = nil,
  last_enhanced = nil,
}

-- Get dependencies lazily
local function get_openai()
  return require("ccasp.openai")
end

local function get_prompt_editor()
  return require("ccasp.panels.prompt_editor")
end

-- Initialize prompt injector
function M.setup(opts)
  opts = opts or {}

  -- Load settings from environment
  local auto_enhance = vim.fn.getenv("CCASP_AUTO_ENHANCE")
  M.state.auto_enhance = auto_enhance == "true" or opts.auto_enhance or false

  local enabled = vim.fn.getenv("CCASP_PROMPT_INJECTOR_ENABLED")
  M.state.enabled = enabled ~= "false" and (enabled == "true" or opts.enabled or false)

  -- Setup OpenAI
  local openai = get_openai()
  openai.setup(opts.openai)

  return M.state.enabled
end

-- Toggle prompt injector
function M.toggle()
  if M.state.enabled then
    M.state.enabled = false
    vim.notify("CCASP: Prompt Injector disabled", vim.log.levels.INFO)
  else
    local openai = get_openai()
    if not openai.is_available() then
      vim.notify(
        "CCASP: Cannot enable Prompt Injector - OpenAI API key not configured\n" ..
        "Add OPENAI_API_KEY to your .env file",
        vim.log.levels.WARN
      )
      return false
    end
    M.state.enabled = true
    vim.notify("CCASP: Prompt Injector enabled", vim.log.levels.INFO)
  end
  return M.state.enabled
end

-- Toggle auto-enhance mode
function M.toggle_auto_enhance()
  M.state.auto_enhance = not M.state.auto_enhance
  vim.notify(
    "CCASP: Auto-enhance " .. (M.state.auto_enhance and "enabled" or "disabled"),
    vim.log.levels.INFO
  )
  return M.state.auto_enhance
end

-- Intercept a prompt and open the editor
-- This is called when user submits a prompt in Claude terminal
function M.intercept(prompt, send_callback)
  if not M.state.enabled then
    -- Not enabled, just send directly
    if send_callback then
      send_callback(prompt)
    end
    return
  end

  M.state.intercepting = true
  M.state.last_prompt = prompt

  -- Check if auto-enhance is on
  if M.state.auto_enhance then
    -- Automatically enhance and show editor with enhanced version
    M.enhance_and_edit(prompt, send_callback)
  else
    -- Open editor with original prompt
    local editor = get_prompt_editor()
    editor.open({
      prompt = prompt,
      on_send = function(final_prompt)
        M.state.intercepting = false
        if send_callback then
          send_callback(final_prompt)
        end
      end,
      on_enhance = function(original, callback)
        M.enhance(original, callback)
      end,
      on_cancel = function()
        M.state.intercepting = false
        vim.notify("CCASP: Prompt cancelled", vim.log.levels.INFO)
      end,
    })
  end
end

-- Enhance a prompt using GPT-5.2
function M.enhance(prompt, callback)
  local openai = get_openai()

  if not openai.is_available() then
    vim.notify("CCASP: OpenAI not available - " .. (openai.get_error() or "unknown error"), vim.log.levels.ERROR)
    if callback then
      callback(nil, openai.get_error())
    end
    return
  end

  vim.notify("CCASP: Enhancing prompt with " .. openai.get_model() .. "...", vim.log.levels.INFO)

  openai.enhance_prompt(prompt, function(enhanced, err)
    if err then
      vim.notify("CCASP: Enhancement failed - " .. err, vim.log.levels.ERROR)
      if callback then
        callback(nil, err)
      end
      return
    end

    M.state.last_enhanced = enhanced
    vim.notify("CCASP: Prompt enhanced successfully", vim.log.levels.INFO)

    if callback then
      callback(enhanced, nil)
    end
  end)
end

-- Enhance and open editor with enhanced prompt
function M.enhance_and_edit(prompt, send_callback)
  M.enhance(prompt, function(enhanced, err)
    if err then
      -- Fall back to original prompt
      local editor = get_prompt_editor()
      editor.open({
        prompt = prompt,
        on_send = function(final_prompt)
          M.state.intercepting = false
          if send_callback then
            send_callback(final_prompt)
          end
        end,
        on_enhance = function(original, callback)
          M.enhance(original, callback)
        end,
        on_cancel = function()
          M.state.intercepting = false
        end,
      })
      return
    end

    -- Open editor with enhanced prompt
    local editor = get_prompt_editor()
    editor.open({
      prompt = enhanced,
      original = prompt,
      is_enhanced = true,
      on_send = function(final_prompt)
        M.state.intercepting = false
        if send_callback then
          send_callback(final_prompt)
        end
      end,
      on_enhance = function(original, callback)
        M.enhance(original, callback)
      end,
      on_cancel = function()
        M.state.intercepting = false
      end,
    })
  end)
end

-- Get status for display
function M.get_status()
  local openai = get_openai()
  local openai_status = openai.get_status()

  return {
    enabled = M.state.enabled,
    auto_enhance = M.state.auto_enhance,
    intercepting = M.state.intercepting,
    openai_available = openai_status.available,
    openai_model = openai_status.model,
    openai_error = openai_status.last_error,
    request_count = openai_status.request_count,
  }
end

-- Get status string for statusline
function M.get_statusline()
  if not M.state.enabled then
    return ""
  end

  local openai = get_openai()
  if not openai.is_available() then
    return " PI:ERR"
  end

  if M.state.intercepting then
    return " PI:..."
  end

  if M.state.auto_enhance then
    return " PI:AUTO"
  end

  return " PI:ON"
end

-- Quick enhance (for direct use without full editor)
function M.quick_enhance()
  -- Get current line or visual selection
  local mode = vim.fn.mode()
  local text

  if mode == "v" or mode == "V" then
    -- Visual mode - get selection
    vim.cmd('normal! "vy')
    text = vim.fn.getreg("v")
  else
    -- Normal mode - get current line
    text = vim.api.nvim_get_current_line()
  end

  if not text or text == "" then
    vim.notify("CCASP: No text to enhance", vim.log.levels.WARN)
    return
  end

  M.enhance(text, function(enhanced, err)
    if err then
      return
    end

    -- Open in editor
    local editor = get_prompt_editor()
    editor.open({
      prompt = enhanced,
      original = text,
      is_enhanced = true,
      on_send = function(final_prompt)
        -- Copy to clipboard and notify
        vim.fn.setreg("+", final_prompt)
        vim.notify("CCASP: Enhanced prompt copied to clipboard", vim.log.levels.INFO)
      end,
      on_cancel = function() end,
    })
  end)
end

return M
