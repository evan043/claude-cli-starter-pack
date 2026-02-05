/**
 * Roadmap Schema & Validation
 *
 * Defines the JSON schema for roadmaps and provides validation functions.
 * A roadmap is a multi-phase project orchestration engine that transforms
 * project ideas into executable development plans.
 */

import { v4 as uuidv4 } from 'uuid';

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
 * Create a new empty roadmap structure
 *
 * @param {Object} options - Roadmap options
 * @returns {Object} New roadmap object
 */
export function createRoadmap(options = {}) {
  const {
    title = 'Untitled Roadmap',
    description = '',
    source = ROADMAP_SOURCE.manual,
    milestone = null,
    parent_epic = null,
  } = options;

  const now = new Date().toISOString();
  const roadmapId = options.roadmap_id || uuidv4();
  const slug = options.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    roadmap_id: roadmapId,
    slug,
    title,
    description,
    created: now,
    updated: now,
    source,
    status: 'planning',
    milestone,

    // Parent epic reference
    parent_epic: parent_epic || null,

    // NEW: Phase-dev-plan references
    phase_dev_plan_refs: [],

    // Cross-plan dependencies
    cross_plan_dependencies: [],

    // LEGACY: Direct phases (for backwards compatibility)
    phases: [],

    metadata: {
      // NEW: Plan-based metrics
      plan_count: 0,
      overall_completion_percentage: 0,

      // LEGACY: Phase-based metrics
      total_phases: 0,
      completed_phases: 0,
      completion_percentage: 0,

      github_integrated: false,
      last_github_sync: null,
    },
  };
}

/**
 * Create a new phase structure
 *
 * @param {Object} options - Phase options
 * @returns {Object} New phase object
 */
export function createPhase(options = {}) {
  const {
    phase_title = 'Untitled Phase',
    goal = '',
    complexity = 'M',
    phase_number = 1,
  } = options;

  const phaseId = options.phase_id || `phase-${phase_number}`;

  return {
    phase_id: phaseId,
    phase_title,
    goal,
    inputs: {
      issues: options.issues || [],
      docs: options.docs || [],
      prompts: options.prompts || [],
    },
    outputs: options.outputs || [],
    agents_assigned: options.agents_assigned || [],
    dependencies: options.dependencies || [],
    complexity,
    status: 'pending',
    phase_dev_config: {
      scale: complexity,
      progress_json_path: null,
    },
    metadata: {
      total_tasks: 0,
      completed_tasks: 0,
      created: new Date().toISOString(),
      completed_at: null,
    },
  };
}

/**
 * Validate a roadmap object
 *
 * @param {Object} roadmap - Roadmap to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateRoadmap(roadmap) {
  const errors = [];

  // Required fields
  if (!roadmap.roadmap_id) {
    errors.push('Missing required field: roadmap_id');
  }
  if (!roadmap.title || roadmap.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (!roadmap.source || !Object.values(ROADMAP_SOURCE).includes(roadmap.source)) {
    errors.push(`Invalid source: ${roadmap.source}. Must be one of: ${Object.values(ROADMAP_SOURCE).join(', ')}`);
  }

  // Validate phases
  if (roadmap.phases && Array.isArray(roadmap.phases)) {
    const phaseIds = new Set();
    for (const phase of roadmap.phases) {
      const phaseValidation = validatePhase(phase, phaseIds);
      errors.push(...phaseValidation.errors);
      if (phase.phase_id) {
        phaseIds.add(phase.phase_id);
      }
    }

    // Check for dependency cycles
    const cycleCheck = detectDependencyCycles(roadmap.phases);
    if (cycleCheck.hasCycle) {
      errors.push(`Circular dependency detected: ${cycleCheck.cycle.join(' -> ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a phase object
 *
 * @param {Object} phase - Phase to validate
 * @param {Set} existingIds - Set of existing phase IDs (for dependency validation)
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validatePhase(phase, existingIds = new Set()) {
  const errors = [];

  if (!phase.phase_id) {
    errors.push('Phase missing required field: phase_id');
  }
  if (!phase.phase_title || phase.phase_title.trim() === '') {
    errors.push(`Phase ${phase.phase_id || '?'}: missing required field: phase_title`);
  }
  if (phase.complexity && !['S', 'M', 'L'].includes(phase.complexity)) {
    errors.push(`Phase ${phase.phase_id || '?'}: invalid complexity ${phase.complexity}. Must be S, M, or L`);
  }
  if (phase.status && !Object.keys(PHASE_STATUS).includes(phase.status)) {
    errors.push(`Phase ${phase.phase_id || '?'}: invalid status ${phase.status}`);
  }

  // Validate dependencies reference existing phases
  if (phase.dependencies && Array.isArray(phase.dependencies)) {
    for (const depId of phase.dependencies) {
      if (!existingIds.has(depId)) {
        // This is a forward reference - might be valid if phase appears later
        // We'll handle this at the roadmap level
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detect dependency cycles in phases
 *
 * @param {Array} phases - Array of phases
 * @returns {Object} { hasCycle: boolean, cycle: string[] }
 */
