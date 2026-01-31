---
description: Complete CCASP project setup - tech stack detection, CLAUDE.md, GitHub, MCP configuration
model: sonnet
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
  - Write
  - Edit
  - Bash
  - AskUserQuestion
  - WebSearch
---

# /project-implementation-for-ccasp - Full Project Implementation

**This is the main command for CCASP project setup inside Claude Code CLI.**

After running `ccasp wizard` in the terminal, this command handles ALL intelligent operations:
- Tech stack detection and `tech-stack.json` generation
- CLAUDE.md audit and enhancement
- GitHub Project Board configuration
- MCP server recommendations
- Deployment automation setup

## Auto-Run Flow

When invoked (typically auto-injected after wizard completes):

### Step 1: Tech Stack Detection (ALWAYS FIRST)

**Deploy Explore agent** to scan the codebase:

1. **Scan package.json** for:
   - Framework: react, vue, angular, svelte, next, nuxt
   - State: redux, zustand, mobx, pinia, jotai
   - Styling: tailwind, styled-components, emotion, sass
   - Testing: jest, vitest, playwright, cypress
   - Build: vite, webpack, esbuild, parcel

2. **Check config files:**
   - `vite.config.*`, `webpack.config.*`, `rollup.config.*`
   - `tsconfig.json`, `jsconfig.json`
   - `tailwind.config.*`, `postcss.config.*`
   - `.eslintrc.*`, `prettier.config.*`
   - `playwright.config.*`, `jest.config.*`

3. **Identify backend (if present):**
   - `requirements.txt`, `pyproject.toml` → Python
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `package.json` scripts with `node`, `ts-node` → Node.js

4. **Detect deployment configs:**
   - `railway.json`, `railway.toml` → Railway
   - `vercel.json` → Vercel
   - `wrangler.toml` → Cloudflare
   - `Dockerfile`, `docker-compose.yml` → Docker
   - `.github/workflows/` → GitHub Actions

5. **Display detected stack:**
```
🔍 Tech Stack Detection
═══════════════════════════

Frontend:
  Framework: React 19
  State: Zustand
  Styling: Tailwind CSS v4
  Build: Vite

Backend:
  Runtime: Node.js
  Framework: Express

Testing:
  Unit: Vitest
  E2E: Playwright

Deployment:
  Frontend: Cloudflare Pages
  Backend: Railway
  CI/CD: GitHub Actions
```

6. **Save to `.claude/config/tech-stack.json`**

---

### Step 2: CLAUDE.md Setup

**Ask user via AskUserQuestion:**
```
header: "CLAUDE.md"
question: "How would you like to set up CLAUDE.md?"
options:
  - "Generate from scratch (recommended)"
  - "Enhance existing CLAUDE.md"
  - "Skip - I'll configure manually"
```

**If Generate/Enhance:**
1. Generate content based on detected stack:
   - Project overview
   - Tech stack summary
   - Key commands (build, test, dev, deploy)
   - Important paths and files
   - Architecture notes
   - Common gotchas

2. Show preview of generated content

3. Write to CLAUDE.md (backup existing if present)

---

### Step 3: GitHub Project Board (Optional)

**Ask user via AskUserQuestion:**
```
header: "GitHub"
question: "Connect to GitHub Project Board?"
options:
  - "Yes - configure now"
  - "Skip for now"
```

**If Yes:**
1. Check `gh` CLI authentication status
2. Detect existing project boards
3. Save configuration to `.claude/config/github-project.json`

---

### Step 4: MCP Server Recommendations

**Based on detected tech stack, recommend MCPs:**

1. **Core Testing MCPs** (always offered):
   - Playwright MCP - Browser automation
   - Log Monitor MCP - Backend log tailing
   - Browser Monitor MCP - Network/console monitoring

2. **Stack-specific MCPs:**
   - Railway MCP (if Railway detected)
   - Cloudflare MCP (if Cloudflare detected)
   - GitHub MCP (if GitHub detected)
   - Database MCPs based on detected DB

3. **Use web search** to find additional MCPs for frameworks

**Ask user which MCPs to install:**
```
header: "MCP Servers"
question: "Select MCP servers to configure:"
options:
  - "[x] Playwright (recommended)"
  - "[x] Log Monitor (recommended)"
  - "[ ] Railway"
  - "[ ] Cloudflare"
```

---

### Step 5: Summary & Next Steps

Display completion summary:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ CCASP Setup Complete                                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tech Stack: ✓ Detected and saved                             ║
║  CLAUDE.md:  ✓ Generated/Enhanced                             ║
║  GitHub:     ✓ Connected (or skipped)                         ║
║  MCPs:       ✓ 3 configured                                   ║
║                                                               ║
║  Next steps:                                                  ║
║  • Type /menu to see all available commands                   ║
║  • Type /github-update to view project board                  ║
║  • Type /explore-mcp to discover more MCPs                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Manual Menu (Alternative)

If user invokes command manually (not auto-injected):

| Key | Action | Description |
|-----|--------|-------------|
| **1** | Detect Tech Stack | Scan codebase and save tech-stack.json |
| **2** | Audit CLAUDE.md | Analyze configuration against best practices |
| **3** | Enhance CLAUDE.md | Generate/improve documentation from codebase |
| **4** | Configure GitHub | Connect to GitHub Project Board |
| **5** | Configure MCPs | Discover and install MCP servers |
| **A** | Run All | Execute full setup flow (Steps 1-5) |
| **B** | Back to /menu | Return to main menu |

---

## Audit CLAUDE.md Details

When auditing:

1. **Read CLAUDE.md and .claude/ folder** to understand current setup
2. **Check length** - warn if >60 lines, error if >300 lines (Anthropic best practice)
3. **Find anti-patterns:**
   - Vague instructions ("be careful", "try to")
   - Long code blocks (>20 lines)
   - Missing runnable commands
   - No emphasis keywords (IMPORTANT, MUST, NEVER)
4. **Find good patterns:**
   - Emphasis keywords (IMPORTANT, MUST, CRITICAL)
   - Runnable bash commands
   - @imports for context
   - Clear, specific instructions
5. **Score and report findings:**
   - Green: Excellent (score 80-100)
   - Yellow: Good with improvements (score 60-79)
   - Red: Needs work (score <60)

---

## Mark Setup Complete

**IMPORTANT:** After completing the full setup flow, update the state file:

Use the Edit tool to update `.claude/config/ccasp-state.json`:
- Set `"projectImplCompleted": true`

This removes the setup recommendation banner from `/menu`.

---

## Terminal Alternative

```bash
npx ccasp wizard          # Terminal wizard (deploys files)
npx ccasp detect-stack    # Detect tech stack only
npx ccasp claude-audit    # Audit CLAUDE.md only
```

---

*Part of Claude CLI Advanced Starter Pack*
