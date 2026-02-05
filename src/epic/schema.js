/**
 * Epic JSON Schema
 *
 * Defines the structure and validation for EPIC.json files.
 * An epic contains multiple roadmaps, which contain multiple phases.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new epic with default values
 * @param {Object} config - Epic configuration
 * @returns {Object} Epic data structure
 */
export function createEpic(config) {
  const now = new Date().toISOString();

  return {
    epic_id: config.epic_id || `epic-${uuidv4()}`,
    slug: config.slug || generateSlug(config.title),
    title: config.title,
    description: config.description || '',
    business_objective: config.business_objective || '',

    // Roadmap structure (initially placeholders)
    roadmaps: config.roadmaps || [],
    roadmap_count: config.roadmap_count || 0,
    current_roadmap_index: 0,

    // Status and progress
    status: 'not_started', // not_started, in_progress, completed, failed
    completion_percentage: 0,

    // GitHub integration
    github_epic_number: config.github_epic_number || null,
    github_epic_url: config.github_epic_url || null,

    // Gating rules
    gating: {
      require_tests: config.gating?.require_tests ?? true,
      require_docs: config.gating?.require_docs ?? false,
      require_phase_approval: config.gating?.require_phase_approval ?? false,
      allow_manual_override: config.gating?.allow_manual_override ?? true,
    },

    // Testing requirements
    testing_requirements: {
      unit_tests: config.testing_requirements?.unit_tests ?? true,
      integration_tests: config.testing_requirements?.integration_tests ?? false,
      e2e_tests: config.testing_requirements?.e2e_tests ?? false,
      min_coverage: config.testing_requirements?.min_coverage ?? 0,
    },

    // Token budget allocation
    token_budget: {
      total: config.token_budget?.total || 500000,
      used: 0,
      per_roadmap: config.token_budget?.per_roadmap || 100000,
      compaction_threshold: config.token_budget?.compaction_threshold || 0.8,
    },

    // Metadata
    metadata: {
      created: now,
      updated: now,
      created_by: config.metadata?.created_by || 'epic-orchestrator',
      tags: config.metadata?.tags || [],
      priority: config.metadata?.priority || 'medium',
      estimated_duration: config.metadata?.estimated_duration || null,
    },

    // Timestamps
    created: now,
    updated: now,
    started_at: null,
    completed_at: null,
  };
}

/**
 * Create a roadmap placeholder
 * @param {Object} config - Roadmap configuration
 * @returns {Object} Roadmap placeholder
 */
export function createRoadmapPlaceholder(config) {
  return {
    roadmap_id: config.roadmap_id || `rm-${uuidv4()}`,
    roadmap_index: config.roadmap_index,
    title: config.title,
    description: config.description || '',
    status: 'not_started', // not_started, in_progress, completed, failed, blocked
    completion_percentage: 0,
    path: config.path || null, // Path to ROADMAP.json file
    github_issue_number: config.github_issue_number || null,

    // Dependencies
    depends_on: config.depends_on || [], // Array of roadmap_ids
    blocks: config.blocks || [], // Array of roadmap_ids this roadmap blocks

    // Progress tracking
    phase_count: config.phase_count || 0,
    completed_phases: 0,

    // Metadata
    created: new Date().toISOString(),
    started_at: null,
    completed_at: null,
  };
}

