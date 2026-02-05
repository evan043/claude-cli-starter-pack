# CCASP Templates Index

Complete catalog of all slash commands and hook templates included in Claude CLI Advanced Starter Pack.

## Slash Commands

### Vision Mode & Orchestration

| Command | Description |
|---------|-------------|
| `/vision-init` | Initialize autonomous MVP development from natural language prompt |
| `/vision-run` | Execute Vision orchestration workflow |
| `/vision-status` | View Vision progress and alignment metrics |
| `/vision-adjust` | Adjust Vision plan when drift detected |
| `/vision-dashboard` | Open real-time web dashboard at localhost:3847 |

### Planning & Development

| Command | Description |
|---------|-------------|
| `/create-roadmap` | Transform project ideas into multi-phase roadmaps with GitHub integration |
| `/roadmap-status` | View roadmap progress dashboard |
| `/roadmap-edit` | Reorder, merge, or split roadmap phases |
| `/roadmap-track` | Execute roadmap with dependency checking |
| `/adopt-roadmap` | Adopt external roadmap into project |
| `/phase-dev-plan` | Create phased development plans with 95%+ success probability |
| `/phase-track` | Execute phase development plan |
| `/create-task-list` | Generate AI-powered task lists for single features |
| `/create-task-list-for-issue` | Convert GitHub issue into actionable task list |

### GitHub Integration

| Command | Description |
|---------|-------------|
| `/create-github-epic` | Create multi-issue epic workflows with child issue tracking |
| `/epic-advance` | Advance to next phase in GitHub epic |
| `/github-epic-status` | View epic completion status and progress |
| `/github-epic-menu` | Interactive epic management menu |
| `/github-task-start` | Start or complete tasks from GitHub Project Board |
| `/github-task-multiple` | Batch operations on multiple GitHub tasks |
| `/github-menu-issues-list` | Browse and manage GitHub issues |
| `/github-project-menu` | Project Board management interface |

### Testing & Quality

| Command | Description |
|---------|-------------|
| `/ralph` | Continuous test-fix cycle until all tests pass |
| `/golden-master` | Create characterization tests before refactoring |
| `/create-smoke-test` | Generate smoke tests for critical functionality |
| `/security-scan` | Run comprehensive security audit on codebase |
| `/perf-profile` | Performance profiling and optimization analysis |

### Refactoring

| Command | Description |
|---------|-------------|
| `/refactor-workflow` | Guided 8-step refactoring with branch and GitHub issue |
| `/refactor-prep` | Prepare codebase for safe refactoring |
| `/refactor-analyze` | Analyze code for refactoring opportunities |
| `/refactor-check` | Verify refactoring safety and completeness |
| `/refactor-cleanup` | Clean up refactoring artifacts and branches |

### Deployment & DevOps

| Command | Description |
|---------|-------------|
| `/deploy-full` | Parallel full-stack deployment (backend + frontend) |
| `/pr-merge` | Interactive PR merge with blocker resolution and safety checks |
| `/monitoring-setup` | Set up monitoring and observability for your application |

### Vision Driver Bot (VDB)

| Command | Description |
|---------|-------------|
| `/vdb-init` | Initialize VDB for autonomous development |
| `/vdb-scan` | Scan codebase for lint errors and issues |
| `/vdb-status` | View VDB state and execution queue |
| `/vdb-execute-next` | Execute next task in VDB queue |

### Project Management

| Command | Description |
|---------|-------------|
| `/ccasp-panel` | CCASP control panel and status dashboard |
| `/ccasp-setup` | Configure CCASP settings and integrations |
| `/update-check` | Check for and sync new CCASP features |
| `/update-smart` | Smart update with customization preservation |
| `/project-explorer` | Interactive codebase navigation and analysis |
| `/orchestration-guide` | View agent orchestration documentation |

### Tunnel & Development

| Command | Description |
|---------|-------------|
| `/tunnel-start` | Start development tunnel (ngrok/Cloudflare) |
| `/tunnel-stop` | Stop active tunnel service |
| `/happy-start` | Start Happy.engineering development server |
| `/happy-start-cd` | Start Happy server with directory change |

### Utilities

