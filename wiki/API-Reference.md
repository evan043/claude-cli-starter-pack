# API Reference

CCASP exports its core functionality for programmatic use. This reference documents all public exports.

## Installation

```bash
npm install claude-cli-advanced-starter-pack
```

## Import

```javascript
import {
  // Setup & Detection
  runSetupWizard,
  detectTechStack,
  runClaudeAudit,
  runEnhancement,
  ENHANCEMENT_TEMPLATES,

  // Template Processing
  replacePlaceholders,
  processFile,
  processDirectory,
  generateTechStack,
  flattenObject,
  extractPlaceholders,
  validateTechStack,

  // GitHub Integration
  isAuthenticated,
  getCurrentUser,
  listRepos,
  repoExists,
  listProjects,
  getProject,
  listProjectFields,
  getFieldOptions,
  createIssue,
  listIssues,
  getIssue,
  addIssueComment,
  addIssueToProject,
  getProjectItemId,
  updateProjectItemField,

  // Codebase Analysis
  searchFiles,
  searchContent,
  findDefinitions,
  extractSnippet,
  analyzeForIssue,
  detectProjectType,

  // Templates
  generateClaudeCommand,
  generateMinimalClaudeCommand,
  generateIssueBody,
  generateSimpleIssueBody,
  suggestAcceptanceCriteria,

  // Utilities
  getVersion,
  checkPrerequisites,
  loadConfigSync,
  execCommand,
} from 'claude-cli-advanced-starter-pack';
```

---

## Setup & Detection

### `detectTechStack(projectPath)`

Scans a project directory to detect its technology stack.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `projectPath` | `string` | Absolute path to project root |

**Returns:** `Promise<TechStack>`

**Example:**
```javascript
const techStack = await detectTechStack('/path/to/project');

console.log(techStack.frontend.framework);  // "react"
console.log(techStack.backend.framework);   // "fastapi"
console.log(techStack.testing.unit);        // "vitest"
console.log(techStack.testing.e2e);         // "playwright"
```

**Detection Sources:**
- `package.json` - Dependencies, scripts
- `vite.config.*` - Vite configuration
- `next.config.*` - Next.js configuration
- `tsconfig.json` - TypeScript setup
- `requirements.txt` - Python dependencies
- `.git/config` - Repository URL
- `railway.json`, `vercel.json`, `wrangler.toml` - Deployment config

---

### `runSetupWizard(options)`

Launches the interactive setup wizard.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `options.projectPath` | `string` | Target directory (default: `cwd`) |
| `options.silent` | `boolean` | Suppress output (default: `false`) |

**Returns:** `Promise<SetupResult>`

**Example:**
```javascript
const result = await runSetupWizard({
  projectPath: '/path/to/project',
  silent: false
});

console.log(result.features);  // ['github', 'phasedDev']
console.log(result.commandsCreated);  // ['menu.md', 'github-update.md', ...]
```

---

### `runClaudeAudit(projectPath)`

Audits the CLAUDE.md file and `.claude/` folder against best practices.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `projectPath` | `string` | Project root path |

**Returns:** `Promise<AuditResult>`

**Example:**
```javascript
const audit = await runClaudeAudit('/path/to/project');

console.log(audit.score);      // 85 (out of 100)
console.log(audit.warnings);   // ['Missing tech stack section', ...]
console.log(audit.errors);     // ['Invalid YAML frontmatter']
console.log(audit.suggestions); // ['Add @import syntax', ...]
```

---

### `ENHANCEMENT_TEMPLATES`

Collection of templates for generating CLAUDE.md content.

**Properties:**
| Name | Description |
|------|-------------|
| `fullTemplate(techStack, projectName)` | Complete CLAUDE.md template |
| `minimalTemplate(techStack)` | Minimal configuration |
| `deploymentSection(techStack)` | Deployment instructions |
| `testingSection(techStack)` | Testing instructions |
| `githubSection(techStack)` | GitHub integration |

**Example:**
```javascript
const content = ENHANCEMENT_TEMPLATES.fullTemplate(techStack, 'My Project');
await fs.writeFile('CLAUDE.md', content);
```

