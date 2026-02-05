/**
 * Core command templates
 * General purpose commands and project management
 */

export const CORE_TEMPLATES = {
  'e2e-test': () => `---
description: Run E2E tests with Playwright
options:
  - label: "Ralph Loop"
    description: "Test-fix cycle until all pass"
  - label: "Watch Mode"
    description: "Interactive Playwright UI"
  - label: "Headed Mode"
    description: "Show browser window"
---

# E2E Test Runner

Run Playwright E2E tests with various modes for comprehensive testing.

## Usage

Select a test mode and Claude will execute the appropriate Playwright command.

## Available Modes

1. **Ralph Loop** - Runs tests, analyzes failures, fixes code, repeats until all pass
2. **Watch Mode** - Opens Playwright UI for interactive test exploration
3. **Headed Mode** - Runs tests with visible browser for debugging
4. **Default** - Runs all tests in headless mode

## Commands

\`\`\`bash
# Ralph loop (test-fix cycle)
npx playwright test --reporter=line 2>&1 | head -100

# Watch mode
npx playwright test --ui

# Headed mode
npx playwright test --headed

# Specific test file
npx playwright test tests/example.spec.ts
\`\`\`

## Instructions

When invoked:
1. Check for playwright.config.ts or playwright.config.js
2. If not found, offer to set up Playwright
3. Run the selected test mode
4. For Ralph Loop: analyze failures and suggest fixes
`,

  'claude-audit': () => `---
description: Audit CLAUDE.md and .claude/ folder against Anthropic best practices
options:
  - label: "Full Audit"
    description: "Check everything"
  - label: "CLAUDE.md Only"
    description: "Check instruction files"
  - label: "Folder Structure"
    description: "Verify .claude/ organization"
---

# Claude Code Setup Auditor

Verify your Claude Code configuration against Anthropic's official best practices.

## Checks Performed

### CLAUDE.md Files
- Line count (warn >150, error >300)
- Anti-patterns (long code blocks, vague instructions)
- Good patterns (IMPORTANT/MUST keywords, bash commands, @imports)

### Folder Structure
- Required directories (commands/, skills/, agents/, hooks/)
- settings.json presence and validity
- Frontmatter validation for skills/agents

## Instructions

When invoked:
1. Read all CLAUDE.md files (root, .claude/, subdirectories)
2. Analyze content against best practices
3. Check .claude/ folder structure
4. Generate report with:
   - Passed checks
   - Warnings (non-critical issues)
   - Errors (must fix)
   - Recommendations
`,

  'claude-settings': () => `---
description: Configure Claude CLI permissions and modes
options:
  - label: "Permission Mode"
    description: "Set allow/deny rules"
  - label: "Agent-Only Mode"
    description: "Configure agent launcher"
  - label: "View Current"
    description: "Show active settings"
---

# Claude Settings Manager

Configure permissions, modes, and behaviors for Claude Code CLI.

## Settings Categories

### Permissions
- Tool allow/deny lists
- File access patterns
- Network restrictions

### Modes
- Agent-only mode (restrict to specific agents)
- Auto-approve patterns
- Silent mode

## Settings Files

- \`.claude/settings.json\` - Project settings (committed)
- \`.claude/settings.local.json\` - Local overrides (gitignored)

## Instructions

When invoked:
1. Read current settings from both files
2. Show current configuration
3. Allow modifications through interactive prompts
4. Write changes to appropriate file
`,

  'codebase-explorer': () => `---
description: Analyze codebase structure and find relevant files
options:
  - label: "Structure Overview"
    description: "Show project organization"
  - label: "Find Related Files"
    description: "Search by keyword/pattern"
  - label: "Dependency Analysis"
    description: "Map imports and exports"
---

# Codebase Explorer

Intelligent codebase analysis to understand structure and find relevant code.

## Capabilities

- **Structure Overview** - Directory tree with key file identification
- **Pattern Search** - Find files by name patterns or content
- **Import Analysis** - Trace dependencies and exports
- **Tech Stack Detection** - Identify frameworks and libraries

## Instructions

When invoked:
1. For Structure Overview:
   - Generate directory tree (depth 3)
   - Identify entry points (main, index, app)
   - List key configuration files
   - Detect tech stack

2. For Find Related Files:
   - Ask for keyword/pattern
   - Search with Glob and Grep
   - Rank results by relevance
   - Show code snippets

3. For Dependency Analysis:
   - Select starting file
   - Trace imports recursively
   - Generate dependency graph
   - Identify circular dependencies
`,

  'explore-mcp': () => `---
description: Discover and install MCP servers based on your tech stack
options:
  - label: "Auto-Detect"
    description: "Scan codebase and recommend"
  - label: "Browse All"
    description: "Show all available MCPs"
  - label: "Testing MCPs"
    description: "Playwright, Puppeteer"
---

# MCP Server Explorer

Discover Model Context Protocol servers to extend Claude's capabilities.

## Available MCP Categories

- **Testing** - Playwright, Puppeteer, Playwright Extended
- **VCS** - GitHub, Git
- **Deployment** - Railway, Cloudflare, DigitalOcean, Vercel
- **Database** - PostgreSQL, SQLite, Supabase
- **Automation** - n8n workflow automation
- **Communication** - Slack, Resend (email)
- **Utilities** - Filesystem, Fetch

## Auto-Detection

Scans your codebase for:
- package.json dependencies
- Configuration files (supabase/, .env with keys)
- Import patterns

## Instructions

When invoked:
1. Scan codebase for tech stack indicators
2. Recommend relevant MCPs
3. Show installation commands
4. Offer to add to claude_desktop_config.json or .mcp.json
`,

  'ccasp-setup': () => `---
description: CCASP Setup Wizard - vibe-code friendly project configuration
model: haiku
options:
  - label: "Quick Start"
    description: "Auto-detect + init"
  - label: "Full Setup"
    description: "All features"
  - label: "Prior Releases"
    description: "Add features from updates"
---

# CCASP Setup Wizard

Interactive setup wizard for Claude Code CLI enhancement.

## Quick Options

Reply with a **number** to select:

| # | Action | Description |
|---|--------|-------------|
| **1** | Quick Start | Auto-detect stack + init .claude |
| **2** | Full Setup | All features with customization |
| **3** | GitHub | Connect project board |
| **4** | Templates | Browse available items |
| **5** | Prior Releases | Review & add features from past versions |
| **6** | Remove CCASP | Uninstall from this project |
| **0** | Exit | Close wizard |

## Feature Presets

| Letter | Preset | Features |
|--------|--------|----------|
| **A** | Minimal | Menu + help only |
| **B** | Standard | Essential + GitHub + testing |
| **C** | Full | Everything including agents |
| **D** | Custom | Pick individual features |

## Related Commands

- \`/project-impl\` - Agent-powered project implementation (audit, enhance, detect, configure)
- \`/update-check\` - Check for updates and add new features to your project

## Instructions for Claude

When this command is invoked:

1. **Show welcome message** with current project status:
   - Does \`.claude/\` exist? (check with Bash: ls -la .claude 2>/dev/null)
   - Does \`CLAUDE.md\` exist? (check with Bash: ls -la CLAUDE.md 2>/dev/null)
   - Is tech stack detected? (check for package.json, pyproject.toml, etc.)

2. **Check for updates** (display banner if new version available)

3. **Present the quick options menu** and wait for user selection

4. **Handle user selection**:
   - If user types a number (1-6), execute that action
   - If user types a letter (A-D), apply that preset
   - For "1" (Quick Start): run tech detection, show results, apply Standard preset
   - For "5" (Prior Releases): show release history and feature management

5. **For Quick Start**:
   - Detect tech stack from package.json, config files
   - Show summary of detected stack
   - Create .claude/ folder with commands, settings
   - Generate CLAUDE.md with detected stack info

6. **CRITICAL - Session Restart Reminder**:
   After ANY action that modifies \`.claude/\` or \`CLAUDE.md\`, display:

   ⚠️  RESTART REQUIRED

   Changes to .claude/ require a new Claude Code session.

   To apply changes:
   1. Exit this session (Ctrl+C or /exit)
   2. Restart: claude or claude .
   3. New commands will be available

   Actions requiring restart: 1, 2, 3, 5 (if features added)
   Actions NOT requiring restart: 4 (templates)

## Vibe-Code Design

This wizard is designed for mobile/remote use:
- Single character inputs only
- No long text entry required
- Progressive disclosure
- Sensible defaults

## Terminal Alternative

\`\`\`bash
npx ccasp wizard     # Interactive setup
npx ccasp init       # Initialize .claude folder
npx ccasp detect-stack  # Detect tech stack
\`\`\`
`,
};
