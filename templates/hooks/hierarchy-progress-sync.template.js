/**
 * Hierarchy Progress Sync Hook
 *
 * Unified hook that syncs progress to GitHub at ALL levels of the hierarchy:
 * - Epic → Roadmap → Phase-Dev-Plan → Phase → Task
 *
 * Triggers on changes to:
 * - EPIC.json
 * - ROADMAP.json
 * - PROGRESS.json (phase-dev)
 * - TodoWrite (task completions)
 *
 * Event: PostToolUse
 * Triggers: After Edit/Write on hierarchy state files and TodoWrite
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Configuration
const CONFIG = {
  epicsDirNew: '.claude/epics',
  roadmapsDir: '.claude/roadmaps',
  phasePlansDir: '.claude/phase-plans',
  stateFile: '.claude/hooks/cache/hierarchy-progress-state.json',
  githubEnabled: true,
  verboseLogging: false,
  milestoneThresholds: [25, 50, 75, 100],
  updateIssueTitles: true,
};

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
    if (CONFIG.verboseLogging) {
      console.error('[Hierarchy Sync] Failed to add comment:', error.message);
    }
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
    if (CONFIG.verboseLogging) {
      console.error('[Hierarchy Sync] Failed to close issue:', error.message);
    }
    return false;
  }
}

/**
 * Safely edit a GitHub issue title
 */
function safeEditIssueTitle({ owner, repo, issueNumber, title }) {
  try {
    safeGhExec([
      'issue', 'edit',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--title', title,
    ]);
    return true;
  } catch (error) {
    if (CONFIG.verboseLogging) {
      console.error('[Hierarchy Sync] Failed to edit issue title:', error.message);
    }
    return false;
  }
}

/**
 * Load hook state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      lastUpdate: null,
      epics: {},
      roadmaps: {},
      plans: {},
      reportedMilestones: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastUpdate: null, epics: {}, roadmaps: {}, plans: {}, reportedMilestones: {} };
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
 * Check if milestone should be reported
 */