export function detectDependencyCycles(phases) {
  const graph = new Map();

  // Build adjacency list
  for (const phase of phases) {
    graph.set(phase.phase_id, phase.dependencies || []);
  }

  const visited = new Set();
  const recursionStack = new Set();
  const cyclePath = [];

  function hasCycleDFS(nodeId, path) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor, path)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cyclePath.push(...path.slice(cycleStart), neighbor);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  for (const phase of phases) {
    if (!visited.has(phase.phase_id)) {
      if (hasCycleDFS(phase.phase_id, [])) {
        return { hasCycle: true, cycle: cyclePath };
      }
    }
  }

  return { hasCycle: false, cycle: [] };
}

/**
 * Calculate roadmap completion percentage
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletion(roadmap) {
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return 0;
  }

  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  return Math.round((completedPhases / roadmap.phases.length) * 100);
}

/**
 * Get next available phases (no unmet dependencies)
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {Array} Array of phases that can be started
 */
export function getNextAvailablePhases(roadmap) {
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return [];
  }

  const completedIds = new Set(
    roadmap.phases
      .filter(p => p.status === 'completed')
      .map(p => p.phase_id)
  );

  return roadmap.phases.filter(phase => {
    // Already completed or in progress
    if (phase.status === 'completed' || phase.status === 'in_progress') {
      return false;
    }

    // Check all dependencies are completed
    const deps = phase.dependencies || [];
    return deps.every(depId => completedIds.has(depId));
  });
}

/**
 * Update roadmap metadata based on current state
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @returns {Object} Updated roadmap
 */
export function updateRoadmapMetadata(roadmap) {
  if (!roadmap.phases) {
    roadmap.phases = [];
  }

  const completedPhases = roadmap.phases.filter(p => p.status === 'completed').length;
  const totalPhases = roadmap.phases.length;

  roadmap.metadata = roadmap.metadata || {};
  roadmap.metadata.total_phases = totalPhases;
  roadmap.metadata.completed_phases = completedPhases;
  roadmap.metadata.completion_percentage = totalPhases > 0
    ? Math.round((completedPhases / totalPhases) * 100)
    : 0;

  roadmap.updated = new Date().toISOString();

  // Update status based on phases
  if (totalPhases === 0) {
    roadmap.status = 'planning';
  } else if (completedPhases === totalPhases) {
    roadmap.status = 'completed';
  } else if (roadmap.phases.some(p => p.status === 'in_progress')) {
    roadmap.status = 'active';
  }

  return roadmap;
}

/**
 * Generate a slug from title
 *
 * @param {string} title - Title to slugify
 * @returns {string} Slug
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// PHASE-DEV-PLAN REFERENCE MANAGEMENT (Epic-Hierarchy)
// ============================================================

/**
 * Create a phase-dev-plan reference
 *
 * @param {Object} options - Plan reference options
 * @returns {Object} New plan reference object
 */
export function createPlanReference(options = {}) {
  const {
    slug,
    title = 'Untitled Plan',
    status = 'pending',
    completion_percentage = 0,
  } = options;

  if (!slug) {
    throw new Error('Plan reference requires a slug');
  }

  const now = new Date().toISOString();

  return {
    slug,
    path: `.claude/phase-plans/${slug}/PROGRESS.json`,
    title,
    status,
    completion_percentage,
    created: now,
    updated: now,
  };
}

/**
 * Add a phase-dev-plan reference to a roadmap
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {Object} planRef - Plan reference to add
 * @returns {Object} Updated roadmap
 */
