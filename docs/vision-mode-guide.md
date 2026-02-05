# Vision Mode - Complete Guide

Vision Mode transforms natural language prompts into complete, working MVPs through intelligent planning, parallel agent orchestration, and self-correcting execution loops.

## Quick Start

```bash
# Initialize a vision from a natural language prompt
ccasp vision init "Build a kanban board with drag-and-drop, real-time collaboration, and mobile support"

# Check status of your visions
ccasp vision status

# Start autonomous execution
ccasp vision run my-kanban-app

# Monitor with web dashboard (real-time updates)
ccasp vision dashboard
```

## Architecture

Vision Mode operates at a higher level than epics or roadmaps:

```
VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
```

A single Vision can spawn multiple Epics, each with their own Roadmaps, Phases, and Tasks.

## The 8-Stage Orchestrated Workflow

### Stage 1: Initialization

**Input:** Natural language prompt describing what you want to build.

```bash
ccasp vision init "Build a todo app with React frontend, FastAPI backend, and PostgreSQL database"
```

**What happens:**
- Parses your prompt to extract intent, features, and constraints
- Generates a unique slug (e.g., `todo-app-react-fastapi`)
- Detects account requirements (GitHub OAuth, database credentials, etc.)
- Creates `VISION.json` in `.claude/visions/{slug}/`

### Stage 2: Analysis

**Automated research to inform architecture decisions.**

- **Web Search:** Finds similar apps for inspiration
- **Tool Discovery:** Identifies npm/pip packages you'll need
- **MCP Matching:** Matches relevant MCP servers from your configuration
- **Account Detection:** Lists required API keys and OAuth providers

### Stage 3: Architecture

**Generates architectural artifacts.**

- **Mermaid Diagrams:** Component, data flow, and sequence diagrams
- **ASCII Wireframes:** UI mockups in text format
- **API Contracts:** OpenAPI-style endpoint definitions
- **State Design:** Zustand stores or equivalent state management

### Stage 4: Security Scan

**Pre-install vulnerability detection.**

- npm audit for Node.js packages
- pip-audit for Python packages
- OSV Scanner for comprehensive vulnerability database
- Blocks packages with critical vulnerabilities

### Stage 5: Agent Creation

**Spawns specialized agents based on your tech stack.**

| Detected Tech | Agent Created |
|---------------|---------------|
| React/Vue/Angular | Frontend Specialist |
| FastAPI/Express | Backend Specialist |
| PostgreSQL/MongoDB | Database Specialist |
| Playwright/Jest | Testing Specialist |
| Always | Orchestrator Agent |

### Stage 6: Execution

**Autonomous development loop.**

```
Execute Tasks → Run Tests → Self-Heal Failures → Repeat
```

- Runs until MVP is 100% complete or manual intervention needed
- Self-healing attempts to fix test failures automatically
- Escalates to human after 3 failed self-heal attempts

### Stage 7: Validation

**Verifies MVP completeness.**

- Runs full test suite
- Checks all features implemented
- Validates architecture compliance
- Reports completion percentage

### Stage 8: Completion

**Final checkpoint and reporting.**

- Creates completion checkpoint
- Updates VISION.json status to `completed`
- Generates final report

## CLI Commands

### Initialize a Vision

```bash
# Interactive mode
ccasp vision init

# With prompt
ccasp vision init "Your app description"

# With options
ccasp vision init "E-commerce site" --title "Shop MVP" --priority high --tags "mvp,saas"
```

### Check Status

```bash
# List all visions
ccasp vision status

# Specific vision
ccasp vision status my-app

# JSON output
ccasp vision status my-app --json
```

### Execute a Vision

```bash
# Start autonomous execution
ccasp vision run my-app

# Manual step-by-step mode
ccasp vision run my-app --manual

# Limit iterations
ccasp vision run my-app --max-iterations 50
```

### Web Dashboard

```bash
# Default port (3847)
ccasp vision dashboard

# Custom port
ccasp vision dashboard --port 8080

# Expose on network
ccasp vision dashboard --host 0.0.0.0
```

### Security Scan

```bash
# Scan all packages
ccasp vision scan

# JSON output
ccasp vision scan --json
```

## Slash Commands

Use these inside Claude Code CLI:

| Command | Description |
|---------|-------------|
| `/vision-init` | Initialize vision interactively |
| `/vision-status` | View vision status dashboard |
| `/vision-run` | Start autonomous execution |
| `/vision-adjust` | Adjust plan when drift detected |
| `/vision-dashboard` | Start web dashboard |

