# Claude CLI Advanced Starter Pack (CCASP)

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                          v1.8.24  •  Production Ready                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![npm version](https://badge.fury.io/js/claude-cli-advanced-starter-pack.svg)](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A professional-grade CLI toolkit for Claude Code CLI — 90+ components including agents, hooks, skills, MCP servers, refactoring system, project scaffolding, and GitHub integration.**

[Getting Started](#quick-start) • [Documentation](./docs/WIKI.md) • [API Reference](#api-reference) • [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [What's New in v1.8.24](#whats-new-in-v1824)
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

## What's New in v1.8.24

**Major additions in v1.8.x:**

### Agent Orchestration System (v1.8.24) - NEW!
- **Hierarchical Agent Execution**: L1 Orchestrator → L2 Specialists → L3 Workers
- **Automatic PROGRESS.json Updates**: Agents report completion, state auto-updates
- **GitHub Issue Sync**: Progress comments pushed to linked issues
- **Enforcement Hooks**: 11 new hooks for hierarchy validation, error recovery, audit logging
- **L2 Domain Specialists**: Frontend, backend, testing, deployment experts
- **L3 Worker Templates**: Search, analyze, validate, lint workers (Haiku model for cost efficiency)
- **Error Recovery**: Retry/escalate/abort strategies with max retry limits
- **Audit Logging**: All agent actions logged to `.claude/logs/orchestrator-audit.jsonl`
- **`/orchestration-guide`**: Quick reference for spawning agents and completion formats

### Roadmap Management System (v1.8.23)
- **Multi-phase Roadmaps**: ROADMAP.json with dependency graphs
- **GitHub Epic Hierarchy**: Auto-create epic → child issue structure
- **Complexity Detection**: Recommends roadmaps for plans with 30+ tasks
- **Auto Documentation**: Generate architecture docs from roadmap structure

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

**90+ components** across 10 implementation phases:

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

---

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **L1/L2/L3 Agent Hierarchy** | Orchestrators, specialists, and workers with configurable model selection |
| **26 Enforcement Hooks** | PreToolUse, PostToolUse, UserPromptSubmit hooks for validation and monitoring |
| **5 RAG-Enhanced Skills** | Domain-specific knowledge packages with context, templates, and workflows |
| **Refactoring System** | Ralph Loop, Golden Master, complexity analysis, atomic transactions |
| **Project Scaffolding** | Fresh project wizard with 6+ stack templates |
| **Auto-Generated Agents** | 18 framework-specific agents from tech stack detection |
| **Phased Development** | 95%+ success rate planning with PROGRESS.json state tracking |
| **GitHub Integration** | Project Board sync, issue creation with codebase analysis |
| **7 MCP Servers** | Auto-recommend and configure MCP servers for your stack |
| **5 Agent Patterns** | Reusable orchestration patterns including Ralph Loop |
| **7 Utility Scripts** | Deployment validation, security audits, log analysis |
| **Template Engine** | Handlebars-style placeholders with conditionals and loops |
| **Tech Stack Detection** | Pattern-based detection of 40+ frameworks and tools |

### Hook Templates (26 Total)

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

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CCASP ARCHITECTURE (v1.8.22)                             │
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

---

## Hook Templates

CCASP includes 12 production-ready hook templates:

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
