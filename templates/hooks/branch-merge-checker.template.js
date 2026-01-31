#!/usr/bin/env node
/**
 * Branch Merge Checker Hook
 *
 * Validates main branch sync status before deployments.
 * Ensures clean working directory and proper sync with origin.
 *
 * Event: UserPromptSubmit
 * Trigger: Deployment commands or manual invocation
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 *
 * Features:
 * - Verifies current branch is main/master
 * - Checks sync status with origin
 * - Detects uncommitted changes
 * - Generates actionable recommendations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  block_on_dirty: false,         // Block deployments if working directory dirty
  block_on_behind: false,        // Block deployments if behind origin
  main_branch: null,             // Auto-detect if null (main or master)
  check_on_deploy_commands: true, // Auto-check on deploy-related commands
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');

// Deploy-related trigger words
const DEPLOY_TRIGGERS = [
  'deploy',
  '/deploy',
  'railway',
  'cloudflare',
  'wrangler',
  'publish',
  'release',
  'production',
];

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.branch_checker || {}) };
    }
  } catch (e) {
    // Use defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Execute a git command and return output
 */
function git(command) {
  try {
    return execSync(`git ${command}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Get current branch name
 */
function getCurrentBranch() {
  return git('branch --show-current');
}

/**
 * Detect main branch (main or master)
 */
function getMainBranch(configBranch) {
  if (configBranch) return configBranch;
  return git('rev-parse --verify main') ? 'main' : 'master';
}

/**
 * Check if working directory has uncommitted changes
 */
function hasUncommittedChanges() {
  try {
    const output = execSync('git status --porcelain', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get ahead/behind counts relative to origin
 */
function getOriginDelta(mainBranch) {
  const originBranch = `origin/${mainBranch}`;

  const ahead = git(`rev-list --count ${originBranch}..${mainBranch}`);
  const behind = git(`rev-list --count ${mainBranch}..${originBranch}`);

  return {
    ahead: parseInt(ahead || '0', 10),
    behind: parseInt(behind || '0', 10),
  };
}

/**
 * Analyze branch status
 */
function analyzeBranches(config) {
  const currentBranch = getCurrentBranch();
  const mainBranch = getMainBranch(config.main_branch);
  const delta = getOriginDelta(mainBranch);
  const hasChanges = hasUncommittedChanges();

  return {
    currentBranch,
    mainBranch,
    isOnMain: currentBranch === mainBranch,
    ahead: delta.ahead,
    behind: delta.behind,
    hasChanges,
    isClean: !hasChanges && delta.ahead === 0 && delta.behind === 0,
  };
}

/**
 * Generate status report
 */
function generateReport(analysis) {
  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push('║                    BRANCH STATUS CHECK                            ║');
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Branch status
  if (!analysis.isOnMain) {
    lines.push(`⚠️  NOT ON MAIN: Currently on '${analysis.currentBranch}', expected '${analysis.mainBranch}'`);
  } else {
    lines.push(`✅ BRANCH: On ${analysis.mainBranch}`);
  }

  // Sync status
  if (analysis.behind > 0) {
    lines.push(`⚠️  BEHIND: ${analysis.behind} commit(s) behind origin/${analysis.mainBranch}`);
  }
  if (analysis.ahead > 0) {
    lines.push(`📤 AHEAD: ${analysis.ahead} commit(s) ahead of origin/${analysis.mainBranch}`);
  }
  if (analysis.ahead === 0 && analysis.behind === 0) {
    lines.push('✅ SYNC: In sync with origin');
  }

  // Working directory
  if (analysis.hasChanges) {
    lines.push('⚠️  DIRTY: Uncommitted changes detected');
  } else {
    lines.push('✅ CLEAN: No uncommitted changes');
  }

  lines.push('');

  // Overall status
  if (analysis.isClean && analysis.isOnMain) {
    lines.push('✅ READY FOR DEPLOYMENT');
  } else {
    lines.push('⚠️  NEEDS ATTENTION BEFORE DEPLOYMENT');
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Check if prompt contains deployment triggers
 */
function isDeploymentCommand(prompt) {
  const lowerPrompt = (prompt || '').toLowerCase();
  return DEPLOY_TRIGGERS.some(trigger => lowerPrompt.includes(trigger));
}

/**
 * Main hook handler
 */
module.exports = async function branchMergeChecker(context) {
  const approve = () => ({ continue: true });
  const block = (reason) => ({ continue: false, message: reason });

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

    const userPrompt = input.user_prompt || input.prompt || '';

    // Check if this is a deployment command
    if (config.check_on_deploy_commands && !isDeploymentCommand(userPrompt)) {
      return approve();
    }

    // Analyze branch status
    const analysis = analyzeBranches(config);

    // Generate and output report
    const report = generateReport(analysis);
    console.log(report);

    // Check blocking conditions
    if (config.block_on_dirty && analysis.hasChanges) {
      return block('Deployment blocked: Uncommitted changes detected. Commit or stash your changes first.');
    }

    if (config.block_on_behind && analysis.behind > 0) {
      return block(`Deployment blocked: Branch is ${analysis.behind} commit(s) behind origin. Run 'git pull' first.`);
    }

    return approve();
  } catch (error) {
    console.error(`[branch-checker] Error: ${error.message}`);
    return approve();
  }
};

// Direct execution support
if (require.main === module) {
  const config = loadConfig();
  const analysis = analyzeBranches(config);
  console.log(generateReport(analysis));

  if (!analysis.isOnMain) {
    console.log(`Action: git checkout ${analysis.mainBranch}`);
  }
  if (analysis.behind > 0) {
    console.log(`Action: git pull origin ${analysis.mainBranch}`);
  }
  if (analysis.hasChanges) {
    console.log('Action: git status && git add . && git commit -m "..."');
  }
  if (analysis.ahead > 0) {
    console.log(`Action: git push origin ${analysis.mainBranch}`);
  }
}
