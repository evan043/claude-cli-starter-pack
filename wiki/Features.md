# Features

CCASP provides optional features that extend Claude Code CLI capabilities. Each feature adds specific commands, hooks, and integrations.

## Feature Overview

| Feature | Description | Commands Added | Requires Config |
|---------|-------------|----------------|-----------------|
| **GitHub Integration** | Project Board tracking | `/github-update`, `/github-task-start` | Yes |
| **Phased Development** | 95%+ success planning | `/phase-dev-plan`, `/phase-track` | No |
| **Token Management** | API usage tracking | `/context-audit` | No |
| **Deployment Automation** | Full-stack deploy | `/deploy-full` | Yes |
| **Tunnel Services** | Expose local server | `/tunnel-start`, `/tunnel-stop` | Yes |
| **Happy Mode** | Mobile app integration | `/happy-start` | Yes |

## Feature Presets

During setup, choose a preset:

| Preset | Features Included |
|--------|-------------------|
| **A - Minimal** | Core commands only |
| **B - Standard** | + GitHub + Phased Dev |
| **C - Full** | + Deployment + Tunnels + Token Mgmt |
| **D - Custom** | Pick individual features |

---

## GitHub Integration

Connect Claude Code CLI to your GitHub Project Board for automated tracking.

### What It Does

- View Project Board status from Claude
- Start/complete tasks with automatic updates
- Create issues with codebase analysis
- Track progress across sessions

### Commands

#### `/github-update`

View current Project Board status:
```
/github-update
```

Shows:
- Tasks by status (Todo, In Progress, Done)
- Your assigned items
- Recent activity

#### `/github-task-start`

Start or complete a task:
```
/github-task-start 123              # Start task #123
/github-task-start 123 --complete   # Mark as complete
```

### Configuration

After enabling, configure in Project Settings:

```json
// tech-stack.json
{
  "github": {
    "owner": "your-username",
    "repo": "your-repo",
    "projectNumber": 3
  }
}
```

### Hooks Added

- `github-progress-hook` - Tracks commits and updates issues
- `issue-completion-detector` - Detects when tasks are done

### Prerequisites

```bash
gh auth login   # Authenticate GitHub CLI
gh auth status  # Verify authentication
```

---

## Phased Development

Create development plans with 95%+ success probability.

### What It Does

- Breaks complex tasks into phases
- Defines clear success criteria
- Tracks progress in PROGRESS.json
- Scales automatically (S/M/L/XL)

### Commands

#### `/phase-dev-plan`

Create a new phased development plan:
```
/phase-dev-plan
```

Interactive wizard asks:
1. Project name
2. Description
3. Scale (S/M/L/XL)
4. Success criteria

#### `/phase-track`

Track progress on existing plan:
```
/phase-track feature-name
```

Shows:
- Current phase
- Completed tasks
- Remaining work
- Success criteria status

### Generated Files

```
.claude/phase-dev/feature-name/
├── PROGRESS.json          # State tracking
├── EXECUTIVE_SUMMARY.md   # Project overview
├── phases/
│   ├── phase-1.md
│   ├── phase-2.md
│   └── ...
└── command.md             # /phase-dev-feature-name
```

### PROGRESS.json Structure

```json
{
  "project": "feature-name",
  "scale": "M",
  "currentPhase": 2,
  "phases": [
    {
      "number": 1,
      "name": "Setup",
      "status": "completed",
      "tasks": [
        { "name": "Create schema", "done": true },
        { "name": "Setup routes", "done": true }
      ]
    },
    {
      "number": 2,
      "name": "Implementation",
      "status": "in_progress",
      "tasks": [
        { "name": "Build UI", "done": false },
        { "name": "Add tests", "done": false }
      ]
    }
  ],
  "successCriteria": [
    { "criterion": "All tests pass", "met": false },
    { "criterion": "No TypeScript errors", "met": true }
  ]
}
```

### Hooks Added

- `phase-dev-enforcer` - Ensures phase completion before moving on

---

## Token Management

Track Claude API token usage with automatic warnings.

### What It Does

- Monitors tokens per session
- Warns at configurable thresholds
- Suggests context archiving
- Tracks usage over time

### Commands

#### `/context-audit`

Audit current context usage:
```
/context-audit
```

Shows:
- Tokens used this session
- Estimated tokens remaining
- Largest context contributors
- Archiving suggestions

### Configuration

```json
// tech-stack.json
{
  "tokenManagement": {
    "enabled": true,
    "warningThreshold": 80000,
    "maxTokens": 100000,
    "autoArchive": false
  }
}
```

### Hooks Added

