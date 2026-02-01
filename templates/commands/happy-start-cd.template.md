---
description: Scan for git repos and launch Happy session in selected directory
model: sonnet
---

# /happy-start-cd - Launch Happy Session with Directory Selection

Scans your drive for git repositories and presents a menu to select which one to launch a Happy CLI session in.

## What This Does

1. Scans configured directories for git repositories (folders containing `.git`)
2. Presents a numbered menu of discovered repos
3. User selects a repo by number
4. Opens a **new PowerShell window** in the selected directory
5. Runs `npx happy-coder` in that directory

## Prerequisites

- `happy-coder` npm package installed globally: `npm install -g happy-coder`
- Claude Code CLI authenticated: `claude auth`
- Happy mobile app paired (run `happy auth` once to pair)

## Instructions for Claude

**When this command is invoked, follow these steps:**

### Step 1: Ask for Scan Location

Use AskUserQuestion to determine where to scan:

```
header: "Scan Location"
question: "Where should I scan for git repositories?"
options:
  - label: "Common dev folders"
    description: "Scan ~/Projects, ~/repos, ~/code, ~/dev, ~/GitHub (fast)"
  - label: "Current drive root"
    description: "Scan from drive root - slower but comprehensive"
  - label: "Custom path"
    description: "I'll specify a directory to scan"
```

### Step 2: Scan for Repositories

Based on user selection, run the appropriate PowerShell command:

**For Common dev folders (Windows):**
```powershell
$searchPaths = @(
    "$env:USERPROFILE\Projects",
    "$env:USERPROFILE\repos",
    "$env:USERPROFILE\code",
    "$env:USERPROFILE\dev",
    "$env:USERPROFILE\GitHub",
    "$env:USERPROFILE\Documents\GitHub",
    "F:\",
    "D:\"
)
$repos = @()
foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Get-ChildItem -Path $path -Directory -Depth 3 -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
        ForEach-Object { $repos += $_.FullName }
    }
}
$repos | Sort-Object | Get-Unique
```

**For Current drive root:**
```powershell
Get-ChildItem -Path (Get-Location).Drive.Root -Directory -Depth 4 -ErrorAction SilentlyContinue |
Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
Select-Object -ExpandProperty FullName |
Sort-Object
```

**For Custom path:**
Ask user for the path, then scan with depth 4.

### Step 3: Present Menu

Display the discovered repos as a numbered menu:

```
╔═══════════════════════════════════════════════════════════════╗
║  📂 Git Repositories Found                                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  1) benefits-outreach-360                                     ║
║     F:\1 - Benefits-Outreach-360 (Web)                        ║
║                                                               ║
║  2) claude-cli-advanced-starter-pack                          ║
║     F:\...\tools\claude-cli-advanced-starter-pack             ║
║                                                               ║
║  3) my-other-project                                          ║
║     C:\Users\user\Projects\my-other-project                   ║
║                                                               ║
║  [Enter number to select, or 'q' to quit]                     ║
╚═══════════════════════════════════════════════════════════════╝
```

Use AskUserQuestion with the repos as options (max 10 shown, with "Show more..." option if needed).

### Step 4: Launch Happy Session

Once user selects a repo, execute:

```bash
wt.exe -d "[SELECTED_PATH]" powershell -NoExit -Command "Remove-Item Env:HAPPY_SERVER_URL -ErrorAction SilentlyContinue; Write-Host 'Starting Happy CLI in [REPO_NAME]...'; & 'C:\Users\erola\AppData\Roaming\npm\happy.cmd'"
```

### Step 5: Confirm Launch

After executing, respond with:

```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Happy Session Started                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Repository: [REPO_NAME]                                      ║
║  Path: [FULL_PATH]                                            ║
║                                                               ║
║  A new PowerShell window has opened with Claude Code          ║
║  wrapped by Happy in the selected directory.                  ║
║                                                               ║
║  Your Happy mobile app should now see this session.           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Error Handling

| Situation | Action |
|-----------|--------|
| No repos found | Suggest checking paths or using custom path option |
| Scan takes too long | Offer to limit depth or specific folder |
| wt.exe not found | Fall back to `start powershell` command |
| Permission errors | Skip inaccessible folders, continue scan |

## Mobile-Friendly Menu Format

When presenting repos on mobile (Happy app), use compact single-char selection:

```
Git Repos Found:
─────────────────
1) benefits-outreach-360
2) claude-cli-starter
3) my-project
─────────────────
Enter number (1-N):
```

## Related Commands

- `/happy-start` - Start Happy session in current directory
- `/menu` - Main project menu

---

*Requires: happy-coder npm package, Windows Terminal (wt.exe)*
