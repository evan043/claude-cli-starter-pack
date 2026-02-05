/**
 * Progress Sync Hook Template
 *
 * Monitors PROGRESS.json and ROADMAP.json writes and syncs
 * completion status to linked GitHub issues using direct gh CLI.
 *
 * Event: PostToolUse
 * Matcher: Write|Edit
 *
 * Reads from stdin (Claude Code passes tool info as JSON).
 * Auto-detects issue numbers from the JSON file's own metadata.
 *
 * Features:
 * - Change detection (task/phase/plan completion)
 * - Debounce logic to prevent sync spam
 * - Direct gh CLI execution (hooks cannot use Task tool)
 * - Auto-detects issue numbers from JSON metadata
 * - Supports both PROGRESS.json and ROADMAP.json
 * - Comprehensive logging
 * - Configurable sync triggers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const LOG_DIR = path.join(PROJECT_ROOT, '.claude', 'logs');
const CACHE_DIR = path.join(PROJECT_ROOT, '.claude', 'cache', 'progress-states');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.claude', 'config', 'progress-sync-config.json');
const DEBOUNCE_MS = 10000;

/**
 * Log a sync event
 */
function log(level, message, data) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const ts = new Date().toISOString();
    const entry = `[${ts}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'progress-sync.log'), entry, 'utf8');
  } catch { /* silent */ }
}

/**
 * Load sync config
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch { /* silent */ }
  return { enabled: true, sync_on: ['task_complete', 'phase_advance', 'plan_complete'] };
}

/**
 * Check if a file path is a tracked progress/roadmap JSON
 */
function isTrackedFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('/PROGRESS.json') ||
         normalized.endsWith('/ROADMAP.json') ||
         normalized === 'PROGRESS.json' ||
         normalized === 'ROADMAP.json';
}

/**
 * Extract GitHub issue info from the JSON data itself.
 * Checks multiple locations where issue numbers can live.
 */
function extractIssueInfo(data) {
  const issues = {};

  const epicIssue = data.metadata?.github_epic_number ||
                    data.metadata?.epic_issue_number ||
                    data.github_issue_number;
  if (epicIssue) issues.epic = epicIssue;

  const phases = data.phases || [];
  for (const phase of phases) {
    const phaseIssue = phase.github_issue_number;
    if (phaseIssue) {
      issues[`phase-${phase.id || phase.phase_id}`] = phaseIssue;
    }
  }

  return issues;
}

/**
 * Detect what changed by comparing cached vs current state
 */
function detectChanges(cached, current) {
  const changes = [];
  if (!current) return changes;

  if (current.status === 'completed' && cached?.status !== 'completed') {
    changes.push({ type: 'plan_complete', name: current.title || current.slug });
  }

  const currentPhases = current.phases || [];
  const cachedPhases = cached?.phases || [];

  for (const phase of currentPhases) {
    const phaseId = phase.id || phase.phase_id;
    const cachedPhase = cachedPhases.find(p => (p.id || p.phase_id) === phaseId);

    if (phase.status === 'completed' && cachedPhase?.status !== 'completed') {
      changes.push({
        type: 'phase_advance',
        phaseId,
        name: phase.name || phase.phase_title,
        completion: phase.completion_percentage || 100,
      });
    }

    const currentTasks = phase.tasks || [];
    const cachedTasks = cachedPhase?.tasks || [];

    for (const task of currentTasks) {
      const cachedTask = cachedTasks.find(t => t.id === task.id);
      if (task.completed && !cachedTask?.completed) {
        changes.push({
          type: 'task_complete',
          taskId: task.id,
          description: task.description,
          phaseId,
        });
      }
      if (task.status === 'completed' && cachedTask?.status !== 'completed') {
        changes.push({
          type: 'task_complete',
          taskId: task.id,
          description: task.title || task.description,
          phaseId,
        });
      }
    }
  }

  return changes;
}

/**
 * Build progress bar string
 */
function progressBar(pct) {
  const filled = Math.floor(pct / 10);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled) + ` ${pct}%`;
}

/**
 * Calculate overall completion from phases
 */
function calcCompletion(data) {
  if (data.completion_percentage !== undefined) return data.completion_percentage;
  const phases = data.phases || [];
  if (phases.length === 0) return 0;
  const completed = phases.filter(p => p.status === 'completed').length;
  return Math.round((completed / phases.length) * 100);
}

/**
 * Post a progress comment to a GitHub issue
 */
function postProgressComment(issueNumber, data, changes) {
  const pct = calcCompletion(data);
  const phases = data.phases || [];
  const title = data.title || data.slug || 'Development Plan';

  const phaseLines = phases.map(p => {
    const status = p.status === 'completed' ? '\u2713' :
                   p.status === 'in_progress' ? '\u25B6' :
                   p.status === 'blocked' ? '\u2717' : '\u25CB';
    const name = p.name || p.phase_title || `Phase ${p.id || p.phase_id}`;
    const phasePct = p.completion_percentage !== undefined ? p.completion_percentage : (p.status === 'completed' ? 100 : 0);
    return `| ${status} | ${name} | ${phasePct}% |`;
  }).join('\n');

  const changeSummary = changes.slice(0, 5).map(c => {
    if (c.type === 'plan_complete') return `- Plan completed: ${c.name}`;
    if (c.type === 'phase_advance') return `- Phase completed: ${c.name}`;
    if (c.type === 'task_complete') return `- Task done: ${c.taskId} - ${(c.description || '').slice(0, 80)}`;
    return `- ${c.type}`;
  }).join('\n');

  const comment = `### Progress Update - ${title}\n\n${progressBar(pct)} (${phases.filter(p => p.status === 'completed').length}/${phases.length} phases)\n\n| Status | Phase | Progress |\n|--------|-------|----------|\n${phaseLines}\n\n**Latest changes:**\n${changeSummary || '_No specific changes detected_'}\n\n---\n*Auto-synced by progress-sync hook*`;

  const tmpFile = path.join(CACHE_DIR, 'tmp-progress-comment.md');
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(tmpFile, comment, 'utf8');

  try {
    execSync(`gh issue comment ${issueNumber} --body-file "${tmpFile}"`, {
      stdio: 'pipe',
      timeout: 15000,
    });
    log('info', `Posted progress comment to #${issueNumber}`, { pct });
    return true;
  } catch (err) {
    log('error', `Failed to post comment to #${issueNumber}`, { error: err.message });
    return false;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* silent */ }
  }
}

