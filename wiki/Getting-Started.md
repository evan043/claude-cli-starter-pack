# Getting Started

This guide walks you through installing and configuring CCASP for your project.

## Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18+
   ```

2. **Claude Code CLI** installed and working
   ```bash
   claude --version
   ```

3. **GitHub CLI** (optional, for GitHub integration)
   ```bash
   gh --version    # Should be 2.40+
   gh auth login   # Authenticate
   ```

## Installation

### Global Installation (Recommended)

```bash
npm install -g claude-cli-advanced-starter-pack
```

After installation, you'll see a welcome message with setup options.

### Per-Project Installation

```bash
npm install --save-dev claude-cli-advanced-starter-pack
npx ccasp wizard
```

## Setup Options

### Option 1: Vibe Wizard (Recommended)

Mobile-friendly setup with single-character inputs:

```bash
ccasp wizard
```

This launches an interactive menu:
- **1. Quick Start** - Auto-detect tech stack + init
- **2. Full Setup** - All features with customization
- **3. GitHub Setup** - Connect project board
- **4. Audit CLAUDE.md** - Check existing config
- **5. Enhance CLAUDE.md** - Generate/improve docs
- **6. Detect Tech Stack** - Show detected stack
- **7. View Templates** - Browse available items
- **8. Project Settings** - Configure features

### Option 2: Quick Init

```bash
ccasp init
```

Auto-detects your tech stack and deploys with minimal prompts.

### Option 3: Direct Commands

```bash
ccasp detect-stack   # See what's detected
ccasp init --minimal # Minimal setup
```

## Feature Presets

During setup, choose a preset:

| Letter | Preset | What's Included |
|--------|--------|-----------------|
| **A** | Minimal | `/menu`, `/ccasp-setup` only |
| **B** | Standard | + GitHub integration + Phased dev |
| **C** | Full | + Deployment + Tunnels + Token mgmt |
| **D** | Custom | Pick individual features |

## What Gets Created

After running `ccasp init`, your project gets:

```
.claude/
├── commands/           # Slash commands
│   ├── menu.md
│   ├── ccasp-setup.md
│   ├── create-agent.md
│   ├── create-hook.md
│   └── ...
├── agents/             # Agent definitions (if selected)
├── skills/             # Skill packages (if selected)
├── hooks/              # Enforcement hooks (if selected)
├── docs/               # Generated documentation
├── settings.json       # Project settings
└── tech-stack.json     # Detected/configured values
```

## IMPORTANT: Restart Required

**After running any setup command, you MUST restart Claude Code CLI:**

```
⚠️  RESTART REQUIRED

Changes to .claude/ require a new Claude Code session.

To apply changes:
1. Exit this session (Ctrl+C or /exit)
2. Restart: claude or claude .
3. New commands will be available
```

## First Steps After Setup

1. **Restart Claude Code CLI**
   ```bash
   claude .
   ```

2. **Open the menu**
   ```
   /menu
   ```

3. **Explore available commands**
   ```
   /ccasp-setup
   ```

## Verifying Installation

Inside Claude Code CLI, type `/menu`. You should see an interactive ASCII menu with all your installed commands.

If `/menu` isn't recognized, ensure you:
1. Ran `ccasp init` or `ccasp wizard`
2. Restarted Claude Code CLI after setup

## Next Steps

- [Learn about Agents](Agents)
- [Create enforcement Hooks](Hooks)
- [Build RAG Skills](Skills)
- [Configure Features](Features)
