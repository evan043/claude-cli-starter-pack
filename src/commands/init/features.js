/**
 * Init Features Configuration
 *
 * Defines optional features and available commands for CCASP installation.
 * Extracted from init.js for maintainability.
 */

/**
 * Optional features with detailed descriptions
 * These can be selected during init and require post-install configuration via /menu
 */
export const OPTIONAL_FEATURES = [
  {
    name: 'tokenManagement',
    label: 'Token Budget Management',
    description: 'Monitor and manage Claude API token usage with automatic compaction warnings, archive suggestions, and respawn thresholds. Includes hooks that track usage per session.',
    commands: ['context-audit'],
    hooks: ['context-guardian', 'token-budget-loader', 'tool-output-cacher'],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'happyMode',
    label: 'Happy Engineering Integration',
    description: 'Integration with Happy Coder mobile app for remote session control, checkpoint management, and mobile-optimized responses.',
    commands: ['happy-start'],
    hooks: ['happy-checkpoint-manager', 'happy-title-generator', 'happy-mode-detector', 'context-injector'],
    binaries: ['happy-start.ps1'],
    default: false,
    requiresPostConfig: true,
    npmPackage: 'happy-coder',
    npmInstallPrompt: 'Install Happy Coder CLI globally? (npm i -g happy-coder)',
  },
  {
    name: 'githubIntegration',
    label: 'GitHub Project Board Integration',
    description: 'Connect Claude to your GitHub Project Board for automated issue creation, progress tracking, and PR merge automation. Requires gh CLI authentication.',
    commands: ['github-project-menu', 'github-task-start'],
    hooks: ['github-progress-hook'],
    default: true,
    requiresPostConfig: true,
  },
  {
    name: 'phasedDevelopment',
    label: 'Phased Development System',
    description: 'Generate production-ready development plans with 95%+ success criteria, automatic scaling (S/M/L), and progress tracking. Creates PROGRESS.json files for state persistence.',
    commands: ['phase-dev-plan', 'phase-track'],
    hooks: ['phase-dev-enforcer'],
    default: true,
    requiresPostConfig: false,
  },
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
    name: 'tunnelServices',
    label: 'Tunnel Service Integration',
    description: 'Expose local development server for mobile testing or webhooks. Supports ngrok, localtunnel, cloudflare-tunnel, and serveo. No default service - configured after installation via /menu.',
    commands: ['tunnel-start', 'tunnel-stop'],
    hooks: [],
    default: false,
    requiresPostConfig: true,
  },
  {
    name: 'advancedHooks',
    label: 'Advanced Hook Suite',
    description: 'Extended hook system with session management, git commit tracking, branch validation, issue detection, token monitoring, autonomous logging, and phase validation gates.',
    commands: [],
    hooks: [
      'session-id-generator',
      'git-commit-tracker',
      'branch-merge-checker',
      'issue-completion-detector',
      'token-usage-monitor',
      'autonomous-decision-logger',
      'phase-validation-gates',
    ],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'skillTemplates',
    label: 'Skill Creator Templates',
    description: 'Pre-built skills for agent creation, hook creation, and RAG-enhanced agent building. Provides best-practice templates for extending Claude Code.',
    commands: [],
    hooks: [],
    skills: ['agent-creator', 'hook-creator', 'rag-agent-creator', 'panel'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'refactoring',
    label: 'Refactoring Tools',
    description: 'Code quality commands for linting, cleanup, and safe refactoring. Includes pre-commit checks, auto-fix, and safety checklists.',
    commands: ['refactor-check', 'refactor-cleanup', 'refactor-prep'],
    hooks: [],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'testing',
    label: 'Advanced Testing',
    description: 'Extended testing capabilities including smoke test generation and test coverage analysis.',
    commands: ['create-smoke-test'],
    hooks: [],
    default: false,
    requiresPostConfig: false,
  },
  {
    name: 'ralphLoop',
    label: 'Ralph Loop Testing',
    description: 'Continuous test-fix cycle automation. Runs tests, detects failures, applies fixes, and repeats until all tests pass or max iterations reached.',
    commands: ['ralph'],
    hooks: ['ralph-loop-enforcer'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'refactorAudit',
    label: 'Refactor Audit System',
    description: 'Monitors task/phase completions and flags files over 500 lines for refactoring. Offers guided workflow: new branch, task list, GitHub issue, specialist agent deployment.',
    commands: ['refactor-workflow', 'refactor-analyze', 'golden-master'],
    hooks: ['refactor-audit', 'refactor-verify', 'refactor-transaction'],
    skills: ['refactor-react', 'refactor-fastapi'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'autoStackAgents',
    label: 'Auto Stack-Specific Agents',
    description: 'Automatically generate specialist agents based on your tech stack (React, FastAPI, Prisma, etc.). Includes delegation hooks for intelligent task routing.',
    commands: ['generate-agents'],
    hooks: ['task-classifier', 'agent-delegator', 'delegation-enforcer'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'projectExplorer',
    label: 'Project Explorer (Fresh Scaffolding)',
    description: 'Interactive wizard for scaffolding new projects in empty directories. Interviews user about project goals, creates skeleton files, installs dependencies, and hands off to implementation.',
    commands: ['project-explorer'],
    hooks: [],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'roadmapSystem',
    label: 'Roadmap Management System',
    description: 'Multi-phase roadmap creation with automatic GitHub issue hierarchy (epic → child issues), complexity detection that recommends roadmaps for large plans, state tracking between PROGRESS.json and ROADMAP.json, automatic phase advancement, and auto-generated documentation.',
    commands: ['create-roadmap', 'roadmap-status'],
    hooks: ['complexity-analyzer', 'roadmap-state-tracker', 'documentation-generator'],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'agentOrchestration',
    label: 'Agent Orchestration System',
    description: 'Hierarchical agent orchestration (L1/L2/L3) for phased development. L1 orchestrator spawns L2 specialists by domain, L2s spawn L3 workers for atomic tasks. Auto-updates PROGRESS.json, syncs to GitHub issues, enforces delegation hierarchy.',
    commands: ['orchestration-guide'],
    hooks: [
      'orchestrator-init',
      'orchestrator-enforcer',
      'hierarchy-validator',
      'progress-tracker',
      'github-progress-sync',
      'l2-completion-reporter',
      'l3-parallel-executor',
      'subagent-context-injector',
      'completion-verifier',
      'agent-error-recovery',
      'orchestrator-audit-logger',
    ],
    default: true,
    requiresPostConfig: false,
  },
  {
    name: 'visionDriverBot',
    label: 'Vision Driver Bot (Autonomous Development)',
    description: 'Autonomous development system that monitors Vision/Epic boards and drives development forward without human intervention. Uses GitHub Actions for scheduled execution, AI-powered decision making, and automatic task completion.',
    commands: ['vdb-status', 'vdb-scan', 'vdb-execute-next', 'vdb-init'],
    hooks: ['agent-epic-progress'],
    workflows: ['vision-driver-bot.yml'],
    default: false,
    requiresPostConfig: true,
    postConfigSteps: [
      'Add ANTHROPIC_API_KEY to GitHub repository secrets',
      'Create PAT with repo+project permissions and add as VDB_PAT secret',
      '(Optional) Create GitHub Project board for Vision tracking',
    ],
  },
];

/**
 * Available slash commands to deploy
 */
export const AVAILABLE_COMMANDS = [
  {
    name: 'menu',
    description: 'Interactive ASCII menu for project commands and tools',
    category: 'Navigation',
    selected: true,
    required: true,
  },
  {
    name: 'ccasp-panel',
    description: 'Launch control panel in new terminal (agents, skills, hooks, MCP)',
    category: 'Navigation',
    selected: true,
  },
  {
    name: 'e2e-test',
    description: 'Run E2E tests with Playwright (ralph loop, headed, watch modes)',
    category: 'Testing',
    selected: true,
  },
  {
    name: 'ralph',
    description: 'Ralph Loop - Continuous test-fix cycle until all tests pass',
    category: 'Testing',
    selected: true,
  },
  {
    name: 'refactor-workflow',
    description: 'Guided refactoring workflow with branch, task list, and GitHub issue',
    category: 'Refactoring',
    selected: true,
  },
  {
    name: 'refactor-analyze',
    description: 'Deep complexity analysis for refactoring prioritization',
    category: 'Refactoring',
    selected: true,
  },
  {
    name: 'golden-master',
    description: 'Generate characterization tests before refactoring',
    category: 'Refactoring',
    selected: true,
  },
  {
    name: 'github-task',
    description: 'Create GitHub issues with codebase analysis',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'github-menu-issues-list',
    description: 'Mobile-friendly menu of open GitHub issues',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'create-task-list-for-issue',
    description: 'Start working on a GitHub issue by number',
    category: 'GitHub',
    selected: true,
  },
  {
    name: 'phase-dev-plan',
    description: 'Create phased development plans (95%+ success rate)',
    category: 'Planning',
    selected: true,
  },
  {
    name: 'create-agent',
    description: 'Create L1/L2/L3 agents for Claude Code',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'create-hook',
    description: 'Create enforcement hooks (PreToolUse, PostToolUse, UserPromptSubmit)',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'create-skill',
    description: 'Create RAG-enhanced skill packages',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'explore-mcp',
    description: 'Discover and install MCP servers based on tech stack',
    category: 'MCP',
    selected: true,
  },
  {
    name: 'claude-audit',
    description: 'Audit CLAUDE.md and .claude/ against best practices',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'detect-tech-stack',
    description: 'Re-run tech stack detection and update configuration',
    category: 'Analysis',
    selected: true,
  },
  {
    name: 'generate-agents',
    description: 'Generate stack-specific agents from detected tech stack',
    category: 'Claude Code',
    selected: true,
  },
  {
    name: 'project-explorer',
    description: 'Interactive scaffolding wizard for fresh projects',
    category: 'Scaffolding',
    selected: true,
  },
  {
    name: 'init-ccasp-new-project',
    description: 'Initialize CCASP Full preset on empty folder (for Happy users)',
    category: 'Setup',
    selected: true,
  },
  {
    name: 'roadmap-sync',
    description: 'Sync roadmaps with GitHub Project Board',
    category: 'GitHub',
    selected: false,
  },
  {
    name: 'claude-settings',
    description: 'Configure Claude CLI permissions and modes',
    category: 'Claude Code',
    selected: false,
  },
  {
    name: 'codebase-explorer',
    description: 'Analyze codebase structure and find relevant files',
    category: 'Analysis',
    selected: true,
  },
  {
    name: 'rag-pipeline',
    description: 'Generate RAG pipeline with L1 orchestrator + L2 specialists',
    category: 'Claude Code',
    selected: false,
  },
  {
    name: 'create-task-list',
    description: 'Create intelligent task list with codebase exploration and GitHub integration',
    category: 'Planning',
    selected: true,
  },
  {
    name: 'ccasp-setup',
    description: 'CCASP Setup Wizard - vibe-code friendly project configuration',
    category: 'Claude Code',
    selected: true,
    required: true,
  },
  // Feature-specific commands (deployed based on OPTIONAL_FEATURES selection)
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
    name: 'project-implementation-for-ccasp',
    description: 'Complete CCASP project setup - tech stack, CLAUDE.md, GitHub, MCPs',
    category: 'Setup',
    selected: true,
  },
  {
    name: 'update-check',
    description: 'Check for CCASP updates and add new features to your project',
    category: 'Maintenance',
    selected: true,
  },
  {
    name: 'update-smart',
    description: 'Smart merge manager for customized assets during updates',
    category: 'Maintenance',
    selected: true,
  },
  // Refactoring commands (Phase 4)
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
    name: 'ask-claude',
    description: 'Natural language command discovery - find the right command for any task',
    category: 'Discovery',
    selected: true,
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
  // Vision Driver Bot commands
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
];

/**
 * Get feature by name
 */
export function getFeatureByName(name) {
  return OPTIONAL_FEATURES.find(f => f.name === name);
}

/**
 * Get commands for a feature
 */
export function getCommandsForFeature(featureName) {
  const feature = getFeatureByName(featureName);
  return feature ? feature.commands || [] : [];
}

/**
 * Get default features (those with default: true)
 */
export function getDefaultFeatures() {
  return OPTIONAL_FEATURES.filter(f => f.default);
}
