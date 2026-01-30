# Claude CLI Advanced Starter Pack

**Advanced Claude Code CLI Toolkit - Agents, Hooks, Skills, MCP Servers, and GitHub Integration**

Everything you need to supercharge your Claude Code CLI experience: create agents, hooks, skills, discover MCP servers, audit your setup, and manage GitHub issues with codebase analysis.

## Features

### Claude Code Tooling
- **Agent Creation Suite** - Create L1 orchestrators, L2 specialists, L3 workers, and RAG pipelines
- **Hook Generator** - Build PreToolUse, PostToolUse, and UserPromptSubmit enforcement hooks
- **Skill Builder** - Create RAG-enhanced skill packages with context and workflows
- **Command Generator** - Create custom slash commands for Claude Code
- **Claude Settings** - Configure permissions, agent-only mode, and allow/deny rules
- **Claude Code Audit** - Verify CLAUDE.md and .claude/ folder against Anthropic best practices

### MCP & Automation
- **MCP Server Explorer** - Discover and install MCP servers based on your tech stack
- **Auto-Detection** - Detects Supabase, n8n, Stripe, Auth0, Clerk, Resend, Twilio
- **Smart Recommendations** - Suggests MCPs based on codebase analysis

### Development Planning
- **Phased Development** - Create comprehensive development plans (95%+ success rate)
- **Roadmap Integration** - Sync /create-roadmap with GitHub Project Board bidirectionally
- **Task Decomposition** - Break down issues into granular, actionable tasks

### GitHub Integration
- **Codebase Analysis** - Automatically finds relevant files, functions, and patterns
- **Rich Issue Bodies** - Generates comprehensive documentation with code snippets
- **Bidirectional Sync** - Pull tasks from GitHub, push progress back
- **Project Board Integration** - Adds issues to GitHub Projects and updates status

### Testing
- **Ralph Loop** - Test-fix cycle until all tests pass
- **Playwright Integration** - E2E testing with headed/headless modes
- **Watch Mode** - Interactive test tracking with auto-sync

## Quick Start

```bash
# Deploy to your project (creates slash commands in .claude/commands/)
npx claude-cli-advanced-starter-pack init

# Or install globally for terminal access
npm install -g claude-cli-advanced-starter-pack

# Launch interactive menu
ccasp

# Quick commands
ccasp init               # Deploy slash commands to project
ccasp create-agent       # Create agents, hooks, skills
ccasp explore-mcp        # Discover MCP servers
ccasp claude-audit       # Audit your Claude setup
ccasp create-phase-dev   # Create phased development plan
```

## Project Setup (Recommended)

The `init` command deploys slash commands directly to your project's `.claude/commands/` folder:

```bash
# Navigate to your project
cd my-project

# Run the init wizard
npx claude-cli-advanced-starter-pack init

# Select which commands to install
# Commands are now available when you launch Claude Code CLI
```

**What gets installed:**
- `/menu` - Interactive ASCII menu for quick access to all commands
- `/e2e-test` - Run Playwright tests with ralph loop, watch, or headed modes
- `/github-task` - Create GitHub issues with codebase analysis
- `/phase-dev-plan` - Generate phased development plans
- `/create-agent` - Create L1/L2/L3 agents
- `/create-hook` - Build enforcement hooks
- `/create-skill` - Create RAG skill packages
- `/explore-mcp` - Discover MCP servers
- `/claude-audit` - Audit your Claude setup
- And more...

**Safe Integration:** If you have an existing `.claude/` folder, the init wizard will detect it and preserve your existing files. New commands are added alongside your setup without overwriting anything.

After installation, these commands are available as slash commands in Claude Code CLI.

## Prerequisites

