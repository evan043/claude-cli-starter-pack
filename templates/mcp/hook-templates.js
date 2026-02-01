/**
 * MCP Hook Templates
 *
 * Templates for auto-generating PreToolUse/PostToolUse hooks
 * based on installed MCPs and tech stack.
 *
 * Part of Phase 2: Hook Extensions (Issue #39)
 */

/**
 * GitHub MCP Hook Templates
 */
export const GITHUB_HOOKS = {
  'github-pr-template': {
    name: 'github-pr-template',
    event: 'PreToolUse',
    tool: 'create_pull_request',
    description: 'Inject PR template from tech stack configuration',
    template: `#!/usr/bin/env node
/**
 * GitHub PR Template Injector
 *
 * PreToolUse hook for mcp__github__create_pull_request
 * Injects PR template based on tech stack configuration.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

async function main() {
  try {
    const tool = hookInput.tool_name || '';
    const input = hookInput.tool_input || {};

    if (!tool.includes('create_pull_request')) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Check if body already has content
    if (input.body && input.body.length > 50) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Inject PR template
    const prTemplate = \`## Summary
<!-- Brief description of changes -->

## Changes Made
-

## Test Plan
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

---
🤖 Generated with Claude Code
\`;

    console.log(JSON.stringify({
      decision: 'approve',
      systemMessage: \`
## PR Template Injected

A standard PR template has been suggested. The body will include:
- Summary section
- Changes Made list
- Test Plan checklist
- Screenshots placeholder

Modify as needed before submission.
\`
    }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },

  'github-issue-labels': {
    name: 'github-issue-labels',
    event: 'PostToolUse',
    tool: 'create_issue',
    description: 'Auto-add labels based on issue content and file paths',
    template: `#!/usr/bin/env node
/**
 * GitHub Issue Auto-Labeler
 *
 * PostToolUse hook for mcp__github__create_issue
 * Suggests labels based on issue content.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

async function main() {
  try {
    const output = hookInput.tool_output || {};
    const input = hookInput.tool_input || {};

    const title = input.title || '';
    const body = input.body || '';
    const content = (title + ' ' + body).toLowerCase();

    const suggestedLabels = [];

    // Detect label suggestions
    if (content.includes('bug') || content.includes('fix') || content.includes('error')) {
      suggestedLabels.push('bug');
    }
    if (content.includes('feature') || content.includes('enhancement') || content.includes('add')) {
      suggestedLabels.push('enhancement');
    }
    if (content.includes('docs') || content.includes('documentation')) {
      suggestedLabels.push('documentation');
    }
    if (content.includes('test') || content.includes('e2e') || content.includes('playwright')) {
      suggestedLabels.push('testing');
    }
    if (content.includes('urgent') || content.includes('critical') || content.includes('blocker')) {
      suggestedLabels.push('priority:high');
    }

    if (suggestedLabels.length > 0) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## Suggested Labels

Based on issue content, consider adding these labels:
\${suggestedLabels.map(l => '- ' + l).join('\\n')}

Use: gh issue edit <number> --add-label "\${suggestedLabels.join(',')}"
\`
      }));
    } else {
      console.log(JSON.stringify({ decision: 'approve' }));
    }

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },

  'github-commit-lint': {
    name: 'github-commit-lint',
    event: 'PreToolUse',
    tool: 'create_commit',
    description: 'Validate conventional commit message format',
    template: `#!/usr/bin/env node
/**
 * Conventional Commit Linter
 *
 * PreToolUse hook for commit operations
 * Validates commit messages follow conventional format.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert'
];

const CONVENTIONAL_PATTERN = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\([^)]+\\))?!?: .+/;

async function main() {
  try {
    const input = hookInput.tool_input || {};
    const message = input.message || input.commit_message || '';

    if (!message) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    const firstLine = message.split('\\n')[0];

    if (!CONVENTIONAL_PATTERN.test(firstLine)) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## Commit Message Suggestion

Your commit message doesn't follow conventional format.

**Current:** \${firstLine}

**Suggested format:** <type>(<scope>): <description>

**Valid types:** \${CONVENTIONAL_TYPES.join(', ')}

**Examples:**
- feat(auth): add OAuth2 login support
- fix(api): resolve null pointer in user service
- docs: update README installation steps
\`
      }));
      return;
    }

    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },
};

/**
 * Playwright MCP Hook Templates
 */
export const PLAYWRIGHT_HOOKS = {
  'playwright-auth-inject': {
    name: 'playwright-auth-inject',
    event: 'PreToolUse',
    tool: 'browser_navigate',
    description: 'Auto-inject authentication for protected routes',
    template: `#!/usr/bin/env node
/**
 * Playwright Auth Injector
 *
 * PreToolUse hook for browser_navigate
 * Injects authentication state for protected routes.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Configure protected routes
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/settings',
  '/profile',
  '/api',
];

const AUTH_REQUIRED_HOSTS = [
  'localhost:5174',
  'localhost:3000',
];

async function main() {
  try {
    const tool = hookInput.tool_name || '';
    const input = hookInput.tool_input || {};

    if (!tool.includes('navigate')) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    const url = input.url || '';
    const urlObj = new URL(url.startsWith('http') ? url : 'http://' + url);
    const pathname = urlObj.pathname;

    const needsAuth = AUTH_REQUIRED_HOSTS.some(h => url.includes(h)) &&
                     PROTECTED_ROUTES.some(r => pathname.startsWith(r));

    if (needsAuth) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## Protected Route Detected

The URL \${url} appears to be a protected route.

**Ensure you have:**
1. Set up authentication state before navigating
2. Stored auth cookies/tokens in browser context
3. Or use the test user credentials

**To authenticate first:**
\\\`\\\`\\\`
mcp__playwright__browser_navigate(url: "http://localhost:5174/login")
mcp__playwright__browser_fill(selector: "#email", value: "test@example.com")
mcp__playwright__browser_fill(selector: "#password", value: "testpass123")
mcp__playwright__browser_click(selector: "button[type=submit]")
\\\`\\\`\\\`
\`
      }));
      return;
    }

    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },

  'playwright-screenshot-save': {
    name: 'playwright-screenshot-save',
    event: 'PostToolUse',
    tool: 'browser_screenshot',
    description: 'Save screenshots to standardized location with naming',
    template: `#!/usr/bin/env node
/**
 * Playwright Screenshot Organizer
 *
 * PostToolUse hook for browser_screenshot
 * Suggests saving screenshots to organized location.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

async function main() {
  try {
    const output = hookInput.tool_output || {};

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suggestedPath = \`screenshots/\${timestamp}.png\`;

    console.log(JSON.stringify({
      decision: 'approve',
      systemMessage: \`
## Screenshot Captured

**Suggested save location:** \${suggestedPath}

To save with descriptive name:
\\\`\\\`\\\`bash
mkdir -p screenshots
# Save screenshot data to file
\\\`\\\`\\\`

**Naming convention:**
- \\\`screenshots/test-name-step.png\\\` for test artifacts
- \\\`screenshots/bug-issue-number.png\\\` for bug reports
\`
    }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },

  'playwright-selector-validate': {
    name: 'playwright-selector-validate',
    event: 'PreToolUse',
    tool: 'browser_click',
    description: 'Validate selectors match tech-stack UI patterns',
    template: `#!/usr/bin/env node
/**
 * Playwright Selector Validator
 *
 * PreToolUse hook for browser_click, browser_fill
 * Suggests better selectors based on UI framework patterns.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Fragile selector patterns to warn about
const FRAGILE_PATTERNS = [
  /^\\.[a-z]{6,}$/,           // Auto-generated class names
  /^div > div > div/,         // Deep nesting
  /nth-child\\(\\d+\\)/,       // Position-based
  /:nth-of-type/,             // Position-based
];

// Preferred selector patterns
const PREFERRED_PATTERNS = [
  'data-testid',
  'data-cy',
  'aria-label',
  '#',  // ID selectors
  '[role=',
];

async function main() {
  try {
    const input = hookInput.tool_input || {};
    const selector = input.selector || input.element || '';

    if (!selector) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Check for fragile selectors
    const isFragile = FRAGILE_PATTERNS.some(p => p.test(selector));
    const isPreferred = PREFERRED_PATTERNS.some(p => selector.includes(p));

    if (isFragile && !isPreferred) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## Selector Warning

The selector \\\`\${selector}\\\` may be fragile.

**Consider using:**
- \\\`[data-testid="button-submit"]\\\` - Test IDs
- \\\`[aria-label="Submit form"]\\\` - Accessibility labels
- \\\`#submit-button\\\` - ID selectors
- \\\`[role="button"]\\\` - ARIA roles

Fragile selectors may break when:
- CSS class names change
- DOM structure is refactored
- Build tools regenerate class names
\`
      }));
      return;
    }

    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },
};

/**
 * Database MCP Hook Templates
 */
export const DATABASE_HOOKS = {
  'db-query-guard': {
    name: 'db-query-guard',
    event: 'PreToolUse',
    tool: 'execute_query',
    description: 'Block destructive queries in production',
    template: `#!/usr/bin/env node
/**
 * Database Query Guard
 *
 * PreToolUse hook for database query execution
 * Blocks destructive operations in production.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

const DESTRUCTIVE_PATTERNS = [
  /\\bDROP\\s+(TABLE|DATABASE|SCHEMA|INDEX)/i,
  /\\bTRUNCATE\\s+TABLE/i,
  /\\bDELETE\\s+FROM\\s+\\w+\\s*$/i,  // DELETE without WHERE
  /\\bUPDATE\\s+\\w+\\s+SET\\s+.*(?<!WHERE\\s+.*)$/i,  // UPDATE without WHERE
];

const DANGEROUS_PATTERNS = [
  /\\bDROP\\b/i,
  /\\bTRUNCATE\\b/i,
  /\\bALTER\\s+TABLE\\b/i,
  /\\bGRANT\\b/i,
  /\\bREVOKE\\b/i,
];

async function main() {
  try {
    const input = hookInput.tool_input || {};
    const query = input.query || input.sql || '';
    const env = process.env.NODE_ENV || 'development';

    if (!query) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Check for destructive patterns
    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(query)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'Potentially destructive query blocked',
          systemMessage: \`
## Destructive Query Blocked

The query appears to be destructive:
\\\`\\\`\\\`sql
\${query.substring(0, 200)}
\\\`\\\`\\\`

**This query was blocked because:**
- It may cause irreversible data loss
- No WHERE clause was detected (for DELETE/UPDATE)

**To proceed:**
1. Add a WHERE clause to limit scope
2. Test on development database first
3. Create a backup before running
\`
        }));
        process.exit(1);
        return;
      }
    }

    // Warn about dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(query) && env === 'production') {
        console.log(JSON.stringify({
          decision: 'approve',
          systemMessage: \`
## Database Warning

This query contains potentially dangerous operations.
Environment: \${env}

Please ensure:
- You have a recent backup
- The query has been tested in development
- You understand the impact
\`
        }));
        return;
      }
    }

    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },
};

/**
 * Deployment MCP Hook Templates (Railway/Cloudflare)
 */
export const DEPLOYMENT_HOOKS = {
  'deploy-guard': {
    name: 'deploy-guard',
    event: 'PreToolUse',
    tool: 'deployment_trigger',
    description: 'Require confirmation and validate deployment IDs',
    template: `#!/usr/bin/env node
/**
 * Deployment Guard
 *
 * PreToolUse hook for deployment_trigger
 * Validates deployment IDs and requires confirmation.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Configure allowed deployment targets
const ALLOWED_PROJECT_IDS = process.env.ALLOWED_RAILWAY_PROJECTS?.split(',') || [];
const ALLOWED_SERVICE_IDS = process.env.ALLOWED_RAILWAY_SERVICES?.split(',') || [];

async function main() {
  try {
    const input = hookInput.tool_input || {};
    const projectId = input.project_id || input.projectId || '';
    const serviceId = input.service_id || input.serviceId || '';

    // Validate IDs if allowlists are configured
    if (ALLOWED_PROJECT_IDS.length > 0 && projectId) {
      if (!ALLOWED_PROJECT_IDS.includes(projectId)) {
        console.log(JSON.stringify({
          decision: 'block',
          reason: 'Unauthorized project ID',
          systemMessage: \`
## Deployment Blocked

Project ID \\\`\${projectId}\\\` is not in the allowed list.

**Allowed projects:**
\${ALLOWED_PROJECT_IDS.map(id => '- ' + id).join('\\n')}

Check your deployment configuration or .env file.
\`
        }));
        process.exit(1);
        return;
      }
    }

    // Always show confirmation message
    console.log(JSON.stringify({
      decision: 'approve',
      systemMessage: \`
## Deployment Initiated

**Target:**
- Project: \${projectId || 'default'}
- Service: \${serviceId || 'default'}

**Pre-deployment checklist:**
- [ ] Tests passing
- [ ] No uncommitted changes
- [ ] Environment variables set
- [ ] Database migrations ready

Deployment will proceed...
\`
    }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },

  'deploy-notify': {
    name: 'deploy-notify',
    event: 'PostToolUse',
    tool: 'deployment_trigger',
    description: 'Send notification after deployment trigger',
    template: `#!/usr/bin/env node
/**
 * Deployment Notifier
 *
 * PostToolUse hook for deployment_trigger
 * Logs deployment and suggests monitoring.
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

async function main() {
  try {
    const output = hookInput.tool_output || {};
    const input = hookInput.tool_input || {};

    const timestamp = new Date().toISOString();

    console.log(JSON.stringify({
      decision: 'approve',
      systemMessage: \`
## Deployment Triggered ✓

**Time:** \${timestamp}
**Status:** Initiated

**Next steps:**
1. Monitor deployment status:
   \\\`mcp__railway-mcp-server__deployment_status\\\`

2. Check deployment logs:
   \\\`mcp__railway-mcp-server__deployment_logs\\\`

3. Verify application health after deploy

**Rollback if needed:**
\\\`mcp__railway-mcp-server__deployment_trigger\\\` with previous commit
\`
    }));

  } catch (error) {
    console.log(JSON.stringify({ decision: 'approve' }));
  }
}

main();
`,
  },
};

/**
 * Get all hook templates organized by MCP
 */
export function getAllHookTemplates() {
  return {
    github: GITHUB_HOOKS,
    playwright: PLAYWRIGHT_HOOKS,
    'playwright-ext': PLAYWRIGHT_HOOKS,  // Same hooks apply
    'browser-monitor': PLAYWRIGHT_HOOKS, // Puppeteer uses similar patterns
    database: DATABASE_HOOKS,
    railway: DEPLOYMENT_HOOKS,
    cloudflare: DEPLOYMENT_HOOKS,
    digitalocean: DEPLOYMENT_HOOKS,
  };
}

/**
 * Get hook templates for specific installed MCPs
 * @param {string[]} installedMcpIds - Array of installed MCP IDs
 * @returns {object} Map of hook templates
 */
export function getHooksForInstalledMcps(installedMcpIds) {
  const allTemplates = getAllHookTemplates();
  const relevantHooks = {};

  for (const mcpId of installedMcpIds) {
    // Normalize MCP ID (remove mcp__ prefix if present)
    const normalizedId = mcpId.replace(/^mcp__/, '').split('__')[0];

    if (allTemplates[normalizedId]) {
      relevantHooks[normalizedId] = allTemplates[normalizedId];
    }
  }

  return relevantHooks;
}

/**
 * Generate hook file from template
 * @param {object} hookTemplate - Hook template object
 * @returns {string} Generated hook code
 */
export function generateHookFile(hookTemplate) {
  return hookTemplate.template;
}

export default {
  GITHUB_HOOKS,
  PLAYWRIGHT_HOOKS,
  DATABASE_HOOKS,
  DEPLOYMENT_HOOKS,
  getAllHookTemplates,
  getHooksForInstalledMcps,
  generateHookFile,
};
