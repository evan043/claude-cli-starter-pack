/**
 * Vision Observer Hook (Phase 7 Integration)
 *
 * Monitors Epic and Roadmap updates to track Vision alignment:
 * - Triggers on EPIC.json, ROADMAP.json, PROGRESS.json, or VISION.json changes
 * - Loads associated VISION.json via parent context
 * - Calculates current alignment against Vision plan
 * - Detects drift and logs drift events
 * - Generates adjustments if significant drift detected
 * - Updates VISION.json with observation results
 * - Posts progress to GitHub if integrated
 * - Integrates with Phase 7 VisionOrchestrator for alignment tracking
 *
 * Event: PostToolUse
 * Triggers: After Edit/Write on EPIC.json, ROADMAP.json, PROGRESS.json, or VISION.json files
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
    console.error('[Vision Observer] Failed to add comment:', error.message);
    return false;
  }
}

// Configuration (matches Phase 7 Orchestrator defaults)
const CONFIG = {
  visionsDir: '.claude/visions',
  epicsDir: '.claude/epics',
  roadmapsDir: '.claude/roadmaps',
  stateFile: '.claude/hooks/cache/vision-observer-state.json',
  githubEnabled: true,
  verboseLogging: false,
  // Alignment threshold (below this = significant drift) - matches orchestrator.observer.replanThreshold
  driftThreshold: 0.85,
  // Critical threshold for escalation
  criticalThreshold: 0.60,
  // Milestone thresholds for progress reporting
  milestoneThresholds: [25, 50, 75, 100],
  // Minimum change to trigger observation
  minChangePercentage: 5,
  // Orchestrator stage tracking
  orchestratorStages: [
    'initialization',
    'analysis',
    'architecture',
    'planning',
    'security',
    'execution',
    'validation',
    'completion'
  ],
};

/**
 * Load hook state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      lastUpdate: null,
      visions: {},
      driftEvents: [],
      reportedMilestones: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { lastUpdate: null, visions: {}, driftEvents: [], reportedMilestones: {} };
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
 * Find all visions in project
 */
