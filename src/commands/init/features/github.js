/**
 * GitHub-Related Features
 *
 * Defines GitHub integration and Vision Driver Bot features.
 */

export const GITHUB_FEATURES = [
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
