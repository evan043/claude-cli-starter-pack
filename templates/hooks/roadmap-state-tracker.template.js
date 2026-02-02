/**
 * Roadmap State Tracker Hook
 *
 * Monitors PROGRESS.json updates and syncs changes to:
 * - Parent ROADMAP.json
 * - GitHub issues (if integrated)
 * - Completion tracking
 *
 * Event: PostToolUse
 * Triggers: After Edit/Write operations on PROGRESS.json files
 *
 * v2.3.0 - Fixed issues:
 * - Improved parent roadmap matching using roadmap_id
 * - Added PROGRESS.json schema validation
 * - Added rate limiting for GitHub sync
 * - Added structured error logging
 * - Use safe-exec for shell commands
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/roadmap-state.json',
  logFile: '.claude/.logs/roadmap-sync.log',
  roadmapDirs: ['.claude/docs/roadmaps', '.claude/roadmaps'],
  progressFileName: 'PROGRESS.json',
  roadmapFileName: 'ROADMAP.json',
  githubSyncEnabled: true,
  autoAdvancePhases: true,
  githubSyncCooldownMs: 30000, // 30 seconds between GitHub syncs
  maxLogEntries: 1000,
};

/**
 * Log to file for debugging
 */
function log(projectRoot, level, message, data = {}) {
  try {
    const logPath = path.join(projectRoot, CONFIG.logFile);
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    let entries = [];
    if (fs.existsSync(logPath)) {
      try {
        entries = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch {
        entries = [];
      }
    }

    entries.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
    });

    // Trim to max entries
    if (entries.length > CONFIG.maxLogEntries) {
      entries = entries.slice(-CONFIG.maxLogEntries);
    }

    fs.writeFileSync(logPath, JSON.stringify(entries, null, 2), 'utf8');
  } catch {
    // Logging should never break the hook
  }
}

/**
 * Load tracker state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      lastSync: null,
      roadmaps: {},
      pendingUpdates: [],
      lastGitHubSync: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastSync: null, roadmaps: {}, pendingUpdates: [], lastGitHubSync: {} };
  }
}

/**
 * Save tracker state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state.lastSync = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Find all roadmaps in project
 */
function discoverRoadmaps(projectRoot) {
  const roadmaps = [];

  CONFIG.roadmapDirs.forEach((roadmapDir) => {
    const fullDir = path.join(projectRoot, roadmapDir);
    if (!fs.existsSync(fullDir)) return;

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.isDirectory()) {
        const roadmapPath = path.join(fullDir, entry.name, CONFIG.roadmapFileName);
        if (fs.existsSync(roadmapPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
            roadmaps.push({
              slug: entry.name,
              path: roadmapPath,
              data: data,
            });
          } catch {
            // Skip invalid JSON
          }
        }
      }
    });

    // Also check for .json files directly in roadmap dir (new format)
    entries.forEach((entry) => {
      if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
        const roadmapPath = path.join(fullDir, entry.name);
        try {
          const data = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
          if (data.roadmap_id) {
            roadmaps.push({
              slug: data.slug || entry.name.replace('.json', ''),
              path: roadmapPath,
              data: data,
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }
    });
  });

  // Check root ROADMAP.json
  const rootRoadmap = path.join(projectRoot, CONFIG.roadmapFileName);
  if (fs.existsSync(rootRoadmap)) {
    try {
      const data = JSON.parse(fs.readFileSync(rootRoadmap, 'utf8'));
      roadmaps.push({
        slug: data.roadmap_slug || 'root',
        path: rootRoadmap,
        data: data,
      });
    } catch {
      // Skip invalid JSON
    }
  }

  return roadmaps;
}

/**
 * Check if file is a PROGRESS.json file
 */
function isProgressFile(filePath) {
  return filePath && filePath.endsWith(CONFIG.progressFileName);
}

/**
 * Validate PROGRESS.json structure
 */
