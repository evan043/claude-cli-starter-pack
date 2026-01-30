# Architecture

This document provides a deep dive into CCASP's internal architecture for senior full-stack developers who want to understand how the system works or contribute to development.

## Table of Contents

- [Two-Phase Design](#two-phase-design)
- [Directory Structure](#directory-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Tech Stack Detection Algorithm](#tech-stack-detection-algorithm)
- [Template Engine Internals](#template-engine-internals)
- [Command System](#command-system)
- [Agent Architecture](#agent-architecture)
- [Hook System](#hook-system)
- [Skill System](#skill-system)

---

## Two-Phase Design

CCASP intentionally separates operations into two phases:

### Phase 1: Terminal (No AI)

**Purpose**: File-based detection, scaffolding, and configuration generation

**Characteristics**:
- Runs in user's shell (bash, PowerShell, zsh)
- Pure Node.js execution
- Pattern matching on project files
- No API calls required
- Works offline
- Zero token cost

**Key Operations**:
```
ccasp wizard    → Interactive setup wizard
ccasp init      → Deploy commands to project
ccasp detect-stack → Analyze project files
ccasp create-*  → Generate agents/hooks/skills
```

### Phase 2: Claude Code CLI (AI-Powered)

**Purpose**: AI-assisted workflows and automation

**Characteristics**:
- Runs inside Claude Code CLI
- Full AI capabilities
- Context-aware operations
- Can read/write files, run commands
- Uses tokens

**Key Operations**:
```
/menu          → Interactive navigation
/deploy-full   → Orchestrated deployment
/github-update → Project board sync
/phase-track   → Progress tracking
```

### Why Two Phases?

| Concern | Phase 1 Solution | Phase 2 Solution |
|---------|-----------------|------------------|
| Speed | Instant file reads | AI inference |
| Cost | Zero tokens | API usage |
| Reliability | No network needed | Requires connectivity |
| Intelligence | Pattern matching | Full AI reasoning |
| User Control | Interactive prompts | AI-guided workflow |

---

## Directory Structure

### Source Code (`src/`)

```
src/
├── index.js                    # Main exports barrel (40+ exports)
├── utils.js                    # Core utilities (396 lines)
│
├── commands/                   # 23 command implementations
│   ├── init.js                # Deploy to project (2123 lines)
│   ├── setup-wizard.js        # Vibe-friendly setup (1386 lines)
│   ├── detect-tech-stack.js   # Tech detection (768 lines)
│   ├── claude-audit.js        # CLAUDE.md validation (1482 lines)
│   ├── create-agent.js        # Agent generator
│   ├── create-hook.js         # Hook generator
│   ├── create-skill.js        # Skill generator
│   ├── create-command.js      # Command generator (338 lines)
│   ├── create-phase-dev.js    # Phased dev planner (482 lines)
│   │   ├── wizard.js          # Interactive wizard
│   │   ├── scale-calculator.js # Phase estimation
│   │   ├── documentation-generator.js
│   │   ├── codebase-analyzer.js
│   │   └── post-completion.js
│   ├── explore-mcp.js         # MCP discovery (639 lines)
│   │   ├── mcp-registry.js    # 50+ MCP definitions
│   │   ├── mcp-installer.js   # Installation logic
│   │   └── claude-md-updater.js
│   ├── sync.js                # GitHub sync (535 lines)
│   ├── roadmap.js             # Roadmap bridge (751 lines)
│   ├── test-run.js            # Test runner (457 lines)
│   ├── validate.js            # Template validator
│   └── list.js                # Issue listing
│
├── cli/
│   └── menu.js                # Interactive ASCII menu
│
├── github/
│   └── client.js              # GitHub API wrapper (gh CLI)
│
├── agents/
│   ├── templates.js           # Agent template generators
│   └── phase-dev-templates.js # Phased development artifacts
│
├── utils/
│   ├── template-engine.js     # Handlebars-style processor (398 lines)
│   ├── validate-templates.js  # Agnosticism validator (223 lines)
│   └── version-check.js       # Update checking (512 lines)
│
└── templates/
    └── claude-command.js      # Command template generator
```

### Templates (`templates/`)

```
templates/
├── commands/                   # 12 slash command templates
│   ├── ccasp-setup.template.md
│   ├── context-audit.template.md
│   ├── create-task-list.template.md
│   ├── deploy-full.template.md
│   ├── github-task-start.template.md
│   ├── github-update.template.md
│   ├── happy-start.template.md
│   ├── phase-track.template.md
│   ├── project-impl.template.md
│   ├── tunnel-start.template.md
│   ├── tunnel-stop.template.md
│   └── update-check.template.md
│
└── hooks/                      # 6 hook templates
    ├── ccasp-update-check.template.js
    ├── context-guardian.template.js
    ├── deployment-orchestrator.template.js
    ├── github-progress-hook.template.js
    ├── happy-checkpoint-manager.template.js
    └── phase-dev-enforcer.template.js
```

### Generated Structure (`.claude/`)

```
.claude/
├── commands/              # Processed slash commands
├── agents/                # Agent definitions
├── skills/                # Skill packages
│   └── skill-name/
│       ├── skill.md
│       ├── context/
│       └── workflows/
├── hooks/
│   ├── pre-tool-use/
│   ├── post-tool-use/
│   └── user-prompt-submit/
├── docs/
├── phase-dev/
│   └── project-name/
│       ├── PROGRESS.json
│       ├── EXECUTIVE_SUMMARY.md
│       └── phases/
├── settings.json
└── tech-stack.json
```

---

## Core Components

### 1. Tech Stack Detection (`detect-tech-stack.js`)

**Lines**: 768

**Purpose**: Scan project files to detect technologies without AI

**Algorithm**:
```javascript
// Simplified detection flow
async function detectTechStack(projectPath) {
  const techStack = {
    version: "2.0.0",
    project: {},
    frontend: {},
    backend: {},
    database: {},
    testing: {},
    deployment: {}
  };

  // Read package.json
  const pkg = await readPackageJson(projectPath);

  // Detect frontend
  if (pkg.dependencies?.react) techStack.frontend.framework = 'react';
  if (pkg.dependencies?.vue) techStack.frontend.framework = 'vue';
  if (pkg.dependencies?.next) techStack.frontend.framework = 'next';

  // Detect backend
  if (pkg.dependencies?.express) techStack.backend.framework = 'express';
  if (pkg.dependencies?.fastify) techStack.backend.framework = 'fastify';

  // Detect from config files
  if (await exists('vite.config.js')) techStack.frontend.bundler = 'vite';
  if (await exists('next.config.js')) techStack.frontend.framework = 'next';

  // Detect testing
  if (pkg.devDependencies?.vitest) techStack.testing.unit = 'vitest';
  if (pkg.devDependencies?.playwright) techStack.testing.e2e = 'playwright';

  // Detect deployment
  if (await exists('railway.json')) techStack.deployment.backend.platform = 'railway';
  if (await exists('wrangler.toml')) techStack.deployment.frontend.platform = 'cloudflare';

  // Git info
  const gitConfig = await readGitConfig(projectPath);
  if (gitConfig.remote) {
    techStack.versionControl = parseGitRemote(gitConfig.remote);
  }

  return techStack;
}
```

**Detection Categories**:

| Category | Files Checked | Technologies Detected |
|----------|--------------|----------------------|
| Frontend | `package.json`, `vite.config.*`, `next.config.*` | React, Vue, Angular, Svelte, Next.js, Nuxt, Astro |
| Backend | `package.json`, `requirements.txt`, `go.mod` | Express, FastAPI, Django, Flask, NestJS, Gin |
| Database | `package.json`, `docker-compose.yml` | PostgreSQL, MySQL, MongoDB, SQLite, Redis |
| Testing | `package.json`, config files | Jest, Vitest, Mocha, pytest, Playwright, Cypress |
| Deployment | `railway.json`, `vercel.json`, `wrangler.toml` | Railway, Vercel, Cloudflare, Heroku, AWS |
| Build | `package.json`, config files | Vite, Webpack, esbuild, Turbopack |

### 2. Template Engine (`template-engine.js`)

**Lines**: 398

**Purpose**: Handlebars-style placeholder replacement

**Supported Syntax**:

```javascript
const SYNTAX = {
  // Simple placeholder
  simple: /\{\{([a-zA-Z0-9_.]+)\}\}/g,

  // Conditional block
  ifBlock: /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g,

  // If-else block
  ifElseBlock: /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,

  // Each loop
  eachBlock: /\{\{#each\s+(.+?)\}\}([\s\S]*?)\{\{\/each\}\}/g,

  // Equality check
  eqHelper: /\(eq\s+([a-zA-Z0-9_.]+)\s+"(.+?)"\)/g,

  // Inequality check
  neqHelper: /\(neq\s+([a-zA-Z0-9_.]+)\s+"(.+?)"\)/g,

  // Logical AND
  andHelper: /\(and\s+(.+?)\s+(.+?)\)/g,

  // Logical OR
  orHelper: /\(or\s+(.+?)\s+(.+?)\)/g,

  // Negation
  notHelper: /\(not\s+(.+?)\)/g,

  // Path variables
  cwdVar: /\$\{CWD\}/g,
  homeVar: /\$\{HOME\}/g
};
```

**Processing Flow**:

```javascript
function replacePlaceholders(content, values, options = {}) {
  let result = content;
  const warnings = [];

  // 1. Process conditionals first (outermost to innermost)
  result = processConditionals(result, values, warnings);

  // 2. Process loops
  result = processLoops(result, values, warnings);

  // 3. Replace simple placeholders
  result = result.replace(SYNTAX.simple, (match, path) => {
    const value = getNestedValue(values, path);
    if (value === undefined) {
      warnings.push(`Unresolved: ${match}`);
      return options.preserveUnknown ? match : '';
    }
    return value;
  });

  // 4. Replace path variables
  result = result.replace(SYNTAX.cwdVar, process.cwd());
  result = result.replace(SYNTAX.homeVar, os.homedir());

  return { content: result, warnings };
}
```

### 3. GitHub Client (`github/client.js`)

**Purpose**: Wrapper around GitHub CLI (`gh`) for API operations

**Key Functions**:

```javascript
// Authentication
isAuthenticated()           // Check if gh is logged in
getCurrentUser()            // Get authenticated user

// Repository operations
listRepos(owner, options)   // List repositories
repoExists(owner, repo)     // Validate access
getRepoInfo(owner, repo)    // Get repo details

// GitHub Projects v2
listProjects(owner)         // List project boards
getProject(owner, number)   // Get single project
listProjectFields(owner, projectNumber)
getFieldOptions(projectId, fieldId)
getAllFieldOptions(projectId)

// Issue management
createIssue(owner, repo, options)
listIssues(owner, repo, options)
getIssue(owner, repo, number)
addIssueComment(owner, repo, number, body)

// Project board integration
addIssueToProject(owner, projectNumber, issueUrl)
getProjectItemId(owner, projectNumber, issueNumber)
updateProjectItemField(projectId, itemId, fieldId, value, type)
```

**Implementation Pattern**:

```javascript
async function createIssue(owner, repo, { title, body, labels, assignees }) {
  const args = ['issue', 'create', '--repo', `${owner}/${repo}`];

  args.push('--title', escapeShell(title));
  if (body) args.push('--body', escapeShell(body));
  if (labels?.length) args.push('--label', labels.join(','));
  if (assignees?.length) args.push('--assignee', assignees.join(','));

  const result = await execCommand('gh', args);

  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr };
  }

  // Extract issue number from output
  const match = result.stdout.match(/\/issues\/(\d+)/);
  return {
    success: true,
    url: result.stdout.trim(),
    number: match ? parseInt(match[1]) : null
  };
}
```

### 4. Setup Wizard (`setup-wizard.js`)

**Lines**: 1,386

**Purpose**: Mobile-friendly interactive setup with single-character inputs

**Menu Structure**:

```javascript
const MAIN_MENU = {
  '1': { action: 'quickStart', label: 'Quick Start' },
  '2': { action: 'fullSetup', label: 'Full Setup' },
  '3': { action: 'githubSetup', label: 'GitHub Setup' },
  '4': { action: 'viewTemplates', label: 'View Templates' },
  '5': { action: 'priorReleases', label: 'Prior Releases' },
  '6': { action: 'removeCcasp', label: 'Remove CCASP' },
  '0': { action: 'exit', label: 'Exit' }
};

const FEATURE_PRESETS = {
  'A': { name: 'Minimal', features: ['menu'] },
  'B': { name: 'Standard', features: ['menu', 'github', 'phasedDev'] },
  'C': { name: 'Full', features: ['menu', 'github', 'phasedDev', 'deployment', 'tunnels', 'tokens'] },
  'D': { name: 'Custom', features: [] }
};
```

---

## Data Flow

### Init Command Flow

```
ccasp init
    │
    ├─► detectTechStack(cwd)
    │       │
    │       ├─► Read package.json
    │       ├─► Scan config files
    │       ├─► Parse .git/config
    │       └─► Return techStack object
    │
    ├─► promptFeatureSelection(techStack)
    │       │
    │       ├─► Show preset options (A/B/C/D)
    │       ├─► Custom feature selection
    │       └─► Return selected features
    │
    ├─► processTemplates(features, techStack)
    │       │
    │       ├─► Load command templates
    │       ├─► replacePlaceholders()
    │       └─► Write to .claude/commands/
    │
    ├─► processHooks(features, techStack)
    │       │
    │       ├─► Load hook templates
    │       ├─► replacePlaceholders()
    │       └─► Write to .claude/hooks/
    │
    ├─► generateSettings(features)
    │       │
    │       └─► Write .claude/settings.json
    │
    └─► showCompletionMessage()
            │
            └─► Remind to restart Claude
```

### Slash Command Execution Flow

```
/deploy-full (inside Claude Code CLI)
    │
    ├─► Claude parses .claude/commands/deploy-full.md
    │
    ├─► Reads tech-stack.json for configuration
    │
    ├─► PreToolUse hooks execute (if any)
    │       │
    │       └─► deployment-orchestrator.js checks for conflicts
    │
    ├─► Claude executes deployment steps
    │       │
    │       ├─► Frontend: npm run build → wrangler deploy
    │       └─► Backend: mcp__railway__deployment_trigger
    │
    ├─► PostToolUse hooks execute
    │       │
    │       └─► Track deployment state
    │
    └─► Return results to user
```

---

## Agent Architecture

### Hierarchy

```
L1 ORCHESTRATOR
├── Purpose: High-level coordination
├── Model: opus or sonnet
├── Context: Full task visibility
├── Creates: Sub-tasks for L2 specialists
│
├─► L2 SPECIALIST (Frontend)
│   ├── Purpose: Domain expertise
│   ├── Model: sonnet
│   ├── Context: 1-8K tokens
│   │
│   └─► L3 WORKER (haiku)
│       ├── Purpose: Atomic tasks
│       └── Context: ~500 tokens
│
└─► L2 SPECIALIST (Backend)
    ├── Purpose: Domain expertise
    ├── Model: sonnet
    │
    └─► L3 WORKER (haiku)
```

### Agent Definition Schema

```yaml
---
# YAML frontmatter
name: string              # Unique identifier
type: L1 | L2 | L3        # Hierarchy level
model: opus | sonnet | haiku
description: string       # Human-readable purpose
triggers: string[]        # Optional activation keywords
---

# Markdown body

## Purpose
Why this agent exists

## Expertise
- Domain knowledge areas
- Specific technologies

## Tools Available
- Read, Write, Edit
- Bash
- Glob, Grep

## Behavior
1. Step-by-step instructions
2. How to handle edge cases

## Context Files
- Glob patterns for relevant files

## Success Criteria
- [ ] Testable outcomes
```

---

## Hook System

### Hook Types

| Type | Event | Can Block | Use Case |
|------|-------|-----------|----------|
| `PreToolUse` | Before tool execution | Yes | Validation, protection |
| `PostToolUse` | After tool execution | No | Logging, state tracking |
| `UserPromptSubmit` | On user message | No | Context loading |

### Hook Interface

```javascript
// hooks/pre-tool-use/example-hook.js

export default {
  name: 'example-hook',
  type: 'PreToolUse',
  tools: ['Edit', 'Write'],  // Tool filter, or ['*'] for all

  async execute(context) {
    const { tool, params, session } = context;

    // Validation logic
    if (shouldBlock(params)) {
      return {
        action: 'block',
        message: 'Operation not allowed'
      };
    }

    // Allow with warning
    if (shouldWarn(params)) {
      return {
        action: 'warn',
        message: 'Proceed with caution'
      };
    }

    // Modify parameters
    if (shouldModify(params)) {
      return {
        action: 'modify',
        params: { ...params, timeout: 60000 }
      };
    }

    // Allow by default
    return { action: 'allow' };
  }
};
```

### Hook Context

```javascript
// PreToolUse context
{
  tool: 'Edit',
  params: {
    file_path: '/src/app.ts',
    old_string: '...',
    new_string: '...'
  },
  session: {
    startTime: Date,
    tokensUsed: number,
    filesModified: string[]
  }
}

// PostToolUse context
{
  tool: 'Bash',
  params: { command: 'npm test' },
  result: {
    output: '...',
    exitCode: 0
  },
  duration: 1234,  // ms
  session: { ... }
}

// UserPromptSubmit context
{
  prompt: 'Fix the login bug',
  session: { ... },
  recentTools: [...],
  recentFiles: [...]
}
```

---

## Skill System

### Skill Structure

```
.claude/skills/skill-name/
├── skill.md              # Main definition with frontmatter
├── context/              # RAG knowledge base
│   ├── patterns.md       # Best practices
│   ├── examples.md       # Real code examples
│   └── gotchas.md        # Common mistakes
├── templates/            # Code generation templates
│   ├── component.tsx
│   └── test.spec.ts
└── workflows/            # Step-by-step procedures
    └── create-feature.md
```

### Skill Definition Schema

```yaml
---
name: string
description: string
version: string
triggers:
  - "keyword phrase"
  - "another trigger"
---

# Skill Name

## Purpose
What this skill does

## Context Files
- context/patterns.md
- context/examples.md

## Workflow

### Step 1: Gather Requirements
Instructions for first step

### Step 2: Generate Code
Use template: templates/component.tsx

### Step 3: Validate
- [ ] Success criterion 1
- [ ] Success criterion 2

## Templates

### Template Name
```language
// Code template with {{placeholders}}
```
```

---

## Configuration Files

### tech-stack.json Schema

```typescript
interface TechStack {
  version: "2.0.0";

  project: {
    name: string;
    type: "frontend" | "backend" | "fullstack" | "monorepo";
    description?: string;
  };

  frontend?: {
    framework: "react" | "vue" | "angular" | "svelte" | "next" | "nuxt";
    port: number;
    buildCommand: string;
    devCommand: string;
    distDir: string;
  };

  backend?: {
    framework: "express" | "fastapi" | "nestjs" | "django" | "flask";
    language: "javascript" | "typescript" | "python" | "go";
    port: number;
    healthEndpoint: string;
  };

  database?: {
    type: "postgresql" | "mysql" | "mongodb" | "sqlite";
    orm?: string;
  };

  testing?: {
    unit?: "jest" | "vitest" | "mocha" | "pytest";
    e2e?: "playwright" | "cypress";
    unitCommand?: string;
    e2eCommand?: string;
  };

  deployment?: {
    frontend?: {
      platform: "cloudflare" | "vercel" | "netlify" | "github-pages";
      projectName: string;
      productionUrl?: string;
    };
    backend?: {
      platform: "railway" | "heroku" | "render" | "fly" | "vercel";
      projectId?: string;
      serviceId?: string;
      environmentId?: string;
      productionUrl?: string;
    };
  };

  versionControl?: {
    provider: "github" | "gitlab" | "bitbucket";
    owner: string;
    repo: string;
    defaultBranch: string;
    projectBoard?: {
      number: number;
    };
  };

  features: {
    githubIntegration: boolean;
    phasedDevelopment: boolean;
    tokenManagement: boolean;
    deploymentAutomation: boolean;
    tunnelServices: boolean;
    happyMode: boolean;
  };
}
```

### settings.json Schema

```typescript
interface Settings {
  hooks: {
    enabled: boolean;
    preToolUse: string[];     // Hook names
    postToolUse: string[];
    userPromptSubmit: string[];
    disabled?: string[];       // Temporarily disabled hooks
  };

  agents?: {
    defaultModel: "opus" | "sonnet" | "haiku";
    maxTokensPerTask: number;
  };

  tokenManagement?: {
    dailyBudget: number;
    thresholds: {
      compact: number;    // 0.75
      archive: number;    // 0.90
      respawn: number;    // 0.95
    };
  };
}
```

---

## See Also

- [API Reference](API-Reference) - Programmatic usage
- [Configuration Schema](Configuration-Schema) - Complete schemas
- [Templates](Templates) - Template engine details
- [Contributing](https://github.com/evan043/claude-cli-advanced-starter-pack/blob/master/CONTRIBUTING.md)
