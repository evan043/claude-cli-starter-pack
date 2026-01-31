---
description: CCASP Setup Wizard - one-shot linear project configuration
model: sonnet
---

# CCASP Setup Wizard

Linear setup wizard that configures your entire project in one pass. No menus to revisit.

## Instructions for Claude

This is a **linear wizard** - walk through each step sequentially, collecting all inputs before writing config at the end.

### Step 0: Initialize State

Create an internal state object to track selections:

```javascript
const wizardState = {
  preset: null,           // A, B, C, or D
  github: {
    enabled: false,
    owner: null,
    repo: null,
    projectNumber: null
  },
  deployment: {
    frontend: { platform: 'none', projectName: null },
    backend: { platform: 'none', projectId: null, serviceId: null }
  },
  tunnel: { service: 'none', subdomain: null },
  features: []            // List of features to install
}
```

### Step 1: Project Detection

**Auto-scan the project** using Bash/Glob:

```bash
ls -la .claude 2>/dev/null
ls -la CLAUDE.md 2>/dev/null
ls -la package.json 2>/dev/null
```

**Display status:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   CCASP Setup Wizard                                                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Project Status:                                                             ║
║   ├─ .claude/ folder:     ✅ Exists  OR  ❌ Not found                         ║
║   ├─ CLAUDE.md:           ✅ Exists  OR  ❌ Not found                         ║
║   ├─ package.json:        ✅ Found   OR  ❌ Not found                         ║
║   └─ Tech stack config:   ✅ Configured  OR  ❌ Not configured                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

If `.claude/config/tech-stack.json` exists, read it and show current settings.

### Step 2: Feature Preset

Ask using AskUserQuestion:

```
Which feature preset would you like?

[A] Minimal    - Menu + help only (for simple projects)
[B] Standard   - GitHub + phased dev + testing (recommended)
[C] Full       - All features including agents, hooks, skills
[D] Custom     - Pick individual features
```

**If D (Custom)**, show feature checklist:

```
Select features to install (comma-separated, e.g., "1,3,5"):

[1] /menu              - Interactive project menu
[2] /github-task       - Create GitHub issues with codebase analysis
[3] /phase-dev-plan    - Phased development planning
[4] /e2e-test          - Playwright E2E testing
[5] /create-agent      - Create L1/L2/L3 agents
[6] /create-hook       - Create enforcement hooks
[7] /create-skill      - Create RAG skills
[8] /explore-mcp       - MCP server discovery
[9] /claude-audit      - CLAUDE.md validation
[A] /codebase-explorer - Codebase analysis
[B] /create-task-list  - Intelligent task lists
```

Store selection in `wizardState.preset` and `wizardState.features`.

### Step 3: GitHub Project Board

Ask:

```
Do you use GitHub Projects for task tracking? (Y/N)
```

**If Y**, ask three quick questions:

```
GitHub repository owner (username or org):
> _

Repository name:
> _

Project number (from URL github.com/users/OWNER/projects/NUMBER):
> _
```

Store in `wizardState.github`.

**If N**, skip and continue.

### Step 4: Deployment Platforms

Ask frontend platform:

```
Frontend deployment platform?

[1] Cloudflare Pages
[2] Vercel
[3] Netlify
[4] GitHub Pages
[0] None / Skip
```

**If 1-4**, ask for project name/ID:

```
Cloudflare project name (e.g., "my-app"):
> _
```

Ask backend platform:

```
Backend deployment platform?

[1] Railway
[2] Render
[3] Heroku
[4] AWS
[0] None / Skip
```

**If Railway (1)**, ask:

```
Railway project ID (from dashboard URL):
> _

Railway service ID:
> _
```

Store in `wizardState.deployment`.

### Step 5: Dev Environment (Tunnel)

Ask:

```
Tunnel service for mobile/remote testing?

[1] ngrok
[2] localtunnel
[3] cloudflare-tunnel
[0] None / Skip
```

**If 1-3**, optionally ask:

```
Preferred subdomain (press Enter to skip):
> _
```

Store in `wizardState.tunnel`.