| Command | Description |
|---------|-------------|
| `/detect-tech-stack` | Auto-detect project tech stack from files |
| `/generate-agents` | Generate stack-specific AI agents |
| `/ask-claude` | Interactive Q&A with context loading |
| `/context-audit` | Analyze context window usage and optimization |
| `/research-competitor` | Research competitor features and implementations |
| `/ai-constitution-framework` | Code style enforcement documentation |
| `/api-docs` | Generate comprehensive API documentation |
| `/db-migrate` | Database migration management and schema versioning |

### Navigation & Setup

| Command | Description |
|---------|-------------|
| `/menu` | Interactive navigation menu (desktop) |
| `/menu-happy` | Mobile-optimized menu (40-char width) |
| `/menu-for-happy-ui` | Alternative mobile menu format |
| `/init-ccasp-new-project` | Initialize CCASP in new projects |
| `/project-implementation-for-ccasp` | Project-specific implementation guide |

### Internal/Utility

| Command | Description |
|---------|-------------|
| `/__ccasp-sync-marker` | Version detection marker (v2.2.16+) |

---

## Hook Templates

### By Event Type

#### PreToolUse Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `happy-mode-detector` | * | Auto-detect Happy.engineering mobile environment |
| `context-guardian` | * | Monitor context window usage, prevent overflow |
| `tunnel-check-prompt` | Bash | Validate tunnel URLs in deployment commands |
| `mcp-api-key-validator` | * | Verify MCP server credentials before operations |
| `constitution-enforcer` | * | Validate code against project constitution rules |
| `playwright-pre-launch` | Bash | Inject credentials and tunnel URLs for E2E tests |

#### PostToolUse Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `token-usage-monitor` | * | Track token consumption and context usage |
| `usage-tracking` | * | Aggregate usage statistics across sessions |
| `session-id-generator` | * | Generate unique session identifiers |
| `git-commit-tracker` | Bash | Track git commits for change documentation |
| `branch-merge-checker` | Bash | Validate branch safety before merge operations |
| `deployment-orchestrator` | Bash | Coordinate multi-service deployments |
| `ralph-loop-enforcer` | Bash | Monitor test-fix loop iterations |
| `ralph-loop-web-search` | Bash | Trigger web search after 3 failed Ralph attempts |
| `ralph-occurrence-auditor` | * | Track recurring Ralph failures |
| `refactor-verify` | Write, Edit | Verify refactoring changes against tests |
| `refactor-transaction` | Write, Edit | Ensure atomic refactoring operations |
| `refactor-audit` | * | Audit refactoring for code smell elimination |
| `progress-tracker` | Write | Update PROGRESS.json files |
| `progress-sync` | Write | Sync progress to GitHub issues |
| `hierarchy-progress-sync` | Write | Sync hierarchical progress (epic/roadmap/phase) |
| `roadmap-progress-sync` | Write | Update roadmap completion status |
| `epic-progress-sync` | Write | Update epic tracking and completion |
| `github-progress-sync` | Write | Trigger L3 worker for GitHub issue updates |
| `issue-completion-detector` | * | Detect when issues are completed |
| `github-task-auto-split` | * | Auto-split large tasks into subtasks |

#### PreSendMessage Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `context-injector` | * | Inject context from settings.json and tech-stack.json |
| `happy-title-generator` | * | Generate mobile-friendly message titles |
| `token-budget-loader` | * | Set token budgets for different task types |
| `subagent-context-injector` | * | Inject context for L2/L3 agent messages |

#### PostReceiveMessage Hooks

| Hook | Tools | Purpose |
|------|-------|---------|
| `happy-checkpoint-manager` | * | Create recovery checkpoints for Happy.engineering |
| `autonomous-decision-logger` | * | Log autonomous agent decisions |

### By Category

#### Orchestration & Agent Management

| Hook | Purpose |
|------|---------|
| `hierarchy-validator` | Validate L1/L2/L3 agent hierarchy compliance |
| `l2-completion-reporter` | Report L2 agent task completion to orchestrator |
| `agent-delegator` | Route tasks to appropriate specialist agents |
| `agent-error-recovery` | Handle and recover from agent failures |
| `orchestrator-enforcer` | Enforce orchestration patterns |
| `orchestrator-init` | Initialize orchestration state |
| `orchestrator-audit-logger` | Log orchestration decisions |
| `l3-parallel-executor` | Execute L3 workers in parallel batches |
| `agent-epic-progress` | Track agent progress in epic workflows |

