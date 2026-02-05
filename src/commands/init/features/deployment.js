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
];
