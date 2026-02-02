/**
 * Agent Epic Progress Hook
 *
 * Monitors agent task completions and updates GitHub Epic:
 * - Update progress percentages
 * - Add code snippets with updated details
 * - Mark checkboxes completed
 * - Post progress comments to GitHub issues
 *
 * Event: PostToolUse
 * Triggers: After Task tool completions and Edit/Write on PROGRESS.json
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

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
  } catch {
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
  } catch {
    return false;
  }
}

// Configuration
const CONFIG = {
  epicsDirNew: '.claude/github-epics',
  epicsDirLegacy: '.claude/roadmaps',
  progressDir: '.claude/phase-plans',
  stateFile: '.claude/hooks/cache/epic-progress-state.json',
  githubEnabled: true,
  verboseLogging: false,
  // Code snippet settings
  maxSnippetLines: 20,
  includeCodeSnippets: true,
  // Progress comment settings
  commentOnMilestones: true,
  milestoneThresholds: [25, 50, 75, 100],
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

  // Check new epics directory
  const newDir = path.join(projectRoot, CONFIG.epicsDirNew);
  if (fs.existsSync(newDir)) {
    const files = fs.readdirSync(newDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const epicPath = path.join(newDir, file);
          const data = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
          epics.push({
            slug: file.replace('.json', ''),
            path: epicPath,
            data: data,
            type: 'epic',
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  // Check legacy roadmaps directory
  const legacyDir = path.join(projectRoot, CONFIG.epicsDirLegacy);
  if (fs.existsSync(legacyDir)) {
    const files = fs.readdirSync(legacyDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const epicPath = path.join(legacyDir, file);
          const data = JSON.parse(fs.readFileSync(epicPath, 'utf8'));
          epics.push({
            slug: file.replace('.json', ''),
            path: epicPath,
            data: data,
            type: 'legacy',
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
 * Calculate epic completion from phases
 */
function calculateEpicCompletion(epic) {
  const phases = epic.data.phases || [];
  if (phases.length === 0) return 0;

  const completedPhases = phases.filter(p => p.status === 'completed').length;
  return Math.round((completedPhases / phases.length) * 100);
}

/**
 * Calculate phase completion from tasks
 */
function calculatePhaseCompletion(projectRoot, epicSlug, phaseId) {
  const progressPath = path.join(
    projectRoot,
    CONFIG.progressDir,
    epicSlug,
    `${phaseId}.json`
  );

  if (!fs.existsSync(progressPath)) {
    return { percentage: 0, completedTasks: 0, totalTasks: 0 };
  }

  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    let totalTasks = 0;
    let completedTasks = 0;

    if (progress.phases) {
      for (const phase of progress.phases) {
        if (phase.tasks) {
          totalTasks += phase.tasks.length;
          completedTasks += phase.tasks.filter(t => t.status === 'completed' || t.completed).length;
        }
      }
    }

    return {
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      completedTasks,
      totalTasks,
    };
  } catch {
    return { percentage: 0, completedTasks: 0, totalTasks: 0 };
  }
}

/**
 * Extract code snippet from tool output
 */
function extractCodeSnippet(toolOutput, maxLines = CONFIG.maxSnippetLines) {
  if (!toolOutput || !CONFIG.includeCodeSnippets) return null;

  // Try to find code blocks or relevant content
  const content = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);

  // Extract code between markers or take first lines
  const lines = content.split('\n').slice(0, maxLines);
  if (lines.length === 0) return null;

  return lines.join('\n');
}

/**
 * Update GitHub issue with progress
 */
function updateGitHubIssue(epic, phaseId, progress, codeSnippet, projectRoot) {
  if (!CONFIG.githubEnabled) return false;

  // Get GitHub config
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

  // Find phase GitHub issue number
  const phases = epic.data.phases || [];
  const phase = phases.find(p => p.phase_id === phaseId);
  const issueNumber = phase?.github_issue_number || epic.data.metadata?.github_epic_number;

  if (!issueNumber) return false;

  // Build progress comment
  const progressBar = generateProgressBar(progress.percentage, 20);
  let comment = `## Agent Progress Update

**Phase:** ${phase?.phase_title || phaseId}
**Progress:** ${progress.completedTasks}/${progress.totalTasks} tasks

\`\`\`
[${progressBar}] ${progress.percentage}%
\`\`\`
`;

  if (codeSnippet) {
    comment += `
### Latest Code Changes

\`\`\`
${codeSnippet.substring(0, 500)}${codeSnippet.length > 500 ? '\n...' : ''}
\`\`\`
`;
  }

  comment += `
---
_Updated by CCASP Agent Progress Hook_`;

  // Use safe execution to prevent shell injection
  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
}

