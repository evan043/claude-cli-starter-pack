/**
 * Project Management Hierarchy Schema Definitions
 *
 * Hierarchy Structure:
 *   OPTIONAL (disabled by default):
 *     Vision (AI-managed) → Contains Epics (User-managed with AI assistance)
 *
 *   ALWAYS AVAILABLE (work independently):
 *     Roadmaps → Phases → Tasks
 *
 * When Vision/Epics enabled, they can link to Roadmaps.
 * When disabled, Roadmaps, Phase Dev Plans, and Task Lists work independently.
 *
 * Integrations:
 *   GitHub, Jira, Linear, ClickUp - same rules apply to all
 */

/**
 * Vision Schema (Optional, disabled by default)
 * AI-managed strategic direction with OKRs
 * Generated on manual trigger, with reminders when ahead of schedule
 *
 * IMPORTANT: Vision CONTAINS Epics - they are part of the Vision layer
 * Both Vision and its Epics are disabled by default and must be
 * explicitly enabled via /menu -> settings -> Epic & Vision toggle
 */
export const VISION_SCHEMA = {
  vision_id: 'string (uuid)',
  title: 'string',
  description: 'string',
  status: 'draft | active | archived',
  enabled: 'boolean (default: false)',

  // OKRs - Objectives and Key Results
  okrs: [
    {
      objective: 'string',
      key_results: [
        {
          description: 'string',
          target_value: 'number',
          current_value: 'number',
          unit: 'string (%, count, etc.)',
        },
      ],
    },
  ],

  // Timeline scaling based on actual development time
  timeline: {
    period: 'quarterly | yearly | custom',
    start_date: 'ISO8601',
    end_date: 'ISO8601',
    // Calculated from completion_tracking.json
    velocity_adjustment: 'number (multiplier based on actual vs planned)',
  },

  // CONTAINED Epics - Epics are PART OF Vision, not separate
  // When Vision is enabled, Epics are also enabled
  epics: ['Epic objects inline or epic_id references'],

  // Linked roadmaps (optional - roadmaps work independently)
  linked_roadmaps: ['roadmap_id'],

  // AI generation settings
  ai_settings: {
    auto_generate_suggestions: 'boolean',
    reminder_threshold_percent: 'number (e.g., 120 = remind at 120% ahead)',
    last_generated: 'ISO8601',
    generation_trigger: 'manual | scheduled | on_completion',
  },

  // Metadata
  created: 'ISO8601',
  updated: 'ISO8601',
};

/**
 * Epic Schema (User-managed with AI assistance)
 * Strategic initiative - can be quarterly OR feature-based
 *
 * IMPORTANT: Epics are PART OF Vision and disabled by default.
 * When Vision is enabled, Epics become available.
 * Epics can link to Roadmaps, but Roadmaps work independently.
 */
export const EPIC_SCHEMA = {
  epic_id: 'string (uuid)',
  slug: 'string (kebab-case)',
  title: 'string',
  description: 'string',
  type: 'quarterly | feature | initiative',

  // Business context
  business_objective: 'string',
  success_criteria: ['string'],
  scope: {
    in: ['string'],
    out: ['string'],
  },

  // Status and priority
  status: 'backlog | planned | active | paused | completed | cancelled',
  priority: 'P0 | P1 | P2 | P3 | P4',

  // Timeline (scaled based on velocity)
  timeline: {
    target_start: 'ISO8601 | null',
    target_end: 'ISO8601 | null',
    actual_start: 'ISO8601 | null',
    actual_end: 'ISO8601 | null',
    // Calculated from completion_tracking.json
    estimated_completion: 'ISO8601 | null',
  },

  // Hierarchy links - Epic is part of Vision (parent)
  vision_id: 'string (required when Vision enabled)',
  // Linked roadmaps - optional, roadmaps work independently
  linked_roadmaps: ['roadmap_id'],

  // External integrations
  external_links: {
    github: {
      issue_number: 'number | null',
      project_number: 'number | null',
      url: 'string | null',
    },
    jira: {
      key: 'string | null (e.g., PROJ-123)',
      board_id: 'string | null',
      url: 'string | null',
    },
    linear: {
      id: 'string | null',
      team_key: 'string | null',
      url: 'string | null',
    },
    clickup: {
      task_id: 'string | null',
      list_id: 'string | null',
      space_id: 'string | null',
      url: 'string | null',
    },
  },

  // Progress tracking
  progress: {
    total_roadmaps: 'number',
    completed_roadmaps: 'number',
    completion_percentage: 'number',
  },

  // Metadata
  created: 'ISO8601',
  updated: 'ISO8601',
  created_by: 'user | ai_suggestion',
};