/**
 * Generate a URL-friendly slug from a title
 * @param {string} title - The title to slugify
 * @returns {string} URL-friendly slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate epic structure
 * @param {Object} epic - Epic data to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
export function validateEpic(epic) {
  const errors = [];

  // Required fields
  if (!epic.epic_id) errors.push('Missing epic_id');
  if (!epic.title) errors.push('Missing title');
  if (!epic.slug) errors.push('Missing slug');

  // Roadmaps validation
  if (!Array.isArray(epic.roadmaps)) {
    errors.push('roadmaps must be an array');
  } else {
    epic.roadmaps.forEach((roadmap, index) => {
      if (!roadmap.roadmap_id) {
        errors.push(`Roadmap ${index}: Missing roadmap_id`);
      }
      if (!roadmap.title) {
        errors.push(`Roadmap ${index}: Missing title`);
      }
      if (roadmap.roadmap_index !== index) {
        errors.push(`Roadmap ${index}: roadmap_index mismatch (expected ${index}, got ${roadmap.roadmap_index})`);
      }
    });
  }

  // Roadmap count consistency
  if (epic.roadmap_count !== epic.roadmaps.length) {
    errors.push(`roadmap_count mismatch (${epic.roadmap_count} vs ${epic.roadmaps.length})`);
  }

  // Status validation
  const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];
  if (!validStatuses.includes(epic.status)) {
    errors.push(`Invalid status: ${epic.status}`);
  }

  // Completion percentage range
  if (epic.completion_percentage < 0 || epic.completion_percentage > 100) {
    errors.push('completion_percentage must be between 0 and 100');
  }

  // Token budget validation
  if (epic.token_budget.used > epic.token_budget.total) {
    errors.push('Token budget exceeded');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate epic completion percentage based on roadmaps
 * @param {Object} epic - Epic data
 * @returns {number} Completion percentage (0-100)
 */
export function calculateEpicCompletion(epic) {
  if (!epic.roadmaps || epic.roadmaps.length === 0) {
    return 0;
  }

  const totalCompletion = epic.roadmaps.reduce(
    (sum, roadmap) => sum + (roadmap.completion_percentage || 0),
    0
  );

  return Math.round(totalCompletion / epic.roadmaps.length);
}

/**
 * Check if gating requirements are met for next roadmap
 * @param {Object} epic - Epic data
 * @param {number} roadmapIndex - Index of roadmap to check
 * @returns {Object} {canProceed: boolean, blockers: string[]}
 */
export function checkGatingRequirements(epic, roadmapIndex) {
  const blockers = [];

  if (roadmapIndex >= epic.roadmaps.length) {
    return { canProceed: false, blockers: ['Invalid roadmap index'] };
  }

  const roadmap = epic.roadmaps[roadmapIndex];

  // Check dependencies
  if (roadmap.depends_on && roadmap.depends_on.length > 0) {
    const dependencyRoadmaps = epic.roadmaps.filter(r =>
      roadmap.depends_on.includes(r.roadmap_id)
    );

    const incompleteDeps = dependencyRoadmaps.filter(r =>
      r.status !== 'completed'
    );

    if (incompleteDeps.length > 0) {
      blockers.push(
        `Dependencies not complete: ${incompleteDeps.map(r => r.title).join(', ')}`
      );
    }
  }

  // Check if previous roadmap is complete (sequential gating)
  if (roadmapIndex > 0) {
    const previousRoadmap = epic.roadmaps[roadmapIndex - 1];
    if (previousRoadmap.status !== 'completed') {
      blockers.push(`Previous roadmap not complete: ${previousRoadmap.title}`);
    }
  }

  // Allow manual override if enabled
  if (blockers.length > 0 && epic.gating.allow_manual_override) {
    return {
      canProceed: false,
      canOverride: true,
      blockers,
    };
  }

  return {
    canProceed: blockers.length === 0,
    canOverride: false,
    blockers,
  };
}

/**
 * Get next roadmap to execute
 * @param {Object} epic - Epic data
 * @returns {Object|null} Next roadmap or null if none available
 */
export function getNextRoadmap(epic) {
  // Find first non-completed roadmap
  const nextRoadmap = epic.roadmaps.find(r =>
    r.status !== 'completed' && r.status !== 'failed'
  );

  if (!nextRoadmap) {
    return null;
  }

  // Check if it's ready to start
  const gatingCheck = checkGatingRequirements(
    epic,
    nextRoadmap.roadmap_index
  );

  if (!gatingCheck.canProceed) {
    return {
      roadmap: nextRoadmap,
      blocked: true,
      blockers: gatingCheck.blockers,
      canOverride: gatingCheck.canOverride,
    };
  }

  return {
    roadmap: nextRoadmap,
    blocked: false,
    blockers: [],
  };
}

export default {
  createEpic,
  createRoadmapPlaceholder,
  validateEpic,
  calculateEpicCompletion,
  checkGatingRequirements,
  getNextRoadmap,
};