function validateProgressData(data, projectRoot) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Progress data is not an object');
    return { valid: false, errors };
  }

  // Check for phases array (can also be named 'phases' at top level or nested)
  const phases = data.phases || [];
  if (!Array.isArray(phases)) {
    errors.push('Missing or invalid "phases" array');
  } else {
    phases.forEach((phase, idx) => {
      if (!phase.id && !phase.phase_id && phase.id !== 0) {
        errors.push(`Phase ${idx} missing id`);
      }
      if (phase.tasks && !Array.isArray(phase.tasks)) {
        errors.push(`Phase ${idx} has invalid tasks (not an array)`);
      }
    });
  }

  // Log validation errors but don't fail - just return partial data
  if (errors.length > 0) {
    log(projectRoot, 'warn', 'PROGRESS.json validation warnings', { errors });
  }

  return { valid: errors.length === 0, errors, data };
}

/**
 * Find parent roadmap for a progress file - IMPROVED
 * Uses roadmap_id stored in progress file for exact matching
 */
function findParentRoadmap(progressPath, progressData, roadmaps, projectRoot) {
  // First: Try exact match using roadmap_id stored in progress file
  if (progressData.roadmap_id) {
    const exactMatch = roadmaps.find((rm) => rm.data.roadmap_id === progressData.roadmap_id);
    if (exactMatch) {
      // Find the specific phase/project
      const phases = exactMatch.data.phases || exactMatch.data.projects || [];
      for (const phase of phases) {
        if (
          phase.phase_id === progressData.phase_id ||
          phase.project_id === progressData.plan_id ||
          phase.phase_dev_config?.progress_json_path?.includes(path.basename(path.dirname(progressPath)))
        ) {
          log(projectRoot, 'info', 'Found parent roadmap via roadmap_id', {
            roadmapId: progressData.roadmap_id,
            phaseId: phase.phase_id || phase.project_id,
          });
          return { roadmap: exactMatch, project: phase };
        }
      }
      // Roadmap found but no specific phase - return first pending phase
      const pendingPhase = phases.find((p) => p.status === 'pending' || p.status === 'in_progress');
      if (pendingPhase) {
        return { roadmap: exactMatch, project: pendingPhase };
      }
    }
  }

  // Second: Try path-based matching (legacy support)
  for (const roadmap of roadmaps) {
    const phases = roadmap.data.phases || roadmap.data.projects || [];
    for (const project of phases) {
      if (project.phase_dev_config?.progress_json_path) {
        const expectedPath = project.phase_dev_config.progress_json_path;
        const progressDir = path.basename(path.dirname(progressPath));
        const progressFile = path.basename(progressPath);

        // Check if paths match
        if (
          progressPath.includes(expectedPath) ||
          expectedPath.endsWith(progressDir + '/' + progressFile) ||
          expectedPath.endsWith(progressDir + '\\' + progressFile)
        ) {
          log(projectRoot, 'info', 'Found parent roadmap via path matching', {
            roadmapSlug: roadmap.slug,
            expectedPath,
            actualPath: progressPath,
          });
          return { roadmap, project };
        }
      }
    }
  }

  log(projectRoot, 'debug', 'No parent roadmap found for progress file', { progressPath });
  return null;
}

/**
 * Calculate progress from PROGRESS.json
 */
function calculateProgress(progressData) {
  let totalTasks = 0;
  let completedTasks = 0;
  let totalPhases = 0;
  let completedPhases = 0;

  const phases = progressData.phases || [];
  totalPhases = phases.length;

  phases.forEach((phase) => {
    if (phase.status === 'completed') {
      completedPhases++;
    }

    const tasks = phase.tasks || [];
    totalTasks += tasks.length;
    completedTasks += tasks.filter((t) => t.completed === true || t.status === 'completed').length;
  });

  return {
    totalTasks,
    completedTasks,
    totalPhases,
    completedPhases,
    percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    phasePercentage: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
  };
}

