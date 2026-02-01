/**
 * VDB Configuration Module
 *
 * Manages Vision Driver Bot configuration including:
 * - Board connections (GitHub, Jira, etc.)
 * - Execution settings
 * - Decision engine parameters
 * - Scheduling options
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = '.claude/vdb';
const CONFIG_FILE = 'config.json';
const STATE_FILE = 'state.json';

/**
 * Default VDB configuration
 */
export const VDBConfig = {
  // Version for config migrations
  version: '1.0.0',

  // Bot identity
  bot: {
    name: 'Vision Driver Bot',
    emoji: '🤖',
    commitAuthor: 'Vision Driver Bot',
    commitEmail: 'vdb@users.noreply.github.com'
  },

  // Board connections
  boards: {
    // Primary board (source of truth)
    primary: 'github',

    github: {
      enabled: true,
      owner: '', // Set during init
      repo: '', // Set during init
      projectNumber: null, // GitHub Project V2 number
      useProjectBoard: true, // Use GitHub Projects vs just Issues
      labels: {
        epic: 'epic',
        phase: 'phase-dev',
        vdbManaged: 'vdb-managed',
        inProgress: 'vdb-in-progress',
        completed: 'vdb-completed',
        blocked: 'vdb-blocked'
      },
      customFields: {
        status: 'Status',
        priority: 'Priority',
        complexity: 'Complexity',
        epicType: 'Epic Type',
        visionAlignment: 'Vision Alignment'
      }
    },

    jira: {
      enabled: false,
      baseUrl: '',
      projectKey: '',
      boardId: null,
      // Credentials via environment variables
      // JIRA_EMAIL, JIRA_API_TOKEN
    },

    local: {
      enabled: true, // Always enabled as fallback
      epicDir: '.claude/github-epics',
      roadmapDir: '.claude/roadmaps',
      visionFile: '.claude/vision/active-vision.json'
    }
  },

  // Watcher settings
  watcher: {
    // Poll interval for scheduled runs (cron syntax)
    pollInterval: '*/15 * * * *', // Every 15 minutes

    // What to look for
    scanFor: {
      readyPhases: true, // Phases with resolved dependencies
      staleTasks: true, // Tasks not updated in X days
      unassignedWork: true, // Work without assignee
      blockedItems: true // Check if blockers resolved
    },

    // Staleness threshold (days)
    staleThresholdDays: 3,

    // Maximum items to queue per scan
    maxQueuePerScan: 5
  },

  // Queue settings
  queue: {
    // Maximum queue size
    maxSize: 20,

    // Prioritization strategy
    strategy: 'priority', // 'fifo' | 'priority' | 'balanced'

    // Balance ratio for 'balanced' strategy
    balanceRatio: {
      feature: 3,
      platform: 1,
      techDebt: 1
    },

    // Retry settings
    maxRetries: 3,
    retryDelayMinutes: 5
  },

  // Execution settings
  execution: {
    // Execution mode
    mode: 'github-actions', // 'github-actions' | 'local' | 'api-only'

    // Claude Code CLI settings
    claudeCode: {
      command: 'claude',
      args: ['--print', '--dangerously-skip-permissions'],
      timeoutMinutes: 60
    },

    // Concurrent execution limit
    maxConcurrent: 1,

    // Auto-commit changes
    autoCommit: true,
    commitMessagePrefix: '🤖 VDB:',

    // Auto-push changes
    autoPush: true,

    // Branch strategy
    branchStrategy: 'feature', // 'main' | 'feature' | 'phase'
    branchPrefix: 'vdb/'
  },

  // Decision engine settings
  decisionEngine: {
    // Enable AI-powered decisions
    enabled: true,

    // Model for decision making
    model: 'claude-sonnet-4-20250514',

    // Decision triggers
    triggers: {
      onTaskComplete: true,
      onTaskFailed: true,
      onPhaseComplete: true,
      onEpicComplete: true,
      onDailySchedule: true,
      onBalanceCheck: true
    },

    // Balance thresholds
    balance: {
      minFeatureRatio: 0.5,
      maxFeatureRatio: 0.8,
      techDebtThreshold: 0.2
    },

    // Gap analysis
    gapAnalysis: {
      enabled: true,
      scanFrequency: 'weekly', // 'daily' | 'weekly' | 'on-epic-complete'
      checkAreas: ['testing', 'documentation', 'security', 'performance']
    }
  },

  // Reporting settings
  reporting: {
    // Post progress comments to issues
    progressComments: true,
    progressInterval: 25, // Post at 25%, 50%, 75%, 100%

    // Update project board fields
    updateProjectFields: true,

    // Create summary issues
    summaryIssues: {
      enabled: true,
      frequency: 'weekly' // 'daily' | 'weekly' | 'on-complete'
    },

    // Notifications
    notifications: {
      slack: {
        enabled: false,
        webhookUrl: '' // Via SLACK_WEBHOOK_URL env
      },
      discord: {
        enabled: false,
        webhookUrl: '' // Via DISCORD_WEBHOOK_URL env
      }
    }
  },

  // Safety settings
  safety: {
    // Dry run mode (scan only, no execution)
    dryRun: false,

    // Require approval for certain actions
    requireApproval: {
      deleteFiles: true,
      modifyConfig: true,
      deploymentActions: true
    },

    // File patterns to never modify
    protectedPatterns: [
      '.env*',
      '**/credentials*',
      '**/secrets*',
      '**/*.pem',
      '**/*.key'
    ],

    // Maximum files to modify per task
    maxFilesPerTask: 50,

    // Pause on error threshold
    pauseOnErrorCount: 3
  },

  // Logging
  logging: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    logDir: '.claude/vdb/logs',
    rotateAfterMB: 10,
    retainDays: 30
  }
};

