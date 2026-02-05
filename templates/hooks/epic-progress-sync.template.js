/**
 * Epic Progress Sync Hook
 *
 * Monitors epic progress and syncs to GitHub:
 * - Triggers on EPIC.json, child ROADMAP.json, or PROGRESS.json changes
 * - Updates GitHub epic issue with aggregate progress
 * - Posts milestone comments (roadmap complete, phase-dev-plan complete, 50%, 75%, 100%)
 * - Auto-closes epic when all roadmaps complete
 * - Tracks both roadmap-level AND phase-dev-plan-level completions
 *
 * Event: PostToolUse
 * Triggers: After Edit/Write on EPIC.json, ROADMAP.json, or PROGRESS.json files
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * Safely execute GitHub CLI commands using execFileSync (no shell injection)
 */
function safeGhExec(args, options = {}) {
  const defaultOptions = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  };
  return execFileSync('gh', args, defaultOptions);
}

/**
 * Safely add a comment to a GitHub issue
 */
function safeAddIssueComment({ owner, repo, issueNumber, body }) {
  try {
    safeGhExec([
      'issue', 'comment',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--body', body,
    ]);
    return true;
  } catch (error) {
    console.error('[Epic Sync] Failed to add comment:', error.message);
    return false;
  }
}

/**
 * Safely close a GitHub issue
 */
function safeCloseIssue({ owner, repo, issueNumber, comment }) {
  try {
    const args = [
      'issue', 'close',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
    ];
    if (comment) {
      args.push('--comment', comment);
    }
    safeGhExec(args);
    return true;
  } catch (error) {
    console.error('[Epic Sync] Failed to close issue:', error.message);
    return false;
  }
}

/**
 * Safely edit a GitHub issue
 */
function safeEditIssue({ owner, repo, issueNumber, title, body }) {
  try {
    const args = [
      'issue', 'edit',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
    ];
    if (title) {
      args.push('--title', title);
    }
    if (body) {
      args.push('--body', body);
    }
    safeGhExec(args);
    return true;
  } catch (error) {
    console.error('[Epic Sync] Failed to edit issue:', error.message);
    return false;
  }
}

// Configuration
const CONFIG = {
  epicsDir: '.claude/epics',
  stateFile: '.claude/hooks/cache/epic-progress-sync-state.json',
  githubEnabled: true,
  verboseLogging: false,
  // Milestone thresholds for progress comments
  milestoneThresholds: [25, 50, 75, 100],
  // Update GitHub issue title with progress
  updateIssueTitle: true,
};

/**
 * Load hook state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      lastUpdate: null,
      epics: {},
      reportedMilestones: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastUpdate: null, epics: {}, reportedMilestones: {} };
  }
}

/**
 * Save hook state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Find all epics in project
 */
