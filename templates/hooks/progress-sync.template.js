/**
 * Progress Sync Hook Template
 *
 * Master hook for progress-based GitHub synchronization.
 * Monitors PROGRESS.json changes and spawns L3 worker agents
 * to sync updates to GitHub issues.
 *
 * Event: PostToolUse
 * Tools: Write, Edit
 * Target: **/PROGRESS.json
 *
 * Features:
 * - Change detection (task/phase/plan completion, blockers)
 * - Debounce logic to prevent sync spam
 * - L3 worker agent spawning with Task tool
 * - Comprehensive logging
 * - Configurable sync triggers
 */

const fs = require('fs');
const path = require('path');

// Configuration paths (replaced during template processing)
const PROJECT_ROOT = '{{projectRoot}}';
const CONFIG_PATH = '{{configPath}}';

// State cache for debounce tracking
const syncStateCache = new Map();

/**
 * Load sync configuration from .claude/config/progress-sync-config.json
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Object|null} Configuration object or null if not found
 */
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.claude', 'config', 'progress-sync-config.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    logError('Failed to load config', { configPath, error: error.message });
    return null;
  }
}

/**
 * Load PROGRESS.json file and parse it
 *
 * @param {string} filePath - Absolute path to PROGRESS.json
 * @returns {Object|null} Parsed progress data or null on error
 */
function loadProgressFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logError('Failed to load progress file', { filePath, error: error.message });
    return null;
  }
}

/**
 * Detect changes between old and new progress states
 *
 * Detects:
 * - task_complete: Task status changed to "completed"
 * - phase_advance: Phase status changed to "completed"
 * - blocker: Task status changed to "blocked"
 * - plan_complete: All phases completed
 *
 * @param {Object} oldProgress - Previous progress state (can be null)
 * @param {Object} newProgress - Current progress state
 * @returns {Array<Object>} Array of detected changes
 */
function detectChanges(oldProgress, newProgress) {
  const changes = [];

  if (!newProgress) {
    return changes;
  }

  // Check for plan completion
  if (newProgress.status === 'completed' && oldProgress?.status !== 'completed') {
    changes.push({
      type: 'plan_complete',
      planId: newProgress.plan_id,
      planName: newProgress.plan_name,
      completedAt: newProgress.completedAt || new Date().toISOString(),
      completionPercentage: 100,
    });
  }

  // Iterate through phases
  for (const newPhase of newProgress.phases || []) {
    const oldPhase = oldProgress?.phases?.find(p => p.phase_id === newPhase.phase_id);

    // Check for phase completion
    if (newPhase.status === 'completed' && oldPhase?.status !== 'completed') {
      changes.push({
        type: 'phase_advance',
        phaseId: newPhase.phase_id,
        phaseName: newPhase.name,
        completedAt: newPhase.completedAt || new Date().toISOString(),
        tasksCompleted: newPhase.tasks?.filter(t => t.status === 'completed').length || 0,
        totalTasks: newPhase.tasks?.length || 0,
      });
    }

    // Check for task changes within phase
    for (const newTask of newPhase.tasks || []) {
      const oldTask = oldPhase?.tasks?.find(t => t.id === newTask.id);

      // Task completion
      if (newTask.status === 'completed' && oldTask?.status !== 'completed') {
        changes.push({
          type: 'task_complete',
          taskId: newTask.id,
          taskTitle: newTask.title,
          phaseId: newPhase.phase_id,
          phaseName: newPhase.name,
          completedAt: newTask.completedAt || new Date().toISOString(),
          summary: newTask.summary,
          artifacts: newTask.artifacts,
        });
      }

      // Task blocked
      if (newTask.status === 'blocked' && oldTask?.status !== 'blocked') {
        changes.push({
          type: 'blocker',
          taskId: newTask.id,
          taskTitle: newTask.title,
          phaseId: newPhase.phase_id,
          phaseName: newPhase.name,
          blocker: newTask.blocker || 'No details provided',
          blockedAt: new Date().toISOString(),
        });
      }

      // Task failed
      if (newTask.status === 'failed' && oldTask?.status !== 'failed') {
        changes.push({
          type: 'task_failed',
          taskId: newTask.id,
          taskTitle: newTask.title,
          phaseId: newPhase.phase_id,
          phaseName: newPhase.name,
          error: newTask.error || 'No error details',
          failedAt: new Date().toISOString(),
        });
      }
    }
  }

  return changes;
}

