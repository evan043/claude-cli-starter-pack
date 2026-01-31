/**
 * Phase Advancer
 *
 * Logic for checking phase completion criteria
 * and advancing to the next phase.
 */

import fs from 'fs';
import path from 'path';

/**
 * Check if a phase's tasks are all complete
 */
export function areTasksComplete(phase) {
  if (!phase?.tasks || phase.tasks.length === 0) {
    return true; // No tasks means complete
  }

  return phase.tasks.every(task => task.status === 'completed');
}

/**
 * Check if a phase's dependencies are satisfied
 */
export function areDependenciesSatisfied(phase, allPhases) {
  const deps = phase.dependencies || [];

  if (deps.length === 0) {
    return true; // No dependencies
  }

  return deps.every(depId => {
    const depPhase = allPhases.find(p => p.phase_id === depId);
    return depPhase?.status === 'completed';
  });
}

/**
 * Check if a phase's success criteria are met
 */
export function areSuccessCriteriaMet(phase, validationResults = {}) {
  const criteria = phase.success_criteria || [];

  if (criteria.length === 0) {
    return true; // No criteria means met
  }

  // If validation results provided, check against them
  if (Object.keys(validationResults).length > 0) {
    return criteria.every((criterion, index) => {
      const key = `criterion_${index}`;
      return validationResults[key] === true;
    });
  }

  // Without validation results, assume met if tasks complete
  return areTasksComplete(phase);
}

/**
 * Get phase completion status
 */
