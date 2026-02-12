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
  CcaspTitle          = { fg = "#56b6c2", bg = "#0d1520", bold = true }, -- Teal on dark slate
  CcaspSubtitle       = { fg = "#abb2bf", italic = true },      -- Muted text

  -- ─── Borders & Separators (Glowing) ──────────────────────────
  CcaspBorderGlow     = { fg = "#1e3a5f" },                     -- Subtle blue glow (matches theme)
  CcaspBorderDim      = { fg = "#1a3a2a" },                     -- Dim green
  CcaspBorderActive   = { fg = "#61afef", bold = true },        -- Active window border
  CcaspBorderInactive = { fg = "#21262d" },                     -- Inactive window border
  CcaspSeparator      = { fg = "#1e3a5f" },                     -- Subtle blue glow
  CcaspSeparatorBright = { fg = "#3a7fcf" },                    -- Brighter separator
  CcaspWinSeparator   = { fg = "#1e3a5f", bg = "#010409" },    -- Window divider

  -- ─── Command List ────────────────────────────────────────────
  CcaspCmdName        = { fg = "#61afef", bold = true },        -- Blue command names
  CcaspCmdDesc        = { fg = "#5c6370", italic = true },      -- Dim description
  CcaspCmdSelected    = { fg = "#ffffff", bg = "#1a3a5f", bold = true }, -- Selected command
  CcaspCmdSection     = { fg = "#56b6c2", bold = true },        -- Teal section headers
  CcaspCmdSectionIcon = { fg = "#3a7fcf" },                     -- Medium blue section icons
  CcaspCmdUser        = { fg = "#98c379", bold = true },        -- Green for user commands
  CcaspCmdEssential   = { fg = "#61afef", bold = true },        -- Blue for essential
  CcaspCmdInnovative  = { fg = "#56b6c2", bold = true },        -- Teal for innovative
  CcaspCmdRecent      = { fg = "#5fafff" },                     -- Steel blue for recent

  -- ─── Status Indicators (Vivid) ───────────────────────────────
  CcaspStatusOk       = { fg = "#50fa7b", bold = true },        -- Bright green
  CcaspStatusWarn     = { fg = "#d19a66", bold = true },        -- Warm amber
  CcaspStatusError    = { fg = "#ff5555", bold = true },        -- Bright red
  CcaspStatusInfo     = { fg = "#8be9fd" },                     -- Bright cyan

  -- ─── Feature Toggles ────────────────────────────────────────
  CcaspToggleOn       = { fg = "#50fa7b", bold = true },        -- Bright green ON
  CcaspToggleOff      = { fg = "#6272a4" },                     -- Muted OFF
  CcaspToggleKey      = { fg = "#5fafff", bold = true },        -- Steel blue keybinding

  -- ─── Topbar ──────────────────────────────────────────────────
  CcaspTopbarItem     = { fg = "#abb2bf", bg = "#0d1117" },     -- Normal item
  CcaspTopbarActive   = { fg = "#ffffff", bg = "#1a3a5f", bold = true }, -- Active item
  CcaspTopbarPinned   = { fg = "#56b6c2", bg = "#0d1117", bold = true }, -- Pinned (teal)
  CcaspTopbarSection  = { fg = "#6272a4", bg = "#0d1117" },     -- Section label
  CcaspTopbarOverflow = { fg = "#5fafff", bg = "#0d1117", bold = true }, -- Overflow indicators

  -- ─── Bottom Control Stripe ───────────────────────────────────
  CcaspBarLabel       = { fg = "#61afef", bg = "#0d1117", bold = true }, -- Labels
  CcaspBarValue       = { fg = "#abb2bf", bg = "#0d1117" },     -- Values
  CcaspBarKey         = { fg = "#5fafff", bg = "#0d1117", bold = true }, -- Key hints (steel blue)
  CcaspBarSep         = { fg = "#1e3a5f", bg = "#0d1117" },     -- Separators

  -- ─── Logo Animation ──────────────────────────────────────────
  CcaspLogoGlow1      = { fg = "#1e3a5f", bg = "#0a0a0a", bold = true }, -- Dim blue
  CcaspLogoGlow2      = { fg = "#3a7fcf", bg = "#0a0a0a", bold = true }, -- Medium blue
  CcaspLogoGlow3      = { fg = "#61afef", bg = "#0a0a0a", bold = true }, -- Bright blue
  CcaspLogoPrimary    = { fg = "#61afef", bg = "#0a0a0a", bold = true }, -- Settled blue
  CcaspLogoBorder     = { fg = "#1e3a5f", bg = "#0a0a0a" },     -- Logo border

  -- ─── Search ──────────────────────────────────────────────────
  CcaspSearchMatch    = { fg = "#61afef", bold = true },        -- Search match highlight (blue)
  CcaspSearchSection  = { fg = "#56b6c2", italic = true },      -- Section in results (teal)

  -- ─── Session Titlebars (enhanced) ────────────────────────────
  CcaspSessionActive  = { fg = "#ffffff", bg = "#1a3a5f", bold = true },
  CcaspSessionInactive = { fg = "#6272a4", bg = "#161b22" },
  CcaspSessionBtn     = { fg = "#56b6c2", bg = "#1a3a5f", bold = true },

  -- ─── Misc ────────────────────────────────────────────────────
  CcaspMuted          = { fg = "#484e5b" },                     -- Very dim text
  CcaspAccent         = { fg = "#56b6c2" },                     -- Teal accent
  CcaspLink           = { fg = "#8be9fd", underline = true },   -- Clickable

  -- ─── Appshell: Icon Rail ───────────────────────────────────
  CcaspIconRailBg     = { bg = "#080810", fg = "#6272a4" },     -- Dark rail background
  CcaspIconRailItem   = { fg = "#6272a4", bg = "#080810" },     -- Normal icon
  CcaspIconRailActive = { fg = "#61afef", bg = "#0d1a2a", bold = true }, -- Active icon
  CcaspIconRailHover  = { fg = "#abb2bf", bg = "#080810" },     -- Hovered icon

  -- ─── Appshell: Header ─────────────────────────────────────
  CcaspHeaderBg       = { bg = "#0d1117" },                     -- Header background
  CcaspHeaderTitle    = { fg = "#61afef", bg = "#0d1117", bold = true }, -- Project name (blue)
  CcaspHeaderTab      = { fg = "#6272a4" },                     -- Inactive session tab (no bg)
  CcaspHeaderTabActive = { fg = "#ffffff", bold = true },       -- Active tab (no bg)
  CcaspHeaderGrad1    = { fg = "#101820", bg = "#0d1117" },     -- Gradient: barely visible
  CcaspHeaderGrad2    = { fg = "#1a2a3f", bg = "#0d1117" },     -- Gradient: very dim navy
  CcaspHeaderGrad3    = { fg = "#2a4a6a", bg = "#0d1117" },     -- Gradient: dim steel
  CcaspHeaderArt      = { fg = "#4a8fbf", bg = "#0d1117", bold = true }, -- Logo text: muted steel blue
  CcaspHeaderSub      = { fg = "#2a4a6a", bg = "#0d1117" },     -- Subtitle: dim blue

  -- ─── Appshell: Layer Tabs ─────────────────────────────────
  CcaspLayerTab       = { fg = "#6272a4" },                     -- Inactive layer tab (no bg)
  CcaspLayerTabActive = { fg = "#ffffff", bold = true },        -- Active layer tab (no bg)

  -- ─── Session Activity States ───────────────────────────────
  CcaspHeaderTabWorking = { fg = "#d19a66", bold = true },  -- Orange (Claude streaming, no bg)
  CcaspHeaderTabDone    = { fg = "#50fa7b", bold = true },  -- Green (output finished, no bg)

  -- ─── Active Session Tab (underline indicator preserves status color) ──
  CcaspHeaderTabActiveIdle    = { fg = "#c8ccd4", underline = true },              -- Neutral active (bright grey + underline)
  CcaspHeaderTabActiveWorking = { fg = "#d19a66", bold = true, underline = true }, -- Orange active (streaming + underline)
  CcaspHeaderTabActiveDone    = { fg = "#50fa7b", bold = true, underline = true }, -- Green active (finished + underline)

  -- ─── Appshell: Footer ─────────────────────────────────────
  CcaspFooterBg       = { bg = "#0d1117" },                     -- Footer background
  CcaspFooterLabel    = { fg = "#61afef", bg = "#0d1117", bold = true }, -- Labels
  CcaspFooterValue    = { fg = "#abb2bf", bg = "#0d1117" },     -- Values
  CcaspFooterSep      = { fg = "#1e3a5f", bg = "#0d1117" },     -- Separators
  CcaspFooterTaskbar  = { fg = "#5fafff", bg = "#0d1117" },     -- Minimized items (steel blue)

  -- ─── Appshell: Flyout ─────────────────────────────────────
  CcaspFlyoutBg       = { bg = "#0d1117", fg = "#c9d1d9" },     -- Flyout background
  CcaspFlyoutBorder   = { fg = "#1e3a5f" },                     -- Flyout border
  CcaspFlyoutTitle    = { fg = "#61afef", bg = "#0d1117", bold = true }, -- Section title
  CcaspFlyoutItem     = { fg = "#abb2bf", bg = "#0d1117" },     -- List item
  CcaspFlyoutItemActive = { fg = "#ffffff", bg = "#1a3a5f", bold = true }, -- Selected item
  CcaspFlyoutPanelBorder = { fg = "#3a7fcf", bg = "#0d1117", bold = true }, -- Panel header box border
  CcaspFlyoutPanelName   = { fg = "#ffffff", bg = "#0f1a2e", bold = true }, -- Panel header name

  -- ─── Appshell: Right Panel ────────────────────────────────
  CcaspRightPanelBg   = { bg = "#0d1117", fg = "#c9d1d9" },     -- Right panel background
  CcaspRightPanelBorder = { fg = "#1e3a5f" },                   -- Right panel border

  -- ─── Onboarding / Getting Started ───────────────────────
  CcaspOnboardingTitle   = { fg = "#61afef", bold = true },       -- Page title (bright blue)
  CcaspOnboardingHeader  = { fg = "#56b6c2", bold = true },       -- Section header (teal)
  CcaspOnboardingDiagram = { fg = "#3a7fcf" },                    -- ASCII diagram (medium blue)
  CcaspOnboardingKey     = { fg = "#5fafff", bold = true },       -- Keybinding (steel blue)
  CcaspOnboardingTip     = { fg = "#3a9f8f", italic = true },     -- Tip text (muted teal)
  CcaspOnboardingTryIt   = { fg = "#56b6c2", bold = true },       -- Try-it action (teal)
  CcaspOnboardingNav     = { fg = "#3a5a7f" },                    -- Navigation hints (dark blue)
  CcaspOnboardingPage    = { fg = "#4a5568", italic = true },     -- Page indicator (slate)
  CcaspOnboardingLink    = { fg = "#5fafff", underline = true },  -- Links (steel blue)
  CcaspOnboardingLogo    = { fg = "#61afef", bold = true },       -- Logo (bright blue)
  CcaspOnboardingCard    = { fg = "#1e3a5f" },                    -- Card borders (dark blue)
  CcaspOnboardingCardTitle = { fg = "#56b6c2", bold = true },     -- Card section title (teal)

  -- ─── Help System ────────────────────────────────────────
  CcaspHelpTitle   = { fg = "#61afef", bold = true },             -- Help panel title (blue)
  CcaspHelpTopic   = { fg = "#61afef" },                          -- Topic list item
  CcaspHelpSearch  = { fg = "#61afef", bold = true },             -- Search match (blue)

  -- ─── Neovide: Window Control Buttons ───────────────────
  CcaspCloseBtn    = { fg = "#e06c75", bg = "#0d1117", bold = true }, -- Red close button
  CcaspMaxBtn      = { fg = "#98c379", bg = "#0d1117", bold = true }, -- Green maximize button
  CcaspMinBtn      = { fg = "#e5c07b", bg = "#0d1117", bold = true }, -- Yellow minimize button
  CcaspResizeGrip  = { fg = "#6272a4", bg = "#0d1117" },              -- Resize grip indicator

  -- ─── Todo Panel ─────────────────────────────────────────
  CcaspTodoTagBadge      = { fg = "#56b6c2", bold = true },               -- Tag badge (teal)
  CcaspTodoTagActive     = { fg = "#0d1117", bg = "#56b6c2", bold = true }, -- Active tag filter (inverted)
  CcaspTodoPriorityCrit  = { fg = "#ff5555", bold = true },                -- Critical priority (red)
  CcaspTodoPriorityHigh  = { fg = "#d19a66", bold = true },                -- High priority (amber)
  CcaspTodoSortActive    = { fg = "#5fafff", bold = true },                -- Active sort mode (steel blue)
  CcaspTodoFormLabel     = { fg = "#61afef", bold = true },                -- Form field label (blue)
  CcaspTodoFormBorder    = { fg = "#1e3a5f" },                              -- Form field border
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
