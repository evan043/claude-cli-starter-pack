/**
 * Init Command
 *
 * Deploy Claude CLI Starter Pack to a project's .claude/commands/ folder
 * Creates slash commands that will be available in Claude Code CLI
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
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
];

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
5. Register in settings if needed
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
5. Add to settings.local.json
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
};

/**
 * Run the init wizard
 */
export async function runInit(options = {}) {
  showHeader('Claude CLI Starter Pack - Project Setup');

  const cwd = process.cwd();
  const claudeDir = join(cwd, '.claude');
  const commandsDir = join(claudeDir, 'commands');

  // Step 1: Check prerequisites
  console.log(chalk.dim('Checking project prerequisites...\n'));

  // Check if .claude folder exists
  const hasClaudeDir = existsSync(claudeDir);
  if (!hasClaudeDir) {
    showWarning('.claude/ folder not found');
    const { createDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createDir',
        message: 'Create .claude/ folder structure?',
        default: true,
      },
    ]);

    if (!createDir) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }

    // Create .claude structure
    mkdirSync(claudeDir, { recursive: true });
    mkdirSync(join(claudeDir, 'commands'), { recursive: true });
    mkdirSync(join(claudeDir, 'skills'), { recursive: true });
    mkdirSync(join(claudeDir, 'agents'), { recursive: true });
    mkdirSync(join(claudeDir, 'hooks'), { recursive: true });
    mkdirSync(join(claudeDir, 'docs'), { recursive: true });
    console.log(chalk.green('✓ Created .claude/ folder structure'));
  } else {
    console.log(chalk.green('✓ .claude/ folder exists'));
  }

  // Ensure commands directory exists
  if (!existsSync(commandsDir)) {
    mkdirSync(commandsDir, { recursive: true });
    console.log(chalk.green('✓ Created .claude/commands/ directory'));
  }

  console.log('');

  // Step 2: Select commands to install
  const categories = [...new Set(AVAILABLE_COMMANDS.map((c) => c.category))];

  console.log(chalk.bold('Available Slash Commands:\n'));

  for (const category of categories) {
    console.log(chalk.cyan(`  ${category}:`));
    const cmds = AVAILABLE_COMMANDS.filter((c) => c.category === category);
    for (const cmd of cmds) {
      const marker = cmd.selected ? chalk.green('●') : chalk.dim('○');
      console.log(`    ${marker} /${cmd.name} - ${chalk.dim(cmd.description)}`);
    }
    console.log('');
  }

  // Ask which commands to install
  const { selectedCommands } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCommands',
      message: 'Select commands to install:',
      choices: AVAILABLE_COMMANDS.map((cmd) => ({
        name: `/${cmd.name} - ${cmd.description}`,
        value: cmd.name,
        checked: cmd.selected,
      })),
      pageSize: 15,
    },
  ]);

  if (selectedCommands.length === 0) {
    showWarning('No commands selected. Nothing to install.');
    return;
  }

  console.log('');

  // Step 3: Check for existing commands
  const existingCommands = [];
  for (const cmdName of selectedCommands) {
    const cmdPath = join(commandsDir, `${cmdName}.md`);
    if (existsSync(cmdPath)) {
      existingCommands.push(cmdName);
    }
  }

  let overwrite = options.force || false;
  if (existingCommands.length > 0 && !overwrite) {
    showWarning(`Found ${existingCommands.length} existing command(s): ${existingCommands.join(', ')}`);
    const { confirmOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmOverwrite',
        message: 'Overwrite existing commands?',
        default: false,
      },
    ]);
    overwrite = confirmOverwrite;

    if (!overwrite) {
      // Filter out existing commands
      const filtered = selectedCommands.filter((c) => !existingCommands.includes(c));
      if (filtered.length === 0) {
        console.log(chalk.dim('All selected commands already exist. Nothing to install.'));
        return;
      }
      selectedCommands.length = 0;
      selectedCommands.push(...filtered);
    }
  }

  // Step 4: Install commands
  const spinner = ora('Installing slash commands...').start();
  const installed = [];
  const failed = [];

  for (const cmdName of selectedCommands) {
    try {
      const cmdPath = join(commandsDir, `${cmdName}.md`);
      const template = COMMAND_TEMPLATES[cmdName];

      if (template) {
        const content = template();
        writeFileSync(cmdPath, content, 'utf8');
        installed.push(cmdName);
      } else {
        failed.push({ name: cmdName, error: 'No template found' });
      }
    } catch (error) {
      failed.push({ name: cmdName, error: error.message });
    }
  }

  spinner.stop();

  // Step 5: Generate INDEX.md
  const indexPath = join(commandsDir, 'INDEX.md');
  const indexContent = generateIndexFile(installed);
  writeFileSync(indexPath, indexContent, 'utf8');

  // Step 6: Generate README.md
  const readmePath = join(commandsDir, 'README.md');
  const readmeContent = generateReadmeFile(installed);
  writeFileSync(readmePath, readmeContent, 'utf8');

  // Summary
  console.log('');
  if (installed.length > 0) {
    showSuccess('Commands Installed!', [
      `Installed: ${installed.length} commands`,
      ...installed.map((c) => `  /${c}`),
      '',
      `Location: ${commandsDir}`,
      '',
      'These commands are now available in Claude Code CLI.',
      'Type /<command-name> to use them.',
    ]);
  }

  if (failed.length > 0) {
    showError('Some commands failed to install:');
    for (const f of failed) {
      console.log(chalk.red(`  /${f.name}: ${f.error}`));
    }
  }

  // Show next steps
  console.log(chalk.bold('\nNext Steps:\n'));
  console.log(chalk.dim('  1. Launch Claude Code CLI in this project'));
  console.log(chalk.dim('  2. Type /<command-name> to use installed commands'));
  console.log(chalk.dim('  3. Run "ccsp" again to configure GitHub integration\n'));

  console.log(chalk.dim(`  To reinstall or update: npx claude-cli-starter-pack init\n`));
}

/**
 * Generate INDEX.md file
 */
function generateIndexFile(commands) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# Claude CLI Starter Pack Commands

> Installed by Claude CLI Starter Pack v${getVersion()} on ${date}

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
## Usage

Type \`/<command-name>\` in Claude Code CLI to invoke a command.

## Reinstall/Update

\`\`\`bash
npx claude-cli-starter-pack init
\`\`\`

## Learn More

- [Claude CLI Starter Pack on npm](https://www.npmjs.com/package/claude-cli-starter-pack)
- [GitHub Repository](https://github.com/evan043/claude-cli-starter-pack)
`;

  return content;
}

/**
 * Generate README.md file
 */
function generateReadmeFile(commands) {
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

  let content = `# Slash Commands

This folder contains Claude Code CLI slash commands installed by Claude CLI Starter Pack.

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
npx claude-cli-starter-pack init
\`\`\`
`;

  return content;
}
