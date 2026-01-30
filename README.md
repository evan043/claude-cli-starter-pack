# Claude CLI Advanced Starter Pack (CCASP)

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                          v1.0.12  •  Production Ready                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

[![npm version](https://badge.fury.io/js/claude-cli-advanced-starter-pack.svg)](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A professional-grade CLI toolkit for Claude Code CLI — agents, hooks, skills, MCP servers, phased development, and GitHub integration.**

[Getting Started](#quick-start) • [Documentation](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki) • [API Reference](#api-reference) • [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation Options](#installation-options)
- [Commands Reference](#commands-reference)
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

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **L1/L2/L3 Agent Hierarchy** | Orchestrators, specialists, and workers with configurable model selection |
| **Enforcement Hooks** | PreToolUse, PostToolUse, UserPromptSubmit hooks for validation and monitoring |
| **RAG-Enhanced Skills** | Domain-specific knowledge packages with context, templates, and workflows |
| **Phased Development** | 95%+ success rate planning with PROGRESS.json state tracking |
| **GitHub Integration** | Project Board sync, issue creation with codebase analysis |
| **MCP Server Discovery** | Auto-recommend and configure MCP servers for your stack |
| **Template Engine** | Handlebars-style placeholders with conditionals and loops |
| **Tech Stack Detection** | Pattern-based detection of 40+ frameworks and tools |

### Optional Feature Modules

| Module | Commands | Purpose |
|--------|----------|---------|
| **Token Management** | `/context-audit` | Track API usage with thresholds |
| **Deployment Automation** | `/deploy-full` | Full-stack Railway/Cloudflare/Vercel |
| **Tunnel Services** | `/tunnel-start`, `/tunnel-stop` | ngrok, localtunnel, cloudflare-tunnel |
| **Happy Mode** | `/happy-start` | Mobile app integration |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CCASP ARCHITECTURE                                        │
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
│  │  commands/ │ agents/ │ skills/ │ hooks/ │ docs/ │ settings.json  │       │
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
│   └── ...               # 20+ commands based on feature selection
├── agents/               # L1/L2/L3 agent definitions
├── skills/               # RAG-enhanced skill packages
│   └── skill-name/
│       ├── skill.md      # Definition
│       ├── context/      # Knowledge base
│       └── workflows/    # Procedures
├── hooks/                # Enforcement hooks
│   ├── pre-tool-use/
│   ├── post-tool-use/
│   └── user-prompt-submit/
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

### Post-Install Welcome

```
🚀 Claude CLI Advanced Starter Pack

✓ Installation complete!

Quick Setup Options:

1. Run vibe-friendly setup wizard:
   $ ccasp wizard

2. Quick init (auto-detect + deploy):
   $ ccasp init

3. Full interactive menu:
   $ ccasp
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
| `ccasp detect-stack` | Auto-detect tech stack | `--verbose` |
| `ccasp create-agent` | Create L1/L2/L3 agents | Interactive wizard |
| `ccasp create-hook` | Create enforcement hooks | Interactive wizard |
| `ccasp create-skill` | Create RAG skill packages | Interactive wizard |
| `ccasp create-command` | Create slash commands | Interactive wizard |
| `ccasp create-phase-dev` | Create phased dev plan | `--scale S/M/L`, `--autonomous` |
| `ccasp explore-mcp` | MCP server discovery | `--recommend`, `--testing` |
| `ccasp claude-audit` | Audit CLAUDE.md | Enhancement suggestions |
| `ccasp validate` | Validate template agnosticism | `--path`, `--fix` |
| `ccasp roadmap` | Sync roadmaps with GitHub | `import`, `sync`, `status` |
| `ccasp sync` | Sync tasks with GitHub | `pull`, `push`, `watch` |
| `ccasp list` | List recent GitHub issues | `--mine`, `--status` |

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
| `/tunnel-start` | Tunnel Services | Start ngrok/localtunnel |
| `/tunnel-stop` | Tunnel Services | Stop active tunnel |
| `/context-audit` | Token Management | Audit token usage |
| `/happy-start` | Happy Mode | Start mobile integration |

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
      "projectName": "my-app",
      "productionUrl": "https://my-app.pages.dev"
    },
    "backend": {
      "platform": "railway",
      "projectId": "{{DEPLOY_BACKEND_PROJECT_ID}}",
      "serviceId": "{{DEPLOY_BACKEND_SERVICE_ID}}",
      "environmentId": "{{DEPLOY_BACKEND_ENVIRONMENT_ID}}"
    }
  },
  "versionControl": {
    "provider": "github",
    "owner": "username",
    "repo": "repo-name",
    "defaultBranch": "main",
    "projectBoard": {
      "number": 3
    }
  },
  "features": {
    "githubIntegration": true,
    "phasedDevelopment": true,
    "tokenManagement": false,
    "deploymentAutomation": true,
    "tunnelServices": false,
    "happyMode": false
  }
}
```

### settings.json

Configure hooks and behavior:

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": ["file-guard", "token-guardian"],
    "postToolUse": ["test-enforcer", "github-progress"],
    "userPromptSubmit": ["context-loader"]
  },
  "agents": {
    "defaultModel": "sonnet",
    "maxTokensPerTask": 8000
  }
}
```

---

## Template Engine

CCASP uses a Handlebars-style template engine (398 lines) for platform-agnostic configuration.

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
  listRepos,
  createIssue,
  addIssueToProject,
  listProjectFields,

  // Codebase Analysis
  searchFiles,
  searchContent,
  findDefinitions,
  analyzeForIssue,

  // Templates
  ENHANCEMENT_TEMPLATES,
  generateClaudeCommand,
  generateIssueBody,
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

#### `replacePlaceholders(content: string, values: object, options?: object): { content: string, warnings: string[] }`

Process templates with values:

```javascript
const template = '{{project.name}} uses {{frontend.framework}}';
const { content, warnings } = replacePlaceholders(template, techStack);
// content: "my-app uses react"
```

Options:
- `preserveUnknown`: Keep unresolved placeholders (default: false)
- `warnOnMissing`: Log warnings for missing values (default: true)
- `processConditionals`: Enable conditional processing (default: true)

#### `processFile(filePath: string, values: object, options?: object): Promise<{ content: string, warnings: string[] }>`

Process a template file:

```javascript
const result = await processFile('./template.md', techStack);
```

#### `processDirectory(dirPath: string, values: object, options?: object): Promise<void>`

Process all templates in a directory:

```javascript
await processDirectory('./templates', techStack, {
  extensions: ['.md', '.json', '.js'],
  exclude: ['node_modules'],
  recursive: true
});
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
| `vercel.json` | Vercel config |
| `Dockerfile` | Container setup |
| Directory structure | Project type (monorepo, fullstack, etc.) |

### Detected Categories

- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro
- **Backend**: FastAPI, Express, NestJS, Django, Flask, Rails, Gin
- **Database**: PostgreSQL, MySQL, MongoDB, SQLite, Redis
- **ORM**: Prisma, TypeORM, SQLAlchemy, Drizzle
- **Testing**: Jest, Vitest, Mocha, pytest, Playwright, Cypress
- **Deployment**: Railway, Vercel, Netlify, Cloudflare, Heroku, AWS
- **Build Tools**: Vite, Webpack, esbuild, Turbopack

---

## Feature Presets

During setup, choose a preset for quick configuration:

| Letter | Preset | Features Included |
|--------|--------|-------------------|
| **A** | Minimal | `/menu`, `/ccasp-setup` only |
| **B** | Standard | + GitHub Integration + Phased Development |
| **C** | Full | + Deployment + Tunnels + Token Management |
| **D** | Custom | Pick individual features |

---

## MCP Server Integration

CCASP helps discover and configure Model Context Protocol (MCP) servers:

```bash
ccasp explore-mcp              # Interactive menu
ccasp explore-mcp --recommend  # Auto-recommend based on codebase
ccasp explore-mcp --testing    # Quick install Playwright + Puppeteer
```

### Supported MCP Servers

| Category | Servers |
|----------|---------|
| **Testing** | Playwright, Puppeteer, Browser Monitor |
| **Deployment** | Railway, Cloudflare, Vercel |
| **Version Control** | GitHub, GitLab |
| **Database** | PostgreSQL, SQLite, Redis |
| **Communication** | Slack, Discord, Email |
| **Utilities** | Filesystem, Fetch, Memory |

### MCP Configuration Generated

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-railway"],
      "env": {
        "RAILWAY_API_TOKEN": "your-token"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

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
ccasp validate --path templates # Check template agnosticism
ccasp claude-audit              # Audit CLAUDE.md quality
```

For detailed troubleshooting, see the [Troubleshooting Wiki](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki/Troubleshooting).

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
├── commands/           # 23 command implementations
├── cli/               # Interactive menu system
├── github/            # GitHub API wrapper
├── agents/            # Agent template generators
├── utils/             # Template engine, validators
└── index.js           # Main exports

templates/
├── commands/          # Slash command templates
└── hooks/             # Hook templates
```

---

## License

MIT © [evan043](https://github.com/evan043)

---

<div align="center">

**Made for Claude Code CLI** — Supercharge your AI-assisted development workflow.

[Documentation](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki) • [Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues) • [npm](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)

</div>