/**
 * Check if sync should be triggered based on changes and config
 *
 * @param {Array<Object>} changes - Detected changes
 * @param {Object} config - Sync configuration
 * @returns {boolean} True if sync should occur
 */
function shouldSync(changes, config) {
  if (!changes || changes.length === 0) {
    return false;
  }

  if (!config || !config.enabled) {
    return false;
  }

  // Check if any change type matches enabled triggers
  const triggers = config.triggers || {};

  for (const change of changes) {
    switch (change.type) {
      case 'task_complete':
        if (triggers.onTaskComplete) return true;
        break;
      case 'phase_advance':
        if (triggers.onPhaseComplete) return true;
        break;
      case 'blocker':
        if (triggers.onBlocker) return true;
        break;
      case 'plan_complete':
        if (triggers.onPlanComplete) return true;
        break;
      case 'task_failed':
        if (triggers.onTaskFailed) return true;
        break;
    }
  }

  return false;
}

/**
 * Check debounce: return true if enough time has passed since last sync
 *
 * @param {string} progressFile - Progress file path (cache key)
 * @param {number} debounceMs - Debounce time in milliseconds
 * @returns {boolean} True if sync should proceed (debounce passed)
 */
function checkDebounce(progressFile, debounceMs = 5000) {
  const now = Date.now();
  const lastSync = syncStateCache.get(progressFile);

  if (!lastSync) {
    return true; // First sync for this file
  }

  const elapsed = now - lastSync;
  return elapsed >= debounceMs;
}

/**
 * Update debounce state for a progress file
 *
 * @param {string} progressFile - Progress file path (cache key)
 */
function updateDebounceState(progressFile) {
  syncStateCache.set(progressFile, Date.now());
}

/**
 * Spawn L3 worker agent to sync changes to GitHub
 *
 * Uses Task tool with run_in_background: true
 *
 * @param {string} issueNumber - GitHub issue number
 * @param {string} progressFile - Absolute path to PROGRESS.json
 * @param {Array<Object>} changes - Detected changes
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Task spawn result
 */
