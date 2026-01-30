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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
];

/**
 * Generate the sophisticated /menu command
 */
function generateMenuCommand(projectName, installedCommands, installedAgents, installedSkills, installedHooks) {
  const date = new Date().toISOString().split('T')[0];

  // Group commands by category
  const commandsByCategory = {};
  for (const cmdName of installedCommands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd && cmd.name !== 'menu') {
      if (!commandsByCategory[cmd.category]) {
        commandsByCategory[cmd.category] = [];
      }
      commandsByCategory[cmd.category].push(cmd);
    }
  }

  // Build category sections for the menu
  let categoryMenuItems = '';
  let categoryInstructions = '';
  let keyIndex = 1;
  const keyMap = {};

  for (const [category, cmds] of Object.entries(commandsByCategory)) {
    categoryMenuItems += `\n### ${category}\n`;
    for (const cmd of cmds) {
      const key = keyIndex <= 9 ? keyIndex.toString() : String.fromCharCode(65 + keyIndex - 10); // 1-9, then A-Z
      keyMap[key] = cmd.name;
      categoryMenuItems += `- **[${key}]** \`/${cmd.name}\` - ${cmd.description}\n`;
      keyIndex++;
    }
  }

  // Build agents section
  let agentsSection = '';
  if (installedAgents.length > 0) {
    agentsSection = `\n### Agents\n`;
    for (const agent of installedAgents) {
      agentsSection += `- **${agent}** - Custom agent\n`;
    }
  }

  // Build skills section
  let skillsSection = '';
  if (installedSkills.length > 0) {
    skillsSection = `\n### Skills\n`;
    for (const skill of installedSkills) {
      skillsSection += `- **${skill}** - Custom skill\n`;
    }
  }

  // Build hooks section
  let hooksSection = '';
  if (installedHooks.length > 0) {
    hooksSection = `\n### Active Hooks\n`;
    for (const hook of installedHooks) {
      hooksSection += `- **${hook}**\n`;
    }
  }

  return `---
description: Interactive project menu - Quick access to all commands, agents, skills, and tools
---

# ${projectName} - Project Menu

\`\`\`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗       ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝       ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═       ║
║                                                                               ║
║                    ${projectName.padEnd(40)}                    ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Quick Actions:                                                              ║
║   ─────────────                                                               ║
║   [T] Run Tests          [G] GitHub Task        [P] Phase Dev Plan            ║
║   [A] Create Agent       [H] Create Hook        [S] Create Skill              ║
║   [M] Explore MCP        [C] Claude Audit       [E] Explore Codebase          ║
║                                                                               ║
║   Project Resources:                                                          ║
║   ──────────────────                                                          ║
║   [1] View Agents        [2] View Skills        [3] View Hooks                ║
║   [4] View Commands      [5] Settings           [6] Documentation             ║
║                                                                               ║
║   Navigation:                                                                 ║
║   ───────────                                                                 ║
║   [R] Refresh Menu       [?] Help               [Q] Exit Menu                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
\`\`\`

## How to Use This Menu

When the user invokes \`/menu\`, display the ASCII menu above and wait for their selection.

### Key Bindings

| Key | Action | Command |
|-----|--------|---------|
| **T** | Run E2E Tests | \`/e2e-test\` |
| **G** | Create GitHub Task | \`/github-task\` |
| **P** | Create Phase Dev Plan | \`/phase-dev-plan\` |
| **A** | Create Agent | \`/create-agent\` |
| **H** | Create Hook | \`/create-hook\` |
| **S** | Create Skill | \`/create-skill\` |
| **M** | Explore MCP Servers | \`/explore-mcp\` |
| **C** | Claude Audit | \`/claude-audit\` |
| **E** | Explore Codebase | \`/codebase-explorer\` |
| **1** | List project agents | Read \`.claude/agents/\` |
| **2** | List project skills | Read \`.claude/skills/\` |
| **3** | List active hooks | Read \`.claude/hooks/\` |
| **4** | List all commands | Read \`.claude/commands/INDEX.md\` |
| **5** | View/edit settings | Read \`.claude/settings.json\` |
| **6** | Open documentation | Read \`.claude/docs/\` |
| **R** | Refresh and redisplay menu | Re-invoke \`/menu\` |
| **?** | Show help | Display command descriptions |
| **Q** | Exit menu | End menu interaction |

## Installed Commands
${categoryMenuItems}
${agentsSection}
${skillsSection}
${hooksSection}

## Instructions for Claude

When this command is invoked:

1. **Display the ASCII menu** exactly as shown above
2. **Ask the user** what they would like to do (show the key bindings)
3. **Wait for user input** - a single character or command name
4. **Execute the corresponding action**:
   - For slash commands: Invoke the command directly
   - For resource views: Read and display the contents
   - For R: Redisplay the menu
   - For Q: End the menu session

### Example Interaction

\`\`\`
User: /menu
Claude: [Displays ASCII menu]
Claude: What would you like to do? Enter a key (T/G/P/A/H/S/M/C/E/1-6/R/?/Q):

User: T
Claude: Running E2E tests... [Invokes /e2e-test]
\`\`\`

### Dynamic Content

When displaying resource views (1-6), read the actual contents from:
- Agents: \`.claude/agents/*.md\` files
- Skills: \`.claude/skills/*/skill.md\` files
- Hooks: \`.claude/hooks/*.js\` files
- Commands: \`.claude/commands/INDEX.md\`
- Settings: \`.claude/settings.json\` and \`.claude/settings.local.json\`
- Docs: \`.claude/docs/\` directory listing

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
 * Generate settings.json
 */
function generateSettingsJson(projectName) {
  return JSON.stringify({
    "$schema": "https://raw.githubusercontent.com/anthropics/claude-code/main/.claude/settings.schema.json",
    "project": {
      "name": projectName,
      "description": "Project configured with Claude CLI Advanced Starter Pack"
    },
    "permissions": {
      "allowedTools": ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"],
      "deniedTools": []
    },
    "agents": [],
    "hooks": []
  }, null, 2);
}

/**
 * Generate settings.local.json
 */
function generateSettingsLocalJson() {
  return JSON.stringify({
    "$schema": "https://raw.githubusercontent.com/anthropics/claude-code/main/.claude/settings.schema.json",
    "permissions": {
      "allowedTools": [],
      "deniedTools": []
    },
    "hooks": []
  }, null, 2);
}

/**
 * Run the init wizard
 */
export async function runInit(options = {}) {
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
    console.log(chalk.blue('  ○ settings.json exists (preserved)'));
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

  console.log('');

  // Step 4: Select slash commands to install
  console.log(chalk.bold('Step 4: Select slash commands to install\n'));

  // Check for existing commands first
  const existingCmdFiles = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md')
    : [];
  const existingCmdNames = existingCmdFiles.map(f => f.replace('.md', ''));

  if (existingCmdNames.length > 0) {
    console.log(chalk.blue(`  ℹ Found ${existingCmdNames.length} existing command(s) in your project:`));
    console.log(chalk.dim(`    ${existingCmdNames.map(c => '/' + c).join(', ')}`));
    console.log(chalk.dim('    These will be preserved unless you choose to overwrite.\n'));
  }

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
  const { selectedCommands } = await inquirer.prompt([
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

  // Always include required commands
  const requiredCommands = AVAILABLE_COMMANDS.filter(c => c.required).map(c => c.name);
  const finalCommands = [...new Set([...requiredCommands, ...selectedCommands])];

  if (finalCommands.length === 0) {
    showWarning('No commands selected. Nothing to install.');
    return;
  }

  console.log('');

  // Step 5: Check for existing commands that would be overwritten
  const commandsToOverwrite = finalCommands.filter(cmd => existingCmdNames.includes(cmd));

  let overwrite = options.force || false;
  if (commandsToOverwrite.length > 0 && !overwrite) {
    console.log(chalk.yellow.bold('  ⚠ The following commands already exist:'));
    for (const cmd of commandsToOverwrite) {
      console.log(chalk.yellow(`    • /${cmd}`));
    }
    console.log('');

    const { overwriteChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'overwriteChoice',
        message: 'How would you like to handle existing commands?',
        choices: [
          { name: 'Skip existing - only install new commands (recommended)', value: 'skip' },
          { name: 'Overwrite all - replace existing with starter pack versions', value: 'overwrite' },
          { name: 'Cancel installation', value: 'cancel' },
        ],
      },
    ]);

    if (overwriteChoice === 'cancel') {
      console.log(chalk.dim('\nCancelled. No changes made.'));
      return;
    }

    overwrite = overwriteChoice === 'overwrite';

    if (!overwrite) {
      // Filter out existing commands (keep only new ones + required)
      const filtered = finalCommands.filter((c) => !existingCmdNames.includes(c) || requiredCommands.includes(c));
      finalCommands.length = 0;
      finalCommands.push(...filtered);
      console.log(chalk.green(`\n  ✓ Will install ${finalCommands.length} new command(s), preserving ${commandsToOverwrite.length} existing`));
    } else {
      console.log(chalk.yellow(`\n  ⚠ Will overwrite ${commandsToOverwrite.length} existing command(s)`));
    }
  }

  // Step 6: Install commands
  console.log(chalk.bold('Step 5: Installing slash commands\n'));

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
          failed.push({ name: cmdName, error: 'No template found' });
          continue;
        }
      }

      writeFileSync(cmdPath, content, 'utf8');
      installed.push(cmdName);
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

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

  // Show next steps
  console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.bold('Next Steps:\n'));
  console.log(chalk.cyan('  1.') + ' Launch Claude Code CLI in this project');
  console.log(chalk.cyan('  2.') + ` Type ${chalk.bold('/menu')} to see the interactive project menu`);
  console.log(chalk.cyan('  3.') + ' Use any installed command by typing its name (e.g., /e2e-test)');
  console.log('');
  console.log(chalk.dim('  Customize your setup:'));
  console.log(chalk.dim('    • Edit agents in .claude/agents/'));
  console.log(chalk.dim('    • Create skills in .claude/skills/'));
  console.log(chalk.dim('    • Add hooks in .claude/hooks/'));
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