- `token-budget-loader` - Tracks token usage
- `context-guardian` - Warns at thresholds
- `tool-output-cacher` - Caches large outputs

### Thresholds

| Percentage | Action |
|------------|--------|
| 80% | Warning shown |
| 90% | Strong warning + archive suggestion |
| 100% | Operation blocked |

---

## Deployment Automation

Automated full-stack deployment workflows.

### What It Does

- Deploys frontend and backend together
- Supports multiple platforms
- Handles environment variables
- Verifies deployment success

### Commands

#### `/deploy-full`

Deploy full stack:
```
/deploy-full
```

Steps:
1. Build frontend
2. Deploy frontend (Cloudflare/Vercel)
3. Deploy backend (Railway/Heroku)
4. Verify both deployments

### Supported Platforms

| Frontend | Backend |
|----------|---------|
| Cloudflare Pages | Railway |
| Vercel | Heroku |
| Netlify | Fly.io |
| AWS S3 | AWS Lambda |

### Configuration

```json
// tech-stack.json
{
  "deployment": {
    "frontend": {
      "platform": "cloudflare",
      "projectName": "my-app",
      "buildCommand": "npm run build",
      "outputDir": "dist"
    },
    "backend": {
      "platform": "railway",
      "projectId": "abc123",
      "serviceId": "def456",
      "environmentId": "ghi789"
    }
  }
}
```

### Hooks Added

- `deployment-orchestrator` - Coordinates deployment steps

### MCP Integration

Uses Railway MCP server for backend deployment:
```
mcp__railway-mcp-server__deployment_trigger
mcp__railway-mcp-server__deployment_status
mcp__railway-mcp-server__deployment_logs
```

---

## Tunnel Services

Expose local development server for testing or webhooks.

### What It Does

- Creates secure tunnel to localhost
- Generates public URL
- Supports multiple providers
- Auto-configures for mobile testing

### Commands

#### `/tunnel-start`

Start a tunnel:
```
/tunnel-start
/tunnel-start --port 3000
/tunnel-start --provider ngrok
```

#### `/tunnel-stop`

Stop active tunnel:
```
/tunnel-stop
```

### Supported Providers

| Provider | Free Tier | Custom Subdomain |
|----------|-----------|------------------|
| ngrok | Yes | Paid |
| localtunnel | Yes | Yes |
| cloudflare-tunnel | Yes | Yes |
| serveo | Yes | No |

### Configuration

```json
// tech-stack.json
{
  "tunnel": {
    "provider": "ngrok",
    "defaultPort": 5173,
    "authtoken": "your-ngrok-token"
  }
}
```

### Use Cases

- Mobile device testing
- Webhook development
- Sharing work in progress
- External API callbacks

---

## Happy Mode

Integration with Happy Coder mobile app for remote session control.

### What It Does

- Control Claude sessions from mobile
- Create checkpoints
- View session status
- Mobile-optimized responses

### Commands

#### `/happy-start`

Start Happy mode:
```
/happy-start
```

### Configuration

```json
// tech-stack.json
{
  "happy": {
    "enabled": true,
    "serverUrl": "https://your-happy-server.com",
    "autoConnect": false
  }
}
```

### Hooks Added

- `happy-checkpoint-manager` - Creates session checkpoints
- `happy-title-generator` - Auto-titles sessions
- `happy-mode-detector` - Detects mobile app connection

### Features

- **Checkpoints**: Save session state at key points
- **Remote Control**: Start/stop/restart sessions from phone
- **Status Updates**: Real-time progress notifications
- **Mobile UI**: Optimized output format for small screens

---

## Configuring Features

### Via Setup Wizard

```bash
ccasp wizard
# Select: 8. Project Settings
```

### Via tech-stack.json

Edit `.claude/tech-stack.json`:

```json
{
  "features": {
    "githubIntegration": true,
    "phasedDevelopment": true,
    "tokenManagement": true,
    "deploymentAutomation": true,
    "tunnelServices": false,
    "happyMode": false
  }
}
```

### Via Slash Command

```
/menu
# Select: Project Settings
```

## Adding Features Later

You can add features after initial setup:

```bash
ccasp wizard
# Select: 2. Full Setup
# Choose new features
```

Or manually:
1. Edit `tech-stack.json` to enable feature
2. Copy relevant command templates from `node_modules/claude-cli-advanced-starter-pack/templates/`
3. Restart Claude Code CLI

## See Also

- [Getting Started](Getting-Started) - Initial setup
- [Hooks](Hooks) - Feature hooks in detail
- [Phased Development](Phased-Development) - Deep dive
