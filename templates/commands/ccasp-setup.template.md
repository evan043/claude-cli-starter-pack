---
description: CCASP Setup Wizard - vibe-code friendly project configuration
model: haiku
---

# /ccasp-setup - Claude CLI Advanced Starter Pack Setup

Interactive setup wizard for Claude Code CLI enhancement.

## Quick Options

Reply with a **number** or **letter** to select:

| # | Action | Description |
|---|--------|-------------|
| **1** | Quick Start | Auto-detect stack + init .claude |
| **2** | Full Setup | All features with customization |
| **3** | GitHub | Connect project board |
| **4** | Audit | Check existing CLAUDE.md |
| **5** | Enhance | Generate/improve CLAUDE.md |
| **6** | Detect | Show detected tech stack |
| **7** | Templates | Browse available items |

## Feature Presets

| Letter | Preset | Features |
|--------|--------|----------|
| **A** | Minimal | Menu + help only |
| **B** | Standard | Essential + GitHub + testing |
| **C** | Full | Everything including agents |
| **D** | Custom | Pick individual features |

## Instructions for Claude

When this command is invoked:

1. **Show welcome message** with current project status:
   - Does `.claude/` exist?
   - Does `CLAUDE.md` exist?
   - Is tech stack detected?

2. **Present the quick options menu** (shown above)

3. **Handle user selection**:
   - If user types a number (1-7), execute that action
   - If user types a letter (A-D), apply that preset
   - If user types a feature name, toggle that feature

4. **For Quick Start (1)**:
   - Run tech stack detection
   - Show detected stack summary
   - Ask for preset selection (A-D)
   - Initialize `.claude/` folder
   - Offer to generate CLAUDE.md

5. **For Audit (4) or Enhance (5)**:
   - Load existing CLAUDE.md if present
   - Analyze against Anthropic best practices
   - Suggest improvements or generate new content

## Vibe-Code Design Principles

This wizard is designed for mobile/remote use:
- **Single character inputs** - Just type "1" or "A"
- **No long text entry** - All options via selection
- **Progressive disclosure** - Don't overwhelm
- **Defaults that work** - Standard preset is recommended

## Terminal Alternative

If running outside Claude Code CLI:

```bash
# Run setup wizard
npx ccasp wizard

# Quick commands
npx ccasp init          # Initialize .claude folder
npx ccasp detect-stack  # Detect tech stack
npx ccasp claude-audit  # Audit CLAUDE.md
```

## Available Features

| Feature | Description |
|---------|-------------|
| `essential` | Menu, help commands |
| `github` | GitHub Project Board integration |
| `testing` | Test framework + Ralph Loop |
| `deployment` | Deploy commands (Cloudflare, Railway) |
| `agents` | L1/L2/L3 agent hierarchy |
| `hooks` | Pre/Post tool enforcement |
| `phasedDev` | Phased development plans |

---

*Part of Claude CLI Advanced Starter Pack*
