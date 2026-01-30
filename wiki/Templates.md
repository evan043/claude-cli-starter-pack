# Templates

CCASP uses a powerful template engine to generate platform-agnostic configurations and code. No hardcoded values - everything uses placeholders.

## Template Syntax

### Basic Placeholders

```handlebars
{{variableName}}
```

Example:
```markdown
Project: {{project.name}}
Framework: {{frontend.framework}}
Port: {{frontend.port}}
```

### Nested Properties

```handlebars
{{deployment.backend.platform}}
{{testing.framework}}
```

### Conditionals

```handlebars
{{#if condition}}
  Content shown if condition is truthy
{{/if}}

{{#if (eq variable "value")}}
  Content shown if variable equals "value"
{{/if}}

{{#unless condition}}
  Content shown if condition is falsy
{{/unless}}
```

### Equality Checks

```handlebars
{{#if (eq deployment.platform "railway")}}
  Using Railway deployment
{{/if}}

{{#if (eq frontend.framework "react")}}
  React-specific instructions
{{/if}}
```

### Loops

```handlebars
{{#each array}}
  Item: {{this}}
{{/each}}

{{#each users}}
  Name: {{this.name}}
  Email: {{this.email}}
{{/each}}
```

### Path Variables

```handlebars
${CWD}   - Current working directory
${HOME}  - User home directory
```

## Tech Stack JSON

Templates are populated from `tech-stack.json`:

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-app",
    "type": "fullstack"
  },
  "frontend": {
    "framework": "react",
    "port": 5173,
    "buildCommand": "npm run build",
    "devCommand": "npm run dev"
  },
  "backend": {
    "framework": "fastapi",
    "port": 8001,
    "language": "python"
  },
  "database": {
    "type": "postgresql",
    "provider": "railway"
  },
  "testing": {
    "unit": "vitest",
    "e2e": "playwright"
  },
  "deployment": {
    "frontend": {
      "platform": "cloudflare",
      "projectName": "my-app"
    },
    "backend": {
      "platform": "railway",
      "projectId": "abc123",
      "serviceId": "def456"
    }
  },
  "features": {
    "githubIntegration": true,
    "phasedDevelopment": true,
    "tokenManagement": false
  }
}
```

## Template Examples

### Deployment Command Template

```markdown
## Deploy Backend

