---
description: Merge PR with interactive handling of blocks, conflicts, and out-of-date branches
model: sonnet
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# /pr-merge - Interactive PR Merge

Merge a pull request with intelligent handling of all blocking conditions including out-of-date branches, failing checks, merge conflicts, and pending reviews.

{{#if versionControl.owner}}

## Usage

```
/pr-merge                    # Merge PR for current branch
/pr-merge <pr-number>        # Merge specific PR
/pr-merge --dry-run          # Preview merge without executing
```

## Workflow Steps

### Step 1: Identify PR

Parse arguments to determine which PR to merge:

```bash
# If PR number provided, use it directly
# Otherwise, find PR for current branch:
CURRENT_BRANCH=$(git branch --show-current)
gh pr list --repo {{versionControl.owner}}/{{versionControl.repo}} --head "$CURRENT_BRANCH" --json number,title,state,mergeable,mergeStateStatus,headRefName,baseRefName,isDraft,reviewDecision,statusCheckRollup --jq '.[0]'
```

If no PR found, offer to create one with `/github-task-start --complete`.

---

### Step 2: Fetch PR Status

Get comprehensive PR information:

```bash
gh pr view <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --json number,title,state,mergeable,mergeStateStatus,headRefName,baseRefName,isDraft,reviewDecision,statusCheckRollup,commits,additions,deletions,changedFiles
```

**Display summary to user:**
- PR title and number
- Head branch → Base branch
- Lines changed (+additions/-deletions)
- Current merge state

---

### Step 3: Evaluate Merge Blockers

Check for these blocking conditions in order of severity:

| Blocker | Detection | Resolution |
|---------|-----------|------------|
| **Draft PR** | `isDraft: true` | Offer to mark ready for review |
| **Merge Conflicts** | `mergeable: CONFLICTING` | Interactive conflict resolution |
| **Out of Date** | `mergeStateStatus: BEHIND` | Update branch options |
| **Failing Checks** | `statusCheckRollup` has failures | Wait or bypass options |
| **Pending Reviews** | `reviewDecision: REVIEW_REQUIRED` | Request review or admin merge |
| **Changes Requested** | `reviewDecision: CHANGES_REQUESTED` | Address feedback first |

---

### Step 4: Handle Each Blocker Interactively

#### 4a. Draft PR

If PR is a draft:

```bash
# Ask user
# Option A: Mark as ready for review
gh pr ready <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}}

# Option B: Cancel merge operation
```

#### 4b. Merge Conflicts

If conflicts detected:

```bash
# Show conflict summary
gh pr view <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --json files --jq '.files[] | select(.conflictStatus == "CONFLICTING") | .path'
```

**Ask user for resolution strategy:**

| Option | Action |
|--------|--------|
| **A** | Update branch and resolve locally (recommended) |
| **B** | Resolve in GitHub web interface |
| **C** | Cancel merge - conflicts need manual attention |

For option A:
```bash
# Checkout PR branch
git fetch origin
git checkout <head-branch>

# Update with base branch
git fetch origin {{versionControl.defaultBranch}}
git merge origin/{{versionControl.defaultBranch}}

# If conflicts:
# - List conflicting files
# - Offer to open in editor
# - After resolution: git add . && git commit
git push origin <head-branch>
```

#### 4c. Out-of-Date Branch

If branch is behind base:

**Ask user for update strategy:**

| Option | Description |
|--------|-------------|
| **A** | Merge base into branch (preserves history) - Recommended |
| **B** | Rebase on base (cleaner history, may rewrite commits) |
| **C** | Proceed anyway (if branch protection allows) |

For option A (merge):
```bash
git fetch origin
git checkout <head-branch>
git merge origin/{{versionControl.defaultBranch}}
git push origin <head-branch>
```

For option B (rebase):
```bash
git fetch origin
git checkout <head-branch>
git rebase origin/{{versionControl.defaultBranch}}
git push origin <head-branch> --force-with-lease
```

**Wait for checks to re-run after update:**
```bash
# Poll for check status
gh pr checks <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --watch
```

#### 4d. Failing Checks

If CI/checks are failing:

```bash
# Show check details
gh pr checks <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}}
```

**Ask user:**

| Option | Action |
|--------|--------|
| **A** | Wait for checks to complete |
| **B** | View failing check logs |
| **C** | Cancel - fix issues first |
| **D** | Force merge (admin only, if allowed) |

For option A:
```bash
gh pr checks <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --watch
```

For option B:
```bash
# Get check run details
gh api repos/{{versionControl.owner}}/{{versionControl.repo}}/commits/<head-sha>/check-runs --jq '.check_runs[] | select(.conclusion == "failure") | {name, html_url, output: .output.summary}'
```

#### 4e. Pending Reviews

If review is required but not approved:

```bash
# Show review status
gh pr view <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --json reviews --jq '.reviews[] | {author: .author.login, state: .state}'
```

**Ask user:**

| Option | Action |
|--------|--------|
| **A** | Request review from team member |
| **B** | Wait for pending reviews |
| **C** | Admin merge (bypass review requirement) |

For option A:
```bash
# List potential reviewers
gh api repos/{{versionControl.owner}}/{{versionControl.repo}}/collaborators --jq '.[].login'

# Request review
gh pr edit <PR_NUMBER> --add-reviewer <username>
```

---

### Step 5: Select Merge Method

Once all blockers are resolved, ask for merge method:

| Option | Method | Best For |
|--------|--------|----------|
| **A** | Squash and merge (recommended) | Clean history, single commit |
| **B** | Create merge commit | Preserve all commits |
| **C** | Rebase and merge | Linear history, individual commits |

---

### Step 6: Execute Merge

```bash
# Squash merge
gh pr merge <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --squash --delete-branch

# Merge commit
gh pr merge <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --merge --delete-branch

# Rebase merge
gh pr merge <PR_NUMBER> --repo {{versionControl.owner}}/{{versionControl.repo}} --rebase --delete-branch
```

**Options to include:**
- `--delete-branch`: Remove head branch after merge
- `--auto`: Enable auto-merge when requirements are met
- `--admin`: Merge without required reviews (admin only)

---

### Step 7: Post-Merge Cleanup

After successful merge:

```bash
# Switch to base branch
git checkout {{versionControl.defaultBranch}}

# Pull latest changes
git pull origin {{versionControl.defaultBranch}}

# Delete local branch
git branch -d <head-branch>

# Prune remote-tracking branches
git fetch --prune
```

---

### Step 8: Summary & Next Steps

Display merge summary:

```
✅ PR #<number> merged successfully

📋 Summary:
   - Title: <PR title>
   - Method: <squash|merge|rebase>
   - Commits: <count> → 1 (if squashed)
   - Branch deleted: <head-branch>

🔗 Links:
   - Merged PR: https://github.com/{{versionControl.owner}}/{{versionControl.repo}}/pull/<number>
   - Commit: https://github.com/{{versionControl.owner}}/{{versionControl.repo}}/commit/<sha>

📌 Next steps:
   - View deployment: /deploy-full
   - Start next task: /github-task-start
   - Update project board: /github-update
```

---

## Dry Run Mode

When `--dry-run` is specified:

1. Perform all status checks
2. Identify all blockers
3. Show what actions would be taken
4. **DO NOT** execute any merge or update operations

---

## Agent-Only Mode Compatibility

This command is **fully compatible** with Agent-Only Mode:

- `git` and `gh` commands are in the exempt patterns list
- All PR operations bypass agent delegation requirements
- No file edits (Edit/Write tools) are performed by this command

**Note**: If you have an existing `delegation.json`, ensure `^gh ` is in your `exemptPatterns`:

```json
{
  "agentOnlyMode": {
    "exemptPatterns": [
      "^git ",
      "^gh ",
      "^npm test",
      ...
    ]
  }
}
```

---

## Error Handling

| Error | Response |
|-------|----------|
| PR not found | Offer to list open PRs or create new one |
| No merge permission | Suggest requesting admin merge or adding as collaborator |
| Protected branch rules | Explain which rules are blocking, offer compliant alternatives |
| Network/API error | Retry with exponential backoff, offer manual merge instructions |

---

## Instructions for Claude

When `/pr-merge` is invoked:

1. **Parse arguments**: Extract PR number, flags (--dry-run)
2. **Identify PR**: Use argument or find from current branch
3. **Fetch full status**: Get all merge-relevant fields
4. **Evaluate blockers**: Check each condition systematically
5. **Handle interactively**: For each blocker, present options via AskUserQuestion
6. **Execute resolution**: Run chosen commands for each blocker
7. **Re-check status**: After each resolution, verify state changed
8. **Loop if needed**: Continue until no blockers remain
9. **Merge method**: Ask user preference for squash/merge/rebase
10. **Execute merge**: Run gh pr merge with chosen options
11. **Cleanup**: Offer local branch cleanup
12. **Summary**: Display results and next steps

**Critical behaviors:**
- Always show current status before asking for action
- Re-fetch PR status after any update operation
- Handle rate limiting gracefully
- Provide escape option at every decision point
- Never force-push or admin-merge without explicit confirmation

{{else}}

## Configuration Required

GitHub repository is not configured. Run:

```bash
ccasp init
```

Or configure manually in `tech-stack.json`:

```json
{
  "versionControl": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

{{/if}}

---

*Generated from tech-stack.json template*