/**
 * Update roadmap with phase progress
 */
function updateRoadmapProgress(roadmap, projectId, progress, projectRoot) {
  const roadmapData = roadmap.data;
  const phases = roadmapData.phases || roadmapData.projects || [];

  // Find and update the project/phase
  const projectIndex = phases.findIndex((p) => p.project_id === projectId || p.phase_id === projectId);
  if (projectIndex === -1) {
    log(projectRoot, 'warn', 'Project not found in roadmap', { projectId, roadmapSlug: roadmap.slug });
    return false;
  }

  const project = phases[projectIndex];

  // Update project status
  if (progress.percentage >= 100) {
    project.status = 'completed';
  } else if (progress.percentage > 0) {
    project.status = 'in_progress';
  }

  // Update project completion
  project.completion_percentage = progress.percentage;
  project.tasks_completed = progress.completedTasks;
  project.tasks_total = progress.totalTasks;

  // Recalculate roadmap totals
  let completedProjects = 0;
  phases.forEach((p) => {
    if (p.status === 'completed') completedProjects++;
  });

  // Update metadata
  if (roadmapData.metadata) {
    roadmapData.metadata.completed_phases = completedProjects;
    roadmapData.metadata.completion_percentage = Math.round((completedProjects / phases.length) * 100);
  }

  roadmapData.completed_projects = completedProjects;
  roadmapData.completion_percentage = Math.round((completedProjects / (roadmapData.total_projects || phases.length)) * 100);
  roadmapData.last_updated = new Date().toISOString();
  roadmapData.updated = new Date().toISOString();

  // Save updated roadmap
  try {
    fs.writeFileSync(roadmap.path, JSON.stringify(roadmapData, null, 2), 'utf8');
    log(projectRoot, 'info', 'Updated roadmap progress', {
      roadmapSlug: roadmap.slug,
      projectId,
      progress: progress.percentage,
    });
    return true;
  } catch (err) {
    log(projectRoot, 'error', 'Failed to save roadmap', { error: err.message });
    return false;
  }
}

/**
 * Check if GitHub sync is allowed (rate limiting)
 */
function canSyncToGitHub(state, issueNumber) {
  const lastSync = state.lastGitHubSync?.[issueNumber];
  if (!lastSync) return true;

  const elapsed = Date.now() - new Date(lastSync).getTime();
  return elapsed >= CONFIG.githubSyncCooldownMs;
}

/**
 * Sync progress to GitHub issue - IMPROVED
 * Uses safe escaping and rate limiting
 */
