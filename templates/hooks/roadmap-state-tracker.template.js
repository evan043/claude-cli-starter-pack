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
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/roadmap-state.json',
  roadmapDirs: ['.claude/docs/roadmaps', '.claude/roadmaps'],
  progressFileName: 'PROGRESS.json',
  roadmapFileName: 'ROADMAP.json',
  githubSyncEnabled: true,
  autoAdvancePhases: true,
};

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
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastSync: null, roadmaps: {}, pendingUpdates: [] };
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
 * Find parent roadmap for a progress file
 */
function findParentRoadmap(progressPath, roadmaps) {
  for (const roadmap of roadmaps) {
    if (roadmap.data.projects) {
      for (const project of roadmap.data.projects) {
        if (project.phase_dev_config?.progress_json_path) {
          const expectedPath = project.phase_dev_config.progress_json_path;
          if (progressPath.includes(expectedPath) || expectedPath.includes(path.basename(path.dirname(progressPath)))) {
            return {
              roadmap,
              project,
            };
          }
        }
      }
    }
  }
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

  if (progressData.phases) {
    totalPhases = progressData.phases.length;

    progressData.phases.forEach((phase) => {
      if (phase.status === 'completed') {
        completedPhases++;
      }

      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter((t) => t.status === 'completed').length;
      }
    });
  }

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

  // Find and update the project
  const projectIndex = roadmapData.projects.findIndex((p) => p.project_id === projectId);
  if (projectIndex === -1) return false;

  const project = roadmapData.projects[projectIndex];

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
  roadmapData.projects.forEach((p) => {
    if (p.status === 'completed') completedProjects++;
  });

  roadmapData.completed_projects = completedProjects;
  roadmapData.completion_percentage = Math.round((completedProjects / roadmapData.total_projects) * 100);
  roadmapData.last_updated = new Date().toISOString();

  // Save updated roadmap
  fs.writeFileSync(roadmap.path, JSON.stringify(roadmapData, null, 2), 'utf8');

  return true;
}

/**
 * Sync progress to GitHub issue
 */
function syncToGitHub(roadmap, project, progress, projectRoot) {
  if (!CONFIG.githubSyncEnabled) return false;

  const issueNumber = project.phase_dev_config?.github_issue_number;
  if (!issueNumber) return false;

  // Load tech-stack for GitHub config
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) return false;

  let techStack;
  try {
    techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
  } catch {
    return false;
  }

  const owner = techStack.versionControl?.owner;
  const repo = techStack.versionControl?.repo;
  if (!owner || !repo) return false;

  // Create progress comment
  const progressBar = generateProgressBar(progress.percentage, 30);
  const comment = `## Progress Update

**Phase Progress:** ${progress.completedPhases}/${progress.totalPhases} phases complete
**Task Progress:** ${progress.completedTasks}/${progress.totalTasks} tasks complete

\`\`\`
[${progressBar}] ${progress.percentage}%
\`\`\`

_Automatically synced by CCASP Roadmap Tracker_`;

  try {
    execSync(`gh issue comment ${issueNumber} --repo ${owner}/${repo} --body "${comment.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
      stdio: 'pipe',
    });

    // Close issue if 100% complete
    if (progress.percentage >= 100) {
      execSync(`gh issue close ${issueNumber} --repo ${owner}/${repo}`, {
        stdio: 'pipe',
      });
    }

    return true;
  } catch {
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
  const dependencyGraph = roadmapData.dependency_graph || {};
  const nextPhases = [];

  // Find phases that depend on the completed phase
  Object.entries(dependencyGraph).forEach(([phaseId, dependencies]) => {
    if (dependencies.includes(completedProjectId)) {
      // Check if all dependencies are now complete
      const project = roadmapData.projects.find((p) => p.project_id === phaseId);
      if (project && project.status === 'pending') {
        const allDepsComplete = dependencies.every((depId) => {
          const depProject = roadmapData.projects.find((p) => p.project_id === depId);
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

  let message = `
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Phase Completed: ${completedProject.project_name.substring(0, 40).padEnd(40)}║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Roadmap: ${roadmap.data.roadmap_name.substring(0, 49).padEnd(49)}║
║  Progress: ${roadmap.data.completion_percentage}% complete                                      ║
║                                                               ║
║  🔓 Next phases now available:                                ║`;

  nextPhases.forEach((phase) => {
    message += `
║    → ${phase.project_name.substring(0, 55).padEnd(55)}║`;
  });

  message += `
║                                                               ║
║  Start next phase: /phase-track ${nextPhases[0].project_id.substring(0, 25).padEnd(25)}║
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

  // Load state
  const state = loadState(projectRoot);

  // Discover all roadmaps
  const roadmaps = discoverRoadmaps(projectRoot);
  if (roadmaps.length === 0) {
    return { continue: true };
  }

  // Find parent roadmap for this progress file
  const parent = findParentRoadmap(filePath, roadmaps);
  if (!parent) {
    // Not part of a roadmap, just a standalone phase plan
    return { continue: true };
  }

  // Load the updated PROGRESS.json
  const fullProgressPath = path.join(projectRoot, filePath);
  let progressData;
  try {
    progressData = JSON.parse(fs.readFileSync(fullProgressPath, 'utf8'));
  } catch {
    return { continue: true };
  }

  // Calculate progress
  const progress = calculateProgress(progressData);

  // Update roadmap with progress
  updateRoadmapProgress(parent.roadmap, parent.project.project_id, progress, projectRoot);

  // Sync to GitHub if integrated
  const githubSynced = syncToGitHub(parent.roadmap, parent.project, progress, projectRoot);

  // Check for phase advancement
  let advancementMessage = null;
  if (progress.percentage >= 100 && CONFIG.autoAdvancePhases) {
    const nextPhases = checkPhaseAdvancement(parent.roadmap, parent.project.project_id);
    if (nextPhases.length > 0) {
      advancementMessage = formatAdvancementMessage(parent.project, nextPhases, parent.roadmap);
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
        phaseCompleted: parent.project.project_id,
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
