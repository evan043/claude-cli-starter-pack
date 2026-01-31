# Claude CLI Advanced Starter Pack (CCASP)

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                          v1.8.0  •  Production Ready                          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![npm version](https://badge.fury.io/js/claude-cli-advanced-starter-pack.svg)](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A professional-grade CLI toolkit for Claude Code CLI — 60+ components including agents, hooks, skills, MCP servers, phased development, and GitHub integration.**

[Getting Started](#quick-start) • [Documentation](./docs/WIKI.md) • [API Reference](#api-reference) • [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [What's New in v1.8.0](#whats-new-in-v180)
- [Key Features](#key-features)
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

## What's New in v1.8.0

**60+ components** across 8 implementation phases:

| Phase | Version | Components |
|-------|---------|------------|
| Phase 1-2 | v1.1-1.2 | **12 Hook Templates** — token management, session tracking, deployment automation |
| Phase 3 | v1.3 | **3 Skill Templates** — agent-creator, hook-creator, rag-agent-creator |
| Phase 4 | v1.4 | **5 Command Templates** — refactoring tools, smoke test generation |
| Phase 5 | v1.5 | **5 Documentation Templates** — architecture constitution, gotchas, checklists |
| Phase 6 | v1.6 | **4 Agent Patterns** — L1→L2 orchestration, multi-phase, query pipeline |
| Phase 7 | v1.7 | **7 MCP Servers** — log-monitor, browser-monitor, tunnel services |
| Phase 8 | v1.8 | **7 Utility Scripts** — deployment validation, roadmap scanning, security audit |

---

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **L1/L2/L3 Agent Hierarchy** | Orchestrators, specialists, and workers with configurable model selection |
| **12 Enforcement Hooks** | PreToolUse, PostToolUse, UserPromptSubmit hooks for validation and monitoring |
| **3 RAG-Enhanced Skills** | Domain-specific knowledge packages with context, templates, and workflows |
| **Phased Development** | 95%+ success rate planning with PROGRESS.json state tracking |
| **GitHub Integration** | Project Board sync, issue creation with codebase analysis |
| **7 MCP Servers** | Auto-recommend and configure MCP servers for your stack |
| **4 Agent Patterns** | Reusable orchestration patterns for complex multi-agent tasks |
| **7 Utility Scripts** | Deployment validation, security audits, log analysis |
| **Template Engine** | Handlebars-style placeholders with conditionals and loops |
| **Tech Stack Detection** | Pattern-based detection of 40+ frameworks and tools |

### Hook Templates (12 Total)

| Hook | Purpose | Portability |
|------|---------|-------------|
| `tool-output-cacher` | Cache >2KB outputs, save ~500 tokens | 100% |
| `token-budget-loader` | Pre-calculate daily budget | 100% |
| `token-usage-monitor` | Auto-respawn at 90% threshold | 100% |
| `session-id-generator` | UUID sessions with PID registry | 100% |
| `autonomous-decision-logger` | JSONL audit trail | 95% |
| `git-commit-tracker` | Update PROGRESS.json | 90% |
| `branch-merge-checker` | Validate main sync before deploy | 95% |
| `phase-validation-gates` | 5-gate validation | 90% |
| `issue-completion-detector` | Auto-trigger deployment | 85% |
| `context-injector` | Inject prior session context | 85% |
| `happy-title-generator` | Auto-generate session titles | 100% |
| `happy-mode-detector` | Detect Happy daemon env | 100% |

### Agent Patterns (4 Patterns)

| Pattern | Use Case | Complexity |
|---------|----------|------------|
| [Two-Tier Query Pipeline](./templates/patterns/two-tier-query-pipeline.md) | Intent classification + execution | Medium |
| [L1→L2 Orchestration](./templates/patterns/l1-l2-orchestration.md) | Master-worker parallel tasks | Medium |
| [Multi-Phase Orchestration](./templates/patterns/multi-phase-orchestration.md) | Sequential phases with parallel tasks | High |
| [5-Point Integration Validation](./templates/patterns/README.md) | EXIST→INIT→REGISTER→INVOKE→PROPAGATE | High |

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

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CCASP ARCHITECTURE (v1.8.0)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: TERMINAL (No AI)                                                   │
│  ─────────────────────────                                                   │
│                                                                              │
│  npm install ──► postinstall ──► ccasp wizard                                │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│  │  Tech Stack  │──►│   Template   │──►│   Feature    │                     │
│  │  Detection   │   │   Engine     │   │  Selection   │                     │
│  │ (768 lines)  │   │ (398 lines)  │   │ (1386 lines) │                     │
│  └──────────────┘   └──────────────┘   └──────────────┘                     │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    YOUR PROJECT (.claude/)                        │       │
│  │  commands/ │ agents/ │ skills/ │ hooks/ │ scripts/ │ docs/       │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  PHASE 2: CLAUDE CODE CLI (AI-Powered)                                       │
│  ─────────────────────────────────────                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     RESTART REQUIRED                              │       │
│  │                            ↓                                      │       │
│  │  /menu │ /deploy-full │ /github-update │ /phase-track │ ...      │       │
│  │                                                                   │       │
│  │  Agents: L1 Orchestrators ──► L2 Specialists ──► L3 Workers      │       │
│  │  Hooks: PreToolUse | PostToolUse | UserPromptSubmit              │       │
│  │  Skills: RAG context + templates + workflows                      │       │
│  │  Patterns: Query Pipeline | L1→L2 | Multi-Phase                  │       │
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
| `/refactor-check` | Refactoring Tools | Pre-commit quality gate |
| `/refactor-cleanup` | Refactoring Tools | Auto-fix lint, format, imports |
| `/create-smoke-test` | Testing | Auto-generate Playwright tests |
| `/ask-claude` | Discovery | Natural language command search |

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
├── commands/           # 25 command implementations
├── cli/               # Interactive menu system
├── github/            # GitHub API wrapper
├── agents/            # Agent template generators
├── utils/             # Template engine, validators
└── index.js           # Main exports

templates/
├── commands/          # Slash command templates (18)
├── hooks/             # Hook templates (12)
├── skills/            # Skill templates (3)
├── patterns/          # Agent patterns (4)
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