/**
 * Load VDB configuration
 */
export async function loadConfig(projectRoot) {
  const configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE);

  if (!existsSync(configPath)) {
    return { ...VDBConfig };
  }

  try {
    const fileContent = readFileSync(configPath, 'utf8');
    const savedConfig = JSON.parse(fileContent);

    // Merge with defaults (in case new fields added)
    return deepMerge(VDBConfig, savedConfig);
  } catch (error) {
    console.error(`[VDB] Error loading config: ${error.message}`);
    return { ...VDBConfig };
  }
}

/**
 * Save VDB configuration
 */
export async function saveConfig(projectRoot, config) {
  const configDir = join(projectRoot, CONFIG_DIR);
  const configPath = join(configDir, CONFIG_FILE);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  config.updated = new Date().toISOString();
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

  return config;
}

/**
 * Create default configuration for a project
 */
export async function createDefaultConfig(projectRoot, options = {}) {
  const config = { ...VDBConfig };

  // Try to detect GitHub info from git remote
  const gitInfo = await detectGitInfo(projectRoot);
  if (gitInfo) {
    config.boards.github.owner = gitInfo.owner;
    config.boards.github.repo = gitInfo.repo;
  }

  // Apply any overrides
  if (options.github) {
    config.boards.github = { ...config.boards.github, ...options.github };
  }
  if (options.jira) {
    config.boards.jira = { ...config.boards.jira, ...options.jira };
  }
  if (options.execution) {
    config.execution = { ...config.execution, ...options.execution };
  }

  config.created = new Date().toISOString();

  return saveConfig(projectRoot, config);
}

/**
 * Load VDB state
 */
export async function loadState(projectRoot) {
  const statePath = join(projectRoot, CONFIG_DIR, STATE_FILE);

  if (!existsSync(statePath)) {
    return {
      initialized: false,
      lastScan: null,
      lastExecution: null,
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      currentlyExecuting: null,
      pausedReason: null
    };
  }

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return { initialized: false };
  }
}

/**
 * Save VDB state
 */
export async function saveState(projectRoot, state) {
  const configDir = join(projectRoot, CONFIG_DIR);
  const statePath = join(configDir, STATE_FILE);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  state.updated = new Date().toISOString();
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Detect Git info from remote
 */
async function detectGitInfo(projectRoot) {
  try {
    const { execSync } = await import('child_process');
    const remote = execSync('git remote get-url origin', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Parse GitHub URL
    // https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const httpsMatch = remote.match(/github\.com\/([^/]+)\/([^/.]+)/);
    const sshMatch = remote.match(/github\.com:([^/]+)\/([^/.]+)/);

    const match = httpsMatch || sshMatch;
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace('.git', '')
      };
    }
  } catch {
    // Not a git repo or no remote
  }

  return null;
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

export default {
  VDBConfig,
  loadConfig,
  saveConfig,
  createDefaultConfig,
  loadState,
  saveState
};
