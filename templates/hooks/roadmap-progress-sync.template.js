/**
 * Roadmap Progress Sync Hook
 *
 * Monitors roadmap progress and syncs to GitHub:
 * - Triggers on ROADMAP.json changes
 * - Updates GitHub roadmap issue with phase-dev-plan completion
 * - Posts milestone comments (25%, 50%, 75%, 100%)
 * - Auto-closes roadmap issue when all phase-dev-plans complete
 * - Updates parent epic issue if exists
 *
 * Event: PostToolUse
 * Triggers: After Edit/Write on ROADMAP.json files
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
    console.error('[Roadmap Sync] Failed to add comment:', error.message);
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
    console.error('[Roadmap Sync] Failed to close issue:', error.message);
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
    console.error('[Roadmap Sync] Failed to edit issue:', error.message);
    return false;
  }
}

// Configuration
const CONFIG = {
  roadmapsDir: '.claude/roadmaps',
  stateFile: '.claude/hooks/cache/roadmap-progress-sync-state.json',
  githubEnabled: true,
  verboseLogging: false,
  milestoneThresholds: [25, 50, 75, 100],
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
      roadmaps: {},
      reportedMilestones: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastUpdate: null, roadmaps: {}, reportedMilestones: {} };
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
 * Find all roadmaps in project
 */
