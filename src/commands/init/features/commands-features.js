/**
 * Feature-Specific Commands
 *
 * Defines commands tied to optional features (deployed only when feature is enabled).
 */

export const FEATURE_COMMANDS = [
  {
    name: 'context-audit',
    description: 'Audit context usage and token budget (requires tokenManagement feature)',
    category: 'Token Management',
    selected: false,
    feature: 'tokenManagement',
  },
  {
    name: 'happy-start',
    description: 'Start Happy Mode for mobile app integration (requires happyMode feature)',
    category: 'Happy Mode',
    selected: false,
    feature: 'happyMode',
  },
  {
    name: 'github-project-menu',
    description: 'View and sync GitHub Project Board status',
    category: 'GitHub',
    selected: false,
    feature: 'githubIntegration',
  },
  {
    name: 'github-task-start',
    description: 'Start or complete a GitHub Project Board task',
    category: 'GitHub',
    selected: false,
    feature: 'githubIntegration',
  },
  {
    name: 'tunnel-start',
    description: 'Start tunnel service for mobile testing (requires tunnelServices feature)',
    category: 'Development',
    selected: false,
    feature: 'tunnelServices',
  },
  {
    name: 'tunnel-stop',
    description: 'Stop running tunnel service',
    category: 'Development',
    selected: false,
    feature: 'tunnelServices',
  },
  {
    name: 'phase-track',
    description: 'Track progress of phased development plan',
    category: 'Planning',
    selected: false,
    feature: 'phasedDevelopment',
  },
  {
    name: 'deploy-full',
    description: 'Full-stack deployment (requires deploymentAutomation feature)',
    category: 'Deployment',
    selected: false,
    feature: 'deploymentAutomation',
  },
  {
    name: 'refactor-check',
    description: 'Fast pre-commit quality gate - lint, type-check, test affected files',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'refactor-cleanup',
    description: 'Daily maintenance automation - fix lint, remove unused imports, format',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'refactor-prep',
    description: 'Pre-refactoring safety checklist - ensure safe conditions',
    category: 'Refactoring',
    selected: false,
    feature: 'refactoring',
  },
  {
    name: 'create-smoke-test',
    description: 'Auto-generate Playwright smoke tests for critical user flows',
    category: 'Testing',
    selected: false,
    feature: 'testing',
  },
  {
    name: 'orchestration-guide',
    description: 'Quick reference for L1/L2/L3 agent orchestration',
    category: 'Orchestration',
    selected: false,
    feature: 'agentOrchestration',
  },
  {
    name: 'vdb-status',
    description: 'Check Vision Driver Bot status, queue, and recommendations',
    category: 'VDB',
    selected: false,
    feature: 'visionDriverBot',
  },
  {
    name: 'vdb-scan',
    description: 'Scan Vision board for actionable items and queue them',
    category: 'VDB',
    selected: false,
    feature: 'visionDriverBot',
  },
  {
    name: 'vdb-execute-next',
    description: 'Execute the next task from VDB queue autonomously',
    category: 'VDB',
    selected: false,
    feature: 'visionDriverBot',
  },
  {
    name: 'vdb-init',
    description: 'Initialize Vision Driver Bot for this project',
    category: 'VDB',
    selected: false,
    feature: 'visionDriverBot',
  },
  {
    name: 'ai-constitution-framework',
    description: 'AI Constitution - code style and architecture preferences enforcement',
    category: 'Code Quality',
    selected: false,
    feature: 'aiConstitution',
  },
];
