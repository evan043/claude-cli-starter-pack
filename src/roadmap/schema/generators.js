/**
 * Roadmap Generators
 *
 * Functions for creating roadmap structures, phases, and projects.
 */

import { v4 as uuidv4 } from 'uuid';
import { ROADMAP_SOURCE } from './constants.js';

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