### Step 6: CLAUDE.md Setup

Ask:

```
Would you like to set up CLAUDE.md? (Y/N)
```

**If Y**, perform these actions automatically:

1. **Detect tech stack** by scanning:
   - `package.json` for frameworks (react, vue, next, etc.)
   - Config files (vite.config.*, tsconfig.json, etc.)
   - Backend indicators (requirements.txt, go.mod, etc.)
   - Deployment configs (railway.json, vercel.json, wrangler.toml)

2. **Check existing CLAUDE.md** (if present):
   - Count lines (warn if >60, error if >300)
   - Check for anti-patterns (vague instructions, long code blocks)
   - Check for good patterns (IMPORTANT/MUST/NEVER keywords, runnable commands)
   - Calculate score (0-100)

3. **Display audit results** if CLAUDE.md exists:
   ```
   📊 CLAUDE.md Audit: Score 72/100
   ├─ ✓ Has runnable commands
   ├─ ✓ Uses emphasis keywords
   ├─ ⚠ Line count: 85 (recommended <60)
   └─ ⚠ Found 2 vague instructions
   ```

4. **Ask enhancement preference**:
   ```
   CLAUDE.md action?
   [1] Generate new (from detected stack)
   [2] Enhance existing (add missing sections)
   [3] Skip - keep as is
   ```

5. **If 1 or 2**, generate/enhance content:
   - Project overview from package.json
   - Tech stack summary from detection
   - Key commands (dev, build, test, deploy)
   - Important paths
   - Architecture notes based on detected patterns

6. **Store in wizardState**:
   ```javascript
   wizardState.claudeMd = {
     action: 'generate' | 'enhance' | 'skip',
     detectedStack: { ... },
     auditScore: 72
   }
   ```

**If N**, skip and continue.

### Step 7: Summary & Confirmation