async function spawnSyncWorker(issueNumber, progressFile, changes, projectRoot) {
  // Build worker context
  const changeSummary = changes.map(c => {
    switch (c.type) {
      case 'task_complete':
        return `- Task completed: ${c.taskId} (${c.taskTitle})`;
      case 'phase_advance':
        return `- Phase completed: ${c.phaseName} (${c.phaseId})`;
      case 'blocker':
        return `- Task blocked: ${c.taskId} - ${c.blocker}`;
      case 'plan_complete':
        return `- Plan completed: ${c.planName}`;
      case 'task_failed':
        return `- Task failed: ${c.taskId} - ${c.error}`;
      default:
        return `- Change: ${c.type}`;
    }
  }).join('\n');

  // Extract repository info from config if available
  const config = loadConfig(projectRoot);
  const repository = config?.repository || 'owner/repo';

  const workerPrompt = `
You are a GitHub Issue Sync Worker (L3). Your task is to sync progress updates to a GitHub issue.

**Context:**
- Issue Number: #${issueNumber}
- Repository: ${repository}
- Progress File: ${progressFile}

**Changes Detected:**
${changeSummary}

**Instructions:**
1. Read the PROGRESS.json file at: ${progressFile}
2. Calculate current progress percentage (completed tasks / total tasks * 100)
3. Determine current phase status
4. Generate a progress bar visualization (e.g., "[████████░░] 80%")
5. Use gh CLI to add a comment to issue #${issueNumber} with:
   - Progress bar
   - Summary of changes
   - Current phase status table
   - List of remaining tasks in current phase
6. Update issue labels:
   - Add appropriate progress label (progress:0%, progress:25%, progress:50%, progress:75%, progress:100%)
   - Remove old progress labels
7. If plan is 100% complete, close the issue with completion message

**GitHub CLI Commands:**
\`\`\`bash
# Add comment
gh issue comment ${issueNumber} --body "<your_comment_body>"

# Update labels
gh issue edit ${issueNumber} --add-label "progress:XX%" --remove-label "progress:YY%"

# Close issue (only if 100% complete)
gh issue close ${issueNumber} --comment "Plan completed successfully!"
\`\`\`

**Completion Report:**
When done, report:
TASK_COMPLETE: sync-issue-${issueNumber}
SUMMARY: Posted progress update to issue #${issueNumber}
`.trim();

  // Log worker spawn
  logSyncEvent({
    type: 'worker_spawn',
    issueNumber,
    progressFile,
    changes: changes.length,
    timestamp: new Date().toISOString(),
  });

  // Return Task tool invocation structure
  return {
    tool: 'Task',
    params: {
      subagent_type: 'l3-worker',
      agent_name: 'github-issue-sync-worker',
      description: `Sync GitHub issue #${issueNumber} with progress updates`,
      prompt: workerPrompt,
      run_in_background: true,
      metadata: {
        issueNumber,
        progressFile,
        changeCount: changes.length,
        changeTypes: changes.map(c => c.type),
      },
    },
  };
}

/**
 * Log sync event to .claude/logs/progress-sync.log
 *
 * @param {Object} event - Event data to log
 */
function logSyncEvent(event) {
  try {
    const logDir = path.join(PROJECT_ROOT, '.claude', 'logs');
    const logFile = path.join(logDir, 'progress-sync.log');

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${JSON.stringify(event)}\n`;

    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    // Silent fail on logging errors
    console.error('Failed to log sync event:', error.message);
  }
}

/**
 * Log error to .claude/logs/progress-sync-errors.log
 *
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 */
function logError(message, details = {}) {
  try {
    const logDir = path.join(PROJECT_ROOT, '.claude', 'logs');
    const logFile = path.join(logDir, 'progress-sync-errors.log');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message}\n${JSON.stringify(details, null, 2)}\n\n`;

    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Failed to log error:', error.message);
  }
}

/**
 * Check if file path matches PROGRESS.json pattern
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} True if matches **/PROGRESS.json
 */
function isProgressFile(filePath) {
  if (!filePath) return false;

  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('/PROGRESS.json') || normalized === 'PROGRESS.json';
}

/**
 * Load previous progress state from cache
 *
 * Cache location: .claude/cache/progress-states/{hash}.json
 *
 * @param {string} progressFile - Progress file path
 * @param {string} projectRoot - Project root
 * @returns {Object|null} Cached progress state or null
 */
function loadCachedProgress(progressFile, projectRoot) {
  try {
    const cacheDir = path.join(projectRoot, '.claude', 'cache', 'progress-states');
    const fileHash = Buffer.from(progressFile).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const cachePath = path.join(cacheDir, `${fileHash}.json`);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return cached.progress || null;
  } catch (error) {
    logError('Failed to load cached progress', { progressFile, error: error.message });
    return null;
  }
}

/**
 * Save current progress state to cache
 *
 * @param {string} progressFile - Progress file path
 * @param {Object} progress - Progress data to cache
 * @param {string} projectRoot - Project root
 */