export function addPlanReference(roadmap, planRef) {
  if (!roadmap.phase_dev_plan_refs) {
    roadmap.phase_dev_plan_refs = [];
  }

  // Check for duplicate slug
  const existingIndex = roadmap.phase_dev_plan_refs.findIndex(ref => ref.slug === planRef.slug);
  if (existingIndex !== -1) {
    // Update existing reference
    roadmap.phase_dev_plan_refs[existingIndex] = planRef;
  } else {
    // Add new reference
    roadmap.phase_dev_plan_refs.push(planRef);
  }

  // Update metadata
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Remove a phase-dev-plan reference from a roadmap
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} planSlug - Slug of plan to remove
 * @returns {Object} Updated roadmap
 */
export function removePlanReference(roadmap, planSlug) {
  if (!roadmap.phase_dev_plan_refs) {
    return roadmap;
  }

  roadmap.phase_dev_plan_refs = roadmap.phase_dev_plan_refs.filter(ref => ref.slug !== planSlug);
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.updated = new Date().toISOString();

  // Remove related dependencies
  if (roadmap.cross_plan_dependencies) {
    roadmap.cross_plan_dependencies = roadmap.cross_plan_dependencies.filter(
      dep => dep.dependent_slug !== planSlug && dep.depends_on_slug !== planSlug
    );
  }

  return roadmap;
}

/**
 * Update a plan reference's completion status
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} planSlug - Slug of plan to update
 * @param {Object} updates - Fields to update (status, completion_percentage)
 * @returns {Object} Updated roadmap
 */