---

## Template Processing

### `replacePlaceholders(content, values, options)`

Processes Handlebars-style templates with values.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `content` | `string` | Template content |
| `values` | `object` | Values to substitute |
| `options.preserveUnknown` | `boolean` | Keep unresolved placeholders (default: `false`) |
| `options.warnOnMissing` | `boolean` | Log warnings (default: `true`) |
| `options.processConditionals` | `boolean` | Enable `{{#if}}` (default: `true`) |

**Returns:** `{ content: string, warnings: string[] }`

**Example:**
```javascript
const template = `
Project: {{project.name}}
Framework: {{frontend.framework}}

{{#if deployment.backend}}
## Backend Deployment
Platform: {{deployment.backend.platform}}
{{/if}}
`;

const { content, warnings } = replacePlaceholders(template, techStack);
console.log(content);
// Project: my-app
// Framework: react
//
// ## Backend Deployment
// Platform: railway

console.log(warnings);  // ['Unresolved: {{missing.value}}', ...]
```

---

### `processFile(filePath, values, options)`

Processes a template file and returns the result.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `filePath` | `string` | Path to template file |
| `values` | `object` | Values to substitute |
| `options` | `object` | Same as `replacePlaceholders` |

**Returns:** `Promise<{ content: string, warnings: string[] }>`

**Example:**
```javascript
const result = await processFile('./templates/deploy.template.md', techStack);
console.log(result.content);
```

---

### `processDirectory(dirPath, values, options)`

Processes all template files in a directory recursively.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `dirPath` | `string` | Directory path |
| `values` | `object` | Values to substitute |
| `options.extensions` | `string[]` | File extensions to process (default: `['.md', '.json', '.js', '.ts', '.yml', '.yaml']`) |
| `options.recursive` | `boolean` | Process subdirectories (default: `true`) |
| `options.exclude` | `string[]` | Directories to skip (default: `['node_modules', '.git', 'dist', 'build']`) |
| `options.dryRun` | `boolean` | Preview only (default: `false`) |

**Returns:** `Promise<void>`

**Example:**
```javascript
await processDirectory('./templates', techStack, {
  extensions: ['.md', '.json'],
  exclude: ['node_modules'],
  recursive: true,
  dryRun: false
});
```

---

### `generateTechStack(detected, userOverrides)`

Deep merges detected tech stack with user overrides.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `detected` | `object` | Auto-detected values |
| `userOverrides` | `object` | User-specified overrides |

**Returns:** `TechStack`

**Example:**
```javascript
const detected = await detectTechStack(cwd);
const final = generateTechStack(detected, {
  deployment: {
    backend: {
      projectId: 'my-railway-project'
    }
  }
});
```

---

### `flattenObject(obj, prefix)`

Converts nested object to dot-notation keys.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `obj` | `object` | Object to flatten |
| `prefix` | `string` | Key prefix (default: `''`) |

**Returns:** `Record<string, any>`

**Example:**
```javascript
const flat = flattenObject({
  frontend: { framework: 'react', port: 5173 },
  backend: { framework: 'fastapi' }
});

// Result:
// {
//   'frontend.framework': 'react',
//   'frontend.port': 5173,
//   'backend.framework': 'fastapi'
// }
```

---

### `extractPlaceholders(content)`

Extracts all placeholders from template content.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `content` | `string` | Template content |

**Returns:** `string[]`

**Example:**
```javascript
const placeholders = extractPlaceholders('{{project.name}} on {{deployment.platform}}');
// ['project.name', 'deployment.platform']
```

---

### `validateTechStack(techStack, requiredPlaceholders)`

Validates that tech stack has all required values.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `techStack` | `object` | Tech stack to validate |
| `requiredPlaceholders` | `string[]` | Required dot-notation keys |

**Returns:** `{ valid: boolean, missing: string[] }`

**Example:**
```javascript
const { valid, missing } = validateTechStack(techStack, [
  'deployment.backend.projectId',
  'deployment.backend.serviceId'
]);

if (!valid) {
  console.log('Missing:', missing);
}
```

---

## GitHub Integration

### `isAuthenticated()`

Checks if GitHub CLI is authenticated.

**Returns:** `Promise<boolean>`

**Example:**
```javascript
if (await isAuthenticated()) {
  console.log('GitHub CLI ready');
} else {
  console.log('Run: gh auth login');
}
```

---

### `getCurrentUser()`

Gets the authenticated GitHub user.

**Returns:** `Promise<string | null>`

**Example:**
```javascript
const user = await getCurrentUser();
console.log(`Logged in as: ${user}`);
```

---

### `listRepos(owner, options)`

Lists repositories for a user or organization.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `owner` | `string` | Username or org name |
| `options.limit` | `number` | Max results (default: `30`) |
| `options.type` | `string` | `'all'`, `'public'`, or `'private'` |

**Returns:** `Promise<Repo[]>`

**Example:**
```javascript
const repos = await listRepos('evan043', { limit: 10 });
repos.forEach(repo => {
  console.log(`${repo.name} - ${repo.description}`);
});
```

---

### `createIssue(owner, repo, options)`

Creates a GitHub issue.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `owner` | `string` | Repository owner |
| `repo` | `string` | Repository name |
| `options.title` | `string` | Issue title |
| `options.body` | `string` | Issue body (markdown) |
| `options.labels` | `string[]` | Labels to apply |
| `options.assignees` | `string[]` | Users to assign |

**Returns:** `Promise<{ success: boolean, url?: string, number?: number, error?: string }>`

**Example:**
```javascript
const result = await createIssue('evan043', 'my-repo', {
  title: 'Implement user authentication',
  body: '## Requirements\n- JWT tokens\n- OAuth support',
  labels: ['enhancement', 'priority-high'],
  assignees: ['evan043']
});

if (result.success) {
  console.log(`Created: ${result.url}`);
  console.log(`Issue #${result.number}`);
}
```

---

### `listProjects(owner)`

Lists GitHub Projects (v2) for a user or org.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `owner` | `string` | Username or org name |

**Returns:** `Promise<Project[]>`

**Example:**
```javascript
const projects = await listProjects('evan043');
projects.forEach(p => {
  console.log(`#${p.number}: ${p.title}`);
});
```

---

### `addIssueToProject(owner, projectNumber, issueUrl)`

Adds an issue to a GitHub Project board.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `owner` | `string` | Project owner |
| `projectNumber` | `number` | Project number |
| `issueUrl` | `string` | Full issue URL |

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const success = await addIssueToProject(
  'evan043',
  3,
  'https://github.com/evan043/repo/issues/123'
);
```

---

### `listProjectFields(owner, projectNumber)`

Gets all fields in a project board.

**Returns:** `Promise<Field[]>`

**Example:**
```javascript
const fields = await listProjectFields('evan043', 3);
fields.forEach(f => {
  console.log(`${f.name} (${f.id})`);
});
```

---

### `updateProjectItemField(projectId, itemId, fieldId, value, fieldType)`

Updates a field value on a project item.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `projectId` | `string` | Project GraphQL ID |
| `itemId` | `string` | Item GraphQL ID |
| `fieldId` | `string` | Field GraphQL ID |
| `value` | `string` | New value |
| `fieldType` | `string` | `'text'`, `'single_select'`, or `'number'` |

**Returns:** `Promise<boolean>`

---

## Codebase Analysis

### `searchFiles(pattern, options)`

Searches for files matching a glob pattern.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pattern` | `string` | Glob pattern |
| `options.cwd` | `string` | Search root |
| `options.ignore` | `string[]` | Patterns to ignore |

**Returns:** `Promise<string[]>`

**Example:**
```javascript
const files = await searchFiles('**/*.tsx', {
  cwd: '/project/src',
  ignore: ['node_modules/**']
});
```

---

### `searchContent(pattern, files)`

Searches for content matching a regex pattern.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pattern` | `string | RegExp` | Search pattern |
| `files` | `string[]` | Files to search |

**Returns:** `Promise<SearchResult[]>`

**Example:**
```javascript
const results = await searchContent(/function\s+\w+Auth/, files);
results.forEach(r => {
  console.log(`${r.file}:${r.line} - ${r.match}`);
});
```

---

### `analyzeForIssue(projectPath, taskDescription)`

Analyzes codebase for relevant context when creating an issue.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `projectPath` | `string` | Project root |
| `taskDescription` | `string` | Task description |

**Returns:** `Promise<AnalysisResult>`

**Example:**
```javascript
const analysis = await analyzeForIssue(cwd, 'Add user authentication');
console.log(analysis.relevantFiles);
console.log(analysis.suggestedApproach);
console.log(analysis.relatedCode);
```

---

## Templates

### `generateClaudeCommand(config)`

Generates a complete slash command with YAML frontmatter.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `config.name` | `string` | Command name (kebab-case) |
| `config.description` | `string` | Short description |
| `config.complexity` | `string` | `'simple'`, `'standard'`, `'complex'`, `'expert'` |
| `config.model` | `string` | Preferred model |
| `config.steps` | `string[]` | Implementation steps |
| `config.examples` | `string[]` | Usage examples |

**Returns:** `string`

**Example:**
```javascript
const command = generateClaudeCommand({
  name: 'deploy-staging',
  description: 'Deploy to staging environment',
  complexity: 'standard',
  steps: [
    'Build frontend',
    'Run tests',
    'Deploy to staging'
  ],
  examples: [
    '/deploy-staging',
    '/deploy-staging --skip-tests'
  ]
});
```

---

### `generateIssueBody(taskInfo, analysis)`

Generates a detailed GitHub issue body with analysis.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `taskInfo.title` | `string` | Task title |
| `taskInfo.description` | `string` | Task description |
| `analysis` | `object` | From `analyzeForIssue()` |

**Returns:** `string`

---

## Utilities

### `getVersion()`

Gets the current CCASP version.

**Returns:** `string`

**Example:**
```javascript
console.log(`CCASP v${getVersion()}`);  // "CCASP v1.0.12"
```

---

### `checkPrerequisites()`

Verifies required tools are installed.

**Returns:** `Promise<{ node: boolean, npm: boolean, gh: boolean, ghVersion: string }>`

**Example:**
```javascript
const prereqs = await checkPrerequisites();
if (!prereqs.gh) {
  console.log('GitHub CLI not installed');
}
```

---

### `loadConfigSync(projectPath)`

Loads configuration files synchronously.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `projectPath` | `string` | Project root |

**Returns:** `{ techStack: object, settings: object }`

**Example:**
```javascript
const { techStack, settings } = loadConfigSync(cwd);
```

---

### `execCommand(command, args)`

Executes a shell command.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `command` | `string` | Command to run |
| `args` | `string[]` | Command arguments |

**Returns:** `Promise<{ stdout: string, stderr: string, exitCode: number }>`

**Example:**
```javascript
const result = await execCommand('npm', ['test']);
if (result.exitCode === 0) {
  console.log('Tests passed!');
}
```

---

## Type Definitions

### TechStack

```typescript
interface TechStack {
  version: string;
  project: {
    name: string;
    type: string;
    description?: string;
  };
  frontend?: {
    framework: string;
    port: number;
    buildCommand: string;
    devCommand: string;
    distDir: string;
  };
  backend?: {
    framework: string;
    language: string;
    port: number;
    healthEndpoint: string;
  };
  database?: {
    type: string;
    orm?: string;
  };
  testing?: {
    unit?: string;
    e2e?: string;
    unitCommand?: string;
    e2eCommand?: string;
  };
  deployment?: {
    frontend?: DeploymentConfig;
    backend?: DeploymentConfig;
  };
  versionControl?: {
    provider: string;
    owner: string;
    repo: string;
    defaultBranch: string;
    projectBoard?: { number: number };
  };
  features: Record<string, boolean>;
}
```

---

## See Also

- [Architecture](Architecture) - Internal design
- [Templates](Templates) - Template syntax reference
- [Configuration Schema](Configuration-Schema) - Complete schemas
