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

## Uninstalling / Removing CCASP

If you need to remove CCASP from a project, the wizard provides safe removal with backup options.

### Remove via Wizard

```bash
ccasp wizard
# Select "6. Remove CCASP"
```

You'll see four options:

| Option | Description |
|--------|-------------|
| **1. Remove ALL** | Delete `.claude/` folder and `CLAUDE.md` without backup |
| **2. Remove with backup** | Full backup to `.claude-backup/` before deletion |
| **3. Selective removal** | Choose specific items to remove |
| **4. Restore from backup** | Restore from a previous backup (if backups exist) |

### What Gets Backed Up

When using "Remove with backup", CCASP saves:

- **`.claude/` folder** - All commands, agents, skills, hooks, config
- **`CLAUDE.md` file** - Your project instructions

Backups are stored in `.claude-backup/{timestamp}/` with the original structure preserved.

### Restoring from Backup

1. Run `ccasp wizard`
2. Select "6. Remove CCASP"
3. Select "4. Restore from backup"
4. Choose which backup to restore
5. Restart Claude Code CLI

The restore function brings back both `.claude/` and `CLAUDE.md` exactly as they were.

### Backup Location

Backups are stored in:
```
your-project/
├── .claude-backup/
│   ├── 2025-01-30T12-30-45/      # Full backup
│   │   ├── .claude/              # Folder backup
│   │   └── CLAUDE.md             # File backup
│   └── selective-2025-01-30T14-00-00/  # Selective backup
│       ├── .claude/
│       │   └── commands/         # Only what you removed
│       └── CLAUDE.md             # If you removed it
```

### Clean Uninstall

To completely remove CCASP:

1. Remove from project:
   ```bash
   ccasp wizard  # Select Remove ALL
   rm -rf .claude-backup  # Optional: remove backups
   ```

2. Uninstall globally:
   ```bash
   npm uninstall -g claude-cli-advanced-starter-pack
   ```

## Next Steps

- [Learn about Agents](Agents)
- [Create enforcement Hooks](Hooks)
- [Build RAG Skills](Skills)
- [Configure Features](Features)
- [Version Updates](Version-Updates)