function discoverEpics(projectRoot) {
  const epics = [];
  const epicsDir = path.join(projectRoot, CONFIG.epicsDir);

  if (!fs.existsSync(epicsDir)) {
    return epics;
  }

  const epicDirs = fs.readdirSync(epicsDir, { withFileTypes: true });

  for (const dirent of epicDirs) {
    if (dirent.isDirectory()) {
      const epicPath = path.join(epicsDir, dirent.name, 'EPIC.json');
      if (fs.existsSync(epicPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
          epics.push({
            slug: dirent.name,
            path: epicPath,
            data: data,
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return epics;
}

/**
 * Load roadmap data from path
 */
function loadRoadmap(projectRoot, roadmapPath) {
  const fullPath = path.isAbsolute(roadmapPath)
    ? roadmapPath
    : path.join(projectRoot, roadmapPath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load phase-dev-plan PROGRESS.json from path
 */
function loadPlanProgress(projectRoot, progressPath) {
  const fullPath = path.isAbsolute(progressPath)
    ? progressPath
    : path.join(projectRoot, progressPath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Get GitHub config from tech stack
 */
function getGitHubConfig(projectRoot) {
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) {
    return null;
  }

  try {
    const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
    const owner = techStack.versionControl?.owner;
    const repo = techStack.versionControl?.repo;

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

/**
 * Generate ASCII progress bar
 */
function generateProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Generate roadmap checklist for epic issue
 */
function generateRoadmapChecklist(epic) {
  let checklist = '## Roadmap Progress\n\n';

  for (const roadmap of epic.roadmaps) {
    const checkbox = roadmap.status === 'completed' ? '[x]' : '[ ]';
    const statusEmoji = roadmap.status === 'completed' ? '✅' :
                        roadmap.status === 'in_progress' ? '🔄' :
                        roadmap.status === 'failed' ? '❌' :
                        roadmap.status === 'blocked' ? '🚫' : '⏸️';

    checklist += `- ${checkbox} ${statusEmoji} **${roadmap.title}** (${roadmap.completion_percentage}%)`;

    if (roadmap.github_issue_number) {
      checklist += ` [#${roadmap.github_issue_number}]`;
    }

    checklist += '\n';
  }

  const progressBar = generateProgressBar(epic.completion_percentage, 30);
  checklist += `\n**Overall Progress:**\n\`\`\`\n[${progressBar}] ${epic.completion_percentage}%\n\`\`\`\n`;

  return checklist;
}

/**
 * Update GitHub epic issue with progress
 */
function updateGitHubEpicIssue(epic, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !epic.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = epic.github_epic_number;

  // Build epic issue body
  const checklist = generateRoadmapChecklist(epic);
  const body = `${epic.description}\n\n---\n\n${checklist}\n\n---\n_Epic tracked by CCASP Epic Orchestrator_`;

  // Update issue title with progress if enabled
  let title = epic.title;
  if (CONFIG.updateIssueTitle && epic.completion_percentage > 0) {
    title = `[${epic.completion_percentage}%] ${epic.title}`;
  }

  return safeEditIssue({
    owner,
    repo,
    issueNumber,
    title,
    body,
  });
}

/**
 * Post roadmap completion comment
 */
function postRoadmapCompletionComment(epic, roadmap, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !epic.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = epic.github_epic_number;

  const completedRoadmaps = epic.roadmaps.filter(r => r.status === 'completed').length;
  const totalRoadmaps = epic.roadmaps.length;

  const comment = `## 🎉 Roadmap Completed

**Roadmap:** ${roadmap.title}
**Status:** Completed
**Progress:** ${completedRoadmaps}/${totalRoadmaps} roadmaps finished

${roadmap.phase_count ? `- **Phases:** ${roadmap.completed_phases}/${roadmap.phase_count}` : ''}
${roadmap.github_issue_number ? `- **Issue:** #${roadmap.github_issue_number}` : ''}

**Epic Progress:** ${epic.completion_percentage}%
\`\`\`
[${generateProgressBar(epic.completion_percentage, 30)}]
\`\`\`

---
_Updated by CCASP Epic Progress Sync Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Post phase-dev-plan completion comment (from within a roadmap)
 */
function postPlanCompletionComment(epic, roadmap, plan, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !epic.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = epic.github_epic_number;

  const comment = `## 📋 Phase-Dev-Plan Completed

**Epic:** ${epic.title}
**Roadmap:** ${roadmap.title}
**Plan:** ${plan.title || plan.slug}

${plan.github_issue_number ? `- **Plan Issue:** #${plan.github_issue_number}` : ''}
${roadmap.github_issue_number ? `- **Roadmap Issue:** #${roadmap.github_issue_number}` : ''}

**Epic Progress:** ${epic.completion_percentage}%
\`\`\`
[${generateProgressBar(epic.completion_percentage, 30)}]
\`\`\`

---
_Updated by CCASP Epic Progress Sync Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Post milestone comment
 */
function postMilestoneComment(epic, milestone, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !epic.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = epic.github_epic_number;

  const milestoneEmoji = milestone === 100 ? '🎊' :
                         milestone === 75 ? '🚀' :
                         milestone === 50 ? '⭐' : '📊';

  const comment = `## ${milestoneEmoji} Milestone Reached: ${milestone}%

**Epic:** ${epic.title}
**Current Progress:** ${epic.completion_percentage}%

\`\`\`
[${generateProgressBar(epic.completion_percentage, 30)}]
\`\`\`

${generateRoadmapChecklist(epic)}

---
_Updated by CCASP Epic Progress Sync Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Close epic issue when complete
 */
function closeEpicIssue(epic, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !epic.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = epic.github_epic_number;

  const completedRoadmaps = epic.roadmaps.filter(r => r.status === 'completed').length;
  const totalRoadmaps = epic.roadmaps.length;

  // Calculate total phases and tasks from roadmaps
  let totalPhases = 0;
  let totalTasks = 0;

  for (const roadmap of epic.roadmaps) {
    if (roadmap.path) {
      const roadmapData = loadRoadmap(projectRoot, roadmap.path);
      if (roadmapData) {
        totalPhases += roadmapData.phases?.length || 0;
        roadmapData.phases?.forEach(phase => {
          totalTasks += phase.tasks?.length || 0;
        });
      }
    }
  }

  const comment = `## ✅ Epic Completed!

**Epic:** ${epic.title}

### Summary
- **Roadmaps:** ${completedRoadmaps}/${totalRoadmaps} completed
${totalPhases > 0 ? `- **Phases:** ${totalPhases} phases executed` : ''}
${totalTasks > 0 ? `- **Tasks:** ${totalTasks} tasks completed` : ''}
- **Duration:** ${calculateDuration(epic.created, epic.completed_at)}

### Business Objective
${epic.business_objective || 'N/A'}

${generateRoadmapChecklist(epic)}

---
_Epic completed by CCASP Epic Orchestrator_
_Closed automatically by Epic Progress Sync Hook_`;

  return safeCloseIssue({
    owner,
    repo,
    issueNumber,
    comment,
  });
}

/**
 * Calculate duration between two ISO timestamps
 */
function calculateDuration(start, end) {
  if (!start || !end) return 'Unknown';

  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate - startDate;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} min`;
}

/**
 * Check if milestone should be reported
 */
function shouldReportMilestone(epicSlug, percentage, state) {
  const reported = state.reportedMilestones[epicSlug] || [];

  for (const threshold of CONFIG.milestoneThresholds) {
    if (percentage >= threshold && !reported.includes(threshold)) {
      return threshold;
    }
  }

  return false;
}

/**
 * Mark milestone as reported
 */
function markMilestoneReported(epicSlug, milestone, state) {
  if (!state.reportedMilestones[epicSlug]) {
    state.reportedMilestones[epicSlug] = [];
  }
  if (!state.reportedMilestones[epicSlug].includes(milestone)) {
    state.reportedMilestones[epicSlug].push(milestone);
  }
}

/**
 * Main hook handler
 */
async function epicProgressSyncHook(context) {
  const { tool, toolInput, hookType, projectRoot } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Track Edit/Write on EPIC.json, ROADMAP.json, or PROGRESS.json files
  const isEpicUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('EPIC.json');

  const isRoadmapUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('roadmap') &&
    toolInput?.file_path?.endsWith('.json');

  const isPlanUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('PROGRESS.json');

  if (!isEpicUpdate && !isRoadmapUpdate && !isPlanUpdate) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Discover all epics
  const epics = discoverEpics(projectRoot);
  if (epics.length === 0) {
    return { continue: true };
  }

  // Get GitHub config
  const githubConfig = getGitHubConfig(projectRoot);

  // Process each epic
  for (const epic of epics) {
    const previousCompletion = state.epics[epic.slug]?.completion_percentage || 0;
    const currentCompletion = epic.data.completion_percentage || 0;

    // Check for roadmap completions
    const previousRoadmaps = state.epics[epic.slug]?.roadmaps || {};
    for (const roadmap of epic.data.roadmaps) {
      const wasCompleted = previousRoadmaps[roadmap.roadmap_id]?.status === 'completed';
      const isNowCompleted = roadmap.status === 'completed';

      if (!wasCompleted && isNowCompleted) {
        // Roadmap just completed - post comment
        postRoadmapCompletionComment(epic.data, roadmap, githubConfig, projectRoot);

        if (CONFIG.verboseLogging) {
          console.log(`[Epic Sync] Roadmap completed: ${epic.slug}/${roadmap.title}`);
        }
      }

      // Check for phase-dev-plan completions within this roadmap
      if (roadmap.path) {
        const roadmapData = loadRoadmap(projectRoot, roadmap.path);
        if (roadmapData?.phase_dev_plan_refs) {
          const previousPlans = previousRoadmaps[roadmap.roadmap_id]?.plans || {};

          for (const plan of roadmapData.phase_dev_plan_refs) {
            const wasPlanCompleted = previousPlans[plan.slug]?.status === 'completed';
            const isPlanNowCompleted = plan.status === 'completed';

            if (!wasPlanCompleted && isPlanNowCompleted) {
              // Phase-dev-plan just completed - post comment to epic
              postPlanCompletionComment(epic.data, roadmapData, plan, githubConfig, projectRoot);

              if (CONFIG.verboseLogging) {
                console.log(`[Epic Sync] Phase-dev-plan completed: ${epic.slug}/${roadmap.title}/${plan.slug}`);
              }
            }

            // Track plan state
            if (!previousRoadmaps[roadmap.roadmap_id]) {
              previousRoadmaps[roadmap.roadmap_id] = { plans: {} };
            }
            if (!previousRoadmaps[roadmap.roadmap_id].plans) {
              previousRoadmaps[roadmap.roadmap_id].plans = {};
            }
            previousRoadmaps[roadmap.roadmap_id].plans[plan.slug] = { status: plan.status };
          }
        }
      }
    }

    // Check for milestone
    const milestone = shouldReportMilestone(epic.slug, currentCompletion, state);
    if (milestone && milestone !== 100) {
      postMilestoneComment(epic.data, milestone, githubConfig, projectRoot);
      markMilestoneReported(epic.slug, milestone, state);

      if (CONFIG.verboseLogging) {
        console.log(`[Epic Sync] Milestone ${milestone}% reached for ${epic.slug}`);
      }
    }

    // Update GitHub issue
    if (currentCompletion !== previousCompletion) {
      updateGitHubEpicIssue(epic.data, githubConfig, projectRoot);
    }

    // Check for epic completion
    if (epic.data.status === 'completed' && epic.data.completion_percentage >= 100) {
      const wasCompleted = state.epics[epic.slug]?.status === 'completed';

      if (!wasCompleted) {
        // Epic just completed - close issue
        closeEpicIssue(epic.data, githubConfig, projectRoot);

        if (CONFIG.verboseLogging) {
          console.log(`[Epic Sync] Epic completed: ${epic.slug}`);
        }
      }
    }

    // Update state (preserve plans tracking from above)
    state.epics[epic.slug] = {
      status: epic.data.status,
      completion_percentage: epic.data.completion_percentage,
      roadmaps: previousRoadmaps,
    };
  }

  // Save state
  saveState(projectRoot, state);

  return { continue: true };
}

module.exports = epicProgressSyncHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.generateProgressBar = generateProgressBar;
module.exports.generateRoadmapChecklist = generateRoadmapChecklist;
