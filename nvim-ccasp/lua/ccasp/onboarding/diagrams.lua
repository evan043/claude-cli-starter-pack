-- ccasp/onboarding/diagrams.lua - ASCII diagram builders for welcome pages
-- Returns line tables for embedding in page content

local M = {}

-- Full workspace layout overview (Page 2)
function M.layout_overview()
  return {
    "┌─────────────────────────────────────────────────────────────┐",
    "│  ╔══ Topbar ══════════════════════════════════════════════╗ │",
    "│  ║  /pr-merge  /deploy  /phase-dev  /site-intel  ...     ║ │",
    "│  ╚═══════════════════════════════════════════════════════╝ │",
    "│                                                             │",
    "│  ┌─── Sidebar ───┐  ┌─── Terminal Sessions ──────────────┐ │",
    "│  │  Commands      │  │  ┌──────────┐  ┌──────────┐      │ │",
    "│  │  Settings      │  │  │ Session 1 │  │ Session 2 │      │ │",
    "│  │  Protected     │  │  │  (claude) │  │  (claude) │      │ │",
    "│  │  Status        │  │  └──────────┘  └──────────┘      │ │",
    "│  │  Keys          │  │  ┌──────────┐  ┌──────────┐      │ │",
    "│  │  Assets        │  │  │ Session 3 │  │ Session 4 │      │ │",
    "│  │  Shortcuts     │  │  │  (claude) │  │  (claude) │      │ │",
    "│  └────────────────┘  │  └──────────┘  └──────────┘      │ │",
    "│                      └───────────────────────────────────┘ │",
    "│  ╔══ Control Stripe ══════════════════════════════════════╗ │",
    "│  ║  Mode: Auto │ Sessions: 4 │ Model: sonnet │ v1.4.0   ║ │",
    "│  ╚═══════════════════════════════════════════════════════╝ │",
    "└─────────────────────────────────────────────────────────────┘",
  }
end

-- Sidebar tab diagram (Page 3)
function M.sidebar_diagram()
  return {
    "┌────── Sidebar Panel ──────┐",
    "│                            │",
    "│  [1] 󰆍 Commands           │",
    "│  [2]  Settings            │",
    "│  [3] 󰒃 Protected          │",
    "│  [4]  Status              │",
    "│  [5]  Keys                │",
    "│  [6]  Assets              │",
    "│  [7] 󰌌 Shortcuts          │",
    "│                            │",
    "│  Navigate: Tab / Click     │",
    "│  Toggle:   Ctrl+B          │",
    "│                            │",
    "└────────────────────────────┘",
  }
end

-- Color-coded session grid (Page 4)
function M.session_grid()
  return {
    "┌─── Session Management ────────────────────────┐",
    "│                                                 │",
    "│   ┌──────────────┐   ┌──────────────┐          │",
    "│   │  Session 1   │   │  Session 2   │          │",
    "│   │   Active     │   │   claude     │          │",
    "│   │  ● running   │   │  ○ idle      │          │",
    "│   └──────────────┘   └──────────────┘          │",
    "│                                                 │",
    "│   ┌──────────────┐   ┌──────────────┐          │",
    "│   │  Session 3   │   │  Session 4   │          │",
    "│   │   claude     │   │   claude     │          │",
    "│   │  ○ idle      │   │  ○ idle      │          │",
    "│   └──────────────┘   └──────────────┘          │",
    "│                                                 │",
    "│   Ctrl+Shift+N = New     ` = Quick toggle      │",
    "│   Ctrl+Tab = Next        ~ = Previous           │",
    "│                                                 │",
    "└─────────────────────────────────────────────────┘",
  }
end

-- Floating panel showcase (Page 5)
function M.panel_floating()
  return {
    "┌─── Floating Panels ───────────────────────────┐",
    "│                                                 │",
    "│   Background workspace                          │",
    "│   ┌──────────────────────────┐                  │",
    "│   │                          │                  │",
    "│   │    ╔═══ Dashboard ═══╗   │                  │",
    "│   │    ║  System Status  ║   │                  │",
    "│   │    ║  Token Usage    ║   │                  │",
    "│   │    ║  Active Agents  ║   │                  │",
    "│   │    ╚════════════════╝   │                  │",
    "│   │                          │                  │",
    "│   └──────────────────────────┘                  │",
    "│                                                 │",
    "│   ,d = Dashboard    ,p = Control Panel          │",
    "│   ,f = Features     ,h = Hook Manager           │",
    "│   _ = Minimize      q/Esc = Close               │",
    "│                                                 │",
    "└─────────────────────────────────────────────────┘",
  }
end

-- CCASP logo for welcome page (Page 1)
function M.logo()
  return {
    "     ██████╗  ██████╗  █████╗  ███████╗ ██████╗ ",
    "    ██╔════╝ ██╔════╝ ██╔══██╗ ██╔════╝ ██╔══██╗",
    "    ██║      ██║      ███████║ ███████╗ ██████╔╝",
    "    ██║      ██║      ██╔══██║ ╚════██║ ██╔═══╝ ",
    "    ╚██████╗ ╚██████╗ ██║  ██║ ███████║ ██║     ",
    "     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝     ",
    "",
    "    Claude CLI Advanced Starter Pack for Neovim",
  }
end

-- Appshell layout diagram (alternative layout reference)
function M.appshell_layout()
  return {
    "┌─── Appshell Layout ──────────────────────────────┐",
    "│ ╔═ Header ══════════════════════════════════════╗ │",
    "│ ║  Project │ Session 1 │ Session 2 │ Session 3  ║ │",
    "│ ╚═══════════════════════════════════════════════╝ │",
    "│ ┌──┐┌────────┐┌────────────────────────┐┌──────┐ │",
    "│ │  ││ Flyout ││                        ││Right │ │",
    "│ │R ││        ││     Terminal Content    ││Panel │ │",
    "│ │a ││ (on    ││                        ││      │ │",
    "│ │i ││ click) ││     Claude sessions    ││(opt) │ │",
    "│ │l ││        ││     run here           ││      │ │",
    "│ │  ││        ││                        ││      │ │",
    "│ └──┘└────────┘└────────────────────────┘└──────┘ │",
    "│ ╔═ Footer ══════════════════════════════════════╗ │",
    "│ ║  Mode │ Model │ Sessions │ Taskbar │ Version  ║ │",
    "│ ╚═══════════════════════════════════════════════╝ │",
    "└──────────────────────────────────────────────────┘",
  }
end

return M
