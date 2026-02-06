-- ccasp/onboarding/pages.lua - Content definitions for all 8 onboarding pages
-- Each page returns { title, sections[], try_it? }

local M = {}

local diagrams = require("ccasp.onboarding.diagrams")
local icons = require("ccasp.ui.icons")

-- ═══════════════════════════════════════════════════════════════
-- Page 1: Welcome
-- ═══════════════════════════════════════════════════════════════
local function page_welcome()
  local ccasp = require("ccasp")
  return {
    title = "Welcome to CCASP.nvim",
    sections = {
      {
        type = "diagram",
        lines = diagrams.logo(),
      },
      {
        type = "text",
        text = "Welcome to the Claude CLI Advanced Starter Pack for Neovim! "
          .. "This guide will walk you through the key features and help you get productive quickly.",
      },
      {
        type = "header",
        icon = icons.star_filled,
        text = "Version " .. ccasp.version .. " (" .. ccasp.config.layout .. " layout)",
      },
      {
        type = "header",
        icon = icons.book,
        text = "Quick Start - Jump to any topic:",
      },
      {
        type = "list",
        items = {
          "[2] Layout Overview - See how everything fits together",
          "[3] Sidebar Guide - Navigate the 7-tab sidebar",
          "[4] Sessions & Terminals - Manage multiple Claude sessions",
          "[5] Panels & Dashboards - Floating panels and controls",
          "[6] Commands & Skills - All available slash commands",
          "[7] Updates & Maintenance - Keep CCASP up to date",
          "[8] Help & Resources - Wiki guides and getting help",
        },
      },
      {
        type = "tip",
        text = "Press a number key [1-8] to jump directly to any page, or [n]/[p] to navigate.",
      },
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 2: Layout Overview
-- ═══════════════════════════════════════════════════════════════
local function page_layout()
  return {
    title = icons.dashboard .. "  Layout Overview",
    sections = {
      {
        type = "text",
        text = "CCASP.nvim provides a complete terminal command center for managing Claude Code sessions. "
          .. "The layout consists of four main areas:",
      },
      {
        type = "diagram",
        lines = diagrams.layout_overview(),
      },
      {
        type = "header",
        icon = "󰆍",
        text = "Component Overview:",
      },
      {
        type = "table",
        rows = {
          { "Topbar", "Quick-access command strip (most-used slash commands)" },
          { "Sidebar", "7-tab navigation panel (Ctrl+B to toggle)" },
          { "Terminal Sessions", "Up to 4 Claude sessions in grid layout" },
          { "Control Stripe", "Status bar showing mode, sessions, model info" },
        },
      },
      {
        type = "tip",
        text = "The layout adapts to your config. Use 'classic', 'modern', or 'appshell' layout modes.",
      },
    },
    try_it = {
      description = "Toggle the sidebar with Ctrl+B",
      action = function()
        local ccasp = require("ccasp")
        ccasp.toggle_sidebar()
      end,
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 3: Sidebar Guide
-- ═══════════════════════════════════════════════════════════════
local function page_sidebar()
  return {
    title = icons.section .. "  Sidebar Guide",
    sections = {
      {
        type = "text",
        text = "The sidebar is your command center hub. It has 7 tabs, each providing different "
          .. "functionality for managing your Claude Code environment.",
      },
      {
        type = "diagram",
        lines = diagrams.sidebar_diagram(),
      },
      {
        type = "header",
        icon = icons.keyboard,
        text = "Sidebar Tabs:",
      },
      {
        type = "table",
        rows = {
          { "1. Commands", "Browse and run slash commands (/pr-merge, /deploy, etc.)" },
          { "2. Settings", "Toggle permissions mode, update preferences" },
          { "3. Protected", "Manage protected files list" },
          { "4. Status", "System health, sync status, version info" },
          { "5. Keys", "View and customize keybindings" },
          { "6. Assets", "Browse agents, hooks, and skills" },
          { "7. Shortcuts", "Quick access to common actions" },
        },
      },
      {
        type = "tip",
        text = "Press Tab to cycle through sidebar tabs, or click directly on a tab.",
      },
    },
    try_it = {
      description = "Open the sidebar and explore tabs",
      action = function()
        local ccasp = require("ccasp")
        if not ccasp.state.sidebar_open then
          ccasp.toggle_sidebar()
        end
      end,
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 4: Sessions & Terminals
-- ═══════════════════════════════════════════════════════════════
local function page_sessions()
  return {
    title = icons.terminal .. "  Sessions & Terminals",
    sections = {
      {
        type = "text",
        text = "CCASP supports up to 4 simultaneous Claude Code sessions. Each session runs "
          .. "in its own terminal buffer with independent context and history.",
      },
      {
        type = "diagram",
        lines = diagrams.session_grid(),
      },
      {
        type = "header",
        icon = icons.keyboard,
        text = "Session Keybindings:",
      },
      {
        type = "table",
        rows = {
          { "Ctrl+Shift+N", "Create a new Claude session" },
          { "Ctrl+Tab", "Switch to next session" },
          { "Ctrl+Shift+Tab", "Switch to previous session" },
          { "` (backtick)", "Quick toggle to next session" },
          { "~ (tilde)", "Quick toggle to previous session" },
          { "<leader>cS", "Open session picker" },
        },
      },
      {
        type = "tip",
        text = "Each session gets a colored indicator: green (active), dim (idle), red (error).",
      },
    },
    try_it = {
      description = "Create a new Claude session with Ctrl+Shift+N",
      action = function()
        local ccasp = require("ccasp")
        if ccasp.sessions then
          ccasp.sessions.spawn()
        end
      end,
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 5: Panels & Dashboards
-- ═══════════════════════════════════════════════════════════════
local function page_panels()
  return {
    title = icons.dashboard .. "  Panels & Dashboards",
    sections = {
      {
        type = "text",
        text = "CCASP provides floating panels for various management tasks. Panels can be "
          .. "moved, resized, minimized to the taskbar, and restored.",
      },
      {
        type = "diagram",
        lines = diagrams.panel_floating(),
      },
      {
        type = "header",
        icon = icons.keyboard,
        text = "Panel Keybindings (prefix: <leader>c):",
      },
      {
        type = "table",
        rows = {
          { "<leader>cd", "Open Dashboard (system status overview)" },
          { "<leader>cp", "Toggle Control Panel" },
          { "<leader>cf", "Open Feature Toggles" },
          { "<leader>ch", "Open Hook Manager" },
          { "<leader>cg", "Open Agent Grid" },
          { "_ (underscore)", "Minimize current panel to taskbar" },
          { "q / Esc", "Close current panel" },
        },
      },
      {
        type = "tip",
        text = "Minimized panels appear in the taskbar. Press <leader>cT to open the taskbar picker.",
      },
    },
    try_it = {
      description = "Open the Dashboard with <leader>cd",
      action = function()
        local ccasp = require("ccasp")
        if ccasp.panels and ccasp.panels.dashboard then
          ccasp.panels.dashboard.open()
        end
      end,
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 6: Commands & Skills
-- ═══════════════════════════════════════════════════════════════
local function page_commands()
  return {
    title = icons.commands .. "  Commands & Skills",
    sections = {
      {
        type = "header",
        icon = icons.deploy,
        text = "Essential Commands:",
      },
      {
        type = "table",
        rows = {
          { "/pr-merge", "Interactive PR merge with conflict resolution" },
          { "/deploy-full", "Parallel full-stack deployment" },
          { "/phase-dev-plan", "Create phased development plans" },
          { "/github-task-start", "Start tasks from GitHub Project Board" },
          { "/create-task-list", "AI-powered task list generation" },
        },
      },
      {
        type = "header",
        icon = icons.dev,
        text = "Development Commands:",
      },
      {
        type = "table",
        rows = {
          { "/refactor-analyze", "Deep complexity analysis" },
          { "/golden-master", "Generate characterization tests" },
          { "/e2e-test", "Run Playwright E2E tests" },
          { "/site-intel", "Website intelligence scanning" },
          { "/vision-init", "Initialize autonomous MVP development" },
        },
      },
      {
        type = "header",
        icon = icons.ai,
        text = "Skills (RAG-enhanced):",
      },
      {
        type = "table",
        rows = {
          { "/ask-claude", "Natural language command discovery" },
          { "/claude-audit", "Audit CLAUDE.md against best practices" },
          { "/codebase-explorer", "Analyze codebase structure" },
          { "/context-audit", "Analyze context token usage" },
        },
      },
      {
        type = "tip",
        text = "Use /ask-claude to discover commands by describing what you want to do!",
      },
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 7: Updates & Maintenance
-- ═══════════════════════════════════════════════════════════════
local function page_updates()
  return {
    title = icons.reload .. "  Updates & Maintenance",
    sections = {
      {
        type = "text",
        text = "CCASP can be updated to get the latest commands, hooks, agents, and features. "
          .. "The update system syncs template files while preserving your customizations.",
      },
      {
        type = "header",
        icon = icons.search,
        text = "Check for Updates:",
      },
      {
        type = "text",
        text = "Run /update-check in any Claude session, or use <leader>cu from Neovim.",
      },
      {
        type = "header",
        icon = icons.workflow,
        text = "Update Process (4 steps):",
      },
      {
        type = "list",
        items = {
          "Step 1: Run 'npm update -g claude-cli-advanced-starter-pack'",
          "Step 2: Run 'ccasp init' in your project directory",
          "Step 3: Restart Claude Code CLI to load new commands",
          "Step 4: Run :CcaspHealth to verify everything works",
        },
      },
      {
        type = "header",
        icon = icons.book,
        text = "What Gets Updated:",
      },
      {
        type = "table",
        rows = {
          { "Commands (.md)", "Slash command templates (always synced)" },
          { "Hooks (.js)", "Enforcement hooks (synced if enabled)" },
          { "Agents", "Agent definitions (opt-in sync)" },
          { "Skills", "RAG knowledge bases (preserved)" },
        },
      },
      {
        type = "tip",
        text = "Use /update-smart for intelligent updates that detect what changed and only sync needed files.",
      },
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page 8: Help & Resources
-- ═══════════════════════════════════════════════════════════════
local function page_help()
  return {
    title = icons.help .. "  Help & Resources",
    sections = {
      {
        type = "header",
        icon = icons.welcome,
        text = "In-App Help:",
      },
      {
        type = "list",
        items = {
          ":CcaspWelcome - Reopen this Getting Started guide anytime",
          ":CcaspHelp - Open the searchable Help panel (,?)",
          ":CcaspHealth - Run health diagnostics",
          "/ask-claude - Natural language help in Claude sessions",
        },
      },
      {
        type = "header",
        icon = icons.wiki,
        text = "Wiki Guides (11 topics):",
      },
      {
        type = "list",
        items = {
          "Getting Started - First-time setup walkthrough",
          "CCASP Wizard - Interactive project configuration",
          "Neovim Plugin - This plugin's features and config",
          "Vision & Epics - Autonomous MVP development system",
          "CI/CD Pipeline - Deployment automation",
          "PR Merge Guide - Interactive merge workflow",
          "Agents - L1/L2/L3 agent orchestration",
          "Hooks - Code enforcement hooks",
          "Skills - RAG-enhanced command packages",
          "MCP Servers - Model Context Protocol integrations",
          "Troubleshooting - Common issues and fixes",
        },
      },
      {
        type = "header",
        icon = icons.open_file,
        text = "GitHub Resources:",
      },
      {
        type = "link",
        text = "Repository: github.com/your-org/claude-cli-advanced-starter-pack",
      },
      {
        type = "link",
        text = "Issues: Report bugs or request features",
      },
      {
        type = "link",
        text = "Wiki: Full documentation and guides",
      },
      {
        type = "text",
        text = "",
      },
      {
        type = "tip",
        text = "Press [F] to finish the Getting Started guide. You can reopen anytime with :CcaspWelcome",
      },
    },
  }
end

-- ═══════════════════════════════════════════════════════════════
-- Page Registry
-- ═══════════════════════════════════════════════════════════════

local page_builders = {
  page_welcome,
  page_layout,
  page_sidebar,
  page_sessions,
  page_panels,
  page_commands,
  page_updates,
  page_help,
}

-- Get page data by number
function M.get_page(num)
  local builder = page_builders[num]
  if not builder then
    return {
      title = "Page Not Found",
      sections = {
        { type = "text", text = "Page " .. tostring(num) .. " does not exist." },
      },
    }
  end
  return builder()
end

-- Get total number of pages
function M.get_total_pages()
  return #page_builders
end

return M