/**
 * Roadmap Schema (Timeline/Sequencing layer)
 * Already implemented in src/roadmap/schema.js - extended here
 *
 * ALWAYS AVAILABLE - works independently of Vision/Epics
 * Can optionally link to an Epic when Vision is enabled
 */
export const ROADMAP_SCHEMA = {
  roadmap_id: 'string (uuid)',
  slug: 'string (kebab-case)',
  title: 'string',
  description: 'string',

  // Optional hierarchy link - only used when Vision/Epics enabled
  epic_id: 'string | null (optional - roadmaps work independently)',

  // Source of roadmap
  source: 'manual | github-issues | github-project | jira | linear | clickup',

  // Status
  status: 'planning | active | paused | completed',

  // Phases
  phases: ['phase_id'],
  dependency_graph: 'object (phase_id -> [dependent_phase_ids])',

  // Progress
  progress: {
    total_phases: 'number',
    completed_phases: 'number',
    completion_percentage: 'number',
  },

  // External sync
  external_links: {
    // Same structure as epic
  },

  // Metadata
  created: 'ISO8601',
  updated: 'ISO8601',
};

/**
 * Phase Schema (Execution layer)
 * Already implemented in src/roadmap/schema.js - reference
 *
 * ALWAYS AVAILABLE - works independently as part of Phase Dev Plans
 */
export const PHASE_SCHEMA = {
  phase_id: 'string',
  phase_title: 'string',
  goal: 'string',
  complexity: 'S | M | L',
  status: 'pending | in_progress | completed | blocked',
  inputs: {
    issues: ['#number'],
    docs: ['path'],
    prompts: ['string'],
  },
  outputs: ['string'],
  dependencies: ['phase_id'],
  tasks: ['task_id'],
  // ... rest from existing schema
};

/**
 * Task Schema (Work unit layer)
 * Already implemented in decompose.js - reference
 *
 * ALWAYS AVAILABLE - works independently as Task Lists
 */
export const TASK_SCHEMA = {
  task_id: 'string',
  content: 'string',
  activeForm: 'string',
  status: 'pending | in_progress | completed | blocked',
  type: 'research | review | implementation | verification | testing | commit',
  file_refs: [{ file: 'string', line: 'number' }],
  function_refs: ['string'],
  estimated_hours: 'number | null',
  actual_hours: 'number | null',
  // ... rest from existing schema
};

/**
 * Completion Tracking Schema
 * Tracks actual development time for velocity calculations
 */
export const COMPLETION_TRACKING_SCHEMA = {
  // Velocity metrics
  velocity: {
    // Rolling averages
    daily: {
      tasks_per_day: 'number',
      phases_per_week: 'number',
      data_points: 'number',
    },
    weekly: {
      tasks_per_week: 'number',
      phases_per_month: 'number',
      data_points: 'number',
    },
    monthly: {
      roadmaps_per_month: 'number',
      epics_per_quarter: 'number',
      data_points: 'number',
    },
  },

  // Historical completions
  completions: [
    {
      type: 'task | phase | roadmap | epic',
      id: 'string',
      title: 'string',
      estimated_duration: 'number (hours)',
      actual_duration: 'number (hours)',
      completed_at: 'ISO8601',
      complexity: 'S | M | L | null',
    },
  ],

  // Schedule status
  schedule_status: {
    current_position: 'behind | on_track | ahead',
    deviation_percent: 'number (negative = behind, positive = ahead)',
    last_calculated: 'ISO8601',
  },

  // Vision generation reminders
  vision_reminders: {
    enabled: 'boolean',
    // Remind when ahead by this percentage
    ahead_threshold_percent: 'number (default: 20)',
    last_reminder: 'ISO8601 | null',
    dismissed_until: 'ISO8601 | null',
  },

  // Metadata
  last_updated: 'ISO8601',
};

