# /dev-mode-deploy-to-projects

Sync ALL modified CCASP worktree files to registered projects - source code, templates, hooks, and commands.

## Usage

```
/dev-mode-deploy-to-projects [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without applying |
| `--force` | Overwrite all files (skip customization check) |
| `--project <name>` | Sync specific project by name |

## What Gets Synced

This command syncs **ALL** modified/new files from the worktree, not just templates:

| Category | Source | Destination |
|----------|--------|-------------|
| **Source files** | `src/**/*.js` | `src/**/*.js` |
| **CLI entry** | `bin/*.js` | `bin/*.js` |
| **Command templates** | `templates/commands/*.template.md` | `.claude/commands/*.md` |
| **Hook templates** | `templates/hooks/*.template.js` | `templates/hooks/*.js` |
| **Config files** | `config/**/*` | `config/**/*` |
| **Other modified** | Any other changed files | Same relative path |

## Examples

### Preview what would sync
```
/dev-mode-deploy-to-projects --dry-run
```

### Sync all projects
```
/dev-mode-deploy-to-projects
```

### Sync specific project
```
/dev-mode-deploy-to-projects --project "Plan Design"
```

---

## Instructions

<command-name>dev-mode-deploy-to-projects</command-name>

When the user invokes `/dev-mode-deploy-to-projects`, execute the fast sync command:

### Step 1: Run the Sync Command

Execute the `ccasp dev-sync` CLI command which handles everything automatically:

```bash
# Basic sync - syncs all modified/new files to all registered projects
ccasp dev-sync

# With dry-run to preview
ccasp dev-sync --dry-run

# Force overwrite
ccasp dev-sync --force

# Specific project
ccasp dev-sync --project "Project Name"
```

### Step 2: Parse User Options

If the user provided options with the slash command, pass them through:

- `--dry-run` → `ccasp dev-sync --dry-run`
- `--force` → `ccasp dev-sync --force`
- `--project "Name"` → `ccasp dev-sync --project "Name"`

### Step 3: Display Results

The CLI command will output:
- List of changed files (modified + new)
- Projects being synced
- Per-project file counts
- Final summary

Example output:
```
🔄 Dev Mode Sync

  Worktree: F:\tools\ccasp-dev-2

Scanning for changes...
  Found 15 modified, 4 new files

Files to sync:
  Source files:      12
  Command templates:  1
  Hook templates:     0
  Other files:        6

Projects to sync (3):
  • Plan Design Calculator
  • ccasp-dev
  • claude-cli-advanced-starter-pack

📁 Plan Design Calculator
   ├── Source: 12 files
   ├── Commands: 1 deployed
   ├── Hooks: 0 deployed
   └── Other: 6 files
   ✓ Total: 19 files synced

... (repeat for each project)

══════════════════════════════════════════════════
  SYNC COMPLETE
══════════════════════════════════════════════════
  Projects: 3
  Files synced: 57

  Restart Claude Code CLI to see command changes.
```

### What the Sync Command Does

The `ccasp dev-sync` command (in `src/commands/dev-mode-sync.js`):

1. **Verifies dev mode** - Checks `~/.claude/ccasp-dev-state.json`
2. **Gets changed files** - Runs `git status --porcelain` in worktree
3. **Categorizes files** - Source, templates, hooks, other
4. **Loads projects** - From `~/.claude/ccasp-registry.json`
5. **Syncs files** - Copies each file to each project
6. **Deploys templates** - Strips `.template` suffix for commands

### Excluded Files

These files are automatically excluded from sync:
- `.ccasp-dev/` - Worktree-specific hooks
- `.dev-worktree-config.json` - Worktree config
- `node_modules/` - Dependencies
- `.git/` - Git internals

### Error Handling

- If dev mode not active: Shows error with instructions to run `ccasp dev-deploy`
- If no changes found: Shows "No modified or new files to sync"
- If project doesn't exist: Skips with warning
- If file copy fails: Logs error, continues with other files

### Notes

- The sync is fast (~1-2 seconds for typical changes)
- Command templates are automatically deployed as slash commands
- Source files are copied preserving directory structure
- Restart Claude Code CLI to see slash command changes
