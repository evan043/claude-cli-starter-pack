---
description: Agent-powered project implementation - audit, enhance, detect stack, configure
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
---

# /project-impl - Project Implementation

Advanced project tools for CLAUDE.md management and codebase analysis.

**For initial setup**, use `/ccasp-setup` instead - it's a one-shot linear wizard that configures everything in a single pass.

## Quick Menu

| Key | Action | Description |
|-----|--------|-------------|
| **1** | Audit CLAUDE.md | Analyze configuration against best practices |
| **2** | Enhance CLAUDE.md | Generate/improve documentation from codebase |
| **3** | Detect Tech Stack | Scan codebase and identify technologies |
| **S** | Full Setup | Run `/ccasp-setup` linear wizard |
| **B** | Back to /menu | Return to main menu |

## Instructions for Claude

When invoked, display the menu above and use AskUserQuestion to get the user's selection.

**If user selects S**: Invoke `/ccasp-setup` skill for the linear setup wizard.

---

### Option 1: Audit CLAUDE.md

Deploy an audit agent to analyze the project's CLAUDE.md configuration:

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
6. **Offer to run enhancement** if issues found

**Report Format:**
```
📊 CLAUDE.md Audit Report
═══════════════════════════

✓ PASSED
- Line count: XX (recommended <60)
- Has runnable commands
- Uses emphasis keywords

⚠ WARNINGS
- [List of warnings]

✗ ERRORS
- [List of errors]

📋 RECOMMENDATIONS
- [Actionable suggestions]

Score: XX/100
```

---

### Option 2: Enhance CLAUDE.md

1. **Deploy Explore agent** to detect tech stack:
   - Scan package.json for frameworks and dependencies
   - Check config files (vite.config.*, webpack.config.*, etc.)
   - Identify state managers, test frameworks, build tools
   - Detect deployment configurations

2. **Ask user via AskUserQuestion:**
   - "Generate from scratch" - Create new CLAUDE.md based on detected stack
   - "Add missing sections" - Enhance existing CLAUDE.md

3. **Generate content based on detected stack:**
   - Project overview
   - Tech stack summary
   - Key commands (build, test, dev, deploy)
   - Important paths and files
   - Architecture notes
   - Common gotchas

4. **Show preview** of generated content

5. **Write to CLAUDE.md:**
   - If file exists, create backup at `.claude/backups/CLAUDE.md.{timestamp}.bak`
   - Write new content

**Generated CLAUDE.md Structure:**
```markdown
# Project Name

Brief description of the project.

## Tech Stack
- Frontend: [framework]
- Backend: [framework]
- Database: [type]
- Testing: [framework]

## Commands
\`\`\`bash
npm run dev      # Start development server
npm run build    # Build for production
npm test         # Run tests
\`\`\`

## Key Paths
| Path | Description |
|------|-------------|
| src/ | Source code |
| ...  | ...         |

## Architecture Notes
[Key architectural decisions and patterns]

## Gotchas
- [Common issues and solutions]
```

---

### Option 3: Detect Tech Stack

Deploy an Explore agent to scan the codebase:

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

5. **Report in structured format:**
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

6. **Offer to save** to `.claude/config/tech-stack.json`

---

## Navigation

After completing any option, ask the user:
- "Would you like to perform another action? (1-3, S for setup, B to go back)"

## Mark Setup Complete

**IMPORTANT:** After the user successfully completes ANY option (1-3), update the state file:

Use the Edit tool to update `.claude/config/ccasp-state.json`:
- Set `"projectImplCompleted": true`

This removes the "Run /project-impl" recommendation banner from `/menu`.

## Terminal Alternative

```bash
npx ccasp wizard          # Linear setup wizard (recommended)
npx ccasp detect-stack    # Detect tech stack
npx ccasp claude-audit    # Audit CLAUDE.md
```

---

*Part of Claude CLI Advanced Starter Pack*
