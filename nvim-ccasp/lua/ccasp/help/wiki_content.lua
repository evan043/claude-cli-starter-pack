-- ccasp/help/wiki_content.lua - Embedded wiki guides (11 topics)
-- Condensed versions of GitHub wiki pages for offline help access

local M = {}

local icons = require("ccasp.ui.icons")

-- All wiki topics with embedded content
local topics = {
  -- ═══════════════════════════════════════════════════════════
  -- 1. Getting Started
  -- ═══════════════════════════════════════════════════════════
  {
    id = "getting-started",
    title = "Getting Started",
    icon = icons.star_filled,
    description = "First-time setup and initial configuration",
    content = {
      "## Prerequisites",
      "- Node.js 18+ installed",
      "- Claude Code CLI installed (npm i -g @anthropic-ai/claude-code)",
      "- A Nerd Font in your terminal (for icons)",
      "- Neovim 0.10+ (for mouse drag support)",
      "",
      "## Installation",
      "- Install CCASP: npm install -g claude-cli-advanced-starter-pack",
      "- Navigate to your project directory",
      "- Run: ccasp init",
      "- Select a feature preset (A=Minimal, B=Standard, C=Full, D=Custom)",
      "- Restart Claude Code CLI to load new commands",
      "",
      "## Neovim Plugin Setup",
      "- Add to your lazy.nvim config:",
      '  { dir = "~/.local/share/ccasp/nvim-ccasp", config = true }',
      "- Or copy nvim-ccasp/ to your plugin directory",
      "- Configure layout: require('ccasp').setup({ layout = 'classic' })",
      "",
      "## First Steps",
      "- Open CCASP: <leader>cc",
      "- Browse commands in sidebar: Tab 1",
      "- Run /ask-claude to discover features",
      "- Check health: :CcaspHealth",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 2. CCASP Wizard
  -- ═══════════════════════════════════════════════════════════
  {
    id = "wizard",
    title = "CCASP Wizard",
    icon = icons.ai,
    description = "Interactive project configuration wizard",
    content = {
      "## Overview",
      "The CCASP Wizard provides a mobile-friendly, single-character input setup",
      "experience for configuring your project with Claude Code.",
      "",
      "## Running the Wizard",
      "- Terminal: ccasp wizard",
      "- Claude session: /ccasp-setup",
      "",
      "## What It Configures",
      "- Tech stack detection (auto-scans package.json, configs)",
      "- Feature presets (Minimal, Standard, Full, Custom)",
      "- GitHub integration (issues, PR templates, project boards)",
      "- Deployment targets (Cloudflare, Railway, Vercel, etc.)",
      "- Agent configuration (L1 orchestrator, L2 specialists)",
      "- Hook installation (code style, security, commit format)",
      "",
      "## Feature Presets",
      "- A = Minimal: Menu + help only",
      "- B = Standard: GitHub + phased dev (recommended)",
      "- C = Full: All features including deployment",
      "- D = Custom: Pick individual features",
      "",
      "## After Setup",
      "- Restart Claude Code CLI",
      "- New slash commands appear in /help",
      "- Run :CcaspHealth in Neovim to verify",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 3. Neovim Plugin
  -- ═══════════════════════════════════════════════════════════
  {
    id = "neovim-plugin",
    title = "Neovim Plugin",
    icon = icons.terminal,
    description = "Plugin features, layouts, and configuration",
    content = {
      "## Layout Modes",
      "- classic: Sidebar (left) + Terminal (right) - traditional layout",
      "- modern: Floating panels only - minimal layout",
      "- appshell: Icon rail + flyout + header/footer - IDE-like layout",
      "",
      "## Classic Layout",
      "- 7-tab sidebar with commands, settings, status",
      "- Terminal integration with Claude sessions",
      "- Topbar with quick-access commands",
      "- Bottom control stripe with status info",
      "",
      "## Appshell Layout",
      "- Icon rail (3-col) on left - click to expand flyout",
      "- Header with session tabs",
      "- Content area for terminal sessions",
      "- Footer with status and minimized taskbar items",
      "- Right panel (optional) for context info",
      "",
      "## Key Configuration Options",
      "- layout: 'classic' | 'modern' | 'appshell'",
      "- sidebar.width: Width of sidebar (default: 40)",
      "- terminal.shell: Shell command (default: 'claude')",
      "- keys.prefix: Keymap prefix (default: '<leader>c')",
      "- window_manager.enabled: Enable move/resize (default: true)",
      "- browser_tabs.enabled: Session tabs (default: true)",
      "",
      "## Multi-Session Terminal",
      "- Up to 4 concurrent Claude sessions",
      "- Each session in its own terminal buffer",
      "- Quick toggle with backtick (`) key",
      "- Session titlebar with name and status indicator",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 4. Vision & Epics
  -- ═══════════════════════════════════════════════════════════
  {
    id = "vision-epics",
    title = "Vision & Epics",
    icon = icons.workflow,
    description = "Autonomous MVP development with vision-driven planning",
    content = {
      "## Vision System",
      "The Vision system transforms natural language prompts into",
      "structured development plans with full autonomous execution.",
      "",
      "## Creating a Vision",
      "- Run /vision-init with a description of what you want to build",
      "- CCASP generates: VISION.json, wireframes, architecture, roadmaps",
      "- Review and approve the plan",
      "- Run /vision-run to start autonomous execution",
      "",
      "## Epic System",
      "- /create-github-epic creates a parent issue with child phase issues",
      "- Each phase has a phase-dev-plan JSON with tasks",
      "- Progress tracked via GitHub issue checkboxes",
      "- /github-epic-status shows progress dashboard",
      "",
      "## Phase Development",
      "- Each phase contains 3-7 tasks",
      "- Tasks have file paths, estimated lines, dependencies",
      "- Validation gates ensure quality between phases",
      "- /phase-track monitors progress",
      "",
      "## Roadmaps",
      "- /create-roadmap for multi-phase project planning",
      "- /roadmap-status shows cross-phase progress",
      "- /roadmap-track coordinates execution",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 5. CI/CD Pipeline
  -- ═══════════════════════════════════════════════════════════
  {
    id = "cicd",
    title = "CI/CD Pipeline",
    icon = icons.deploy,
    description = "Deployment automation for frontend and backend",
    content = {
      "## Full-Stack Deployment",
      "- /deploy-full: Parallel deployment of frontend + backend",
      "- Frontend: Cloudflare Pages (wrangler pages deploy)",
      "- Backend: Railway MCP (deployment_trigger)",
      "",
      "## Frontend (Cloudflare)",
      "- npm run build to generate dist/",
      "- npx wrangler pages deploy dist --project-name=<name>",
      "- Or use /cloudflare-deploy slash command",
      "",
      "## Backend (Railway)",
      "- Uses Railway MCP server for deployment",
      "- Requires project ID, environment ID, service ID",
      "- Deployment triggered via API, not git push",
      "- Logs viewable via mcp__railway-mcp-server__deployment_logs",
      "",
      "## Deployment Safety",
      "- Always build and test before deploying",
      "- /deploy-full runs both targets in parallel",
      "- Check deployment status with MCP tools",
      "- Railway auto-deploy is disabled - use MCP or slash commands",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 6. PR Merge Guide
  -- ═══════════════════════════════════════════════════════════
  {
    id = "pr-merge",
    title = "PR Merge Guide",
    icon = icons.git_branch,
    description = "Interactive PR merge with conflict resolution",
    content = {
      "## Overview",
      "/pr-merge provides a guided workflow for merging PRs with",
      "safety checks, conflict resolution, and contributor messaging.",
      "",
      "## Workflow Steps",
      "- 1. Fetch PR details and check status",
      "- 2. Verify all checks pass (CI, reviews, etc.)",
      "- 3. Identify and resolve any blockers",
      "- 4. Handle merge conflicts if present",
      "- 5. Execute merge with chosen strategy",
      "- 6. Post-merge cleanup (delete branch, notify)",
      "",
      "## Merge Strategies",
      "- Merge commit: Preserves full history",
      "- Squash: Single clean commit on target",
      "- Rebase: Linear history, replays commits",
      "",
      "## Blocker Resolution",
      "- Missing reviews: Request or approve",
      "- Failed checks: Investigate and fix",
      "- Conflicts: Interactive resolution",
      "- Stale branch: Update from base",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 7. Agents
  -- ═══════════════════════════════════════════════════════════
  {
    id = "agents",
    title = "Agents",
    icon = icons.agents,
    description = "L1/L2/L3 agent orchestration system",
    content = {
      "## Agent Hierarchy",
      "- L1 Orchestrator: Coordinates the overall workflow",
      "- L2 Specialists: Domain experts (frontend, backend, testing, etc.)",
      "- L3 Workers: Atomic task executors for parallel subtasks",
      "",
      "## Creating Agents",
      "- /create-agent: Interactive agent builder",
      "- ccasp create-agent: CLI-based creation",
      "- Agents live in .claude/agents/",
      "",
      "## Agent Types",
      "- Frontend: React, Vue, Angular, Svelte specialists",
      "- Backend: FastAPI, Express, Django, NestJS specialists",
      "- Testing: Playwright, Vitest, Jest specialists",
      "- Deployment: Cloudflare, Railway specialists",
      "- Database: PostgreSQL, Prisma specialists",
      "",
      "## Agent Grid",
      "- <leader>cg opens the Agent Grid panel",
      "- Shows all running agents with status",
      "- <leader>cR restarts all, <leader>cK kills all",
      "",
      "## Delegation",
      "- delegation.json controls agent-only mode",
      "- Exempt patterns allow git, gh, npm commands",
      "- Useful for autonomous workflows",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 8. Hooks
  -- ═══════════════════════════════════════════════════════════
  {
    id = "hooks",
    title = "Hooks",
    icon = icons.hook,
    description = "Code enforcement and validation hooks",
    content = {
      "## Overview",
      "Hooks are JavaScript scripts that enforce coding standards,",
      "security rules, and project conventions automatically.",
      "",
      "## Creating Hooks",
      "- /create-hook: Interactive hook builder",
      "- ccasp create-hook: CLI-based creation",
      "- Hooks live in .claude/hooks/tools/",
      "",
      "## Hook Types",
      "- PreToolUse: Runs before a tool is used",
      "- PostToolUse: Runs after a tool completes",
      "- Notification: Fires on events",
      "",
      "## AI Constitution Framework",
      "- /ai-constitution-framework: Configure code rules",
      "- YAML schema at .claude/config/constitution.yaml",
      "- Presets: senior (5%), minimal (2%), strict (15%)",
      "- Enforces: naming, architecture, security, git conventions",
      "",
      "## Managing Hooks",
      "- :CcaspHooks panel shows installed hooks",
      "- Enable/disable via settings panel",
      "- Hooks synced on ccasp init (if enabled)",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 9. Skills
  -- ═══════════════════════════════════════════════════════════
  {
    id = "skills",
    title = "Skills",
    icon = icons.ai,
    description = "RAG-enhanced command packages",
    content = {
      "## Overview",
      "Skills are RAG-enhanced command packages that combine",
      "a Markdown knowledge base with structured retrieval.",
      "",
      "## Creating Skills",
      "- /create-skill: Interactive skill builder",
      "- ccasp create-skill: CLI-based creation",
      "- Skills live in .claude/skills/<name>/",
      "",
      "## Skill Structure",
      "- skill.json: Manifest with metadata",
      "- skill.md: Main knowledge base document",
      "- Additional .md files for domain knowledge",
      "",
      "## Built-in Skills",
      "- ask-claude: Natural language command discovery",
      "- claude-audit: CLAUDE.md validation",
      "- codebase-explorer: Architecture analysis",
      "- context-audit: Token usage analysis",
      "",
      "## How RAG Works",
      "- Skills embed domain knowledge in Markdown",
      "- Claude retrieves relevant sections on query",
      "- No vector database needed - uses Markdown structure",
      "- Fast, offline, deterministic retrieval",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 10. MCP Servers
  -- ═══════════════════════════════════════════════════════════
  {
    id = "mcp-servers",
    title = "MCP Servers",
    icon = icons.config,
    description = "Model Context Protocol server integrations",
    content = {
      "## Overview",
      "MCP (Model Context Protocol) servers extend Claude's capabilities",
      "by providing tools for external services and APIs.",
      "",
      "## Discovery",
      "- /explore-mcp: Discover servers for your tech stack",
      "- ccasp explore-mcp: CLI-based discovery",
      "- Auto-detects based on tech-stack.json",
      "",
      "## Common MCP Servers",
      "- Railway: Deployment management",
      "- GitHub: Repository operations",
      "- Playwright: Browser automation",
      "- DigitalOcean: Infrastructure management",
      "- Context7: Documentation retrieval",
      "",
      "## Configuration",
      "- MCP servers configured in Claude Code settings",
      "- Each server provides specific tools",
      "- Tools appear in Claude's tool list",
      "- Use ToolSearch to find specific tools",
      "",
      "## Site Intelligence",
      "- /site-intel: Website scanning and analysis",
      "- Powered by site-intel MCP server",
      "- Scan, summarize, graph, recommend",
      "- Dev-scan for developer-focused analysis",
    },
  },

  -- ═══════════════════════════════════════════════════════════
  -- 11. Troubleshooting
  -- ═══════════════════════════════════════════════════════════
  {
    id = "troubleshooting",
    title = "Troubleshooting",
    icon = icons.status,
    description = "Common issues, diagnostics, and fixes",
    content = {
      "## Health Check",
      "- Run :CcaspHealth in Neovim",
      "- Checks: Claude CLI, CCASP CLI, .claude dir, dependencies",
      "- Reports Neovim version compatibility",
      "",
      "## Common Issues",
      "",
      "## Commands not appearing",
      "- Restart Claude Code CLI after ccasp init",
      "- Check .claude/commands/ directory exists",
      "- Verify files are .md format",
      "",
      "## Sidebar not opening",
      "- Ensure layout is set to 'classic'",
      "- Check for errors: :messages",
      "- Try :CcaspDashboard as alternative",
      "",
      "## Terminal not connecting",
      "- Verify 'claude' command is in PATH",
      "- Check terminal.shell config option",
      "- Try manual: :terminal claude",
      "",
      "## Icons not displaying",
      "- Install a Nerd Font (e.g., JetBrains Mono Nerd Font)",
      "- Set terminal font to Nerd Font variant",
      "- Restart terminal emulator",
      "",
      "## Performance issues",
      "- Reduce session count (default max: 4)",
      "- Disable unused features in config",
      "- Check :CcaspHealth for module load errors",
      "",
      "## Getting More Help",
      "- GitHub Issues: Report bugs or request features",
      "- Wiki: Full documentation",
      "- /ask-claude: AI-powered help in Claude sessions",
    },
  },
}

-- Get the full topic list (for menu display)
function M.get_topic_list()
  local list = {}
  for _, topic in ipairs(topics) do
    table.insert(list, {
      id = topic.id,
      title = topic.title,
      icon = topic.icon,
      description = topic.description,
    })
  end
  return list
end

-- Get a specific topic by ID
function M.get_topic(topic_id)
  for _, topic in ipairs(topics) do
    if topic.id == topic_id then
      return topic
    end
  end
  return nil
end

-- Get all topics (for search indexing)
function M.get_all_topics()
  return topics
end

-- Search topics by query string
function M.search(query)
  if not query or query == "" then
    return {}
  end

  local results = {}
  local lower_query = query:lower()

  for _, topic in ipairs(topics) do
    local score = 0

    -- Title match (highest weight)
    if topic.title:lower():find(lower_query, 1, true) then
      score = score + 10
    end

    -- Description match
    if topic.description and topic.description:lower():find(lower_query, 1, true) then
      score = score + 5
    end

    -- Content match
    for _, line in ipairs(topic.content or {}) do
      if line:lower():find(lower_query, 1, true) then
        score = score + 1
      end
    end

    if score > 0 then
      table.insert(results, {
        topic = topic,
        score = score,
        id = topic.id,
        title = topic.title,
        icon = topic.icon,
      })
    end
  end

  -- Sort by score descending
  table.sort(results, function(a, b) return a.score > b.score end)

  return results
end

return M
