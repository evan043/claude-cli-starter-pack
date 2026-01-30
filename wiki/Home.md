# Claude CLI Advanced Starter Pack - Documentation

Welcome to the CCASP documentation wiki. This toolkit supercharges your Claude Code CLI experience with agents, hooks, skills, MCP servers, phased development, and GitHub Project Board integration.

## Quick Navigation

| Page | Description |
|------|-------------|
| [Getting Started](Getting-Started) | Installation, setup wizard, feature presets |
| [Architecture](Architecture) | Two-phase design, internal components, data flow |
| [Agents](Agents) | L1/L2/L3 agent hierarchy with complete examples |
| [Hooks](Hooks) | PreToolUse, PostToolUse, UserPromptSubmit enforcement |
| [Skills](Skills) | RAG-enhanced skill packages with workflows |
| [Templates](Templates) | Template engine syntax and capabilities |
| [Features](Features) | Optional feature modules in detail |
| [Phased Development](Phased-Development) | 95%+ success rate methodology |
| [CLAUDE.md Guide](CLAUDE-MD-Guide) | Best practices for CLAUDE.md |
| [MCP Servers](MCP-Servers) | Model Context Protocol integration |
| [API Reference](API-Reference) | Programmatic usage and exports |
| [Configuration Schema](Configuration-Schema) | Complete tech-stack.json reference |
| [Version Updates](Version-Updates) | Auto-updates and version tracking |
| [Troubleshooting](Troubleshooting) | Common issues and solutions |

---

## Architecture Overview

