---
description: Merge worktree branch to main with customization import and auto-exit
model: sonnet
---

# Dev Mode Merge

Interactive merge of a development worktree branch back to the main branch with project customization detection and automatic dev mode exit.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Pre-Merge - Detect Project Customizations           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Import Customizations (Projects → Worktree)         │
│   - Copy selected custom files to worktree                  │
│   - Stage as new commit: "feat: import from <project>"      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Merge Worktree → Main                               │
│   - Standard git merge (--no-ff, squash, or rebase)         │
│   - Push to origin/master                                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Exit Dev Mode (AUTO)                                │
│   - npm unlink -g                                           │
│   - deactivateDevMode()                                     │
│   - npm install -g claude-cli-advanced-starter-pack@latest  │
│   - /npm-deploy now re-enabled                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Update Projects to New npm Version                  │
│   - Offer to restore from backup OR                         │
│   - Run ccasp init to get new merged version                │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Must be in a CCASP worktree (not main repo)
- Working directory should be clean
- Branch should be ahead of main

## Instructions for Claude

### Step 0: Gather State

Run these checks in parallel:

```bash
# Verify we're in a worktree
git rev-parse --git-dir 2>/dev/null | grep -q worktrees && echo "IN_WORKTREE" || echo "NOT_IN_WORKTREE"

# Get current branch
git rev-parse --abbrev-ref HEAD

# Get main branch name (usually master or main)
git remote show origin 2>/dev/null | grep "HEAD branch" | cut -d: -f2 | tr -d ' '

# Check for uncommitted changes
git status --porcelain

# Get commits ahead/behind main
git rev-list --count master..HEAD 2>/dev/null || git rev-list --count main..HEAD 2>/dev/null
git rev-list --count HEAD..master 2>/dev/null || git rev-list --count HEAD..main 2>/dev/null

# Get commit summary for the branch
git log master..HEAD --oneline 2>/dev/null || git log main..HEAD --oneline 2>/dev/null

# Read dev state for context
cat ~/.claude/ccasp-dev-state.json 2>/dev/null
```

### Step 1: Display Merge Menu

```
┌────────────────────────────────────┐
│ Dev Mode Merge                     │
│ Projects → Worktree → Main         │
└────────────────────────────────────┘

Current State:
  Worktree: {{branch}}
  Branch: {{branch}}
  Main: {{mainBranch}}
  Commits ahead: {{aheadCount}}
  Commits behind: {{behindCount}}

Connected Projects: {{projectCount}}
{{#each projects}}
  - {{name}}
{{/each}}

──────────────────────────────────────
Recent Commits:
──────────────────────────────────────

{{commit log --oneline}}

──────────────────────────────────────
Pre-Merge Checklist:
──────────────────────────────────────

[{{✓ or ✗}}] Working directory clean
[{{✓ or ✗}}] Not behind main
[{{✓ or ✗}}] Has commits to merge

──────────────────────────────────────
Merge Steps:
──────────────────────────────────────

[1] Scan for customizations
    Check projects for custom commands/hooks/agents

[2] Import customizations → worktree
    (Run step 1 first)

[3] Sync ALL changes to projects
    Deploy source + templates to registered projects
    (Uses: ccasp dev-sync)

[4] Preview all changes
    Show diff: worktree vs main

[5] Merge to main
    (After reviewing changes)

[6] Run tests first
    npm test

──────────────────────────────────────
Post-Merge (auto after step 4):
──────────────────────────────────────

• Exit dev mode (npm unlink)
• Reinstall npm version
• Re-enable /npm-deploy
• Offer project updates

[P] Push current branch first
[C] Cancel
```

### Step 2: Handle User Selection

#### Option 1: Scan for Customizations

Run the project diff scan:

```bash
# Get dev state to find connected projects
cat ~/.claude/ccasp-dev-state.json
```

Parse the projects array. For each project that has a `.claude/` directory:

1. Compare `.claude/commands/*.md` files against `templates/commands/`
2. Compare `.claude/hooks/*.cjs` files against `templates/hooks/`
3. Compare `.claude/agents/*.md` files against `templates/agents/`
4. Compare `.claude/skills/**/*.md` files against `templates/skills/`
5. Check CLAUDE.md for project-specific content

Display results:

