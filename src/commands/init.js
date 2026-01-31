/**
 * Init Command
 *
 * Deploy Claude CLI Advanced Starter Pack to a project's .claude/ folder
 * Creates complete folder structure with commands, skills, agents, hooks
 * Generates a sophisticated /menu command for project navigation
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { getVersion } from '../utils.js';
import { createBackup } from './setup-wizard.js';
import {
  loadUsageTracking,
  getCustomizedUsedAssets,
  isAssetCustomized,
} from '../utils/version-check.js';
import {
  getAssetsNeedingMerge,
  compareAssetVersions,
  getLocalAsset,
  getTemplateAsset,
  generateMergeExplanation,
  formatMergeOptions,
} from '../utils/smart-merge.js';
import { registerProject } from '../utils/global-registry.js';
import { replacePlaceholders } from '../utils/template-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Optional features with detailed descriptions
 * These can be selected during init and require post-install configuration via /menu
 */
const OPTIONAL_FEATURES = [
  {
    name: 'tokenManagement',
    label: 'Token Budget Management',
    description: 'Monitor and manage Claude API token usage with automatic compaction warnings, archive suggestions, and respawn thresholds. Includes hooks that track usage per session.',
    commands: ['context-audit'],
    hooks: ['context-guardian', 'token-budget-loader', 'tool-output-cacher'],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'happyMode',
    label: 'Happy Engineering Integration',
    description: 'Integration with Happy Coder mobile app for remote session control, checkpoint management, and mobile-optimized responses.',
    commands: ['happy-start'],
    hooks: ['happy-checkpoint-manager', 'happy-title-generator', 'happy-mode-detector', 'context-injector'],
    default: false,
    requiresPostConfig: true,
    npmPackage: 'happy-coder',
    npmInstallPrompt: 'Install Happy Coder CLI globally? (npm i -g happy-coder)',
  },
  {
    name: 'githubIntegration',
    label: 'GitHub Project Board Integration',
    description: 'Connect Claude to your GitHub Project Board for automated issue creation, progress tracking, and PR merge automation. Requires gh CLI authentication.',
    commands: ['github-update', 'github-task-start'],
    hooks: ['github-progress-hook'],  // Only include hooks with templates
    default: true,
    requiresPostConfig: true,
  },
  {
    name: 'phasedDevelopment',
    label: 'Phased Development System',
    description: 'Generate production-ready development plans with 95%+ success criteria, automatic scaling (S/M/L), and progress tracking. Creates PROGRESS.json files for state persistence.',
    commands: ['create-phase-dev', 'phase-track'],
    hooks: ['phase-dev-enforcer'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'deploymentAutomation',
    label: 'Deployment Automation',
    description: 'Automated full-stack deployment workflows. Supports Railway, Heroku, Vercel, Cloudflare Pages, and self-hosted targets. Platform configured after installation via /menu.',
    commands: ['deploy-full'],
    hooks: ['deployment-orchestrator'],
    default: false,
    requiresPostConfig: true,
  },
  {
    name: 'tunnelServices',
    label: 'Tunnel Service Integration',
    description: 'Expose local development server for mobile testing or webhooks. Supports ngrok, localtunnel, cloudflare-tunnel, and serveo. No default service - configured after installation via /menu.',
    commands: ['tunnel-start', 'tunnel-stop'],
    hooks: [],
    default: false,
    requiresPostConfig: true,
  },
  {
    name: 'advancedHooks',
    label: 'Advanced Hook Suite',
    description: 'Extended hook system with session management, git commit tracking, branch validation, issue detection, token monitoring, autonomous logging, and phase validation gates.',
    commands: [],
    hooks: [
      'session-id-generator',
      'git-commit-tracker',
      'branch-merge-checker',
      'issue-completion-detector',
      'token-usage-monitor',
      'autonomous-decision-logger',
      'phase-validation-gates',
    ],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'skillTemplates',
    label: 'Skill Creator Templates',
    description: 'Pre-built skills for agent creation, hook creation, and RAG-enhanced agent building. Provides best-practice templates for extending Claude Code.',
    commands: [],
    hooks: [],
    skills: ['agent-creator', 'hook-creator', 'rag-agent-creator', 'panel'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'refactoring',
    label: 'Refactoring Tools',
    description: 'Code quality commands for linting, cleanup, and safe refactoring. Includes pre-commit checks, auto-fix, and safety checklists.',
    commands: ['refactor-check', 'refactor-cleanup', 'refactor-prep'],
    hooks: [],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'testing',
    label: 'Advanced Testing',
    description: 'Extended testing capabilities including smoke test generation and test coverage analysis.',
    commands: ['create-smoke-test'],
    hooks: [],
    default: false,
    requiresPostConfig: false,
  },
];

/**
 * Available slash commands to deploy
 */
const AVAILABLE_COMMANDS = [
  {
    name: 'menu',
    description: 'Interactive ASCII menu for project commands and tools',
    category: 'Navigation',
    selected: true,
    required: true,
  },
  {
    name: 'ccasp-panel',
    description: 'Launch control panel in new terminal (agents, skills, hooks, MCP)',
    category: 'Navigation',
    selected: true,
  },
  {
    name: 'e2e-test',
    description: 'Run E2E tests with Playwright (ralph loop, headed, watch modes)',
    category: 'Testing',
    selected: true,
  },
  {
    name: 'github-task',
    description: 'Create GitHub issues with codebase analysis',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'menu-issues-list',
    description: 'Mobile-friendly menu of open GitHub issues',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'create-task-list-for-issue',
    description: 'Start working on a GitHub issue by number',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'phase-dev-plan',
    description: 'Create phased development plans (95%+ success rate)',
    category: 'Planning',
    selected: true,
  },
  {
    name: 'create-agent',
    description: 'Create L1/L2/L3 agents for Claude Code',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'create-hook',
    description: 'Create enforcement hooks (PreToolUse, PostToolUse, UserPromptSubmit)',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'create-skill',
    description: 'Create RAG-enhanced skill packages',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'explore-mcp',
    description: 'Discover and install MCP servers based on tech stack',
    category: 'MCP',
    selected: true,
  },
  {
    name: 'claude-audit',
    description: 'Audit CLAUDE.md and .claude/ against best practices',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'detect-tech-stack',
    description: 'Re-run tech stack detection and update configuration',
    category: 'Analysis',
    selected: true,
  },
  {
    name: 'roadmap-sync',
    description: 'Sync roadmaps with GitHub Project Board',
    category: 'GitHub',
    selected: false,
  },
  {
    name: 'claude-settings',
    description: 'Configure Claude CLI permissions and modes',
    category: 'Claude Code',
    selected: false,
  },
  {
    name: 'codebase-explorer',
    description: 'Analyze codebase structure and find relevant files',
    category: 'Analysis',
    selected: true,
  },
  {
    name: 'rag-pipeline',
    description: 'Generate RAG pipeline with L1 orchestrator + L2 specialists',
    category: 'Claude Code',
    selected: false,
  },
  {
    name: 'create-task-list',
    description: 'Create intelligent task list with codebase exploration and GitHub integration',
    category: 'Planning',
    selected: true,
  },
  {
    name: 'ccasp-setup',
    description: 'CCASP Setup Wizard - vibe-code friendly project configuration',
    category: 'Claude Code',
    selected: true,
    required: true,
  },
  // Feature-specific commands (deployed based on OPTIONAL_FEATURES selection)
  {
    name: 'context-audit',
    description: 'Audit context usage and token budget (requires tokenManagement feature)',
    category: 'Token Management',
    selected: false,
    feature: 'tokenManagement',
  },
  {
    name: 'happy-start',
    description: 'Start Happy Mode for mobile app integration (requires happyMode feature)',
    category: 'Happy Mode',
    selected: false,
    feature: 'happyMode',
  },
  {
    name: 'github-update',
    description: 'View and sync GitHub Project Board status',
    category: 'GitHub',
    selected: false,
    feature: 'githubIntegration',
  },
  {
    name: 'github-task-start',
    description: 'Start or complete a GitHub Project Board task',
    category: 'GitHub',
    selected: false,
    feature: 'githubIntegration',
  },
  {
    name: 'tunnel-start',
    description: 'Start tunnel service for mobile testing (requires tunnelServices feature)',
    category: 'Development',
    selected: false,
    feature: 'tunnelServices',
  },
  {
    name: 'tunnel-stop',
    description: 'Stop running tunnel service',
    category: 'Development',
    selected: false,
    feature: 'tunnelServices',
  },
  {
    name: 'phase-track',
    description: 'Track progress of phased development plan',
    category: 'Planning',
    selected: false,
    feature: 'phasedDevelopment',
  },
  {
    name: 'deploy-full',
    description: 'Full-stack deployment (requires deploymentAutomation feature)',
    category: 'Deployment',
    selected: false,
    feature: 'deploymentAutomation',
  },
  {
    name: 'project-impl',
    description: 'Agent-powered project implementation (audit, enhance, detect, configure)',
    category: 'Setup',
    selected: true,
  },
  {
    name: 'update-check',
    description: 'Check for CCASP updates and add new features to your project',
    category: 'Maintenance',
    selected: true,
  },
  {
    name: 'update-smart',
    description: 'Smart merge manager for customized assets during updates',
    category: 'Maintenance',
    selected: true,
  },
  // Refactoring commands (Phase 4)
  {
    name: 'refactor-check',
    description: 'Fast pre-commit quality gate - lint, type-check, test affected files',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'refactor-cleanup',
    description: 'Daily maintenance automation - fix lint, remove unused imports, format',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'refactor-prep',
    description: 'Pre-refactoring safety checklist - ensure safe conditions',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'ask-claude',
    description: 'Natural language command discovery - find the right command for any task',
    category: 'Discovery',
    selected: true,
  },
  {
    name: 'create-smoke-test',
    description: 'Auto-generate Playwright smoke tests for critical user flows',
    category: 'Testing',
    selected: false,
    feature: 'testing',
  },
];

/**
 * Generate the /menu command - launches CCASP Panel in new terminal
 */
function generateMenuCommand(projectName, installedCommands, installedAgents, installedSkills, installedHooks) {
  const date = new Date().toISOString().split('T')[0];

  // Build command list for reference
  let commandList = '';
  for (const cmdName of installedCommands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd && cmd.name !== 'menu') {
      commandList += `| /${cmd.name} | ${cmd.description} |\n`;
    }
  }

  return `---
description: Launch CCASP Control Panel - Interactive menu in separate terminal
---

# ${projectName} - Menu

## Instructions for Claude

**EXECUTE IMMEDIATELY**: Launch the CCASP Control Panel in a new terminal window.

### Step 1: Launch Panel

Use the Bash tool to run this command:

**Windows:**
\`\`\`bash
start powershell -NoExit -Command "ccasp panel"
\`\`\`

**macOS:**
\`\`\`bash
osascript -e 'tell application "Terminal" to do script "ccasp panel"'
\`\`\`

**Linux:**
\`\`\`bash
gnome-terminal -- ccasp panel &
\`\`\`

### Step 2: Confirm Launch

After running the command, display this confirmation:

\`\`\`
✅ CCASP Control Panel launched in a new terminal window!

┌─────────────────────────────────────────────────────────────────┐
│ CCASP Control Panel (NEW WINDOW)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agents & Skills:                                               │
│    [A] Create Agent     [H] Create Hook      [S] Create Skill  │
│    [M] Explore MCP      [C] Claude Audit     [E] Explore Code  │
│                                                                 │
│  Quick Actions:                                                 │
│    [P] Phase Dev Plan   [G] GitHub Task      [T] Run E2E Tests │
│    [U] Update Check                                             │
│                                                                 │
│  Controls:                                                      │
│    [Q] Quit   [R] Refresh   [X] Clear Queue   [?] Help         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

How to use:
1. Switch to the new PowerShell window with the panel
2. Press a single key to select a command (e.g., 'A' for Create Agent)
3. Return to this Claude Code session
4. Press Enter on an empty prompt - the command will execute automatically
\`\`\`

## Direct Commands (Alternative)

If the panel doesn't work, you can invoke these commands directly:

| Command | Description |
|---------|-------------|
${commandList}

---

*Generated by Claude CLI Advanced Starter Pack v${getVersion()} on ${date}*
`;
}

/**
 * Command template generators
 */
const COMMAND_TEMPLATES = {
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
`,};

/**
 * Generate starter agent file
 */
function generateStarterAgent(agentName) {
  return `---
description: ${agentName} agent - Add your description here
tools:
  - Read
  - Grep
  - Glob
  - Bash
model: sonnet
---

# ${agentName} Agent

## Purpose

Describe what this agent does and when to use it.

## Capabilities

- List the agent's primary capabilities
- What tasks it can handle
- What domains it specializes in

## Usage

Invoke this agent with the Task tool:

\`\`\`
Task: "${agentName}"
Prompt: "Your task description here"
\`\`\`

## Instructions

When this agent is invoked:

1. Understand the task context
2. Use available tools to gather information
3. Execute the required actions
4. Report results clearly
`;
}

/**
 * Generate starter skill file
 */
function generateStarterSkill(skillName) {
  return `---
description: ${skillName} skill - Add your description here
---

# ${skillName} Skill

## Overview

Describe what this skill provides and when to use it.

## Context

This skill has access to supporting documentation in the \`context/\` folder.

## Workflows

Step-by-step procedures are available in the \`workflows/\` folder.

## Usage

Invoke this skill by typing \`/${skillName}\` or referencing it with the Skill tool.

## Instructions

When this skill is invoked:

1. Load relevant context from the context folder
2. Follow applicable workflows
3. Apply domain expertise
4. Provide clear, actionable guidance
`;
}

/**
 * Generate starter hook file
 */
function generateStarterHook(hookName, eventType = 'PreToolUse') {
  return `/**
 * ${hookName} Hook
 *
 * Event: ${eventType}
 * Description: Add your description here
 */

export default async function ${hookName.replace(/-/g, '_')}(context) {
  const { tool, input, session } = context;

  // Example: Log all tool usage
  console.log(\`[${hookName}] Tool: \${tool}, Input: \${JSON.stringify(input).slice(0, 100)}\`);

  // Return decision
  return {
    continue: true,  // Set to false to block the action
    // message: 'Optional message to show user',
    // modifiedInput: input,  // Optional: modify the input
  };
}
`;
}

/**
 * Generate CCASP update check hook (fallback if template not found)
 */
function generateUpdateCheckHook() {
  return `/**
 * CCASP Update Check Hook
 *
 * Checks for npm updates when Claude Code starts.
 * Runs on first UserPromptSubmit per session, caches results for 1 hour.
 *
 * Event: UserPromptSubmit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'claude-cli-advanced-starter-pack';
const CACHE_DURATION = 60 * 60 * 1000;
const STATE_FILE = '.claude/config/ccasp-state.json';
const SESSION_MARKER = '.claude/config/.ccasp-session-checked';

function loadState() {
  const statePath = path.join(process.cwd(), STATE_FILE);
  if (fs.existsSync(statePath)) {
    try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
  }
  return { lastCheckTimestamp: 0, updateAvailable: false, projectImplCompleted: false };
}

function saveState(state) {
  const statePath = path.join(process.cwd(), STATE_FILE);
  const stateDir = path.dirname(statePath);
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function hasCheckedThisSession() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);
  if (fs.existsSync(markerPath)) {
    try {
      const timestamp = parseInt(fs.readFileSync(markerPath, 'utf8'), 10);
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) return true;
    } catch {}
  }
  return false;
}

function markSessionChecked() {
  const markerPath = path.join(process.cwd(), SESSION_MARKER);
  const markerDir = path.dirname(markerPath);
  if (!fs.existsSync(markerDir)) fs.mkdirSync(markerDir, { recursive: true });
  fs.writeFileSync(markerPath, Date.now().toString(), 'utf8');
}

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number), p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    if ((p1[i] || 0) > (p2[i] || 0)) return 1;
    if ((p1[i] || 0) < (p2[i] || 0)) return -1;
  }
  return 0;
}

module.exports = async function ccaspUpdateCheck(context) {
  if (hasCheckedThisSession()) return { continue: true };
  markSessionChecked();

  const state = loadState();
  const now = Date.now();

  if (state.lastCheckTimestamp && (now - state.lastCheckTimestamp) < CACHE_DURATION) {
    return { continue: true };
  }

  try {
    const current = execSync('npm list -g ' + PACKAGE_NAME + ' --json 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    const currentVersion = JSON.parse(current).dependencies?.[PACKAGE_NAME]?.version;

    const latest = execSync('npm view ' + PACKAGE_NAME + ' version', { encoding: 'utf8', timeout: 10000 }).trim();

    state.lastCheckTimestamp = now;
    state.currentVersion = currentVersion;
    state.latestVersion = latest;
    state.updateAvailable = compareVersions(latest, currentVersion) > 0;
    saveState(state);
  } catch {}

  return { continue: true };
};
`;
}

/**
 * Generate settings.json with CCASP update check hook and usage tracking
 */
function generateSettingsJson(projectName) {
  return JSON.stringify({
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "permissions": {
      "allow": [],
      "deny": []
    },
    "hooks": {
      "UserPromptSubmit": [
        {
          "matcher": "",
          "hooks": [
            {
              "type": "command",
              "command": "node .claude/hooks/ccasp-update-check.js"
            }
          ]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "Skill|Read",
          "hooks": [
            {
              "type": "command",
              "command": "node .claude/hooks/usage-tracking.js"
            }
          ]
        }
      ]
    }
  }, null, 2);
}

/**
 * Generate settings.local.json
 */
function generateSettingsLocalJson() {
  return JSON.stringify({
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "permissions": {
      "allow": [],
      "deny": []
    },
    "hooks": {}
  }, null, 2);
}

/**
 * Run dev mode - rapid template testing workflow
 * Loads existing tech-stack.json, processes templates, overwrites commands
 */
async function runDevMode(options = {}) {
  const cwd = process.cwd();
  const projectName = basename(cwd);
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const hooksDir = join(claudeDir, 'hooks');
  const configDir = join(claudeDir, 'config');
  const techStackPath = join(configDir, 'tech-stack.json');

  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.magenta.bold('  🔧 DEV MODE - Template Testing'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.cyan(`  Project: ${chalk.bold(projectName)}`));
  console.log(chalk.cyan(`  Location: ${cwd}`));
  console.log('');

  // Load existing tech-stack.json
  let techStack = {};
  if (existsSync(techStackPath)) {
    try {
      techStack = JSON.parse(readFileSync(techStackPath, 'utf8'));
      console.log(chalk.green('  ✓ Loaded existing tech-stack.json'));
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Could not parse tech-stack.json: ${err.message}`));
    }
  } else {
    console.log(chalk.yellow('  ⚠ No tech-stack.json found - templates will have unprocessed placeholders'));
  }

  // Ensure directories exist
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
    console.log(chalk.green('  ✓ Created .claude/commands/'));
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
    console.log(chalk.green('  ✓ Created .claude/hooks/'));
  }

  // Identify custom commands (no matching template) to preserve
  const templatesDir = join(__dirname, '..', '..', 'templates', 'commands');
  const hooksTemplatesDir = join(__dirname, '..', '..', 'templates', 'hooks');

  const templateCommandNames = existsSync(templatesDir)
    ? readdirSync(templatesDir).filter(f => f.endsWith('.template.md')).map(f => f.replace('.template.md', ''))
    : [];
  const templateHookNames = existsSync(hooksTemplatesDir)
    ? readdirSync(hooksTemplatesDir).filter(f => f.endsWith('.template.js')).map(f => f.replace('.template.js', ''))
    : [];

  // Find existing custom commands (those without matching templates)
  const existingCommands = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
    : [];
  const customCommands = existingCommands.filter(cmd =>
    !templateCommandNames.includes(cmd) &&
    cmd !== 'menu' &&
    cmd !== 'INDEX' &&
    cmd !== 'README'
  );

  if (customCommands.length > 0) {
    console.log(chalk.blue(`  📌 Preserving ${customCommands.length} custom command(s):`));
    for (const cmd of customCommands) {
      console.log(chalk.dim(`    • /${cmd}`));
    }
    console.log('');
  }

  console.log(chalk.bold('Processing and deploying templates...\n'));

  const spinner = ora('Processing templates...').start();
  const deployed = { commands: [], hooks: [], preserved: customCommands };
  const failed = [];

  // Get all command templates
  if (existsSync(templatesDir)) {
    const templateFiles = readdirSync(templatesDir).filter(f => f.endsWith('.template.md'));

    for (const templateFile of templateFiles) {
      const cmdName = templateFile.replace('.template.md', '');
      const templatePath = join(templatesDir, templateFile);
      const outputPath = join(commandsDir, `${cmdName}.md`);

      try {
        let content = readFileSync(templatePath, 'utf8');

        // Process template with tech-stack values
        const { content: processed, warnings } = replacePlaceholders(content, techStack, {
          preserveUnknown: false,
          warnOnMissing: false,
        });

        writeFileSync(outputPath, processed, 'utf8');
        deployed.commands.push(cmdName);
      } catch (err) {
        failed.push({ name: cmdName, type: 'command', error: err.message });
      }
    }
  }

  // Also process hook templates
  if (existsSync(hooksTemplatesDir)) {
    const hookFiles = readdirSync(hooksTemplatesDir).filter(f => f.endsWith('.template.js'));

    for (const hookFile of hookFiles) {
      const hookName = hookFile.replace('.template.js', '');
      const templatePath = join(hooksTemplatesDir, hookFile);
      const outputPath = join(hooksDir, `${hookName}.js`);

      try {
        let content = readFileSync(templatePath, 'utf8');

        // Process template with tech-stack values
        const { content: processed } = replacePlaceholders(content, techStack, {
          preserveUnknown: false,
          warnOnMissing: false,
        });

        writeFileSync(outputPath, processed, 'utf8');
        deployed.hooks.push(hookName);
      } catch (err) {
        failed.push({ name: hookName, type: 'hook', error: err.message });
      }
    }
  }

  // Generate menu command from scratch (uses COMMAND_TEMPLATES)
  const menuTemplate = COMMAND_TEMPLATES['menu'];
  if (menuTemplate) {
    const installedAgents = existsSync(join(claudeDir, 'agents'))
      ? readdirSync(join(claudeDir, 'agents')).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
      : [];
    const installedSkills = existsSync(join(claudeDir, 'skills'))
      ? readdirSync(join(claudeDir, 'skills')).filter(f => !f.startsWith('.'))
      : [];
    const installedHooks = existsSync(hooksDir)
      ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
      : [];

    const menuContent = generateMenuCommand(projectName, deployed.commands, installedAgents, installedSkills, installedHooks);
    writeFileSync(join(commandsDir, 'menu.md'), menuContent, 'utf8');
    deployed.commands.push('menu');
  }

  // Generate INDEX.md
  const indexContent = generateIndexFile(deployed.commands, projectName);
  writeFileSync(join(commandsDir, 'INDEX.md'), indexContent, 'utf8');

  // Generate README.md
  const readmeContent = generateReadmeFile(deployed.commands, projectName);
  writeFileSync(join(commandsDir, 'README.md'), readmeContent, 'utf8');

  spinner.stop();

  // Summary
  console.log('');
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green.bold('  ✓ DEV MODE: Templates Deployed'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.cyan(`  Commands: ${deployed.commands.length} deployed`));
  console.log(chalk.cyan(`  Hooks: ${deployed.hooks.length} deployed`));
  if (deployed.preserved && deployed.preserved.length > 0) {
    console.log(chalk.blue(`  Custom: ${deployed.preserved.length} preserved`));
  }
  if (failed.length > 0) {
    console.log(chalk.yellow(`  Failed: ${failed.length}`));
    for (const f of failed) {
      console.log(chalk.red(`    • ${f.type}/${f.name}: ${f.error}`));
    }
  }
  console.log('');
  console.log(chalk.dim('  tech-stack.json: Preserved'));
  console.log(chalk.dim('  settings.json: Preserved'));
  if (deployed.preserved && deployed.preserved.length > 0) {
    console.log(chalk.dim(`  Custom commands: ${deployed.preserved.join(', ')}`));
  }
  console.log('');
  console.log(chalk.yellow.bold('  ⚠ Restart Claude Code CLI to use new commands'));
  console.log('');

  return { deployed, failed };
}

/**
 * Run the init wizard
 */
export async function runInit(options = {}) {
  // DEV MODE: Fast path for template testing
  if (options.dev) {
    showHeader('Claude CLI Advanced Starter Pack - DEV MODE');
    return runDevMode(options);
  }

  showHeader('Claude CLI Advanced Starter Pack - Project Setup');

  const cwd = process.cwd();
  const projectName = basename(cwd);
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const skillsDir = join(claudeDir, 'skills');
  const agentsDir = join(claudeDir, 'agents');
  const hooksDir = join(claudeDir, 'hooks');
  const docsDir = join(claudeDir, 'docs');

  console.log(chalk.cyan(`  Project: ${chalk.bold(projectName)}`));
  console.log(chalk.cyan(`  Location: ${cwd}`));
  console.log('');

  // Check for existing .claude folder
  const hasExistingClaudeDir = existsSync(claudeDir);

  if (hasExistingClaudeDir) {
    // Count existing content
    const existingCommands = existsSync(commandsDir) ? readdirSync(commandsDir).filter(f => f.endsWith('.md')).length : 0;
    const existingAgents = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length : 0;
    const existingSkills = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => !f.startsWith('.')).length : 0;
    const existingHooks = existsSync(hooksDir) ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).length : 0;
    const hasSettings = existsSync(join(claudeDir, 'settings.json'));

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('  ✓ Existing .claude/ folder detected'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.dim('  Current contents:'));
    if (existingCommands > 0) console.log(chalk.dim(`    • ${existingCommands} command(s) in commands/`));
    if (existingAgents > 0) console.log(chalk.dim(`    • ${existingAgents} agent(s) in agents/`));
    if (existingSkills > 0) console.log(chalk.dim(`    • ${existingSkills} skill(s) in skills/`));
    if (existingHooks > 0) console.log(chalk.dim(`    • ${existingHooks} hook(s) in hooks/`));
    if (hasSettings) console.log(chalk.dim(`    • settings.json configured`));
    console.log('');
    console.log(chalk.yellow.bold('  ⚠ Your existing files will NOT be overwritten'));
    console.log(chalk.dim('    New commands will be added alongside your existing setup.'));
    console.log(chalk.dim('    Use --force flag to overwrite specific commands if needed.'));
    console.log('');

    // Skip prompt if called non-interactively (e.g., from wizard)
    if (!options.skipPrompts) {
      const { confirmProceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmProceed',
          message: 'Continue with installation? (existing files are safe)',
          default: true,
        },
      ]);

      if (!confirmProceed) {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }
      console.log('');
    }
  }

  // Step 1: Check and create folder structure
  console.log(chalk.bold('Step 1: Setting up .claude/ folder structure\n'));
  console.log(chalk.dim('  (Only creates missing folders - existing content preserved)\n'));

  const foldersToCreate = [
    { path: claudeDir, name: '.claude' },
    { path: commandsDir, name: '.claude/commands' },
    { path: skillsDir, name: '.claude/skills' },
    { path: agentsDir, name: '.claude/agents' },
    { path: hooksDir, name: '.claude/hooks' },
    { path: docsDir, name: '.claude/docs' },
  ];

  for (const folder of foldersToCreate) {
    if (!existsSync(folder.path)) {
      mkdirSync(folder.path, { recursive: true });
      console.log(chalk.green(`  ✓ Created ${folder.name}/`));
    } else {
      console.log(chalk.dim(`  ○ ${folder.name}/ exists`));
    }
  }

  console.log('');

  // Step 2: Create settings files if they don't exist
  console.log(chalk.bold('Step 2: Configuring settings\n'));
  console.log(chalk.dim('  (Skips existing files - your settings are preserved)\n'));

  const settingsPath = join(claudeDir, 'settings.json');
  const settingsLocalPath = join(claudeDir, 'settings.local.json');

  if (!existsSync(settingsPath)) {
    writeFileSync(settingsPath, generateSettingsJson(projectName), 'utf8');
    console.log(chalk.green('  ✓ Created settings.json'));
  } else {
    // Merge update check hook into existing settings.json
    try {
      const existingSettings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      let settingsUpdated = false;

      // Ensure hooks object exists
      if (!existingSettings.hooks) {
        existingSettings.hooks = {};
      }

      // Add UserPromptSubmit hook for update checking if not present
      if (!existingSettings.hooks.UserPromptSubmit) {
        existingSettings.hooks.UserPromptSubmit = [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/ccasp-update-check.js',
              },
            ],
          },
        ];
        settingsUpdated = true;
      } else {
        // Check if update check hook already exists
        const hasUpdateHook = existingSettings.hooks.UserPromptSubmit.some(
          (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
        );
        if (!hasUpdateHook) {
          existingSettings.hooks.UserPromptSubmit.push({
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node .claude/hooks/ccasp-update-check.js',
              },
            ],
          });
          settingsUpdated = true;
        }
      }

      if (settingsUpdated) {
        writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf8');
        console.log(chalk.green('  ✓ Updated settings.json (added update check hook)'));
      } else {
        console.log(chalk.blue('  ○ settings.json exists (preserved)'));
      }
    } catch (error) {
      console.log(chalk.blue('  ○ settings.json exists (preserved)'));
    }
  }

  if (!existsSync(settingsLocalPath)) {
    writeFileSync(settingsLocalPath, generateSettingsLocalJson(), 'utf8');
    console.log(chalk.green('  ✓ Created settings.local.json'));
  } else {
    console.log(chalk.blue('  ○ settings.local.json exists (preserved)'));
  }

  console.log('');

  // Step 3: Create starter files for each folder (only if folder is empty)
  console.log(chalk.bold('Step 3: Creating starter files\n'));
  console.log(chalk.dim('  (Only creates examples in empty folders)\n'));

  // Check if agents folder has any files before adding example
  const agentFiles = existsSync(agentsDir) ? readdirSync(agentsDir).filter(f => f.endsWith('.md')) : [];
  if (agentFiles.length === 0) {
    const starterAgentPath = join(agentsDir, 'example-agent.md');
    writeFileSync(starterAgentPath, generateStarterAgent('example-agent'), 'utf8');
    console.log(chalk.green('  ✓ Created agents/example-agent.md (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ agents/ has ${agentFiles.length} existing agent(s) (preserved)`));
  }

  // Check if skills folder has any skills before adding example
  const skillDirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter(f => !f.startsWith('.')) : [];
  if (skillDirs.length === 0) {
    const starterSkillDir = join(skillsDir, 'example-skill');
    mkdirSync(starterSkillDir, { recursive: true });
    mkdirSync(join(starterSkillDir, 'context'), { recursive: true });
    mkdirSync(join(starterSkillDir, 'workflows'), { recursive: true });
    writeFileSync(join(starterSkillDir, 'skill.md'), generateStarterSkill('example-skill'), 'utf8');
    writeFileSync(join(starterSkillDir, 'context', 'README.md'), '# Context\n\nAdd supporting documentation here.\n', 'utf8');
    writeFileSync(join(starterSkillDir, 'workflows', 'README.md'), '# Workflows\n\nAdd step-by-step procedures here.\n', 'utf8');
    console.log(chalk.green('  ✓ Created skills/example-skill/ (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ skills/ has ${skillDirs.length} existing skill(s) (preserved)`));
  }

  // Check if hooks folder has any files before adding example
  const hookFiles = existsSync(hooksDir) ? readdirSync(hooksDir).filter(f => f.endsWith('.js')) : [];
  if (hookFiles.length === 0) {
    const starterHookPath = join(hooksDir, 'example-hook.js');
    writeFileSync(starterHookPath, generateStarterHook('example-hook', 'PreToolUse'), 'utf8');
    console.log(chalk.green('  ✓ Created hooks/example-hook.js (starter template)'));
  } else {
    console.log(chalk.blue(`  ○ hooks/ has ${hookFiles.length} existing hook(s) (preserved)`));
  }

  // Always deploy the CCASP update check hook (essential for update notifications)
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');
  if (!existsSync(updateCheckHookPath)) {
    // Try to read from template
    const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      console.log(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    } else {
      // Fallback: create minimal version
      writeFileSync(updateCheckHookPath, generateUpdateCheckHook(), 'utf8');
      console.log(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    }
  } else {
    console.log(chalk.blue('  ○ hooks/ccasp-update-check.js exists (preserved)'));
  }

  // Deploy the usage tracking hook (tracks command/skill/agent usage for smart merge)
  const usageTrackingHookPath = join(hooksDir, 'usage-tracking.js');
  if (!existsSync(usageTrackingHookPath)) {
    const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'usage-tracking.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(usageTrackingHookPath, hookContent, 'utf8');
      console.log(chalk.green('  ✓ Created hooks/usage-tracking.js (smart merge tracking)'));
    }
  } else {
    console.log(chalk.blue('  ○ hooks/usage-tracking.js exists (preserved)'));
  }

  console.log('');

  // Step 4: Select optional features
  let selectedFeatures;

  if (options.skipPrompts && options.features) {
    // Use features passed from wizard
    selectedFeatures = options.features;
    console.log(chalk.bold('Step 4: Using pre-selected features\n'));
    if (selectedFeatures.length > 0) {
      console.log(chalk.dim(`  Features: ${selectedFeatures.join(', ')}`));
    } else {
      console.log(chalk.dim('  Minimal mode - essential commands only'));
    }
    console.log('');
  } else {
    console.log(chalk.bold('Step 4: Select optional features\n'));
    console.log(chalk.dim('  Each feature adds commands and hooks to your project.'));
    console.log(chalk.dim('  Features marked with (*) require additional configuration via /menu after installation.\n'));

    // Display feature descriptions in a nice format
    for (const feature of OPTIONAL_FEATURES) {
      const marker = feature.default ? chalk.green('●') : chalk.dim('○');
      const postConfig = feature.requiresPostConfig ? chalk.yellow(' (*)') : '';
      console.log(`  ${marker} ${chalk.bold(feature.label)}${postConfig}`);
      console.log(chalk.dim(`     ${feature.description}`));
      if (feature.commands.length > 0) {
        console.log(chalk.dim(`     Adds: ${feature.commands.map(c => '/' + c).join(', ')}`));
      }
      console.log('');
    }

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFeatures',
        message: 'Select features to enable:',
        choices: OPTIONAL_FEATURES.map((feature) => ({
          name: `${feature.label}${feature.requiresPostConfig ? ' (*)' : ''} - ${feature.commands.length} commands, ${feature.hooks.length} hooks`,
          value: feature.name,
          checked: feature.default,
        })),
        pageSize: 10,
      },
    ]);
    selectedFeatures = result.selectedFeatures;
  }

  // Store selected features for later use
  const enabledFeatures = OPTIONAL_FEATURES.filter((f) => selectedFeatures.includes(f.name));
  const featuresRequiringConfig = enabledFeatures.filter((f) => f.requiresPostConfig);

  // Collect feature-specific commands, hooks, and skills to deploy
  const featureCommands = [];
  const featureHooks = [];
  const featureSkills = [];
  for (const feature of enabledFeatures) {
    featureCommands.push(...feature.commands);
    featureHooks.push(...(feature.hooks || []));
    featureSkills.push(...(feature.skills || []));
  }

  if (featureCommands.length > 0) {
    console.log('');
    console.log(chalk.green(`  ✓ Selected features will add ${featureCommands.length} command(s):`));
    console.log(chalk.dim(`    ${featureCommands.map(c => '/' + c).join(', ')}`));
  }

  if (featureHooks.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureHooks.length} hook(s):`));
    console.log(chalk.dim(`    ${featureHooks.join(', ')}`));
  }

  if (featureSkills.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureSkills.length} skill(s):`));
    console.log(chalk.dim(`    ${featureSkills.join(', ')}`));
  }

  if (featuresRequiringConfig.length > 0) {
    console.log('');
    console.log(chalk.yellow('  ℹ The following features require configuration after installation:'));
    for (const feature of featuresRequiringConfig) {
      console.log(chalk.yellow(`    • ${feature.label}`));
    }
    console.log(chalk.dim('    Run /menu → Project Settings after installation to complete setup.'));
  }

  // Check for optional npm package installs from selected features
  const featuresWithNpm = enabledFeatures.filter((f) => f.npmPackage);
  if (featuresWithNpm.length > 0 && !options.skipPrompts) {
    console.log('');
    console.log(chalk.bold('  Optional Package Installation\n'));

    for (const feature of featuresWithNpm) {
      const { installPackage } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installPackage',
          message: feature.npmInstallPrompt || `Install ${feature.npmPackage} globally?`,
          default: true,
        },
      ]);

      if (installPackage) {
        const npmSpinner = ora(`Installing ${feature.npmPackage}...`).start();
        try {
          const { execSync } = await import('child_process');
          execSync(`npm install -g ${feature.npmPackage}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000, // 2 minutes timeout
          });
          npmSpinner.succeed(`Installed ${feature.npmPackage} globally`);
        } catch (error) {
          npmSpinner.fail(`Failed to install ${feature.npmPackage}`);
          console.log(chalk.dim(`    Run manually: npm install -g ${feature.npmPackage}`));
        }
      } else {
        console.log(chalk.dim(`  Skipped. Install later with: npm install -g ${feature.npmPackage}`));
      }
    }
  } else if (featuresWithNpm.length > 0) {
    // In skipPrompts mode, just inform about optional packages
    console.log(chalk.dim(`  ℹ Optional packages available: ${featuresWithNpm.map(f => f.npmPackage).join(', ')}`));
    console.log(chalk.dim('    Install manually if needed.'));
  }

  console.log('');

  // Step 5: Select slash commands to install
  console.log(chalk.bold('Step 5: Select slash commands to install\n'));

  // Check for existing commands first
  const existingCmdFiles = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md')
    : [];
  const existingCmdNames = existingCmdFiles.map(f => f.replace('.md', ''));

  if (existingCmdNames.length > 0 && !options.skipPrompts) {
    console.log(chalk.blue(`  ℹ Found ${existingCmdNames.length} existing command(s) in your project:`));
    console.log(chalk.dim(`    ${existingCmdNames.map(c => '/' + c).join(', ')}`));
    console.log(chalk.dim('    These will be preserved unless you choose to overwrite.\n'));
  }

  let selectedCommands;

  if (options.skipPrompts) {
    // Use default selections when called non-interactively
    selectedCommands = AVAILABLE_COMMANDS.filter(c => c.selected).map(c => c.name);
    console.log(chalk.dim(`  Auto-selecting ${selectedCommands.length} default command(s)`));
  } else {
    const categories = [...new Set(AVAILABLE_COMMANDS.map((c) => c.category))];

    for (const category of categories) {
      console.log(chalk.cyan(`  ${category}:`));
      const cmds = AVAILABLE_COMMANDS.filter((c) => c.category === category);
      for (const cmd of cmds) {
        const isExisting = existingCmdNames.includes(cmd.name);
        const marker = cmd.selected ? chalk.green('●') : chalk.dim('○');
        const required = cmd.required ? chalk.yellow(' (required)') : '';
        const existing = isExisting ? chalk.blue(' [exists]') : '';
        console.log(`    ${marker} /${cmd.name}${required}${existing} - ${chalk.dim(cmd.description)}`);
      }
      console.log('');
    }

    // Ask which commands to install
    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCommands',
        message: 'Select commands to install (existing commands marked with [exists]):',
        choices: AVAILABLE_COMMANDS.map((cmd) => {
          const isExisting = existingCmdNames.includes(cmd.name);
          return {
            name: `/${cmd.name}${isExisting ? ' [exists]' : ''} - ${cmd.description}`,
            value: cmd.name,
            checked: cmd.selected,
            disabled: cmd.required ? 'Required' : false,
          };
        }),
        pageSize: 15,
      },
    ]);
    selectedCommands = result.selectedCommands;
  }

  // Always include required commands AND feature-specific commands
  const requiredCommands = AVAILABLE_COMMANDS.filter(c => c.required).map(c => c.name);
  const finalCommands = [...new Set([...requiredCommands, ...selectedCommands, ...featureCommands])];

  if (finalCommands.length === 0) {
    showWarning('No commands selected. Nothing to install.');
    return;
  }

  // Show what feature commands were auto-added
  const autoAddedCommands = featureCommands.filter(c => !selectedCommands.includes(c) && !requiredCommands.includes(c));
  if (autoAddedCommands.length > 0) {
    console.log(chalk.cyan(`  ℹ Auto-including ${autoAddedCommands.length} feature command(s): ${autoAddedCommands.map(c => '/' + c).join(', ')}`));
  }

  console.log('');

  // Step 6: Check for existing commands that would be overwritten
  const commandsToOverwrite = finalCommands.filter(cmd => existingCmdNames.includes(cmd));

  // Track commands that need smart merge handling
  const smartMergeDecisions = {};

  let overwrite = options.force || false;
  if (commandsToOverwrite.length > 0 && !overwrite) {
    // In skipPrompts mode, preserve all existing commands (no overwrite)
    if (options.skipPrompts) {
      for (const cmd of commandsToOverwrite) {
        smartMergeDecisions[cmd] = 'skip';
      }
      // Filter out skipped commands
      const filtered = finalCommands.filter((c) => !commandsToOverwrite.includes(c) || requiredCommands.includes(c));
      finalCommands.length = 0;
      finalCommands.push(...filtered);
      console.log(chalk.dim(`  Preserving ${commandsToOverwrite.length} existing command(s), installing ${finalCommands.length} new`));
    } else {
    // Check for customized assets that have been used
    const assetsNeedingMerge = getAssetsNeedingMerge(process.cwd());
    const customizedCommands = commandsToOverwrite.filter(cmd =>
      assetsNeedingMerge.commands?.some(a => a.name === cmd)
    );

    // Show smart merge prompt for customized commands
    if (customizedCommands.length > 0) {
      console.log(chalk.cyan.bold('\n  🔀 Smart Merge Available'));
      console.log(chalk.dim('  The following commands have been customized and used:\n'));

      for (const cmd of customizedCommands) {
        const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
        console.log(chalk.cyan(`    • /${cmd}`));
        console.log(chalk.dim(`      Used ${assetInfo.usageData.useCount} time(s), last: ${new Date(assetInfo.usageData.lastUsed).toLocaleDateString()}`));
        console.log(chalk.dim(`      Change: ${assetInfo.comparison.significance.level} significance - ${assetInfo.comparison.summary}`));
      }
      console.log('');

      const { smartMergeAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'smartMergeAction',
          message: 'How would you like to handle your customized commands?',
          choices: [
            { name: '🔍 Explore each one - Let Claude explain the changes', value: 'explore' },
            { name: '📋 Skip all customized - Keep your versions', value: 'skip-customized' },
            { name: '🔄 Replace all - Use new versions (lose customizations)', value: 'replace-all' },
            { name: '❌ Cancel installation', value: 'cancel' },
          ],
        },
      ]);

      if (smartMergeAction === 'cancel') {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }

      if (smartMergeAction === 'explore') {
        // Individual exploration for each customized command
        console.log(chalk.cyan('\n  Exploring customized commands...\n'));

        for (const cmd of customizedCommands) {
          const assetInfo = assetsNeedingMerge.commands.find(a => a.name === cmd);
          const local = getLocalAsset('commands', cmd, process.cwd());
          const template = getTemplateAsset('commands', cmd);

          // Show merge explanation
          console.log(chalk.bold(`\n  ┌${'─'.repeat(60)}┐`));
          console.log(chalk.bold(`  │ /${cmd.padEnd(58)} │`));
          console.log(chalk.bold(`  └${'─'.repeat(60)}┘`));

          const explanation = generateMergeExplanation(
            'commands',
            cmd,
            assetInfo.comparison,
            local?.content,
            template?.content
          );

          // Display condensed explanation
          console.log(chalk.dim('\n  ' + explanation.split('\n').slice(0, 15).join('\n  ')));

          const { decision } = await inquirer.prompt([
            {
              type: 'list',
              name: 'decision',
              message: `What would you like to do with /${cmd}?`,
              choices: [
                { name: 'Skip - Keep your customized version', value: 'skip' },
                { name: 'Backup & Replace - Save yours, use new version', value: 'backup' },
                { name: 'Replace - Use new version (no backup)', value: 'replace' },
                { name: 'Show full diff', value: 'diff' },
              ],
            },
          ]);

          if (decision === 'diff') {
            // Show full diff
            console.log(chalk.dim('\n--- Your Version ---'));
            console.log(local?.content?.slice(0, 500) + (local?.content?.length > 500 ? '\n...(truncated)' : ''));
            console.log(chalk.dim('\n--- Update Version ---'));
            console.log(template?.content?.slice(0, 500) + (template?.content?.length > 500 ? '\n...(truncated)' : ''));

            // Re-prompt after showing diff
            const { finalDecision } = await inquirer.prompt([
              {
                type: 'list',
                name: 'finalDecision',
                message: `Final decision for /${cmd}?`,
                choices: [
                  { name: 'Skip - Keep your version', value: 'skip' },
                  { name: 'Backup & Replace', value: 'backup' },
                  { name: 'Replace without backup', value: 'replace' },
                ],
              },
            ]);
            smartMergeDecisions[cmd] = finalDecision;
          } else {
            smartMergeDecisions[cmd] = decision;
          }
        }
      } else if (smartMergeAction === 'skip-customized') {
        // Mark all customized commands as skip
        for (const cmd of customizedCommands) {
          smartMergeDecisions[cmd] = 'skip';
        }
        console.log(chalk.green(`\n  ✓ Will preserve ${customizedCommands.length} customized command(s)`));
      } else if (smartMergeAction === 'replace-all') {
        // Mark all customized commands as replace with backup
        for (const cmd of customizedCommands) {
          smartMergeDecisions[cmd] = 'backup';
        }
        console.log(chalk.yellow(`\n  ⚠ Will backup and replace ${customizedCommands.length} customized command(s)`));
      }

      // Remove customized commands from the standard overwrite flow
      // (they're handled by smart merge decisions)
      const nonCustomizedToOverwrite = commandsToOverwrite.filter(c => !customizedCommands.includes(c));

      if (nonCustomizedToOverwrite.length > 0) {
        console.log(chalk.yellow.bold('\n  ⚠ The following non-customized commands also exist:'));
        for (const cmd of nonCustomizedToOverwrite) {
          console.log(chalk.yellow(`    • /${cmd}`));
        }
      }
    }

    // Standard overwrite prompt for non-customized commands
    const remainingToOverwrite = commandsToOverwrite.filter(c => !smartMergeDecisions[c]);

    if (remainingToOverwrite.length > 0) {
      if (!customizedCommands || customizedCommands.length === 0) {
        console.log(chalk.yellow.bold('  ⚠ The following commands already exist:'));
        for (const cmd of remainingToOverwrite) {
          console.log(chalk.yellow(`    • /${cmd}`));
        }
      }
      console.log('');

      const { overwriteChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'overwriteChoice',
          message: 'How would you like to handle these existing commands?',
          choices: [
            { name: 'Skip existing - only install new commands (recommended)', value: 'skip' },
            { name: 'Overwrite with backup - save existing to .claude/backups/ first', value: 'backup' },
            { name: 'Overwrite all - replace existing (no backup)', value: 'overwrite' },
            { name: 'Cancel installation', value: 'cancel' },
          ],
        },
      ]);

      if (overwriteChoice === 'cancel') {
        console.log(chalk.dim('\nCancelled. No changes made.'));
        return;
      }

      overwrite = overwriteChoice === 'overwrite' || overwriteChoice === 'backup';

      // Apply decision to remaining commands
      for (const cmd of remainingToOverwrite) {
        smartMergeDecisions[cmd] = overwriteChoice === 'skip' ? 'skip' : (overwriteChoice === 'backup' ? 'backup' : 'replace');
      }

      if (!overwrite) {
        // Filter out skipped commands
        const skippedCommands = Object.entries(smartMergeDecisions)
          .filter(([, decision]) => decision === 'skip')
          .map(([cmd]) => cmd);
        const filtered = finalCommands.filter((c) => !skippedCommands.includes(c) || requiredCommands.includes(c));
        finalCommands.length = 0;
        finalCommands.push(...filtered);
        console.log(chalk.green(`\n  ✓ Will install ${finalCommands.length} new command(s), preserving ${skippedCommands.length} existing`));
      } else if (overwriteChoice === 'backup') {
        console.log(chalk.cyan(`\n  ✓ Will backup and overwrite ${remainingToOverwrite.length} existing command(s)`));
      } else {
        console.log(chalk.yellow(`\n  ⚠ Will overwrite ${remainingToOverwrite.length} existing command(s)`));
      }
    } else if (Object.keys(smartMergeDecisions).length > 0) {
      // All commands handled by smart merge
      const skippedCommands = Object.entries(smartMergeDecisions)
        .filter(([, decision]) => decision === 'skip')
        .map(([cmd]) => cmd);

      if (skippedCommands.length > 0) {
        const filtered = finalCommands.filter((c) => !skippedCommands.includes(c) || requiredCommands.includes(c));
        finalCommands.length = 0;
        finalCommands.push(...filtered);
      }
    }
    } // end else (!options.skipPrompts)
  }

  // Track if we should create backups (set outside the if block for use later)
  // Now also considers smart merge decisions
  const createBackups = options.backup || (typeof overwrite !== 'undefined' && commandsToOverwrite.length > 0 && !options.force);
  let backedUpFiles = [];

  // Helper to check if a command should be backed up based on smart merge decisions
  const shouldBackupCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'backup';
    }
    return createBackups;
  };

  // Helper to check if a command should be skipped based on smart merge decisions
  const shouldSkipCommand = (cmdName) => {
    if (smartMergeDecisions[cmdName]) {
      return smartMergeDecisions[cmdName] === 'skip';
    }
    return false;
  };

  // Step 7: Install commands
  console.log(chalk.bold('Step 6: Installing slash commands\n'));

  const spinner = ora('Installing commands...').start();
  const installed = [];
  const failed = [];

  // Get installed agents, skills, hooks for menu
  const installedAgents = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
    : [];
  const installedSkills = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter(f => !f.startsWith('.'))
    : [];
  const installedHooks = existsSync(hooksDir)
    ? readdirSync(hooksDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
    : [];

  for (const cmdName of finalCommands) {
    try {
      // Skip commands that were marked to skip in smart merge
      if (shouldSkipCommand(cmdName)) {
        continue;
      }

      const cmdPath = join(commandsDir, `${cmdName}.md`);

      let content;
      if (cmdName === 'menu') {
        // Generate dynamic menu command
        content = generateMenuCommand(projectName, finalCommands, installedAgents, installedSkills, installedHooks);
      } else {
        const template = COMMAND_TEMPLATES[cmdName];
        if (template) {
          content = template();
        } else {
          // Try to load from templates/commands/ folder
          const templatePath = join(__dirname, '..', '..', 'templates', 'commands', `${cmdName}.template.md`);
          if (existsSync(templatePath)) {
            content = readFileSync(templatePath, 'utf8');
          } else {
            failed.push({ name: cmdName, error: 'No template found' });
            continue;
          }
        }
      }

      // Create backup if overwriting existing file (respects smart merge decisions)
      if (existsSync(cmdPath) && shouldBackupCommand(cmdName)) {
        const backupPath = createBackup(cmdPath);
        if (backupPath) {
          backedUpFiles.push({ original: cmdPath, backup: backupPath });
        }
      }

      writeFileSync(cmdPath, content, 'utf8');
      installed.push(cmdName);
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

  // Show backup summary if any files were backed up
  if (backedUpFiles.length > 0) {
    console.log(chalk.cyan(`\n  📁 Backed up ${backedUpFiles.length} file(s) to .claude/backups/`));
  }

  // Step 6b: Deploy feature-specific hooks
  const deployedHooks = [];
  const failedHooks = [];

  if (featureHooks.length > 0) {
    console.log(chalk.bold('\nStep 6b: Deploying feature hooks\n'));

    for (const hookName of featureHooks) {
      try {
        const hookPath = join(hooksDir, `${hookName}.js`);
        const hookExists = existsSync(hookPath);

        // Respect overwrite setting for hooks (like commands)
        if (hookExists && !overwrite) {
          console.log(chalk.blue(`  ○ hooks/${hookName}.js exists (preserved)`));
          continue;
        }

        // Try to load from templates/hooks/ folder
        const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', `${hookName}.template.js`);
        if (existsSync(templatePath)) {
          // Create backup if overwriting existing hook
          if (hookExists && overwrite) {
            const backupPath = createBackup(hookPath);
            if (backupPath) {
              backedUpFiles.push({ original: hookPath, backup: backupPath });
            }
          }
          const hookContent = readFileSync(templatePath, 'utf8');
          writeFileSync(hookPath, hookContent, 'utf8');
          deployedHooks.push(hookName);
          const action = hookExists ? 'Updated' : 'Created';
          console.log(chalk.green(`  ✓ ${action} hooks/${hookName}.js`));
        } else {
          failedHooks.push({ name: hookName, error: 'No template found' });
          console.log(chalk.yellow(`  ⚠ Skipped hooks/${hookName}.js (no template)`));
        }
      } catch (error) {
        failedHooks.push({ name: hookName, error: error.message });
        console.log(chalk.red(`  ✗ Failed: hooks/${hookName}.js - ${error.message}`));
      }
    }

    if (deployedHooks.length > 0) {
      console.log(chalk.green(`\n  ✓ Deployed ${deployedHooks.length} feature hook(s)`));
    }
  }

  // Step 6c: Deploy feature skills
  const deployedSkills = [];
  const failedSkills = [];

  if (featureSkills.length > 0) {
    console.log(chalk.bold('\nStep 6c: Deploying feature skills\n'));

    for (const skillName of featureSkills) {
      try {
        const skillPath = join(skillsDir, skillName);
        const skillExists = existsSync(skillPath);

        // Respect overwrite setting for skills (like commands)
        if (skillExists && !overwrite) {
          console.log(chalk.blue(`  ○ skills/${skillName}/ exists (preserved)`));
          continue;
        }

        // Try to load from templates/skills/ folder
        const templatePath = join(__dirname, '..', '..', 'templates', 'skills', skillName);
        if (existsSync(templatePath)) {
          // Create backup if overwriting existing skill
          if (skillExists && overwrite) {
            const backupPath = createBackup(skillPath);
            if (backupPath) {
              backedUpFiles.push({ original: skillPath, backup: backupPath });
            }
          }
          // Create skill directory and copy recursively
          mkdirSync(skillPath, { recursive: true });
          const { cpSync } = await import('fs');
          cpSync(templatePath, skillPath, { recursive: true });
          deployedSkills.push(skillName);
          const action = skillExists ? 'Updated' : 'Created';
          console.log(chalk.green(`  ✓ ${action} skills/${skillName}/`));
        } else {
          failedSkills.push({ name: skillName, error: 'No template found' });
          console.log(chalk.yellow(`  ⚠ Skipped skills/${skillName}/ (no template)`));
        }
      } catch (error) {
        failedSkills.push({ name: skillName, error: error.message });
        console.log(chalk.red(`  ✗ Failed: skills/${skillName}/ - ${error.message}`));
      }
    }

    if (deployedSkills.length > 0) {
      console.log(chalk.green(`\n  ✓ Deployed ${deployedSkills.length} feature skill(s)`));
    }
  }

  // Step 7: Generate INDEX.md
  const indexPath = join(commandsDir, 'INDEX.md');
  const indexContent = generateIndexFile(installed, projectName);
  writeFileSync(indexPath, indexContent, 'utf8');

  // Step 8: Generate README.md
  const readmePath = join(commandsDir, 'README.md');
  const readmeContent = generateReadmeFile(installed, projectName);
  writeFileSync(readmePath, readmeContent, 'utf8');

  // Summary
  console.log('');

  // Count what was preserved
  const preservedCommands = existingCmdNames.filter(c => !installed.includes(c) || !overwrite);
  const newCommands = installed.filter(c => !existingCmdNames.includes(c));
  const updatedCommands = installed.filter(c => existingCmdNames.includes(c) && overwrite);

  if (installed.length > 0) {
    const summaryLines = [
      '',
      `Project: ${projectName}`,
      '',
    ];

    // Show what happened
    if (hasExistingClaudeDir) {
      summaryLines.push('Integration Summary:');
      if (newCommands.length > 0) {
        summaryLines.push(`  ✓ ${newCommands.length} new command(s) added`);
      }
      if (updatedCommands.length > 0) {
        summaryLines.push(`  ↻ ${updatedCommands.length} command(s) updated`);
      }
      if (preservedCommands.length > 0) {
        summaryLines.push(`  ○ ${preservedCommands.length} existing command(s) preserved`);
      }
      summaryLines.push('');
    }

    summaryLines.push('Folder Structure:');
    summaryLines.push('  .claude/');
    summaryLines.push('  ├── commands/     (slash commands)');
    summaryLines.push('  ├── agents/       (custom agents)');
    summaryLines.push('  ├── skills/       (skill packages)');
    summaryLines.push('  ├── hooks/        (enforcement hooks)');
    summaryLines.push('  ├── docs/         (documentation)');
    summaryLines.push('  ├── settings.json');
    summaryLines.push('  └── settings.local.json');
    summaryLines.push('');
    summaryLines.push(`Commands Available: ${installed.length + preservedCommands.length}`);
    summaryLines.push(...installed.slice(0, 6).map((c) => `  /${c}${newCommands.includes(c) ? ' (new)' : ''}`));
    if (installed.length > 6) {
      summaryLines.push(`  ... and ${installed.length - 6} more`);
    }

    showSuccess('Claude CLI Advanced Starter Pack Deployed!', summaryLines);
  }

  if (failed.length > 0) {
    showError('Some commands failed to install:');
    for (const f of failed) {
      console.log(chalk.red(`  /${f.name}: ${f.error}`));
    }
  }

  // Generate tech-stack.json with enabled features
  const techStackPath = join(claudeDir, 'config', 'tech-stack.json');
  const configDir = join(claudeDir, 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Build tech-stack.json with enabled features
  const techStack = {
    version: '2.0.0',
    project: {
      name: projectName,
      description: '',
      rootPath: '.',
    },
    // Enable features based on user selection
    tokenManagement: {
      enabled: selectedFeatures.includes('tokenManagement'),
      dailyBudget: 200000,
      thresholds: { compact: 0.75, archive: 0.85, respawn: 0.90 },
    },
    happyMode: {
      enabled: selectedFeatures.includes('happyMode'),
      dashboardUrl: null,
      checkpointInterval: 10,
      verbosity: 'condensed',
    },
    agents: {
      enabled: true,
      l1: { model: 'sonnet', tools: ['Task', 'Read', 'Grep', 'Glob', 'WebSearch'], maxTokens: 16000 },
      l2: { model: 'sonnet', tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'], maxTokens: 8000 },
      l3: { model: 'haiku', tools: ['Read', 'Grep'], maxTokens: 500 },
      maxConcurrent: 4,
    },
    phasedDevelopment: {
      enabled: selectedFeatures.includes('phasedDevelopment'),
      defaultScale: 'M',
      successTarget: 0.95,
    },
    hooks: {
      enabled: true,
      priorities: { lifecycle: 100, tools: 1000, automation: 2000 },
      errorBehavior: 'approve',
    },
    devEnvironment: {
      tunnel: {
        service: 'none', // No default - configured via /menu
        url: null,
        subdomain: null,
      },
    },
    deployment: {
      frontend: { platform: 'none' },
      backend: { platform: 'none' },
    },
    versionControl: {
      provider: 'github',
      projectBoard: { type: 'none' },
    },
    // Track which features need post-install configuration
    _pendingConfiguration: featuresRequiringConfig.map((f) => f.name),
    // Track what was deployed for verification
    _deployment: {
      commands: installed,
      featureCommands: featureCommands.filter(c => installed.includes(c)),
      hooks: deployedHooks,
      featureHooks: featureHooks,
      skills: deployedSkills,
      featureSkills: featureSkills,
      enabledFeatures: selectedFeatures,
      timestamp: new Date().toISOString(),
    },
  };

  if (!existsSync(techStackPath)) {
    writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
    console.log(chalk.green('  ✓ Created config/tech-stack.json'));
  } else {
    console.log(chalk.blue('  ○ config/tech-stack.json exists (preserved)'));
  }

  // Update ccasp-state.json with current version (fixes version display in /menu)
  const ccaspStatePath = join(configDir, 'ccasp-state.json');
  const currentVersion = getVersion();
  let ccaspState = { currentVersion, lastCheckTimestamp: 0, updateAvailable: false };

  if (existsSync(ccaspStatePath)) {
    try {
      ccaspState = JSON.parse(readFileSync(ccaspStatePath, 'utf8'));
    } catch {
      // Use default state if parse fails
    }
  }

  // Always update the current version to match installed CCASP
  ccaspState.currentVersion = currentVersion;
  ccaspState.installedAt = new Date().toISOString();

  writeFileSync(ccaspStatePath, JSON.stringify(ccaspState, null, 2), 'utf8');
  console.log(chalk.green(`  ✓ Updated ccasp-state.json (v${currentVersion})`));

  // Register project in global registry (unless --no-register flag is set)
  if (!options.noRegister) {
    const isNewProject = registerProject(cwd, {
      name: projectName,
      version: currentVersion,
      features: selectedFeatures
    });
    if (isNewProject) {
      console.log(chalk.green(`  ✓ Registered project in global CCASP registry`));
    } else {
      console.log(chalk.dim(`  ○ Updated project in global CCASP registry`));
    }
  }

  // Show next steps
  console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.bold('Next Steps:\n'));
  console.log(chalk.cyan('  1.') + ' Launch Claude Code CLI in this project');
  console.log(chalk.cyan('  2.') + ` Type ${chalk.bold('/menu')} to see the interactive project menu`);

  // Show post-config reminder if features need it
  if (featuresRequiringConfig.length > 0) {
    console.log(chalk.cyan('  3.') + chalk.yellow(' Configure enabled features via /menu → Project Settings'));
    console.log(chalk.dim(`       Features pending configuration: ${featuresRequiringConfig.map((f) => f.label).join(', ')}`));
    console.log(chalk.cyan('  4.') + ' Use any installed command by typing its name (e.g., /e2e-test)');
  } else {
    console.log(chalk.cyan('  3.') + ' Use any installed command by typing its name (e.g., /e2e-test)');
  }

  console.log('');
  console.log(chalk.dim('  Customize your setup:'));
  console.log(chalk.dim('    • Edit agents in .claude/agents/'));
  console.log(chalk.dim('    • Create skills in .claude/skills/'));
  console.log(chalk.dim('    • Add hooks in .claude/hooks/'));
  console.log(chalk.dim('    • Configure tech stack in .claude/config/tech-stack.json'));
  console.log('');
  console.log(chalk.dim(`  To update: ${chalk.bold('npx claude-cli-advanced-starter-pack init --force')}`));
  console.log('');
}

/**
 * Generate INDEX.md file
 */
function generateIndexFile(commands, projectName) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# ${projectName} - Slash Commands

> Installed by Claude CLI Advanced Starter Pack v${getVersion()} on ${date}

## Quick Start

Type \`/menu\` to open the interactive project menu.

## Available Commands

| Command | Description |
|---------|-------------|
`;

  for (const cmdName of commands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd) {
      content += `| \`/${cmdName}\` | ${cmd.description} |\n`;
    }
  }

  content += `
## Project Structure

\`\`\`
.claude/
├── commands/     # Slash commands (you are here)
├── agents/       # Custom agents
├── skills/       # Skill packages
├── hooks/        # Enforcement hooks
├── docs/         # Documentation
├── settings.json
└── settings.local.json
\`\`\`

## Reinstall/Update

\`\`\`bash
npx claude-cli-advanced-starter-pack init --force
\`\`\`

## Learn More

- [Claude CLI Advanced Starter Pack on npm](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
- [GitHub Repository](https://github.com/evan043/claude-cli-advanced-starter-pack)
`;

  return content;
}

/**
 * Generate README.md file
 */
function generateReadmeFile(commands, projectName) {
  const categories = {};

  for (const cmdName of commands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd) {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
    }
  }

  let content = `# ${projectName} - Slash Commands

This folder contains Claude Code CLI slash commands installed by Claude CLI Advanced Starter Pack.

## Interactive Menu

Type \`/menu\` to access the interactive ASCII menu with quick access to all commands.

## Commands by Category

`;

  for (const [category, cmds] of Object.entries(categories)) {
    content += `### ${category}\n\n`;
    for (const cmd of cmds) {
      content += `- **/${cmd.name}** - ${cmd.description}\n`;
    }
    content += '\n';
  }

  content += `## How Commands Work

Each \`.md\` file in this directory is a slash command. When you type \`/command-name\` in Claude Code CLI, Claude reads the corresponding \`.md\` file and follows the instructions.

### Command Structure

\`\`\`markdown
---
description: Brief description shown in command list
options:
  - label: "Option 1"
    description: "What this option does"
---

# Command Title

Instructions for Claude to follow when this command is invoked.
\`\`\`

## Creating Custom Commands

1. Create a new \`.md\` file in this directory
2. Add YAML frontmatter with description
3. Write instructions for Claude to follow
4. The command name is the filename (without .md)

## Reinstalling

To reinstall or update commands:

\`\`\`bash
npx claude-cli-advanced-starter-pack init --force
\`\`\`
`;

  return content;
}