Display all collected settings:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   Setup Summary                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Feature Preset:        Standard (B)                                         ║
║                                                                               ║
║   GitHub Project Board:  ✅ Enabled                                           ║
║   ├─ Repository:         owner/repo-name                                      ║
║   └─ Project Number:     6                                                    ║
║                                                                               ║
║   Deployment:                                                                 ║
║   ├─ Frontend:           Cloudflare Pages (my-app)                            ║
║   └─ Backend:            Railway (project-id)                                 ║
║                                                                               ║
║   Tunnel:                ngrok                                                ║
║                                                                               ║
║   CLAUDE.md:             Generate new (detected: React + Vite + Tailwind)     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Proceed with setup? (Y to confirm, N to restart)
```

### Step 8: Write Configuration

**If confirmed (Y)**:

1. **Create .claude/ structure** if it doesn't exist:
   ```bash
   mkdir -p .claude/commands .claude/agents .claude/hooks .claude/skills .claude/config .claude/docs .claude/backups
   ```

2. **Write tech-stack.json** using Edit/Write tool:

   Read existing `.claude/config/tech-stack.json` if present, then merge with wizard selections:

   ```json
   {
     "version": "2.0.0",
     "project": {
       "name": "<from package.json or folder name>",
       "description": "",
       "rootPath": "."
     },
     "versionControl": {
       "provider": "github",
       "repository": "<owner>/<repo>",
       "projectBoard": {
         "type": "github-projects-v2",
         "owner": "<owner>",
         "repo": "<repo>",
         "number": <projectNumber>,
         "url": "https://github.com/users/<owner>/projects/<number>"
       }
     },
     "deployment": {
       "frontend": {
         "platform": "<cloudflare|vercel|netlify|github-pages|none>",
         "projectName": "<project-name>"
       },
       "backend": {
         "platform": "<railway|render|heroku|aws|none>",
         "projectId": "<project-id>",
         "serviceId": "<service-id>"
       }
     },
     "devEnvironment": {
       "tunnel": {
         "service": "<ngrok|localtunnel|cloudflare-tunnel|none>",
         "subdomain": "<subdomain or null>"
       }
     },
     "tokenManagement": {
       "enabled": true,
       "dailyBudget": 200000,
       "thresholds": { "compact": 0.75, "archive": 0.85, "respawn": 0.9 }
     },
     "happyMode": {
       "enabled": true,
       "checkpointInterval": 10,
       "verbosity": "condensed"
     }
   }
   ```

3. **Deploy feature commands** based on preset:

   - **A (Minimal)**: menu.md, INDEX.md
   - **B (Standard)**: Above + github-task.md, phase-dev-plan.md, e2e-test.md, create-task-list.md
   - **C (Full)**: Above + create-agent.md, create-hook.md, create-skill.md, explore-mcp.md, claude-audit.md, codebase-explorer.md, project-impl.md
   - **D (Custom)**: Only selected features

   Use Bash to copy from CCASP templates or use the ccasp CLI:
   ```bash
   npx ccasp init --preset <A|B|C|D> --features <list>
   ```

4. **Write/update CLAUDE.md** (if selected in Step 6):

   **If "Generate new"**:
   - Backup existing to `.claude/backups/CLAUDE.md.{timestamp}.bak`
   - Generate new CLAUDE.md with detected stack info:
   ```markdown
   # Project Name

   Brief description from package.json.

   ## Tech Stack
   - Frontend: [detected framework]
   - Build: [detected bundler]
   - Styling: [detected CSS solution]
   - Testing: [detected test framework]

   ## Commands
   ```bash
   npm run dev      # Start development server
   npm run build    # Build for production
   npm test         # Run tests
   ```

   ## Key Paths
   | Path | Description |
   |------|-------------|
   | src/ | Source code |
   | ...  | ... |

   ## Architecture Notes
   [Based on detected patterns]

   ## Gotchas
   - [Common issues for this stack]
   ```

   **If "Enhance existing"**:
   - Backup existing to `.claude/backups/CLAUDE.md.{timestamp}.bak`
   - Add missing sections only (don't overwrite existing content)
   - Append detected tech stack info if not present

5. **Update ccasp-state.json**:
   ```json
   {
     "projectImplCompleted": true,
     "setupCompletedAt": "<ISO timestamp>",
     "preset": "<A|B|C|D>",
     "claudeMdGenerated": true | false
   }
   ```

### Step 9: Completion Message

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   ✅ Setup Complete!                                                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Created/Updated:                                                            ║
║   ├─ .claude/config/tech-stack.json                                           ║
║   ├─ .claude/commands/ (X commands installed)                                 ║
║   ├─ .claude/config/ccasp-state.json                                          ║
║   └─ CLAUDE.md (if selected)                                                  ║
║                                                                               ║
║   ⚠️  RESTART REQUIRED                                                        ║
║                                                                               ║
║   Changes to .claude/ require a new Claude Code session.                      ║
║                                                                               ║
║   To apply changes:                                                           ║
║   1. Exit this session (Ctrl+C or type "exit")                                ║
║   2. Restart: claude or claude .                                              ║
║   3. Type /menu to see your new commands                                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## Quick Reference

| Step | Question | Input Type |
|------|----------|------------|
| 2 | Feature preset | A/B/C/D |
| 2b | Custom features (if D) | 1,2,3... |
| 3 | Use GitHub Projects? | Y/N |
| 3b | Owner, repo, number | Text (3x) |
| 4 | Frontend platform | 0-4 |
| 4b | Project name | Text |
| 4c | Backend platform | 0-4 |
| 4d | Project/service IDs | Text (2x) |
| 5 | Tunnel service | 0-3 |
| 5b | Subdomain | Text (optional) |
| 6 | Set up CLAUDE.md? | Y/N |
| 6b | CLAUDE.md action | 1/2/3 |
| 7 | Confirm? | Y/N |

## Terminal Alternative

```bash
npx ccasp wizard          # Same linear flow in terminal
npx ccasp init --preset B # Quick init with Standard preset
```

## Related Commands

- `/menu` - Main project menu (after restart)
- `/project-impl` - Additional configuration options
- `/update-check` - Check for CCASP updates

---

*Claude CLI Advanced Starter Pack - Linear Setup Wizard*
