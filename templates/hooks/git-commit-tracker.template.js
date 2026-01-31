#!/usr/bin/env node
/**
 * Git Commit Tracker Hook
 *
 * Tracks git commits during phased development and updates PROGRESS.json.
 * Enables rollback support by maintaining commit history per phase.
 *
 * Event: PostToolUse (Bash)
 * Trigger: Commands containing "git commit"
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 *
 * Features:
 * - Extracts commit hashes from git output
 * - Detects phase/task from commit messages
 * - Updates PROGRESS.json git_tracking section
 * - Maintains rollback-capable commit history
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  auto_detect_phase: true,       // Detect phase from commit message
  update_progress_json: true,    // Update PROGRESS.json with commits
  track_file_changes: false,     // Include list of modified files
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const STATE_FILE = path.join(process.cwd(), '.claude', 'hooks', 'config', 'phase-dev-state.json');

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.git_tracker || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Load current phase development state
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Use defaults
  }
  return {
    active_project: null,
    current_phase: null,
    current_section: null,
    last_commit: null,
  };
}

/**
 * Save phase development state
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error(`[git-tracker] Error saving state: ${e.message}`);
  }
}

/**
 * Extract commit hash from git commit output
 */
function extractCommitHash(output) {
  if (!output) return null;

  // Pattern: [branch_name hash] message
  const match = output.match(/\[[\w\/-]+\s+([a-f0-9]{7,40})\]/i);
  if (match) return match[1];

  // Alternative: HEAD is now at hash message
  const altMatch = output.match(/HEAD is now at ([a-f0-9]{7,40})/i);
  if (altMatch) return altMatch[1];

  return null;
}

/**
 * Detect phase/section from commit message
 */
function detectPhaseFromMessage(message) {
  if (!message) return null;

  // Pattern: feat(project): Complete Phase N - ...
  const phaseMatch = message.match(/Phase\s+(\d+)/i);
  if (phaseMatch) {
    return {
      phase_number: parseInt(phaseMatch[1], 10),
      is_phase_complete: message.toLowerCase().includes('complete phase'),
    };
  }

  // Pattern: P1-T1 style
  const taskMatch = message.match(/P(\d+)-T(\d+)/i);
  if (taskMatch) {
    return {
      phase_number: parseInt(taskMatch[1], 10),
      task_id: `P${taskMatch[1]}-T${taskMatch[2]}`,
      is_phase_complete: false,
    };
  }

  return null;
}

/**
 * Find PROGRESS.json for the active project
 */
function findProgressJson(projectSlug) {
  const possiblePaths = [
    path.join(process.cwd(), '.claude', 'docs', projectSlug, 'PROGRESS.json'),
    path.join(process.cwd(), '.claude', 'commands', `phase-dev-${projectSlug}`, 'PROGRESS.json'),
    path.join(process.cwd(), '.claude', 'docs', `phased-dev-${projectSlug}`, 'PROGRESS.json'),
    path.join(process.cwd(), 'PROGRESS.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Update PROGRESS.json with new commit information
 */
function updateProgressJson(progressPath, commitInfo) {
  try {
    const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

    // Initialize git_tracking if not exists
    if (!progress.git_tracking) {
      progress.git_tracking = {
        pre_start_commit: null,
        phase_commits: [],
        current_stable_commit: null,
      };
    }

    // Add new commit entry
    const commitEntry = {
      phase_number: commitInfo.phase_number || progress.current_phase || 1,
      section_id: commitInfo.section_id || `commit-${Date.now()}`,
      commit_hash: commitInfo.hash,
      timestamp: new Date().toISOString(),
      tasks_completed: commitInfo.tasks || [],
      files_modified: commitInfo.files || [],
      test_status: 'pending',
    };

    progress.git_tracking.phase_commits.push(commitEntry);
    progress.git_tracking.current_stable_commit = commitInfo.hash;
    progress.last_updated = new Date().toISOString();

    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    return true;
  } catch (e) {
    console.error(`[git-tracker] Error updating PROGRESS.json: ${e.message}`);
    return false;
  }
}

/**
 * Main hook handler
 */
module.exports = async function gitCommitTracker(context) {
  const approve = () => ({ continue: true });

  try {
    const config = loadConfig();

    if (!config.enabled) {
      return approve();
    }

    // Parse hook input
    let input;
    try {
      input = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');
    } catch (e) {
      return approve();
    }

    const { tool_name, tool_input, tool_output } = input;

    // Only process Bash tool with git commit commands
    if (tool_name !== 'Bash') {
      return approve();
    }

    const command = tool_input?.command || '';
    if (!command.includes('git commit')) {
      return approve();
    }

    // Extract commit hash from output
    const commitHash = extractCommitHash(tool_output);
    if (!commitHash) {
      return approve();
    }

    // Load state
    const state = loadState();

    // Detect phase from commit message
    const commitMessage = command.match(/-m\s+["']([^"']+)["']/)?.[1] || '';
    const phaseInfo = config.auto_detect_phase ? detectPhaseFromMessage(commitMessage) : null;

    // Update state with new commit
    state.last_commit = {
      hash: commitHash,
      message: commitMessage,
      timestamp: new Date().toISOString(),
      phase_info: phaseInfo,
    };
    saveState(state);

    // Update PROGRESS.json if we have an active project
    if (config.update_progress_json && state.active_project) {
      const progressPath = findProgressJson(state.active_project);
      if (progressPath) {
        const updated = updateProgressJson(progressPath, {
          hash: commitHash,
          phase_number: phaseInfo?.phase_number,
          section_id: phaseInfo?.is_phase_complete
            ? `phase-${phaseInfo.phase_number}-complete`
            : phaseInfo?.task_id || `commit-${commitHash.substring(0, 7)}`,
          tasks: phaseInfo?.task_id ? [phaseInfo.task_id] : [],
          files: [],
        });

        if (updated) {
          console.log(`[git-tracker] Commit ${commitHash.substring(0, 7)} tracked in PROGRESS.json`);
        }
      }
    } else {
      console.log(`[git-tracker] Commit detected: ${commitHash.substring(0, 7)}`);
    }

    return approve();
  } catch (error) {
    console.error(`[git-tracker] Error: ${error.message}`);
    return approve();
  }
};