/**
 * Verify and fix legacy installations (pre-v1.0.8)
 * Issue #8: Ensures update-check hook is properly configured
 *
 * @param {string} projectDir - Project directory to verify
 * @returns {Object} Verification result with fixes applied
 */
export async function verifyLegacyInstallation(projectDir = process.cwd()) {
  const fixes = [];
  const issues = [];

  const claudeDir = join(projectDir, '.claude');
  const hooksDir = join(claudeDir, 'hooks');
  const settingsPath = join(claudeDir, 'settings.json');
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');

  // Check if this is a CCASP installation
  if (!existsSync(claudeDir)) {
    return { isLegacy: false, message: 'No .claude folder found' };
  }

  // Check 1: Does the update-check hook file exist?
  if (!existsSync(updateCheckHookPath)) {
    issues.push('Missing ccasp-update-check.js hook file');

    // Fix: Create the hook file
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    const templatePath = join(__dirname, '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      fixes.push('Created ccasp-update-check.js hook file');
    }
  }

  // Check 2: Is the hook registered in settings.json?
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

      // Check if UserPromptSubmit hook exists with update-check
      const hasUpdateHook = settings.hooks?.UserPromptSubmit?.some(
        (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
      );

      if (!hasUpdateHook) {
        issues.push('Update-check hook not registered in settings.json');

        // Fix: Add the hook to settings.json
        if (!settings.hooks) settings.hooks = {};
        if (!settings.hooks.UserPromptSubmit) {
          settings.hooks.UserPromptSubmit = [];
        }

        settings.hooks.UserPromptSubmit.push({
          matcher: '',
          hooks: [{
            type: 'command',
            command: 'node .claude/hooks/ccasp-update-check.js',
          }],
        });

        writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        fixes.push('Registered update-check hook in settings.json');
      }
    } catch {
      issues.push('Could not parse settings.json');
    }
  }

  return {
    isLegacy: issues.length > 0,
    issues,
    fixes,
    message: fixes.length > 0
      ? `Fixed ${fixes.length} legacy installation issue(s)`
      : 'Installation is up to date',
  };
}