function discoverVisions(projectRoot) {
  const visions = [];
  const visionsDir = path.join(projectRoot, CONFIG.visionsDir);

  if (!fs.existsSync(visionsDir)) {
    return visions;
  }

  const visionDirs = fs.readdirSync(visionsDir, { withFileTypes: true });

  for (const dirent of visionDirs) {
    if (dirent.isDirectory()) {
      const visionPath = path.join(visionsDir, dirent.name, 'VISION.json');
      if (fs.existsSync(visionPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(visionPath, 'utf8'));
          visions.push({
            slug: dirent.name,
            path: visionPath,
            data: data,
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return visions;
}

/**
 * Load Epic data from path
 */
function loadEpic(projectRoot, epicPath) {
  const fullPath = path.isAbsolute(epicPath)
    ? epicPath
    : path.join(projectRoot, epicPath);

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
 * Load Roadmap data from path
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
 * Calculate alignment score between current state and Vision plan
 *
 * Alignment factors:
 * - Timeline adherence (0-1)
 * - Scope adherence (0-1)
 * - Quality adherence (0-1)
 *
 * @param {Object} vision - Vision data
 * @param {Object} currentState - Current Epic/Roadmap state
 * @returns {Object} { score: number, factors: object, issues: string[] }
 */
function calculateAlignment(vision, currentState) {
  const factors = {
    timeline: 1.0,
    scope: 1.0,
    quality: 1.0,
  };
  const issues = [];

  // 1. Timeline adherence
  if (vision.estimated_duration && currentState.started_at) {
    const startDate = new Date(currentState.started_at);
    const now = new Date();
    const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24);

    // Parse duration (assumes format like "2 weeks", "3 months")
    const durationMatch = vision.estimated_duration.match(/(\d+)\s+(day|week|month)s?/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      let estimatedDays = value;

      if (unit === 'week') estimatedDays = value * 7;
      if (unit === 'month') estimatedDays = value * 30;

      const progressRatio = currentState.completion_percentage / 100;
      const timeRatio = elapsedDays / estimatedDays;

      // If time elapsed > progress made, timeline is slipping
      if (timeRatio > progressRatio) {
        const slippage = timeRatio - progressRatio;
        factors.timeline = Math.max(0, 1 - slippage);

        if (slippage > 0.2) {
          issues.push(`Timeline slippage detected: ${Math.round(slippage * 100)}% behind schedule`);
        }
      }
    }
  }

  // 2. Scope adherence
  if (vision.epics && currentState.epics) {
    const plannedEpics = vision.epics.length;
    const currentEpics = currentState.epics.length;

    if (currentEpics > plannedEpics) {
      const scopeIncrease = (currentEpics - plannedEpics) / plannedEpics;
      factors.scope = Math.max(0, 1 - scopeIncrease);
      issues.push(`Scope creep: ${currentEpics} epics vs ${plannedEpics} planned`);
    } else if (currentEpics < plannedEpics) {
      const scopeReduction = (plannedEpics - currentEpics) / plannedEpics;
      if (scopeReduction > 0.2) {
        factors.scope = Math.max(0, 1 - scopeReduction);
        issues.push(`Scope reduction: ${currentEpics} epics vs ${plannedEpics} planned`);
      }
    }
  }

  // 3. Quality adherence (based on success criteria met)
  if (vision.success_criteria && currentState.success_criteria_met) {
    const totalCriteria = vision.success_criteria.length;
    const metCriteria = currentState.success_criteria_met.length;

    const progressRatio = currentState.completion_percentage / 100;
    const criteriaRatio = metCriteria / totalCriteria;

    // Quality should track with progress
    if (criteriaRatio < progressRatio - 0.2) {
      factors.quality = criteriaRatio / progressRatio;
      issues.push(`Quality lag: ${metCriteria}/${totalCriteria} criteria met at ${currentState.completion_percentage}% progress`);
    }
  }

  // Overall alignment score (weighted average)
  const score = (factors.timeline * 0.4) + (factors.scope * 0.3) + (factors.quality * 0.3);

  return {
    score: Math.round(score * 100) / 100,
    factors,
    issues,
  };
}

/**
 * Aggregate current state from Vision's child Epics
 *
 * @param {Object} vision - Vision data
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Current state aggregate
 */
function aggregateCurrentState(vision, projectRoot) {
  const state = {
    completion_percentage: 0,
    epics: [],
    roadmaps: [],
    success_criteria_met: [],
    started_at: vision.created,
  };

  if (!vision.epic_refs || vision.epic_refs.length === 0) {
    return state;
  }

  let totalCompletion = 0;
  let activeEpics = 0;
  let earliestStart = null;

  for (const epicRef of vision.epic_refs) {
    const epic = loadEpic(projectRoot, epicRef.path);
    if (!epic) continue;

    state.epics.push({
      slug: epicRef.slug,
      title: epic.title,
      status: epic.status,
      completion: epic.completion_percentage || 0,
    });

    totalCompletion += (epic.completion_percentage || 0);
    activeEpics++;

    // Track earliest start
    if (epic.started_at) {
      const startDate = new Date(epic.started_at);
      if (!earliestStart || startDate < earliestStart) {
        earliestStart = startDate;
      }
    }

    // Load child roadmaps
    if (epic.roadmaps) {
      for (const roadmapRef of epic.roadmaps) {
        const roadmap = loadRoadmap(projectRoot, roadmapRef.path);
        if (roadmap) {
          state.roadmaps.push({
            slug: roadmapRef.roadmap_id,
            title: roadmap.title,
            status: roadmap.status,
            completion: roadmap.metadata?.overall_completion_percentage || 0,
          });
        }
      }
    }
  }

  // Calculate overall completion
  state.completion_percentage = activeEpics > 0
    ? Math.round(totalCompletion / activeEpics)
    : 0;

  // Use earliest start date
  if (earliestStart) {
    state.started_at = earliestStart.toISOString();
  }

  // TODO: Track success criteria met (would need criteria tracking in Epics)
  state.success_criteria_met = [];

  return state;
}

/**
 * Generate adjustment recommendations for drift
 *
 * @param {Object} alignment - Alignment calculation result
 * @param {Object} vision - Vision data
 * @param {Object} currentState - Current state
 * @returns {Array} Array of adjustment recommendations
 */
function generateAdjustments(alignment, vision, currentState) {
  const adjustments = [];

  // Timeline adjustments
  if (alignment.factors.timeline < 0.8) {
    adjustments.push({
      type: 'timeline',
      severity: alignment.factors.timeline < 0.5 ? 'critical' : 'warning',
      recommendation: 'Consider accelerating execution by:\n- Increasing L2/L3 agent parallelization\n- Reducing scope of remaining epics\n- Focusing on critical path items',
      impact: 'Restores timeline alignment',
    });
  }

  // Scope adjustments
  if (alignment.factors.scope < 0.8) {
    const scopeIssue = alignment.issues.find(i => i.includes('Scope'));
    if (scopeIssue && scopeIssue.includes('creep')) {
      adjustments.push({
        type: 'scope',
        severity: 'warning',
        recommendation: 'Scope has expanded beyond Vision plan. Consider:\n- Reviewing new epics for necessity\n- Deferring non-critical epics to Phase 2\n- Updating Vision to reflect new scope',
        impact: 'Restores scope alignment or updates Vision baseline',
      });
    }
  }

  // Quality adjustments
  if (alignment.factors.quality < 0.8) {
    adjustments.push({
      type: 'quality',
      severity: 'warning',
      recommendation: 'Success criteria lagging behind progress. Consider:\n- Adding quality gates to epic milestones\n- Scheduling criteria validation sprints\n- Updating criteria tracking in Epic metadata',
      impact: 'Improves quality tracking and alignment',
    });
  }

  return adjustments;
}

/**
 * Save Vision observation results
 *
 * @param {Object} vision - Vision data (mutated)
 * @param {Object} observation - Observation results
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} Success status
 */
function saveVisionObservation(vision, observation, projectRoot) {
  // Initialize observations array if not exists
  if (!vision.observations) {
    vision.observations = [];
  }

  // Add new observation
  vision.observations.push(observation);

  // Keep only last 50 observations
  if (vision.observations.length > 50) {
    vision.observations = vision.observations.slice(-50);
  }

  // Update Vision metadata
  vision.metadata = vision.metadata || {};
  vision.metadata.last_observation = observation.timestamp;
  vision.metadata.current_alignment_score = observation.alignment.score;
  vision.metadata.drift_detected = observation.drift_detected;
  vision.updated = new Date().toISOString();

  // Save Vision file
  const visionPath = path.join(projectRoot, CONFIG.visionsDir, vision.slug, 'VISION.json');
  try {
    fs.writeFileSync(visionPath, JSON.stringify(vision, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[Vision Observer] Failed to save Vision:', error.message);
    return false;
  }
}

/**
 * Post Vision observation comment to GitHub
 *
 * @param {Object} vision - Vision data
 * @param {Object} observation - Observation results
 * @param {Object} githubConfig - GitHub config
 * @returns {boolean} Success status
 */
function postVisionObservationComment(vision, observation, githubConfig) {
  if (!CONFIG.githubEnabled || !vision.github_issue_number) {
    return false;
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = vision.github_issue_number;

  const driftEmoji = observation.drift_detected ? '⚠️' : '✅';
  const alignmentBar = generateProgressBar(Math.round(observation.alignment.score * 100), 20);

  let comment = `## ${driftEmoji} Vision Observation\n\n`;
  comment += `**Timestamp:** ${observation.timestamp}\n`;
  comment += `**Alignment Score:** ${Math.round(observation.alignment.score * 100)}%\n`;
  comment += `\`\`\`\n[${alignmentBar}]\n\`\`\`\n\n`;

  // Alignment factors
  comment += `### Alignment Factors\n`;
  comment += `- **Timeline:** ${Math.round(observation.alignment.factors.timeline * 100)}%\n`;
  comment += `- **Scope:** ${Math.round(observation.alignment.factors.scope * 100)}%\n`;
  comment += `- **Quality:** ${Math.round(observation.alignment.factors.quality * 100)}%\n\n`;

  // Issues
  if (observation.alignment.issues.length > 0) {
    comment += `### Issues Detected\n`;
    for (const issue of observation.alignment.issues) {
      comment += `- ${issue}\n`;
    }
    comment += `\n`;
  }

  // Adjustments
  if (observation.adjustments && observation.adjustments.length > 0) {
    comment += `### Recommended Adjustments\n`;
    for (const adjustment of observation.adjustments) {
      const severityEmoji = adjustment.severity === 'critical' ? '🚨' : '⚠️';
      comment += `${severityEmoji} **${adjustment.type.toUpperCase()}**\n`;
      comment += `${adjustment.recommendation}\n\n`;
    }
  }

  // Current state summary
  comment += `### Current State\n`;
  comment += `- **Completion:** ${observation.current_state.completion_percentage}%\n`;
  comment += `- **Epics:** ${observation.current_state.epics.length}\n`;
  comment += `- **Roadmaps:** ${observation.current_state.roadmaps.length}\n`;

  comment += `\n---\n_Updated by CCASP Vision Observer Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
  });
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
function shouldReportMilestone(visionSlug, percentage, state) {
  const reported = state.reportedMilestones[visionSlug] || [];

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
function markMilestoneReported(visionSlug, milestone, state) {
  if (!state.reportedMilestones[visionSlug]) {
    state.reportedMilestones[visionSlug] = [];
  }
  if (!state.reportedMilestones[visionSlug].includes(milestone)) {
    state.reportedMilestones[visionSlug].push(milestone);
  }
}

/**
 * Post milestone comment
 */
function postMilestoneComment(vision, milestone, observation, githubConfig) {
  if (!CONFIG.githubEnabled || !vision.github_issue_number) {
    return false;
  }

  if (!githubConfig) {
    return false;
  }

  const { owner, repo } = githubConfig;
  const issueNumber = vision.github_issue_number;

  const milestoneEmoji = milestone === 100 ? '🎊' :
                         milestone === 75 ? '🚀' :
                         milestone === 50 ? '⭐' : '📊';

  const alignmentScore = Math.round(observation.alignment.score * 100);
  const alignmentStatus = alignmentScore >= 80 ? '✅ Good' :
                          alignmentScore >= 60 ? '⚠️ Fair' : '🚨 Poor';

  const comment = `## ${milestoneEmoji} Vision Milestone: ${milestone}%

**Vision:** ${vision.title}
**Progress:** ${observation.current_state.completion_percentage}%
**Alignment:** ${alignmentScore}% ${alignmentStatus}

\`\`\`
[${generateProgressBar(observation.current_state.completion_percentage, 30)}]
\`\`\`

### Current State
- **Epics:** ${observation.current_state.epics.length}
- **Roadmaps:** ${observation.current_state.roadmaps.length}
- **Duration:** ${calculateDuration(vision.created, new Date().toISOString())}

---
_Updated by CCASP Vision Observer Hook_`;

  return safeAddIssueComment({
    owner,
    repo,
    issueNumber,
    body: comment,
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
 * Main hook handler
 */
async function visionObserverHook(context) {
  const { tool, toolInput, hookType, projectRoot } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Track Edit/Write on EPIC.json, ROADMAP.json, or PROGRESS.json files
  const isEpicUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('EPIC.json');

  const isRoadmapUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('ROADMAP.json');

  const isPlanUpdate = (tool === 'Edit' || tool === 'Write') &&
    toolInput?.file_path?.includes('PROGRESS.json');

  if (!isEpicUpdate && !isRoadmapUpdate && !isPlanUpdate) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Discover all visions
  const visions = discoverVisions(projectRoot);
  if (visions.length === 0) {
    return { continue: true };
  }

  // Get GitHub config
  const githubConfig = getGitHubConfig(projectRoot);

  // Process each vision
  for (const vision of visions) {
    const previousState = state.visions[vision.slug] || {};

    // Aggregate current state from child epics
    const currentState = aggregateCurrentState(vision.data, projectRoot);

    // Check if significant change occurred
    const previousCompletion = previousState.completion_percentage || 0;
    const currentCompletion = currentState.completion_percentage;
    const changePercentage = Math.abs(currentCompletion - previousCompletion);

    if (changePercentage < CONFIG.minChangePercentage && previousState.completion_percentage !== undefined) {
      // Skip observation if change is too small
      continue;
    }

    // Calculate alignment
    const alignment = calculateAlignment(vision.data, currentState);

    // Detect drift
    const driftDetected = alignment.score < CONFIG.driftThreshold;

    // Generate adjustments if drift detected
    const adjustments = driftDetected
      ? generateAdjustments(alignment, vision.data, currentState)
      : [];

    // Create observation record
    const observation = {
      timestamp: new Date().toISOString(),
      trigger: isEpicUpdate ? 'epic_update' :
               isRoadmapUpdate ? 'roadmap_update' : 'plan_update',
      alignment,
      current_state: currentState,
      drift_detected: driftDetected,
      adjustments,
    };

    // Save observation to Vision
    saveVisionObservation(vision.data, observation, projectRoot);

    // Log drift event if detected
    if (driftDetected) {
      state.driftEvents.push({
        vision_slug: vision.slug,
        timestamp: observation.timestamp,
        alignment_score: alignment.score,
        issues: alignment.issues,
      });

      // Keep only last 100 drift events
      if (state.driftEvents.length > 100) {
        state.driftEvents = state.driftEvents.slice(-100);
      }

      if (CONFIG.verboseLogging) {
        console.log(`[Vision Observer] Drift detected for ${vision.slug}: ${Math.round(alignment.score * 100)}% alignment`);
      }

      // Post observation to GitHub
      postVisionObservationComment(vision.data, observation, githubConfig);
    }

    // Check for milestone
    const milestone = shouldReportMilestone(vision.slug, currentCompletion, state);
    if (milestone) {
      postMilestoneComment(vision.data, milestone, observation, githubConfig);
      markMilestoneReported(vision.slug, milestone, state);

      if (CONFIG.verboseLogging) {
        console.log(`[Vision Observer] Milestone ${milestone}% reached for ${vision.slug}`);
      }
    }

    // Update state
    state.visions[vision.slug] = {
      completion_percentage: currentCompletion,
      last_alignment_score: alignment.score,
      last_observation: observation.timestamp,
      drift_detected: driftDetected,
    };
  }

  // Save state
  saveState(projectRoot, state);

  return { continue: true };
}

module.exports = visionObserverHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.calculateAlignment = calculateAlignment;
module.exports.aggregateCurrentState = aggregateCurrentState;
module.exports.generateAdjustments = generateAdjustments;

/**
 * Check if orchestrator stage changed
 * @param {Object} vision - Vision data
 * @param {Object} previousState - Previous state
 * @returns {boolean} True if stage changed
 */
module.exports.checkOrchestratorStageChange = function(vision, previousState) {
  const currentStage = vision.orchestrator?.stage;
  const previousStage = previousState?.orchestratorStage;

  if (currentStage && currentStage !== previousStage) {
    return {
      changed: true,
      from: previousStage || 'none',
      to: currentStage
    };
  }

  return { changed: false };
};

/**
 * Get orchestrator progress from stage
 * @param {string} stage - Current stage
 * @returns {number} Progress percentage based on stage
 */
module.exports.getOrchestratorProgress = function(stage) {
  const stageIndex = CONFIG.orchestratorStages.indexOf(stage);
  if (stageIndex === -1) return 0;
  return Math.round((stageIndex / (CONFIG.orchestratorStages.length - 1)) * 100);
};
