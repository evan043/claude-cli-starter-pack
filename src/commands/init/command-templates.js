/**
 * Command Templates
 *
 * Template generators for slash commands deployed during CCASP initialization.
 * Each template returns the markdown content for a slash command file.
 *
 * Extracted from init.js for maintainability.
 */

/**
 * Command template generators
 * Each key is a command name, each value is a function returning the command markdown
 */
export const COMMAND_TEMPLATES = {
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

  'github-task': () => `---
description: Create GitHub issues with codebase analysis
options:
  - label: "Bug Report"
    description: "Report a bug with context"
  - label: "Feature Request"
    description: "Propose new functionality"
  - label: "Refactor Task"
    description: "Code improvement task"
---

# GitHub Task Creator

Create well-documented GitHub issues with automatic codebase analysis.

## Features

- Analyzes codebase to find relevant files
- Generates rich issue bodies with code snippets
- Adds to GitHub Project Board
- Sets appropriate labels and priority

## Usage

1. Describe the task or bug
2. Claude analyzes relevant code
3. Review generated issue body
4. Confirm to create issue

## Commands

\`\`\`bash
# Check gh CLI authentication
gh auth status

# Create issue with body
gh issue create --title "Title" --body "Body" --label "type:bug"

# Add to project board
gh project item-add <project-number> --owner <owner> --url <issue-url>
\`\`\`

## Instructions

When invoked:
1. Ask user for task description
2. Search codebase for relevant files using Grep/Glob
3. Generate comprehensive issue body with:
   - Problem description
   - Relevant code snippets
   - Suggested implementation approach
   - Acceptance criteria
4. Create issue via gh CLI
5. Add to project board if configured
`,

  'phase-dev-plan': () => `---
description: Create phased development plans with 95%+ success probability
options:
  - label: "Small (1-2 phases)"
    description: "Quick feature or bug fix"
  - label: "Medium (3-4 phases)"
    description: "Standard feature implementation"
  - label: "Large (5+ phases)"
    description: "Complex multi-system changes"
---

# Phased Development Plan Generator

Create comprehensive, executable development plans that maximize success probability.

## Why Phased Development?

- Breaks complex tasks into manageable chunks
- Each phase is independently testable
- Clear checkpoints for progress tracking
- Rollback points if issues arise

## Generated Artifacts

1. **PROGRESS.json** - State tracking and phase management
2. **EXECUTIVE_SUMMARY.md** - Project overview and phase breakdown
3. **Phase Executor Agent** - Autonomous phase execution
4. **Slash Command** - Interactive phase navigation

## Instructions

When invoked:
1. Gather project requirements
2. Analyze codebase for affected areas
3. Determine appropriate scale (S/M/L)
4. Generate phase breakdown with:
   - Clear objectives
   - Success criteria
   - Estimated complexity
   - Dependencies
5. Create all artifacts in .claude/docs/<project-slug>/
6. Generate executable slash command
`,

  'create-agent': () => `---
description: Create Claude Code agents (L1 orchestrators, L2 specialists, L3 workers)
options:
  - label: "L1 Orchestrator"
    description: "High-level task coordinator"
  - label: "L2 Specialist"
    description: "Domain-specific expert"
  - label: "L3 Worker"
    description: "Focused task executor"
---

# Claude Code Agent Creator

Create agents for the Claude Code CLI agent hierarchy.

## Agent Hierarchy

- **L1 Orchestrator** - Coordinates complex multi-step tasks, delegates to specialists
- **L2 Specialist** - Domain expertise (frontend, backend, testing, etc.)
- **L3 Worker** - Single-purpose task execution

## Agent Structure

Agents are created in \`.claude/agents/<agent-name>.md\` with:
- YAML frontmatter (description, tools, model)
- System prompt
- Available tools and capabilities
- Example invocations

## Instructions

When invoked:
1. Ask for agent name and purpose
2. Determine appropriate level (L1/L2/L3)
3. Select relevant tools
4. Generate agent file with proper frontmatter
5. Register in settings.json allowedTools if needed
`,

  'create-hook': () => `---
description: Create enforcement hooks for Claude Code
options:
  - label: "PreToolUse"
    description: "Validate before tool execution"
  - label: "PostToolUse"
    description: "Process after tool completion"
  - label: "UserPromptSubmit"
    description: "Intercept user messages"
---

# Claude Code Hook Creator

Create hooks that enforce patterns, validate inputs, and process outputs.

## Hook Types

- **PreToolUse** - Runs before a tool executes (validation, blocking)
- **PostToolUse** - Runs after tool completes (logging, modification)
- **UserPromptSubmit** - Intercepts user messages (routing, preprocessing)

## Hook Structure

Hooks are created in \`.claude/hooks/\` as JavaScript files:
- Export async function matching event type
- Receive context with tool name, input, user message
- Return continue/block decision

## Instructions

When invoked:
1. Ask for hook purpose and trigger
2. Select event type
3. Define target tools (for PreToolUse/PostToolUse)
4. Generate hook file with proper exports
5. Add to settings.local.json hooks array
`,

  'create-skill': () => `---
description: Create RAG-enhanced skill packages for Claude Code
---

# Claude Code Skill Creator

Create skill packages that combine prompts, context, and workflows.

## Skill Structure

Skills are created in \`.claude/skills/<skill-name>/\` with:
- \`skill.md\` - Main skill definition with YAML frontmatter
- \`context/\` - Supporting documentation and examples
- \`workflows/\` - Step-by-step procedures

## Features

- RAG-enhanced context loading
- Workflow chaining
- Tool specifications
- Model preferences

## Instructions

When invoked:
1. Ask for skill name and purpose
2. Define target domain/functionality
3. Create skill directory structure
4. Generate skill.md with frontmatter
5. Add starter context files
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

  'roadmap-sync': () => `---
description: Sync roadmaps with GitHub Project Board
options:
  - label: "Import Roadmap"
    description: "Create issues from ROADMAP.json"
  - label: "Sync Progress"
    description: "Update GitHub from local progress"
  - label: "Pull Status"
    description: "Fetch status from GitHub"
---

# Roadmap Integration

Bridge local roadmap files with GitHub Project Board for bidirectional sync.

## Workflow

1. Create roadmap with \`/create-roadmap\` or manually
2. Import projects as GitHub issues
3. Track progress locally
4. Sync changes to GitHub

## File Format

Roadmaps are stored as JSON:
\`\`\`json
{
  "title": "Project Roadmap",
  "projects": [
    {
      "name": "Feature X",
      "status": "in_progress",
      "github_issue": 123
    }
  ]
}
\`\`\`

## Instructions

When invoked:
1. Check for ROADMAP.json in .claude/docs/
2. Verify GitHub authentication and project access
3. Perform selected sync operation
4. Report changes made
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

  'rag-pipeline': () => `---
description: Generate RAG pipeline with L1 orchestrator + L2 specialists
options:
  - label: "Full Pipeline"
    description: "L1 + multiple L2 agents"
  - label: "Single Domain"
    description: "L1 + one L2 specialist"
---

# RAG Pipeline Generator

Create a complete Retrieval-Augmented Generation pipeline with agent hierarchy.

## Pipeline Structure

\`\`\`
L1 Orchestrator
├── L2 Research Specialist
├── L2 Implementation Specialist
├── L2 Testing Specialist
└── L2 Documentation Specialist
\`\`\`

## Generated Artifacts

- L1 orchestrator agent definition
- L2 specialist agent definitions
- Routing logic for task delegation
- Context management configuration

## Instructions

When invoked:
1. Ask for pipeline purpose/domain
2. Determine needed specialists
3. Generate L1 orchestrator with routing rules
4. Generate L2 specialists with domain expertise
5. Create coordination hooks if needed
6. Generate invocation command
`,

  'create-task-list': () => `---
description: Create intelligent task list with codebase exploration and GitHub integration
options:
  - label: "New Task List"
    description: "Create fresh task list with exploration"
  - label: "Quick Task List"
    description: "Create task list without exploration"
---

# Intelligent Task List Generator

Create a comprehensive task list with codebase exploration, clarifying questions, and GitHub integration.

## Features

- **Codebase Exploration** - Deploy agents to understand relevant files and patterns
- **Clarifying Questions** - Ask follow-up questions when context is insufficient
- **Testing Options** - Ralph Loop, ngrok/production, Playwright modes
- **GitHub Integration** - Optionally create a tracked GitHub issue for the task
- **Progress Hook** - Auto-update GitHub issue as tasks complete

## Execution Flow

### Step 1: Capture User Prompt

If no arguments provided, ask what the user wants to accomplish.

### Step 2: Context Assessment

Evaluate the prompt for specificity, scope, technical depth, and reproducibility.

**Score Calculation**:
- 70-100%: Sufficient context -> Parallel exploration
- 0-69%: Insufficient context -> Quick scan + clarifying questions

### Step 3: Deploy Exploration Agents

Deploy in parallel:
- **Explore Agent 1**: Find files related to the task
- **Explore Agent 2**: Search for tests and documentation
- **Explore Agent 3** (if backend): Find API endpoints and models

### Step 4: Synthesize and Ask Questions

Present findings and ask mandatory questions:

1. **Testing Approach**: Ralph Loop vs Manual vs Minimal
2. **Playwright Environment**: ngrok vs production vs none
3. **GitHub Integration** (NEW): Create tracked GitHub issue?
4. **Confirm Plan**: Proceed or adjust?

### Step 5: Create Task List

Use TodoWrite to build the task list with:
- Task 0: Persistent context (never marked complete)
- Task 1: Login via Playwright (if E2E testing)
- Tasks 2-N: Implementation tasks
- Final tasks: Verification and commit

### Step 6: Create GitHub Issue (Optional)

If user selected GitHub integration:
1. Create comprehensive issue with codebase analysis
2. Add to project board
3. Install progress hook to auto-update issue

## GitHub Integration Details

When enabled, the command:
1. Creates a GitHub issue with:
   - Problem statement from user prompt
   - Code analysis from exploration
   - Task checklist (matching TodoWrite tasks)
   - Reference documentation links

2. Installs a PostToolUse hook that:
   - Watches for TodoWrite calls
   - Updates GitHub issue progress when tasks complete
   - Adds comments for significant milestones

## Instructions

When invoked:
1. Gather task description (from args or by asking)
2. Assess context quality
3. Deploy exploration agents (parallel if sufficient context)
4. Present findings and ask questions
5. Create task list with TodoWrite
6. Optionally create GitHub issue and install progress hook
7. Begin Task 1
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

/**
 * Get a command template by name
 * @param {string} name - Command name
 * @returns {Function|undefined} Template generator function
 */
export function getCommandTemplate(name) {
  return COMMAND_TEMPLATES[name];
}

/**
 * Get all available command template names
 * @returns {string[]} Array of command names
 */
export function getCommandTemplateNames() {
  return Object.keys(COMMAND_TEMPLATES);
}

/**
 * Check if a command template exists
 * @param {string} name - Command name
 * @returns {boolean} True if template exists
 */
export function hasCommandTemplate(name) {
  return name in COMMAND_TEMPLATES;
}