## Web Dashboard Features

The dashboard at `http://localhost:3847` provides:

- **Summary Cards:** Total, Active, Completed, Drift Events
- **Vision List:** Filterable by status (executing, paused, completed, failed)
- **Progress Tracking:** Visual progress and alignment bars
- **Detail Modal:** Click any vision for full status
- **Real-Time Updates:** WebSocket connection refreshes every 2 seconds

## Example Workflows

### Example 1: Todo App

```bash
# Initialize
ccasp vision init "Build a todo app with React, FastAPI, and SQLite"

# Check generated architecture
ccasp vision status todo-app-react

# Run execution
ccasp vision run todo-app-react

# Monitor in browser
ccasp vision dashboard
```

### Example 2: E-commerce MVP

```bash
# Initialize with high priority
ccasp vision init "E-commerce site with product catalog, shopping cart, and Stripe checkout" \
  --title "Shop MVP" \
  --priority high \
  --tags "mvp,saas,e-commerce"

# Review analysis results
ccasp vision analyze shop-mvp

# View architecture
ccasp vision architect shop-mvp

# Execute when ready
ccasp vision run shop-mvp
```

### Example 3: Real-time Dashboard

```bash
# Initialize
ccasp vision init "Real-time analytics dashboard with WebSocket updates and charts"

# Skip to execution (if you trust the defaults)
ccasp vision run real-time-analytics

# Watch progress in dashboard
ccasp vision dashboard
```

## Vision File Structure

```
.claude/visions/{slug}/
├── VISION.json           # Main vision definition
├── checkpoints/          # Saved states
│   ├── initialization/
│   ├── analysis/
│   ├── architecture/
│   └── completed/
└── agents/               # Generated agent templates
```

## VISION.json Schema

```json
{
  "slug": "my-app",
  "title": "My App",
  "status": "executing",
  "prompt": {
    "original": "Build a...",
    "intent": "create_app",
    "features": ["feature1", "feature2"]
  },
  "orchestrator": {
    "stage": "execution",
    "stage_history": [...]
  },
  "analysis": {
    "similarApps": [...],
    "npmPackages": [...],
    "mcpServers": [...]
  },
  "architecture": {
    "diagrams": {...},
    "componentList": [...],
    "apiContracts": {...}
  },
  "agents": [...],
  "security": {
    "lastScan": "2026-02-05T...",
    "vulnerabilityCount": 0
  },
  "observer": {
    "current_alignment": 0.95,
    "drift_events": [],
    "adjustments_made": 0
  },
  "execution_plan": {
    "roadmaps": [...]
  }
}
```

## Observer and Drift Detection

Vision Mode includes a hook-based observer that monitors:

- **Alignment:** How closely execution matches the original plan
- **Drift Events:** Significant deviations from the plan
- **Auto-Adjustments:** Automatic plan corrections

When alignment drops below 90%, the observer recommends using `/vision-adjust` to review and update the plan.

## Best Practices

1. **Start Specific:** More detailed prompts yield better results
   - Good: "Build a kanban board with drag-and-drop cards, user authentication, and real-time sync"
   - Vague: "Build a project management app"

2. **Review Analysis:** Check the analysis results before executing
   ```bash
   ccasp vision status my-app
   ```

3. **Use Dashboard:** Monitor long-running executions in the web dashboard

4. **Handle Pauses:** If execution pauses, review failures and use `/vision-adjust`

5. **Security First:** Always review security scan results before proceeding

## Troubleshooting

### Vision Stuck in "Executing"

```bash
# Check status for details
ccasp vision status my-app

# Review failures in dashboard
ccasp vision dashboard
```

### Security Blocked Packages

```bash
# View blocked packages
ccasp vision scan --json

# Find alternatives and adjust plan
/vision-adjust my-app
```

### Low Alignment Score

```bash
# View drift events
ccasp vision status my-app

# Adjust plan to realign
/vision-adjust my-app
```

## Related Commands

- `/phase-dev-plan` — Create phased development plans
- `/create-roadmap` — Multi-phase roadmap coordination
- `/create-github-epic` — GitHub epic management
- `/deploy-full` — Full-stack deployment

---

*Vision Mode is part of CCASP (Claude CLI Advanced Starter Pack) - Autonomous MVP development from natural language.*
