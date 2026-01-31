/**
 * Refactor Transaction Hook
 *
 * Provides atomic execution for refactoring operations.
 * Creates savepoints, manages rollback, ensures transactional integrity.
 * Prevents partial refactoring that leaves codebase in broken state.
 *
 * Event: PreToolUse (before Edit, Write operations)
 * Event: PostToolUse (after operations, for commit/rollback decisions)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/refactor-transaction.json',
  backupDir: '.claude/refactor-backups',
  maxSavepoints: 10,
  autoCommitOnSuccess: true,
  autoRollbackOnFailure: true,
  // Operations that trigger transaction tracking
  transactionOperations: ['Edit', 'Write'],
};

/**
 * Load transaction state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save transaction state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Create a backup of a file
 */
function backupFile(filePath, projectRoot, transactionId) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    return null; // New file, no backup needed
  }

  const backupDir = path.join(projectRoot, CONFIG.backupDir, transactionId);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, filePath.replace(/\//g, '_').replace(/\\/g, '_'));
  fs.copyFileSync(fullPath, backupPath);

  return backupPath;
}

/**
 * Restore a file from backup
 */
function restoreFile(filePath, projectRoot, transactionId) {
  const backupDir = path.join(projectRoot, CONFIG.backupDir, transactionId);
  const backupPath = path.join(backupDir, filePath.replace(/\//g, '_').replace(/\\/g, '_'));

  if (!fs.existsSync(backupPath)) {
    // File was new, delete it
    const fullPath = path.join(projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  const fullPath = path.join(projectRoot, filePath);
  fs.copyFileSync(backupPath, fullPath);
}

/**
 * Create git stash for transaction
 */
function createGitStash(projectRoot, transactionId) {
  try {
    execSync(`git stash push -m "refactor-transaction-${transactionId}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore from git stash
 */
function restoreGitStash(projectRoot, transactionId) {
  try {
    // Find the stash with our transaction ID
    const stashList = execSync('git stash list', {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    const stashMatch = stashList
      .split('\n')
      .find((line) => line.includes(`refactor-transaction-${transactionId}`));

    if (stashMatch) {
      const stashRef = stashMatch.split(':')[0];
      execSync(`git stash pop ${stashRef}`, {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Create a savepoint within a transaction
 */
function createSavepoint(state, name) {
  const savepoint = {
    id: `sp_${Date.now()}`,
    name: name || `savepoint_${state.savepoints.length + 1}`,
    timestamp: new Date().toISOString(),
    fileIndex: state.modifiedFiles.length,
  };

  state.savepoints.push(savepoint);

  // Limit savepoints
  if (state.savepoints.length > CONFIG.maxSavepoints) {
    state.savepoints.shift();
  }

  return savepoint;
}

/**
 * Rollback to a savepoint
 */
function rollbackToSavepoint(state, savepointId, projectRoot) {
  const savepointIndex = state.savepoints.findIndex((sp) => sp.id === savepointId);
  if (savepointIndex === -1) {
    return false;
  }

  const savepoint = state.savepoints[savepointIndex];

  // Restore files modified after savepoint
  const filesToRestore = state.modifiedFiles.slice(savepoint.fileIndex);
  for (const file of filesToRestore) {
    restoreFile(file.path, projectRoot, state.transactionId);
  }

  // Update state
  state.modifiedFiles = state.modifiedFiles.slice(0, savepoint.fileIndex);
  state.savepoints = state.savepoints.slice(0, savepointIndex + 1);

  return true;
}

/**
 * Start a new transaction
 */
function startTransaction(projectRoot, options = {}) {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const state = {
    transactionId,
    status: 'active',
    startedAt: new Date().toISOString(),
    description: options.description || '',
    modifiedFiles: [],
    savepoints: [],
    verificationResults: [],
    options: {
      autoCommit: options.autoCommit ?? CONFIG.autoCommitOnSuccess,
      autoRollback: options.autoRollback ?? CONFIG.autoRollbackOnFailure,
    },
  };

  // Create initial savepoint
  createSavepoint(state, 'initial');

  saveState(projectRoot, state);
  return state;
}

/**
 * Commit a transaction (make changes permanent)
 */
function commitTransaction(projectRoot) {
  const state = loadState(projectRoot);
  if (!state || state.status !== 'active') {
    return { success: false, reason: 'No active transaction' };
  }

  // Optionally create a git commit
  try {
    if (state.modifiedFiles.length > 0) {
      const files = state.modifiedFiles.map((f) => f.path);
      execSync(`git add ${files.join(' ')}`, { cwd: projectRoot, stdio: 'pipe' });
    }
  } catch {
    // Git operations are optional
  }

  // Clean up backups
  const backupDir = path.join(projectRoot, CONFIG.backupDir, state.transactionId);
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true });
  }

  // Update state
  state.status = 'committed';
  state.committedAt = new Date().toISOString();
  saveState(projectRoot, state);

  return { success: true, transactionId: state.transactionId };
}

/**
 * Rollback entire transaction
 */
function rollbackTransaction(projectRoot) {
  const state = loadState(projectRoot);
  if (!state || state.status !== 'active') {
    return { success: false, reason: 'No active transaction' };
  }

  // Restore all modified files
  for (const file of state.modifiedFiles.reverse()) {
    restoreFile(file.path, projectRoot, state.transactionId);
  }

  // Clean up backups
  const backupDir = path.join(projectRoot, CONFIG.backupDir, state.transactionId);
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true });
  }

  // Update state
  state.status = 'rolled_back';
  state.rolledBackAt = new Date().toISOString();
  saveState(projectRoot, state);

  return { success: true, filesRestored: state.modifiedFiles.length };
}

/**
 * Main PreToolUse handler - backup files before modification
 */
async function preToolUseHandler(context) {
  const { tool, toolInput, projectRoot } = context;

  // Only track transactional operations
  if (!CONFIG.transactionOperations.includes(tool)) {
    return { decision: 'approve' };
  }

  const filePath = toolInput?.file_path || '';
  if (!filePath) {
    return { decision: 'approve' };
  }

  // Load or create transaction
  let state = loadState(projectRoot);

  if (!state || state.status !== 'active') {
    // Auto-start transaction for Edit/Write
    state = startTransaction(projectRoot, {
      description: `Auto-started for ${tool} on ${path.basename(filePath)}`,
    });
  }

  // Create backup before modification
  const relativePath = path.relative(projectRoot, filePath);
  const backupPath = backupFile(relativePath, projectRoot, state.transactionId);

  // Track this modification
  state.modifiedFiles.push({
    path: relativePath,
    tool,
    timestamp: new Date().toISOString(),
    backupPath,
    isNew: !backupPath,
  });

  saveState(projectRoot, state);

  return { decision: 'approve' };
}

/**
 * Main PostToolUse handler - verify and potentially rollback
 */
async function postToolUseHandler(context) {
  const { tool, toolInput, toolOutput, projectRoot } = context;

  // Only process transactional operations
  if (!CONFIG.transactionOperations.includes(tool)) {
    return { continue: true };
  }

  const state = loadState(projectRoot);
  if (!state || state.status !== 'active') {
    return { continue: true };
  }

  // Check if operation succeeded
  const operationSucceeded = !toolOutput?.error;

  if (!operationSucceeded && state.options.autoRollback) {
    // Operation failed - suggest rollback
    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Refactor Transaction - Operation Failed                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Transaction ID: ${state.transactionId.substring(0, 40).padEnd(40)}║
║  Failed Operation: ${tool.padEnd(45)}║
║  Files Modified: ${state.modifiedFiles.length.toString().padEnd(46)}║
║                                                               ║
║  Options:                                                     ║
║  [R] Rollback to last savepoint                               ║
║  [A] Rollback entire transaction                              ║
║  [C] Continue anyway (risky)                                  ║
║  [S] Create savepoint and continue                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        refactorTransaction: true,
        transactionId: state.transactionId,
        status: 'operation_failed',
        suggestRollback: true,
      },
    };
  }

  // Track verification result
  state.verificationResults.push({
    tool,
    file: toolInput?.file_path,
    success: operationSucceeded,
    timestamp: new Date().toISOString(),
  });

  saveState(projectRoot, state);

  return { continue: true };
}

/**
 * Main hook handler (dispatches based on event type)
 */
module.exports = async function refactorTransactionHook(context) {
  const { hookType } = context;

  if (hookType === 'PreToolUse') {
    return preToolUseHandler(context);
  }

  if (hookType === 'PostToolUse') {
    return postToolUseHandler(context);
  }

  return { continue: true };
};

// Export control functions
module.exports.startTransaction = startTransaction;
module.exports.commitTransaction = commitTransaction;
module.exports.rollbackTransaction = rollbackTransaction;
module.exports.createSavepoint = createSavepoint;
module.exports.rollbackToSavepoint = rollbackToSavepoint;
module.exports.loadState = loadState;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.backupFile = backupFile;
module.exports.restoreFile = restoreFile;