function cacheProgress(progressFile, progress, projectRoot) {
  try {
    const cacheDir = path.join(projectRoot, '.claude', 'cache', 'progress-states');

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const fileHash = Buffer.from(progressFile).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const cachePath = path.join(cacheDir, `${fileHash}.json`);

    fs.writeFileSync(cachePath, JSON.stringify({
      progressFile,
      progress,
      cachedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch (error) {
    logError('Failed to cache progress', { progressFile, error: error.message });
  }
}

/**
 * Main hook handler
 *
 * @param {Object} context - Hook context from Claude Code CLI
 * @returns {Object} Hook result { continue, message, metadata }
 */
async function progressSyncHook(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only process Write and Edit operations
  if (!['Write', 'Edit'].includes(tool)) {
    return { continue: true };
  }

  // Check if target file is PROGRESS.json
  const filePath = toolInput?.file_path;
  if (!isProgressFile(filePath)) {
    return { continue: true };
  }

  // Resolve absolute path
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath);

  // Load configuration
  const config = loadConfig(projectRoot);
  if (!config || !config.enabled) {
    return { continue: true };
  }

  // Check if issue is linked
  if (!config.issueNumber) {
    logSyncEvent({
      type: 'skip_no_issue',
      progressFile: absolutePath,
      reason: 'No issue number in config',
      timestamp: new Date().toISOString(),
    });
    return { continue: true };
  }

  // Load old and new progress states
  const oldProgress = loadCachedProgress(absolutePath, projectRoot);
  const newProgress = loadProgressFile(absolutePath);

  if (!newProgress) {
    logError('Failed to load new progress file', { filePath: absolutePath });
    return { continue: true };
  }

  // Detect changes
  const changes = detectChanges(oldProgress, newProgress);

  // Check if sync should occur
  if (!shouldSync(changes, config)) {
    // Cache current state even if not syncing
    cacheProgress(absolutePath, newProgress, projectRoot);
    return { continue: true };
  }

  // Check debounce
  const debounceMs = config.debounceMs || 5000;
  if (!checkDebounce(absolutePath, debounceMs)) {
    logSyncEvent({
      type: 'skip_debounce',
      progressFile: absolutePath,
      changeCount: changes.length,
      timestamp: new Date().toISOString(),
    });
    return { continue: true };
  }

  // Update debounce state
  updateDebounceState(absolutePath);

  // Spawn L3 worker agent
  const workerResult = await spawnSyncWorker(
    config.issueNumber,
    absolutePath,
    changes,
    projectRoot
  );

  // Cache current progress state
  cacheProgress(absolutePath, newProgress, projectRoot);

  // Log sync event
  logSyncEvent({
    type: 'sync_triggered',
    issueNumber: config.issueNumber,
    progressFile: absolutePath,
    changes: changes.map(c => ({ type: c.type, taskId: c.taskId, phaseId: c.phaseId })),
    workerSpawned: true,
    timestamp: new Date().toISOString(),
  });

  // Build response message
  let message = '';
  if (changes.length > 0) {
    message += `Progress sync triggered for issue #${config.issueNumber}\n`;
    message += `Changes detected: ${changes.map(c => c.type).join(', ')}\n`;
    message += `Spawning L3 worker (github-issue-sync-worker) for GitHub sync...\n`;
  }

  return {
    continue: true,
    message: message || undefined,
    metadata: {
      progressSync: {
        issueNumber: config.issueNumber,
        changes: changes.length,
        workerSpawned: true,
        debounceMs,
      },
    },
    // Pass Task tool invocation to Claude Code CLI
    taskSpawn: workerResult,
  };
}

module.exports = progressSyncHook;

// Export for testing
module.exports.loadConfig = loadConfig;
module.exports.loadProgressFile = loadProgressFile;
module.exports.detectChanges = detectChanges;
module.exports.shouldSync = shouldSync;
module.exports.checkDebounce = checkDebounce;
module.exports.spawnSyncWorker = spawnSyncWorker;
module.exports.isProgressFile = isProgressFile;
module.exports.loadCachedProgress = loadCachedProgress;
module.exports.cacheProgress = cacheProgress;