/**
 * Integration Configuration Schema
 * Stored in .claude/integrations/config.json
 */
export const INTEGRATION_CONFIG_SCHEMA = {
  // Primary integration (for sync operations)
  primary: 'github | jira | linear | clickup | none',

  // Enabled integrations
  enabled: ['github', 'jira', 'linear', 'clickup'],

  // GitHub configuration (default, always available)
  github: {
    enabled: 'boolean (default: true)',
    owner: 'string',
    repo: 'string',
    project_number: 'number | null',
    default_labels: ['string'],
    sync_direction: 'outbound | bidirectional',
    // Uses gh CLI, no API key needed
  },

  // Jira configuration
  jira: {
    enabled: 'boolean (default: false)',
    base_url: 'string (e.g., https://company.atlassian.net)',
    project_key: 'string (e.g., PROJ)',
    board_id: 'string | null',
    api_token: 'string (stored securely)',
    email: 'string',
    sync_direction: 'outbound | bidirectional',
    field_mapping: {
      status: {
        pending: 'To Do',
        in_progress: 'In Progress',
        completed: 'Done',
        blocked: 'Blocked',
      },
      priority: {
        P0: 'Highest',
        P1: 'High',
        P2: 'Medium',
        P3: 'Low',
        P4: 'Lowest',
      },
      type: {
        epic: 'Epic',
        roadmap: 'Story',
        phase: 'Task',
        task: 'Sub-task',
      },
    },
  },

  // Linear configuration
  linear: {
    enabled: 'boolean (default: false)',
    api_key: 'string (stored securely)',
    team_key: 'string (e.g., PROJ)',
    sync_direction: 'outbound | bidirectional',
    field_mapping: {
      status: {
        pending: 'Backlog',
        in_progress: 'In Progress',
        completed: 'Done',
        blocked: 'Blocked',
      },
      priority: {
        P0: 'Urgent',
        P1: 'High',
        P2: 'Medium',
        P3: 'Low',
        P4: 'No Priority',
      },
    },
  },

  // ClickUp configuration
  clickup: {
    enabled: 'boolean (default: false)',
    api_key: 'string (stored securely)',
    workspace_id: 'string',
    space_id: 'string',
    default_list_id: 'string | null',
    sync_direction: 'outbound | bidirectional',
    field_mapping: {
      status: {
        pending: 'to do',
        in_progress: 'in progress',
        completed: 'complete',
        blocked: 'blocked',
      },
      priority: {
        P0: '1', // Urgent
        P1: '2', // High
        P2: '3', // Normal
        P3: '4', // Low
        P4: null,
      },
    },
  },

  // Sync settings
  sync: {
    auto_sync: 'boolean (default: false)',
    sync_frequency: 'on_change | hourly | daily | manual',
    conflict_resolution: 'local_wins | remote_wins | ask',
    last_sync: 'ISO8601 | null',
  },

  // Metadata
  configured_at: 'ISO8601',
  last_modified: 'ISO8601',
};

/**
 * Default values
 */
export const DEFAULTS = {
  // Vision & Epics - DISABLED by default
  // Both must be explicitly enabled via /menu -> settings -> Epic & Vision toggle
  vision_epics: {
    enabled: false, // Master toggle for both Vision and Epics
    require_tech_stack: true, // Must have tech stack configured first
    require_scaffolded_project: true, // Must be initialized project
  },
  vision: {
    enabled: false,
    reminder_threshold_percent: 120,
    generation_trigger: 'manual',
  },
  epic: {
    enabled: false, // Epics are part of Vision, disabled by default
    type: 'feature',
    priority: 'P2',
    status: 'backlog',
  },
  // Always available independently
  roadmap: {
    always_available: true,
  },
  phase: {
    always_available: true,
  },
  task: {
    always_available: true,
  },
  integration: {
    primary: 'github',
    sync_direction: 'outbound',
    sync_frequency: 'manual',
    conflict_resolution: 'local_wins',
  },
  velocity: {
    tasks_per_day: 3,
    phases_per_week: 1,
    ahead_threshold_percent: 20,
  },
};
