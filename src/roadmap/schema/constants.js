/**
 * Roadmap Schema Constants
 *
 * Schema definitions and constant values for roadmaps.
 */

/**
 * Roadmap JSON Schema Definition
 *
 * NEW ARCHITECTURE (Epic-Hierarchy):
 * - Roadmap coordinates MULTIPLE phase-dev-plans (not phases directly)
 * - Each phase-dev-plan has its own PROGRESS.json
 * - Roadmap tracks plan completion via references
 * - Legacy format supported for backwards compatibility
 */
export const ROADMAP_SCHEMA = {
  roadmap_id: 'string (uuid)',
  title: 'string',
  description: 'string',
  created: 'ISO8601',
  updated: 'ISO8601',
  source: 'manual | github-issues | github-project',
  status: 'planning | active | paused | completed',
  milestone: 'string (optional)',

  // Parent reference (for epic-hierarchy)
  parent_epic: {
    epic_id: 'string (uuid)',
    epic_slug: 'string',
    epic_path: 'string',
  },

  // NEW: Phase-dev-plan references (replaces direct phase tracking)
  phase_dev_plan_refs: [
    {
      slug: 'string (kebab-case)',
      path: 'string (.claude/phase-plans/{slug}/PROGRESS.json)',
      title: 'string',
      status: 'pending | in_progress | completed | blocked',
      completion_percentage: 'number (0-100)',
      created: 'ISO8601',
      updated: 'ISO8601',
    },
  ],

  // Cross-plan dependencies
  cross_plan_dependencies: [
    {
      dependent_slug: 'string',
      depends_on_slug: 'string',
      reason: 'string',
    },
  ],

  // Commercial compliance configuration (optional — activated when project is SaaS)
  compliance: {
    enabled: 'boolean',
    mode: 'commercial-saas | ip-only | disabled',
    status: 'not_started | planning | in_progress | passed | failed',
    blocking: 'boolean', // If true, plans cannot start until compliance planning completes

    // Multi-tenancy
    multi_tenancy: {
      enabled: 'boolean',
      strategy: 'subdomain | header | token | path | null',
    },

    // RBAC
    rbac: {
      enabled: 'boolean',
      roles: ['string'], // e.g., ['user', 'admin', 'super_admin']
    },

    // Mandatory docs status
    documentation: {
      design_origin: 'not_started | draft | complete',
      routes_md: 'not_started | draft | complete',
      api_contract: 'not_started | draft | complete',
      rbac_md: 'not_started | draft | complete',
    },

    // Audit results
    audit: {
      last_audit_date: 'ISO8601 | null',
      score: 'number (0-100) | null',
      verdict: 'PASS | CONDITIONAL | FAIL | null',
      audit_file: 'string | null',
    },

    // IP compliance (reuses existing compliance engine)
    ip_compliance: {
      competitors_analyzed: ['string'],
      policy_version: 'string',
    },
  },

  // Metadata
  metadata: {
    plan_count: 'number',
    overall_completion_percentage: 'number (0-100)',
  },

  // LEGACY: Direct phase tracking (deprecated, for backwards compatibility)
  phases: [
    {
      phase_id: 'string',
      phase_title: 'string',
      goal: 'string',
      inputs: {
        issues: ['#number'],
        docs: ['path'],
        prompts: ['string'],
      },
      outputs: ['artifact descriptions'],
      agents_assigned: ['agent-name'],
      dependencies: ['phase_id'],
      complexity: 'S | M | L',
      status: 'pending | in_progress | completed | blocked',
    },
  ],
};

/**
 * Complexity definitions
 */
export const COMPLEXITY = {
  S: { label: 'Small', maxTasks: 10, estimatedHours: '2-4' },
  M: { label: 'Medium', maxTasks: 30, estimatedHours: '8-16' },
  L: { label: 'Large', maxTasks: 80, estimatedHours: '24-40' },
};

/**
 * Phase status definitions
 */
