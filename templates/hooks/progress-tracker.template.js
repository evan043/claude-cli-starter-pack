/**
 * Progress Tracker Hook
 *
 * Monitors agent completions and automatically updates
 * PROGRESS.json with task status and phase advancement.
 *
 * Event: PostToolUse
 * Triggers: After Write operations that may contain completion signals
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  completionPatterns: {
    taskComplete: /TASK_COMPLETE:\s*(\S+)/,
    taskBlocked: /TASK_BLOCKED:\s*(\S+)/,
    taskFailed: /TASK_FAILED:\s*(\S+)/,
  },
};

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) return null;

  try {
    return {
      data: JSON.parse(fs.readFileSync(statePath, 'utf8')),
      path: statePath,
    };
  } catch {
    return null;
  }
}

/**
 * Load PROGRESS.json
 */
function loadProgress(progressPath) {
  if (!fs.existsSync(progressPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Parse completion signal from output
 */
function parseCompletionSignal(output) {
  if (!output) return null;

  for (const [type, pattern] of Object.entries(CONFIG.completionPatterns)) {
    const match = output.match(pattern);
    if (match) {
      return {
        type: type.replace('task', '').toLowerCase(),
        taskId: match[1],
      };
    }
  }

  return null;
}

/**
 * Update PROGRESS.json with task completion
 */
function updateProgress(progressPath, taskId, status, details = {}) {
  const progress = loadProgress(progressPath);
  if (!progress) return null;

  // Find and update the task
  let taskFound = false;
  let phaseId = null;

  for (const phase of progress.phases || []) {
    for (const task of phase.tasks || []) {
      if (task.id === taskId) {
        task.status = status;
        task.completedAt = details.completedAt || new Date().toISOString();
        if (details.completedBy) task.completedBy = details.completedBy;
        if (details.artifacts) task.artifacts = details.artifacts;
        if (details.summary) task.summary = details.summary;
        if (details.error) task.error = details.error;
        if (details.blocker) task.blocker = details.blocker;

        taskFound = true;
        phaseId = phase.phase_id;
        break;
      }
    }
    if (taskFound) break;
  }

  if (!taskFound) return null;

  // Update progress timestamp
  progress.last_updated = new Date().toISOString();

  // Save updated progress
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  return { progress, taskId, phaseId };
}

/**
 * Check if phase is complete
 */
function checkPhaseCompletion(progress, phaseId) {
  const phase = progress.phases?.find(p => p.phase_id === phaseId);
  if (!phase) return { complete: false };

  const totalTasks = phase.tasks?.length || 0;
  const completedTasks = phase.tasks?.filter(t => t.status === 'completed').length || 0;
  const failedTasks = phase.tasks?.filter(t => t.status === 'failed').length || 0;
  const blockedTasks = phase.tasks?.filter(t => t.status === 'blocked').length || 0;

  const complete = completedTasks === totalTasks;
  const hasIssues = failedTasks > 0 || blockedTasks > 0;

  return {
    phaseId,
    complete,
    hasIssues,
    totalTasks,
    completedTasks,
    failedTasks,
    blockedTasks,
    progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

/**
 * Advance to next phase
 */
function advancePhase(progressPath, completedPhaseId) {
  const progress = loadProgress(progressPath);
  if (!progress) return null;

  // Mark current phase complete
  const currentPhase = progress.phases?.find(p => p.phase_id === completedPhaseId);
  if (currentPhase) {
    currentPhase.status = 'completed';
    currentPhase.completedAt = new Date().toISOString();
  }

  // Find next phase
  const currentIndex = progress.phases?.findIndex(p => p.phase_id === completedPhaseId);
  const nextPhase = progress.phases?.[currentIndex + 1];

  if (nextPhase) {
    nextPhase.status = 'in_progress';

    // Check dependencies
    const deps = nextPhase.dependencies || [];
    const allDepsComplete = deps.every(depId => {
      const dep = progress.phases?.find(p => p.phase_id === depId);
      return dep?.status === 'completed';
    });

    if (!allDepsComplete) {
      nextPhase.status = 'pending';
    }
  }

  // Update overall progress
  const completedPhases = progress.phases?.filter(p => p.status === 'completed').length || 0;
  const totalPhases = progress.phases?.length || 0;
  progress.completion_percentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  // Check if all phases complete
  if (completedPhases === totalPhases) {
    progress.status = 'completed';
    progress.completedAt = new Date().toISOString();
  }

  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

  return {
    completedPhaseId,
    nextPhaseId: nextPhase?.phase_id || null,
    nextPhaseName: nextPhase?.name || null,
    overallProgress: progress.completion_percentage,
    planComplete: progress.status === 'completed',
  };
}

/**
 * Update orchestrator state with phase change
 */
function updateOrchestratorState(statePath, phaseId) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.currentPhase = phaseId;
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Main hook handler
 */
async function progressTrackerHook(context) {
  const { tool, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Check for completion signals in Task or Write output
  if (!['Task', 'Write', 'Edit'].includes(tool)) {
    return { continue: true };
  }

  // Parse completion signal
  const signal = parseCompletionSignal(toolOutput);
  if (!signal) {
    return { continue: true };
  }

  // Load orchestrator state to get PROGRESS.json path
  const stateInfo = loadState(projectRoot);
  if (!stateInfo || stateInfo.data.status !== 'active') {
    return { continue: true };
  }

  const progressPath = path.isAbsolute(stateInfo.data.planPath)
    ? stateInfo.data.planPath
    : path.join(projectRoot, stateInfo.data.planPath);

  // Update PROGRESS.json
  const updateResult = updateProgress(progressPath, signal.taskId, signal.type, {
    completedAt: new Date().toISOString(),
  });

  if (!updateResult) {
    return { continue: true };
  }

  // Check phase completion
  const phaseStatus = checkPhaseCompletion(updateResult.progress, updateResult.phaseId);

  let message = '';
  let metadata = {
    taskId: signal.taskId,
    status: signal.type,
    phaseId: updateResult.phaseId,
  };

  // Build response message
  if (signal.type === 'complete') {
    message = `PROGRESS.json updated: Task ${signal.taskId} marked complete.\n`;
    message += `Phase ${updateResult.phaseId} progress: ${phaseStatus.completedTasks}/${phaseStatus.totalTasks} tasks (${phaseStatus.progress}%)\n`;

    // Handle phase completion
    if (phaseStatus.complete) {
      const advancement = advancePhase(progressPath, updateResult.phaseId);

      if (advancement) {
        // Update orchestrator state
        if (advancement.nextPhaseId) {
          updateOrchestratorState(stateInfo.path, advancement.nextPhaseId);
        }

        message += `\nPhase ${updateResult.phaseId} COMPLETE!\n`;

        if (advancement.planComplete) {
          message += `\nALL PHASES COMPLETE! Plan finished at ${advancement.overallProgress}% completion.\n`;
        } else if (advancement.nextPhaseId) {
          message += `Advancing to: ${advancement.nextPhaseName} (${advancement.nextPhaseId})\n`;
          message += `Overall progress: ${advancement.overallProgress}%\n`;
        }

        metadata.phaseComplete = true;
        metadata.nextPhase = advancement.nextPhaseId;
        metadata.planComplete = advancement.planComplete;
      }
    }
  } else if (signal.type === 'blocked') {
    message = `PROGRESS.json updated: Task ${signal.taskId} marked BLOCKED.\n`;
    message += `Phase ${updateResult.phaseId} has blockers that need resolution.\n`;
  } else if (signal.type === 'failed') {
    message = `PROGRESS.json updated: Task ${signal.taskId} marked FAILED.\n`;
    message += `Consider: retry, escalate, or skip this task.\n`;
  }

  return {
    continue: true,
    message,
    metadata,
  };
}

module.exports = progressTrackerHook;

// Export for testing
module.exports.parseCompletionSignal = parseCompletionSignal;
module.exports.checkPhaseCompletion = checkPhaseCompletion;
module.exports.advancePhase = advancePhase;
module.exports.CONFIG = CONFIG;