```
┌────────────────────────────────────┐
│ Project Customizations Detected    │
└────────────────────────────────────┘

Project: {{projectName}}

──────────────────────────────────────
Custom Files (not in CCASP):
──────────────────────────────────────

[1] .claude/commands/deploy-full.md
    → Project-specific deployment command

[2] .claude/hooks/auth-guard.cjs
    → Custom authentication hook

──────────────────────────────────────
Modified Files (differ from CCASP):
──────────────────────────────────────

[3] .claude/commands/menu.md
    +15 lines, -3 lines
    → Added project-specific menu options

[4] CLAUDE.md
    +127 lines
    → Project documentation

──────────────────────────────────────
Actions:
──────────────────────────────────────

[I] Import selected to worktree
[V] View diff for specific file
[S] Skip (continue without importing)
[B] Back to merge menu
```

#### Option 2: Import Customizations

After scanning (option 1), allow importing selected files:

```
Select files to import (comma-separated numbers, or A for all):
> _
```

For each selected file:

```bash
# Copy file to worktree (preserving relative path)
cp "{{projectPath}}/{{relativePath}}" "{{worktreePath}}/templates/{{category}}/{{filename}}"

# If it's a new template, add it
git add "templates/{{category}}/{{filename}}"
```

After copying all selected files:

```bash
# Create import commit
git add -A
git commit -m "feat: import customizations from {{projectName}}

Imported files:
{{#each importedFiles}}
- {{relativePath}}
{{/each}}
"
```

Display confirmation:

```
┌────────────────────────────────────┐
│ Import Complete                    │
└────────────────────────────────────┘

Imported {{count}} file(s) from {{projectName}}
Commit: {{commitHash}}

These customizations are now part of the worktree
and will be included in the merge to main.

[B] Back to merge menu
```

#### Option 3: Sync ALL Changes to Projects

This deploys ALL modified/new files from the worktree to registered projects using the fast `ccasp dev-sync` command:

```bash
# Preview what will sync
ccasp dev-sync --dry-run

# Execute sync
ccasp dev-sync
```

This syncs:
- **Source files**: `src/**/*.js`, `bin/*.js`, `config/**/*`
- **Command templates**: `templates/commands/*.template.md` → `.claude/commands/*.md`
- **Hook templates**: `templates/hooks/*.template.js`
- **All other modified files**: Preserving relative paths

Display results:
```
┌────────────────────────────────────┐
│ Sync to Projects                   │
└────────────────────────────────────┘

🔄 Dev Mode Sync

Scanning for changes...
  Found 15 modified, 4 new files

Projects to sync (3):
  • Plan Design Calculator
  • ccasp-dev
  • claude-cli-advanced-starter-pack

══════════════════════════════════════════════════
  SYNC COMPLETE
══════════════════════════════════════════════════
  Projects: 3
  Files synced: 57

[B] Back to merge menu
```

#### Option 4: Preview Changes

Show diff between worktree and main:

```bash
# Show file changes summary
git diff master..HEAD --stat 2>/dev/null || git diff main..HEAD --stat 2>/dev/null

# Show actual diff (limit to 100 lines for overview)
git diff master..HEAD 2>/dev/null | head -100 || git diff main..HEAD 2>/dev/null | head -100
```

Display:

```
┌────────────────────────────────────┐
│ Changes Preview                    │
└────────────────────────────────────┘

Files changed: {{count}}
Insertions: +{{insertions}}
Deletions: -{{deletions}}

──────────────────────────────────────
File Summary:
──────────────────────────────────────

{{diff --stat output}}

──────────────────────────────────────

[F] Show full diff
[B] Back to merge menu
```

#### Option 5: Merge to Main

This is the main merge flow with automatic dev mode exit:

**Sub-step 4a: Choose merge strategy**

```
Select merge strategy:

[1] Merge to main (--no-ff)
    Creates merge commit, preserves history

[2] Squash merge
    Combines all commits into one

[3] Rebase onto main
    Linear history, no merge commit

[C] Cancel
```

**Sub-step 4b: Execute merge (example for --no-ff)**

```bash
# Fetch latest
git fetch origin

# Check if behind main
BEHIND=$(git rev-list --count HEAD..origin/master 2>/dev/null || git rev-list --count HEAD..origin/main 2>/dev/null)
if [ "$BEHIND" -gt 0 ]; then
    echo "Warning: Main has $BEHIND new commits. Consider rebasing first."
fi

# Switch to main
git checkout master || git checkout main

# Pull latest main
git pull origin master 2>/dev/null || git pull origin main 2>/dev/null

# Merge with no-ff
git merge {{branch}} --no-ff -m "Merge {{branch}}: {{summary}}"

# Push to origin
git push origin master 2>/dev/null || git push origin main 2>/dev/null

# Show result
git log -1 --oneline
```

