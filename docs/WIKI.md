# CCASP Wiki - Complete Documentation

**Version 2.2.3** | **For Senior Full-Stack Developers**

This documentation provides comprehensive technical details for the Claude CLI Advanced Starter Pack (CCASP). It covers architecture, implementation patterns, extension points, and production deployment strategies.

---

## Table of Contents

### User Guides
1. [Getting Started with CCASP Wizard](#getting-started-with-ccasp-wizard)
2. [Creating a New Project with CCASP](#creating-a-new-project-with-ccasp)
3. [Enabling Vision & Epic System](#enabling-vision--epic-system)
4. [Using Vision Driver Bot (VDB)](#using-vision-driver-bot-vdb)
5. [PM Tools Integration (Linear, ClickUp, Jira)](#pm-tools-integration-linear-clickup-jira)

### Technical Reference
5. [Architecture Deep Dive](#architecture-deep-dive)
6. [Agent Orchestration Patterns](#agent-orchestration-patterns)
7. [Hook System Reference](#hook-system-reference)
8. [Skill Development Guide](#skill-development-guide)
9. [Template Engine Internals](#template-engine-internals)
10. [MCP Server Integration](#mcp-server-integration)
11. [Phased Development System](#phased-development-system)
12. [Deployment Automation](#deployment-automation)
13. [Performance & Token Optimization](#performance--token-optimization)
14. [Extension API](#extension-api)
15. [Troubleshooting Guide](#troubleshooting-guide)

---

# User Guides

## Getting Started with CCASP Wizard

The CCASP Wizard is a mobile-friendly, vibe-code optimized setup flow that guides you through CCASP installation with minimal typing.

### When to Use the Wizard

Use `ccasp wizard` when:
- Setting up CCASP for the first time in a project
- You want a guided, interactive experience
- You're using a mobile device or prefer numbered menu options

### Running the Wizard

```bash
# From any project directory
ccasp wizard

# Or after global install
npx ccasp wizard
```

### Wizard Menu Options

```
╔═══════════════════════════════════════════════════════════════╗
║                    CCASP Setup Wizard                          ║
╠═══════════════════════════════════════════════════════════════╣
║  1. Quick Start (Auto-detect)   - Scans your project, picks   ║
║                                   relevant features             ║
║  2. Full Setup (All features)   - Installs everything          ║
║  3. GitHub Setup                - Configure GitHub + PM tools  ║
║  4. Advanced Options            - Templates, releases, removal ║
║  5. Happy.engineering           - Mobile app integration       ║
║  6. Exit                                                        ║
╚═══════════════════════════════════════════════════════════════╝
```

### Quick Start Flow

1. **Select Option 1** → Quick Start
2. Wizard detects your tech stack (React, Node, Python, etc.)
3. Shows recommended features based on detection
4. Installs selected features automatically
5. Generates `.claude/` folder with commands and hooks

### Post-Wizard Steps

After the wizard completes:

1. **Restart Claude Code CLI** - Required for new commands to appear
2. **Run `/menu`** - Access the interactive menu for further configuration
3. **Explore slash commands** - Type `/` to see all available commands

### Advanced Options Submenu

```
Advanced Options:
  V. View Available Templates
  B. Browse Prior Releases
  R. Remove CCASP from Project
  X. Return to Main Menu
```

---

## Creating a New Project with CCASP

This guide covers setting up CCASP from scratch in a new or existing project.

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) `gh` CLI for GitHub integration
- (Optional) Claude Code CLI for AI-powered features

### Installation Methods

#### Method 1: Global Install (Recommended)

```bash
# Install globally
npm install -g claude-cli-advanced-starter-pack

# Navigate to your project
cd /path/to/your-project

# Run the wizard for guided setup
ccasp wizard

# Or run init directly for faster setup
ccasp init
```

#### Method 2: npx (No Install)

```bash
cd /path/to/your-project
npx claude-cli-advanced-starter-pack wizard
```

### The Init Command

The `ccasp init` command is the core deployment mechanism:

```bash
# Standard init with interactive prompts
ccasp init

# Force overwrite existing files
ccasp init --force

# Non-interactive mode (CI/CD friendly)
ccasp init --skip-prompts

# Dev mode for template testing
ccasp init --dev
```

### What Gets Created

After running `ccasp init`, your project gets:

```
.claude/
├── commands/              # Slash commands (markdown files)
│   ├── menu.md            # Interactive menu
│   ├── deploy-full.md     # Deployment automation
│   └── ...                # 30+ more commands
├── agents/                # Custom agent definitions
│   └── example-agent.md   # Example agent template
├── skills/                # Skill packages (RAG-enhanced prompts)
│   └── example-skill/     # Example skill structure
├── hooks/                 # Enforcement hooks
│   ├── usage-tracking.js  # Token usage tracker
│   └── ccasp-update-check.js
├── docs/                  # Documentation templates
├── config/                # Configuration files
│   ├── tech-stack.json    # Auto-detected tech stack
│   └── ccasp-state.json   # CCASP version state
├── settings.json          # Claude Code CLI settings
└── README.md              # Quick reference
```

### Feature Selection During Init

When running `ccasp init` interactively, you'll be asked about optional features:

| Feature | Description |
|---------|-------------|
| **Token Management** | Budget tracking and auto-respawn |
| **Happy Mode** | Mobile app UI optimizations |
| **GitHub Integration** | Project board sync, task automation |
| **Phased Development** | Multi-phase project planning |
| **Deployment Automation** | Frontend/backend deploy commands |
| **Tunnel Services** | ngrok/Cloudflare tunnel setup |
| **Advanced Hooks** | Full 40+ hook library |
| **Skill Templates** | RAG skill packages |
| **Refactoring Tools** | Ralph Loop, Golden Master, analysis |
| **Testing** | E2E test generation |
| **Auto Stack Agents** | Framework-specific agents |
| **Project Explorer** | Codebase exploration tools |

### Verifying Installation

```bash
# Check installed commands
ls .claude/commands/

# View tech stack detection
cat .claude/config/tech-stack.json

# Restart Claude Code CLI, then run:
/menu
```

### CI/CD Integration

For automated pipelines:

```bash
# Auto-detect CI environment and skip prompts
ccasp init --non-interactive

# Run tech stack detection
ccasp detect-stack

# Verify installation
test -d .claude && echo "CCASP installed successfully"
```

---

## Enabling Vision & Epic System

The Vision & Epic System allows you to manage multi-issue development projects with GitHub integration, progress tracking, and automated workflows.

### What is the Epic System?

An **Epic** is a large feature or project broken into multiple phases:

```
Epic: "Add User Authentication"
├── Phase 1: Design (planning, diagrams)
├── Phase 2: Backend (API routes, JWT)
├── Phase 3: Frontend (login forms, hooks)
├── Phase 4: Testing (E2E, unit tests)
└── Phase 5: Deployment (CI/CD, monitoring)
```

Each phase can have:
- Tasks and subtasks
- Dependencies on other phases
- Complexity ratings (S/M/L)
- GitHub issue tracking

### Prerequisites

1. **GitHub CLI** - Install and authenticate `gh`
2. **CCASP with GitHub Integration** - Run `ccasp init` with GitHub features enabled

### Creating Your First Epic

#### Option 1: Using the Slash Command

In Claude Code CLI:

```bash
/create-github-epic

# Follow the prompts to:
# 1. Enter epic title
# 2. Define phases
# 3. Set complexity for each phase
# 4. Create GitHub issues (optional)
```

#### Option 2: Using the Epic Menu

```bash
/github-epic-menu
```

This opens an interactive dashboard:

```
╔═══════════════════════════════════════════════════════════════╗
║                    GitHub Epic Dashboard                        ║
╠═══════════════════════════════════════════════════════════════╣
║  #  │ Epic Name              │ Phases │ Progress │ GitHub      ║
║─────┼────────────────────────┼────────┼──────────┼─────────────║
║  1  │ User Authentication    │ 5      │ 40%      │ #42         ║
║  2  │ Dashboard Redesign     │ 3      │ 0%       │ #45         ║
╠═══════════════════════════════════════════════════════════════╣
║  [N] New Epic   [V] View   [S] Sync   [T] Testing Issues      ║
║  [E] Edit       [R] Resume [D] Delete [B] Back                ║
╚═══════════════════════════════════════════════════════════════╝
```

### Epic Commands Reference

| Command | Description |
|---------|-------------|
| `/create-github-epic` | Create a new epic with phases |
| `/github-epic-menu` | Interactive epic management |
| `/github-epic-status` | View progress across all epics |

### Epic Data Storage

Epics are stored locally and synced with GitHub:

```
.claude/github-epics/
├── user-authentication.json   # Epic definition
├── dashboard-redesign.json    # Another epic
└── ...

# Each file contains:
{
  "title": "User Authentication",
  "description": "Full auth system with JWT",
  "status": "in-progress",
  "phases": [
    {
      "phase_id": "phase-1",
      "phase_title": "Design",
      "status": "completed",
      "complexity": "S"
    },
    ...
  ],
  "metadata": {
    "github_epic_number": 42,
    "completion_percentage": 40
  }
}
```

### Syncing with GitHub

The Epic System integrates with GitHub Issues:

1. **Epic Issue** - Parent issue containing the epic overview
2. **Phase Issues** - Child issues for each phase (optional)
3. **Progress Updates** - Automatic comment updates as phases complete

To sync manually:
```bash
/github-epic-menu
# Select [S] Sync
```

### Working with Phases

Each phase in an epic follows this lifecycle:

```
pending → in_progress → completed
            ↓
         blocked (if dependencies not met)
```

To update a phase:
1. Open `/github-epic-menu`
2. Select the epic
3. Choose **[V] View** to see phases
4. Mark phases as complete as you progress

### Testing Integration

Generate testing issues for completed phases:

```bash
/github-epic-menu
# Select [T] Testing Issues
# Choose which phases need testing
```

This creates GitHub issues with:
- Test checklists
- RALPH loop configuration
- Web research hooks

---

## Using Vision Driver Bot (VDB)

The Vision Driver Bot (VDB) is an autonomous development bot that monitors your Vision/Epic boards and drives development without human intervention.

### What VDB Does

1. **Scans** your epic boards for actionable items
2. **Queues** tasks by priority
3. **Executes** tasks using Claude AI
4. **Reports** progress back to GitHub/boards

### Prerequisites

1. **CCASP v2.2.0+** installed
2. **GitHub repository** with Actions enabled
3. **GitHub Secrets** configured:
   - `ANTHROPIC_API_KEY` - Your Claude API key
   - `VDB_PAT` - GitHub Personal Access Token (for board access)

### Initializing VDB

```bash
# From your project root
ccasp vdb init

# Or with force to overwrite existing config
ccasp vdb init --force
```

This creates:

```
.claude/vdb/
├── config.json        # VDB configuration
├── logs/              # Execution logs
└── summaries/         # Task summaries

.github/workflows/
└── vision-driver-bot.yml  # GitHub Actions workflow
```

### VDB Commands

| Command | Description |
|---------|-------------|
| `ccasp vdb init` | Initialize VDB in project |
| `ccasp vdb status` | Show current status and queue |
| `ccasp vdb scan` | Scan boards for actionable items |
| `ccasp vdb execute` | Execute next task from queue |
| `ccasp vdb execute --dry-run` | Preview execution without running |
| `ccasp vdb queue` | Display task queue |
| `ccasp vdb stats [days]` | Show execution statistics |
| `ccasp vdb clear` | Clear task queue |

### VDB Configuration

The main configuration file (`.claude/vdb/config.json`):

```json
{
  "version": "1.0.0",
  "bot": {
    "name": "Vision Driver Bot",
    "emoji": "🤖",
    "commitAuthor": "Vision Driver Bot",
    "commitEmail": "vdb@users.noreply.github.com"
  },
  "boards": {
    "primary": "github",
    "github": {
      "enabled": true,
      "owner": "your-username",
      "repo": "your-repo",
      "projectNumber": null,
      "labels": {
        "epic": "epic",
        "phase": "phase-dev",
        "vdbManaged": "vdb-managed"
      }
    },
    "local": {
      "enabled": true,
      "epicDir": ".claude/github-epics"
    }
  },
  "watcher": {
    "pollInterval": "*/15 * * * *",
    "scanFor": {
      "readyPhases": true,
      "staleTasks": true,
      "blockedItems": true
    },
    "staleThresholdDays": 3
  }
}
```

### Setting Up GitHub Secrets

1. Go to your repository **Settings → Secrets and variables → Actions**
2. Add these secrets:

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Your Claude API key from console.anthropic.com |
| `VDB_PAT` | GitHub PAT with `repo` and `project` scopes |

### How VDB Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     VDB Workflow (Every 15 min)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SCAN                                                        │
│     └─ Check epics for ready phases                             │
│     └─ Identify stale tasks (>3 days)                          │
│     └─ Find unassigned work                                     │
│                                                                  │
│  2. QUEUE                                                        │
│     └─ Sort by priority (critical → high → normal)              │
│     └─ Limit to 5 items per scan                                │
│                                                                  │
│  3. EXECUTE                                                      │
│     └─ Pick highest priority item                               │
│     └─ Generate Claude prompt                                   │
│     └─ Run autonomous Claude Code session                       │
│     └─ Commit changes with VDB signature                        │
│                                                                  │
│  4. REPORT                                                       │
│     └─ Update epic phase status                                 │
│     └─ Post progress to GitHub issue                            │
│     └─ Log execution details                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Monitoring VDB

#### Check Status

```bash
ccasp vdb status
```

Output:
```
╔═══════════════════════════════════════════════════════════════╗
║                     Vision Driver Bot Status                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Repository:     your-username/your-repo                        ║
║  Primary Board:  github                                         ║
║  Queue:          3 queued, 0 executing, 3 total                 ║
║  Last Scan:      2026-02-01 12:45:00                            ║
╚═══════════════════════════════════════════════════════════════╝
```

#### View Execution Stats

```bash
ccasp vdb stats 7
```

Output:
```
╔═══════════════════════════════════════════════════════════════╗
║                  VDB Statistics (Last 7 Days)                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Total Executions:    45                                        ║
║  Successful:          42 (93.3%)                                ║
║  Failed:              3                                         ║
║  Avg Duration:        12.5 minutes                              ║
║  Phases Completed:    8                                         ║
╚═══════════════════════════════════════════════════════════════╝
```

### Manual VDB Execution

Run VDB manually without waiting for scheduled execution:

```bash
# Scan for work
ccasp vdb scan

# Execute next task
ccasp vdb execute

# Preview without executing
ccasp vdb execute --dry-run
```

### VDB Best Practices

1. **Start Small** - Test with a single epic before enabling for all projects
2. **Monitor First Week** - Check logs and stats frequently initially
3. **Set Clear Phase Boundaries** - Well-defined phases execute better
4. **Use Labels** - Apply `vdb-managed` label to issues VDB should track
5. **Review Commits** - VDB commits include `🤖` in author for easy identification

### Disabling VDB

To stop VDB from running:

1. Delete `.github/workflows/vision-driver-bot.yml`
2. Or disable the workflow in GitHub Actions UI
3. Optionally remove `.claude/vdb/` directory

---

## PM Tools Integration (Linear, ClickUp, Jira)

CCASP supports integration with popular project management tools to sync your epics, roadmaps, and tasks across platforms.

### Supported PM Tools

| Tool | Auth Method | API Key Required | Hierarchy Support |
|------|-------------|------------------|-------------------|
| **GitHub** | GitHub CLI (`gh`) | No | Issues, Projects, Labels |
| **Jira** | Basic Auth | Yes | Epics, Stories, Tasks, Subtasks |
| **Linear** | Bearer Token | Yes | Projects, Issues, Sub-issues |
| **ClickUp** | API Key | Yes | Folders, Lists, Tasks, Subtasks |

### Hierarchy Mapping

CCASP maps its internal hierarchy to each PM tool:

| CCASP Layer | GitHub | Jira | Linear | ClickUp |
|-------------|--------|------|--------|---------|
| **Epic** | Issue + epic label | Epic | Project | Folder |
| **Roadmap** | Issue + roadmap label | Story | Issue | List |
| **Phase** | Issue + phase label | Task | Issue | Task |
| **Task** | Checklist/Comment | Subtask | Sub-issue | Subtask |

### Setting Up Integrations

#### Using the Integration Wizard

The easiest way to configure PM integrations is through the wizard:

```bash
ccasp wizard
# Select option 3: GitHub Setup
# Choose your PM tools to configure
```

#### Manual Configuration

Create or edit `.claude/integrations/config.json`:

```json
{
  "github": {
    "enabled": true,
    "owner": "your-username",
    "repo": "your-repo",
    "project_number": null,
    "sync_direction": "bidirectional"
  },
  "jira": {
    "enabled": false,
    "base_url": "",
    "project_key": "",
    "api_token": "",
    "email": "",
    "sync_direction": "outbound"
  },
  "linear": {
    "enabled": false,
    "api_key": "",
    "team_key": "",
    "sync_direction": "outbound"
  },
  "clickup": {
    "enabled": false,
    "api_key": "",
    "workspace_id": "",
    "space_id": "",
    "sync_direction": "outbound"
  }
}
```

### Configuring Each Tool

#### GitHub (Default)

GitHub integration uses the `gh` CLI and requires no API key:

```bash
# Authenticate with GitHub CLI
gh auth login

# Verify authentication
gh auth status
```

Configuration:
```json
{
  "github": {
    "enabled": true,
    "owner": "your-username",
    "repo": "your-repo",
    "project_number": 3,
    "default_labels": ["epic", "phase-dev"],
    "sync_direction": "bidirectional"
  }
}
```

#### Jira

1. **Generate API Token**: [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. **Get your Project Key**: Found in your Jira project URL (e.g., `PROJ-123` → key is `PROJ`)

Configuration:
```json
{
  "jira": {
    "enabled": true,
    "base_url": "https://your-company.atlassian.net",
    "project_key": "PROJ",
    "board_id": 1,
    "api_token": "your-api-token",
    "email": "your-email@company.com",
    "sync_direction": "bidirectional"
  }
}
```

**Features:**
- Create Jira Epics from CCASP epics
- Sync phase status to Jira Tasks
- Two-way status synchronization
- Comment posting for progress updates

#### Linear

1. **Generate API Key**: [Linear Settings → API](https://linear.app/settings/api)
2. **Get your Team Key**: Found in your Linear team URL (e.g., `linear.app/team/ENG` → key is `ENG`)

Configuration:
```json
{
  "linear": {
    "enabled": true,
    "api_key": "lin_api_xxxxxxxxxxxxx",
    "team_key": "ENG",
    "sync_direction": "bidirectional"
  }
}
```

**Features:**
- Create Linear Projects from CCASP epics
- Sync phases as Linear Issues
- Priority mapping (P0-P4 → Urgent to No Priority)
- Label synchronization

#### ClickUp

1. **Generate API Key**: [ClickUp Settings → Apps](https://app.clickup.com/settings/apps)
2. **Get IDs**: Use the ClickUp API or find in URLs
   - Workspace ID: In URL after login
   - Space ID: In URL when viewing a Space

Configuration:
```json
{
  "clickup": {
    "enabled": true,
    "api_key": "pk_xxxxxxxxxx",
    "workspace_id": "1234567",
    "space_id": "7654321",
    "default_list_id": null,
    "sync_direction": "bidirectional"
  }
}
```

**Features:**
- Create ClickUp Folders from CCASP epics
- Sync roadmaps as ClickUp Lists
- Task and subtask synchronization
- Custom field mapping

### Sync Directions

| Direction | Behavior |
|-----------|----------|
| `outbound` | CCASP → PM Tool (read local, push to external) |
| `bidirectional` | Two-way sync (changes in either system are synced) |

### Status Mapping

CCASP automatically maps statuses between platforms:

| CCASP Status | GitHub | Jira | Linear | ClickUp |
|--------------|--------|------|--------|---------|
| `pending` | Open | To Do | Backlog | To Do |
| `in_progress` | Open + label | In Progress | In Progress | In Progress |
| `completed` | Closed | Done | Done | Complete |
| `blocked` | Open + blocked label | Blocked | Blocked | Blocked |

### Testing Connections

Verify your integrations are working:

```bash
# Through the wizard
ccasp wizard
# Select GitHub Setup → Test Connections

# Or programmatically
ccasp test-integrations
```

### Syncing Epics

Once configured, sync operations happen automatically when:

1. Creating epics via `/create-github-epic`
2. Updating phase status via `/github-epic-menu`
3. VDB completes tasks (if enabled)

Manual sync:
```bash
/github-epic-menu
# Select [S] Sync
```

### Best Practices

1. **Start with GitHub** - It's the default and requires no API keys
2. **Use Environment Variables** - Store API tokens in `.env`, not config files
3. **Enable One at a Time** - Test each integration before adding another
4. **Use `outbound` First** - Start with one-way sync to avoid conflicts
5. **Review Field Mappings** - Ensure priority/status mappings match your workflow

### Security Considerations

**Never commit API tokens to version control!**

Recommended approach:
```bash
# .env file (add to .gitignore)
JIRA_API_TOKEN=your-token
LINEAR_API_KEY=lin_api_xxx
CLICKUP_API_KEY=pk_xxx

# Reference in config
# Or use environment variable injection
```

### Troubleshooting Integrations

| Issue | Solution |
|-------|----------|
| Auth failed | Verify API token and permissions |
| Sync conflicts | Switch to `outbound` mode temporarily |
| Missing fields | Check field mapping configuration |
| Rate limiting | Reduce sync frequency or batch operations |

---

# Technical Reference

## Architecture Deep Dive

### Two-Phase Execution Model

CCASP operates in two distinct phases with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: TERMINAL                             │
│                         (No AI, Pure Node.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Entry Points:                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │ ccasp wizard│  │ ccasp init  │  │ccasp detect │                     │
│  │   (wizard)  │  │   (deploy)  │  │   (scan)    │                     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│         │                │                │                             │
│         ▼                ▼                ▼                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CORE MODULES                                  │   │
│  │                                                                  │   │
│  │  detect-tech-stack.js (768 LOC)                                 │   │
│  │  ├─ readPackageJson()     → Parse dependencies                  │   │
│  │  ├─ detectFrontend()      → Framework detection                 │   │
│  │  ├─ detectBackend()       → API framework detection             │   │
│  │  ├─ detectDatabase()      → DB/ORM detection                    │   │
│  │  ├─ detectTesting()       → Test framework detection            │   │
│  │  └─ detectDeployment()    → CI/CD platform detection            │   │
│  │                                                                  │   │
│  │  template-engine.js (398 LOC)                                   │   │
│  │  ├─ replacePlaceholders() → {{variable}} substitution           │   │
│  │  ├─ processConditionals() → {{#if}}/{{#each}} handling          │   │
│  │  └─ resolveHelpers()      → (eq), (or), (and) operators         │   │
│  │                                                                  │   │
│  │  init.js (1386 LOC)                                             │   │
│  │  ├─ OPTIONAL_FEATURES     → Feature registry                    │   │
│  │  ├─ deployCommands()      → Copy templates to .claude/          │   │
│  │  ├─ deployHooks()         → Install enforcement hooks           │   │
│  │  └─ generateTechStack()   → Create tech-stack.json              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│                        ┌─────────────────────┐                         │
│                        │   .claude/ folder   │                         │
│                        │   (YOUR PROJECT)    │                         │
│                        └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ← RESTART CLAUDE CODE CLI
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2: CLAUDE CODE                          │
│                        (AI-Powered, MCP Enabled)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Slash Commands:  /menu  /deploy-full  /github-update  /phase-track   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AGENT HIERARCHY                               │   │
│  │                                                                  │   │
│  │  L1 ORCHESTRATORS (Sonnet/Opus)                                 │   │
│  │  ├─ Task decomposition                                          │   │
│  │  ├─ Agent spawning (parallel/sequential)                        │   │
│  │  ├─ Result aggregation                                          │   │
│  │  └─ Error recovery                                              │   │
│  │           │                                                      │   │
│  │           ├──────────────┬──────────────┬──────────────┐        │   │
│  │           ▼              ▼              ▼              ▼        │   │
│  │  L2 SPECIALISTS (Sonnet/Haiku)                                  │   │
│  │  ├─ Domain-specific tasks                                       │   │
│  │  ├─ File operations                                             │   │
│  │  ├─ Code generation                                             │   │
│  │  └─ Testing/validation                                          │   │
│  │           │                                                      │   │
│  │           ▼                                                      │   │
│  │  L3 WORKERS (Haiku)                                             │   │
│  │  ├─ Simple file reads                                           │   │
│  │  ├─ Pattern matching                                            │   │
│  │  └─ Data extraction                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    HOOK LIFECYCLE                                │   │
│  │                                                                  │   │
│  │  UserPromptSubmit  →  PreToolUse  →  [Tool Execution]           │   │
│  │         ↓                  ↓               ↓                     │   │
│  │  context-injector    file-guard      [MCP Calls]                │   │
│  │  session-id-gen      branch-checker       ↓                     │   │
│  │                                      PostToolUse                 │   │
│  │                                           ↓                      │   │
│  │                                    decision-logger               │   │
│  │                                    github-progress               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dev Mode (v1.8.3+)

For rapid template development and testing:

```bash
ccasp init --dev
```

**Dev Mode Features:**
- Reuses existing `tech-stack.json` (no prompts)
- Processes all templates in `templates/commands/` and `templates/hooks/`
- Preserves custom commands (those without matching templates)
- Regenerates `/menu`, `INDEX.md`, `README.md`
- Skips all interactive prompts

**Use Cases:**
- Testing template changes before release
- Quickly updating all deployed commands
- CI/CD pipelines for template validation

### File Structure Deep Dive

```
claude-cli-advanced-starter-pack/
├── bin/
│   ├── gtask.js           # CLI entry (Commander.js)
│   └── postinstall.js     # npm postinstall welcome
│
├── src/
│   ├── commands/          # 30+ command implementations (modularized in v2.2.0)
│   │   ├── init.js                    # Feature deployment (1386 LOC)
│   │   ├── detect-tech-stack.js       # Stack detection (768 LOC)
│   │   ├── setup-wizard.js            # Vibe-friendly wizard
│   │   ├── create-agent.js            # Agent builder
│   │   ├── create-hook.js             # Hook builder
│   │   ├── create-skill.js            # Skill builder
│   │   ├── install-skill.js           # Post-init skill installer
│   │   ├── install-scripts.js         # Script installer
│   │   ├── explore-mcp.js             # MCP discovery
│   │   │   └── explore-mcp/
│   │   │       ├── mcp-registry.js    # Server definitions (20+ servers)
│   │   │       ├── mcp-installer.js   # .mcp.json updater
│   │   │       └── claude-md-updater.js
│   │   └── create-phase-dev/
│   │       ├── index.js               # Phase orchestrator
│   │       ├── codebase-analyzer.js   # Dependency scanner
│   │       └── scale-calculator.js    # S/M/L estimation
│   │
│   ├── cli/
│   │   └── menu.js        # Interactive ASCII menu
│   │
│   ├── github/
│   │   └── client.js      # GitHub API via gh CLI
│   │
│   ├── utils/
│   │   └── template-engine.js  # Handlebars-style processor
│   │
│   └── index.js           # Public API exports
│
├── src/
│   ├── vdb/               # Vision Driver Bot (v2.2.0)
│   │   ├── state.js       # VDB state management
│   │   └── driver.js      # Autonomous workflow driver
│
├── templates/
│   ├── commands/          # 34+ slash command templates (.template.md)
│   ├── hooks/             # 40+ hook templates (.template.js)
│   ├── skills/            # 3 skill packages
│   │   ├── agent-creator/
│   │   ├── hook-creator/
│   │   └── rag-agent-creator/
│   ├── patterns/          # 4 orchestration patterns
│   ├── scripts/           # 7 utility scripts
│   └── docs/              # 5 documentation templates
│
└── docs/
    └── WIKI.md            # This file
```

---

## Vision Driver Bot (VDB) - v2.2.0

The Vision Driver Bot enables autonomous development workflows with automatic lint fixes and state management.

### VDB Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VISION DRIVER BOT (VDB)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  State Management (.claude/vdb/state.json)                                   │
│  ├── currentTask: Active task being processed                               │
│  ├── lintQueue: Pending lint errors to fix                                  │
│  ├── fixHistory: Record of applied fixes                                    │
│  └── sessionMetrics: Token usage, task counts                               │
│                                                                              │
│  Workflow Engine                                                             │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐                       │
│  │ Detect │───▶│ Queue  │───▶│ Apply  │───▶│ Verify │                       │
│  │ Errors │    │ Fixes  │    │ Fixes  │    │ Success│                       │
│  └────────┘    └────────┘    └────────┘    └────────┘                       │
│                                                                              │
│  Integration Points                                                          │
│  ├── L1/L2/L3 Agent Hierarchy                                               │
│  ├── Enforcement Hooks (respects all guards)                                │
│  ├── PROGRESS.json Updates                                                  │
│  └── GitHub Progress Sync                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### VDB Usage

VDB activates automatically when:
- Lint errors are detected during development
- Code changes require validation
- Autonomous fix mode is enabled

---

## CI/CD Integration - v2.2.2

CCASP now includes robust CI/CD support with auto-detection.

### CI Environment Auto-Detection

```javascript
// Automatically detects CI environments
const isCI = process.env.CI === 'true' ||
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.GITLAB_CI === 'true';

// Skips interactive prompts in CI
if (isCI) {
  options.nonInteractive = true;
}
```

### Integration Test Pattern

```yaml
# .github/workflows/ci.yml
- name: Install CCASP
  run: npm install -g claude-cli-advanced-starter-pack

- name: Initialize Project
  run: ccasp init --non-interactive

- name: Detect Tech Stack
  run: ccasp detect-stack

- name: Verify Installation
  run: |
    test -d .claude
    test -f .claude/config/tech-stack.json
    ls .claude/commands/ | wc -l | xargs test 5 -lt
```

---

## Agent Orchestration Patterns

### Pattern 1: Two-Tier Query Pipeline

**Use Case**: Intent classification followed by specialized execution.

```typescript
// Tier 1: Fast classifier (Haiku)
const classification = await classifyIntent(userRequest);
// { intent: 'deploy', confidence: 0.92, entities: { platform: 'railway' } }

// Tier 2: Specialized handler (Sonnet)
const result = await handlers[classification.intent](classification.entities);
```

**Implementation**:

```typescript
interface ClassificationResult {
  intent: 'create' | 'read' | 'update' | 'delete' | 'analyze' | 'deploy';
  confidence: number;  // 0-1
  entities: Record<string, string>;
  handler: string;
}

async function executeQuery(request: string) {
  // Tier 1: Pattern-based classification (no AI needed for common cases)
  const patterns = {
    deploy: /deploy|push|release|ship/i,
    analyze: /analyze|check|review|audit/i,
    create: /create|add|new|make/i,
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(request)) {
      return handlers[`${intent}Handler`](extractEntities(request));
    }
  }

  // Fallback: AI classification
  const classification = await Task({
    description: 'Classify intent',
    prompt: `Classify: "${request}"`,
    subagent_type: 'Explore',
    model: 'haiku'  // Fast, cheap
  });

  return handlers[classification.handler](classification.entities);
}
```

### Pattern 2: L1→L2 Orchestration

**Use Case**: Complex tasks requiring parallel specialist agents.

```typescript
async function orchestrate(task: string) {
  // Step 1: Decompose into subtasks
  const subtasks = await decomposeTask(task);

  // Step 2: Identify dependencies
  const { independent, dependent } = categorizeSubtasks(subtasks);

  // Step 3: Launch independent L2 agents IN PARALLEL
  // CRITICAL: Use single message with multiple Task calls
  const parallelAgents = independent.map(subtask => Task({
    description: subtask.title,
    prompt: subtask.prompt,
    subagent_type: subtask.type,
    run_in_background: true
  }));

  const parallelResults = await Promise.all(parallelAgents);

  // Step 4: Launch dependent agents sequentially
  let context = parallelResults;
  for (const subtask of dependent) {
    const result = await Task({
      description: subtask.title,
      prompt: injectContext(subtask.prompt, context),
      subagent_type: subtask.type
    });
    context = [...context, result];
  }

  // Step 5: Aggregate results
  return aggregateResults(context);
}
```

**Model Selection Guidelines**:

| Level | Model | Reasoning |
|-------|-------|-----------|
| L1 Orchestrator | Sonnet | Complex decomposition, coordination |
| L2 Search/Explore | Haiku | Fast file discovery, pattern matching |
| L2 Analysis | Sonnet | Deep reasoning required |
| L2 Code Generation | Sonnet | Quality code output |
| L3 Workers | Haiku | Simple extraction, formatting |

### Pattern 3: Multi-Phase Orchestration

**Use Case**: Large projects with sequential phases and validation gates.

```typescript
interface Phase {
  id: string;
  name: string;
  parallel: boolean;      // Can tasks run in parallel?
  tasks: Task[];
  validation: ValidationGate;
}

interface ValidationGate {
  check: (results: PhaseResult[]) => Promise<ValidationResult>;
}

async function executePhases(phases: Phase[]): Promise<PhaseResults> {
  const results: PhaseResult[] = [];
  let context = {};

  for (const phase of phases) {
    console.log(`Starting Phase: ${phase.name}`);

    // Execute phase tasks
    const phaseResult = phase.parallel
      ? await executeParallel(phase.tasks, context)
      : await executeSequential(phase.tasks, context);

    // Validation gate
    const validation = await phase.validation.check(phaseResult);

    if (!validation.passed) {
      return {
        completed: results,
        failed: phase,
        reason: validation.reason,
        context
      };
    }

    // Update context for next phase
    context = { ...context, [phase.id]: phaseResult };
    results.push({ phase, result: phaseResult, validation });
  }

  return { completed: results, context };
}
```

**Validation Gate Examples**:

```typescript
const validationGates = {
  discovery: {
    async check(results) {
      const allFilesFound = results.every(r => r.files?.length > 0);
      return { passed: allFilesFound, reason: allFilesFound ? null : 'Missing files' };
    }
  },

  implementation: {
    async check(results) {
      // Run tests
      const testResult = await Bash('npm test');
      const typeCheck = await Bash('npx tsc --noEmit');

      return {
        passed: testResult.exitCode === 0 && typeCheck.exitCode === 0,
        reason: testResult.exitCode !== 0 ? 'Tests failed' : 'Type errors'
      };
    }
  },

  deployment: {
    async check(results) {
      // Verify deployment is healthy
      const healthCheck = await fetch(`${deploymentUrl}/health`);
      return {
        passed: healthCheck.ok,
        reason: healthCheck.ok ? null : 'Health check failed'
      };
    }
  }
};
```

---

## Hook System Reference

### Hook Lifecycle

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│         UserPromptSubmit Hooks          │
│  ├─ context-injector                    │
│  ├─ session-id-generator                │
│  └─ token-budget-loader                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         PreToolUse Hooks                │
│  ├─ file-guard (block protected files)  │
│  ├─ branch-merge-checker                │
│  └─ token-guardian                      │
└─────────────────────────────────────────┘
    │
    ▼ (If all checks pass)
┌─────────────────────────────────────────┐
│         Tool Execution                  │
│  (Read, Write, Edit, Bash, Task, etc.)  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         PostToolUse Hooks               │
│  ├─ tool-output-cacher                  │
│  ├─ autonomous-decision-logger          │
│  ├─ github-progress                     │
│  └─ token-usage-monitor                 │
└─────────────────────────────────────────┘
```

### Hook Template Structure

```javascript
// templates/hooks/example-hook.template.js

/**
 * Example PreToolUse Hook
 *
 * Event: PreToolUse
 * Purpose: Block/allow tool execution
 */

export default {
  // Hook metadata
  name: 'example-hook',
  event: 'PreToolUse',  // PreToolUse | PostToolUse | UserPromptSubmit
  tools: ['*'],         // Which tools to intercept (* = all)
  priority: 100,        // Lower = runs first

  // Main hook function
  async execute(context) {
    const { tool, params, conversation } = context;

    // Check condition
    if (shouldBlock(tool, params)) {
      return {
        allow: false,
        reason: 'Operation blocked by policy'
      };
    }

    // Allow with modifications
    return {
      allow: true,
      modifiedParams: {
        ...params,
        additionalContext: 'injected by hook'
      }
    };
  }
};
```

### Available Hooks (40+ Total)

| Hook | Event | Purpose |
|------|-------|---------|
| `tool-output-cacher` | PostToolUse | Cache outputs >2KB to save tokens |
| `token-budget-loader` | UserPromptSubmit | Pre-calculate daily budget |
| `token-usage-monitor` | PostToolUse | Auto-respawn at 90% threshold |
| `session-id-generator` | UserPromptSubmit | UUID session with PID registry |
| `autonomous-decision-logger` | PostToolUse | JSONL audit trail |
| `git-commit-tracker` | PostToolUse | Update PROGRESS.json |
| `branch-merge-checker` | PreToolUse | Block deploy on diverged branches |
| `phase-validation-gates` | PostToolUse | 5-gate validation |
| `issue-completion-detector` | PostToolUse | Auto-trigger deployment |
| `context-injector` | UserPromptSubmit | Inject prior session context |
| `happy-title-generator` | UserPromptSubmit | Auto-generate session titles |
| `happy-mode-detector` | UserPromptSubmit | Detect Happy daemon env |

### Additional Hooks (v1.8.24+)

| Hook | Event | Purpose |
|------|-------|---------|
| `orchestrator-init` | UserPromptSubmit | Initialize orchestration on /phase-dev |
| `orchestrator-enforcer` | PreToolUse | Enforce delegation hierarchy |
| `hierarchy-validator` | PreToolUse | Validate L1→L2→L3 spawning rules |
| `progress-tracker` | PostToolUse | Auto-update PROGRESS.json on completions |
| `github-progress-sync` | PostToolUse | Push progress updates to GitHub issues |
| `l2-completion-reporter` | PostToolUse | Capture L2 completion reports |
| `l3-parallel-executor` | PreToolUse | Manage parallel L3 worker execution |
| `subagent-context-injector` | PreToolUse | Inject orchestrator context to agents |
| `completion-verifier` | PostToolUse | Validate completion report format |
| `agent-error-recovery` | PostToolUse | Handle failures with retry/escalate/abort |
| `orchestrator-audit-logger` | PostToolUse | Log all agent actions to JSONL |
| `ralph-loop-enforcer` | PostToolUse | Continuous test-fix cycle management |
| `refactor-verify` | PostToolUse | Auto-verify changes, run tests |
| `refactor-audit` | PostToolUse | Flag files >500 lines |
| `refactor-transaction` | Pre+PostToolUse | Atomic refactoring with savepoints |
| `task-classifier` | UserPromptSubmit | Classify tasks by complexity/domain |
| `agent-delegator` | PreToolUse | Route tasks to appropriate agents |
| `delegation-enforcer` | PreToolUse | Enforce agent-only mode |
| `happy-checkpoint-manager` | PostToolUse | Manage session checkpoints |

### settings.json Configuration

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": [
      "file-guard",
      "branch-merge-checker"
    ],
    "postToolUse": [
      "tool-output-cacher",
      "autonomous-decision-logger",
      "github-progress"
    ],
    "userPromptSubmit": [
      "context-injector",
      "session-id-generator"
    ]
  },
  "hookConfig": {
    "file-guard": {
      "protectedPaths": [
        ".env",
        "*.pem",
        "credentials.json"
      ]
    },
    "token-usage-monitor": {
      "warningThreshold": 0.8,
      "criticalThreshold": 0.9,
      "autoRespawn": true
    }
  }
}
```

---

## Skill Development Guide

### Skill Package Structure

```
templates/skills/my-skill/
├── skill.json           # Manifest
├── skill.md             # Main prompt/instructions
├── context/             # RAG knowledge base
│   ├── patterns.md      # Common patterns
│   ├── gotchas.md       # Edge cases
│   └── examples/        # Code examples
│       ├── basic.md
│       └── advanced.md
└── workflows/           # Multi-step procedures
    ├── setup.md
    └── deploy.md
```

### skill.json Manifest

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Description for slash command help",
  "author": "your-name",
  "category": "development",
  "tags": ["react", "testing", "deployment"],
  "dependencies": {
    "mcpServers": ["playwright"],
    "tools": ["Bash", "Read", "Write"]
  },
  "entryPoint": "skill.md",
  "contextFiles": [
    "context/patterns.md",
    "context/gotchas.md"
  ]
}
```

### skill.md Template

```markdown
# My Skill

## Purpose

Brief description of what this skill does.

## Prerequisites

- Required tools/MCPs
- Environment setup

## Workflow

### Step 1: Analysis

[Instructions for first step]

### Step 2: Implementation

[Instructions for second step]

### Step 3: Validation

[Instructions for validation]

## Common Patterns

{{#include context/patterns.md}}

## Troubleshooting

{{#include context/gotchas.md}}
```

---

## Template Engine Internals

### Placeholder Resolution

```javascript
// src/utils/template-engine.js

const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

function resolveValue(path, values) {
  const parts = path.trim().split('.');
  let current = values;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

function replacePlaceholders(content, values, options = {}) {
  const warnings = [];

  const result = content.replace(PLACEHOLDER_REGEX, (match, path) => {
    const value = resolveValue(path, values);

    if (value === undefined) {
      if (options.preserveUnknown) return match;
      warnings.push(`Unresolved: ${path}`);
      return `{{${path}}}`;
    }

    return String(value);
  });

  return { content: result, warnings };
}
```

### Conditional Processing

```javascript
const CONDITIONAL_REGEX = /\{\{#if\s+(.+?)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

function processConditionals(content, values) {
  return content.replace(CONDITIONAL_REGEX, (match, condition, ifBlock, elseBlock = '') => {
    const result = evaluateCondition(condition, values);
    return result ? ifBlock : elseBlock;
  });
}

function evaluateCondition(condition, values) {
  // Handle helper functions: (eq path "value"), (or a b), etc.
  const helperMatch = condition.match(/\((\w+)\s+(.+)\)/);

  if (helperMatch) {
    const [, helper, args] = helperMatch;
    return evaluateHelper(helper, args, values);
  }

  // Simple path check
  return Boolean(resolveValue(condition, values));
}

function evaluateHelper(helper, args, values) {
  switch (helper) {
    case 'eq': {
      const [path, expected] = parseArgs(args);
      return resolveValue(path, values) === expected;
    }
    case 'neq': {
      const [path, expected] = parseArgs(args);
      return resolveValue(path, values) !== expected;
    }
    case 'and': {
      const paths = args.split(/\s+/);
      return paths.every(p => Boolean(resolveValue(p, values)));
    }
    case 'or': {
      const paths = args.split(/\s+/);
      return paths.some(p => Boolean(resolveValue(p, values)));
    }
    case 'not': {
      return !Boolean(resolveValue(args.trim(), values));
    }
    default:
      return false;
  }
}
```

---

## MCP Server Integration

### Registry Structure

```javascript
// src/commands/explore-mcp/mcp-registry.js

export const MCP_REGISTRY = {
  testing: [
    {
      id: 'playwright',
      name: 'Playwright MCP',
      description: 'Browser automation for E2E testing',
      npmPackage: '@playwright/mcp@latest',
      category: 'testing',
      requiredEnv: {},
      optionalEnv: {
        PLAYWRIGHT_HEADLESS: { default: 'true' }
      },
      relevantFor: ['react', 'vue', 'angular', 'frontend'],
      recommended: true,
      tools: ['browser_navigate', 'browser_click', 'browser_screenshot']
    }
  ],

  deployment: [
    {
      id: 'railway',
      name: 'Railway MCP',
      npmPackage: '@jasontanswe/railway-mcp',
      requiredEnv: {
        RAILWAY_API_TOKEN: { description: 'Railway API token' }
      },
      relevantFor: ['railway', 'backend', 'api']
    }
  ],

  debugging: [
    {
      id: 'log-monitor',
      name: 'Log Monitor MCP',
      npmPackage: '@anthropic/log-monitor-mcp',
      tools: ['logs_list', 'logs_tail', 'logs_grep', 'logs_watch']
    }
  ],

  tunnel: [
    {
      id: 'ngrok',
      name: 'ngrok Tunnel',
      command: 'ngrok',
      npmPackage: null,  // Not an MCP, CLI tool
      requiredEnv: { NGROK_AUTHTOKEN: {} },
      installGuide: 'https://ngrok.com/download'
    }
  ]
};
```

### Recommendation Algorithm

```javascript
function getRecommendedMcps(analysis) {
  const allMcps = getAllMcps();
  const keywords = new Set(['all']);

  // Build keyword set from analysis
  if (analysis.frontend.detected) {
    keywords.add('frontend');
    keywords.add(analysis.frontend.framework?.toLowerCase());
  }
  if (analysis.backend.detected) {
    keywords.add('backend');
    keywords.add(analysis.backend.framework?.toLowerCase());
  }
  // ... etc

  // Score each MCP
  const recommendations = allMcps.map(mcp => {
    let score = mcp.recommended ? 10 : 0;

    for (const keyword of mcp.relevantFor) {
      if (keywords.has(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Testing MCPs bonus for frontend
    if (mcp.category === 'testing' && keywords.has('frontend')) {
      score += 8;
    }

    return { ...mcp, score };
  });

  return recommendations
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

---

## Phased Development System

### PROGRESS.json Schema

```json
{
  "version": "1.0.0",
  "projectId": "uuid-here",
  "createdAt": "2026-01-30T00:00:00Z",
  "currentPhase": 2,
  "phases": [
    {
      "id": "discovery",
      "name": "Codebase Discovery",
      "status": "complete",
      "startedAt": "2026-01-30T00:00:00Z",
      "completedAt": "2026-01-30T01:00:00Z",
      "tasks": [
        { "id": "t1", "description": "Find auth files", "status": "complete" },
        { "id": "t2", "description": "Find API endpoints", "status": "complete" }
      ],
      "artifacts": [
        { "type": "file_list", "path": ".claude/phase-dev/discovery-files.json" }
      ],
      "validation": {
        "gate": "discovery",
        "passed": true,
        "checks": [
          { "name": "files_found", "passed": true },
          { "name": "no_errors", "passed": true }
        ]
      }
    },
    {
      "id": "implementation",
      "name": "Code Implementation",
      "status": "in_progress",
      "startedAt": "2026-01-30T01:00:00Z",
      "tasks": [
        { "id": "t3", "description": "Implement feature", "status": "in_progress" },
        { "id": "t4", "description": "Add tests", "status": "pending" }
      ]
    }
  ],
  "context": {
    "discovery": {
      "files": ["src/auth.ts", "src/api.ts"],
      "patterns": ["JWT", "OAuth"]
    }
  }
}
```

### 5-Gate Validation System

```
EXIST → INIT → REGISTER → INVOKE → PROPAGATE

1. EXIST: Required files/directories exist
2. INIT: Initialization commands succeed
3. REGISTER: Components registered in configs
4. INVOKE: Functionality works when called
5. PROPAGATE: Changes reflected in dependents
```

Implementation:

```javascript
const GATES = ['EXIST', 'INIT', 'REGISTER', 'INVOKE', 'PROPAGATE'];

async function validatePhase(phase, config) {
  const results = {};

  for (const gate of GATES) {
    results[gate] = await validateGate(gate, config);

    if (!results[gate].passed) {
      return { passed: false, failedGate: gate, results };
    }
  }

  return { passed: true, results };
}

async function validateGate(gate, config) {
  switch (gate) {
    case 'EXIST':
      return checkFilesExist(config.files);

    case 'INIT':
      return runInitCommands(config.commands);

    case 'REGISTER':
      return verifyRegistrations(config.registrations);

    case 'INVOKE':
      return testFunctionality(config.tests);

    case 'PROPAGATE':
      return verifyPropagation(config.dependents);
  }
}
```

---

## Performance & Token Optimization

### Token Budget Management

```javascript
// Hook: token-budget-loader

const DAILY_BUDGET = 100000;  // Adjust per plan
const SESSION_BUDGET = 10000;

function loadTokenBudget() {
  const today = new Date().toISOString().split('T')[0];
  const budgetFile = `${HOME}/.claude/token-budget-${today}.json`;

  let budget = { used: 0, remaining: DAILY_BUDGET };

  if (fs.existsSync(budgetFile)) {
    budget = JSON.parse(fs.readFileSync(budgetFile));
  }

  return {
    daily: budget,
    session: { used: 0, remaining: SESSION_BUDGET },
    warningThreshold: 0.8,
    criticalThreshold: 0.9
  };
}
```

### Output Caching

```javascript
// Hook: tool-output-cacher

const CACHE_THRESHOLD = 2048;  // bytes
const CACHE_DIR = '.claude/cache/outputs';

async function cacheOutput(tool, params, output) {
  if (output.length < CACHE_THRESHOLD) return output;

  const hash = crypto.createHash('md5')
    .update(JSON.stringify({ tool, params }))
    .digest('hex');

  const cachePath = `${CACHE_DIR}/${hash}.json`;
  await fs.writeFile(cachePath, JSON.stringify({
    tool,
    params,
    output,
    cachedAt: new Date().toISOString()
  }));

  return `[Cached: ${cachePath}] First 500 chars: ${output.slice(0, 500)}...`;
}
```

### Model Selection for Cost Optimization

| Task Type | Recommended Model | Token Cost |
|-----------|-------------------|------------|
| File search/grep | Haiku | $0.25/1M |
| Simple extraction | Haiku | $0.25/1M |
| Code analysis | Sonnet | $3/1M |
| Complex reasoning | Sonnet | $3/1M |
| Code generation | Sonnet | $3/1M |
| Orchestration | Sonnet | $3/1M |
| Critical decisions | Opus | $15/1M |

---

## Extension API

### Creating Custom Commands

```javascript
// src/commands/my-command.js

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';

export async function runMyCommand(options = {}) {
  showHeader('My Command');

  // Interactive prompts
  const { input } = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: 'Enter value:',
      validate: (val) => val.length > 0 || 'Required'
    }
  ]);

  // Process
  const result = await processInput(input);

  // Output
  console.log(chalk.green('✓ Success'));
  return result;
}
```

### Registering in CLI

```javascript
// bin/gtask.js

import { runMyCommand } from '../src/commands/my-command.js';

program
  .command('my-command')
  .description('Description here')
  .option('--flag', 'Flag description')
  .action(async (options) => {
    await runMyCommand(options);
  });
```

### Creating Custom Hooks

```javascript
// .claude/hooks/pre-tool-use/my-hook.js

export default {
  name: 'my-hook',
  event: 'PreToolUse',
  tools: ['Write', 'Edit'],

  async execute(context) {
    const { tool, params } = context;

    // Custom logic
    if (params.file_path.includes('protected')) {
      return {
        allow: false,
        reason: 'Cannot modify protected files'
      };
    }

    return { allow: true };
  }
};
```

---

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Commands not appearing | Session not restarted | Restart Claude Code CLI |
| Hooks not firing | Not enabled in settings | Check settings.json |
| Tech stack empty | Not in project root | cd to directory with package.json |
| GitHub auth fails | Token expired | `gh auth refresh` |
| MCP connection fails | Server not running | Check MCP logs |

### Debug Commands

```bash
# Verbose tech stack detection
ccasp detect-stack --verbose

# List all installed features
ls -la .claude/commands/

# Check hook configuration
cat .claude/settings.json

# Verify MCP configuration
cat .mcp.json

# Test template processing
ccasp validate --path templates/commands/
```

### Log Locations

| Log | Location | Purpose |
|-----|----------|---------|
| CCASP CLI | stdout | Command execution |
| Claude Code | `~/.claude/logs/` | Session logs |
| MCP Servers | `~/.claude/mcp-logs/` | Server output |
| Decision audit | `.claude/logs/decisions.jsonl` | Agent decisions |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2.3 | 2026-02-02 | **User Guides**: CCASP Wizard, Creating Projects, Vision/Epic System, VDB usage, PM Tools Integration (Linear, ClickUp, Jira) |
| 2.2.2 | 2026-02-01 | CI fixes: tech-stack.json path corrections, simplified integration tests |
| 2.2.1 | 2026-02-01 | CI fixes: run detect-stack after init, path corrections |
| 2.2.0 | 2026-02-01 | **Vision Driver Bot (VDB)**, GitHub Epic System, /init-ccasp-new-project, modular commands |
| 2.1.5 | 2026-01-31 | /happy-start-cd command for repo selection |
| 2.1.4 | 2026-01-31 | Release maintenance |
| 2.1.3 | 2026-01-31 | API key validation, Windows compatibility for explore-mcp |
| 2.1.2 | 2026-01-31 | Release maintenance |
| 2.1.1 | 2026-01-31 | Release maintenance |
| 2.1.0 | 2026-01-31 | Renamed /github-update → /github-project-menu, /menu-issues-list → /github-menu-issues-list |
| 2.0.1 | 2026-01-31 | Release maintenance |
| 2.0.0 | 2026-01-31 | **Neovim plugin (nvim-ccasp)**, major architecture updates |
| 1.8.31 | 2026-01-31 | Happy.engineering 401 auth error fix |
| 1.8.30 | 2026-01-31 | Happy.engineering mobile UI, auto-detection |
| 1.8.29 | 2026-01-31 | /pr-merge command with 9-phase workflow |
| 1.8.28 | 2026-01-31 | Smart update system, auto-repair hooks |
| 1.8.27 | 2026-01-30 | Roadmap Orchestration Framework |
| 1.8.3 | 2026-01-31 | Dev mode (`--dev` flag), npm-deploy auto mode (`--auto` flag) |
| 1.8.0 | 2026-01-30 | 7 utility scripts, install-scripts command |
| 1.7.0 | 2026-01-30 | 7 MCP servers (log-monitor, tunnel services) |
| 1.6.0 | 2026-01-30 | 4 agent patterns library |
| 1.5.0 | 2026-01-30 | 5 documentation templates |
| 1.4.0 | 2026-01-30 | 5 command templates (refactoring, testing) |
| 1.3.0 | 2026-01-30 | 3 skill templates, install-skill command |
| 1.2.0 | 2026-01-30 | 7 additional hook templates |
| 1.1.0 | 2026-01-30 | 5 missing hook templates |
| 1.0.0 | Initial | Core CLI, init, wizard |

---

*Documentation generated for Claude CLI Advanced Starter Pack v2.2.3*
