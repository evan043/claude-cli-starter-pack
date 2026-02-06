/**
 * Deployment Features
 *
 * Defines deployment automation feature.
 */

export const DEPLOYMENT_FEATURES = [
  {
    name: 'deploymentAutomation',
    label: 'Deployment Automation',
    description: 'Automated full-stack deployment workflows. Supports Railway, Heroku, Vercel, Cloudflare Pages, and self-hosted targets. Platform configured after installation via /menu.',
    commands: ['deploy-full'],
    hooks: ['deployment-orchestrator'],
    default: false,
    requiresPostConfig: true,
  },
  {
    name: 'mcpServers',
    label: 'MCP Server Discovery',
    description: 'Discover and auto-install MCP servers based on your tech stack. Recommends Serena (code navigation), Sentry (error monitoring), PostgreSQL (database), and more. Batch install with API key prompts.',
    commands: ['explore-mcp'],
    hooks: [],
    default: true,
    requiresPostConfig: false,
  },
];
