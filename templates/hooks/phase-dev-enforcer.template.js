/**
 * Phase Dev Enforcer Hook
 *
 * Enforces phased development patterns during implementation.
 * Ensures tasks are completed in phase order and success criteria are met.
 *
 * Event: PreToolUse
 * Priority: {{hooks.priorities.tools}}
 */

const fs = require('fs');
const path = require('path');

// Configuration from tech-stack.json
const CONFIG = {
  enabled: {{phasedDevelopment.enabled}},
  defaultScale: '{{phasedDevelopment.defaultScale}}',
  successTarget: {{phasedDevelopment.successTarget}},
};

/**
 * Find active phase dev project
 * Checks both new structure (.claude/phase-dev/) and legacy (.claude/docs/)
 */
function findActiveProject() {
  // NEW STRUCTURE: .claude/phase-dev/{slug}/PROGRESS.json
  const phaseDevDir = path.join(process.cwd(), '.claude/phase-dev');
  // LEGACY STRUCTURE: .claude/docs/{slug}/PROGRESS.json
  const docsDir = path.join(process.cwd(), '.claude/docs');

  // Check new structure first
  const dirsToCheck = [];
  if (fs.existsSync(phaseDevDir)) {
    dirsToCheck.push({ dir: phaseDevDir, structure: 'phase-dev' });
  }
  if (fs.existsSync(docsDir)) {
    dirsToCheck.push({ dir: docsDir, structure: 'legacy' });
  }

  if (dirsToCheck.length === 0) {
    return null;
  }

  for (const { dir, structure } of dirsToCheck) {
    // Look for PROGRESS.json files
    const subdirs = fs.readdirSync(dir);

    for (const subdir of subdirs) {
      const progressPath = path.join(dir, subdir, 'PROGRESS.json');
      if (fs.existsSync(progressPath)) {
        try {
          const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
          // Return first active (non-completed) project
          if (progress.status !== 'completed') {
            return { path: progressPath, data: progress, slug: subdir, structure };
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    }
  }

  return null;
}

/**
 * Get current phase
 */
function getCurrentPhase(project) {
  if (!project || !project.data || !project.data.phases) {
    return null;
  }

  // Find first non-completed phase
  return project.data.phases.find((p) => p.status !== 'completed');
}

/**
 * Check if task belongs to current phase
 */
function isTaskInCurrentPhase(taskId, currentPhase) {
  if (!currentPhase || !currentPhase.tasks) {
    return true; // Allow if no phase tracking
  }

  return currentPhase.tasks.some(
    (t) => t.id === taskId || t.description.includes(taskId)
  );
}

/**
 * Calculate phase completion percentage
 */
function getPhaseCompletion(phase) {
  if (!phase || !phase.tasks || phase.tasks.length === 0) {
    return 0;
  }

  const completed = phase.tasks.filter((t) => t.completed).length;
  return completed / phase.tasks.length;
}

/**
 * Main hook handler
 */
module.exports = async function phaseDevEnforcer(context) {
  // Skip if disabled
  if (!CONFIG.enabled) {
    return { continue: true };
  }

  const { tool, input } = context;

  // Only enforce on task-related operations
  if (!['TaskUpdate', 'Write', 'Edit'].includes(tool)) {
    return { continue: true };
  }

  // Find active phased development project
  const project = findActiveProject();

  if (!project) {
    // No active phase dev project, allow all
    return { continue: true };
  }

  const currentPhase = getCurrentPhase(project);

  if (!currentPhase) {
    // All phases completed
    return { continue: true };
  }

  // For TaskUpdate, check if completing tasks out of order
  if (tool === 'TaskUpdate' && input && input.status === 'completed') {
    const taskId = input.taskId || input.subject;

    // Check if this task is in the current phase
    if (!isTaskInCurrentPhase(taskId, currentPhase)) {
      return {
        continue: true, // Allow but warn
        message: `⚠️ Warning: Completing task "${taskId}" which may not be in the current phase (${currentPhase.name}).

Current phase: ${currentPhase.name}
Phase tasks: ${currentPhase.tasks.map((t) => t.id).join(', ')}

Consider completing phase tasks in order for best results.`,
      };
    }
  }

  // For Write/Edit, check if modifying files not in current phase scope
  if ((tool === 'Write' || tool === 'Edit') && currentPhase.scope) {
    const filePath = input.file_path || input.path;

    if (filePath) {
      const isInScope = currentPhase.scope.some((pattern) => {
        if (pattern.includes('*')) {
          // Simple glob matching
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(filePath);
        }
        return filePath.includes(pattern);
      });

      if (!isInScope) {
        return {
          continue: true, // Allow but warn
          message: `ℹ️ Note: Modifying "${filePath}" which is outside current phase scope.

Current phase: ${currentPhase.name}
Phase scope: ${currentPhase.scope.join(', ')}

This may be intentional for cross-cutting concerns.`,
        };
      }
    }
  }

  // Check if phase is ready for completion
  const phaseCompletion = getPhaseCompletion(currentPhase);
  if (phaseCompletion >= CONFIG.successTarget) {
    return {
      continue: true,
      message: `✅ Phase "${currentPhase.name}" is ${Math.round(phaseCompletion * 100)}% complete!

Consider:
1. Running phase validation tests
2. Creating a checkpoint
3. Moving to the next phase

Use /phase-track to see full progress.`,
    };
  }

  return { continue: true };
};
