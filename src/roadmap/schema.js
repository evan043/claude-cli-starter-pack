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
 */
export const ROADMAP_SCHEMA = {
  roadmap_id: 'string (uuid)',
  title: 'string',
  description: 'string',
  created: 'ISO8601',
  updated: 'ISO8601',
  source: 'manual | github-issues | github-project',
  status: 'planning | active | paused | completed',
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
    phases: [],
    metadata: {
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
