# Configuration Schema

This document provides the complete schema reference for all CCASP configuration files.

## Table of Contents

- [tech-stack.json](#tech-stackjson)
- [settings.json](#settingsjson)
- [PROGRESS.json](#progressjson)
- [Agent Definition Schema](#agent-definition-schema)
- [Hook Definition Schema](#hook-definition-schema)
- [Skill Definition Schema](#skill-definition-schema)
- [Command Definition Schema](#command-definition-schema)

---

## tech-stack.json

The primary configuration file that stores detected and user-configured values.

### Complete Schema

```typescript
interface TechStack {
  // Schema version (currently "2.0.0")
  version: string;

  // Project information
  project: {
    name: string;                    // Project name (auto-detected from package.json or folder)
    type: ProjectType;               // "frontend" | "backend" | "fullstack" | "monorepo"
    description?: string;            // Optional description
    path?: string;                   // Absolute path to project root
  };

  // Frontend configuration
  frontend?: {
    framework: FrontendFramework;    // "react" | "vue" | "angular" | "svelte" | "next" | "nuxt" | "astro"
    port: number;                    // Dev server port (e.g., 5173, 3000)
    path?: string;                   // Relative path to frontend (for monorepos)
    buildCommand: string;            // e.g., "npm run build"
    devCommand: string;              // e.g., "npm run dev"
    distDir: string;                 // Build output directory (e.g., "dist", "build", ".next")
    bundler?: string;                // "vite" | "webpack" | "esbuild" | "turbopack"
    typescript?: boolean;            // Whether TypeScript is used
    cssFramework?: string;           // "tailwind" | "styled-components" | "sass" | "css-modules"
    stateManagement?: string;        // "zustand" | "redux" | "recoil" | "jotai"
  };

  // Backend configuration
  backend?: {
    framework: BackendFramework;     // "express" | "fastapi" | "nestjs" | "django" | "flask" | "rails" | "gin"
    language: Language;              // "javascript" | "typescript" | "python" | "go" | "ruby"
    port: number;                    // Server port (e.g., 8001, 3001)
    path?: string;                   // Relative path to backend (for monorepos)
    devCommand?: string;             // e.g., "python run_api.py"
    healthEndpoint: string;          // e.g., "/health", "/api/health"
    apiPrefix?: string;              // e.g., "/api", "/api/v1"
  };

  // Database configuration
  database?: {
    type: DatabaseType;              // "postgresql" | "mysql" | "mongodb" | "sqlite" | "redis"
    orm?: string;                    // "prisma" | "typeorm" | "sqlalchemy" | "drizzle" | "mongoose"
    host?: string;                   // Database host
    port?: number;                   // Database port
    name?: string;                   // Database name
    connectionString?: string;       // Full connection string (for placeholders)
  };

  // Testing configuration
  testing?: {
    unit?: TestFramework;            // "jest" | "vitest" | "mocha" | "pytest" | "go test"
    e2e?: E2EFramework;              // "playwright" | "cypress" | "selenium"
    unitCommand?: string;            // e.g., "npm test", "pytest"
    e2eCommand?: string;             // e.g., "npm run test:e2e"
    coverageThreshold?: number;      // e.g., 80
    testDir?: string;                // e.g., "tests/", "__tests__/"
  };

  // Deployment configuration
  deployment?: {
    frontend?: {
      platform: FrontendPlatform;    // "cloudflare" | "vercel" | "netlify" | "github-pages" | "railway" | "aws-s3"
      projectName?: string;          // Platform project name
      productionUrl?: string;        // Production URL
      deployCommand?: string;        // Custom deploy command
    };
    backend?: {
      platform: BackendPlatform;     // "railway" | "heroku" | "render" | "fly" | "vercel" | "aws-lambda" | "self-hosted"
      projectId?: string;            // Platform-specific project ID
      serviceId?: string;            // Platform-specific service ID
      environmentId?: string;        // Platform-specific environment ID
      productionUrl?: string;        // Production URL
      deployCommand?: string;        // Custom deploy command
      // SSH for self-hosted
      sshHost?: string;
      sshUser?: string;
      sshPath?: string;
    };
  };

  // Version control configuration
  versionControl?: {
    provider: VCSProvider;           // "github" | "gitlab" | "bitbucket"
    owner: string;                   // Username or organization
    repo: string;                    // Repository name
    defaultBranch: string;           // e.g., "main", "master"
    projectBoard?: {
      type?: string;                 // "project-v2" | "classic"
      number: number;                // Project number
      id?: string;                   // GraphQL ID
      url?: string;                  // Full URL to project board
    };
  };

  // Development environment
  devEnvironment?: {
    tunnel?: {
      service: TunnelService;        // "ngrok" | "localtunnel" | "cloudflare-tunnel" | "serveo"
      authToken?: string;            // Service auth token
      subdomain?: string;            // Reserved subdomain
      port?: number;                 // Port to tunnel
      startCommand?: string;         // Full start command
    };
  };

  // Token management
  tokenManagement?: {
    enabled: boolean;
    dailyBudget?: number;            // Max tokens per day (e.g., 100000)
    thresholds?: {
      compact: number;               // Compaction threshold (e.g., 0.75)
      archive: number;               // Archive threshold (e.g., 0.90)
      respawn: number;               // Respawn threshold (e.g., 0.95)
    };
    trackingFile?: string;           // Path to usage tracking file
  };

  // Happy Mode integration
  happyMode?: {
    enabled: boolean;
    dashboardUrl?: string;           // Happy dashboard URL
    checkpointInterval?: number;     // Minutes between checkpoints
    verbosity?: Verbosity;           // "full" | "condensed" | "minimal"
    notifications?: {
      onTaskComplete?: boolean;
      onError?: boolean;
      onCheckpoint?: boolean;
    };
  };

  // Feature flags
  features: {
    githubIntegration: boolean;
    phasedDevelopment: boolean;
    tokenManagement: boolean;
    deploymentAutomation: boolean;
    tunnelServices: boolean;
    happyMode: boolean;
  };

  // Custom/user-defined values
  custom?: Record<string, any>;

  // Pending configuration items (for audit)
  _pendingConfiguration?: string[];
}

// Type definitions
type ProjectType = "frontend" | "backend" | "fullstack" | "monorepo";
type FrontendFramework = "react" | "vue" | "angular" | "svelte" | "next" | "nuxt" | "astro";
type BackendFramework = "express" | "fastapi" | "nestjs" | "django" | "flask" | "rails" | "gin";
type Language = "javascript" | "typescript" | "python" | "go" | "ruby";
type DatabaseType = "postgresql" | "mysql" | "mongodb" | "sqlite" | "redis";
type TestFramework = "jest" | "vitest" | "mocha" | "pytest";
type E2EFramework = "playwright" | "cypress" | "selenium";
type FrontendPlatform = "cloudflare" | "vercel" | "netlify" | "github-pages" | "railway" | "aws-s3";
type BackendPlatform = "railway" | "heroku" | "render" | "fly" | "vercel" | "aws-lambda" | "self-hosted";
type VCSProvider = "github" | "gitlab" | "bitbucket";
type TunnelService = "ngrok" | "localtunnel" | "cloudflare-tunnel" | "serveo";
type Verbosity = "full" | "condensed" | "minimal";
```

### Example tech-stack.json

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-fullstack-app",
    "type": "fullstack",
    "description": "A full-stack application with React and FastAPI"
  },
  "frontend": {
    "framework": "react",
    "port": 5173,
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "distDir": "dist",
    "bundler": "vite",
    "typescript": true,
    "cssFramework": "tailwind",
    "stateManagement": "zustand"
  },
  "backend": {
    "framework": "fastapi",
    "language": "python",
    "port": 8001,
    "path": "backend",
    "devCommand": "python run_api.py",
    "healthEndpoint": "/health",
    "apiPrefix": "/api"
  },
  "database": {
    "type": "postgresql",
    "orm": "sqlalchemy"
  },
  "testing": {
    "unit": "vitest",
    "e2e": "playwright",
    "unitCommand": "npm test",
    "e2eCommand": "npm run test:e2e",
    "coverageThreshold": 80
  },
  "deployment": {
    "frontend": {
      "platform": "cloudflare",
      "projectName": "my-app",
      "productionUrl": "https://my-app.pages.dev"
    },
    "backend": {
      "platform": "railway",
      "projectId": "abc123",
      "serviceId": "def456",
      "environmentId": "ghi789",
      "productionUrl": "https://api.my-app.com"
    }
  },
  "versionControl": {
    "provider": "github",
    "owner": "evan043",
    "repo": "my-fullstack-app",
    "defaultBranch": "main",
    "projectBoard": {
      "number": 3
    }
  },
  "tokenManagement": {
    "enabled": true,
    "dailyBudget": 100000,
    "thresholds": {
      "compact": 0.75,
      "archive": 0.90,
      "respawn": 0.95
    }
  },
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

---

## settings.json

Hook and agent configuration for the `.claude/` folder.

### Complete Schema

```typescript
interface Settings {
  // Hook configuration
  hooks: {
    enabled: boolean;                // Master enable/disable
    preToolUse: string[];            // Hook names for PreToolUse
    postToolUse: string[];           // Hook names for PostToolUse
    userPromptSubmit: string[];      // Hook names for UserPromptSubmit
    disabled?: string[];             // Temporarily disabled hooks
    priorities?: {
      lifecycle?: number;            // Priority for lifecycle hooks
      tools?: number;                // Priority for tool hooks
    };
  };

  // Agent defaults
  agents?: {
    defaultModel: Model;             // Default model for agents
    maxTokensPerTask: number;        // Max tokens per agent task
    allowParallelExecution?: boolean;
  };

  // Permissions
  permissions?: {
    allowBashCommands?: string[];    // Allowed bash patterns
    denyBashCommands?: string[];     // Denied bash patterns
    allowFilePatterns?: string[];    // Allowed file patterns
    denyFilePatterns?: string[];     // Denied file patterns
  };

  // MCP servers
  mcpServers?: {
    installed: string[];             // Installed MCP server names
    config?: Record<string, any>;    // Per-server configuration
  };
}

type Model = "opus" | "sonnet" | "haiku";
```

### Example settings.json

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": [
      "file-guard",
      "token-guardian",
      "deployment-orchestrator"
    ],
    "postToolUse": [
      "test-enforcer",
      "github-progress",
      "context-guardian"
    ],
    "userPromptSubmit": [
      "context-loader"
    ],
    "disabled": [],
    "priorities": {
      "lifecycle": 1,
      "tools": 2
    }
  },
  "agents": {
    "defaultModel": "sonnet",
    "maxTokensPerTask": 8000,
    "allowParallelExecution": true
  },
  "permissions": {
    "allowBashCommands": [
      "npm *",
      "git *",
      "python *"
    ],
    "denyBashCommands": [
      "rm -rf /",
      "sudo *"
    ],
    "denyFilePatterns": [
      ".env",
      "*.pem",
      "credentials.*"
    ]
  },
  "mcpServers": {
    "installed": ["railway", "playwright", "github"]
  }
}
```

---

## PROGRESS.json

State tracking for phased development projects.

### Complete Schema

```typescript
interface ProgressFile {
  // Project metadata
  project: string;                   // Project slug (kebab-case)
  description?: string;              // Project description
  scale: Scale;                      // "S" | "M" | "L" | "XL"
  createdAt: string;                 // ISO timestamp
  updatedAt: string;                 // ISO timestamp

  // Execution state
  status: Status;                    // "pending" | "in_progress" | "completed" | "blocked"
  currentPhase: number;              // Current phase number (1-indexed)

  // Tech stack snapshot
  techStack?: {
    detected: boolean;               // Whether auto-detected
    frontend?: string;
    backend?: string;
    database?: string;
  };

  // Phases
  phases: Phase[];

  // Global success criteria
  globalSuccessCriteria: Criterion[];

  // Blockers
  blockers: Blocker[];

  // Execution notes
  notes: Note[];

  // Execution log
  executionLog?: ExecutionEntry[];

  // Checkpoints
  checkpoints?: Checkpoint[];
}

interface Phase {
  number: number;                    // Phase number (1-indexed)
  name: string;                      // Phase name
  description?: string;              // Phase description
  status: Status;
  startedAt?: string;                // ISO timestamp
  completedAt?: string;              // ISO timestamp
  tasks: Task[];
  successCriteria: Criterion[];
  dependencies?: string[];           // Prerequisite phases/tasks
  rollbackPlan?: string;             // Rollback instructions
  estimatedDuration?: string;        // e.g., "2-3 hours"
}

interface Task {
  id: string;                        // e.g., "1.1", "2.3"
  name: string;                      // Task name
  description?: string;              // Detailed description
  done: boolean;                     // Completion status
  files?: string[];                  // Files modified
  notes?: string;                    // Task-specific notes
  blockedBy?: string;                // Blocking issue
}

interface Criterion {
  criterion: string;                 // Description of criterion
  met: boolean;                      // Whether criterion is met
  verifiedAt?: string;               // When verified (ISO)
}

interface Blocker {
  id: string;                        // Blocker ID
  description: string;               // What's blocking
  createdAt: string;                 // ISO timestamp
  resolvedAt?: string;               // When resolved (ISO)
  resolution?: string;               // How it was resolved
}

interface Note {
  timestamp: string;                 // ISO timestamp
  note: string;                      // Note content
  phase?: number;                    // Related phase
  task?: string;                     // Related task ID
}

interface ExecutionEntry {
  timestamp: string;
  action: string;                    // "phase_started" | "task_completed" | etc
  phase?: number;
  task?: string;
  details?: string;
}

interface Checkpoint {
  id: string;
  timestamp: string;
  phase: number;
  description: string;
  state: "clean" | "modified";
}

type Scale = "S" | "M" | "L" | "XL";
type Status = "pending" | "in_progress" | "completed" | "blocked";
```

### Example PROGRESS.json

```json
{
  "project": "user-authentication",
  "description": "Add JWT-based user authentication with OAuth support",
  "scale": "M",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "status": "in_progress",
  "currentPhase": 2,
  "techStack": {
    "detected": true,
    "frontend": "react",
    "backend": "fastapi",
    "database": "postgresql"
  },
  "phases": [
    {
      "number": 1,
      "name": "Setup",
      "description": "Configure auth dependencies and database schema",
      "status": "completed",
      "startedAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T11:30:00Z",
      "tasks": [
        {
          "id": "1.1",
          "name": "Add JWT library",
          "done": true,
          "files": ["package.json", "requirements.txt"]
        },
        {
          "id": "1.2",
          "name": "Create User model",
          "done": true,
          "files": ["backend/models/user.py"]
        }
      ],
      "successCriteria": [
        { "criterion": "JWT library installed", "met": true },
        { "criterion": "User table exists", "met": true }
      ]
    },
    {
      "number": 2,
      "name": "Implementation",
      "description": "Build authentication endpoints",
      "status": "in_progress",
      "startedAt": "2024-01-15T11:30:00Z",
      "tasks": [
        { "id": "2.1", "name": "Create auth router", "done": true },
        { "id": "2.2", "name": "Add JWT middleware", "done": false },
        { "id": "2.3", "name": "Implement login", "done": false }
      ],
      "successCriteria": [
        { "criterion": "Login returns valid JWT", "met": false }
      ]
    }
  ],
  "globalSuccessCriteria": [
    { "criterion": "All tests pass", "met": false },
    { "criterion": "No security vulnerabilities", "met": false }
  ],
  "blockers": [],
  "notes": [
    {
      "timestamp": "2024-01-15T11:00:00Z",
      "note": "Decided to use python-jose for JWT handling",
      "phase": 1
    }
  ]
}
```

---

## Agent Definition Schema

Markdown files with YAML frontmatter in `.claude/agents/`.

### Schema

```yaml
---
# Required fields
name: string              # Unique identifier (kebab-case)
type: AgentType           # "L1" | "L2" | "L3" | "RAG-Pipeline" | "Phase-Dev"
model: Model              # "opus" | "sonnet" | "haiku"
description: string       # Human-readable description

# Optional fields
triggers?: string[]       # Keywords that activate this agent
project?: string          # For Phase-Dev agents
maxTokens?: number        # Token limit for this agent
allowedTools?: string[]   # Specific tools this agent can use
---
```

### Full Example

```markdown
---
name: frontend-specialist
type: L2
model: sonnet
description: Frontend development specialist for React/TypeScript
triggers:
  - "frontend"
  - "react"
  - "component"
---

# Frontend Specialist Agent

## Purpose
Handle all frontend development tasks including components, styling, and state management.

## Expertise
- React 19 components and hooks
- TypeScript type safety
- Tailwind CSS styling
- Zustand state management
- React Query for data fetching

## Tools Available
- Read, Write, Edit (file operations)
- Bash (npm commands only)
- Glob, Grep (code search)

## Behavior
1. Always check existing patterns before creating new code
2. Follow project's established conventions
3. Use TypeScript strict mode
4. Run type checks after modifications
5. Suggest tests for new components

## Context Files
- src/components/**/*.tsx
- src/hooks/**/*.ts
- src/types/**/*.ts
- src/styles/**/*.css

## Success Criteria
- [ ] Component renders correctly
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Follows project conventions
```

---

## Hook Definition Schema

JavaScript files in `.claude/hooks/` subdirectories.

### Schema

```javascript
export default {
  // Required
  name: string,           // Unique hook name
  type: HookType,         // "PreToolUse" | "PostToolUse" | "UserPromptSubmit"

  // Optional
  tools?: string[],       // Tool filter (default: ['*'])
  priority?: number,      // Execution order (lower = earlier)

  // Required method
  async execute(context: HookContext): Promise<HookResult>
};

// HookContext varies by type (see Architecture page)

interface HookResult {
  action: "allow" | "block" | "modify" | "warn";
  message?: string;       // For block/warn
  params?: object;        // For modify (new params)
  context?: object;       // For UserPromptSubmit (additional context)
}
```

### Full Example

```javascript
// .claude/hooks/pre-tool-use/file-guard.js

const PROTECTED_PATTERNS = [
  /\.env$/,
  /credentials\.json$/,
  /secrets\//,
  /\.pem$/,
];

export default {
  name: 'file-guard',
  type: 'PreToolUse',
  tools: ['Write', 'Edit'],
  priority: 1,

  async execute(context) {
    const { tool, params } = context;
    const filePath = params.file_path || params.path;

    if (!filePath) {
      return { action: 'allow' };
    }

    for (const pattern of PROTECTED_PATTERNS) {
      if (pattern.test(filePath)) {
        return {
          action: 'block',
          message: `Protected file: ${filePath}. Cannot modify security-sensitive files.`
        };
      }
    }

    return { action: 'allow' };
  }
};
```

---

## Skill Definition Schema

Markdown files with YAML frontmatter in `.claude/skills/skill-name/skill.md`.

### Schema

```yaml
---
# Required
name: string              # Skill identifier (kebab-case)
description: string       # What this skill does
version: string           # Semantic version

# Optional
triggers?: string[]       # Activation keywords
author?: string
tags?: string[]
---
```

### Full Example

```markdown
---
name: react-component
description: Create React components following project patterns
version: 1.0.0
triggers:
  - "create component"
  - "new component"
  - "add component"
tags:
  - frontend
  - react
  - components
---

# React Component Skill

## Purpose
Create React components that follow project conventions and best practices.

## Context Files
- context/patterns.md - Component patterns and conventions
- context/examples.md - Real examples from codebase
- context/gotchas.md - Common mistakes to avoid

## Workflow

### 1. Gather Requirements
- Component name (PascalCase)
- Props interface
- State requirements
- Event handlers needed

### 2. Check Existing Patterns
Load: context/patterns.md

### 3. Generate Component
Use template: templates/component.tsx

### 4. Generate Tests
Use template: templates/test.spec.tsx

### 5. Validate
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] Follows naming conventions
- [ ] Proper prop types

## Templates

### Component Template
```tsx
import React from 'react';

interface {{ComponentName}}Props {
  {{props}}
}

export function {{ComponentName}}({ {{destructuredProps}} }: {{ComponentName}}Props) {
  return (
    <div className="{{className}}">
      {{children}}
    </div>
  );
}
```

### Test Template
```tsx
import { render, screen } from '@testing-library/react';
import { {{ComponentName}} } from './{{ComponentName}}';

describe('{{ComponentName}}', () => {
  it('renders correctly', () => {
    render(<{{ComponentName}} {{defaultProps}} />);
    expect(screen.getByRole('{{role}}')).toBeInTheDocument();
  });
});
```
```

---

## Command Definition Schema

Markdown files with YAML frontmatter in `.claude/commands/`.

### Schema

```yaml
---
# Optional metadata
description?: string      # Short description for help
complexity?: Complexity   # "simple" | "standard" | "complex" | "expert"
model?: Model            # Preferred model
delegatesTo?: string     # skill: or @agent reference
arguments?: string[]     # Expected arguments
---
```

### Full Example

```markdown
---
description: Deploy full-stack application to production
complexity: complex
model: sonnet
arguments:
  - "--skip-tests"
  - "--backend-only"
  - "--frontend-only"
---

# Deploy Full Stack

Deploy both frontend and backend to their respective platforms.

## Prerequisites
- All tests pass
- No uncommitted changes
- Valid deployment credentials

## Steps

### 1. Pre-flight Checks
- Run `npm test`
- Check git status
- Verify environment variables

### 2. Build Frontend
```bash
npm run build
```

### 3. Deploy Frontend
{{#if (eq deployment.frontend.platform "cloudflare")}}
```bash
npx wrangler pages deploy {{frontend.distDir}} --project-name={{deployment.frontend.projectName}}
```
{{/if}}

### 4. Deploy Backend
{{#if (eq deployment.backend.platform "railway")}}
Use Railway MCP:
```
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}"
})
```
{{/if}}

### 5. Verify
- Check frontend URL: {{deployment.frontend.productionUrl}}
- Check backend health: {{deployment.backend.productionUrl}}/health

## Rollback
If deployment fails:
1. Railway: Redeploy previous version from dashboard
2. Cloudflare: Revert to previous deployment
```

---

## See Also

- [Architecture](Architecture) - How these configs are used
- [API Reference](API-Reference) - Programmatic access
- [Templates](Templates) - Template syntax
