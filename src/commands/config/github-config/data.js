/**
 * GitHub Configuration Data
 *
 * Constants, defaults, and config data structures.
 */

/**
 * Default GitHub settings schema
 */
export const DEFAULT_GITHUB_SETTINGS = {
  repository: {
    owner: '',
    name: '',
  },
  project: {
    number: null,
    id: '',
  },
  defaults: {
    branch: 'main',
    createFeatureBranches: false,
    useWorktreesForPhaseDev: true,
    labels: ['feature'],
    priority: 'P2-Medium',
    qa: 'Not Required',
    agent: 'general-purpose',
  },
  workflow: {
    autoFixBlankFields: true,
    autoReorderOnCreate: false,
    generateTestsByDefault: false,
    taskListsAsPRs: false,
    autoDeployOnComplete: true,
  },
  pr: {
    baseBranch: 'main',
    autoCloseIssues: true,
    squashMerge: true,
    deleteBranchAfterMerge: true,
  },
};
