---
description: CCASP Setup Wizard - one-shot linear project configuration
model: sonnet
---

# CCASP Setup Wizard

Linear setup wizard that configures your entire project in one pass. No menus to revisit.

## Instructions for Claude

This is a **linear wizard** - walk through each step sequentially, collecting all inputs before writing config at the end.

### CRITICAL: Smart Detection + Recommendations

**Auto-detect everything possible, then present recommendations for user confirmation.**

| Step | Mode | Action |
|------|------|--------|
| Step 0 | ✅ AUTO | Initialize state silently |
| Step 1 | ✅ AUTO | Deep scan: .claude/, CLAUDE.md, package.json, configs, git remote |
| Step 2 | 🔍 RECOMMEND | Suggest preset based on project complexity |
| Step 3 | 🔍 RECOMMEND | Auto-detect GitHub from git remote, suggest project board |
| Step 4 | 🔍 RECOMMEND | Detect deployment configs, suggest platforms |
| Step 5 | 🔍 RECOMMEND | Check for tunnel configs, suggest if none found |
| Step 6 | 🔍 RECOMMEND | Auto-audit CLAUDE.md, recommend action |
| Step 7 | ✅ AUTO | Display summary with all recommendations |
| Step 8 | ❌ USER | Single confirmation: "Apply these settings? (Y/N)" |
| Step 9 | ✅ AUTO | Write all config |
| Step 10 | ✅ AUTO | Display completion message |

**Key principle**: Explore first, ask once. Batch all confirmations into Step 8.

### Step 0: Initialize State (AUTO - no user input)

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

### Step 1: Deep Project Scan (AUTO)

**Scan everything in parallel** - gather all data needed for recommendations:

```javascript
// Run these scans in parallel using Glob/Read/Bash
const scans = {
  // Basic structure
  hasClaudeFolder: exists('.claude/'),
  hasClaudeMd: exists('CLAUDE.md'),
  hasTechStackConfig: exists('.claude/config/tech-stack.json'),

  // Package info
  packageJson: read('package.json'),  // Get name, scripts, dependencies

  // Git/GitHub detection
  gitRemote: bash('git remote get-url origin 2>/dev/null'),  // e.g., git@github.com:user/repo.git

  // Deployment config detection
  hasRailway: exists('railway.json') || exists('railway.toml'),
  hasVercel: exists('vercel.json'),
  hasWrangler: exists('wrangler.toml'),
  hasDockerfile: exists('Dockerfile'),

  // Framework detection (from package.json dependencies)
  frameworks: detectFromPackageJson(),  // react, vue, next, express, etc.

  // Tunnel detection
  hasNgrokConfig: exists('ngrok.yml') || exists('.ngrok'),

  // Existing CLAUDE.md analysis
  claudeMdContent: read('CLAUDE.md'),
  claudeMdLineCount: countLines('CLAUDE.md')
}
```

**Parse git remote to extract GitHub info:**
```javascript
// git@github.com:user/repo.git → { owner: 'user', repo: 'repo' }
// https://github.com/user/repo.git → { owner: 'user', repo: 'repo' }
```

**Store all findings in wizardState.detected** - DO NOT display yet, continue to Step 2.

### Step 2: Recommend Feature Preset (AUTO)

**Analyze detected data to recommend a preset:**

```javascript
function recommendPreset(detected) {
  const hasGitHub = detected.gitRemote?.includes('github.com');
  const hasTests = detected.packageJson?.scripts?.test;
  const hasDeploy = detected.hasRailway || detected.hasVercel || detected.hasWrangler;
  const dependencyCount = Object.keys(detected.packageJson?.dependencies || {}).length;

  if (dependencyCount > 20 || hasDeploy) {
    return 'C';  // Full - complex project
  } else if (hasGitHub || hasTests) {
    return 'B';  // Standard - typical project
  } else {
    return 'A';  // Minimal - simple project
  }
}
```

**Store recommendation** in `wizardState.preset` - continue immediately to Step 3.

### Step 3: Detect GitHub (AUTO)

**Extract GitHub info from git remote:**