**Sub-step 4c: Auto-exit dev mode**

After successful merge and push, AUTOMATICALLY execute:

```bash
# 1. Unlink global package
npm unlink -g claude-cli-advanced-starter-pack

# 2. Clear dev state file
echo '{"isDevMode": false, "worktreePath": null, "linkedAt": null, "version": null, "deactivatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ~/.claude/ccasp-dev-state.json

# 3. Reinstall from npm
npm install -g claude-cli-advanced-starter-pack@latest

# 4. Verify installation
ccasp --version
```

Display completion:

```
┌────────────────────────────────────┐
│ Merge Complete + Dev Mode Exited   │
└────────────────────────────────────┘

✓ Merged: {{branch}} → {{main}}
✓ Pushed to origin
✓ Dev mode deactivated
✓ npm version restored: {{newVersion}}
✓ /npm-deploy is now enabled

Commit: {{commitHash}}

──────────────────────────────────────
Project Update Options:
──────────────────────────────────────

Your connected projects still have the dev version.
Update them to the new npm version:

[1] Update all projects (ccasp init --force)
    Deploys merged changes to all projects

[2] Restore from backup
    Revert to pre-dev-mode state

[3] Manual later
    Projects keep dev version until you update

[D] Done
```

#### Option 6: Run Tests First

```bash
npm test
```

Display test results, then return to merge menu with updated checklist.

#### Option P: Push Current Branch

```bash
git push -u origin {{branch}}
```

### Post-Merge Project Updates

#### Option 1: Update All Projects

```bash
# For each connected project
cd "{{projectPath}}"
ccasp init --force --skip-prompts
```

#### Option 2: Restore from Backup

Show list of backed-up projects from `~/.claude/ccasp-dev-state.json`:

```
┌────────────────────────────────────┐
│ Restore Backed-Up Projects         │
└────────────────────────────────────┘

Projects to restore:

[1] Plan Design Calculator
    Backup: 2026-02-02 @ 5:31 PM (121 files)

[2] Benefits-Outreach-360
    Backup: 2026-02-02 @ 5:32 PM (85 files)

──────────────────────────────────────

[A] Restore all
[S] Select specific
[C] Cancel
```

Restore logic:

```bash
# For each project:
rm -rf "{{project.path}}/.claude"
cp -r "{{project.backupPath}}/.claude" "{{project.path}}/.claude"
echo "Restored: {{project.name}}"

# Clear pending projects from dev state after all restored
```

### Error Handling

#### Not in Worktree

```
┌────────────────────────────────────┐
│ Not in Worktree                    │
└────────────────────────────────────┘

This command must be run from a CCASP
development worktree, not the main repo.

Current location: {{cwd}}

To create a worktree:
  /dev-mode → [1] Create New Worktree
```

#### Uncommitted Changes

```
┌────────────────────────────────────┐
│ Uncommitted Changes                │
└────────────────────────────────────┘

You have uncommitted changes that must
be handled before merging:

{{git status --short}}

Options:
[1] Commit changes now
[2] Stash changes
[3] Discard changes (DANGER)
[C] Cancel
```

#### Behind Main

```
┌────────────────────────────────────┐
│ Branch Behind Main                 │
└────────────────────────────────────┘

Your branch is {{count}} commits behind main.
Merge or rebase is recommended first.

Options:
[1] Rebase onto main first
[2] Merge main into branch first
[3] Force merge anyway (not recommended)
[C] Cancel
```

### Cleanup Worktree (Optional)

After merge, optionally clean up the worktree:

```bash
# Delete branch (local)
git branch -d {{branch}}

# Delete branch (remote, if exists)
git push origin --delete {{branch}} 2>/dev/null || echo "No remote branch"

# Remove worktree (run from main repo)
cd "{{mainRepoPath}}"
git worktree remove {{worktreePath}}
```

Prompt before cleanup:

```
⚠️  This will:
• Delete local branch: {{branch}}
• Delete remote branch: origin/{{branch}}
• Remove worktree folder: {{worktreePath}}

Are you sure? [y/N]
```
