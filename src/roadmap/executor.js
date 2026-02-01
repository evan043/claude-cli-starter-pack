/**
 * Roadmap Executor
 *
 * Orchestrates roadmap execution with dependency checking,
 * agent spawning, progress tracking, and deliverable validation.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadRoadmap, saveRoadmap, updatePhase } from './roadmap-manager.js';
import { loadPhasePlan, updatePhasePlan, getRoadmapProgress } from './phase-generator.js';
import { getNextAvailablePhases, calculateCompletion } from './schema.js';
import { syncToGitHub } from './github-integration.js';

/**
 * Execution state file path
 */
const EXECUTION_STATE_FILE = 'EXECUTION_STATE.json';

/**
 * Get execution state path for a roadmap
 */
function getExecutionStatePath(roadmapSlug, cwd = process.cwd()) {
  return join(cwd, '.claude', 'phase-plans', roadmapSlug, EXECUTION_STATE_FILE);
}

/**
 * Initialize or load execution state for a roadmap
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Execution state
 */
export function loadExecutionState(roadmapSlug, cwd = process.cwd()) {
  const statePath = getExecutionStatePath(roadmapSlug, cwd);

  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, 'utf8'));
    } catch (e) {
      // Fall through to create new state
    }
  }

  // Create new execution state
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return null;
  }

  const state = {
    roadmap_id: roadmap.roadmap_id,
    roadmap_slug: roadmapSlug,
    mode: 'paused',
    current_phase: null,
    queue: roadmap.phases.map(p => p.phase_id),
    completed_this_session: [],
    completed_all_time: [],
    metrics: {
      phases_completed_total: 0,
      phases_remaining: roadmap.phases.length,
      consecutive_failures: 0,
      total_tasks_completed: 0,
    },
    safety: {
      max_parallel_agents: 2,
      max_context_percent: 80,
      compact_at_context_percent: 70,
      max_consecutive_failures: 3,
    },
    active_agents: [],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  saveExecutionState(state, cwd);

  return state;
}

/**
 * Save execution state
 */
function saveExecutionState(state, cwd = process.cwd()) {
  const statePath = getExecutionStatePath(state.roadmap_slug, cwd);
  const dir = join(cwd, '.claude', 'phase-plans', state.roadmap_slug);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.last_updated = new Date().toISOString();
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

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
 * Get execution status for a roadmap
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Execution status
 */
export function getExecutionStatus(roadmapSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return null;
  }

  const state = loadExecutionState(roadmapSlug, cwd);
  const progress = getRoadmapProgress(roadmapSlug, cwd);
  const nextPhases = getNextAvailablePhases(roadmap);

  return {
    roadmap: {
      id: roadmap.roadmap_id,
      title: roadmap.title,
      slug: roadmap.slug,
      status: roadmap.status,
    },
    execution: state ? {
      mode: state.mode,
      current_phase: state.current_phase,
      queue: state.queue,
      completed: state.completed_all_time,
      metrics: state.metrics,
    } : null,
    progress: progress ? {
      phases: progress.phases,
      totalTasks: progress.totalTasks,
      completedTasks: progress.completedTasks,
      percentage: progress.overallPercentage,
    } : null,
    nextAvailable: nextPhases.map(p => ({
      phase_id: p.phase_id,
      title: p.phase_title,
    })),
  };
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

/**
 * Sync roadmap execution status to GitHub
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Sync result
 */
export async function syncExecution(roadmapSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapSlug}`,
    };
  }

  if (!roadmap.metadata?.github_integrated) {
    return {
      success: false,
      error: 'Roadmap not integrated with GitHub',
    };
  }

  return await syncToGitHub(roadmap);
}

/**
 * Generate execution report
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {string} Markdown report
 */
export function generateExecutionReport(roadmapSlug, cwd = process.cwd()) {
  const status = getExecutionStatus(roadmapSlug, cwd);

  if (!status) {
    return `# Execution Report\n\nRoadmap not found: ${roadmapSlug}`;
  }

  let report = `# Execution Report: ${status.roadmap.title}\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += `## Status\n\n`;
  report += `- **Roadmap Status:** ${status.roadmap.status}\n`;

  if (status.execution) {
    report += `- **Execution Mode:** ${status.execution.mode}\n`;
    report += `- **Current Phase:** ${status.execution.current_phase || 'None'}\n`;
    report += `- **Phases Completed:** ${status.execution.metrics.phases_completed_total}\n`;
    report += `- **Phases Remaining:** ${status.execution.metrics.phases_remaining}\n`;
  }

  report += `\n## Progress\n\n`;

  if (status.progress) {
    report += `**Overall:** ${status.progress.percentage}% (${status.progress.completedTasks}/${status.progress.totalTasks} tasks)\n\n`;

    report += `| Phase | Status | Progress |\n`;
    report += `|-------|--------|----------|\n`;

    for (const phase of status.progress.phases) {
      const statusIcon = phase.status === 'completed' ? '✅' :
                         phase.status === 'in_progress' ? '🔄' :
                         phase.status === 'blocked' ? '🚫' : '⬜';
      report += `| ${statusIcon} ${phase.title} | ${phase.status} | ${phase.percentage}% |\n`;
    }
  }

  if (status.nextAvailable.length > 0) {
    report += `\n## Next Available\n\n`;
    for (const phase of status.nextAvailable) {
      report += `- ${phase.phase_id}: ${phase.title}\n`;
    }
  }

  report += `\n---\n*Generated by CCASP Roadmap Executor*\n`;

  return report;
}
