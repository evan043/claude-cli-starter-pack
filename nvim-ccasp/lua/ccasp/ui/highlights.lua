-- CCASP Highlight Definitions
-- Modern, high-contrast theme with gradients, glow effects, and vivid colors
-- All highlight groups prefixed with "Ccasp" to avoid conflicts

local M = {}

-- Define all highlight groups
M.groups = {
  -- ─── Panel Backgrounds ───────────────────────────────────────
  CcaspPanelBg        = { bg = "#0a0a0a" },                    -- Near-black
  CcaspPanelBgAlt     = { bg = "#0d1117" },                    -- GitHub dark
  CcaspSidebarBg      = { bg = "#0d1117", fg = "#c9d1d9" },    -- Sidebar background
  CcaspTerminalBg     = { bg = "#000000" },                     -- Pure black for terminals
  CcaspTopbarBg       = { bg = "#0d1117" },                     -- Topbar background
  CcaspBottomBarBg    = { bg = "#0d1117" },                     -- Bottom control stripe

  -- ─── Headers & Titles ────────────────────────────────────────
  CcaspHeaderPrimary  = { fg = "#61afef", bold = true },        -- Bright blue
  CcaspHeaderSecondary = { fg = "#528bbc" },                    -- Medium blue
  CcaspTitle          = { fg = "#e5c07b", bg = "#1a2a3a", bold = true }, -- Gold on dark blue
  CcaspSubtitle       = { fg = "#abb2bf", italic = true },      -- Muted text

  -- ─── Borders & Separators (Glowing) ──────────────────────────
  CcaspBorderGlow     = { fg = "#00ff88" },                     -- Bright green glow
  CcaspBorderDim      = { fg = "#1a3a2a" },                     -- Dim green
  CcaspBorderActive   = { fg = "#61afef", bold = true },        -- Active window border
  CcaspBorderInactive = { fg = "#21262d" },                     -- Inactive window border
  CcaspSeparator      = { fg = "#1e3a5f" },                     -- Subtle blue glow
  CcaspSeparatorBright = { fg = "#3a7fcf" },                    -- Brighter separator
  CcaspWinSeparator   = { fg = "#1e3a5f", bg = "#010409" },    -- Window divider

  -- ─── Command List ────────────────────────────────────────────
  CcaspCmdName        = { fg = "#e5c07b", bold = true },        -- Gold command names
  CcaspCmdDesc        = { fg = "#5c6370", italic = true },      -- Dim description
  CcaspCmdSelected    = { fg = "#ffffff", bg = "#1a3a5f", bold = true }, -- Selected command
  CcaspCmdSection     = { fg = "#c678dd", bold = true },        -- Purple section headers
  CcaspCmdSectionIcon = { fg = "#e06c75" },                     -- Red section icons
  CcaspCmdUser        = { fg = "#98c379", bold = true },        -- Green for user commands
  CcaspCmdEssential   = { fg = "#61afef", bold = true },        -- Blue for essential
  CcaspCmdInnovative  = { fg = "#c678dd", bold = true },        -- Purple for innovative
  CcaspCmdRecent      = { fg = "#56b6c2" },                     -- Cyan for recent

  -- ─── Status Indicators (Vivid) ───────────────────────────────
  CcaspStatusOk       = { fg = "#50fa7b", bold = true },        -- Bright green
  CcaspStatusWarn     = { fg = "#f1fa8c", bold = true },        -- Bright yellow
  CcaspStatusError    = { fg = "#ff5555", bold = true },        -- Bright red
  CcaspStatusInfo     = { fg = "#8be9fd" },                     -- Bright cyan

  -- ─── Feature Toggles ────────────────────────────────────────
  CcaspToggleOn       = { fg = "#50fa7b", bold = true },        -- Bright green ON
  CcaspToggleOff      = { fg = "#6272a4" },                     -- Muted OFF
  CcaspToggleKey      = { fg = "#bd93f9", bold = true },        -- Purple keybinding

  -- ─── Topbar ──────────────────────────────────────────────────
  CcaspTopbarItem     = { fg = "#abb2bf", bg = "#0d1117" },     -- Normal item
  CcaspTopbarActive   = { fg = "#ffffff", bg = "#1a3a5f", bold = true }, -- Active item
  CcaspTopbarPinned   = { fg = "#e5c07b", bg = "#0d1117", bold = true }, -- Pinned
  CcaspTopbarSection  = { fg = "#6272a4", bg = "#0d1117" },     -- Section label
  CcaspTopbarOverflow = { fg = "#ff79c6", bg = "#0d1117", bold = true }, -- Overflow indicators

  -- ─── Bottom Control Stripe ───────────────────────────────────
  CcaspBarLabel       = { fg = "#61afef", bg = "#0d1117", bold = true }, -- Labels
  CcaspBarValue       = { fg = "#abb2bf", bg = "#0d1117" },     -- Values
  CcaspBarKey         = { fg = "#bd93f9", bg = "#0d1117", bold = true }, -- Key hints
  CcaspBarSep         = { fg = "#1e3a5f", bg = "#0d1117" },     -- Separators

  -- ─── Logo Animation ──────────────────────────────────────────
  CcaspLogoGlow1      = { fg = "#1a5a3a", bg = "#0a0a0a", bold = true }, -- Dim cyan
  CcaspLogoGlow2      = { fg = "#00cc66", bg = "#0a0a0a", bold = true }, -- Medium cyan
  CcaspLogoGlow3      = { fg = "#00ff88", bg = "#0a0a0a", bold = true }, -- Bright green
  CcaspLogoPrimary    = { fg = "#61afef", bg = "#0a0a0a", bold = true }, -- Settled blue
  CcaspLogoBorder     = { fg = "#1e3a5f", bg = "#0a0a0a" },     -- Logo border

  -- ─── Search ──────────────────────────────────────────────────
  CcaspSearchMatch    = { fg = "#f1fa8c", bold = true },        -- Search match highlight
  CcaspSearchSection  = { fg = "#c678dd", italic = true },      -- Section in results

  -- ─── Session Titlebars (enhanced) ────────────────────────────
  CcaspSessionActive  = { fg = "#ffffff", bg = "#1a3a5f", bold = true },
  CcaspSessionInactive = { fg = "#6272a4", bg = "#161b22" },
  CcaspSessionBtn     = { fg = "#ffff00", bg = "#1a3a5f", bold = true },

  -- ─── Misc ────────────────────────────────────────────────────
  CcaspMuted          = { fg = "#484e5b" },                     -- Very dim text
  CcaspAccent         = { fg = "#ff79c6" },                     -- Pink accent
  CcaspLink           = { fg = "#8be9fd", underline = true },   -- Clickable
}

-- Apply all highlight groups
function M.setup()
  for name, opts in pairs(M.groups) do
    vim.api.nvim_set_hl(0, name, opts)
  end
end

-- Get a highlight group name (for use in string formatting)
function M.hl(name)
  return "Ccasp" .. name
end

-- Get statusline/winbar highlight format
function M.fmt(group_name, text)
  return string.format("%%#%s#%s%%*", group_name, text)
end

return M
