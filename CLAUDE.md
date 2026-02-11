# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude CLI Advanced Starter Pack (CCASP) is a Node.js CLI toolkit that extends Claude Code CLI with agents, hooks, skills, MCP server discovery, phased development planning, and GitHub Project Board integration. It operates in two phases:

1. **Terminal phase** (no AI): File-based tech stack detection, template processing, `.claude/` scaffolding
2. **Claude Code phase** (AI-powered): Slash commands, agent orchestration, interactive workflows

## Build and Run Commands

```bash
# Run CLI
npm start                    # or: node bin/gtask.js

# Run with menu (default)
ccasp                        # Opens interactive menu

# Setup wizard (mobile-friendly, single-char inputs)
ccasp wizard

# Quick init (auto-detect + deploy to project)
ccasp init

# Linting
npm run lint                 # ESLint on src/

# Syntax validation (no test framework)
npm test                     # node --check on entry points
```

## Architecture

```
bin/
├── gtask.js          # CLI entry point (Commander.js)
└── postinstall.js    # npm install welcome message

src/
├── commands/         # 23 command implementations
│   ├── init.js              # Deploy to project, create .claude/
│   ├── detect-tech-stack.js # File-based tech detection (44KB, core engine)
│   ├── setup-wizard.js      # Vibe-code friendly setup
│   ├── claude-audit.js      # CLAUDE.md validation/enhancement
│   ├── create-agent.js      # L1/L2/L3 agent builder
│   ├── create-hook.js       # Enforcement hook generator
│   ├── create-skill.js      # RAG skill builder
│   ├── create-phase-dev.js  # Phased development planner
│   └── explore-mcp.js       # MCP server discovery
├── cli/
│   └── menu.js              # Interactive ASCII menu
├── github/
│   └── client.js            # GitHub API wrapper (uses gh CLI)
├── utils/
│   └── template-engine.js   # Handlebars-style placeholder replacement
├── agents/
│   └── templates.js         # Agent definition generators
└── index.js                 # Main exports

templates/
├── commands/         # Slash command templates (.template.md)
└── hooks/            # Enforcement hook templates (.template.js)
```

## Key Patterns

### Two-Phase Architecture
Terminal commands read files and generate config without AI. Slash commands (deployed to `.claude/commands/`) are AI-powered and run inside Claude Code CLI.

### Tech Stack Detection (`src/commands/detect-tech-stack.js`)
Scans `package.json`, config files, and directory structure to detect frameworks. Outputs `tech-stack.json` used for template placeholder replacement. No AI - pure pattern matching.

### Template Engine (`src/utils/template-engine.js`)
Supports Handlebars-style syntax:
```handlebars
{{#if deployment.backend.platform}}
  {{#if (eq deployment.backend.platform "railway")}}...{{/if}}
{{/if}}
{{variable.path}}
${CWD}, ${HOME}
```

### CLI Structure
Uses Commander.js with `menu` as default command. Subcommands: `init`, `wizard`, `setup`, `create`, `detect-stack`, `create-agent`, `create-hook`, etc.

### ES Modules
All code uses ES6 `import`/`export` syntax. Package has `"type": "module"`.

## External Dependencies

- **GitHub CLI (`gh`)**: Required for GitHub integration features. Must be v2.40+ and authenticated.
- **Node.js 18+**: Minimum version requirement.

## Key Slash Commands

| Command | Description |
|---------|-------------|
| `/pr-merge` | Interactive PR merge with conflict/blocker resolution |
| `/github-task-start` | Start or complete tasks from GitHub Project Board |
| `/deploy-full` | Parallel full-stack deployment |
| `/create-task-list` | AI-powered task list generation |
| `/phase-dev-plan` | Create phased development plans |
| `/ai-constitution-framework` | Code style enforcement documentation |
| `/landing-page-generator` | Screenshot pipeline, device framing, GIF generation, landing page components |
| `/landing-page-toggle` | Enable/disable landing page in production |

## AI Constitution Framework

Code style and architecture preferences enforcement system. Ensures Claude follows project-specific coding standards.

### Configuration
- **YAML Schema**: `.claude/config/constitution.yaml` - Project rules
- **JSON Schema**: `templates/constitution.schema.json` - Validation
- **Hook**: `templates/hooks/constitution-enforcer.template.js` - Enforcement

### CLI Commands
```bash
ccasp constitution-init              # Interactive setup
ccasp constitution-init --preset senior   # Senior fullstack defaults (5% sampling)
ccasp constitution-init --preset minimal  # Security only (2% sampling)
ccasp constitution-init --preset strict   # All rules (15% sampling)
```

### Rule Sections
- `code_style` - Naming conventions, type annotations
- `architecture` - Module boundaries, patterns
- `security` - Input validation, credentials (always checked)
- `performance` - Async patterns, memoization
- `git` - Commit format, branch rules
- `dependencies` - Version pinning, security

## Agent-Only Mode

When Agent-Only Mode is enabled (`delegation.json`), certain commands bypass restrictions via exempt patterns:

```javascript
// src/hooks/delegation-config.js
exemptPatterns: [
  '^git ',       // Git operations
  '^gh ',        // GitHub CLI (PRs, issues, checks)
  '^npm test',   // Test runners
  '^pytest',
  '^npx playwright'
]
```

Commands like `/pr-merge` work seamlessly because `git` and `gh` are exempt.

## Session Restart Requirement

After running `ccasp init` or modifying `.claude/`, users must restart Claude Code CLI for new commands to appear.

## Feature Presets (during init)

| Letter | Preset | Features |
|--------|--------|----------|
| A | Minimal | Menu + help only |
| B | Standard | GitHub + phased dev (recommended) |
| C | Full | All features including deployment |
| D | Custom | Pick individual features |