export function updatePlanReference(roadmap, planSlug, updates) {
  if (!roadmap.phase_dev_plan_refs) {
    roadmap.phase_dev_plan_refs = [];
  }

  const planIndex = roadmap.phase_dev_plan_refs.findIndex(ref => ref.slug === planSlug);
  if (planIndex === -1) {
    throw new Error(`Plan reference not found: ${planSlug}`);
  }

  const planRef = roadmap.phase_dev_plan_refs[planIndex];
  Object.assign(planRef, updates);
  planRef.updated = new Date().toISOString();

  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Calculate overall completion from all plan references
 *
 * @param {Object} roadmap - Roadmap object
 * @returns {number} Overall completion percentage (0-100)
 */
export function calculateOverallCompletion(roadmap) {
  if (!roadmap.phase_dev_plan_refs || roadmap.phase_dev_plan_refs.length === 0) {
    // Fallback to legacy phase-based calculation
    return calculateCompletion(roadmap);
  }

  const totalPlans = roadmap.phase_dev_plan_refs.length;
  const totalCompletion = roadmap.phase_dev_plan_refs.reduce(
    (sum, ref) => sum + (ref.completion_percentage || 0),
    0
  );

  return Math.round(totalCompletion / totalPlans);
}

/**
 * Add a cross-plan dependency
 *
 * @param {Object} roadmap - Roadmap object (mutated)
 * @param {string} dependentSlug - Slug of plan that depends
 * @param {string} dependsOnSlug - Slug of plan it depends on
 * @param {string} reason - Reason for dependency
 * @returns {Object} Updated roadmap
 */
export function addCrossPlanDependency(roadmap, dependentSlug, dependsOnSlug, reason = '') {
  if (!roadmap.cross_plan_dependencies) {
    roadmap.cross_plan_dependencies = [];
  }

  // Check for duplicate
  const exists = roadmap.cross_plan_dependencies.some(
    dep => dep.dependent_slug === dependentSlug && dep.depends_on_slug === dependsOnSlug
  );

  if (!exists) {
    roadmap.cross_plan_dependencies.push({
      dependent_slug: dependentSlug,
      depends_on_slug: dependsOnSlug,
      reason,
    });
  }

  roadmap.updated = new Date().toISOString();

  return roadmap;
}

/**
 * Check if a plan's dependencies are satisfied
 *
 * @param {Object} roadmap - Roadmap object
 * @param {string} planSlug - Slug of plan to check
 * @returns {Object} { satisfied: boolean, missing: string[] }
 */
export function checkPlanDependencies(roadmap, planSlug) {
  if (!roadmap.cross_plan_dependencies || roadmap.cross_plan_dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const dependencies = roadmap.cross_plan_dependencies.filter(
    dep => dep.dependent_slug === planSlug
  );

  if (dependencies.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const missing = [];

  for (const dep of dependencies) {
    const dependsOnPlan = roadmap.phase_dev_plan_refs?.find(ref => ref.slug === dep.depends_on_slug);
    if (!dependsOnPlan || dependsOnPlan.status !== 'completed') {
      missing.push(dep.depends_on_slug);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}

/**
 * Migrate legacy roadmap format to new epic-hierarchy format
 *
 * Converts direct phase tracking to phase-dev-plan references.
 * This is a one-way migration for backwards compatibility.
 *
 * @param {Object} roadmap - Legacy roadmap object
 * @returns {Object} Migrated roadmap
 */
export function migrateLegacyRoadmap(roadmap) {
  // Check if already migrated
  if (roadmap.phase_dev_plan_refs && roadmap.phase_dev_plan_refs.length > 0) {
    return roadmap; // Already in new format
  }

  // Check if has legacy phases
  if (!roadmap.phases || roadmap.phases.length === 0) {
    return roadmap; // Nothing to migrate
  }

  console.log(`Migrating legacy roadmap: ${roadmap.title}`);

  // Initialize new fields
  roadmap.phase_dev_plan_refs = roadmap.phase_dev_plan_refs || [];
  roadmap.cross_plan_dependencies = roadmap.cross_plan_dependencies || [];

  // Convert each phase to a phase-dev-plan reference
  for (const phase of roadmap.phases) {
    const planSlug = generateSlug(phase.phase_title);
    const planRef = createPlanReference({
      slug: planSlug,
      title: phase.phase_title,
      status: phase.status,
      completion_percentage: phase.metadata?.completed_tasks && phase.metadata?.total_tasks
        ? Math.round((phase.metadata.completed_tasks / phase.metadata.total_tasks) * 100)
        : 0,
    });

    roadmap.phase_dev_plan_refs.push(planRef);

    // Convert phase dependencies to cross-plan dependencies
    if (phase.dependencies && phase.dependencies.length > 0) {
      for (const depPhaseId of phase.dependencies) {
        const depPhase = roadmap.phases.find(p => p.phase_id === depPhaseId);
        if (depPhase) {
          const depSlug = generateSlug(depPhase.phase_title);
          addCrossPlanDependency(roadmap, planSlug, depSlug, 'Migrated from phase dependency');
        }
      }
    }
  }

  // Update metadata
  roadmap.metadata.plan_count = roadmap.phase_dev_plan_refs.length;
  roadmap.metadata.overall_completion_percentage = calculateOverallCompletion(roadmap);

  // Keep legacy phases for reference, but mark as deprecated
  roadmap._legacy_phases_deprecated = true;

  return roadmap;
}

// ============================================================
// MULTI-PROJECT ROADMAP SCHEMA (Mode C)
// ============================================================

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

/**
 * Create a new multi-project roadmap structure
 * @param {Object} options - Roadmap options
 * @returns {Object} New multi-project roadmap object
 */
export function createMultiProjectRoadmap(options = {}) {
  const {
    title = 'Untitled Multi-Project Roadmap',
    description = '',
    source = 'multi-project',
  } = options;

  const now = new Date().toISOString();
  const roadmapId = options.roadmap_id || uuidv4();
  const slug = options.slug || generateSlug(title);

  return {
    roadmap_id: roadmapId,
    slug,
    title,
    description,
    created: now,
    updated: now,
    source,
    status: 'planning',
    decomposition_type: 'projects',
    projects: [],
    execution_config: {
      parallel_discovery: true,
      sequential_execution: true,
      ralph_loop_enabled: false,
      testing_strategy: 'per-project',
    },
    metadata: {
      total_projects: 0,
      completed_projects: 0,
      completion_percentage: 0,
      github_epic_number: null,
      github_epic_url: null,
      github_integrated: false,
      last_github_sync: null,
    },
  };
}

/**
 * Create a new project within a multi-project roadmap
 * @param {Object} options - Project options
 * @returns {Object} New project object
 */
export function createProject(options = {}) {
  const {
    project_title = 'Untitled Project',
    description = '',
    domain = 'general',
    complexity = 'M',
    project_number = 1,
  } = options;

  const projectId = options.project_id || `project-${project_number}`;
  const slug = options.slug || generateSlug(project_title);
  const now = new Date().toISOString();

  return {
    project_id: projectId,
    project_title,
    description,
    domain,
    complexity,
    slug,

    // GitHub integration (populated after issue creation)
    github_issue_number: null,
    github_issue_url: null,

    // Paths
    orchestrator_state_path: `.claude/orchestrator/projects/${projectId}/state.json`,
    exploration_path: `.claude/exploration/${slug}/`,

    // L2 Findings (populated during discovery)
    l2_findings: {
      code_snippets: [],
      reference_files: {
        modify: [],
        reference: [],
        tests: [],
      },
      agent_delegation: {
        primary_agent: null,
        task_assignments: [],
        execution_sequence: [],
      },
    },

    // Phases (populated during discovery/planning)
    phases: [],

    status: 'pending',
    metadata: {
      created: now,
      discovery_started: null,
      discovery_completed: null,
      execution_started: null,
      execution_completed: null,
    },
  };
}

/**
 * Validate a multi-project roadmap
 * @param {Object} roadmap - Roadmap to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateMultiProjectRoadmap(roadmap) {
  const errors = [];

  // Basic validation
  if (!roadmap.roadmap_id) {
    errors.push('Missing required field: roadmap_id');
  }
  if (!roadmap.title || roadmap.title.trim() === '') {
    errors.push('Missing required field: title');
  }
  if (roadmap.decomposition_type !== 'projects') {
    errors.push('decomposition_type must be "projects" for multi-project roadmaps');
  }

  // Validate projects
  if (roadmap.projects && Array.isArray(roadmap.projects)) {
    const projectIds = new Set();

    for (const project of roadmap.projects) {
      if (!project.project_id) {
        errors.push('Project missing required field: project_id');
      } else if (projectIds.has(project.project_id)) {
        errors.push(`Duplicate project_id: ${project.project_id}`);
      } else {
        projectIds.add(project.project_id);
      }

      if (!project.project_title || project.project_title.trim() === '') {
        errors.push(`Project ${project.project_id || '?'}: missing project_title`);
      }

      // Validate project phases
      if (project.phases && Array.isArray(project.phases)) {
        for (const phase of project.phases) {
          if (!phase.name) {
            errors.push(`Project ${project.project_id}: phase missing name`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate multi-project roadmap completion
 * @param {Object} roadmap - Multi-project roadmap
 * @returns {number} Completion percentage (0-100)
 */
export function calculateMultiProjectCompletion(roadmap) {
  if (!roadmap.projects || roadmap.projects.length === 0) {
    return 0;
  }

  const completedProjects = roadmap.projects.filter(p => p.status === 'completed').length;
  return Math.round((completedProjects / roadmap.projects.length) * 100);
}

/**
 * Get next available projects (no unmet dependencies)
 * @param {Object} roadmap - Multi-project roadmap
 * @returns {Array} Array of projects that can be started
 */
export function getNextAvailableProjects(roadmap) {
  if (!roadmap.projects || roadmap.projects.length === 0) {
    return [];
  }

  // For now, return all pending projects with status 'ready'
  // In future, we could add inter-project dependencies
  return roadmap.projects.filter(project => {
    return project.status === 'ready' ||
           (project.status === 'pending' && roadmap.execution_config?.parallel_discovery);
  });
}

/**
 * Update multi-project roadmap metadata
 * @param {Object} roadmap - Roadmap object (mutated)
 * @returns {Object} Updated roadmap
 */
export function updateMultiProjectRoadmapMetadata(roadmap) {
  if (!roadmap.projects) {
    roadmap.projects = [];
  }

  const completedProjects = roadmap.projects.filter(p => p.status === 'completed').length;
  const totalProjects = roadmap.projects.length;

  roadmap.metadata = roadmap.metadata || {};
  roadmap.metadata.total_projects = totalProjects;
  roadmap.metadata.completed_projects = completedProjects;
  roadmap.metadata.completion_percentage = totalProjects > 0
    ? Math.round((completedProjects / totalProjects) * 100)
    : 0;

  roadmap.updated = new Date().toISOString();

  // Update status based on projects
  if (totalProjects === 0) {
    roadmap.status = 'planning';
  } else if (completedProjects === totalProjects) {
    roadmap.status = 'completed';
  } else if (roadmap.projects.some(p => p.status === 'in_progress')) {
    roadmap.status = 'active';
  } else if (roadmap.projects.some(p => p.status === 'discovering')) {
    roadmap.status = 'discovering';
  }

  return roadmap;
}
