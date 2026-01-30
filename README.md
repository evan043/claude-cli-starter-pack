# GitHub Task Kit

**Comprehensive GitHub Issue Creator with Codebase Analysis & Task Synchronization**

Create well-documented GitHub issues, decompose them into granular tasks, and sync progress bidirectionally with your project board.

## Features

- **Interactive CLI** - ASCII menu-driven interface for easy navigation
- **Codebase Analysis** - Automatically finds relevant files, functions, and patterns
- **Rich Issue Bodies** - Generates comprehensive documentation with code snippets
- **Task Decomposition** - Break down issues into granular, actionable tasks
- **Bidirectional Sync** - Pull tasks from GitHub, push progress back
- **Watch Mode** - Interactive task tracking with auto-sync
- **Project Board Integration** - Adds issues to GitHub Projects and updates status
- **Claude Code Integration** - Export as a `/github-create-task` command
- **Testing Integration** - Ralph Loop, Playwright, and manual test modes
- **Agent Creation Suite** - Create hooks, commands, skills, and RAG pipelines
- **Claude CLI Settings** - Configure permissions and Agent-Only mode
- **Phased Development** - Create comprehensive development plans (95%+ success)
- **MCP Server Explorer** - Discover and install MCP servers for browser automation, deployments, etc.
- **Claude Code Audit** - Verify CLAUDE.md and .claude/ folder against Anthropic best practices
- **Roadmap Integration** - Sync /create-roadmap with GitHub Project Board bidirectionally
- **Zero Config Start** - Works immediately after `gh auth login`

## Quick Start

```bash
# Install globally
npm install -g github-task-kit

# Or run without installing
npx github-task-kit

# Interactive setup
gtask setup

# Create your first task
gtask create

# Break it down into steps
gtask decompose 123

# Track progress interactively
gtask sync watch 123
```

## Prerequisites

