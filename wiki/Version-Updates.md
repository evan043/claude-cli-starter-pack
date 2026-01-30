# Version Updates

CCASP includes an automatic version tracking system that notifies you when updates are available and helps you stay current with new features.

## How Version Checking Works

### Automatic Checks

When you run `ccasp wizard`, the system automatically:

1. **Checks npm registry** for the latest published version (10 second timeout)
2. **Compares versions** using semantic versioning (major.minor.patch)
3. **Caches results** for 1 hour to avoid excessive network calls
4. **Shows update banner** if a newer version is available

### Check Timing

| Scenario | Check Performed |
|----------|-----------------|
| First run | Always checks npm |
| Within 1 hour of last check | Uses cached result |
| After 1 hour | Fresh npm check |
| Network unavailable | Silently skips |

## Update Notifications

### Terminal Banner

When an update is available, you'll see a banner like:

```
╭────────────────────────────────────────────────────╮
│                                                    │
│  📦 CCASP Update Available!                        │
│                                                    │
│  Current: 1.0.3  →  Latest: 1.0.5                  │
│                                                    │
│  New features in 1.0.5:                            │
│  • Version tracking and update notifications       │
│  • /project-impl command for agent-powered impl    │
│                                                    │
│  To update:                                        │
│  npm update -g claude-cli-advanced-starter-pack    │
│                                                    │
╰────────────────────────────────────────────────────╯
```

### Inside Claude Code CLI

Use the `/update-check` command to see available updates and new features in markdown format.

## Dismissing Notifications

Notifications can be dismissed and won't appear again for 24 hours. The system tracks:

- **Last seen version** - When you first saw an update notification
- **Dismissed versions** - Versions you've chosen to skip
- **Installed features** - Features you've installed from past versions
- **Skipped features** - Features you've declined to install

## Updating CCASP

### Global Installation

```bash
npm update -g claude-cli-advanced-starter-pack
```

### Per-Project Installation

```bash
npm update --save-dev claude-cli-advanced-starter-pack
```

### After Updating

1. **Check new features**:
   ```bash
   ccasp wizard
   # Select "5. Prior Releases" to see what's new
   ```

2. **Deploy new features to project**:
   ```bash
   ccasp wizard
   # Select "1. Quick Start" or "2. Full Setup"
   ```

3. **Restart Claude Code CLI** to use new commands

## Release Notes

Each release includes:

| Field | Description |
|-------|-------------|
| **version** | Semantic version (e.g., 1.0.5) |
| **date** | Release date |
| **summary** | One-line description |
| **highlights** | Key changes and features |
| **newFeatures** | List of new commands/features with version requirement |
| **breaking** | Breaking changes (if any) |

### Viewing Past Releases

In the wizard, select **"5. Prior Releases"** to:

- See all releases since your installation
- View new features introduced in each version
- Install features you may have missed
- Skip features you don't need

## State Tracking

CCASP stores version state in `.claude/config/ccasp-state.json`:

```json
{
  "lastCheckTimestamp": 1706619234567,
  "lastCheckResult": {
    "latestVersion": "1.0.5"
  },
  "lastSeenVersion": "1.0.5",
  "dismissedVersions": ["1.0.4"],
  "installedFeatures": ["githubIntegration", "phasedDevelopment"],
  "skippedFeatures": ["tunnelServices"]
}
```

This file is project-specific, so different projects can have different feature sets.

## Troubleshooting

### Update check fails

**Problem**: Version check times out or errors.

**Solutions**:
1. Check internet connection
2. npm registry may be temporarily unavailable
3. Try again later - the system will retry after cache expires

### Not seeing new features

**Problem**: Updated CCASP but commands not available.

**Solutions**:
1. Re-run `ccasp wizard` and select Quick Start or Full Setup
2. Restart Claude Code CLI after setup
3. Check `.claude/commands/` for new files

### Reverting to previous version

```bash
npm install -g claude-cli-advanced-starter-pack@1.0.3
```

Then re-run `ccasp wizard` to regenerate configuration.
