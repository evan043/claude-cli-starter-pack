/**
 * Roadmap Executor - Phase Lifecycle
 *
 * Handles phase dependency checking, starting, completion, blocking, and auto-advancement.
 */

import { existsSync } from 'fs';
import { loadRoadmap, updatePhase } from '../roadmap-manager.js';
import { loadPhasePlan, updatePhasePlan } from '../phase-generator.js';
import { getNextAvailablePhases } from '../schema.js';
import { loadExecutionState, saveExecutionState } from './state.js';

/**
 * Check if a phase's dependencies are satisfied
 *
 * @param {Object} phase - Phase to check
 * @param {Object} roadmap - Parent roadmap
 * @returns {Object} { satisfied: boolean, missing: string[] }
 */
export function checkDependencies(phase, roadmap) {
  const dependencies = phase.dependencies || [];
  const missing = [];

  for (const depId of dependencies) {
    const depPhase = roadmap.phases.find(p => p.phase_id === depId);

    if (!depPhase) {
      missing.push(`${depId} (not found)`);
    } else if (depPhase.status !== 'completed') {
      missing.push(`${depId} (${depPhase.status})`);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}

/**
 * Start execution of a roadmap phase
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID to start
 * @param {Object} options - Execution options
 * @param {string} cwd - Current working directory
 * @returns {Object} Execution result
 */
export function startPhase(roadmapSlug, phaseId, options = {}, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapSlug}`,
    };
  }

  const phase = roadmap.phases.find(p => p.phase_id === phaseId);

  if (!phase) {
    return {
      success: false,
      error: `Phase not found: ${phaseId}`,
    };
  }

  // Check dependencies
  const depCheck = checkDependencies(phase, roadmap);

  if (!depCheck.satisfied && !options.force) {
    return {
      success: false,
      error: `Dependencies not satisfied: ${depCheck.missing.join(', ')}`,
      blockedBy: depCheck.missing,
    };
  }

  // Update phase status
  updatePhase(roadmapSlug, phaseId, { status: 'in_progress' }, cwd);

  // Update plan if exists
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);
  if (plan) {
    updatePhasePlan(roadmapSlug, phaseId, {
      started_at: new Date().toISOString(),
    }, cwd);
  }

  // Update execution state
  const state = loadExecutionState(roadmapSlug, cwd);
  if (state) {
    state.mode = 'running';
    state.current_phase = phaseId;
    saveExecutionState(state, cwd);
  }

  return {
    success: true,
    phase,
    plan,
    message: `Phase ${phaseId} started`,
  };
}

/**
 * Complete a roadmap phase
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID to complete
 * @param {Object} options - Completion options
 * @param {string} cwd - Current working directory
 * @returns {Object} Completion result
 */
export function completePhase(roadmapSlug, phaseId, options = {}, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapSlug}`,
    };
  }

  const phase = roadmap.phases.find(p => p.phase_id === phaseId);

  if (!phase) {
    return {
      success: false,
      error: `Phase not found: ${phaseId}`,
    };
  }

  // Validate deliverables if requested
  if (options.validateDeliverables) {
    const validation = validateDeliverables(phase, options);
    if (!validation.valid) {
      return {
        success: false,
        error: `Deliverables not met: ${validation.missing.join(', ')}`,
        validation,
      };
    }
  }

  // Update phase status
  updatePhase(roadmapSlug, phaseId, {
    status: 'completed',
    'metadata.completed_at': new Date().toISOString(),
  }, cwd);

  // Update plan if exists
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);
  if (plan) {
    updatePhasePlan(roadmapSlug, phaseId, {
      completed_at: new Date().toISOString(),
    }, cwd);
  }

  // Update execution state
  const state = loadExecutionState(roadmapSlug, cwd);
  if (state) {
    state.completed_this_session.push(phaseId);
    if (!state.completed_all_time.includes(phaseId)) {
      state.completed_all_time.push(phaseId);
    }
    state.metrics.phases_completed_total++;
    state.metrics.phases_remaining = Math.max(0, state.metrics.phases_remaining - 1);
    state.metrics.consecutive_failures = 0;
    state.current_phase = null;

    // Remove from queue
    state.queue = state.queue.filter(id => id !== phaseId);

    // Check if all done
    if (state.queue.length === 0) {
      state.mode = 'completed';
    } else {
      state.mode = 'paused';
    }

    saveExecutionState(state, cwd);
  }

  // Find next available phases
  const updatedRoadmap = loadRoadmap(roadmapSlug, cwd);
  const nextPhases = getNextAvailablePhases(updatedRoadmap);

  return {
    success: true,
    phase,
    nextPhases: nextPhases.map(p => p.phase_id),
    roadmapComplete: state?.mode === 'completed',
  };
}

/**
 * Validate phase deliverables
 */
function validateDeliverables(phase, options = {}) {
  const outputs = phase.outputs || [];
  const validated = [];
  const missing = [];

  for (const output of outputs) {
    // Check if output file exists
    if (output.includes('.') && !output.startsWith('Implement')) {
      if (existsSync(output)) {
        validated.push(output);
      } else {
        missing.push(output);
      }
    } else {
      // Assume non-file outputs are validated (would need user confirmation)
      validated.push(output);
    }
  }

  return {
    valid: missing.length === 0,
    validated,
    missing,
  };
}

/**
 * Block a phase (mark as blocked)
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID to block
 * @param {string} reason - Block reason
 * @param {string} cwd - Current working directory
 * @returns {Object} Result
 */
export function blockPhase(roadmapSlug, phaseId, reason, cwd = process.cwd()) {
  const result = updatePhase(roadmapSlug, phaseId, {
    status: 'blocked',
    'metadata.blocked_reason': reason,
    'metadata.blocked_at': new Date().toISOString(),
  }, cwd);

  // Update execution state
  const state = loadExecutionState(roadmapSlug, cwd);
  if (state) {
    state.mode = 'blocked';
    state.metrics.consecutive_failures++;
    saveExecutionState(state, cwd);
  }

  return result;
}

/**
 * Auto-advance to next phase if possible
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {Object} options - Advance options
 * @param {string} cwd - Current working directory
 * @returns {Object} Advance result
 */
export function autoAdvance(roadmapSlug, options = {}, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapSlug}`,
    };
  }

  const nextPhases = getNextAvailablePhases(roadmap);

  if (nextPhases.length === 0) {
    // Check if all complete
    const allComplete = roadmap.phases.every(p => p.status === 'completed');

    return {
      success: false,
      reason: allComplete ? 'all_phases_complete' : 'no_available_phases',
      message: allComplete
        ? 'All phases completed!'
        : 'No phases available. Check blocked phases or dependencies.',
    };
  }

  // Start first available phase
  const nextPhase = nextPhases[0];
  return startPhase(roadmapSlug, nextPhase.phase_id, options, cwd);
}
