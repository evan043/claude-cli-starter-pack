# Claude CLI Advanced Starter Pack

**Advanced Claude Code CLI Toolkit - Agents, Hooks, Skills, MCP Servers, Phased Development, and GitHub Integration**

A platform-agnostic toolkit for supercharging your Claude Code CLI experience with:
- Vibe-code friendly setup wizard (mobile-ready, single-character inputs)
- Tech stack auto-detection and template-based configuration
- L1/L2/L3 agent hierarchy, hooks, and RAG-enhanced skills
- GitHub Project Board integration with codebase analysis
- Phased development planning with 95%+ success rate

## Quick Start

```bash
# Install globally
npm install -g claude-cli-advanced-starter-pack

# Run the vibe-code friendly setup wizard (recommended)
ccasp wizard

# Or quick init with auto-detection
ccasp init
```

After installation, a welcome message shows your options:

```
🚀 Claude CLI Advanced Starter Pack

✓ Installation complete!

Quick Setup Options:

1. Run vibe-friendly setup wizard:
   $ npx ccasp wizard

2. Quick init (auto-detect + deploy):
   $ npx ccasp init

3. Full interactive menu:
   $ npx ccasp
```

## Features

### Vibe-Code Friendly Setup Wizard

Mobile-ready setup with single-character inputs:

```
🚀 CCASP Setup Wizard

? What would you like to do?
  1. Quick Start      - Detect stack + init .claude
  2. Full Setup       - All features + customization
  3. GitHub Setup     - Connect project board
  4. Audit CLAUDE.md  - Check existing config
  5. Enhance CLAUDE.md - Generate/improve docs
  6. Detect Tech Stack - Auto-detect project
  7. View Templates   - Browse available items
  8. Project Settings - Configure deployment, tunnels, etc.
  0. Exit
```

**Feature Presets** (just type A, B, C, or D):
| Letter | Preset | Features |
|--------|--------|----------|
| A | Minimal | Menu + help only |
| B | Standard | GitHub + phased dev (recommended) |
| C | Full | All features including deployment |
| D | Custom | Pick individual features |

### Tech Stack Auto-Detection

Automatically detects your project's tech stack from:
- `package.json` - Frontend/backend frameworks, testing tools
- Configuration files - Vite, Next.js, Playwright, Jest
- Git remotes - Repository info
- Directory structure - src/, apps/, backend/, etc.

Generates `tech-stack.json` with all detected values for template placeholders.

### Platform-Agnostic Templates

All templates use `{{placeholder}}` syntax - no hardcoded values:

```markdown
{{#if deployment.backend.platform}}
## Backend Deployment

{{#if (eq deployment.backend.platform "railway")}}
Using Railway MCP:
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})
{{/if}}

{{#if (eq deployment.backend.platform "vercel")}}
Using Vercel:
vercel --prod
{{/if}}
{{/if}}
```

### Claude Code Tooling

- **Agent Creation Suite** - Create L1 orchestrators, L2 specialists, L3 workers, and RAG pipelines
- **Hook Generator** - Build PreToolUse, PostToolUse, and UserPromptSubmit enforcement hooks
- **Skill Builder** - Create RAG-enhanced skill packages with context and workflows
- **Command Generator** - Create custom slash commands for Claude Code
- **Claude Settings** - Configure permissions, agent-only mode, and allow/deny rules
- **Claude Audit + Enhance** - Verify and generate CLAUDE.md against Anthropic best practices

### Optional Features

Select during setup - each adds specific commands and hooks:

| Feature | Description | Commands Added |
|---------|-------------|----------------|
| **GitHub Integration** | Project Board tracking, issue creation | `/github-update`, `/github-task-start` |
| **Token Management** | API usage tracking with thresholds | `/context-audit` |
| **Phased Development** | 95%+ success rate planning | `/phase-dev-plan`, `/phase-track` |
| **Deployment Automation** | Railway, Vercel, Cloudflare, self-hosted | `/deploy-full` |
| **Tunnel Services** | ngrok, localtunnel, cloudflare-tunnel | `/tunnel-start`, `/tunnel-stop` |
| **Happy Mode** | Mobile app integration | `/happy-start` |

Features marked with (*) require post-install configuration via `/menu` → Project Settings.

### MCP Server Explorer

Discover and install MCP servers based on your tech stack:

```bash
ccasp explore-mcp              # Interactive menu
ccasp explore-mcp --recommend  # Auto-recommend based on codebase
ccasp explore-mcp --testing    # Quick install Playwright + Puppeteer
```

**Available Categories:** Testing, VCS, Deployment, Database, Automation, Communication, Utilities

### Phased Development Plans

Create comprehensive development plans with 95%+ success probability:

```bash
ccasp create-phase-dev                    # Interactive wizard
ccasp create-phase-dev --scale M          # Medium: 3-4 phases
ccasp create-phase-dev --autonomous       # Minimal prompts
```

**Generated Artifacts:**
- `PROGRESS.json` - Task tracking and state management
- `EXECUTIVE_SUMMARY.md` - Project overview
- Phase Executor Agent - Autonomous execution
- Slash Command - `/phase-dev-{project-slug}`

### GitHub Integration

```bash
ccasp create              # Create issue with codebase analysis
ccasp decompose 123       # Break down issue into tasks
ccasp sync watch 123      # Bidirectional sync
ccasp list                # List recent tasks
```

## Installation Paths

### Path A: Vibe Wizard (Recommended)

```bash
npm install -g claude-cli-advanced-starter-pack
ccasp wizard
```

Single-character inputs, mobile-friendly, progressive disclosure.