function shouldReportMilestone(key, percentage, state) {
  const reported = state.reportedMilestones[key] || [];

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
function markMilestoneReported(key, milestone, state) {
  if (!state.reportedMilestones[key]) {
    state.reportedMilestones[key] = [];
  }
  if (!state.reportedMilestones[key].includes(milestone)) {
    state.reportedMilestones[key].push(milestone);
  }
}

/**
 * Generate hierarchy breadcrumb
 */
function generateBreadcrumb(context) {
  const parts = [];

  if (context.epic) {
    parts.push(`Epic: ${context.epic.title}`);
  }
  if (context.roadmap) {
    parts.push(`Roadmap: ${context.roadmap.title}`);
  }
  if (context.plan) {
    parts.push(`Plan: ${context.plan.name}`);
  }
  if (context.phase) {
    parts.push(`Phase: ${context.phase.name}`);
  }

  return parts.join(' > ');
}

/**
 * Update issue title with progress prefix
 */
function updateIssueTitleWithProgress(issueNumber, originalTitle, percentage, githubConfig) {
  if (!CONFIG.updateIssueTitles || !issueNumber || !githubConfig) {
    return false;
  }

  // Remove existing progress prefix if present
  const cleanTitle = originalTitle.replace(/^\[\d+%\]\s*/, '');
  const newTitle = `[${percentage}%] ${cleanTitle}`;

  return safeEditIssueTitle({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    issueNumber,
    title: newTitle,
  });
}

/**
 * Detect what type of hierarchy file was changed
 */
function detectChangeType(filePath) {
  if (filePath.includes('EPIC.json')) {
    return 'epic';
  }
  if (filePath.includes('ROADMAP.json')) {
    return 'roadmap';
  }
  if (filePath.includes('PROGRESS.json')) {
    return 'phase-dev';
  }
  return null;
}

/**
 * Load PROGRESS.json and extract hierarchy context
 */
function loadProgressWithContext(progressPath, projectRoot) {
  if (!fs.existsSync(progressPath)) {
    return null;
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    const context = {
      plan: {
        slug: progress.plan_id || progress.project?.slug,
        name: progress.project?.name,
        github_issue: progress.github_issue,
      },
      roadmap: null,
      epic: null,
    };

    // Check for parent context
    if (progress.parent_context) {
      if (progress.parent_context.type === 'roadmap') {
        const roadmapPath = path.isAbsolute(progress.parent_context.path)
          ? progress.parent_context.path
          : path.join(projectRoot, progress.parent_context.path);

        if (fs.existsSync(roadmapPath)) {
          const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
          context.roadmap = {
            slug: roadmap.slug,
            title: roadmap.title,
            github_issue: roadmap.metadata?.github_epic_number,
          };

          // Check for parent epic
          if (roadmap.parent_epic) {
            const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
              ? roadmap.parent_epic.epic_path
              : path.join(projectRoot, roadmap.parent_epic.epic_path);

            if (fs.existsSync(epicPath)) {
              const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
              context.epic = {
                slug: epic.slug,
                title: epic.title,
                github_issue: epic.github_epic_number,
              };
            }
          }
        }
      } else if (progress.parent_context.type === 'epic') {
        const epicPath = path.isAbsolute(progress.parent_context.path)
          ? progress.parent_context.path
          : path.join(projectRoot, progress.parent_context.path);

        if (fs.existsSync(epicPath)) {
          const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
          context.epic = {
            slug: epic.slug,
            title: epic.title,
            github_issue: epic.github_epic_number,
          };
        }
      }
    }

    return { progress, context };
  } catch {
    return null;
  }
}

/**
 * Calculate completion percentage from PROGRESS.json
 */
function calculateProgressCompletion(progress) {
  let totalTasks = 0;
  let completedTasks = 0;

  if (progress.phases) {
    for (const phase of progress.phases) {
      if (phase.tasks) {
        totalTasks += phase.tasks.length;
        completedTasks += phase.tasks.filter(t => t.completed || t.status === 'completed').length;
      }
    }
  }

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

/**
 * Post progress comment to GitHub issue
 */
function postProgressComment(issueNumber, level, progress, context, githubConfig) {
  if (!issueNumber || !githubConfig) {
    return false;
  }

  const breadcrumb = generateBreadcrumb(context);
  const progressBar = generateProgressBar(progress, 30);

  let levelEmoji;
  switch (level) {
    case 'epic': levelEmoji = '🏔️'; break;
    case 'roadmap': levelEmoji = '🗺️'; break;
    case 'phase-dev': levelEmoji = '📋'; break;
    default: levelEmoji = '📌';
  }

  const comment = `## ${levelEmoji} Progress Update

**Level:** ${level.charAt(0).toUpperCase() + level.slice(1)}
${breadcrumb ? `**Hierarchy:** ${breadcrumb}` : ''}

\`\`\`
[${progressBar}] ${progress}%
\`\`\`

---
_Auto-updated by CCASP Hierarchy Progress Sync_`;

  return safeAddIssueComment({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Post completion comment and close issue
 */
function postCompletionAndClose(issueNumber, level, context, metrics, githubConfig) {
  if (!issueNumber || !githubConfig) {
    return false;
  }

  const breadcrumb = generateBreadcrumb(context);

  let levelEmoji;
  switch (level) {
    case 'epic': levelEmoji = '🎊'; break;
    case 'roadmap': levelEmoji = '🎉'; break;
    case 'phase-dev': levelEmoji = '✅'; break;
    default: levelEmoji = '✔️';
  }

  const comment = `## ${levelEmoji} ${level.charAt(0).toUpperCase() + level.slice(1)} Completed!

${breadcrumb ? `**Hierarchy:** ${breadcrumb}` : ''}

### Summary
${metrics.phases ? `- **Phases:** ${metrics.phases} completed` : ''}
${metrics.tasks ? `- **Tasks:** ${metrics.tasks} completed` : ''}
${metrics.duration ? `- **Duration:** ${metrics.duration}` : ''}

---
_Completed by CCASP Hierarchy Progress Sync_`;

  safeCloseIssue({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    issueNumber,
    comment,
  });

  return true;
}

/**
 * Process phase-dev-plan change
 */
function processPhaseDevChange(filePath, projectRoot, state, githubConfig) {
  const result = loadProgressWithContext(filePath, projectRoot);
  if (!result) return;

  const { progress, context } = result;
  const percentage = calculateProgressCompletion(progress);
  const key = `plan:${context.plan.slug}`;
  const previousPercentage = state.plans[context.plan.slug]?.completion || 0;

  // Update state
  state.plans[context.plan.slug] = {
    completion: percentage,
    github_issue: context.plan.github_issue,
  };

  // Update issue title
  if (percentage !== previousPercentage && context.plan.github_issue) {
    updateIssueTitleWithProgress(
      context.plan.github_issue,
      context.plan.name || context.plan.slug,
      percentage,
      githubConfig
    );
  }

  // Check for milestone
  const milestone = shouldReportMilestone(key, percentage, state);
  if (milestone && milestone < 100) {
    postProgressComment(
      context.plan.github_issue,
      'phase-dev',
      percentage,
      context,
      githubConfig
    );
    markMilestoneReported(key, milestone, state);
  }

  // Check for completion
  if (percentage >= 100 && previousPercentage < 100) {
    const completedPhases = progress.phases?.filter(p => p.status === 'completed').length || 0;
    const totalTasks = progress.phases?.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) || 0;

    postCompletionAndClose(
      context.plan.github_issue,
      'phase-dev',
      context,
      { phases: completedPhases, tasks: totalTasks },
      githubConfig
    );

    // Update parent roadmap issue if exists
    if (context.roadmap?.github_issue) {
      safeAddIssueComment({
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        issueNumber: context.roadmap.github_issue,
        body: `✅ Phase-dev-plan **${context.plan.name}** completed (100%)`,
      });
    }

    // Update parent epic issue if exists
    if (context.epic?.github_issue) {
      safeAddIssueComment({
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        issueNumber: context.epic.github_issue,
        body: `📋 Phase-dev-plan **${context.plan.name}** completed`,
      });
    }
  }
}

/**
 * Process roadmap change
 */
function processRoadmapChange(filePath, projectRoot, state, githubConfig) {
  if (!fs.existsSync(filePath)) return;

  try {
    const roadmap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const percentage = roadmap.metadata?.overall_completion_percentage || 0;
    const key = `roadmap:${roadmap.slug}`;
    const previousPercentage = state.roadmaps[roadmap.slug]?.completion || 0;
    const issueNumber = roadmap.metadata?.github_epic_number;

    const context = {
      roadmap: {
        slug: roadmap.slug,
        title: roadmap.title,
        github_issue: issueNumber,
      },
      epic: null,
    };

    // Check for parent epic
    if (roadmap.parent_epic) {
      const epicPath = path.isAbsolute(roadmap.parent_epic.epic_path)
        ? roadmap.parent_epic.epic_path
        : path.join(projectRoot, roadmap.parent_epic.epic_path);

      if (fs.existsSync(epicPath)) {
        const epic = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
        context.epic = {
          slug: epic.slug,
          title: epic.title,
          github_issue: epic.github_epic_number,
        };
      }
    }

    // Update state
    state.roadmaps[roadmap.slug] = {
      completion: percentage,
      github_issue: issueNumber,
    };

    // Update issue title
    if (percentage !== previousPercentage && issueNumber) {
      updateIssueTitleWithProgress(issueNumber, roadmap.title, percentage, githubConfig);
    }

    // Check for milestone
    const milestone = shouldReportMilestone(key, percentage, state);
    if (milestone && milestone < 100) {
      postProgressComment(issueNumber, 'roadmap', percentage, context, githubConfig);
      markMilestoneReported(key, milestone, state);
    }

    // Check for completion
    if (roadmap.status === 'completed' && state.roadmaps[roadmap.slug]?.status !== 'completed') {
      const planCount = roadmap.phase_dev_plan_refs?.length || 0;

      postCompletionAndClose(
        issueNumber,
        'roadmap',
        context,
        { phases: planCount },
        githubConfig
      );

      // Update parent epic issue
      if (context.epic?.github_issue) {
        safeAddIssueComment({
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          issueNumber: context.epic.github_issue,
          body: `🗺️ Roadmap **${roadmap.title}** completed (100%)`,
        });
      }
    }

    state.roadmaps[roadmap.slug].status = roadmap.status;
  } catch (error) {
    if (CONFIG.verboseLogging) {
      console.error('[Hierarchy Sync] Failed to process roadmap:', error.message);
    }
  }
}

/**
 * Process epic change
 */
function processEpicChange(filePath, projectRoot, state, githubConfig) {
  if (!fs.existsSync(filePath)) return;

  try {
    const epic = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const percentage = epic.completion_percentage || 0;
    const key = `epic:${epic.slug}`;
    const previousPercentage = state.epics[epic.slug]?.completion || 0;
    const issueNumber = epic.github_epic_number;

    const context = {
      epic: {
        slug: epic.slug,
        title: epic.title,
        github_issue: issueNumber,
      },
    };

    // Update state
    state.epics[epic.slug] = {
      completion: percentage,
      github_issue: issueNumber,
      status: epic.status,
    };

    // Update issue title
    if (percentage !== previousPercentage && issueNumber) {
      updateIssueTitleWithProgress(issueNumber, epic.title, percentage, githubConfig);
    }

    // Check for milestone
    const milestone = shouldReportMilestone(key, percentage, state);
    if (milestone && milestone < 100) {
      postProgressComment(issueNumber, 'epic', percentage, context, githubConfig);
      markMilestoneReported(key, milestone, state);
    }

    // Check for completion
    if (epic.status === 'completed' && state.epics[epic.slug]?.previousStatus !== 'completed') {
      const roadmapCount = epic.roadmaps?.length || 0;

      postCompletionAndClose(
        issueNumber,
        'epic',
        context,
        { phases: roadmapCount },
        githubConfig
      );
    }

    state.epics[epic.slug].previousStatus = epic.status;
  } catch (error) {
    if (CONFIG.verboseLogging) {
      console.error('[Hierarchy Sync] Failed to process epic:', error.message);
    }
  }
}

/**
 * Main hook handler
 */
async function hierarchyProgressSyncHook(context) {
  const { tool, toolInput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Check for relevant tool operations
  const isFileOp = tool === 'Edit' || tool === 'Write';
  const isTodoWrite = tool === 'TodoWrite';

  if (!isFileOp && !isTodoWrite) {
    return { continue: true };
  }

  // Get file path for file operations
  const filePath = toolInput?.file_path;

  // Detect change type
  let changeType = null;
  if (isFileOp && filePath) {
    changeType = detectChangeType(filePath);
  }

  // Skip if not a hierarchy file
  if (isFileOp && !changeType) {
    return { continue: true };
  }

  // Get GitHub config
  const githubConfig = getGitHubConfig(projectRoot);
  if (!githubConfig) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Process based on change type
  if (changeType === 'epic') {
    processEpicChange(filePath, projectRoot, state, githubConfig);
  } else if (changeType === 'roadmap') {
    processRoadmapChange(filePath, projectRoot, state, githubConfig);
  } else if (changeType === 'phase-dev') {
    processPhaseDevChange(filePath, projectRoot, state, githubConfig);
  }

  // Save state
  saveState(projectRoot, state);

  return { continue: true };
}

module.exports = hierarchyProgressSyncHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.generateProgressBar = generateProgressBar;
module.exports.generateBreadcrumb = generateBreadcrumb;
module.exports.calculateProgressCompletion = calculateProgressCompletion;