function discoverRoadmaps(projectRoot) {
  const roadmaps = [];
  const roadmapsDir = path.join(projectRoot, CONFIG.roadmapsDir);

  if (!fs.existsSync(roadmapsDir)) {
    return roadmaps;
  }

  const roadmapDirs = fs.readdirSync(roadmapsDir, { withFileTypes: true });

  for (const dirent of roadmapDirs) {
    if (dirent.isDirectory()) {
      const roadmapPath = path.join(roadmapsDir, dirent.name, 'ROADMAP.json');
      if (fs.existsSync(roadmapPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
          roadmaps.push({
            slug: dirent.name,
            path: roadmapPath,
            data: data,
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return roadmaps;
}

/**
 * Load phase-dev-plan PROGRESS.json
 */
function loadPlanProgress(projectRoot, planPath) {
  const fullPath = path.isAbsolute(planPath)
    ? planPath
    : path.join(projectRoot, planPath);

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
 * Generate phase-dev-plan checklist for roadmap issue
 */
function generatePlanChecklist(roadmap) {
  let checklist = '## Phase-Dev-Plan Progress\n\n';

  const planRefs = roadmap.phase_dev_plan_refs || [];
  if (planRefs.length === 0) {
    checklist += '_No phase-dev-plans defined_\n';
    return checklist;
  }

  for (const plan of planRefs) {
    const checkbox = plan.status === 'completed' ? '[x]' : '[ ]';
    const statusEmoji = plan.status === 'completed' ? '✅' :
                        plan.status === 'in_progress' ? '🔄' :
                        plan.status === 'failed' ? '❌' :
                        plan.status === 'blocked' ? '🚫' : '⏸️';

    checklist += `- ${checkbox} ${statusEmoji} **${plan.title}** (${plan.completion_percentage || 0}%)`;

    if (plan.github_issue_number) {
      checklist += ` [#${plan.github_issue_number}]`;
    }

    checklist += '\n';
  }

  const overallCompletion = roadmap.metadata?.overall_completion_percentage || 0;
  const progressBar = generateProgressBar(overallCompletion, 30);
  checklist += `\n**Overall Progress:**\n\`\`\`\n[${progressBar}] ${overallCompletion}%\n\`\`\`\n`;

  return checklist;
}

/**
 * Update GitHub roadmap issue with progress
 */
function updateGitHubRoadmapIssue(roadmap, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !roadmap.metadata?.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = roadmap.metadata.github_epic_number;
  const overallCompletion = roadmap.metadata?.overall_completion_percentage || 0;

  // Build roadmap issue body
  const checklist = generatePlanChecklist(roadmap);
  const body = `${roadmap.description}\n\n---\n\n${checklist}\n\n---\n_Roadmap tracked by CCASP Roadmap Orchestrator_`;

  // Update issue title with progress if enabled
  let title = roadmap.title;
  if (CONFIG.updateIssueTitle && overallCompletion > 0) {
    title = `[${overallCompletion}%] ${roadmap.title}`;
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
 * Post phase-dev-plan completion comment
 */
function postPlanCompletionComment(roadmap, plan, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !roadmap.metadata?.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = roadmap.metadata.github_epic_number;

  const planRefs = roadmap.phase_dev_plan_refs || [];
  const completedPlans = planRefs.filter(p => p.status === 'completed').length;
  const totalPlans = planRefs.length;
  const overallCompletion = roadmap.metadata?.overall_completion_percentage || 0;

  const comment = `## ✅ Phase-Dev-Plan Completed

**Plan:** ${plan.title}
**Status:** Completed
**Progress:** ${completedPlans}/${totalPlans} phase-dev-plans finished

${plan.github_issue_number ? `- **Issue:** #${plan.github_issue_number}` : ''}

**Roadmap Progress:** ${overallCompletion}%
\`\`\`
[${generateProgressBar(overallCompletion, 30)}]
\`\`\`

---
_Updated by CCASP Roadmap Progress Sync Hook_`;

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
function postMilestoneComment(roadmap, milestone, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !roadmap.metadata?.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = roadmap.metadata.github_epic_number;
  const overallCompletion = roadmap.metadata?.overall_completion_percentage || 0;

  const milestoneEmoji = milestone === 100 ? '🎉' :
                         milestone === 75 ? '🚀' :
                         milestone === 50 ? '⭐' : '📊';

  const comment = `## ${milestoneEmoji} Milestone Reached: ${milestone}%

**Roadmap:** ${roadmap.title}
**Current Progress:** ${overallCompletion}%

\`\`\`
[${generateProgressBar(overallCompletion, 30)}]
\`\`\`

${generatePlanChecklist(roadmap)}

---
_Updated by CCASP Roadmap Progress Sync Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Close roadmap issue when complete
 */
function closeRoadmapIssue(roadmap, githubConfig, projectRoot) {
  if (!CONFIG.githubEnabled || !roadmap.metadata?.github_epic_number) {
    return false;
  }

  if (!githubConfig) {
    githubConfig = getGitHubConfig(projectRoot);
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = roadmap.metadata.github_epic_number;

  const planRefs = roadmap.phase_dev_plan_refs || [];
  const completedPlans = planRefs.filter(p => p.status === 'completed').length;
  const totalPlans = planRefs.length;

  // Calculate total phases and tasks from child plans
  let totalPhases = 0;
  let totalTasks = 0;

  for (const planRef of planRefs) {
    if (planRef.path) {
      const progress = loadPlanProgress(projectRoot, planRef.path);
      if (progress?.phases) {
        totalPhases += progress.phases.length;
        progress.phases.forEach(phase => {
          totalTasks += phase.tasks?.length || 0;
        });
      }
    }
  }

  const comment = `## 🎉 Roadmap Completed!

**Roadmap:** ${roadmap.title}

### Summary
- **Phase-Dev-Plans:** ${completedPlans}/${totalPlans} completed
${totalPhases > 0 ? `- **Phases:** ${totalPhases} phases executed` : ''}
${totalTasks > 0 ? `- **Tasks:** ${totalTasks} tasks completed` : ''}

${generatePlanChecklist(roadmap)}

---
_Roadmap completed by CCASP Roadmap Orchestrator_
_Closed automatically by Roadmap Progress Sync Hook_`;

  return safeCloseIssue({
    owner,
    repo,
    issueNumber,
    comment,
  });
}

/**
 * Update parent epic issue with roadmap progress
 */
function updateParentEpic(roadmap, githubConfig, projectRoot) {
  if (!roadmap.parent_epic) {
    return false;
  }

  // Load parent epic
  const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
    ? roadmap.parent_epic.epic_path
    : path.join(projectRoot, roadmap.parent_epic.epic_path);

  if (!fs.existsSync(epicPath)) {
    return false;
  }

  try {
    const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
    if (!epic.github_epic_number) {
      return false;
    }

    if (!githubConfig) {
      githubConfig = getGitHubConfig(projectRoot);
    }

    if (!githubConfig) {
      return false;
    }

    const overallCompletion = roadmap.metadata?.overall_completion_percentage || 0;

    return safeAddIssueComment({
      owner: githubConfig.owner,
      repo: githubConfig.repo,
      issueNumber: epic.github_epic_number,
      body: `📊 **Roadmap Progress Update**\n\n**${roadmap.title}**: ${overallCompletion}%\n\n\`[${generateProgressBar(overallCompletion, 20)}]\``,
    });
  } catch {
    return false;
  }
}

/**
 * Check if milestone should be reported
 */
function shouldReportMilestone(roadmapSlug, percentage, state) {
  const reported = state.reportedMilestones[roadmapSlug] || [];

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
function markMilestoneReported(roadmapSlug, milestone, state) {
  if (!state.reportedMilestones[roadmapSlug]) {
    state.reportedMilestones[roadmapSlug] = [];
  }
  if (!state.reportedMilestones[roadmapSlug].includes(milestone)) {
    state.reportedMilestones[roadmapSlug].push(milestone);
  }
}

/**
 * Main hook handler
 */
async function roadmapProgressSyncHook(context) {
  const { tool, toolInput, hookType, projectRoot } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Track Edit/Write on ROADMAP.json files
  const isRoadmapUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('ROADMAP.json');

  if (!isRoadmapUpdate) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Discover all roadmaps
  const roadmaps = discoverRoadmaps(projectRoot);
  if (roadmaps.length === 0) {
    return { continue: true };
  }

  // Get GitHub config
  const githubConfig = getGitHubConfig(projectRoot);

  // Process each roadmap
  for (const roadmap of roadmaps) {
    const previousCompletion = state.roadmaps[roadmap.slug]?.completion_percentage || 0;
    const currentCompletion = roadmap.data.metadata?.overall_completion_percentage || 0;

    // Check for plan completions
    const previousPlans = state.roadmaps[roadmap.slug]?.plans || {};
    const planRefs = roadmap.data.phase_dev_plan_refs || [];

    for (const plan of planRefs) {
      const wasCompleted = previousPlans[plan.slug]?.status === 'completed';
      const isNowCompleted = plan.status === 'completed';

      if (!wasCompleted && isNowCompleted) {
        // Plan just completed - post comment
        postPlanCompletionComment(roadmap.data, plan, githubConfig, projectRoot);

        if (CONFIG.verboseLogging) {
          console.log(`[Roadmap Sync] Plan completed: ${roadmap.slug}/${plan.slug}`);
        }
      }
    }

    // Check for milestone
    const milestone = shouldReportMilestone(roadmap.slug, currentCompletion, state);
    if (milestone && milestone !== 100) {
      postMilestoneComment(roadmap.data, milestone, githubConfig, projectRoot);
      markMilestoneReported(roadmap.slug, milestone, state);

      if (CONFIG.verboseLogging) {
        console.log(`[Roadmap Sync] Milestone ${milestone}% reached for ${roadmap.slug}`);
      }
    }

    // Update GitHub issue
    if (currentCompletion !== previousCompletion) {
      updateGitHubRoadmapIssue(roadmap.data, githubConfig, projectRoot);

      // Update parent epic if exists
      updateParentEpic(roadmap.data, githubConfig, projectRoot);
    }

    // Check for roadmap completion
    if (roadmap.data.status === 'completed' && currentCompletion >= 100) {
      const wasCompleted = state.roadmaps[roadmap.slug]?.status === 'completed';

      if (!wasCompleted) {
        // Roadmap just completed - close issue
        closeRoadmapIssue(roadmap.data, githubConfig, projectRoot);

        if (CONFIG.verboseLogging) {
          console.log(`[Roadmap Sync] Roadmap completed: ${roadmap.slug}`);
        }
      }
    }

    // Update state
    state.roadmaps[roadmap.slug] = {
      status: roadmap.data.status,
      completion_percentage: roadmap.data.metadata?.overall_completion_percentage || 0,
      plans: planRefs.reduce((acc, p) => {
        acc[p.slug] = { status: p.status };
        return acc;
      }, {}),
    };
  }

  // Save state
  saveState(projectRoot, state);

  return { continue: true };
}

module.exports = roadmapProgressSyncHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.generateProgressBar = generateProgressBar;
module.exports.generatePlanChecklist = generatePlanChecklist;
