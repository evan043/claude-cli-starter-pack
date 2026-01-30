# Claude CLI Starter Pack

**Complete Claude Code CLI Toolkit - Agents, Hooks, Skills, MCP Servers, and GitHub Integration**

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
# Install globally
npm install -g claude-cli-starter-pack

# Or run without installing
npx claude-cli-starter-pack

# Launch interactive menu
ccsp

# Quick commands
ccsp create-agent       # Create agents, hooks, skills
ccsp explore-mcp        # Discover MCP servers
ccsp claude-audit       # Audit your Claude setup
ccsp create-phase-dev   # Create phased development plan
```

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
ccsp
```

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║    ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╦  ╦  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗            ║
║    ║  ║  ╠═╣║ ║ ║║║╣   ╚═╗║  ║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝            ║
║    ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╚═╝╩═╝╩  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═            ║
║                                                                   ║
║   Complete Claude Code CLI Toolkit - Agents, MCP, GitHub & More   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

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
ccsp create-agent

# Create enforcement hook
ccsp create-hook

# Create slash command
ccsp create-command

# Create RAG-enhanced skill package
ccsp create-skill
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
ccsp explore-mcp

# Smart recommendations based on your tech stack
ccsp explore-mcp --recommend

# Quick install testing MCPs (Playwright + Puppeteer)
ccsp explore-mcp --testing
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
ccsp claude-audit

# Audit specific component
ccsp claude-audit --mode claudemd   # Just CLAUDE.md files
ccsp claude-audit --mode folder     # Just .claude/ structure
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
ccsp create-phase-dev

# Force specific scale
ccsp create-phase-dev --scale M        # Medium: 3-4 phases
ccsp create-phase-dev --scale L        # Large: 5+ phases

# Autonomous mode (minimal prompts)
ccsp create-phase-dev --autonomous --name "My Project"
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
ccsp roadmap

# Import roadmap projects as GitHub issues
ccsp roadmap import --file=.claude/docs/tech-debt-2025/ROADMAP.json

# Sync progress to GitHub
ccsp roadmap sync

# Create ROADMAP.json from existing GitHub issues
ccsp roadmap create --from-issues

# Show sync status dashboard
ccsp roadmap status
```

### GitHub Task Management

```bash
# Create a task with codebase analysis
ccsp create

# Decompose issue into tasks
ccsp decompose 123

# Sync tasks bidirectionally
ccsp sync watch 123

# List recent tasks
ccsp list
```

### Testing

```bash
# Configure testing environment
ccsp test-setup

# Run tests
ccsp test                   # Use configured mode
ccsp test --mode ralph      # Test-fix cycle until all pass
ccsp test --mode manual     # Run once
ccsp test --mode watch      # Interactive Playwright UI
ccsp test --headed          # Show browser
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `ccsp` | Interactive menu |
| `ccsp create-agent` | Agent creation menu |
| `ccsp create-hook` | Create enforcement hook |
| `ccsp create-command` | Create slash command |
| `ccsp create-skill` | Create RAG skill package |
| `ccsp claude-settings` | Configure Claude CLI settings |
| `ccsp explore-mcp` | Discover and install MCP servers |
| `ccsp claude-audit` | Audit CLAUDE.md & .claude/ folder |
| `ccsp create-phase-dev` | Create phased development plan |
| `ccsp roadmap` | Roadmap integration |
| `ccsp create` | Create GitHub issue with analysis |
| `ccsp decompose <issue>` | Break down issue into tasks |
| `ccsp sync` | Sync tasks with GitHub |
| `ccsp list` | List recent tasks |
| `ccsp test-setup` | Configure testing environment |
| `ccsp test` | Run tests |

## CLI Aliases

The package provides multiple command aliases for convenience:

- `ccsp` - Short form (Claude CLI Starter Pack)
- `claude-starter` - Medium form
- `claude-cli-starter-pack` - Full name

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
} from 'claude-cli-starter-pack';

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
