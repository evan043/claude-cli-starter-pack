# CCASP Wiki - Complete Documentation

**Version 1.8.0** | **For Senior Full-Stack Developers**

This documentation provides comprehensive technical details for the Claude CLI Advanced Starter Pack (CCASP). It covers architecture, implementation patterns, extension points, and production deployment strategies.

---

## Table of Contents

1. [Architecture Deep Dive](#architecture-deep-dive)
2. [Agent Orchestration Patterns](#agent-orchestration-patterns)
3. [Hook System Reference](#hook-system-reference)
4. [Skill Development Guide](#skill-development-guide)
5. [Template Engine Internals](#template-engine-internals)
6. [MCP Server Integration](#mcp-server-integration)
7. [Phased Development System](#phased-development-system)
8. [Deployment Automation](#deployment-automation)
9. [Performance & Token Optimization](#performance--token-optimization)
10. [Extension API](#extension-api)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture Deep Dive

### Two-Phase Execution Model

CCASP operates in two distinct phases with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: TERMINAL                             │
│                         (No AI, Pure Node.js)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Entry Points:                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │ ccasp wizard│  │ ccasp init  │  │ccasp detect │                     │
│  │   (wizard)  │  │   (deploy)  │  │   (scan)    │                     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│         │                │                │                             │
│         ▼                ▼                ▼                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CORE MODULES                                  │   │
│  │                                                                  │   │
│  │  detect-tech-stack.js (768 LOC)                                 │   │
│  │  ├─ readPackageJson()     → Parse dependencies                  │   │
│  │  ├─ detectFrontend()      → Framework detection                 │   │
│  │  ├─ detectBackend()       → API framework detection             │   │
│  │  ├─ detectDatabase()      → DB/ORM detection                    │   │
│  │  ├─ detectTesting()       → Test framework detection            │   │
│  │  └─ detectDeployment()    → CI/CD platform detection            │   │
│  │                                                                  │   │
│  │  template-engine.js (398 LOC)                                   │   │
│  │  ├─ replacePlaceholders() → {{variable}} substitution           │   │
│  │  ├─ processConditionals() → {{#if}}/{{#each}} handling          │   │
│  │  └─ resolveHelpers()      → (eq), (or), (and) operators         │   │
│  │                                                                  │   │
│  │  init.js (1386 LOC)                                             │   │
│  │  ├─ OPTIONAL_FEATURES     → Feature registry                    │   │
│  │  ├─ deployCommands()      → Copy templates to .claude/          │   │
│  │  ├─ deployHooks()         → Install enforcement hooks           │   │
│  │  └─ generateTechStack()   → Create tech-stack.json              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                   │                                     │
│                                   ▼                                     │
│                        ┌─────────────────────┐                         │
│                        │   .claude/ folder   │                         │
│                        │   (YOUR PROJECT)    │                         │
│                        └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ← RESTART CLAUDE CODE CLI
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2: CLAUDE CODE                          │
│                        (AI-Powered, MCP Enabled)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Slash Commands:  /menu  /deploy-full  /github-update  /phase-track   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AGENT HIERARCHY                               │   │
│  │                                                                  │   │
│  │  L1 ORCHESTRATORS (Sonnet/Opus)                                 │   │
│  │  ├─ Task decomposition                                          │   │
│  │  ├─ Agent spawning (parallel/sequential)                        │   │
│  │  ├─ Result aggregation                                          │   │
│  │  └─ Error recovery                                              │   │
│  │           │                                                      │   │
│  │           ├──────────────┬──────────────┬──────────────┐        │   │
│  │           ▼              ▼              ▼              ▼        │   │
│  │  L2 SPECIALISTS (Sonnet/Haiku)                                  │   │
│  │  ├─ Domain-specific tasks                                       │   │
│  │  ├─ File operations                                             │   │
│  │  ├─ Code generation                                             │   │
│  │  └─ Testing/validation                                          │   │
│  │           │                                                      │   │
│  │           ▼                                                      │   │
│  │  L3 WORKERS (Haiku)                                             │   │
│  │  ├─ Simple file reads                                           │   │
│  │  ├─ Pattern matching                                            │   │
│  │  └─ Data extraction                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    HOOK LIFECYCLE                                │   │
│  │                                                                  │   │
│  │  UserPromptSubmit  →  PreToolUse  →  [Tool Execution]           │   │
│  │         ↓                  ↓               ↓                     │   │
│  │  context-injector    file-guard      [MCP Calls]                │   │
│  │  session-id-gen      branch-checker       ↓                     │   │
│  │                                      PostToolUse                 │   │
│  │                                           ↓                      │   │
│  │                                    decision-logger               │   │
│  │                                    github-progress               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Structure Deep Dive

```
claude-cli-advanced-starter-pack/
├── bin/
│   ├── gtask.js           # CLI entry (Commander.js)
│   └── postinstall.js     # npm postinstall welcome
│
├── src/
│   ├── commands/          # 25 command implementations
│   │   ├── init.js                    # Feature deployment (1386 LOC)
│   │   ├── detect-tech-stack.js       # Stack detection (768 LOC)
│   │   ├── setup-wizard.js            # Vibe-friendly wizard
│   │   ├── create-agent.js            # Agent builder
│   │   ├── create-hook.js             # Hook builder
│   │   ├── create-skill.js            # Skill builder
│   │   ├── install-skill.js           # Post-init skill installer
│   │   ├── install-scripts.js         # Script installer
│   │   ├── explore-mcp.js             # MCP discovery
│   │   │   └── explore-mcp/
│   │   │       ├── mcp-registry.js    # Server definitions (20+ servers)
│   │   │       ├── mcp-installer.js   # .mcp.json updater
│   │   │       └── claude-md-updater.js
│   │   └── create-phase-dev/
│   │       ├── index.js               # Phase orchestrator
│   │       ├── codebase-analyzer.js   # Dependency scanner
│   │       └── scale-calculator.js    # S/M/L estimation
│   │
│   ├── cli/
│   │   └── menu.js        # Interactive ASCII menu
│   │
│   ├── github/
│   │   └── client.js      # GitHub API via gh CLI
│   │
│   ├── utils/
│   │   └── template-engine.js  # Handlebars-style processor
│   │
│   └── index.js           # Public API exports
│
├── templates/
│   ├── commands/          # 18 slash command templates (.template.md)
│   ├── hooks/             # 12 hook templates (.template.js)
│   ├── skills/            # 3 skill packages
│   │   ├── agent-creator/
│   │   ├── hook-creator/
│   │   └── rag-agent-creator/
│   ├── patterns/          # 4 orchestration patterns
│   ├── scripts/           # 7 utility scripts
│   └── docs/              # 5 documentation templates
│
└── docs/
    └── WIKI.md            # This file
```

---

## Agent Orchestration Patterns

### Pattern 1: Two-Tier Query Pipeline

**Use Case**: Intent classification followed by specialized execution.

```typescript
// Tier 1: Fast classifier (Haiku)
const classification = await classifyIntent(userRequest);
// { intent: 'deploy', confidence: 0.92, entities: { platform: 'railway' } }

// Tier 2: Specialized handler (Sonnet)
const result = await handlers[classification.intent](classification.entities);
```

**Implementation**:

```typescript
interface ClassificationResult {
  intent: 'create' | 'read' | 'update' | 'delete' | 'analyze' | 'deploy';
  confidence: number;  // 0-1
  entities: Record<string, string>;
  handler: string;
}

async function executeQuery(request: string) {
  // Tier 1: Pattern-based classification (no AI needed for common cases)
  const patterns = {
    deploy: /deploy|push|release|ship/i,
    analyze: /analyze|check|review|audit/i,
    create: /create|add|new|make/i,
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(request)) {
      return handlers[`${intent}Handler`](extractEntities(request));
    }
  }

  // Fallback: AI classification
  const classification = await Task({
    description: 'Classify intent',
    prompt: `Classify: "${request}"`,
    subagent_type: 'Explore',
    model: 'haiku'  // Fast, cheap
  });

  return handlers[classification.handler](classification.entities);
}
```

### Pattern 2: L1→L2 Orchestration

**Use Case**: Complex tasks requiring parallel specialist agents.

```typescript
async function orchestrate(task: string) {
  // Step 1: Decompose into subtasks
  const subtasks = await decomposeTask(task);

  // Step 2: Identify dependencies
  const { independent, dependent } = categorizeSubtasks(subtasks);

  // Step 3: Launch independent L2 agents IN PARALLEL
  // CRITICAL: Use single message with multiple Task calls
  const parallelAgents = independent.map(subtask => Task({
    description: subtask.title,
    prompt: subtask.prompt,
    subagent_type: subtask.type,
    run_in_background: true
  }));

  const parallelResults = await Promise.all(parallelAgents);

  // Step 4: Launch dependent agents sequentially
  let context = parallelResults;
  for (const subtask of dependent) {
    const result = await Task({
      description: subtask.title,
      prompt: injectContext(subtask.prompt, context),
      subagent_type: subtask.type
    });
    context = [...context, result];
  }

  // Step 5: Aggregate results
  return aggregateResults(context);
}
```

**Model Selection Guidelines**:

| Level | Model | Reasoning |
|-------|-------|-----------|
| L1 Orchestrator | Sonnet | Complex decomposition, coordination |
| L2 Search/Explore | Haiku | Fast file discovery, pattern matching |
| L2 Analysis | Sonnet | Deep reasoning required |
| L2 Code Generation | Sonnet | Quality code output |
| L3 Workers | Haiku | Simple extraction, formatting |

### Pattern 3: Multi-Phase Orchestration

**Use Case**: Large projects with sequential phases and validation gates.

```typescript
interface Phase {
  id: string;
  name: string;
  parallel: boolean;      // Can tasks run in parallel?
  tasks: Task[];
  validation: ValidationGate;
}

interface ValidationGate {
  check: (results: PhaseResult[]) => Promise<ValidationResult>;
}

async function executePhases(phases: Phase[]): Promise<PhaseResults> {
  const results: PhaseResult[] = [];
  let context = {};

  for (const phase of phases) {
    console.log(`Starting Phase: ${phase.name}`);

    // Execute phase tasks
    const phaseResult = phase.parallel
      ? await executeParallel(phase.tasks, context)
      : await executeSequential(phase.tasks, context);

    // Validation gate
    const validation = await phase.validation.check(phaseResult);

    if (!validation.passed) {
      return {
        completed: results,
        failed: phase,
        reason: validation.reason,
        context
      };
    }

    // Update context for next phase
    context = { ...context, [phase.id]: phaseResult };
    results.push({ phase, result: phaseResult, validation });
  }

  return { completed: results, context };
}
```

**Validation Gate Examples**:

```typescript
const validationGates = {
  discovery: {
    async check(results) {
      const allFilesFound = results.every(r => r.files?.length > 0);
      return { passed: allFilesFound, reason: allFilesFound ? null : 'Missing files' };
    }
  },

  implementation: {
    async check(results) {
      // Run tests
      const testResult = await Bash('npm test');
      const typeCheck = await Bash('npx tsc --noEmit');

      return {
        passed: testResult.exitCode === 0 && typeCheck.exitCode === 0,
        reason: testResult.exitCode !== 0 ? 'Tests failed' : 'Type errors'
      };
    }
  },

  deployment: {
    async check(results) {
      // Verify deployment is healthy
      const healthCheck = await fetch(`${deploymentUrl}/health`);
      return {
        passed: healthCheck.ok,
        reason: healthCheck.ok ? null : 'Health check failed'
      };
    }
  }
};
```

---

## Hook System Reference

### Hook Lifecycle

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│         UserPromptSubmit Hooks          │
│  ├─ context-injector                    │
│  ├─ session-id-generator                │
│  └─ token-budget-loader                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         PreToolUse Hooks                │
│  ├─ file-guard (block protected files)  │
│  ├─ branch-merge-checker                │
│  └─ token-guardian                      │
└─────────────────────────────────────────┘
    │
    ▼ (If all checks pass)
┌─────────────────────────────────────────┐
│         Tool Execution                  │
│  (Read, Write, Edit, Bash, Task, etc.)  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         PostToolUse Hooks               │
│  ├─ tool-output-cacher                  │
│  ├─ autonomous-decision-logger          │
│  ├─ github-progress                     │
│  └─ token-usage-monitor                 │
└─────────────────────────────────────────┘
```

### Hook Template Structure

```javascript
// templates/hooks/example-hook.template.js

/**
 * Example PreToolUse Hook
 *
 * Event: PreToolUse
 * Purpose: Block/allow tool execution
 */

export default {
  // Hook metadata
  name: 'example-hook',
  event: 'PreToolUse',  // PreToolUse | PostToolUse | UserPromptSubmit
  tools: ['*'],         // Which tools to intercept (* = all)
  priority: 100,        // Lower = runs first

  // Main hook function
  async execute(context) {
    const { tool, params, conversation } = context;

    // Check condition
    if (shouldBlock(tool, params)) {
      return {
        allow: false,
        reason: 'Operation blocked by policy'
      };
    }

    // Allow with modifications
    return {
      allow: true,
      modifiedParams: {
        ...params,
        additionalContext: 'injected by hook'
      }
    };
  }
};
```

### Available Hooks (12 Total)

| Hook | Event | Purpose |
|------|-------|---------|
| `tool-output-cacher` | PostToolUse | Cache outputs >2KB to save tokens |
| `token-budget-loader` | UserPromptSubmit | Pre-calculate daily budget |
| `token-usage-monitor` | PostToolUse | Auto-respawn at 90% threshold |
| `session-id-generator` | UserPromptSubmit | UUID session with PID registry |
| `autonomous-decision-logger` | PostToolUse | JSONL audit trail |
| `git-commit-tracker` | PostToolUse | Update PROGRESS.json |
| `branch-merge-checker` | PreToolUse | Block deploy on diverged branches |
| `phase-validation-gates` | PostToolUse | 5-gate validation |
| `issue-completion-detector` | PostToolUse | Auto-trigger deployment |
| `context-injector` | UserPromptSubmit | Inject prior session context |
| `happy-title-generator` | UserPromptSubmit | Auto-generate session titles |
| `happy-mode-detector` | UserPromptSubmit | Detect Happy daemon env |

### settings.json Configuration

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": [
      "file-guard",
      "branch-merge-checker"
    ],
    "postToolUse": [
      "tool-output-cacher",
      "autonomous-decision-logger",
      "github-progress"
    ],
    "userPromptSubmit": [
      "context-injector",
      "session-id-generator"
    ]
  },
  "hookConfig": {
    "file-guard": {
      "protectedPaths": [
        ".env",
        "*.pem",
        "credentials.json"
      ]
    },
    "token-usage-monitor": {
      "warningThreshold": 0.8,
      "criticalThreshold": 0.9,
      "autoRespawn": true
    }
  }
}
```

---

## Skill Development Guide

### Skill Package Structure

```
templates/skills/my-skill/
├── skill.json           # Manifest
├── skill.md             # Main prompt/instructions
├── context/             # RAG knowledge base
│   ├── patterns.md      # Common patterns
│   ├── gotchas.md       # Edge cases
│   └── examples/        # Code examples
│       ├── basic.md
│       └── advanced.md
└── workflows/           # Multi-step procedures
    ├── setup.md
    └── deploy.md
```

### skill.json Manifest

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Description for slash command help",
  "author": "your-name",
  "category": "development",
  "tags": ["react", "testing", "deployment"],
  "dependencies": {
    "mcpServers": ["playwright"],
    "tools": ["Bash", "Read", "Write"]
  },
  "entryPoint": "skill.md",
  "contextFiles": [
    "context/patterns.md",
    "context/gotchas.md"
  ]
}
```

### skill.md Template

```markdown
# My Skill

## Purpose

Brief description of what this skill does.

## Prerequisites

- Required tools/MCPs
- Environment setup

## Workflow

### Step 1: Analysis

[Instructions for first step]

### Step 2: Implementation

[Instructions for second step]

### Step 3: Validation

[Instructions for validation]

## Common Patterns

{{#include context/patterns.md}}

## Troubleshooting

{{#include context/gotchas.md}}
```

---

## Template Engine Internals

### Placeholder Resolution

```javascript
// src/utils/template-engine.js

const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

function resolveValue(path, values) {
  const parts = path.trim().split('.');
  let current = values;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

function replacePlaceholders(content, values, options = {}) {
  const warnings = [];

  const result = content.replace(PLACEHOLDER_REGEX, (match, path) => {
    const value = resolveValue(path, values);

    if (value === undefined) {
      if (options.preserveUnknown) return match;
      warnings.push(`Unresolved: ${path}`);
      return `{{${path}}}`;
    }

    return String(value);
  });

  return { content: result, warnings };
}
```

### Conditional Processing

```javascript
const CONDITIONAL_REGEX = /\{\{#if\s+(.+?)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

function processConditionals(content, values) {
  return content.replace(CONDITIONAL_REGEX, (match, condition, ifBlock, elseBlock = '') => {
    const result = evaluateCondition(condition, values);
    return result ? ifBlock : elseBlock;
  });
}

function evaluateCondition(condition, values) {
  // Handle helper functions: (eq path "value"), (or a b), etc.
  const helperMatch = condition.match(/\((\w+)\s+(.+)\)/);

  if (helperMatch) {
    const [, helper, args] = helperMatch;
    return evaluateHelper(helper, args, values);
  }

  // Simple path check
  return Boolean(resolveValue(condition, values));
}

function evaluateHelper(helper, args, values) {
  switch (helper) {
    case 'eq': {
      const [path, expected] = parseArgs(args);
      return resolveValue(path, values) === expected;
    }
    case 'neq': {
      const [path, expected] = parseArgs(args);
      return resolveValue(path, values) !== expected;
    }
    case 'and': {
      const paths = args.split(/\s+/);
      return paths.every(p => Boolean(resolveValue(p, values)));
    }
    case 'or': {
      const paths = args.split(/\s+/);
      return paths.some(p => Boolean(resolveValue(p, values)));
    }
    case 'not': {
      return !Boolean(resolveValue(args.trim(), values));
    }
    default:
      return false;
  }
}
```

---

## MCP Server Integration

### Registry Structure

```javascript
// src/commands/explore-mcp/mcp-registry.js

export const MCP_REGISTRY = {
  testing: [
    {
      id: 'playwright',
      name: 'Playwright MCP',
      description: 'Browser automation for E2E testing',
      npmPackage: '@playwright/mcp@latest',
      category: 'testing',
      requiredEnv: {},
      optionalEnv: {
        PLAYWRIGHT_HEADLESS: { default: 'true' }
      },
      relevantFor: ['react', 'vue', 'angular', 'frontend'],
      recommended: true,
      tools: ['browser_navigate', 'browser_click', 'browser_screenshot']
    }
  ],

  deployment: [
    {
      id: 'railway',
      name: 'Railway MCP',
      npmPackage: '@jasontanswe/railway-mcp',
      requiredEnv: {
        RAILWAY_API_TOKEN: { description: 'Railway API token' }
      },
      relevantFor: ['railway', 'backend', 'api']
    }
  ],

  debugging: [
    {
      id: 'log-monitor',
      name: 'Log Monitor MCP',
      npmPackage: '@anthropic/log-monitor-mcp',
      tools: ['logs_list', 'logs_tail', 'logs_grep', 'logs_watch']
    }
  ],

  tunnel: [
    {
      id: 'ngrok',
      name: 'ngrok Tunnel',
      command: 'ngrok',
      npmPackage: null,  // Not an MCP, CLI tool
      requiredEnv: { NGROK_AUTHTOKEN: {} },
      installGuide: 'https://ngrok.com/download'
    }
  ]
};
```

### Recommendation Algorithm

```javascript
function getRecommendedMcps(analysis) {
  const allMcps = getAllMcps();
  const keywords = new Set(['all']);

  // Build keyword set from analysis
  if (analysis.frontend.detected) {
    keywords.add('frontend');
    keywords.add(analysis.frontend.framework?.toLowerCase());
  }
  if (analysis.backend.detected) {
    keywords.add('backend');
    keywords.add(analysis.backend.framework?.toLowerCase());
  }
  // ... etc

  // Score each MCP
  const recommendations = allMcps.map(mcp => {
    let score = mcp.recommended ? 10 : 0;

    for (const keyword of mcp.relevantFor) {
      if (keywords.has(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Testing MCPs bonus for frontend
    if (mcp.category === 'testing' && keywords.has('frontend')) {
      score += 8;
    }

    return { ...mcp, score };
  });

  return recommendations
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

---

## Phased Development System

### PROGRESS.json Schema

```json
{
  "version": "1.0.0",
  "projectId": "uuid-here",
  "createdAt": "2026-01-30T00:00:00Z",
  "currentPhase": 2,
  "phases": [
    {
      "id": "discovery",
      "name": "Codebase Discovery",
      "status": "complete",
      "startedAt": "2026-01-30T00:00:00Z",
      "completedAt": "2026-01-30T01:00:00Z",
      "tasks": [
        { "id": "t1", "description": "Find auth files", "status": "complete" },
        { "id": "t2", "description": "Find API endpoints", "status": "complete" }
      ],
      "artifacts": [
        { "type": "file_list", "path": ".claude/phase-dev/discovery-files.json" }
      ],
      "validation": {
        "gate": "discovery",
        "passed": true,
        "checks": [
          { "name": "files_found", "passed": true },
          { "name": "no_errors", "passed": true }
        ]
      }
    },
    {
      "id": "implementation",
      "name": "Code Implementation",
      "status": "in_progress",
      "startedAt": "2026-01-30T01:00:00Z",
      "tasks": [
        { "id": "t3", "description": "Implement feature", "status": "in_progress" },
        { "id": "t4", "description": "Add tests", "status": "pending" }
      ]
    }
  ],
  "context": {
    "discovery": {
      "files": ["src/auth.ts", "src/api.ts"],
      "patterns": ["JWT", "OAuth"]
    }
  }
}
```

### 5-Gate Validation System

```
EXIST → INIT → REGISTER → INVOKE → PROPAGATE

1. EXIST: Required files/directories exist
2. INIT: Initialization commands succeed
3. REGISTER: Components registered in configs
4. INVOKE: Functionality works when called
5. PROPAGATE: Changes reflected in dependents
```

Implementation:

```javascript
const GATES = ['EXIST', 'INIT', 'REGISTER', 'INVOKE', 'PROPAGATE'];

async function validatePhase(phase, config) {
  const results = {};

  for (const gate of GATES) {
    results[gate] = await validateGate(gate, config);

    if (!results[gate].passed) {
      return { passed: false, failedGate: gate, results };
    }
  }

  return { passed: true, results };
}

async function validateGate(gate, config) {
  switch (gate) {
    case 'EXIST':
      return checkFilesExist(config.files);

    case 'INIT':
      return runInitCommands(config.commands);

    case 'REGISTER':
      return verifyRegistrations(config.registrations);

    case 'INVOKE':
      return testFunctionality(config.tests);

    case 'PROPAGATE':
      return verifyPropagation(config.dependents);
  }
}
```

---

## Performance & Token Optimization

### Token Budget Management

```javascript
// Hook: token-budget-loader

const DAILY_BUDGET = 100000;  // Adjust per plan
const SESSION_BUDGET = 10000;

function loadTokenBudget() {
  const today = new Date().toISOString().split('T')[0];
  const budgetFile = `${HOME}/.claude/token-budget-${today}.json`;

  let budget = { used: 0, remaining: DAILY_BUDGET };

  if (fs.existsSync(budgetFile)) {
    budget = JSON.parse(fs.readFileSync(budgetFile));
  }

  return {
    daily: budget,
    session: { used: 0, remaining: SESSION_BUDGET },
    warningThreshold: 0.8,
    criticalThreshold: 0.9
  };
}
```

### Output Caching

```javascript
// Hook: tool-output-cacher

const CACHE_THRESHOLD = 2048;  // bytes
const CACHE_DIR = '.claude/cache/outputs';

async function cacheOutput(tool, params, output) {
  if (output.length < CACHE_THRESHOLD) return output;

  const hash = crypto.createHash('md5')
    .update(JSON.stringify({ tool, params }))
    .digest('hex');

  const cachePath = `${CACHE_DIR}/${hash}.json`;
  await fs.writeFile(cachePath, JSON.stringify({
    tool,
    params,
    output,
    cachedAt: new Date().toISOString()
  }));

  return `[Cached: ${cachePath}] First 500 chars: ${output.slice(0, 500)}...`;
}
```

### Model Selection for Cost Optimization

| Task Type | Recommended Model | Token Cost |
|-----------|-------------------|------------|
| File search/grep | Haiku | $0.25/1M |
| Simple extraction | Haiku | $0.25/1M |
| Code analysis | Sonnet | $3/1M |
| Complex reasoning | Sonnet | $3/1M |
| Code generation | Sonnet | $3/1M |
| Orchestration | Sonnet | $3/1M |
| Critical decisions | Opus | $15/1M |

---

## Extension API

### Creating Custom Commands

```javascript
// src/commands/my-command.js

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader } from '../cli/menu.js';

export async function runMyCommand(options = {}) {
  showHeader('My Command');

  // Interactive prompts
  const { input } = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: 'Enter value:',
      validate: (val) => val.length > 0 || 'Required'
    }
  ]);

  // Process
  const result = await processInput(input);

  // Output
  console.log(chalk.green('✓ Success'));
  return result;
}
```

### Registering in CLI

```javascript
// bin/gtask.js

import { runMyCommand } from '../src/commands/my-command.js';

program
  .command('my-command')
  .description('Description here')
  .option('--flag', 'Flag description')
  .action(async (options) => {
    await runMyCommand(options);
  });
```

### Creating Custom Hooks

```javascript
// .claude/hooks/pre-tool-use/my-hook.js

export default {
  name: 'my-hook',
  event: 'PreToolUse',
  tools: ['Write', 'Edit'],

  async execute(context) {
    const { tool, params } = context;

    // Custom logic
    if (params.file_path.includes('protected')) {
      return {
        allow: false,
        reason: 'Cannot modify protected files'
      };
    }

    return { allow: true };
  }
};
```

---

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Commands not appearing | Session not restarted | Restart Claude Code CLI |
| Hooks not firing | Not enabled in settings | Check settings.json |
| Tech stack empty | Not in project root | cd to directory with package.json |
| GitHub auth fails | Token expired | `gh auth refresh` |
| MCP connection fails | Server not running | Check MCP logs |

### Debug Commands

```bash
# Verbose tech stack detection
ccasp detect-stack --verbose

# List all installed features
ls -la .claude/commands/

# Check hook configuration
cat .claude/settings.json

# Verify MCP configuration
cat .mcp.json

# Test template processing
ccasp validate --path templates/commands/
```

### Log Locations

| Log | Location | Purpose |
|-----|----------|---------|
| CCASP CLI | stdout | Command execution |
| Claude Code | `~/.claude/logs/` | Session logs |
| MCP Servers | `~/.claude/mcp-logs/` | Server output |
| Decision audit | `.claude/logs/decisions.jsonl` | Agent decisions |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.8.0 | 2026-01-30 | 7 utility scripts, install-scripts command |
| 1.7.0 | 2026-01-30 | 7 MCP servers (log-monitor, tunnel services) |
| 1.6.0 | 2026-01-30 | 4 agent patterns library |
| 1.5.0 | 2026-01-30 | 5 documentation templates |
| 1.4.0 | 2026-01-30 | 5 command templates (refactoring, testing) |
| 1.3.0 | 2026-01-30 | 3 skill templates, install-skill command |
| 1.2.0 | 2026-01-30 | 7 additional hook templates |
| 1.1.0 | 2026-01-30 | 5 missing hook templates |
| 1.0.0 | Initial | Core CLI, init, wizard |

---

*Documentation generated for Claude CLI Advanced Starter Pack v1.8.0*