1. **GitHub CLI** (`gh`) - [Install from cli.github.com](https://cli.github.com/)
2. **jq** - JSON processor
   - macOS: `brew install jq`
   - Ubuntu: `sudo apt install jq`
   - Windows: `winget install jqlang.jq`
3. **Node.js 18+**

```bash
# Verify prerequisites
gh --version   # Should be 2.40+
jq --version
node --version # Should be 18+

# Authenticate with GitHub
gh auth login
```

## Usage

### Interactive Menu

```bash
gtask
```

```
╔═══════════════════════════════════════════════════════════════════╗
║   ╔═╗╦╔╦╗╦ ╦╦ ╦╔╗    ╔╦╗╔═╗╔═╗╦╔═  ╦╔═╦╔╦╗                        ║
║   ║ ╦║ ║ ╠═╣║ ║╠╩╗    ║ ╠═╣╚═╗╠╩╗  ╠╩╗║ ║                         ║
║   ╚═╝╩ ╩ ╩ ╩╚═╝╚═╝    ╩ ╩ ╩╚═╝╩ ╩  ╩ ╩╩ ╩                         ║
╚═══════════════════════════════════════════════════════════════════╝

   [1] Create New Task        Create issue with codebase analysis
   [2] Decompose Issue        Break down issue into tasks
   [3] Sync Tasks             Sync progress with GitHub
   ──────────────
   [4] Setup / Configure      Connect to your GitHub project
   [5] List Recent Tasks      View issues you've created
   [6] Install Claude Command Add to .claude/commands/
   ──────────────
   [T] Testing Setup          Configure testing mode & credentials
   [R] Run Tests              Run tests (Ralph Loop / Manual / Watch)
   ──────────────
   [A] Agent Creator          Create agents, hooks, skills, commands
   [C] Claude Settings        Permission modes, agent-only launcher
   [P] Phase Dev Plan         Create phased development plan (95%+)
   [M] MCP Explorer           Discover & install MCP servers
   [V] Claude Audit           Verify CLAUDE.md & .claude/ best practices
   [R] Roadmap Integration    Sync roadmaps with GitHub Project Board
   ──────────────
   [7] Help & Examples        Documentation and examples
   [Q] Exit
```

### Create a Task

```bash
# Interactive
gtask create

# With flags
gtask create -t "Fix login bug" -p P1 -l "bug,frontend"

# Batch mode (for automation)
gtask create --batch \
  -t "Add dark mode" \
  -d "Implement dark mode toggle in settings" \
  -l "feature,frontend" \
  -p P2
```

### Decompose an Issue

Break down a high-level issue into granular, actionable tasks:

```bash
# Interactive
gtask decompose 123

# Direct
gtask decompose --issue 123
```

**What it does:**
1. Fetches the issue from GitHub
2. Parses existing checklists
3. Analyzes codebase for relevant files
4. Generates detailed task breakdown
5. Saves locally for tracking
6. Optionally posts to GitHub as a comment

**Decomposition strategies:**
- **Enhance** - Use existing checklist + add codebase analysis
- **New** - Create fresh breakdown from analysis
- **Merge** - Combine existing tasks with new analysis

### Sync Tasks

Synchronize task progress between local state and GitHub:

```bash
# Show sync status
gtask sync

# Pull tasks from GitHub issue
gtask sync pull 123

# Push progress to GitHub
gtask sync push 123

# Interactive watch mode
gtask sync watch 123
```

**Watch mode features:**
- Interactive task list
- Mark tasks complete with `c <num>`
- Start tasks with `s <num>`
- Auto-push when all tasks complete
- Real-time progress tracking

### Setup

```bash
# Interactive setup wizard
gtask setup

# With flags
gtask setup -o myuser -r myrepo -p 1

# Save globally (all projects)
gtask setup --global
```

### List Tasks

```bash
gtask list                    # Recent open issues
gtask list --mine             # My issues only
gtask list --status closed    # Closed issues
gtask list -n 20              # Show 20 issues
```

### Claude Code Integration

```bash
# Install the command to your project
gtask install

# Creates: .claude/commands/github-create-task.md
# Usage in Claude Code: /github-create-task
```

### Testing

Configure and run tests with Ralph Loop (auto-fix), manual, or watch modes:

```bash
# Configure testing environment
gtask test-setup

# Run tests with configured mode
gtask test

# Run with specific mode
gtask test --mode ralph     # Test-fix cycle until all pass
gtask test --mode manual    # Run once
gtask test --mode watch     # Interactive Playwright UI

# Run specific test file
gtask test -f tests/auth.spec.ts

# Run with browser visible
gtask test --headed
```

### Agent Creation Suite

Create Claude Code agents, hooks, commands, and skills:

```bash
# Interactive menu for all creation types
gtask create-agent

# Create enforcement hook
gtask create-hook

# Create slash command
gtask create-command

# Create RAG-enhanced skill package
gtask create-skill
```

**What you can create:**
- **Individual Agent** - L1 orchestrator, L2 specialist, or L3 worker
- **Sub-Agent** - Add specialist to existing pipeline
- **RAG Pipeline** - Full L1 orchestrator + L2 specialists
- **Skill Package** - RAG-enhanced skill with context and workflows
- **Hook** - PreToolUse, PostToolUse, UserPromptSubmit triggers
- **Slash Command** - Custom commands for Claude Code

### Claude CLI Settings

Configure Claude Code CLI permission modes and create Agent-Only launchers:

```bash
gtask claude-settings
```

**Options:**
- **Permission Mode** - Configure bypassPermissions, acceptEdits, or ask mode
- **Agent-Only Launcher** - Create scripts that run Claude in restricted mode
- **Permission Rules** - Configure allow/deny rules for tool calls
- **View Settings** - Display current configuration

### Phased Development Plans

Create comprehensive development plans with 95%+ success probability:

```bash
# Interactive wizard
gtask create-phase-dev

# Force specific scale
gtask create-phase-dev --scale M        # Medium: 3-4 phases
gtask create-phase-dev --scale L        # Large: 5+ phases

# Autonomous mode (minimal prompts)
gtask create-phase-dev --autonomous --name "My Project"
```

**What gets generated:**
- `PROGRESS.json` - Task tracking and state management
- `EXECUTIVE_SUMMARY.md` - Project overview
- `API_ENDPOINTS.md` - Backend endpoint documentation
- `DATABASE_SCHEMA.md` - PostgreSQL schema (enforces PostgreSQL-first)
- RAG Phase Executor Agent - Autonomous phase execution
- Interactive Slash Command - `/phase-dev-{project-slug}`
- Enforcement Hooks - Pattern and quality enforcement

**Scales:**
- **S (Small)** - 2 phases, 10-30 tasks (focused features)
- **M (Medium)** - 3-4 phases, 30-80 tasks (multi-component features)
- **L (Large)** - 5-8 phases, 80-200 tasks (major overhauls)

### MCP Server Explorer

Discover and install MCP servers to extend Claude's capabilities:

```bash
# Interactive menu
gtask explore-mcp

# Smart recommendations based on your tech stack
gtask explore-mcp --recommend

# Quick install testing MCPs (Playwright + Puppeteer)
gtask explore-mcp --testing
```

**What it does:**
- Auto-detects your tech stack and recommends relevant MCPs
- Installs browser automation MCPs (Playwright, Puppeteer) for E2E testing
- Configures `.mcp.json` and `.claude/settings.json`
- Updates `CLAUDE.md` with tool documentation

**Available MCP Categories:**
- **Testing** - Playwright, Puppeteer, Playwright Extended
- **VCS** - GitHub, Git
- **Deployment** - Railway, Cloudflare, DigitalOcean, Vercel
- **Database** - PostgreSQL, SQLite, Supabase
- **Automation** - n8n workflow automation
- **Communication** - Slack, Resend (email)
- **Utilities** - Filesystem, Fetch

### Claude Code Audit

Verify your `CLAUDE.md` files and `.claude/` folder structure against Anthropic's official best practices:

```bash
# Run full audit
gtask claude-audit

# Audit specific component
gtask claude-audit --mode claudemd   # Just CLAUDE.md files
gtask claude-audit --mode folder     # Just .claude/ structure
```

**What it checks:**
- **CLAUDE.md file length** - Warns if >150 lines, errors if >300 lines
- **Anti-patterns** - Long code blocks, vague instructions, self-evident rules
- **Good patterns** - Emphasis keywords (IMPORTANT, MUST), bash commands, @imports
- **Folder structure** - Verifies commands/, skills/, agents/, hooks/, settings.json
- **Frontmatter validation** - Skills and agents have required fields
- **JSON validation** - Settings files are valid JSON

**Score calculation:**
- 100 = Perfect
- -5 per warning
- -15 per error

**Reference:** [Anthropic Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)

### Roadmap Integration

Bridge your local `/create-roadmap` roadmaps with GitHub Project Board:

```bash
# Interactive menu
gtask roadmap

# Import roadmap projects as GitHub issues
gtask roadmap import --file=.claude/docs/tech-debt-2025/ROADMAP.json

# Sync progress to GitHub (update comments, close completed issues)
gtask roadmap sync

# Create ROADMAP.json from existing GitHub issues
gtask roadmap create --from-issues

# Show sync status dashboard
gtask roadmap status
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `import` | Create GitHub issues from ROADMAP.json projects |
| `sync` | Update GitHub issues with project completion status |
| `create` | Generate ROADMAP.json from existing GitHub issues |
| `status` | Show sync status dashboard for all roadmaps |

**What it does:**
- Auto-creates GitHub issues with proper labels and descriptions
- Links issues back to ROADMAP.json via `phase_dev_config.github_issue_number`
- Posts progress comments when syncing
- Auto-closes issues when projects complete
- Supports bidirectional flow (GitHub ↔ local roadmap)

**Integration with /create-roadmap:**
- Detects existing roadmaps in `.claude/docs/*/ROADMAP.json`
- Preserves existing GitHub links during import
- Compatible with `/roadmap-{name}-run` execution

## Workflow Example

```bash
# 1. Create a high-level issue
gtask create
# → Created issue #123: "Add user authentication"

# 2. Decompose into tasks
gtask decompose 123
# → Generated 8 tasks from codebase analysis

# 3. Start working with watch mode
gtask sync watch 123
# → Interactive task tracking

# In watch mode:
#   c 1    → Complete task 1
#   c 2    → Complete task 2
#   p      → Push progress to GitHub
#   q      → Quit

# 4. Progress auto-synced to GitHub
# → Comments posted with completed tasks
# → Project board status updated when done
```

## Configuration

Configuration is stored in `.gtaskrc` (YAML format).

**Search order:**
1. `./.gtaskrc` (current directory)
2. `~/.gtaskrc` (home directory)

### Example Configuration

```yaml
project_board:
  owner: "myuser"
  repo: "my-project"
  project_number: 1
  project_id: "PVT_kwHOxxxxxx"

field_ids:
  status: "PVTSSF_lAHOxxxxxx"
  priority: "PVTSSF_lAHOyyyyyy"

status_options:
  todo: "abc123"
  in_progress: "def456"
  done: "ghi789"

priority_options:
  p0: "crit01"
  p1: "high02"
  p2: "med03"
  p3: "low04"

labels:
  type:
    - bug
    - feature
    - refactor
  stack:
    - frontend
    - backend
```

### Getting Field IDs

```bash
# List project fields
gh project field-list 1 --owner myuser --format json

# Get field options via GraphQL
gh api graphql -f query='
  query($project:ID!) {
    node(id: $project) {
      ... on ProjectV2 {
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              name
              options { id name }
            }
          }
        }
      }
    }
  }
' -F project=PVT_kwHOxxxxxx
```

## Task State Storage

Local task state is stored in `.gtask/` directory:

```
.gtask/
├── issue-123.json    # Task state for issue #123
├── issue-456.json    # Task state for issue #456
└── ...
```

Each file contains:
- Issue metadata (number, title, owner, repo)
- Task list with status (pending/in_progress/completed)
- Timestamps (created, last synced)
- File references and metadata

## Commands Reference

| Command | Description |
|---------|-------------|
| `gtask` | Interactive menu |
| `gtask create` | Create a new task |
| `gtask decompose <issue>` | Break down issue into tasks |
| `gtask sync` | Show sync status |
| `gtask sync pull <issue>` | Pull tasks from GitHub |
| `gtask sync push <issue>` | Push progress to GitHub |
| `gtask sync watch <issue>` | Interactive task tracking |
| `gtask setup` | Configure project connection |
| `gtask list` | List recent tasks |
| `gtask install` | Install Claude Code command |
| `gtask test-setup` | Configure testing environment |
| `gtask test` | Run tests (ralph/manual/watch) |
| `gtask create-agent` | Agent creation menu |
| `gtask create-hook` | Create enforcement hook |
| `gtask create-command` | Create slash command |
| `gtask create-skill` | Create RAG skill package |
| `gtask claude-settings` | Configure Claude CLI settings |
| `gtask create-phase-dev` | Create phased development plan |
| `gtask explore-mcp` | Discover and install MCP servers |
| `gtask help-examples` | Show detailed help |

## Flags Reference

### Create

| Flag | Description |
|------|-------------|
| `-t, --title <title>` | Issue title |
| `-d, --description <desc>` | Issue description |
| `-p, --priority <P0-P3>` | Priority level |
| `-l, --labels <labels>` | Comma-separated labels |
| `--qa` | Requires QA validation |
| `--batch` | Non-interactive mode |
| `--skip-analysis` | Skip codebase analysis |

### Decompose

| Flag | Description |
|------|-------------|
| `-i, --issue <number>` | Issue number |

### Sync

| Flag | Description |
|------|-------------|
| `-i, --issue <number>` | Issue number |

### Setup

| Flag | Description |
|------|-------------|
| `-o, --owner <owner>` | GitHub username/org |
| `-r, --repo <repo>` | Repository name |
| `-p, --project <number>` | Project board number |
| `--global` | Save to ~/.gtaskrc |

### List

| Flag | Description |
|------|-------------|
| `-n, --limit <number>` | Number of issues (default: 10) |
| `--mine` | My issues only |
| `--status <status>` | Filter by status |

### Test

| Flag | Description |
|------|-------------|
| `-m, --mode <mode>` | Testing mode: ralph, manual, or watch |
| `-f, --file <file>` | Specific test file to run |
| `--headed` | Run in headed mode (show browser) |
| `--ui` | Open Playwright UI mode |
| `--max <iterations>` | Max iterations for Ralph loop |
| `-c, --command <command>` | Custom test command |

### Create-Agent

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Agent name |

### Create-Hook

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Hook name |
| `-e, --event <type>` | Event type (PreToolUse, PostToolUse, UserPromptSubmit) |
| `-t, --tools <tools>` | Target tools (comma-separated) |

### Create-Command

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Command name |
| `-d, --delegates-to <target>` | Skill or agent to delegate to |

### Create-Skill

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Skill name |

### Create-Phase-Dev

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Project name |
| `-s, --scale <scale>` | Force scale: S, M, or L |
| `--autonomous` | Autonomous mode (use defaults) |

### Explore-MCP

| Flag | Description |
|------|-------------|
| `--recommend` | Auto-recommend based on codebase analysis |
| `--testing` | Quick install testing MCPs (Playwright/Puppeteer) |

## API Usage

You can also use GitHub Task Kit programmatically:

```javascript
import {
  runCreate,
  runDecompose,
  runSync,
  analyzeForIssue,
  generateIssueBody,
  createIssue,
  parseIssueBody,
  toClaudeTaskList,
  saveTaskState,
  loadTaskState,
} from 'github-task-kit';

// Analyze codebase
const analysis = await analyzeForIssue(['authentication', 'login']);

// Generate issue body
const body = generateIssueBody({
  description: 'Fix login bug',
  codeAnalysis: analysis,
});

// Create issue
const result = await createIssue('owner', 'repo', {
  title: 'Fix login bug',
  body,
  labels: ['bug', 'frontend'],
});

// Parse existing issue
const parsed = parseIssueBody(existingIssueBody);
const tasks = toClaudeTaskList(parsed);

// Save/load task state
saveTaskState({ issueNumber: 123, tasks, ... });
const state = loadTaskState(123);
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Issue                              │
│  - Problem Statement                                            │
│  - Acceptance Criteria (checkboxes)                             │
│  - Todo List (checkboxes)                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   gtask decompose
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Local Task State                             │
│  .gtask/issue-123.json                                          │
│  - Granular task list                                           │
│  - Status tracking                                               │
│  - File references                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                     gtask sync
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GitHub Issue Comments                           │
│  - Progress updates                                              │
│  - Completed task list                                          │
│  - Recent commits                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

MIT
