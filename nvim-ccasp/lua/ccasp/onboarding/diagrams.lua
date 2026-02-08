-- ccasp/onboarding/diagrams.lua - ASCII diagram builders for welcome pages
-- Dashboard-style cards with ╭╮╰╯ borders, consistent with CCASP theme

local M = {}

-- Full workspace layout overview (Page 2)
function M.layout_overview()
  return {
    "╭──────────────────────────────────────────────╮",
    "│  ╭── Topbar ─────────────────────────────╮   │",
    "│  │ /pr-merge /deploy /phase-dev /site ..  │   │",
    "│  ╰────────────────────────────────────────╯   │",
    "│                                                │",
    "│  ╭── Sidebar ──╮  ╭── Terminal ───────────╮   │",
    "│  │ Commands     │  │ ╭────────╮ ╭────────╮│   │",
    "│  │ Settings     │  │ │ Sess 1 │ │ Sess 2 ││   │",
    "│  │ Protected    │  │ ╰────────╯ ╰────────╯│   │",
    "│  │ Status       │  │ ╭────────╮ ╭────────╮│   │",
    "│  │ Keys         │  │ │ Sess 3 │ │ Sess 4 ││   │",
    "│  │ Assets       │  │ ╰────────╯ ╰────────╯│   │",
    "│  ╰──────────────╯  ╰──────────────────────╯   │",
    "│                                                │",
    "│  ╭── Status Bar ─────────────────────────╮   │",
    "│  │ Mode: Auto │ Sessions: 4 │ v1.5.0     │   │",
    "│  ╰────────────────────────────────────────╯   │",
    "╰────────────────────────────────────────────────╯",
  }
end

-- Sidebar tab diagram (Page 3)
function M.sidebar_diagram()
  return {
    "╭──── Sidebar Panel ────────────╮",
    "│                                │",
    "│   [1]  Commands               │",
    "│   [2]  Settings               │",
    "│   [3]  Protected              │",
    "│   [4]  Status                 │",
    "│   [5]  Keys                   │",
    "│   [6]  Assets                 │",
    "│   [7]  Shortcuts              │",
    "│                                │",
    "│   Navigate:  Tab / Click       │",
    "│   Toggle:    Ctrl+B            │",
    "│                                │",
    "╰────────────────────────────────╯",
  }
end

-- Session grid (Page 4)
function M.session_grid()
  return {
    "╭──── Session Management ───────────────╮",
    "│                                        │",
    "│   ╭────────────╮   ╭────────────╮     │",
    "│   │  Session 1  │   │  Session 2  │     │",
    "│   │  Active     │   │  claude     │     │",
    "│   │  running    │   │  idle       │     │",
    "│   ╰────────────╯   ╰────────────╯     │",
    "│                                        │",
    "│   ╭────────────╮   ╭────────────╮     │",
    "│   │  Session 3  │   │  Session 4  │     │",
    "│   │  claude     │   │  claude     │     │",
    "│   │  idle       │   │  idle       │     │",
    "│   ╰────────────╯   ╰────────────╯     │",
    "│                                        │",
    "│   Ctrl+Shift+N = New Session           │",
    "│   Ctrl+Tab     = Next Session          │",
    "│                                        │",
    "╰────────────────────────────────────────╯",
  }
end

-- Floating panel showcase (Page 5)
function M.panel_floating()
  return {
    "╭──── Floating Panels ──────────────────╮",
    "│                                        │",
    "│   Background workspace                 │",
    "│   ╭────────────────────────╮           │",
    "│   │                        │           │",
    "│   │  ╭─── Dashboard ────╮  │           │",
    "│   │  │  System Status   │  │           │",
    "│   │  │  Token Usage     │  │           │",
    "│   │  │  Active Agents   │  │           │",
    "│   │  ╰──────────────────╯  │           │",
    "│   │                        │           │",
    "│   ╰────────────────────────╯           │",
    "│                                        │",
    "│   ,d = Dashboard   ,p = Control Panel  │",
    "│   ,f = Features    ,h = Hook Manager   │",
    "│   _  = Minimize    q/Esc = Close       │",
    "│                                        │",
    "╰────────────────────────────────────────╯",
  }
end

-- CCASP logo for welcome page (Page 1)
function M.logo()
  return {
    "   ██████╗  ██████╗  █████╗  ███████╗ ██████╗ ",
    "  ██╔════╝ ██╔════╝ ██╔══██╗ ██╔════╝ ██╔══██╗",
    "  ██║      ██║      ███████║ ███████╗ ██████╔╝",
    "  ██║      ██║      ██╔══██║ ╚════██║ ██╔═══╝ ",
    "  ╚██████╗ ╚██████╗ ██║  ██║ ███████║ ██║     ",
    "   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝     ",
    "",
    "  Claude CLI Advanced Starter Pack for Neovim",
  }
end

-- Appshell layout diagram
function M.appshell_layout()
  return {
    "╭──── Appshell Layout ──────────────────────╮",
    "│ ╭── Header ─────────────────────────────╮  │",
    "│ │ Project │ Session 1 │ Session 2        │  │",
    "│ ╰────────────────────────────────────────╯  │",
    "│ ╭──╮╭────────╮╭──────────────────╮╭──────╮ │",
    "│ │  ││ Flyout ││                  ││Right │ │",
    "│ │R ││        ││  Terminal        ││Panel │ │",
    "│ │a ││ (on    ││  Content         ││      │ │",
    "│ │i ││ click) ││                  ││(opt) │ │",
    "│ │l ││        ││  Claude sessions ││      │ │",
    "│ ╰──╯╰────────╯╰──────────────────╯╰──────╯ │",
    "╰──────────────────────────────────────────────╯",
  }
end

return M
