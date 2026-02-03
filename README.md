# Claude CLI Advanced Starter Pack (CCASP)

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                          v2.2.5   •  Production Ready                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![npm version](https://badge.fury.io/js/claude-cli-advanced-starter-pack.svg)](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

<div align="center">

### Your entire Claude Code setup — customized for your stack — deployed in one command.

```bash
npx claude-cli-advanced-starter-pack init
```

[Quick Start](#quick-start) • [What You Get](#what-you-get) • [📚 Wiki](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki) • [Roadmap](#roadmap)

</div>

---

## The Problem

Every new project means:
- ❌ Manually creating `.claude/` folders and configurations
- ❌ Copy-pasting commands, hooks, and agents from old projects
- ❌ Forgetting critical settings and enforcement hooks
- ❌ Agents that don't understand your tech stack
- ❌ Hours of setup before you can actually build

## The Solution

**One command. Fully configured. Stack-aware.**

```bash
npx claude-cli-advanced-starter-pack init
```

CCASP scans your project, detects your stack (React? FastAPI? Prisma? Playwright?), and deploys a complete `.claude/` folder with:

- ✅ **56 slash commands** — deployment, testing, refactoring, GitHub sync
- ✅ **42 enforcement hooks** — validation, progress tracking, agent orchestration
- ✅ **Stack-specific agents** — specialists that know your frameworks
- ✅ **Smart updates** — add features without losing customizations

---

## What You Get

| Component | Count | Examples |
|-----------|-------|----------|
| **Slash Commands** | 56 | `/deploy-full`, `/pr-merge`, `/ralph`, `/phase-dev-plan` |
| **Enforcement Hooks** | 42 | Token tracking, agent orchestration, refactor safety |
| **Tech Stack Detection** | 55+ | React, Vue, FastAPI, Express, Prisma, Playwright |
| **Agent Templates** | L1/L2/L3 | Orchestrators → Specialists → Workers |
| **MCP Integrations** | 50+ | Railway, Cloudflare, GitHub, Playwright |
| **Skills (RAG)** | 5 | agent-creator, hook-creator, refactor patterns |

---

## See It In Action

<details>
<summary><strong>📸 Screenshots Gallery</strong> (click to expand/collapse)</summary>

<br>

### Desktop UI

<table>
<tr>
<td align="center" width="50%">
<strong>/menu — Interactive Navigation</strong><br><br>
<a href="./assets/screenshots/desktop/menu.jpg">
<img src="./assets/screenshots/desktop/menu.jpg" alt="CCASP Desktop Menu" width="400">
</a>
<br><em>Full-featured menu with all options</em>
</td>
<td align="center" width="50%">
<strong>Project Configuration Settings</strong><br><br>
<a href="./assets/screenshots/desktop/project-settings.jpg">
<img src="./assets/screenshots/desktop/project-settings.jpg" alt="CCASP Project Settings" width="400">
</a>
<br><em>GitHub, deployment, tunnels, tokens</em>
</td>
</tr>
</table>

### Mobile UI (Happy.engineering)

<table>
<tr>
<td align="center" width="50%">
<strong>/menu — Mobile Navigation</strong><br><br>
<a href="./assets/screenshots/mobile/menu.jpg">
<img src="./assets/screenshots/mobile/menu.jpg" alt="CCASP Mobile Menu" width="400">
</a>
<br><em>Single-key navigation, 40-char width</em>
</td>
<td align="center" width="50%">
<strong>Setup Wizard — Feature Selection</strong><br><br>
<a href="./assets/screenshots/mobile/setup-wizard.jpg">
<img src="./assets/screenshots/mobile/setup-wizard.jpg" alt="CCASP Setup Wizard" width="400">
</a>
<br><em>Choose commands, agents, hooks, skills</em>
</td>
</tr>
<tr>
<td align="center" width="50%">
<strong>GitHub Project Setup</strong><br><br>
<a href="./assets/screenshots/mobile/github-setup.jpg">
<img src="./assets/screenshots/mobile/github-setup.jpg" alt="GitHub Project Setup" width="400">
</a>
<br><em>One-click repo and Project Board sync</em>
</td>
<td align="center" width="50%">
<strong>/claude-audit — Analysis Report</strong><br><br>
<a href="./assets/screenshots/mobile/claude-audit-1.jpg">
<img src="./assets/screenshots/mobile/claude-audit-1.jpg" alt="Claude Audit Report" width="400">
</a>
<br><em>CLAUDE.md analysis with score</em>
</td>
</tr>
<tr>
<td align="center" width="50%">
<strong>Audit Score Breakdown</strong><br><br>
<a href="./assets/screenshots/mobile/claude-audit-2.jpg">
<img src="./assets/screenshots/mobile/claude-audit-2.jpg" alt="Audit Score Breakdown" width="400">
</a>
<br><em>Detailed scoring and summary</em>
</td>
<td align="center" width="50%">
<strong>Actionable Recommendations</strong><br><br>
<a href="./assets/screenshots/mobile/recommendations.jpg">
<img src="./assets/screenshots/mobile/recommendations.jpg" alt="Audit Recommendations" width="400">
</a>
<br><em>Priority-ordered improvements</em>
</td>
</tr>
</table>

</details>

---

## Highlight Features

<table>
<tr>
<td width="50%">

### 🎯 Stack-Aware Agents

Auto-generates agents that *know* your tech:
- React + Zustand + Tailwind specialist
- FastAPI + SQLAlchemy backend agent
- Playwright E2E testing expert
- PostgreSQL + Prisma database agent

</td>
<td width="50%">

### 🔄 Ralph Loop Testing

Continuous test-fix cycle until green:
```bash
/ralph --watch
```
Runs tests → Parses failures → Fixes code → Repeats.

**Smart Recovery**: Every 3rd failed attempt deploys a web search agent to find best-practice solutions for stubborn bugs or implementation issues.

Max 10 iterations. Stops on 3x same failure.

</td>
</tr>
<tr>
<td width="50%">

### 🗺️ Multi-Phase Roadmaps

Coordinate full-stack, multi-feature development:
```bash
/create-roadmap "Q1 Feature Sprint"
```
- Break epics into phased milestones
- GitHub issue tracking per phase
- Customizable Project Board sync
- Dependency graphs with auto-ordering
- Progress dashboard across all phases

</td>
<td width="50%">

### 🚀 One-Command Deployment

Full-stack deploy to Railway + Cloudflare:
```bash
/deploy-full
```
- Backend and frontend in parallel
- Pre-flight validation
- Automatic rollback on failure

</td>
</tr>
<tr>
<td width="50%">

### 📋 Phased Development

Break complex features into phases:
```bash
/phase-dev-plan "Add user authentication"
```
- 95%+ success probability planning
- PROGRESS.json state tracking
- GitHub issue sync
- L1/L2/L3 agent orchestration

</td>
<td width="50%">

### 🔀 Safe PR Merges

9-phase merge workflow with safety:
```bash
/pr-merge
```
- Auto-stash uncommitted changes
- Resolve conflicts, CI failures, reviews
- Automatic rollback on any failure

</td>
</tr>
<tr>
<td width="50%">

### 🎫 GitHub Epic System

Multi-issue epic workflows:
```bash
/create-github-epic "Auth System"
```
- Creates parent epic with child issues
- Tracks completion across all issues
- Auto-syncs with Project Board
- Progress comments on epic issue

</td>
<td width="50%">

### 📱 Mobile-First UI

Works with [Happy.engineering](https://github.com/slopus/happy):
- 40-character max width
- Card-based layouts
- Single-character inputs
- Auto-detected via environment

</td>
</tr>
</table>

---

## Architecture

After running `ccasp init`, your project gets:

```
.claude/
├── commands/              # 56 slash commands
│   ├── menu.md           # Interactive navigation
│   ├── deploy-full.md    # Full-stack deployment
│   ├── ralph.md          # Test-fix loops
│   └── ...
├── agents/                # Stack-specific AI agents
│   ├── react-specialist.md
│   ├── fastapi-specialist.md
│   └── ...
├── hooks/                 # 42 enforcement hooks
│   ├── ralph-loop-enforcer.js
│   ├── progress-tracker.js
│   └── ...
├── skills/                # RAG-enhanced packages
├── config/
│   └── tech-stack.json    # Your detected stack
└── settings.json          # Project configuration
```

**Everything is customized** to your `package.json`, config files, and directory structure.

---

## Quick Start

```bash
# Step 1: Install
npm install -g claude-cli-advanced-starter-pack

# Step 2: Initialize (detects your stack, deploys .claude/)
ccasp init

# Step 3: Restart Claude Code CLI (required for new commands)
claude .

# Step 4: Use slash commands
/menu
```

### One-Time Use (No Install)

```bash
npx claude-cli-advanced-starter-pack init
```

---

## Roadmap

### 🚀 Coming Soon

| Feature | Status |
|---------|--------|
| **Jira Integration** | 🔨 In Development |
| **Linear Sync** | 🔨 In Development |
| **ClickUp Integration** | 📋 Planned |
| **Vision Driver Bot (VDB) v2** | 🔨 In Development |
| **Autonomous Lint Fixing** | 🔨 In Development |
| **Multi-Repo Orchestration** | 📋 Planned |

---

## Version History

### v2.2.5
**Dev Mode Smart Sync & Wizard UX** — Feb 2026
- **Smart Sync for Dev Mode**: New `smart-sync.js` utility preserves user customizations when syncing from worktree
- **Menu Worktree Sync**: `[W] Sync from Worktree` option appears during dev mode with sync status banner
- **`/dev-mode-deploy-to-projects`**: New slash command with `--dry-run`, `--force`, `--project` options
- **`/menu-happy`**: Dedicated mobile menu command (40-char width) — auto-detection removed from `/menu`
- **Wizard UX Improvements**: Reinstall option, accurate template counts, better mismatch handling (#64)
- **Hook Migration**: Hooks migrated from `.js` to `.cjs` for CommonJS compatibility

### v2.2.4
**E2E Testing Integration & Happy Mode Fix** — Feb 2025
- **Comprehensive E2E Testing Integration**: Deep Playwright integration with credential injection, tunnel services, and Ralph Loop configuration
- **Happy Mode Detection Fix**: BREAKING - `HAPPY_SERVER_URL` alone no longer triggers mobile mode; requires active session indicators
- **GitHub Integration Improvements**: Enhanced error handling, cleaner issue parsing, refined MCP handling
- **Screenshot Gallery**: Added 6 screenshots showcasing desktop and mobile UI
- **Developer Guides**: New wiki sections for forking, local development, contributing, and npm updates

### v2.2.3
**Security & Packaging** — Feb 2025
- Removed hardcoded paths from npm package
- Improved template portability

### v2.2.0
**Vision Driver Bot & GitHub Epics** — Jan 2025
- **Vision Driver Bot (VDB)**: Autonomous development with lint fixes
- **GitHub Epic System**: Multi-issue epic workflows with `/create-github-epic`
- **Init for New Projects**: `/init-ccasp-new-project` for Happy users
- **Modular Commands**: 7 large files refactored for maintainability

[Full v2.2.0 Release Notes →](https://github.com/evan043/claude-cli-advanced-starter-pack/releases/tag/v2.2.0)

[View All Releases →](https://github.com/evan043/claude-cli-advanced-starter-pack/releases)

---

## Top Features

### Vision Driver Bot (VDB) *(Actively Being Developed)*

Autonomous development workflows with automatic lint fixes:

```
VDB State (.claude/vdb/state.json)
├── Current task tracking
├── Lint error queue
├── Fix history
└── Session metrics

Workflow: Detect lint errors → Queue fixes → Apply → Verify
```

### GitHub Epic System *(Actively Being Developed)*

Multi-issue epic workflows:

```bash
/create-github-epic "User Authentication System"
```
- Creates parent epic issue
- Links child issues automatically
- Tracks completion across issues
- Syncs with Project Board

### Agent Orchestration

Hierarchical agent execution:

```
L1 Orchestrator (You / Main Conversation)
├── L2 Frontend Specialist (Sonnet)
│   ├── L3 Component Search Worker (Haiku)
│   └── L3 Style Analyzer Worker (Haiku)
├── L2 Backend Specialist (Sonnet)
│   └── L3 API Discovery Worker (Haiku)
├── L2 Testing Specialist (Sonnet)
└── L2 Deployment Specialist (Sonnet)
```

### Refactoring System

```bash
# Continuous test-fix until green
/ralph --watch

# Characterization tests before refactoring
/golden-master src/utils/calculate.ts

# Guided 8-step refactoring workflow
/refactor-workflow
```

### Neovim Plugin *(Actively Being Developed)*

```lua
-- lazy.nvim
{
  "evan043/nvim-ccasp",
  config = function()
    require("ccasp").setup({
      keymaps = {
        panel = "<leader>cp",
        grid = "<leader>cg",
        dashboard = "<leader>cd",
      },
    })
  end,
}
```

Features: Multi-agent grid, control panel, Telescope integration, statusline.

### Happy.engineering Mobile UI

Auto-detected. Mobile-optimized formatting:

```
┌────────────────────────────────────┐
│ [1] Issue #42                      │
│ Add JWT authentication             │
├────────────────────────────────────┤
│ Status: Ready                      │
│ Priority: High                     │
│ @johndoe • 2h ago                  │
└────────────────────────────────────┘
```

### PR Merge Workflow

```bash
/pr-merge        # Current branch
/pr-merge 123    # Specific PR
/pr-merge --dry-run
```

9 phases: Identify → Checkpoint → Detect blockers → Resolve → Message → Merge method → Execute → Cleanup → Summary

### Roadmap Orchestration

```bash
ccasp create-roadmap          # Mode A: Natural language → phases
ccasp roadmap import          # Mode B: GitHub issues → phases

/roadmap-status               # Progress dashboard
/roadmap-edit                 # Reorder, merge, split phases
/roadmap-track                # Execute with dependency checking
```

---

## Commands Reference

### Terminal Commands (No AI)

| Command | Description |
|---------|-------------|
| `ccasp wizard` | Vibe-friendly setup wizard |
| `ccasp init` | Deploy to project |
| `ccasp detect-stack` | Auto-detect tech stack |
| `ccasp create-agent` | Create L1/L2/L3 agents |
| `ccasp create-hook` | Create enforcement hooks |
| `ccasp explore-mcp` | MCP server discovery |

### Slash Commands (AI-Powered)

| Command | Description |
|---------|-------------|
| `/menu` | Interactive navigation |
| `/deploy-full` | Full-stack deployment |
| `/pr-merge` | Safe PR merge workflow |
| `/ralph` | Test-fix loops |
| `/phase-dev-plan` | Phased development |
| `/create-github-epic` | Epic workflows |
| `/refactor-workflow` | Guided refactoring |
| `/golden-master` | Characterization tests |

[Full Commands Reference →](./docs/WIKI.md)

---

## Hook Templates (42)

| Category | Hooks |
|----------|-------|
| **Token & Session** | token-usage-monitor, session-id-generator, context-guardian |
| **Deployment** | branch-merge-checker, deployment-orchestrator |
| **Refactoring** | ralph-loop-enforcer, refactor-verify, refactor-transaction |
| **Agent Orchestration** | hierarchy-validator, progress-tracker, l2-completion-reporter |
| **Happy.engineering** | happy-mode-detector, happy-checkpoint-manager |

---

## Tech Stack Detection

Detects 55+ frameworks by reading project files (no AI):

| Category | Detected |
|----------|----------|
| **Frontend** | React, Vue, Angular, Svelte, Next.js, Nuxt, Astro |
| **Backend** | FastAPI, Express, NestJS, Django, Flask, Rails |
| **Database** | PostgreSQL, MySQL, MongoDB, SQLite, Redis |
| **ORM** | Prisma, TypeORM, SQLAlchemy, Drizzle |
| **Testing** | Jest, Vitest, Playwright, Cypress, pytest |
| **Deployment** | Railway, Vercel, Netlify, Cloudflare |

---

## MCP Server Integration

```bash
ccasp explore-mcp              # Interactive menu
ccasp explore-mcp --recommend  # Auto-recommend for your stack
```

| Category | Servers |
|----------|---------|
| **Testing** | Playwright, Puppeteer, Skyvern |
| **Deployment** | Railway, Cloudflare, Vercel |
| **Database** | PostgreSQL, Supabase, Redis |
| **Tunnel** | ngrok, Cloudflare Tunnel |

---

## Contributing

```bash
git clone https://github.com/evan043/claude-cli-advanced-starter-pack.git
cd claude-cli-advanced-starter-pack
npm install
npm run lint
npm test
```

[Contributing Guidelines →](./CONTRIBUTING.md)

---

## License

MIT © [evan043](https://github.com/evan043)

---

<div align="center">

**Stop configuring Claude Code for every project.**
**CCASP gives you a complete, stack-customized setup in one command.**

[Get Started](#quick-start) • [Documentation](./docs/WIKI.md) • [Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues) • [npm](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)

</div>