{{#if deployment.backend.platform}}
{{#if (eq deployment.backend.platform "railway")}}
Using Railway MCP:
```
mcp__railway-mcp-server__deployment_trigger({
  projectId: "{{deployment.backend.projectId}}",
  serviceId: "{{deployment.backend.serviceId}}",
  environmentId: "{{deployment.backend.environmentId}}"
})
```
{{/if}}

{{#if (eq deployment.backend.platform "vercel")}}
Using Vercel:
```bash
vercel --prod
```
{{/if}}

{{#if (eq deployment.backend.platform "heroku")}}
Using Heroku:
```bash
git push heroku main
```
{{/if}}
{{else}}
No backend deployment configured.
{{/if}}
```

### Testing Command Template

```markdown
## Run Tests

{{#if testing.unit}}
### Unit Tests
```bash
{{#if (eq testing.unit "vitest")}}
npm run test
{{/if}}
{{#if (eq testing.unit "jest")}}
npm test
{{/if}}
{{#if (eq testing.unit "pytest")}}
pytest
{{/if}}
```
{{/if}}

{{#if testing.e2e}}
### E2E Tests
```bash
{{#if (eq testing.e2e "playwright")}}
npm run test:e2e
{{/if}}
{{#if (eq testing.e2e "cypress")}}
npx cypress run
{{/if}}
```
{{/if}}
```

### Project README Template

```markdown
# {{project.name}}

{{#if project.description}}
{{project.description}}
{{/if}}

## Tech Stack

{{#if frontend.framework}}
- **Frontend**: {{frontend.framework}}
{{/if}}
{{#if backend.framework}}
- **Backend**: {{backend.framework}}
{{/if}}
{{#if database.type}}
- **Database**: {{database.type}}
{{/if}}

## Development

### Start Frontend
```bash
cd {{frontend.path}}
{{frontend.devCommand}}
```
Server runs at: http://localhost:{{frontend.port}}

{{#if backend.framework}}
### Start Backend
```bash
cd {{backend.path}}
{{backend.devCommand}}
```
API runs at: http://localhost:{{backend.port}}
{{/if}}

## Testing

{{#if testing.unit}}
```bash
{{testing.unitCommand}}
```
{{/if}}

{{#if testing.e2e}}
```bash
{{testing.e2eCommand}}
```
{{/if}}
```

## Auto-Detection

CCASP auto-detects your tech stack by reading:

| File | Detects |
|------|---------|
| `package.json` | Frontend/backend frameworks, test tools |
| `requirements.txt` | Python dependencies |
| `pyproject.toml` | Python project config |
| `vite.config.js` | Vite bundler |
| `next.config.js` | Next.js |
| `tsconfig.json` | TypeScript |
| `.git/config` | Repository URL |
| `Dockerfile` | Container setup |
| `railway.json` | Railway config |
| `wrangler.toml` | Cloudflare config |

### Detection Logic

```javascript
// Framework detection from package.json
if (dependencies.react) frontend.framework = 'react';
if (dependencies.vue) frontend.framework = 'vue';
if (dependencies.next) frontend.framework = 'next';
if (dependencies.express) backend.framework = 'express';
if (dependencies.fastify) backend.framework = 'fastify';

// Test framework detection
if (devDependencies.vitest) testing.unit = 'vitest';
if (devDependencies.jest) testing.unit = 'jest';
if (devDependencies.playwright) testing.e2e = 'playwright';
```

## Processing Templates

### In Terminal

```bash
ccasp process-template path/to/template.md
```

### Programmatically

```javascript
import { replacePlaceholders, processFile } from 'claude-cli-advanced-starter-pack';

// Process string content
const { content, warnings } = replacePlaceholders(templateContent, techStack);

// Process file
const result = await processFile('template.md', techStack);
```

## Template Locations

```
templates/
├── commands/           # Slash command templates
│   ├── menu.template.md
│   ├── deploy-full.template.md
│   └── ...
├── agents/             # Agent definition templates
├── hooks/              # Hook templates
├── skills/             # Skill templates
└── docs/               # Documentation templates
```

## Custom Placeholders

Add custom values to `tech-stack.json`:

```json
{
  "custom": {
    "teamName": "Awesome Team",
    "slackChannel": "#dev-alerts",
    "docsUrl": "https://docs.myapp.com"
  }
}
```

Use in templates:
```markdown
Contact {{custom.teamName}} in {{custom.slackChannel}}
See docs: {{custom.docsUrl}}
```

## Placeholder Warnings

When a placeholder can't be resolved:

```
Warning: Unresolved placeholder: {{deployment.backend.projectId}}
```

### Handling Missing Values

```handlebars
{{#if deployment.backend.projectId}}
Project ID: {{deployment.backend.projectId}}
{{else}}
⚠️ Backend project ID not configured
{{/if}}
```

## Best Practices

### 1. Always Use Conditionals for Optional Values

```handlebars
{{#if database.connectionString}}
DATABASE_URL={{database.connectionString}}
{{/if}}
```

### 2. Provide Defaults in Comments

```handlebars
# Port: {{frontend.port}} (default: 3000)
```

### 3. Group Related Placeholders

```handlebars
{{#if deployment.backend}}
## Backend Deployment
Platform: {{deployment.backend.platform}}
Project: {{deployment.backend.projectId}}
{{/if}}
```

### 4. Document Required Values

```markdown
## Required Configuration

Before using this template, ensure these are set in tech-stack.json:
- `deployment.backend.projectId`
- `deployment.backend.serviceId`
- `deployment.backend.environmentId`
```

## Debugging Templates

### View Resolved Output

```bash
ccasp process-template --debug template.md
```

Shows:
- Input template
- Tech stack values used
- Resolved output
- Any warnings

### Validate Tech Stack

```bash
ccasp detect-stack --verbose
```

Shows all detected values.

## See Also

- [Getting Started](Getting-Started) - Initial setup
- [Features](Features) - Feature configuration
- [Skills](Skills) - Using templates in skills