export function getPhaseStatus(phase, allPhases, validationResults = {}) {
  const tasksComplete = areTasksComplete(phase);
  const depsSatisfied = areDependenciesSatisfied(phase, allPhases);
  const criteriaMet = areSuccessCriteriaMet(phase, validationResults);

  const totalTasks = phase.tasks?.length || 0;
  const completedTasks = phase.tasks?.filter(t => t.status === 'completed').length || 0;
  const failedTasks = phase.tasks?.filter(t => t.status === 'failed').length || 0;
  const blockedTasks = phase.tasks?.filter(t => t.status === 'blocked').length || 0;

  return {
    phaseId: phase.phase_id,
    phaseName: phase.name,
    isComplete: tasksComplete && depsSatisfied && criteriaMet,
    canStart: depsSatisfied && phase.status !== 'completed',
    tasksComplete,
    depsSatisfied,
    criteriaMet,
    progress: {
      total: totalTasks,
      completed: completedTasks,
      failed: failedTasks,
      blocked: blockedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    hasIssues: failedTasks > 0 || blockedTasks > 0,
  };
}

/**
 * Find the next phase to execute
 */
export function findNextPhase(phases, currentPhaseId) {
  // First, check if current phase is complete
  const currentPhase = phases.find(p => p.phase_id === currentPhaseId);
  const currentStatus = getPhaseStatus(currentPhase, phases);

  if (!currentStatus.isComplete) {
    return {
      nextPhase: null,
      reason: 'Current phase not complete',
      currentStatus,
    };
  }

  // Find phases that can start (deps satisfied, not complete)
  const availablePhases = phases.filter(p => {
    if (p.status === 'completed') return false;

    const status = getPhaseStatus(p, phases);
    return status.canStart && status.depsSatisfied;
  });

  if (availablePhases.length === 0) {
    // Check if all phases complete
    const allComplete = phases.every(p => p.status === 'completed');

    return {
      nextPhase: null,
      reason: allComplete ? 'All phases complete' : 'No phases ready (dependencies not met)',
      allComplete,
    };
  }

  // Sort by phase ID to maintain order
  availablePhases.sort((a, b) => {
    const aNum = parseInt(a.phase_id.replace(/\D/g, ''), 10);
    const bNum = parseInt(b.phase_id.replace(/\D/g, ''), 10);
    return aNum - bNum;
  });

  return {
    nextPhase: availablePhases[0],
    availablePhases,
    reason: 'Next phase ready',
  };
}

/**
 * Advance phase in PROGRESS.json
 */
export function advancePhase(progressPath, completedPhaseId, options = {}) {
  if (!fs.existsSync(progressPath)) {
    throw new Error(`PROGRESS.json not found: ${progressPath}`);
  }

  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  // Mark current phase complete
  const currentPhase = progress.phases?.find(p => p.phase_id === completedPhaseId);
  if (currentPhase) {
    currentPhase.status = 'completed';
    currentPhase.completedAt = new Date().toISOString();

    if (options.completedBy) {
      currentPhase.completedBy = options.completedBy;
    }
  }

  // Find next phase
  const nextInfo = findNextPhase(progress.phases, completedPhaseId);

  if (nextInfo.nextPhase) {
    nextInfo.nextPhase.status = 'in_progress';
    nextInfo.nextPhase.startedAt = new Date().toISOString();
  }

  // Update overall progress
  const completedPhases = progress.phases?.filter(p => p.status === 'completed').length || 0;
  const totalPhases = progress.phases?.length || 0;
  progress.completion_percentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  // Check plan completion
  if (nextInfo.allComplete) {
    progress.status = 'completed';
    progress.completedAt = new Date().toISOString();
  }

  progress.last_updated = new Date().toISOString();

  // Save
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  return {
    completedPhaseId,
    nextPhaseId: nextInfo.nextPhase?.phase_id || null,
    nextPhaseName: nextInfo.nextPhase?.name || null,
    overallProgress: progress.completion_percentage,
    planComplete: progress.status === 'completed',
    availablePhases: nextInfo.availablePhases?.map(p => p.phase_id),
  };
}

/**
 * Get plan summary
 */
export function getPlanSummary(progressPath) {
  if (!fs.existsSync(progressPath)) {
    return null;
  }

  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

  const phases = progress.phases || [];
  const phaseStatuses = phases.map(p => getPhaseStatus(p, phases));

  const totalTasks = phases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const completedTasks = phases.reduce(
    (acc, p) => acc + (p.tasks?.filter(t => t.status === 'completed').length || 0),
    0
  );

  return {
    planId: progress.plan_id,
    planName: progress.plan_name,
    status: progress.status,
    overallProgress: progress.completion_percentage || 0,
    phases: phaseStatuses,
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    currentPhase: phases.find(p => p.status === 'in_progress')?.phase_id,
    nextAvailable: findNextPhase(
      phases,
      phases.find(p => p.status === 'in_progress')?.phase_id
    ).nextPhase?.phase_id,
  };
}

/**
 * Validate phase can be marked complete
 */
export function validatePhaseCompletion(phase, allPhases) {
  const status = getPhaseStatus(phase, allPhases);
  const issues = [];

  if (!status.tasksComplete) {
    const incompleteTasks = phase.tasks?.filter(t => t.status !== 'completed') || [];
    issues.push({
      type: 'incomplete_tasks',
      message: `${incompleteTasks.length} task(s) not complete`,
      tasks: incompleteTasks.map(t => t.id),
    });
  }

  if (!status.depsSatisfied) {
    const unmetDeps = (phase.dependencies || []).filter(depId => {
      const dep = allPhases.find(p => p.phase_id === depId);
      return dep?.status !== 'completed';
    });
    issues.push({
      type: 'unmet_dependencies',
      message: `Dependencies not met: ${unmetDeps.join(', ')}`,
      dependencies: unmetDeps,
    });
  }

  if (status.hasIssues) {
    issues.push({
      type: 'has_issues',
      message: `Phase has ${status.progress.failed} failed and ${status.progress.blocked} blocked tasks`,
      failed: status.progress.failed,
      blocked: status.progress.blocked,
    });
  }

  return {
    canComplete: issues.length === 0,
    issues,
    status,
  };
}

export default {
  areTasksComplete,
  areDependenciesSatisfied,
  areSuccessCriteriaMet,
  getPhaseStatus,
  findNextPhase,
  advancePhase,
  getPlanSummary,
  validatePhaseCompletion,
};