CCASP operates in **two distinct phases**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CCASP TWO-PHASE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: TERMINAL (No AI Required)                                          │
│  ═══════════════════════════════════                                         │
│                                                                              │
│  npm install ──────────► postinstall.js ──────────► ccasp wizard            │
│       │                      │                          │                    │
│       │                      │                          │                    │
│       ▼                      ▼                          ▼                    │
│  Package Setup          Welcome Message          Setup Wizard                │
│  (dependencies)         (3 options shown)        (interactive)               │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │  Tech Stack    │  │   Template     │  │   Feature      │                 │
│  │  Detection     │──│   Engine       │──│   Selection    │                 │
│  │                │  │                │  │                │                 │
│  │ • package.json │  │ • {{var}}      │  │ • Presets A-D  │                 │
│  │ • config files │  │ • {{#if}}      │  │ • Custom pick  │                 │
│  │ • directories  │  │ • {{#each}}    │  │ • Configure    │                 │
│  │ • git config   │  │ • conditionals │  │                │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│           │                   │                    │                         │
│           ▼                   ▼                    ▼                         │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    YOUR PROJECT (.claude/)                        │       │
│  │                                                                   │       │
│  │  commands/   agents/   skills/   hooks/   docs/   settings.json  │       │
│  │      │          │         │         │        │          │        │       │
│  │  20+ slash  L1/L2/L3   RAG pkgs  Pre/Post  Generated  Hook      │       │
│  │  commands   agents     + context  hooks     docs      config     │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                    │                                         │
│                      ══════════════════════════════                         │
│                      ║   RESTART REQUIRED HERE   ║                         │
│                      ══════════════════════════════                         │
│                                    │                                         │
│  PHASE 2: CLAUDE CODE CLI (AI-Powered)                                       │
│  ═════════════════════════════════════                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     CLAUDE CODE CLI                               │       │
│  │                                                                   │       │
│  │  /menu  /deploy-full  /github-update  /phase-track  /create-*   │       │
│  │                                                                   │       │
│  │  ┌─────────────────────────────────────────────────────────┐     │       │
│  │  │                  AGENT HIERARCHY                         │     │       │
│  │  │                                                          │     │       │
│  │  │   L1 ORCHESTRATOR (opus/sonnet)                         │     │       │
│  │  │         │                                                │     │       │
│  │  │         ├──► L2 SPECIALIST (sonnet) ──► L3 WORKER (haiku)│    │       │
│  │  │         │                                                │     │       │
│  │  │         └──► L2 SPECIALIST (sonnet) ──► L3 WORKER (haiku)│    │       │
│  │  └─────────────────────────────────────────────────────────┘     │       │
│  │                                                                   │       │
│  │  ┌────────────────────────────────────────────────────────┐      │       │
│  │  │                    HOOKS                                │      │       │
│  │  │  PreToolUse ─► PostToolUse ─► UserPromptSubmit         │      │       │
│  │  │  (block/modify) (track/log)   (load context)           │      │       │
│  │  └────────────────────────────────────────────────────────┘      │       │
│  │                                                                   │       │
│  │  ┌────────────────────────────────────────────────────────┐      │       │
│  │  │                    SKILLS (RAG)                         │      │       │
│  │  │  context/ ─► templates/ ─► workflows/                  │      │       │
│  │  │  (knowledge)  (code gen)   (procedures)                │      │       │
│  │  └────────────────────────────────────────────────────────┘      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Concepts

| Concept | Description | When It Runs |
|---------|-------------|--------------|
| **Tech Stack Detection** | Pattern-based file scanning (768 lines of logic) | Terminal, during init |
| **Template Engine** | Handlebars-style processing with conditionals | Terminal, during init |
| **Slash Commands** | AI-powered markdown commands with YAML frontmatter | Claude Code CLI |
| **Agents** | L1/L2/L3 hierarchy for task delegation | Claude Code CLI |
| **Hooks** | JavaScript enforcement mechanisms | Claude Code CLI |
| **Skills** | RAG packages with context + workflows | Claude Code CLI |

---

## Two Types of Commands

| Type | Where | AI | Purpose | Example |
|------|-------|-----|---------|---------|
| **Terminal** | bash/PowerShell | No | Scaffolding, detection, config | `ccasp wizard` |
| **Slash** | Inside Claude | Yes | AI workflows, automation | `/menu`, `/deploy-full` |

### Why Two Phases?

1. **Separation of Concerns**: File operations don't need AI
2. **Performance**: Detection is faster without API calls
3. **Reliability**: Config generation works offline
4. **Cost**: No tokens spent on scaffolding

---

## Quick Start

```bash
# 1. Install globally (once)
npm install -g claude-cli-advanced-starter-pack

# 2. Run setup in your project (terminal - no AI)
cd your-project
ccasp wizard

# 3. CRITICAL: Restart Claude Code CLI
#    .claude/ changes require new session
claude .

# 4. Use AI-powered slash commands
/menu
```

---

## Codebase Statistics

| Metric | Value |
|--------|-------|
| **Total Source Lines** | ~25,315 |
| **Commands** | 23 implementations |
| **Template Engine** | 398 lines |
| **Tech Detection** | 768 lines |
| **Setup Wizard** | 1,386 lines |
| **Init Command** | 2,123 lines |
| **Dependencies** | 7 production |

---

## Feature Modules

| Module | Default | Commands | Purpose |
|--------|---------|----------|---------|
| **Core** | Always | `/menu`, `/ccasp-setup` | Navigation, setup |
| **GitHub Integration** | Preset B+ | `/github-update`, `/github-task-start` | Project Board sync |
| **Phased Development** | Preset B+ | `/phase-dev-plan`, `/phase-track` | 95%+ success planning |
| **Token Management** | Preset C | `/context-audit` | Usage tracking |
| **Deployment** | Preset C | `/deploy-full` | Railway/Cloudflare/etc |
| **Tunnel Services** | Preset C | `/tunnel-start`, `/tunnel-stop` | ngrok/localtunnel |
| **Happy Mode** | Preset C | `/happy-start` | Mobile app integration |

---

## Support & Community

- [GitHub Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues) - Bug reports and feature requests
- [npm Package](https://www.npmjs.com/package/claude-cli-advanced-starter-pack) - Latest releases
- [Contributing Guidelines](https://github.com/evan043/claude-cli-advanced-starter-pack/blob/master/CONTRIBUTING.md)

---

## Version History

| Version | Highlights |
|---------|------------|
| 1.0.12 | Windows compatibility, update check hook |
| 1.0.11 | Enhanced removal wizard, backup/restore |
| 1.0.10 | Dynamic menu with version tracking |
| 1.0.9 | Automatic update notifications |
| 1.0.8 | MCP server discovery |
