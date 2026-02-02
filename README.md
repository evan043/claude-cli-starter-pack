# Claude CLI Advanced Starter Pack (CCASP)

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                          v2.2.2   •  Production Ready                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![npm version](https://badge.fury.io/js/claude-cli-advanced-starter-pack.svg)](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A professional-grade CLI toolkit for Claude Code CLI — 100+ components including 40 hooks, 34 commands, 18 agent templates, 5 skills, MCP servers, refactoring system, mobile UI, and GitHub integration.**

```bash
npm install -g claude-cli-advanced-starter-pack
```

[Getting Started](#quick-start) • [📚 Wiki](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki) • [Documentation](./docs/WIKI.md) • [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [What's New in v2.0](#whats-new-in-v20)
- [Agent Orchestration](#agent-orchestration)
- [Key Features](#key-features)
- [Refactoring System](#refactoring-system)
- [Project Scaffolding](#project-scaffolding)
- [Auto-Generated Agents](#auto-generated-agents)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation Options](#installation-options)
- [Commands Reference](#commands-reference)
- [Hook Templates](#hook-templates)
- [Agent Patterns](#agent-patterns)
- [Utility Scripts](#utility-scripts)
- [Configuration](#configuration)
- [Template Engine](#template-engine)
- [API Reference](#api-reference)
- [Tech Stack Detection](#tech-stack-detection)
- [Feature Presets](#feature-presets)
- [MCP Server Integration](#mcp-server-integration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

CCASP is a **two-phase toolkit** that extends Claude Code CLI capabilities:

| Phase | Environment | AI Required | Purpose |
|-------|-------------|-------------|---------|
| **Phase 1: Terminal** | Shell (bash/PowerShell) | No | File-based detection, scaffolding, template processing |
| **Phase 2: Claude Code** | Inside Claude CLI | Yes | AI-powered slash commands, agents, workflows |

### What This Means for You

1. **Terminal Commands** (`ccasp wizard`, `ccasp init`) run **without AI** — they read your project files and generate configuration
2. **Slash Commands** (`/menu`, `/deploy-full`) run **inside Claude Code CLI** with full AI capabilities

---

## What's New in v2.2

**Major release with Vision Driver Bot, GitHub Epics, and CI improvements!**

### Vision Driver Bot (VDB) - v2.2.0 - NEW!
- **Autonomous Development**: VDB drives development workflows with automatic lint fixes
- **State Management**: Persistent state tracking across sessions
- **Integration**: Works with existing agent hierarchy (L1/L2/L3)

### GitHub Epic System - v2.2.0 - NEW!
- **Epic Creation**: `/create-github-epic` for multi-issue epic workflows
- **Testing Integration**: Automated test suite for epic management (#50)
- **Progress Tracking**: Epic status synced with Project Board

### Init for New Projects - v2.2.0 - NEW!
- **`/init-ccasp-new-project`**: One-shot project initialization for Happy users
- **Project Intent Collection**: Gathers project goals and requirements
- **Full Workflow**: Detect stack → Configure → Deploy → Verify

### CI/CD Improvements - v2.2.1-v2.2.2
- **Auto-Detection**: Automatically detects CI environment and skips interactive prompts
- **Integration Tests**: Simplified tests verify CCASP installation correctly
- **Path Fixes**: Corrected tech-stack.json paths in CI workflows

### Modular Architecture - v2.2.0
- **Command Refactoring**: 7 large command files modularized (#51-#57)
- **Improved Maintainability**: Smaller, focused modules
- **Better Testing**: Easier to test individual components

---

## What's New in v2.0

**Major release with Neovim integration and mobile improvements!**

### Neovim Plugin - nvim-ccasp (v2.0.0)
- **Multi-Agent Grid**: Run 6 Claude CLI sessions in aligned grid layout
- **Control Panel**: Floating panel for feature toggles, model selection
- **Feature Toggles**: Enable/disable CCASP features without editing JSON
- **Hook Manager**: Visual management of Pre/Post tool use hooks
- **Dashboard**: Project overview with token usage, installed components
- **Telescope Integration**: Browse commands, skills, hooks with fuzzy finding
- **Statusline Components**: Token usage, agent status for lualine

### Happy.engineering Mobile UI (v1.8.30)
- **Auto-Detection**: Detects Happy CLI via environment variables (HAPPY_HOME_DIR, HAPPY_SERVER_URL, HAPPY_WEBAPP_URL, HAPPY_EXPERIMENTAL, HAPPY_SESSION)
- **Mobile-Optimized Formatting**: 40-character max width, card-based layouts
- **Word-Aware Wrapping**: Text wraps at word boundaries (no mid-word breaks)
- **Box-Drawing Characters**: Consistent UI with ┌─┐│├┤└┘
- **Updated Commands**: `/menu`, `/pr-merge`, `/menu-issues-list`, `/ccasp-panel` all support mobile formatting
- **`happy-mode-detector` Hook**: Runs on session start, caches detection for 4 hours

### PR Merge Command (v1.8.29)
- **`/pr-merge`**: Interactive PR merge with 9-phase workflow
- **Safety Checkpoint**: Stashes changes, records state before any modifications
- **Automatic Rollback**: Reverts on any failure
- **Blocker Resolution**: Handles draft, outdated, conflicts, CI failures, pending reviews
- **Contributor Messaging**: Thank-you messages before merge
- **Mobile Card Layout**: PR selection with mobile-friendly cards

### Smart Update System (v1.8.28)
- **Smart Update Mode (A)**: Protects customizations while adding new features
- **Full Overwrite Mode (B)**: Replaces all .claude/ assets (preserves config)
- **Auto-Repair Hooks**: Outdated hooks repaired during `ccasp init`
- **`/update-smart`**: New command for intelligent updates

### Roadmap Orchestration Framework (v1.8.27)
- **Manual Builder (Mode A)**: Natural language to structured phases
- **GitHub Integration (Mode B)**: Issue import with table selection, epic hierarchy
- **Commands**: `/roadmap-status`, `/roadmap-edit`, `/roadmap-track`
- **Storage**: `.claude/roadmaps/{slug}.json`, `.claude/phase-plans/{slug}/`
- **Auto-Advance**: Dependency checking, progress tracking

### Happy.engineering Fixes (v1.8.31)
- **401 Auth Error Fix**: Resolved authentication error by unsetting HAPPY_SERVER_URL before launch
- **PowerShell Launch**: Clean environment inheritance for Windows users

### Dev Mode & Utilities (v1.8.26)
- **Dev Mode**: `ccasp init --dev` for rapid template testing
- **Project Backup**: Automatic backup before overwrites (`.ccasp-backup/`)
- **Configurable Co-Authors**: `commit.coAuthors` in tech-stack.json

### Agent Orchestration System (v1.8.24)
- **Hierarchical Agent Execution**: L1 Orchestrator → L2 Specialists → L3 Workers
- **Automatic PROGRESS.json Updates**: Agents report completion, state auto-updates
- **GitHub Issue Sync**: Progress comments pushed to linked issues
- **Enforcement Hooks**: 11 new hooks for hierarchy validation, error recovery, audit logging
- **L2 Domain Specialists**: Frontend, backend, testing, deployment experts
- **L3 Worker Templates**: Search, analyze, validate, lint workers (Haiku model for cost efficiency)
- **Error Recovery**: Retry/escalate/abort strategies with max retry limits
- **Audit Logging**: All agent actions logged to `.claude/logs/orchestrator-audit.jsonl`
- **`/orchestration-guide`**: Quick reference for spawning agents and completion formats

### Roadmap Orchestration Framework (v1.8.27)
- **Manual Builder (Mode A)**: Natural language to structured phases
- **GitHub Integration (Mode B)**: Issue import with table selection, epic hierarchy
- **Dependency Graphs**: Automatic cycle detection, topological ordering
- **Commands**: `/roadmap-status`, `/roadmap-edit`, `/roadmap-track`
- **Storage**: `.claude/roadmaps/{slug}.json`, `.claude/phase-plans/{slug}/`
- **Phase-Dev Integration**: Auto-generate PROGRESS.json from roadmap phases
- **Execution Tracking**: Dependency checking, progress tracking, auto-advance
- **GitHub Epic Hierarchy**: Auto-create epic → child issue structure

### Refactoring System (v1.8.19-1.8.22)
- **`/ralph`**: Ralph Loop - continuous test-fix cycles until all tests pass
- **`/refactor-workflow`**: Guided refactoring with branch, task list, GitHub issue, and specialist agent
- **`/refactor-analyze`**: Deep complexity analysis and code smell detection
- **`/golden-master`**: Characterization tests before refactoring
- **`/project-explorer`**: Fresh project scaffolding wizard for empty directories
- **4 new hooks**: `ralph-loop-enforcer`, `refactor-verify`, `refactor-audit`, `refactor-transaction`
- **2 new skills**: `refactor-react`, `refactor-fastapi`

### Auto-Generated Agents (v1.8.16-1.8.18)
- **Stack-specific agents**: Auto-generate L1/L2/L3 agents from detected tech stack
- **18 agent templates**: React, Vue, FastAPI, Express, Prisma, Playwright, and more
- **Delegation hooks**: `task-classifier`, `agent-delegator`, `delegation-enforcer`
- **Agent-only mode**: Enforce agent usage for complex tasks

### Previous Features
- **`ccasp init --dev`**: Dev mode for rapid template testing
- **Mobile-optimized menus**: Single-char inputs for Happy.Engineering

**100+ components** across 11 implementation phases:

| Phase | Version | Components |
|-------|---------|------------|
| Phase 1-2 | v1.1-1.2 | **26 Hook Templates** — token, session, deployment, refactoring |
| Phase 3 | v1.3 | **5 Skill Templates** — agent-creator, hook-creator, refactor-react, refactor-fastapi |
| Phase 4 | v1.4 | **15 Command Templates** — refactoring, testing, scaffolding |
| Phase 5 | v1.5 | **5 Documentation Templates** — architecture, gotchas, checklists |
| Phase 6 | v1.6 | **5 Agent Patterns** — L1→L2, multi-phase, query pipeline, Ralph Loop |
| Phase 7 | v1.7 | **7 MCP Servers** — log-monitor, browser-monitor, tunnel services |
| Phase 8 | v1.8 | **7 Utility Scripts** — deployment validation, roadmap scanning |
| Phase 9 | v1.8.16 | **18 Agent Templates** — framework-specific specialists |
| Phase 10 | v1.8.19 | **Refactoring System** — 5 commands, 4 hooks, 2 skills |
| Phase 11 | v1.8.27-30 | **Mobile UI, PR Merge, Roadmaps** — Happy.engineering support, `/pr-merge`, orchestration |
| Phase 12 | v2.0.0 | **Neovim Plugin** — nvim-ccasp with grid, dashboard, Telescope, statusline |
| Phase 13 | v2.2.0 | **VDB & Epics** — Vision Driver Bot, GitHub Epic System, modular commands |

---

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **L1/L2/L3 Agent Hierarchy** | Orchestrators, specialists, and workers with configurable model selection |
| **40 Enforcement Hooks** | PreToolUse, PostToolUse, UserPromptSubmit hooks for validation and monitoring |
| **34 Slash Commands** | Full-featured commands for development workflow |
| **5 RAG-Enhanced Skills** | Domain-specific knowledge packages with context, templates, and workflows |
| **Happy.engineering Mobile UI** | 40-char formatting, card layouts, word-aware wrapping |
| **PR Merge Workflow** | 9-phase merge with safety, blockers, rollback |
| **Roadmap Orchestration** | Multi-phase planning with GitHub epic integration |
| **Refactoring System** | Ralph Loop, Golden Master, complexity analysis, atomic transactions |
| **Project Scaffolding** | Fresh project wizard with 6+ stack templates |
| **Auto-Generated Agents** | 18 framework-specific agents from tech stack detection |
| **Smart Update System** | Protects customizations, auto-repairs hooks |
| **Phased Development** | 95%+ success rate planning with PROGRESS.json state tracking |
| **GitHub Integration** | Project Board sync, issue creation with codebase analysis |
| **7 MCP Servers** | Auto-recommend and configure MCP servers for your stack |
| **5 Agent Patterns** | Reusable orchestration patterns including Ralph Loop |
| **7 Utility Scripts** | Deployment validation, security audits, log analysis |
| **Template Engine** | Handlebars-style placeholders with conditionals and loops |
| **Tech Stack Detection** | Pattern-based detection of 40+ frameworks and tools |

### Hook Templates (40 Total)

#### Token & Session Hooks
| Hook | Purpose | Portability |
|------|---------|-------------|
| `tool-output-cacher` | Cache >2KB outputs, save ~500 tokens | 100% |
| `token-budget-loader` | Pre-calculate daily budget | 100% |
| `token-usage-monitor` | Auto-respawn at 90% threshold | 100% |
| `session-id-generator` | UUID sessions with PID registry | 100% |
| `context-guardian` | Monitor context window usage | 100% |
| `context-injector` | Inject prior session context | 85% |

#### Deployment & Git Hooks
| Hook | Purpose | Portability |
|------|---------|-------------|
| `branch-merge-checker` | Validate main sync before deploy | 95% |
| `deployment-orchestrator` | Coordinate multi-platform deploys | 90% |
| `git-commit-tracker` | Update PROGRESS.json | 90% |
| `issue-completion-detector` | Auto-trigger deployment | 85% |
| `github-progress-hook` | Sync GitHub Project Board | 90% |

#### Refactoring Hooks (NEW)
| Hook | Purpose | Portability |
|------|---------|-------------|
| `ralph-loop-enforcer` | Continuous test-fix cycle management | 95% |
| `refactor-verify` | Auto-verify changes, run tests, check golden master | 90% |
| `refactor-audit` | Flag files >500 lines, suggest refactoring | 90% |
| `refactor-transaction` | Atomic refactoring with savepoints/rollback | 85% |

#### Agent Delegation Hooks
| Hook | Purpose | Portability |
|------|---------|-------------|
| `task-classifier` | Classify tasks by complexity/domain | 95% |
| `agent-delegator` | Route tasks to appropriate agents | 90% |
| `delegation-enforcer` | Enforce agent-only mode for complex tasks | 90% |

#### Agent Orchestration Hooks (NEW v1.8.24)
| Hook | Purpose | Portability |
|------|---------|-------------|
| `orchestrator-init` | Initialize orchestration on /phase-dev | 95% |
| `orchestrator-enforcer` | Suggest/warn/enforce delegation hierarchy | 90% |
| `hierarchy-validator` | Validate L1→L2→L3 spawning rules | 95% |
| `progress-tracker` | Auto-update PROGRESS.json on completions | 90% |
| `github-progress-sync` | Push progress updates to GitHub issues | 85% |
| `l2-completion-reporter` | Capture L2 completion reports | 90% |
| `l3-parallel-executor` | Manage parallel L3 worker execution | 85% |
| `subagent-context-injector` | Inject orchestrator context to agents | 90% |
| `completion-verifier` | Validate completion report format | 95% |
| `agent-error-recovery` | Handle failures with retry/escalate/abort | 90% |
| `orchestrator-audit-logger` | Log all agent actions to JSONL | 95% |

#### Phase & Validation Hooks
| Hook | Purpose | Portability |
|------|---------|-------------|
| `phase-validation-gates` | 5-gate validation | 90% |
| `phase-dev-enforcer` | Enforce phased development rules | 90% |
| `autonomous-decision-logger` | JSONL audit trail | 95% |

#### Happy.Engineering Hooks
| Hook | Purpose | Portability |
|------|---------|-------------|
| `happy-title-generator` | Auto-generate session titles | 100% |
| `happy-mode-detector` | Detect Happy daemon env | 100% |
| `happy-checkpoint-manager` | Manage session checkpoints | 95% |

### Agent Patterns (5 Patterns)

| Pattern | Use Case | Complexity |
|---------|----------|------------|
| [Two-Tier Query Pipeline](./templates/patterns/two-tier-query-pipeline.md) | Intent classification + execution | Medium |
| [L1→L2 Orchestration](./templates/patterns/l1-l2-orchestration.md) | Master-worker parallel tasks | Medium |
| [Multi-Phase Orchestration](./templates/patterns/multi-phase-orchestration.md) | Sequential phases with parallel tasks | High |
| [5-Point Integration Validation](./templates/patterns/README.md) | EXIST→INIT→REGISTER→INVOKE→PROPAGATE | High |
| **Ralph Loop** (NEW) | Continuous test-fix cycles until success | Medium |

### Skill Templates (5 Skills)

| Skill | Purpose | Domain |
|-------|---------|--------|
| `agent-creator` | Create L1/L2/L3 agents with best practices | Claude Code |
| `hook-creator` | Create enforcement hooks with proper schema | Claude Code |
| `rag-agent-creator` | Create RAG-enhanced agents with knowledge bases | Claude Code |
| `refactor-react` (NEW) | React refactoring patterns: Extract Hook, Split Component, Memoization | Frontend |
| `refactor-fastapi` (NEW) | FastAPI patterns: Extract Router, DI, Repository | Backend |

### Utility Scripts (7 Scripts)

| Script | Language | Purpose |
|--------|----------|---------|
| `validate-deployment.js` | Node.js | Pre-deployment env validation (Railway/CF/Vercel) |
| `poll-deployment-status.js` | Node.js | Poll until deployment complete |
| `roadmap-scanner.js` | Node.js | Multi-roadmap progress dashboard |
| `analyze-delegation-log.js` | Node.js | Model usage and token analysis |
| `autonomous-decision-logger.js` | Node.js | JSONL audit trail for agents |
| `phase-validation-gates.js` | Node.js | 5-gate validation system |
| `git-history-analyzer.py` | Python | Security audit for secrets in git |

---

## Agent Orchestration

The Agent Orchestration System (v1.8.24) enables hierarchical agent execution for phased development plans:

### Hierarchy

```
L1 Orchestrator (You / Main Conversation)
├── L2 Frontend Specialist (Sonnet)
│   ├── L3 Component Search Worker (Haiku)
│   └── L3 Style Analyzer Worker (Haiku)
├── L2 Backend Specialist (Sonnet)
│   └── L3 API Discovery Worker (Haiku)
├── L2 Testing Specialist (Sonnet)
│   └── L3 Coverage Analyzer Worker (Haiku)
└── L2 Deployment Specialist (Sonnet)
    └── L3 Config Validator Worker (Haiku)
```

### How It Works

1. **Create an Orchestrated Plan**: Use `/phase-dev-plan` and select "Orchestrated"
2. **Orchestrator Initializes**: State file created at `.claude/orchestrator/state.json`
3. **Spawn L2 Specialists**: Task tool with domain-specific prompts
4. **L2 Spawns L3 Workers**: For atomic subtasks (search, analyze, validate)
5. **Completion Reports**: Agents output `TASK_COMPLETE: {taskId}` format
6. **Auto-Update Progress**: `progress-tracker` hook updates PROGRESS.json
7. **GitHub Sync**: Progress comments pushed to linked issues

### Completion Report Format

All agents must end with one of:

```
TASK_COMPLETE: P1.1
ARTIFACTS: src/Button.tsx, src/Button.test.tsx
SUMMARY: Created button component with tests

TASK_FAILED: P1.1
ERROR: Database connection refused

TASK_BLOCKED: P1.1
BLOCKER: Waiting for API credentials from admin
```

### Enabling Orchestration

```bash
# Option 1: During init
ccasp init  # Select "Agent Orchestration System"

# Option 2: Add to existing project
ccasp update-check  # Select "agentOrchestration" feature
```

### Key Files

| File | Purpose |
|------|---------|
| `.claude/orchestrator/state.json` | Active agents, messages, metrics |
| `.claude/docs/<project>/PROGRESS.json` | Task completion tracking |
| `.claude/logs/orchestrator-audit.jsonl` | All agent action logs |

### Quick Reference

Use `/orchestration-guide` inside Claude Code for spawning syntax, error handling, and domain detection rules.

---

## Happy.engineering Mobile UI

CCASP v1.8.30 includes comprehensive mobile UI support for [Happy.engineering](https://github.com/slopus/happy) CLI wrapper.

### Detection

Happy mode is auto-detected via environment variables:

```bash
# Any of these trigger mobile formatting:
HAPPY_HOME_DIR=/path/to/.happy
HAPPY_SERVER_URL=https://...
HAPPY_WEBAPP_URL=https://...
HAPPY_EXPERIMENTAL=true
HAPPY_SESSION=true
```

### Mobile Formatting Rules

| Rule | Value |
|------|-------|
| **Max width** | 40 characters total |
| **Content width** | 36 characters (4 for borders) |
| **Word wrapping** | At word boundaries only (no mid-word breaks) |
| **Layout** | Card-based, stacked (one item per row) |

### Box-Drawing Characters

```
┌────────────────────────────────────┐  Top border
│ Content line here                  │  Vertical
├────────────────────────────────────┤  Separator
│ More content                       │
└────────────────────────────────────┘  Bottom border
```

### Supported Commands

| Command | Mobile Support |
|---------|----------------|
| `/menu` | ✅ Card-based menu with stacked options |
| `/pr-merge` | ✅ PR cards with wrapped descriptions |
| `/menu-issues-list` | ✅ Issue cards with metadata |
| `/ccasp-panel` | ✅ Inline panel (no new terminal) |

### Example: Desktop vs Mobile

**Desktop (76 chars):**
```
╔══════════════════════════════════════════════════════════════════════════╗
║  #   │ Issue        │ Status   │ Priority │ Assigned       │ Updated    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  42  │ Add JWT auth │ Ready    │ High     │ @johndoe       │ 2h ago     ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Mobile (40 chars):**
```
┌────────────────────────────────────┐
│ [1] Issue #42                      │
│ Add JWT auth                       │
├────────────────────────────────────┤
│ Status: Ready                      │
│ Priority: High                     │
│ @johndoe • 2h ago                  │
└────────────────────────────────────┘
```

### Enabling Happy Mode

Happy mode is auto-detected when running via Happy CLI. For testing:

```bash
# Set environment variable
export HAPPY_HOME_DIR=/path/to/.happy

# Run any CCASP command
/menu  # Will display mobile format
```

### Key Files

| File | Purpose |
|------|---------|
| `.claude/hooks/happy-mode-detector.js` | Session startup detection |
| `src/utils/mobile-table.js` | Mobile formatting utilities |
| `.claude/docs/HAPPY_MOBILE_UI_GUIDELINES.md` | Complete style guide |

---

## Neovim Plugin (nvim-ccasp)

CCASP v2.0.0 includes a comprehensive Neovim plugin for deep IDE integration.

### Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Grid** | Run 6 Claude CLI sessions in aligned grid layout |
| **Control Panel** | Floating panel for feature toggles, model selection |
| **Feature Toggles** | Enable/disable CCASP features without editing JSON |
| **Hook Manager** | Visual management of Pre/Post tool use hooks |
| **Dashboard** | Project overview with token usage, installed components |
| **Telescope Integration** | Browse commands, skills, hooks with fuzzy finding |
| **Statusline Components** | Token usage, agent status for lualine |

### Installation (lazy.nvim)

```lua
{
  "evan043/nvim-ccasp",
  dependencies = {
    "nvim-telescope/telescope.nvim",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("ccasp").setup({
      -- Optional: customize keymaps
      keymaps = {
        panel = "<leader>cp",     -- Open control panel
        grid = "<leader>cg",      -- Open multi-agent grid
        dashboard = "<leader>cd", -- Open dashboard
      },
    })
  end,
}
```

### Key Bindings

| Keymap | Action |
|--------|--------|
| `<leader>cp` | Open control panel |
| `<leader>cg` | Open multi-agent grid |
| `<leader>cd` | Open dashboard |
| `<leader>cf` | Telescope: Find commands |
| `<leader>ch` | Telescope: Find hooks |
| `<leader>cs` | Telescope: Find skills |

### Plugin Files

```
nvim-ccasp/
├── lua/ccasp/
│   ├── init.lua           # Main plugin setup and keymaps
│   ├── agents.lua         # Multi-agent grid management
│   ├── config.lua         # Configuration defaults
│   ├── panels/
│   │   ├── control.lua    # Main control panel
│   │   ├── dashboard.lua  # Overview dashboard
│   │   ├── features.lua   # Feature toggle panel
│   │   └── hooks.lua      # Hook management panel
│   ├── statusline.lua     # Statusline components
│   └── telescope.lua      # Telescope extension
└── plugin/ccasp.lua       # Auto-load entry point
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CCASP ARCHITECTURE (v2.2.2)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: TERMINAL (No AI)                                                   │
│  ─────────────────────────                                                   │
│                                                                              │
│  npm install ──► postinstall ──► ccasp wizard                                │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  Tech Stack  │──►│   Template   │──►│   Feature    │──►│    Agent     │  │
│  │  Detection   │   │   Engine     │   │  Selection   │   │  Generation  │  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘  │
│         │                  │                  │                  │           │
│         ▼                  ▼                  ▼                  ▼           │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    YOUR PROJECT (.claude/)                        │       │
│  │  commands/ │ config/agents.json │ skills/ │ hooks/ │ scripts/    │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  PHASE 2: CLAUDE CODE CLI (AI-Powered)                                       │
│  ─────────────────────────────────────                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     RESTART REQUIRED                              │       │
│  │                            ↓                                      │       │
│  │  /menu │ /ralph │ /refactor-workflow │ /project-explorer │ ...   │       │
│  │                                                                   │       │
│  │  ┌─────────────────────────────────────────────────────────────┐ │       │
│  │  │ REFACTORING SYSTEM                                          │ │       │
│  │  │ /ralph → ralph-loop-enforcer → test → fix → repeat          │ │       │
│  │  │ /golden-master → characterization tests → verify            │ │       │
│  │  │ refactor-transaction → savepoints → rollback                │ │       │
│  │  └─────────────────────────────────────────────────────────────┘ │       │
│  │                                                                   │       │
│  │  ┌─────────────────────────────────────────────────────────────┐ │       │
│  │  │ AGENT DELEGATION                                            │ │       │
│  │  │ task-classifier → agent-delegator → specialist agent        │ │       │
│  │  │ L1 Orchestrator ──► L2 Specialist ──► L3 Worker             │ │       │
│  │  └─────────────────────────────────────────────────────────────┘ │       │
│  │                                                                   │       │
│  │  Hooks: PreToolUse | PostToolUse | UserPromptSubmit              │       │
│  │  Skills: refactor-react | refactor-fastapi | agent-creator       │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Vision Driver Bot (VDB)

The Vision Driver Bot (v2.2.0) enables autonomous development workflows:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISION DRIVER BOT (VDB)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VDB State (.claude/vdb/state.json)                                          │
│  ├── Current task tracking                                                   │
│  ├── Lint error queue                                                        │
│  ├── Fix history                                                             │
│  └── Session metrics                                                         │
│                                                                              │
│  Workflow:                                                                   │
│  1. Detect lint errors  →  2. Queue fixes  →  3. Apply fixes  →  4. Verify  │
│                                                                              │
│  Integration:                                                                │
│  • Works with L1/L2/L3 agent hierarchy                                       │
│  • Respects enforcement hooks                                                │
│  • Updates PROGRESS.json                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

After running `ccasp init`, your project gets:

```
.claude/
├── commands/              # Slash commands (markdown with YAML frontmatter)
│   ├── menu.md           # Interactive menu
│   ├── ccasp-setup.md    # Setup wizard
│   ├── deploy-full.md    # Deployment command
│   └── ...               # 25+ commands based on feature selection
├── agents/               # L1/L2/L3 agent definitions
├── skills/               # RAG-enhanced skill packages
│   └── skill-name/
│       ├── skill.md      # Definition
│       ├── context/      # Knowledge base
│       └── workflows/    # Procedures
├── hooks/                # Enforcement hooks (12 templates available)
│   ├── pre-tool-use/
│   ├── post-tool-use/
│   └── user-prompt-submit/
├── scripts/              # Utility scripts (7 available via install-scripts)
├── docs/                 # Generated documentation
├── phase-dev/            # Phased development projects
├── settings.json         # Hook configuration
└── tech-stack.json       # Detected/configured values
```

---

## Quick Start

```bash
# Step 1: Install globally
npm install -g claude-cli-advanced-starter-pack

# Step 2: Run the setup wizard (terminal command - no AI needed)
ccasp wizard

# Step 3: IMPORTANT - Restart Claude Code CLI
#         Changes to .claude/ require a new session
claude .

# Step 4: Use slash commands inside Claude (AI-powered)
/menu
```

### Post-Install Commands

```bash
# Install additional skills after init
ccasp install-skill

# Install utility scripts
ccasp install-scripts

# Explore MCP servers for your stack
ccasp explore-mcp --recommend
```

---

## Installation Options

### Option A: Global Installation (Recommended)

```bash
npm install -g claude-cli-advanced-starter-pack
ccasp wizard
```

### Option B: Project-Local Installation

```bash
npm install --save-dev claude-cli-advanced-starter-pack
npx ccasp wizard
```

### Option C: One-Time Use

```bash
npx claude-cli-advanced-starter-pack init
```

### CLI Aliases

All aliases point to the same CLI:

```bash
ccasp                           # Short form (recommended)
ccasp w                         # Wizard shortcut
claude-advanced                 # Medium form
claude-cli-advanced-starter-pack # Full name
```

### Dev Mode (v1.8.26+)

For template development and rapid testing:

```bash
# Enable dev mode - templates read directly from package
ccasp init --dev

# Changes to templates/ reflect immediately
# No need to reinstall package between edits
```

### Project Backup (v1.8.26+)

Before overwriting `.claude/`, CCASP creates automatic backups:

```bash
# Backups stored in:
.ccasp-backup/
├── 2026-02-01T12-00-00/
│   └── .claude/          # Complete backup
└── 2026-02-01T14-30-00/
    └── .claude/          # Another backup
```

### Configurable Co-Authors (v1.8.26+)

Configure commit co-author attribution in `tech-stack.json`:

```json
{
  "commit": {
    "coAuthors": {
      "enabled": true,
      "authors": [
        { "name": "Claude", "email": "noreply@anthropic.com" },
        { "name": "Happy", "email": "yesreply@happy.engineering" }
      ]
    }
  }
}
```

When `enabled: false` (default), no co-authors are added to commits.

---

## Commands Reference

### Terminal Commands (Shell — No AI)

| Command | Description | Key Options |
|---------|-------------|-------------|
| `ccasp wizard` | Vibe-friendly setup wizard | Single-char navigation |
| `ccasp init` | Deploy commands to project | `--force`, `--minimal` |
| `ccasp detect-stack` | Auto-detect tech stack | `--verbose`, `--json` |
| `ccasp create-agent` | Create L1/L2/L3 agents | Interactive wizard |
| `ccasp create-hook` | Create enforcement hooks | Interactive wizard |
| `ccasp create-skill` | Create RAG skill packages | Interactive wizard |
| `ccasp create-command` | Create slash commands | Interactive wizard |
| `ccasp create-phase-dev` | Create phased dev plan | `--scale S/M/L`, `--autonomous` |
| `ccasp explore-mcp` | MCP server discovery | `--recommend`, `--testing` |
| `ccasp install-skill` | Install skill packages | `--list` |
| `ccasp install-scripts` | Install utility scripts | `--list` |
| `ccasp claude-audit` | Audit CLAUDE.md | Enhancement suggestions |
| `ccasp roadmap` | Sync roadmaps with GitHub | `import`, `sync`, `status` |

### Slash Commands (Inside Claude Code CLI — AI-Powered)

#### Core Commands (Always Installed)

| Command | Description |
|---------|-------------|
| `/menu` | Interactive ASCII menu with all commands |
| `/ccasp-setup` | Configuration wizard |
| `/create-agent` | Create agents interactively |
| `/create-hook` | Create hooks interactively |
| `/create-skill` | Create skills interactively |
| `/explore-mcp` | Discover and install MCP servers |
| `/claude-audit` | Audit CLAUDE.md quality |
| `/phase-dev-plan` | Create phased development plans |
| `/codebase-explorer` | Analyze codebase structure |
| `/e2e-test` | Run E2E tests with Playwright |

#### Feature-Specific Commands

| Command | Feature Required | Description |
|---------|------------------|-------------|
| `/github-update` | GitHub Integration | View Project Board status |
| `/github-task-start` | GitHub Integration | Start/complete GitHub tasks |
| `/phase-track` | Phased Development | Track progress on plans |
| `/deploy-full` | Deployment Automation | Full-stack deployment |
| `/create-smoke-test` | Testing | Auto-generate Playwright tests |
| `/ask-claude` | Discovery | Natural language command search |
| `/generate-agents` | Auto Stack Agents | Generate agents from tech stack |
| `/init-ccasp-new-project` | Happy Integration | One-shot project initialization |
| `/create-github-epic` | GitHub Integration | Create multi-issue epic workflows |
| `/github-epic-menu` | GitHub Integration | Epic management dashboard |
| `/github-epic-status` | GitHub Integration | Epic progress dashboard |

#### Refactoring Commands (NEW in v1.8.19+)

| Command | Description |
|---------|-------------|
| `/ralph` | Ralph Loop - continuous test-fix cycles until pass |
| `/refactor-workflow` | Guided 8-step refactoring with branch, tasks, PR |
| `/refactor-analyze` | Deep complexity analysis and code smell detection |
| `/golden-master` | Generate characterization tests before refactoring |
| `/refactor-check` | Fast pre-commit gate: lint + type-check + affected tests |
| `/refactor-cleanup` | Daily maintenance: auto-fix, format, remove unused |
| `/refactor-prep` | Pre-refactoring safety checklist |

#### Project Scaffolding Commands (NEW in v1.8.22+)

| Command | Description |
|---------|-------------|
| `/project-explorer` | Interactive wizard for scaffolding fresh projects |

#### PR & Git Commands (NEW in v1.8.29+)

| Command | Description |
|---------|-------------|
| `/pr-merge` | Interactive PR merge with blocker resolution, safety, rollback |
| `/update-smart` | Smart update manager - protects customizations |

#### Roadmap Commands (NEW in v1.8.27+)

| Command | Description |
|---------|-------------|
| `/roadmap-status` | View roadmap progress dashboard |
| `/roadmap-edit` | Edit roadmap structure (reorder, merge, split phases) |
| `/roadmap-track` | Execute and track roadmap phases |

---

## PR Merge Workflow

The `/pr-merge` command (v1.8.29) provides a safe, interactive PR merge workflow:

### 9-Phase Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          /pr-merge WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: Identify PR (current branch or explicit number)                   │
│  Phase 2: Create safety checkpoint (stash, record state)                    │
│  Phase 3: Detect all blockers (draft, outdated, conflicts, CI, reviews)     │
│  Phase 4: Resolve blockers one-by-one with user choice                      │
│  Phase 5: Offer contributor thank-you message                               │
│  Phase 6: Select merge method (squash/merge/rebase)                         │
│  Phase 7: Execute merge with confirmation                                   │
│  Phase 8: Post-merge cleanup (checkout base, prune)                         │
│  Phase 9: Success summary with next steps                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Blocker Types & Resolution

| Blocker | Resolution Options |
|---------|-------------------|
| **Draft PR** | Convert to ready, or cancel |
| **Outdated Branch** | Merge base into branch, or rebase |
| **Merge Conflicts** | Interactive resolution with conflict markers |
| **Failing CI** | Wait for completion, or bypass (with warning) |
| **Pending Reviews** | Request re-review, or admin merge |

### Safety Features

- **Automatic Stash**: Uncommitted changes saved before operations
- **State Recording**: Original branch, HEAD, and status recorded
- **Automatic Rollback**: On any failure, reverts to original state
- **Dry-Run Mode**: Preview changes without executing (`/pr-merge --dry-run`)

### Usage

```bash
# Merge PR for current branch
/pr-merge

# Merge specific PR by number
/pr-merge 123

# Preview without changes
/pr-merge --dry-run
```

---

## Roadmap Orchestration

The Roadmap Orchestration Framework (v1.8.27) enables multi-phase project planning with GitHub integration.

### Creation Modes

| Mode | Command | Description |
|------|---------|-------------|
| **Mode A: Manual** | `ccasp create-roadmap` | Natural language description → structured phases |
| **Mode B: GitHub** | `ccasp roadmap import` | Import issues from GitHub → grouped phases |

### Roadmap Structure

```json
{
  "slug": "my-feature",
  "phases": [
    {
      "id": "P1",
      "name": "Discovery",
      "tasks": ["Research existing implementation", "Document requirements"],
      "dependencies": [],
      "status": "completed"
    },
    {
      "id": "P2",
      "name": "Implementation",
      "tasks": ["Build core feature", "Write tests"],
      "dependencies": ["P1"],
      "status": "in_progress"
    }
  ]
}
```

### Commands

| Command | Description |
|---------|-------------|
| `/roadmap-status` | View progress dashboard with phase breakdown |
| `/roadmap-edit` | Reorder, merge, split, or remove phases |
| `/roadmap-track` | Execute phases, check dependencies, auto-advance |

### GitHub Epic Integration

When creating from GitHub issues, the framework:

1. **Groups Issues**: By label, milestone, or project column
2. **Creates Epic**: Parent issue linking all child issues
3. **Tracks Progress**: Updates epic when children complete
4. **Syncs Status**: Bidirectional sync with Project Board

### Storage

| Path | Content |
|------|---------|
| `.claude/roadmaps/{slug}.json` | Roadmap definition |
| `.claude/phase-plans/{slug}/phase-*.json` | Phase execution plans |

---

## Hook Templates

CCASP includes 30+ production-ready hook templates:

### Token & Session Management

```javascript
// token-usage-monitor: Auto-respawn at 90% threshold
{
  event: "PostToolUse",
  trigger: async (context) => {
    const usage = context.tokenUsage;
    if (usage.percentage > 90) {
      await respawnSession();
    }
  }
}
```

### Deployment Automation

```javascript
// branch-merge-checker: Block deploy on diverged branches
{
  event: "PreToolUse",
  tools: ["mcp__railway-mcp-server__deployment_trigger"],
  check: async () => {
    const { stdout } = await exec('git status -sb');
    if (stdout.includes('ahead') || stdout.includes('behind')) {
      return { allow: false, reason: "Branch not synced with main" };
    }
  }
}
```

### Installing Hooks

```bash
# Via init wizard
ccasp init  # Select 'advancedHooks' feature

# Manually copy templates
cp templates/hooks/*.template.js .claude/hooks/
```

---

## Agent Patterns

### L1→L2 Orchestration

For tasks requiring parallel specialist agents:

```
                    ┌─────────────────────┐
                    │   L1 Orchestrator   │
                    │   - Decompose task  │
                    │   - Dispatch L2s    │
                    │   - Aggregate       │
                    └─────────────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ L2 Specialist │    │ L2 Specialist │    │ L2 Specialist │
│   (Search)    │    │   (Analyze)   │    │   (Document)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Multi-Phase Orchestration

For complex projects with sequential phases:

```typescript
const phases: Phase[] = [
  { id: 'discovery', parallel: true, tasks: [...] },
  { id: 'planning', parallel: false, tasks: [...] },
  { id: 'implementation', parallel: true, tasks: [...] },
  { id: 'testing', parallel: false, tasks: [...] }
];

// Execute with validation gates between phases
const result = await executePhases(phases);
```

See [templates/patterns/](./templates/patterns/) for complete documentation.

---

## Refactoring System

CCASP v1.8.19+ includes a comprehensive refactoring system designed for **98%+ success rate**:

### Commands

| Command | Purpose |
|---------|---------|
| `/ralph` | **Ralph Loop** - Continuous test-fix cycles until all tests pass (max 10 iterations) |
| `/refactor-workflow` | Guided 8-step workflow: analyze → branch → task list → GitHub issue → agent → execute → test → PR |
| `/refactor-analyze` | Deep complexity analysis: cyclomatic, cognitive, coupling, code smells |
| `/golden-master` | Generate characterization tests capturing actual behavior before refactoring |
| `/refactor-check` | Fast pre-commit gate: lint + type-check + affected tests only |
| `/refactor-cleanup` | Daily maintenance: auto-fix lint, remove unused imports, format code |
| `/refactor-prep` | Pre-refactoring safety checklist |

### Ralph Loop Pattern

Named after Ralph Wiggum ("I'm helping!"), this pattern runs tests continuously and fixes failures:

```
┌─────────────────────────────────────────────────────────────┐
│                       RALPH LOOP                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Run tests ──► 2. Parse failures ──► 3. Fix code         │
│       ↑                                      │               │
│       └──────────────────────────────────────┘               │
│                                                              │
│  Stops when: All tests pass OR max iterations (10)          │
│              OR same failure repeated 3 times                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Refactoring Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `ralph-loop-enforcer` | PostToolUse | Monitors test execution, tracks iterations |
| `refactor-verify` | PostToolUse | Auto-verify changes after Edit/Write, run golden master |
| `refactor-transaction` | Pre+PostToolUse | Creates savepoints, enables rollback |
| `refactor-audit` | PostToolUse | Flags files >500 lines after task completion |

### Golden Master Pattern

Capture current behavior as "characterization tests" before refactoring:

```bash
/golden-master src/utils/calculateTotal.ts
# Creates .claude/golden-master/calculateTotal.master.json
# Generates test inputs: edge cases, boundary values, typical cases
# Captures actual outputs (not expected - ACTUAL behavior)

# After refactoring, verify behavior unchanged:
/golden-master src/utils/calculateTotal.ts --verify
```

---

## Project Scaffolding

For fresh/empty directories, CCASP provides `/project-explorer` - an interactive scaffolding wizard:

### Supported Project Types

| Type | Frameworks | Output |
|------|------------|--------|
| **Web App** | React+Vite, Vue+Vite, Svelte+SvelteKit | package.json, tsconfig, src/App.tsx |
| **API** | FastAPI, Express, NestJS, Flask | main.py/index.ts, routers/, services/ |
| **CLI** | Commander.js, Click/Typer, Clap | bin/cli.js, commands/ |
| **Full-Stack** | Turborepo + React + Express/FastAPI | packages/web/, packages/api/ |
| **Desktop** | Tauri, Electron | Cargo.toml, src-tauri/, src/ |

### Workflow

```
ccasp wizard (in empty directory)
       ↓
"No codebase detected - scaffold new project?"
       ↓ [Yes]
/project-explorer triggers
       ↓
Interview: name, type, language, framework, database, features
       ↓
Generate: skeleton files, config, dependencies
       ↓
Install: npm install / pip install
       ↓
Deploy: CCASP commands to .claude/
       ↓
"Project scaffolded! Run /create-task-list to continue"
```

---

## Auto-Generated Agents

CCASP v1.8.16+ auto-generates specialist agents from your detected tech stack:

### Available Agent Templates (18)

| Category | Agents |
|----------|--------|
| **Frontend** | React, Vue, Angular, Svelte, Next.js |
| **Backend** | FastAPI, Express, NestJS, Django |
| **Database** | PostgreSQL, Prisma |
| **State** | Redux, Zustand, Pinia |
| **Deployment** | Railway, Cloudflare |
| **Testing** | Playwright, Vitest |

### How It Works

```bash
# During init, after tech stack detection:
ccasp init
# Detected: React, FastAPI, PostgreSQL, Playwright

# Auto-generates agents in .claude/config/agents.json:
{
  "frontend-react-specialist": { "model": "sonnet", "expertise": ["hooks", "components"] },
  "backend-fastapi-specialist": { "model": "sonnet", "expertise": ["routers", "pydantic"] },
  "database-postgresql-specialist": { "model": "sonnet", "expertise": ["migrations", "queries"] },
  "testing-playwright-specialist": { "model": "sonnet", "expertise": ["e2e", "selectors"] }
}
```

### Delegation Hooks

| Hook | Purpose |
|------|---------|
| `task-classifier` | Classifies incoming tasks by domain (frontend/backend/testing) |
| `agent-delegator` | Routes classified tasks to appropriate specialist agent |
| `delegation-enforcer` | Enforces agent-only mode for complex multi-step tasks |

---

## Utility Scripts

### Installation

```bash
ccasp install-scripts
# Interactive selection of 7 scripts
```

### Usage Examples

```bash
# Pre-deployment validation
node .claude/scripts/validate-deployment.js --platform railway

# Poll deployment status
node .claude/scripts/poll-deployment-status.js \
  --platform railway \
  --deployment-id abc123 \
  --timeout 300

# Scan roadmaps for progress
node .claude/scripts/roadmap-scanner.js --output json

# Analyze Claude delegation logs
node .claude/scripts/analyze-delegation-log.js \
  ~/.claude/logs/delegation.jsonl --cost-estimate

# Security audit git history
python .claude/scripts/git-history-analyzer.py --patterns "password|secret"
```

---

## Configuration

### tech-stack.json

Auto-generated during init with detected and configured values:

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-project",
    "type": "fullstack"
  },
  "frontend": {
    "framework": "react",
    "port": 5173,
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "distDir": "dist"
  },
  "backend": {
    "framework": "fastapi",
    "port": 8001,
    "language": "python",
    "healthEndpoint": "/health"
  },
  "database": {
    "type": "postgresql",
    "orm": "prisma"
  },
  "testing": {
    "unit": "vitest",
    "e2e": "playwright",
    "unitCommand": "npm test",
    "e2eCommand": "npm run test:e2e"
  },
  "deployment": {
    "frontend": {
      "platform": "cloudflare",
      "projectName": "my-app"
    },
    "backend": {
      "platform": "railway",
      "projectId": "{{DEPLOY_BACKEND_PROJECT_ID}}"
    }
  },
  "features": {
    "githubIntegration": true,
    "phasedDevelopment": true,
    "advancedHooks": true,
    "refactoring": true,
    "skillTemplates": true
  }
}
```

### settings.json

Configure hooks and agent behavior:

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": ["file-guard", "token-guardian", "branch-merge-checker"],
    "postToolUse": ["test-enforcer", "github-progress", "autonomous-decision-logger"],
    "userPromptSubmit": ["context-loader", "session-id-generator"]
  },
  "agents": {
    "defaultModel": "sonnet",
    "maxTokensPerTask": 8000
  }
}
```

---

## Template Engine

CCASP uses a Handlebars-style template engine for platform-agnostic configuration.

### Supported Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| `{{path.to.value}}` | `{{frontend.port}}` | Simple placeholder |
| `{{#if condition}}` | `{{#if deployment.backend}}` | Conditional block |
| `{{#if (eq path "value")}}` | `{{#if (eq platform "railway")}}` | Equality check |
| `{{#if (neq path "value")}}` | `{{#if (neq env "prod")}}` | Inequality check |
| `{{#if (and a b)}}` | `{{#if (and tests hooks)}}` | Logical AND |
| `{{#if (or a b)}}` | `{{#if (or react vue)}}` | Logical OR |
| `{{#if (not path)}}` | `{{#if (not disabled)}}` | Negation |
| `{{#each array}}` | `{{#each files}}` | Loop |
| `${CWD}` | `${CWD}/src` | Current working directory |
| `${HOME}` | `${HOME}/.config` | User home directory |

### Template Example

```handlebars
{{#if deployment.backend.platform}}
## Backend Deployment

{{#if (eq deployment.backend.platform "railway")}}
Using Railway MCP:
```
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})
```
{{/if}}

{{#if (eq deployment.backend.platform "vercel")}}
Using Vercel:
```bash
vercel --prod
```
{{/if}}
{{else}}
⚠️ Backend deployment not configured
{{/if}}
```

---

## API Reference

### Programmatic Usage

```javascript
import {
  // Setup & Detection
  runSetupWizard,
  detectTechStack,
  runClaudeAudit,

  // Template Processing
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,

  // GitHub Integration
  isAuthenticated,
  getCurrentUser,
  createIssue,
  addIssueToProject,

  // Codebase Analysis
  searchFiles,
  searchContent,
  findDefinitions,
  analyzeForIssue,

  // Scripts & Skills
  runInstallScripts,
  installSkillCommand,
} from 'claude-cli-advanced-starter-pack';
```

### Key Functions

#### `detectTechStack(projectPath: string): Promise<TechStack>`

Detects project technology stack by reading configuration files:

```javascript
const techStack = await detectTechStack(process.cwd());
console.log(techStack.frontend.framework); // "react"
console.log(techStack.backend.framework);  // "fastapi"
```

#### `replacePlaceholders(content: string, values: object, options?: object)`

Process templates with values:

```javascript
const template = '{{project.name}} uses {{frontend.framework}}';
const { content, warnings } = replacePlaceholders(template, techStack);
// content: "my-app uses react"
```

---

## Tech Stack Detection

CCASP detects 40+ frameworks and tools by reading project files (**no AI required**):

### Detection Sources

| File/Pattern | Detects |
|--------------|---------|
| `package.json` | React, Vue, Angular, Next.js, Express, testing tools |
| `vite.config.js/ts` | Vite bundler |
| `next.config.js` | Next.js |
| `nuxt.config.ts` | Nuxt.js |
| `tsconfig.json` | TypeScript |
| `requirements.txt` | Python dependencies |
| `pyproject.toml` | Python project config |
| `.git/config` | Repository URL |
| `railway.json` | Railway deployment |
| `wrangler.toml` | Cloudflare config |

### Detected Categories

- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro
- **Backend**: FastAPI, Express, NestJS, Django, Flask, Rails, Gin
- **Database**: PostgreSQL, MySQL, MongoDB, SQLite, Redis
- **ORM**: Prisma, TypeORM, SQLAlchemy, Drizzle
- **Testing**: Jest, Vitest, Mocha, pytest, Playwright, Cypress
- **Deployment**: Railway, Vercel, Netlify, Cloudflare, Heroku, AWS

---

## Feature Presets

During setup, choose a preset for quick configuration:

| Letter | Preset | Features Included |
|--------|--------|-------------------|
| **A** | Minimal | `/menu`, `/ccasp-setup` only |
| **B** | Standard | + GitHub Integration + Phased Development |
| **C** | Full | + Deployment + Hooks + Refactoring + Scripts |
| **D** | Custom | Pick individual features |

---

## Update System

CCASP v1.8.28 includes a smart update system for managing project updates:

### Update Modes

| Mode | Command | Behavior |
|------|---------|----------|
| **Smart (A)** | `/update-smart` | Protects customizations, merges new features |
| **Full (B)** | `ccasp init --force` | Overwrites all `.claude/` assets, preserves config |

### Smart Update Features

- **Customization Protection**: Detects modified files and prompts before overwriting
- **Selective Updates**: Choose which features to add or update
- **Auto-Repair**: Outdated hooks automatically repaired during `ccasp init`
- **State Tracking**: Update history stored in `.claude/config/ccasp-state.json`

### Update Flow

```
/update-smart or /update-check
       ↓
Check npm registry for new version
       ↓
Compare installed vs latest
       ↓
   ┌───────────┴───────────┐
   │                       │
Up to date           Update available
   ↓                       ↓
"All good!"          Show highlights
                           ↓
                   ┌───────┴───────┐
                   │               │
              Smart (A)       Full (B)
                   │               │
                   ↓               ↓
            Merge changes    Overwrite all
            Keep customs     Fresh install
```

### Auto-Repair

When running `ccasp init`, outdated hooks are detected and repaired:

```bash
# During init
[REPAIR] Found outdated hooks:
  • ccasp-update-check.js (v1.8.25 → v1.8.30)
  • happy-mode-detector.js (v1.8.24 → v1.8.30)

Auto-repairing... Done!
```

---

## MCP Server Integration

CCASP helps discover and configure Model Context Protocol (MCP) servers:

```bash
ccasp explore-mcp              # Interactive menu
ccasp explore-mcp --recommend  # Auto-recommend based on codebase
ccasp explore-mcp --testing    # Quick install Playwright + Puppeteer
```

### Supported MCP Servers (v1.7.0+)

| Category | Servers |
|----------|---------|
| **Testing** | Playwright, Puppeteer, Browser Monitor, Skyvern |
| **Deployment** | Railway, Cloudflare, Vercel, DigitalOcean |
| **Debugging** | Log Monitor, Browser Monitor |
| **Tunnel** | ngrok, Cloudflare Tunnel, LocalTunnel |
| **Version Control** | GitHub, GitLab |
| **Database** | PostgreSQL, SQLite, Supabase, Redis |
| **Communication** | Slack, Discord, Resend Email |
| **Utilities** | Filesystem, Fetch, Memory (ChromaDB) |

### API Key Management (v2.1.3+)

Many MCP servers require API keys. CCASP now:

1. **Prompts before installation** - Shows API key requirements with links to obtain keys
2. **Allows skipping** - Users can skip MCPs they don't have keys for
3. **Validates configuration** - Optional hook warns about missing API keys

**API Key Validation Hook:**
```bash
# Enable the hook via explore-mcp menu
ccasp explore-mcp  # Select "API Key Validation"
```

| MCP Server | Required Key | Get Key At | Free Tier |
|------------|--------------|------------|-----------|
| GitHub | `GITHUB_PERSONAL_ACCESS_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) | Yes |
| Railway | `RAILWAY_API_TOKEN` | [railway.app/account/tokens](https://railway.app/account/tokens) | Yes |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) | Yes |
| Supabase | `SUPABASE_ACCESS_TOKEN` | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) | Yes |
| Resend | `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | Yes |
| Exa | `EXA_API_KEY` | [exa.ai/pricing](https://exa.ai/pricing) | Yes |
| **No key needed** | Playwright, Puppeteer, Log Monitor, Git, SQLite | - | - |

### Windows Compatibility

CCASP automatically uses `cmd /c npx` wrapper on Windows for proper MCP execution.

---

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |
| GitHub CLI | 2.40+ (optional) | `gh --version` |

### GitHub CLI Setup (for GitHub features)

```bash
gh auth login
gh auth status
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ccasp` not found | Check PATH includes npm global bin: `npm bin -g` |
| Slash commands not working | **Restart Claude Code CLI** after `ccasp init` |
| Tech stack not detected | Ensure you're in project root with `package.json` |
| Hooks not triggering | Check `settings.json` has hook enabled |
| GitHub commands failing | Run `gh auth status` to verify authentication |

### Debug Commands

```bash
ccasp detect-stack --verbose    # See all detected values
ccasp install-scripts --list    # List available scripts
ccasp install-skill --list      # List available skills
ccasp claude-audit              # Audit CLAUDE.md quality
```

---

## Contributing

Contributions welcome! Please read our contributing guidelines.

### Development Setup

```bash
git clone https://github.com/evan043/claude-cli-advanced-starter-pack.git
cd claude-cli-advanced-starter-pack
npm install
npm run lint
npm test
```

### Code Structure

```
src/
├── commands/           # 30+ command implementations
├── cli/               # Interactive menu system (desktop + mobile)
├── github/            # GitHub API wrapper
├── agents/            # Agent generator, registry, stack-mapping
│   ├── generator.js   # Auto-generate agents from tech stack
│   ├── registry.js    # Agent registry management
│   ├── schema.js      # Agent schema definitions
│   └── stack-mapping.js # Tech stack → agent mapping
├── hooks/             # Hook configuration
├── panel/             # Control panel system
├── utils/             # Template engine, validators, paths
└── index.js           # Main exports

templates/
├── commands/          # Slash command templates (30+)
├── hooks/             # Hook templates (26)
├── skills/            # Skill templates (5)
├── agents/            # Agent templates (18 framework-specific)
│   ├── frontend/      # React, Vue, Angular, Svelte, Next.js
│   ├── backend/       # FastAPI, Express, NestJS, Django
│   ├── database/      # PostgreSQL, Prisma
│   ├── state/         # Redux, Zustand, Pinia
│   ├── deployment/    # Railway, Cloudflare
│   └── testing/       # Playwright, Vitest
├── patterns/          # Agent patterns (5)
├── scripts/           # Utility scripts (7)
└── docs/              # Doc templates (5)
```

---

## License

MIT © [evan043](https://github.com/evan043)

---

<div align="center">

**Made for Claude Code CLI** — Supercharge your AI-assisted development workflow.

[Documentation](./docs/WIKI.md) • [Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues) • [npm](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)

</div>