1. **GitHub CLI** (`gh`) - [Install from cli.github.com](https://cli.github.com/)
2. **Node.js 18+**

```bash
# Verify prerequisites
gh --version   # Should be 2.40+
node --version # Should be 18+

# Authenticate with GitHub
gh auth login
```

## Usage

### Interactive Menu

```bash
ccasp
```

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗    ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝    ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═    ║
║                                                                            ║
║    Advanced Claude Code CLI Toolkit - Agents, MCP, GitHub & More           ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

   [1] Create New Task        Create issue with codebase analysis
   [2] Decompose Issue        Break down issue into tasks
   [3] Sync Tasks             Sync progress with GitHub
   ──────────────
   [A] Agent Creator          Create agents, hooks, skills, commands
   [C] Claude Settings        Permission modes, agent-only launcher
   [P] Phase Dev Plan         Create phased development plan (95%+)
   [M] MCP Explorer           Discover & install MCP servers
   [V] Claude Audit           Verify CLAUDE.md & .claude/ best practices
   [R] Roadmap Integration    Sync roadmaps with GitHub Project Board
   ──────────────
   [T] Testing Setup          Configure testing mode & credentials
   [R] Run Tests              Run tests (Ralph Loop / Manual / Watch)
```

### Agent Creation Suite

Create Claude Code agents, hooks, commands, and skills:

```bash
# Interactive menu for all creation types
ccasp create-agent

# Create enforcement hook
ccasp create-hook

# Create slash command
ccasp create-command

# Create RAG-enhanced skill package
ccasp create-skill
```

**What you can create:**
- **Individual Agent** - L1 orchestrator, L2 specialist, or L3 worker
- **Sub-Agent** - Add specialist to existing pipeline
- **RAG Pipeline** - Full L1 orchestrator + L2 specialists
- **Skill Package** - RAG-enhanced skill with context and workflows
- **Hook** - PreToolUse, PostToolUse, UserPromptSubmit triggers
- **Slash Command** - Custom commands for Claude Code

### MCP Server Explorer

Discover and install MCP servers to extend Claude's capabilities:

```bash
# Interactive menu
ccasp explore-mcp

# Smart recommendations based on your tech stack
ccasp explore-mcp --recommend

# Quick install testing MCPs (Playwright + Puppeteer)
ccasp explore-mcp --testing
```

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
ccasp claude-audit

# Audit specific component
ccasp claude-audit --mode claudemd   # Just CLAUDE.md files
ccasp claude-audit --mode folder     # Just .claude/ structure
```

**What it checks:**
- **CLAUDE.md file length** - Warns if >150 lines, errors if >300 lines
- **Anti-patterns** - Long code blocks, vague instructions, self-evident rules
- **Good patterns** - Emphasis keywords (IMPORTANT, MUST), bash commands, @imports
- **Folder structure** - Verifies commands/, skills/, agents/, hooks/, settings.json
- **Frontmatter validation** - Skills and agents have required fields

### Phased Development Plans

Create comprehensive development plans with 95%+ success probability:

```bash
# Interactive wizard
ccasp create-phase-dev

# Force specific scale
ccasp create-phase-dev --scale M        # Medium: 3-4 phases
ccasp create-phase-dev --scale L        # Large: 5+ phases

# Autonomous mode (minimal prompts)
ccasp create-phase-dev --autonomous --name "My Project"
```

**What gets generated:**
- `PROGRESS.json` - Task tracking and state management
- `EXECUTIVE_SUMMARY.md` - Project overview
- RAG Phase Executor Agent - Autonomous phase execution
- Interactive Slash Command - `/phase-dev-{project-slug}`
- Enforcement Hooks - Pattern and quality enforcement

### Roadmap Integration

Bridge your local `/create-roadmap` roadmaps with GitHub Project Board:

```bash
# Interactive menu
ccasp roadmap

# Import roadmap projects as GitHub issues
ccasp roadmap import --file=.claude/docs/tech-debt-2025/ROADMAP.json

# Sync progress to GitHub
ccasp roadmap sync

# Create ROADMAP.json from existing GitHub issues
ccasp roadmap create --from-issues

# Show sync status dashboard
ccasp roadmap status
```

### GitHub Task Management

```bash
# Create a task with codebase analysis
ccasp create

# Decompose issue into tasks
ccasp decompose 123

# Sync tasks bidirectionally
ccasp sync watch 123

# List recent tasks
ccasp list
```

### Testing

```bash
# Configure testing environment
ccasp test-setup

# Run tests
ccasp test                   # Use configured mode
ccasp test --mode ralph      # Test-fix cycle until all pass
ccasp test --mode manual     # Run once
ccasp test --mode watch      # Interactive Playwright UI
ccasp test --headed          # Show browser
```

## Commands Reference

### Terminal Commands (PowerShell/Bash)

| Command | Description |
|---------|-------------|
| `ccasp init` | **Deploy slash commands to project** |
| `ccasp` | Interactive menu |
| `ccasp create-agent` | Agent creation menu |
| `ccasp create-hook` | Create enforcement hook |
| `ccasp create-command` | Create slash command |
| `ccasp create-skill` | Create RAG skill package |
| `ccasp claude-settings` | Configure Claude CLI settings |
| `ccasp explore-mcp` | Discover and install MCP servers |
| `ccasp claude-audit` | Audit CLAUDE.md & .claude/ folder |
| `ccasp create-phase-dev` | Create phased development plan |
| `ccasp roadmap` | Roadmap integration |
| `ccasp create` | Create GitHub issue with analysis |
| `ccasp decompose <issue>` | Break down issue into tasks |
| `ccasp sync` | Sync tasks with GitHub |
| `ccasp list` | List recent tasks |
| `ccasp test-setup` | Configure testing environment |
| `ccasp test` | Run tests |

### Slash Commands (Claude Code CLI)

After running `ccasp init`, these slash commands are available in Claude Code:

| Command | Description |
|---------|-------------|
| `/menu` | Interactive ASCII menu for all commands |
| `/e2e-test` | Run E2E tests with Playwright |
| `/github-task` | Create GitHub issues with codebase analysis |
| `/phase-dev-plan` | Create phased development plans |
| `/create-agent` | Create L1/L2/L3 agents |
| `/create-hook` | Build enforcement hooks |
| `/create-skill` | Create RAG skill packages |
| `/explore-mcp` | Discover MCP servers |
| `/claude-audit` | Audit CLAUDE.md and .claude/ |
| `/roadmap-sync` | Sync roadmaps with GitHub |
| `/claude-settings` | Configure permissions |
| `/codebase-explorer` | Analyze codebase structure |
| `/rag-pipeline` | Generate RAG pipelines |

## CLI Aliases

The package provides multiple command aliases for convenience:

- `ccasp` - Short form (Claude CLI Advanced Starter Pack)
- `claude-advanced` - Medium form
- `claude-cli-advanced-starter-pack` - Full name

## Configuration

Configuration is stored in `.gtaskrc` (YAML format) for GitHub integration.

```yaml
project_board:
  owner: "myuser"
  repo: "my-project"
  project_number: 1
```

## API Usage

```javascript
import {
  runCreateAgent,
  runExploreMcp,
  runClaudeAudit,
  runCreatePhaseDev,
  analyzeForIssue,
  generateIssueBody,
} from 'claude-cli-advanced-starter-pack';

// Analyze codebase for MCP recommendations
const analysis = await analyzeForIssue(['authentication', 'login']);

// Generate issue body with code references
const body = generateIssueBody({
  description: 'Fix login bug',
  codeAnalysis: analysis,
});
```

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

MIT