### Path B: Quick Init

```bash
npx claude-cli-advanced-starter-pack init
```

Auto-detects tech stack, deploys commands with minimal prompts.

### Path C: Full Wizard

```bash
ccasp project-init
```

Full interactive wizard with all configuration options.

## What Gets Installed

After running init, your project gets:

```
.claude/
├── commands/           # Slash commands
│   ├── menu.md
│   ├── ccasp-setup.md  # Setup wizard (always included)
│   ├── github-update.md
│   └── ...
├── agents/             # Agent definitions
├── skills/             # Skill packages
├── hooks/              # Enforcement hooks
├── docs/               # Generated documentation
├── settings.json       # Project settings
└── tech-stack.json     # Detected/configured values
```

**Safe Integration:** Existing `.claude/` folders are preserved - new files are added alongside.

## After Installation

**Important:** Changes to `.claude/` require a new Claude Code session.

```
⚠️  RESTART REQUIRED

Changes to .claude/ require a new Claude Code session.

To apply changes:
1. Exit this session (Ctrl+C or /exit)
2. Restart: claude or claude .
3. New commands will be available
```

## Commands Reference

### Terminal Commands

| Command | Description |
|---------|-------------|
| `ccasp wizard` | **Vibe-code friendly setup wizard** |
| `ccasp init` | Deploy slash commands to project |
| `ccasp` | Interactive menu |
| `ccasp detect-stack` | Auto-detect tech stack |
| `ccasp claude-audit` | Audit CLAUDE.md & .claude/ |
| `ccasp create-agent` | Agent creation menu |
| `ccasp create-hook` | Create enforcement hook |
| `ccasp create-skill` | Create RAG skill package |
| `ccasp explore-mcp` | Discover MCP servers |
| `ccasp create-phase-dev` | Create phased development plan |
| `ccasp roadmap` | Roadmap integration |

### Slash Commands (After Init)

| Command | Description |
|---------|-------------|
| `/menu` | Interactive ASCII menu |
| `/ccasp-setup` | Setup wizard (vibe-code friendly) |
| `/e2e-test` | Run E2E tests with Playwright |
| `/github-update` | View GitHub Project Board status |
| `/github-task-start` | Start/complete GitHub task |
| `/phase-dev-plan` | Create phased development plans |
| `/phase-track` | Track phased development progress |
| `/deploy-full` | Full-stack deployment |
| `/create-agent` | Create L1/L2/L3 agents |
| `/create-hook` | Build enforcement hooks |
| `/explore-mcp` | Discover MCP servers |
| `/claude-audit` | Audit CLAUDE.md |

## Configuration

### tech-stack.json

Auto-generated during init with detected values:

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-project",
    "type": "fullstack"
  },
  "frontend": {
    "framework": "react",
    "port": 5173
  },
  "backend": {
    "framework": "fastapi",
    "port": 8001
  },
  "deployment": {
    "backend": {
      "platform": "railway",
      "projectId": "{{DEPLOY_BACKEND_PROJECT_ID}}"
    }
  },
  "githubIntegration": { "enabled": true },
  "phasedDevelopment": { "enabled": true },
  "tokenManagement": { "enabled": false }
}
```

### Post-Install Configuration

For features requiring additional setup, use the Project Settings menu:

```bash
ccasp wizard
# Select: 8. Project Settings
```

Or from Claude Code CLI:
```
/menu → Project Settings
```

Configure:
- GitHub Project Board connection
- Deployment platform credentials
- Tunnel service selection
- Token management thresholds
- Happy Mode settings

## Template Engine

Supports advanced templating:

```handlebars
{{#if condition}}...{{/if}}
{{#if (eq path "value")}}...{{/if}}
{{#each array}}{{this}}{{/each}}
${CWD}, ${HOME} path variables
```

## Prerequisites

1. **Node.js 18+**
2. **GitHub CLI** (`gh`) - For GitHub integration features

```bash
gh --version   # Should be 2.40+
node --version # Should be 18+
gh auth login  # Authenticate
```

## API Usage

```javascript
import {
  runSetupWizard,
  detectTechStack,
  runClaudeAudit,
  runEnhancement,
  ENHANCEMENT_TEMPLATES,
  replacePlaceholders,
} from 'claude-cli-advanced-starter-pack';

// Detect tech stack
const techStack = await detectTechStack(process.cwd());

// Generate CLAUDE.md content
const content = ENHANCEMENT_TEMPLATES.fullTemplate(techStack, 'My Project');

// Process templates with values
const { content, warnings } = replacePlaceholders(template, techStack);
```

## CLI Aliases

- `ccasp` - Short form (recommended)
- `ccasp w` - Wizard shortcut
- `claude-advanced` - Medium form
- `claude-cli-advanced-starter-pack` - Full name

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                CLAUDE CLI ADVANCED STARTER PACK              │
│                                                              │
│  npm install → postinstall message → ccasp wizard            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Tech Stack  │  │  Template   │  │   Feature   │          │
│  │  Detection  │→ │   Engine    │→ │  Selection  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │              YOUR PROJECT (.claude/)             │        │
│  │  commands/ │ agents/ │ skills/ │ hooks/ │ docs/ │        │
│  └─────────────────────────────────────────────────┘        │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │           CLAUDE CODE CLI (restart required)     │        │
│  │  /menu │ /ccasp-setup │ /github-update │ ...    │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Contributing

Contributions welcome! Please read our contributing guidelines first.

## License

MIT

---

**Made for Claude Code CLI** - Supercharge your AI-assisted development workflow.