export const PHASE_STATUS = {
  pending: { label: 'Pending', icon: '⬜', color: 'gray' },
  in_progress: { label: 'In Progress', icon: '🔄', color: 'yellow' },
  completed: { label: 'Completed', icon: '✅', color: 'green' },
  blocked: { label: 'Blocked', icon: '🚫', color: 'red' },
};

/**
 * Roadmap source types
 */
export const ROADMAP_SOURCE = {
  manual: 'manual',
  github_issues: 'github-issues',
  github_project: 'github-project',
};

/**
 * Multi-Project Roadmap Schema Definition
 * Used when decomposition_type is 'projects'
 */
export const MULTI_PROJECT_ROADMAP_SCHEMA = {
  roadmap_id: 'string (uuid)',
  slug: 'string (kebab-case)',
  title: 'string',
  description: 'string',
  created: 'ISO8601',
  updated: 'ISO8601',
  source: 'manual | github-issues | github-project | multi-project',
  status: 'planning | discovering | active | paused | completed',

  // Type of decomposition
  decomposition_type: 'phases | projects',

  // For multi-project roadmaps
  projects: [{
    project_id: 'string',
    project_title: 'string',
    description: 'string',
    domain: 'frontend | backend | database | testing | deployment | general',
    complexity: 'S | M | L',

    // GitHub integration
    github_issue_number: 'number | null',
    github_issue_url: 'string | null',

    // State management
    orchestrator_state_path: 'string',
    exploration_path: 'string',

    // L2 Findings
    l2_findings: {
      code_snippets: [{
        file: 'string',
        lines: { start: 'number', end: 'number' },
        content: 'string',
        language: 'string',
        relevance: 'string',
      }],
      reference_files: {
        modify: [{ path: 'string', reason: 'string', complexity: 'S | M | L' }],
        reference: [{ path: 'string', reason: 'string' }],
        tests: [{ path: 'string', coverage: 'string' }],
      },
      agent_delegation: {
        primary_agent: 'string',
        task_assignments: [{ phase: 'string', task: 'string', agent: 'string', reason: 'string' }],
        execution_sequence: [{ agent: 'string', scope: 'string' }],
      },
    },

    // Full phase breakdown (nested phases)
    phases: [{
      id: 'number',
      name: 'string',
      objective: 'string',
      complexity: 'S | M | L',
      assigned_agent: 'string',
      dependencies: ['phase_id'],
      validation_criteria: ['string'],

      // Sub-tasks within each phase
      tasks: [{
        id: 'string', // "1.1", "1.2", etc.
        title: 'string',
        description: 'string',
        subject: 'string', // TaskCreate
        activeForm: 'string', // TaskCreate
        status: 'pending | in_progress | completed | blocked',
        files: {
          modify: [{ path: 'string', reason: 'string' }],
          reference: [{ path: 'string', reason: 'string' }],
        },
        code_pattern_ref: 'string | null',
        acceptance_criteria: ['string'],
        assigned_agent: 'string',
        blocked_by: ['task_id'],
        blocks: ['task_id'],
      }],
    }],

    status: 'pending | discovering | ready | in_progress | completed',
    metadata: {
      created: 'ISO8601',
      discovery_started: 'ISO8601 | null',
      discovery_completed: 'ISO8601 | null',
      execution_started: 'ISO8601 | null',
      execution_completed: 'ISO8601 | null',
    },
  }],

  // Execution configuration
  execution_config: {
    parallel_discovery: 'boolean', // Run L2 discovery in parallel for all projects
    sequential_execution: 'boolean', // Execute projects sequentially
    ralph_loop_enabled: 'boolean', // Enable test-fix cycles
    testing_strategy: 'per-project | final-only | none',
  },

  metadata: {
    total_projects: 'number',
    completed_projects: 'number',
    completion_percentage: 'number',
    github_epic_number: 'number | null',
    github_epic_url: 'string | null',
    github_integrated: 'boolean',
    last_github_sync: 'ISO8601 | null',
  },
};
