# Claude CLI Advanced Starter Pack - Documentation

Welcome to the CCASP documentation wiki. This toolkit supercharges your Claude Code CLI experience with agents, hooks, skills, and more.

## Quick Navigation

| Page | Description |
|------|-------------|
| [Getting Started](Getting-Started) | Installation and first steps |
| [Agents](Agents) | L1/L2/L3 agent hierarchy |
| [Hooks](Hooks) | PreToolUse, PostToolUse, UserPromptSubmit |
| [Skills](Skills) | RAG-enhanced skill packages |
| [Templates](Templates) | Template engine and placeholders |
| [Features](Features) | Optional features in detail |
| [Phased Development](Phased-Development) | 95%+ success rate planning |
| [CLAUDE.md Guide](CLAUDE-MD-Guide) | Best practices for CLAUDE.md |
| [MCP Servers](MCP-Servers) | Model Context Protocol integration |
| [Troubleshooting](Troubleshooting) | Common issues and solutions |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                CLAUDE CLI ADVANCED STARTER PACK              │
│                                                              │
│  PHASE 1: TERMINAL (No AI) ─────────────────────────────    │
│                                                              │
│  npm install → postinstall message → ccasp wizard            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Tech Stack  │  │  Template   │  │   Feature   │          │
│  │  Detection  │→ │   Engine    │→ │  Selection  │          │
│  │ (file-based)│  │(no AI)      │  │(interactive)│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │              YOUR PROJECT (.claude/)             │        │
│  │  commands/ │ agents/ │ skills/ │ hooks/ │ docs/ │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  PHASE 2: CLAUDE CODE CLI (AI-Powered) ─────────────────    │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │           CLAUDE CODE CLI (restart required)     │        │
│  │  /menu │ /ccasp-setup │ /github-update │ ...    │        │
│  │         ↑ These are AI-powered slash commands    │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Two Types of Commands

| Type | Where to Run | Example | AI Required? |
|------|--------------|---------|--------------|
| **Terminal Commands** | Your shell | `ccasp wizard` | No |
| **Slash Commands** | Inside Claude Code CLI | `/menu` | Yes |

## Quick Start

```bash
# 1. Install
npm install -g claude-cli-advanced-starter-pack

# 2. Run setup (creates .claude/ folder)
ccasp wizard

# 3. Restart Claude Code CLI

# 4. Use slash commands inside Claude
/menu
```

## Support

- [GitHub Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues)
- [Contributing Guidelines](https://github.com/evan043/claude-cli-advanced-starter-pack/blob/master/CONTRIBUTING.md)