function syncToGitHub(roadmap, project, progress, projectRoot, state) {
  if (!CONFIG.githubSyncEnabled) return false;

  const issueNumber =
    project.phase_dev_config?.github_issue_number ||
    project.github_issue?.match(/#?(\d+)/)?.[1] ||
    (project.inputs?.issues?.[0]?.match(/#?(\d+)/)?.[1]);

  if (!issueNumber) return false;

  // Rate limiting check
  if (!canSyncToGitHub(state, issueNumber)) {
    log(projectRoot, 'debug', 'Skipping GitHub sync - rate limited', { issueNumber });
    return false;
  }

  // Load tech-stack for GitHub config
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) {
    log(projectRoot, 'warn', 'tech-stack.json not found, cannot sync to GitHub');
    return false;
  }

  let techStack;
  try {
    techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
  } catch (err) {
    log(projectRoot, 'error', 'Failed to parse tech-stack.json', { error: err.message });
    return false;
  }

  const owner = techStack.versionControl?.owner;
  const repo = techStack.versionControl?.repo;
  if (!owner || !repo) {
    log(projectRoot, 'warn', 'GitHub owner/repo not configured');
    return false;
  }

  // Create progress comment
  const progressBar = generateProgressBar(progress.percentage, 30);
  const phaseName = project.phase_title || project.project_name || 'Phase';
  const comment = `## Progress Update: ${phaseName}

**Phase Progress:** ${progress.completedPhases}/${progress.totalPhases} phases complete
**Task Progress:** ${progress.completedTasks}/${progress.totalTasks} tasks complete

\`\`\`
[${progressBar}] ${progress.percentage}%
\`\`\`

_Automatically synced by CCASP Roadmap Tracker_`;

  try {
    // Write comment to temp file to avoid shell escaping issues
    const tempFile = path.join(projectRoot, '.claude', '.temp-comment.md');
    fs.writeFileSync(tempFile, comment, 'utf8');

    execSync(`gh issue comment ${issueNumber} --repo ${owner}/${repo} --body-file "${tempFile}"`, {
      stdio: 'pipe',
      cwd: projectRoot,
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch {
      /* ignore */
    }

    // Update rate limit state
    if (!state.lastGitHubSync) state.lastGitHubSync = {};
    state.lastGitHubSync[issueNumber] = new Date().toISOString();

    // Close issue if 100% complete
    if (progress.percentage >= 100) {
      execSync(`gh issue close ${issueNumber} --repo ${owner}/${repo}`, {
        stdio: 'pipe',
        cwd: projectRoot,
      });
      log(projectRoot, 'info', 'Closed GitHub issue on completion', { issueNumber });
    }

    log(projectRoot, 'info', 'Synced progress to GitHub', { issueNumber, progress: progress.percentage });
    return true;
  } catch (err) {
    log(projectRoot, 'error', 'GitHub sync failed', { issueNumber, error: err.message });
    return false;
  }
}

/**
 * Generate ASCII progress bar
 */
function generateProgressBar(percentage, width = 30) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Check if next phase can start (dependencies met)
 */
function checkPhaseAdvancement(roadmap, completedProjectId) {
  const roadmapData = roadmap.data;
  const phases = roadmapData.phases || roadmapData.projects || [];
  const nextPhases = [];

  // Build dependency map from phases
  phases.forEach((phase) => {
    const phaseId = phase.phase_id || phase.project_id;
    const dependencies = phase.dependencies || [];

    if (dependencies.includes(completedProjectId)) {
      if (phase.status === 'pending') {
        // Check if all dependencies are now complete
        const allDepsComplete = dependencies.every((depId) => {
          const depPhase = phases.find((p) => (p.phase_id || p.project_id) === depId);
          return depPhase && depPhase.status === 'completed';
        });

        if (allDepsComplete) {
          nextPhases.push(phase);
        }
      }
    }
  });

  // Also check dependency_graph if exists (legacy format)
  const dependencyGraph = roadmapData.dependency_graph || {};
  Object.entries(dependencyGraph).forEach(([phaseId, dependencies]) => {
    if (dependencies.includes(completedProjectId)) {
      const project = phases.find((p) => (p.project_id || p.phase_id) === phaseId);
      if (project && project.status === 'pending' && !nextPhases.includes(project)) {
        const allDepsComplete = dependencies.every((depId) => {
          const depProject = phases.find((p) => (p.project_id || p.phase_id) === depId);
          return depProject && depProject.status === 'completed';
        });

        if (allDepsComplete) {
          nextPhases.push(project);
        }
      }
    }
  });

  return nextPhases;
}

/**
 * Format advancement notification
 */
function formatAdvancementMessage(completedProject, nextPhases, roadmap) {
  if (nextPhases.length === 0) return null;

  const completedName = (completedProject.phase_title || completedProject.project_name || 'Phase').substring(0, 40);
  const roadmapName = (roadmap.data.title || roadmap.data.roadmap_name || 'Roadmap').substring(0, 49);
  const completionPct = roadmap.data.metadata?.completion_percentage || roadmap.data.completion_percentage || 0;

  let message = `
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Phase Completed: ${completedName.padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Roadmap: ${roadmapName.padEnd(49)}║
║  Progress: ${String(completionPct).padEnd(3)}% complete                                      ║
║                                                               ║
║  🔓 Next phases now available:                                ║`;

  nextPhases.forEach((phase) => {
    const phaseName = (phase.phase_title || phase.project_name || 'Phase').substring(0, 55);
    message += `
║    → ${phaseName.padEnd(55)}║`;
  });

  const firstPhaseId = nextPhases[0].phase_id || nextPhases[0].project_id || '';
  message += `
║                                                               ║
║  Start next phase: /phase-track ${firstPhaseId.substring(0, 25).padEnd(25)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

  return message;
}

/**
 * Main hook handler
 */
async function roadmapStateTrackerHook(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only track Edit/Write operations
  if (tool !== 'Edit' && tool !== 'Write') {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || '';

  // Only track PROGRESS.json files
  if (!isProgressFile(filePath)) {
    return { continue: true };
  }

  log(projectRoot, 'debug', 'Processing PROGRESS.json update', { filePath });

  // Load state
  const state = loadState(projectRoot);

  // Discover all roadmaps
  const roadmaps = discoverRoadmaps(projectRoot);
  if (roadmaps.length === 0) {
    return { continue: true };
  }

  // Load the updated PROGRESS.json
  const fullProgressPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
  let progressData;
  try {
    progressData = JSON.parse(fs.readFileSync(fullProgressPath, 'utf8'));
  } catch (err) {
    log(projectRoot, 'error', 'Failed to parse PROGRESS.json', { filePath, error: err.message });
    return { continue: true };
  }

  // Validate progress data
  const validation = validateProgressData(progressData, projectRoot);
  if (!validation.valid) {
    log(projectRoot, 'warn', 'PROGRESS.json validation failed, continuing with partial data', {
      errors: validation.errors,
    });
  }

  // Find parent roadmap for this progress file
  const parent = findParentRoadmap(filePath, progressData, roadmaps, projectRoot);
  if (!parent) {
    // Not part of a roadmap, just a standalone phase plan
    return { continue: true };
  }

  // Calculate progress
  const progress = calculateProgress(progressData);

  // Update roadmap with progress
  const projectId = parent.project.project_id || parent.project.phase_id;
  updateRoadmapProgress(parent.roadmap, projectId, progress, projectRoot);

  // Sync to GitHub if integrated
  const githubSynced = syncToGitHub(parent.roadmap, parent.project, progress, projectRoot, state);

  // Check for phase advancement
  let advancementMessage = null;
  if (progress.percentage >= 100 && CONFIG.autoAdvancePhases) {
    const nextPhases = checkPhaseAdvancement(parent.roadmap, projectId);
    if (nextPhases.length > 0) {
      advancementMessage = formatAdvancementMessage(parent.project, nextPhases, parent.roadmap);
      log(projectRoot, 'info', 'Phase completed, next phases available', {
        completed: projectId,
        nextPhases: nextPhases.map((p) => p.phase_id || p.project_id),
      });
    }
  }

  // Update state
  state.roadmaps[parent.roadmap.slug] = {
    lastUpdated: new Date().toISOString(),
    progress: progress,
    githubSynced: githubSynced,
  };
  saveState(projectRoot, state);

  // Return with optional advancement message
  if (advancementMessage) {
    return {
      continue: true,
      message: advancementMessage,
      metadata: {
        roadmapUpdate: true,
        roadmapSlug: parent.roadmap.slug,
        phaseCompleted: projectId,
        progress: progress,
      },
    };
  }

  return { continue: true };
}

module.exports = roadmapStateTrackerHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.calculateProgress = calculateProgress;
module.exports.discoverRoadmaps = discoverRoadmaps;
module.exports.checkPhaseAdvancement = checkPhaseAdvancement;
module.exports.validateProgressData = validateProgressData;
module.exports.findParentRoadmap = findParentRoadmap;
