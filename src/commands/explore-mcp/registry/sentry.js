/**
 * Sentry MCP Registry Entry
 *
 * Sentry error monitoring MCP - surfaces production errors, issues,
 * and performance data directly in Claude Code sessions.
 * Auto-recommended when @sentry/* packages detected in dependencies.
 */

/**
 * Sentry MCP server definition
 * Uses npx to run the Sentry MCP stdio server
 */
export const SENTRY_MCP = {
  id: 'sentry',
  name: 'Sentry MCP',
  description: 'Surface production errors, issues, and performance data from Sentry',
  npmPackage: '@sentry/mcp-server-stdio',
  category: 'debugging',
  requiredEnv: {
    SENTRY_AUTH_TOKEN: { description: 'Sentry auth token from sentry.io/settings/auth-tokens' },
  },
  optionalEnv: {
    SENTRY_ORG: { description: 'Sentry organization slug', default: '' },
    SENTRY_PROJECT: { description: 'Default Sentry project slug', default: '' },
  },
  relevantFor: ['sentry', 'backend', 'frontend', 'api', 'react', 'fastapi', 'express', 'nodejs', 'python'],
  recommended: false,
  tools: [
    'list_issues', 'get_issue', 'list_events', 'get_event',
    'list_projects', 'search_issues',
  ],
  note: 'Auto-recommended when @sentry/* packages detected in project dependencies.',
  // API Key metadata
  apiKeyRequired: true,
  apiKeyName: 'SENTRY_AUTH_TOKEN',
  apiKeyUrl: 'https://sentry.io/settings/auth-tokens/',
  apiKeyFree: true,
  apiKeyNote: 'Sentry has a free Developer plan. Create an auth token at sentry.io/settings/auth-tokens.',
};

/**
 * Dependency patterns that indicate Sentry usage
 * Used by tech-stack detection to auto-recommend this MCP
 */
export const SENTRY_DETECTION_PATTERNS = {
  npm: ['@sentry/browser', '@sentry/node', '@sentry/react', '@sentry/nextjs', '@sentry/vue'],
  pip: ['sentry-sdk'],
  cargo: ['sentry'],
};