#### Task & Complexity Analysis

| Hook | Purpose |
|------|---------|
| `task-classifier` | Classify tasks by complexity and assign agents |
| `complexity-analyzer` | Analyze code complexity for refactoring |
| `completion-verifier` | Verify task completion against criteria |
| `delegation-enforcer` | Enforce task delegation requirements |

#### Phase & State Management

| Hook | Purpose |
|------|---------|
| `phase-validation-gates` | Validate phase completion before advancement |
| `phase-dev-enforcer` | Enforce phase-dev-plan requirements |
| `roadmap-state-tracker` | Track roadmap execution state |

#### Documentation & Updates

| Hook | Purpose |
|------|---------|
| `documentation-generator` | Auto-generate documentation from code |
| `ccasp-update-check` | Check for CCASP updates |

#### Caching & Optimization

| Hook | Purpose |
|------|---------|
| `tool-output-cacher` | Cache tool outputs to reduce redundant calls |

#### Vision Mode

| Hook | Purpose |
|------|---------|
| `vision-observer-hook` | Observe Vision execution for drift detection |

#### Happy.engineering Integration

| Hook | Purpose |
|------|---------|
| `panel-queue-reader` | Read command queues from Happy control panel |

---

## Template Statistics

- **Total Slash Commands**: 62
- **Total Hook Templates**: 54
- **PreToolUse Hooks**: 6
- **PostToolUse Hooks**: 20
- **PreSendMessage Hooks**: 4
- **PostReceiveMessage Hooks**: 2
- **Orchestration Hooks**: 9
- **Testing Hooks**: 5
- **Deployment Hooks**: 3

---

## Categories Overview

### Commands by Category

| Category | Count | Commands |
|----------|-------|----------|
| **Vision Mode** | 5 | vision-init, vision-run, vision-status, vision-adjust, vision-dashboard |
| **Planning** | 9 | create-roadmap, roadmap-status, roadmap-edit, roadmap-track, adopt-roadmap, phase-dev-plan, phase-track, create-task-list, create-task-list-for-issue |
| **GitHub** | 8 | create-github-epic, epic-advance, github-epic-status, github-epic-menu, github-task-start, github-task-multiple, github-menu-issues-list, github-project-menu |
| **Testing & Quality** | 5 | ralph, golden-master, create-smoke-test, security-scan, perf-profile |
| **Refactoring** | 5 | refactor-workflow, refactor-prep, refactor-analyze, refactor-check, refactor-cleanup |
| **Deployment & DevOps** | 3 | deploy-full, pr-merge, monitoring-setup |
| **VDB** | 4 | vdb-init, vdb-scan, vdb-status, vdb-execute-next |
| **Project Mgmt** | 5 | ccasp-panel, ccasp-setup, update-check, update-smart, project-explorer |
| **Tunnel/Dev** | 4 | tunnel-start, tunnel-stop, happy-start, happy-start-cd |
| **Utilities** | 9 | detect-tech-stack, generate-agents, ask-claude, context-audit, research-competitor, ai-constitution-framework, orchestration-guide, api-docs, db-migrate |
| **Navigation** | 5 | menu, menu-happy, menu-for-happy-ui, init-ccasp-new-project, project-implementation-for-ccasp |

---

## Finding Templates

All template files are located in the `templates/` directory:

- **Commands**: `templates/commands/*.template.md`
- **Hooks**: `templates/hooks/*.template.js`
- **Agents**: `templates/agents/*.template.md`
- **Skills**: `templates/skills/*.template.md`
- **Docs**: `templates/docs/*.md`
- **Patterns**: `templates/patterns/*.md`

Use `ccasp init` to deploy templates to your project's `.claude/` directory.

---

## Next Steps

- [View Template Variables](./VARIABLES.md)
- [View Hook Index](./hooks/INDEX.md)
- [Read CLAUDE.md](../CLAUDE.md) for architecture details
- [Check Changelog](../CHANGELOG.md) for version history