```javascript
// Already parsed in Step 1
const { owner, repo } = parseGitRemote(detected.gitRemote);

if (owner && repo) {
  wizardState.github = {
    enabled: true,
    owner: owner,
    repo: repo,
    projectNumber: null  // Can't auto-detect, will ask in Step 8 if needed
  };
}
```

**Continue immediately to Step 4.**

### Step 4: Detect Deployment (AUTO)

**Infer deployment platforms from config files:**

```javascript
function detectDeployment(detected) {
  const deployment = { frontend: null, backend: null };

  // Frontend detection
  if (detected.hasWrangler) {
    // Read wrangler.toml for project name
    const wranglerContent = read('wrangler.toml');
    deployment.frontend = {
      platform: 'cloudflare',
      projectName: parseWranglerName(wranglerContent)
    };
  } else if (detected.hasVercel) {
    deployment.frontend = { platform: 'vercel', projectName: detected.packageJson?.name };
  }

  // Backend detection
  if (detected.hasRailway) {
    // Read railway.json/toml for project info
    deployment.backend = { platform: 'railway', projectId: null, serviceId: null };
  }

  // Fallback: check package.json scripts for deploy hints
  const scripts = detected.packageJson?.scripts || {};
  if (scripts['deploy:cloudflare'] || scripts['pages:deploy']) {
    deployment.frontend = deployment.frontend || { platform: 'cloudflare' };
  }
  if (scripts['deploy:railway']) {
    deployment.backend = deployment.backend || { platform: 'railway' };
  }

  return deployment;
}

wizardState.deployment = detectDeployment(detected);
```

**Continue immediately to Step 5.**

### Step 5: Detect Tunnel (AUTO)

**Check for existing tunnel configuration:**

```javascript
function detectTunnel(detected) {
  if (detected.hasNgrokConfig) {
    return { service: 'ngrok', subdomain: parseNgrokSubdomain() };
  }

  // Check package.json scripts for tunnel hints
  const scripts = detected.packageJson?.scripts || {};
  if (scripts.tunnel?.includes('ngrok')) return { service: 'ngrok' };
  if (scripts.tunnel?.includes('localtunnel')) return { service: 'localtunnel' };

  // No tunnel detected - that's fine, leave as 'none'
  return { service: 'none' };
}

wizardState.tunnel = detectTunnel(detected);
```

**Continue immediately to Step 6.**

### Step 6: Analyze CLAUDE.md (AUTO)

**Audit existing CLAUDE.md and recommend action:**

```javascript
function analyzeCLAUDEmd(detected) {
  const result = {
    exists: detected.hasClaudeMd,
    lineCount: detected.claudeMdLineCount || 0,
    score: 0,
    issues: [],
    recommendation: 'skip'
  };

  if (!detected.hasClaudeMd) {
    result.recommendation = 'generate';
    return result;
  }

  const content = detected.claudeMdContent;

  // Scoring
  if (content.includes('```bash')) result.score += 20;
  if (/IMPORTANT|MUST|NEVER|CRITICAL/i.test(content)) result.score += 20;
  if (content.includes('## Commands') || content.includes('## Tech Stack')) result.score += 20;
  if (result.lineCount <= 60) result.score += 20;
  if (result.lineCount <= 300) result.score += 20;

  // Issues
  if (result.lineCount > 300) result.issues.push('Too long (>300 lines)');
  if (result.lineCount > 60) result.issues.push('Consider shortening (<60 recommended)');
  if (/be careful|try to|maybe/i.test(content)) result.issues.push('Vague instructions found');

  // Recommendation
  if (result.score < 40) {
    result.recommendation = 'generate';  // Too broken, start fresh
  } else if (result.score < 70) {
    result.recommendation = 'enhance';   // Could use improvement
  } else {
    result.recommendation = 'skip';      // Good enough
  }

  return result;
}