/**
 * Update epic issue checkboxes
 */
function updateEpicCheckboxes(epic, projectRoot) {
  if (!CONFIG.githubEnabled) return false;

  const epicNumber = epic.data.metadata?.github_epic_number;
  if (!epicNumber) return false;

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

  // Build checkbox list
  const phases = epic.data.phases || [];
  let checkboxList = '## Phase Progress\n\n';

  for (const phase of phases) {
    const isComplete = phase.status === 'completed';
    const checkbox = isComplete ? '[x]' : '[ ]';
    checkboxList += `- ${checkbox} **${phase.phase_title}** (${phase.complexity || 'M'})\n`;
  }

  const completion = calculateEpicCompletion(epic);
  checkboxList += `\n**Overall Progress:** ${completion}%`;

  // Post update comment using safe execution (no shell injection)
  const commentSuccess = safeAddIssueComment({
    owner,
    repo,
    issueNumber: epicNumber,
    body: checkboxList,
  });

  if (!commentSuccess) {
    return false;
  }

  // Close epic if 100% complete
  if (completion >= 100) {
    safeCloseIssue({
      owner,
      repo,
      issueNumber: epicNumber,
      comment: '✅ Epic completed! All phases finished.',
    });
  }

  return true;
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
 * Check if we should report milestone
 */
function shouldReportMilestone(epicSlug, phaseId, percentage, state) {
  if (!CONFIG.commentOnMilestones) return false;

  const key = `${epicSlug}/${phaseId}`;
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
function markMilestoneReported(epicSlug, phaseId, milestone, state) {
  const key = `${epicSlug}/${phaseId}`;
  if (!state.reportedMilestones[key]) {
    state.reportedMilestones[key] = [];
  }
  if (!state.reportedMilestones[key].includes(milestone)) {
    state.reportedMilestones[key].push(milestone);
  }
}

/**
 * Main hook handler
 */
async function agentEpicProgressHook(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Track Task tool completions (agent completions)
  const isAgentCompletion = tool === 'Task';

  // Track Edit/Write on progress files
  const isProgressUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('PROGRESS.json');

  if (!isAgentCompletion && !isProgressUpdate) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Discover all epics
  const epics = discoverEpics(projectRoot);
  if (epics.length === 0) {
    return { continue: true };
  }

  // Process each epic
  for (const epic of epics) {
    const phases = epic.data.phases || [];

    for (const phase of phases) {
      if (phase.status === 'completed') continue;

      // Calculate phase progress
      const progress = calculatePhaseCompletion(projectRoot, epic.slug, phase.phase_id);

      // Check for milestone
      const milestone = shouldReportMilestone(epic.slug, phase.phase_id, progress.percentage, state);

      if (milestone) {
        // Extract code snippet if available
        const codeSnippet = isAgentCompletion ? extractCodeSnippet(toolOutput) : null;

        // Update GitHub issue
        const updated = updateGitHubIssue(epic, phase.phase_id, progress, codeSnippet, projectRoot);

        if (updated) {
          markMilestoneReported(epic.slug, phase.phase_id, milestone, state);

          if (CONFIG.verboseLogging) {
            console.log(`[Epic Progress] ${epic.slug}/${phase.phase_id}: ${progress.percentage}% (milestone: ${milestone}%)`);
          }
        }
      }

      // Update phase status if complete
      if (progress.percentage >= 100 && phase.status !== 'completed') {
        phase.status = 'completed';
        phase.metadata = phase.metadata || {};
        phase.metadata.completed_at = new Date().toISOString();

        // Save epic
        fs.writeFileSync(epic.path, JSON.stringify(epic.data, null, 2), 'utf8');

        // Update epic checkboxes on GitHub
        updateEpicCheckboxes(epic, projectRoot);
      }
    }

    // Update epic metadata
    const epicCompletion = calculateEpicCompletion(epic);
    epic.data.metadata = epic.data.metadata || {};
    epic.data.metadata.completion_percentage = epicCompletion;
    epic.data.metadata.completed_phases = phases.filter(p => p.status === 'completed').length;
    epic.data.updated = new Date().toISOString();

    // Save epic
    fs.writeFileSync(epic.path, JSON.stringify(epic.data, null, 2), 'utf8');
  }

  // Save state
  saveState(projectRoot, state);

  return { continue: true };
}

module.exports = agentEpicProgressHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.calculateEpicCompletion = calculateEpicCompletion;
module.exports.calculatePhaseCompletion = calculatePhaseCompletion;
module.exports.generateProgressBar = generateProgressBar;