/**
 * Close a GitHub issue when plan reaches 100%
 */
function closeIssueIfComplete(issueNumber, data) {
  const pct = calcCompletion(data);
  if (pct < 100) return false;

  const title = data.title || data.slug || 'Plan';
  try {
    execSync(
      `gh issue close ${issueNumber} --comment "All phases completed for: ${title}"`,
      { stdio: 'pipe', timeout: 15000 }
    );
    log('info', `Closed issue #${issueNumber} (100% complete)`);
    return true;
  } catch (err) {
    log('error', `Failed to close #${issueNumber}`, { error: err.message });
    return false;
  }
}

/**
 * Load cached state for a file
 */
function loadCache(filePath) {
  try {
    const hash = Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    const cachePath = path.join(CACHE_DIR, `${hash}.json`);
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  } catch { /* silent */ }
  return null;
}

/**
 * Save state to cache
 */
function saveCache(filePath, data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const hash = Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    const cachePath = path.join(CACHE_DIR, `${hash}.json`);
    fs.writeFileSync(cachePath, JSON.stringify({
      filePath, data, cachedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch { /* silent */ }
}

/** Debounce map (in-memory, per process) */
const debounceMap = new Map();
function debounceOk(filePath) {
  const now = Date.now();
  const last = debounceMap.get(filePath);
  if (last && (now - last) < DEBOUNCE_MS) return false;
  debounceMap.set(filePath, now);
  return true;
}

/** Check if gh CLI is available */
function hasGh() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Main hook entry point - reads stdin, processes Write/Edit events
 */
async function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    return;
  }

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    return;
  }

  const toolName = hookData.tool_name || hookData.name || '';
  if (!['Write', 'Edit'].includes(toolName)) return;

  const filePath = hookData.tool_input?.file_path || hookData.input?.file_path || '';
  if (!isTrackedFile(filePath)) return;

  const config = loadConfig();
  if (!config.enabled) return;

  if (!debounceOk(filePath)) {
    log('debug', 'Debounced', { filePath });
    return;
  }

  if (!hasGh()) {
    log('warn', 'gh CLI not available, skipping sync');
    return;
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  let currentData;
  try {
    currentData = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    log('error', 'Failed to read tracked file', { filePath: absPath });
    return;
  }

  const issues = extractIssueInfo(currentData);
  if (Object.keys(issues).length === 0) {
    log('debug', 'No GitHub issues linked in file', { filePath });
    saveCache(absPath, currentData);
    return;
  }

  const cached = loadCache(absPath);
  const cachedData = cached?.data || null;
  const changes = detectChanges(cachedData, currentData);
  const syncOn = config.sync_on || ['task_complete', 'phase_advance', 'plan_complete'];
  const relevantChanges = changes.filter(c => syncOn.includes(c.type));

  if (relevantChanges.length === 0) {
    saveCache(absPath, currentData);
    return;
  }

  log('info', `Changes detected: ${relevantChanges.length}`, {
    types: relevantChanges.map(c => c.type),
    filePath,
  });

  // Sync to epic issue
  if (issues.epic) {
    postProgressComment(issues.epic, currentData, relevantChanges);
    if (relevantChanges.some(c => c.type === 'plan_complete')) {
      closeIssueIfComplete(issues.epic, currentData);
    }
  }

  // Sync to individual phase issues
  for (const change of relevantChanges) {
    if (change.type === 'phase_advance' && change.phaseId) {
      const phaseIssue = issues[`phase-${change.phaseId}`];
      if (phaseIssue) {
        try {
          execSync(
            `gh issue close ${phaseIssue} --comment "Phase completed: ${change.name}"`,
            { stdio: 'pipe', timeout: 15000 }
          );
          log('info', `Closed phase issue #${phaseIssue}`, { phase: change.name });
        } catch (err) {
          log('error', `Failed to close phase issue #${phaseIssue}`, { error: err.message });
        }
      }
    }
  }

  saveCache(absPath, currentData);
  log('info', 'Sync complete', { epicIssue: issues.epic, changesProcessed: relevantChanges.length });
}

main().catch(err => {
  if (process.env.DEBUG) {
    console.error('progress-sync hook error:', err);
  }
});
