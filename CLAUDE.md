# CLAUDE.md - CCASP Development Guide

This file provides guidance to Claude Code when working on the **Claude CLI Advanced Starter Pack (CCASP)** npm package.

---

## CRITICAL: Auto-Build Requirement

**IMPORTANT**: When modifying ANY file in these directories, you MUST run `npm test` to verify syntax before committing:

- `src/` - Core CLI source code
- `templates/` - Slash command and hook templates
- `bin/` - CLI entry points
- `.claude/` - Local development commands/hooks

This ensures the npm package remains functional. The PostToolUse hook `ccasp-auto-build.js` will remind you if you forget.

**Exception**: If the user explicitly says "don't build", "skip build", or "no build needed", skip the build step.

---

## Project Overview

CCASP is a Node.js CLI toolkit that extends Claude Code CLI with:
- **Agents** (L1 orchestrators, L2 specialists, L3 workers)
- **Hooks** (PreToolUse, PostToolUse, UserPromptSubmit enforcement)
- **Skills** (RAG-enhanced command packages)
- **MCP Server Discovery** (auto-detect and configure)
- **Phased Development** (95%+ success rate planning)
- **GitHub Project Board Integration** (issue tracking, progress sync)

### Two-Phase Architecture

1. **Terminal phase** (no AI): File-based tech stack detection, template processing, `.claude/` scaffolding
2. **Claude Code phase** (AI-powered): Slash commands, agent orchestration, interactive workflows

---

## Quick Reference

### Run Commands
```bash
npm start                    # Run CLI (node bin/gtask.js)
ccasp                        # Interactive menu (if globally installed)
ccasp init                   # Deploy to a project
ccasp wizard                 # Setup wizard
npm test                     # Syntax validation
npm run lint                 # ESLint
```

### Publish to npm
```bash
npm version patch            # Bump version
npm publish                  # Publish (runs prepublishOnly first)
```

---

## Architecture

```
bin/
├── gtask.js              # CLI entry point (Commander.js)
└── postinstall.js        # npm install welcome message

src/
├── commands/             # Command implementations
│   ├── init.js           # Deploy to project, create .claude/
│   ├── detect-tech-stack.js  # File-based tech detection (core engine)
│   ├── setup-wizard.js   # Vibe-code friendly setup
│   ├── test-setup.js     # Testing configuration wizard
│   └── ...               # 20+ other commands
├── cli/
│   └── menu.js           # Interactive ASCII menu
├── github/
│   └── client.js         # GitHub API wrapper (uses gh CLI)
├── testing/
│   └── config.js         # Testing config (saves to tech-stack.json)
├── utils/
│   └── template-engine.js  # Handlebars-style placeholder replacement
├── agents/
│   └── templates.js      # Agent definition generators
└── index.js              # Main exports

templates/
├── commands/             # Slash command templates (.template.md)
└── hooks/                # Enforcement hook templates (.template.js)
```

---

## Key Patterns

### Template Engine (`src/utils/template-engine.js`)
Supports Handlebars-style syntax with tech-stack.json values:
```handlebars
{{#if deployment.backend.platform}}
  {{#if (eq deployment.backend.platform "railway")}}...{{/if}}
{{/if}}
{{testing.e2e.framework}}
{{testing.selectors.username}}
${CWD}, ${HOME}
```

### Testing Configuration
Testing config is stored in `tech-stack.json` under the `testing` section:
- `testing.e2e.framework` - Playwright, Cypress, etc.
- `testing.selectors.*` - Login form selectors
- `testing.credentials.*` - Env var names for credentials
- `testing.environment.*` - Base URL and setup

Run `ccasp test-setup` to configure interactively.

### ES Modules
All code uses ES6 `import`/`export`. Package has `"type": "module"`.

---

## GitHub Project Board

**Project:** CCASP Development
**URL:** https://github.com/users/evan043/projects/6
**Number:** 6

View issues: `gh issue list`
Add to board: `gh project item-add 6 --owner evan043 --url <issue-url>`

---

## Development Workflow

1. **Make changes** to `src/`, `templates/`, or `bin/`
2. **Run `npm test`** to verify syntax
3. **Test locally** with `npm start` or `node bin/gtask.js`
4. **Commit** with descriptive message
5. **Bump version** if publishing: `npm version patch`
6. **Publish** with `npm publish`

---

## External Dependencies

- **Node.js 18+**: Minimum version
- **GitHub CLI (`gh`)**: Required for GitHub features (v2.40+, authenticated)

---

## Feature Presets (during `ccasp init`)

| Letter | Preset | Features |
|--------|--------|----------|
| A | Minimal | Menu + help only |
| B | Standard | GitHub + phased dev (recommended) |
| C | Full | All features including deployment |
| D | Custom | Pick individual features |

---

## Session Restart Requirement

After running `ccasp init` or modifying `.claude/` in a target project, users must restart Claude Code CLI for new commands to appear.