wizardState.claudeMd = analyzeCLAUDEmd(detected);
wizardState.claudeMd.detectedStack = detected.frameworks;
```

**Continue immediately to Step 7.**

### Step 7: Display Recommendations (AUTO)

**Show all detected settings and recommendations:**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   CCASP Setup - Detected Configuration                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Project: my-project (from package.json)                                     ║
║   Tech Stack: React 19 + Vite + Tailwind (auto-detected)                      ║
║                                                                               ║
║   Recommendations:                                                            ║
║   ─────────────────                                                           ║
║   Feature Preset:    [C] Full (complex project with 25+ dependencies)         ║
║                                                                               ║
║   GitHub:            ✅ Detected from git remote                              ║
║   ├─ Repository:     user/my-project                                          ║
║   └─ Project Board:  ❓ Not detected (optional - enter number if you have one)║
║                                                                               ║
║   Deployment:                                                                 ║
║   ├─ Frontend:       Cloudflare (detected from wrangler.toml)                 ║
║   └─ Backend:        Railway (detected from railway.json)                     ║
║                                                                               ║
║   Tunnel:            None detected                                            ║
║                                                                               ║
║   CLAUDE.md:         Enhance (score: 65/100, 2 issues found)                  ║
║   └─ Issues:         Line count 85 (>60), vague instructions                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Continue immediately to Step 8.**

### Step 8: User Confirmation (ONLY USER INPUT STEP)

**This is the ONLY step requiring user input.** Ask for confirmation and any missing values:

```
Apply these settings?

[Y] Yes, apply all recommendations
[N] No, let me customize
[Q] Quit without changes

If you have a GitHub Project Board, enter the number (or press Enter to skip):
> _
```

**If Y**: Proceed to Step 9 with all detected/recommended values.

**If N**: Use AskUserQuestion to let user override specific settings:
- Feature preset (A/B/C/D)
- GitHub project number
- Deployment project names/IDs (if detected but need correction)
- CLAUDE.md action (generate/enhance/skip)

**After confirmation, proceed to Step 9.**

### Step 9: Write Configuration (AUTO - no user input)

**Execute ALL of the following automatically without stopping:**

1. **Create .claude/ structure** (AUTO):
   ```bash
   mkdir -p .claude/commands .claude/agents .claude/hooks .claude/skills .claude/config .claude/docs .claude/backups
   ```

2. **Write tech-stack.json** (AUTO):

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

3. **Deploy feature commands** (AUTO):

   - **A (Minimal)**: menu.md, INDEX.md
   - **B (Standard)**: Above + github-task.md, phase-dev-plan.md, e2e-test.md, create-task-list.md
   - **C (Full)**: Above + create-agent.md, create-hook.md, create-skill.md, explore-mcp.md, claude-audit.md, codebase-explorer.md, project-impl.md
   - **D (Custom)**: Only selected features

   Use Bash to copy from CCASP templates or use the ccasp CLI:
   ```bash
   npx ccasp init --preset <A|B|C|D> --features <list>
   ```

4. **Write/update CLAUDE.md** (AUTO - if selected in Step 6):

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

5. **Update ccasp-state.json** (AUTO):
   ```json
   {
     "projectImplCompleted": true,
     "setupCompletedAt": "<ISO timestamp>",
     "preset": "<A|B|C|D>",
     "claudeMdGenerated": true | false
   }
   ```

**Execute all 5 sub-steps in sequence without pausing.**

### Step 10: Completion Message (AUTO - display and done)

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

| Step | Action | User Input? |
|------|--------|-------------|
| 1 | Deep scan project (package.json, git, configs) | ✅ AUTO |
| 2 | Recommend preset based on project complexity | ✅ AUTO |
| 3 | Extract GitHub from git remote | ✅ AUTO |
| 4 | Detect deployment from config files | ✅ AUTO |
| 5 | Check for tunnel configuration | ✅ AUTO |
| 6 | Audit CLAUDE.md and recommend action | ✅ AUTO |
| 7 | Display all recommendations | ✅ AUTO |
| 8 | Confirm settings (Y/N) + optional project # | ❌ USER |
| 9 | Write all configuration | ✅ AUTO |
| 10 | Display completion message | ✅ AUTO |

**Total user inputs: 1-2** (confirmation + optional GitHub project number)

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
