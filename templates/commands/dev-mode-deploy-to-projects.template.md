# /dev-mode-deploy-to-projects

Sync CCASP worktree changes to registered projects with smart customization preservation.

## Usage

```
/dev-mode-deploy-to-projects [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--all` | Sync all registered projects |
| `--project <name>` | Sync specific project by name |
| `--dry-run` | Preview changes without applying |
| `--force` | Overwrite all files (ignore customizations) |

## Smart Sync Behavior

The sync algorithm categorizes each file:

| Category | Action | Description |
|----------|--------|-------------|
| **UNCHANGED** | Update | File matches worktree template - safe to update |
| **CUSTOMIZED** | Preserve | File differs from template - user changes preserved |
| **USER_CREATED** | Keep | File not in templates - user's custom file kept |
| **NEW** | Add | Template not in project - added to project |

## Examples

### Preview sync for all projects
```
/dev-mode-deploy-to-projects --dry-run
```

### Sync a specific project
```
/dev-mode-deploy-to-projects --project "My Project"
```

### Force sync (overwrite customizations)
```
/dev-mode-deploy-to-projects --force
```

## Output Format

```
Project: Benefits-Outreach-360
├── Updated: 12 files (unchanged from worktree)
├── Preserved: 3 files (user customizations)
│   └── menu.md (+15/-3 lines)
│   └── deploy-full.md (+8/-0 lines)
├── Added: 2 new files
│   └── new-command.md
└── Kept: 1 user-created file
```

---

## Instructions

<command-name>dev-mode-deploy-to-projects</command-name>

When the user invokes `/dev-mode-deploy-to-projects`, follow this workflow:

### Step 1: Verify Dev Mode

Check if CCASP dev mode is active:

```javascript
// Check ~/.claude/ccasp-dev-state.json
const devState = loadDevState();
if (!devState.isDevMode) {
  // Error: Dev mode not active
  console.log("Dev mode is not active. Run 'ccasp dev-deploy' first.");
  return;
}
```

If not active, inform the user and suggest running `ccasp dev-deploy`.

### Step 2: Parse Options

Parse the command options:
- `--all`: Sync all registered projects
- `--project <name>`: Sync specific project
- `--dry-run`: Preview only
- `--force`: Overwrite customizations

### Step 3: Load Projects

Get projects to sync:

```javascript
import { loadRegistry } from 'ccasp/utils/global-registry.js';

const registry = loadRegistry();
let projectsToSync = registry.projects;

// Filter if --project specified
if (options.project) {
  projectsToSync = projectsToSync.filter(p =>
    p.name.toLowerCase().includes(options.project.toLowerCase())
  );
}
```

### Step 4: Analyze Sync Actions

For each project, analyze what actions are needed:

```javascript
import { analyzeSyncActions } from 'ccasp/utils/smart-sync.js';

for (const project of projectsToSync) {
  const analysis = await analyzeSyncActions(project.path, devState.worktreePath);

  // Display analysis summary
  console.log(`Project: ${project.name}`);
  console.log(`  Can update: ${analysis.summary.update} files`);
  console.log(`  Will preserve: ${analysis.summary.preserve} files`);
  console.log(`  Will add: ${analysis.summary.add} files`);
}
```

### Step 5: Execute Sync (unless --dry-run)

If not dry-run, execute the sync:

```javascript
import { executeSyncActions, formatSyncResults } from 'ccasp/utils/smart-sync.js';

for (const project of projectsToSync) {
  const results = await executeSyncActions(
    project.path,
    devState.worktreePath,
    {
      dryRun: options.dryRun,
      force: options.force,
      preserveCustomizations: !options.force
    }
  );

  console.log(formatSyncResults(results));
}
```

### Step 6: Report Results

Display comprehensive report:

```
╔══════════════════════════════════════════════════════════════╗
║                    SYNC COMPLETE                             ║
╚══════════════════════════════════════════════════════════════╝

Projects synced: 3
Total files updated: 45
Customizations preserved: 8
New files added: 5

Restart Claude Code CLI in each project to see command changes.
```

### Error Handling

- If project path doesn't exist, skip with warning
- If project has no `.claude/` directory, skip with warning
- If worktree path is invalid, abort with error
- Log all errors but continue with other projects

### Notes

- Always backup projects before major changes (handled by dev-deploy)
- User customizations are NEVER overwritten unless `--force` is used
- New templates are always added (they don't conflict)
- CLI restart required for command changes to take effect
