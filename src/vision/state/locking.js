/**
 * Vision State Locking
 *
 * Provides both in-memory (same-process) and file-based (cross-process)
 * locking for concurrent access to Vision state files.
 */

import fs from 'fs';

// In-memory lock map for same-process fast-path locking
const locks = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds

// File-based lock map for cross-process locking
const fileLocks = new Map();
const FILE_LOCK_TIMEOUT = 10000; // 10 seconds
const STALE_LOCK_AGE = 30000; // 30 seconds - lock files older than this are stale

/**
 * Acquire in-memory lock for a file path (same-process only)
 * @param {string} filePath - Path to lock
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if lock acquired
 */
export async function acquireLock(filePath, timeout = LOCK_TIMEOUT) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!locks.has(filePath)) {
      locks.set(filePath, {
        acquired: Date.now(),
        holder: process.pid
      });
      return true;
    }

    // Check for stale locks
    const lock = locks.get(filePath);
    if (Date.now() - lock.acquired > LOCK_TIMEOUT) {
      locks.delete(filePath);
      continue;
    }

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Lock acquisition timeout for ${filePath}`);
}

/**
 * Release in-memory lock for a file path
 * @param {string} filePath - Path to unlock
 */
export function releaseLock(filePath) {
  locks.delete(filePath);
}

/**
 * Get the lockfile path for a given file
 * @param {string} filePath - Target file path
 * @returns {string} Lockfile path
 */
function getLockfilePath(filePath) {
  return filePath + '.lock';
}

/**
 * Check if a lockfile is stale (old age or dead PID)
 * @param {string} lockfilePath - Path to the lockfile
 * @returns {boolean} True if stale
 */
function isLockfileStale(lockfilePath) {
  try {
    const content = fs.readFileSync(lockfilePath, 'utf8');
    const lockData = JSON.parse(content);

    // Check age
    const age = Date.now() - new Date(lockData.acquired_at).getTime();
    if (age > STALE_LOCK_AGE) {
      return true;
    }

    // On platforms that support it, check if PID is alive
    if (lockData.pid && lockData.pid !== process.pid) {
      try {
        process.kill(lockData.pid, 0); // Signal 0 = check existence
        return false; // PID is alive
      } catch {
        return true; // PID is dead
      }
    }

    return false;
  } catch {
    return true; // Can't read = stale
  }
}

/**
 * Acquire file-based lock for cross-process safety
 * @param {string} filePath - Path to lock
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if lock acquired
 */
export async function acquireFileLock(filePath, timeout = FILE_LOCK_TIMEOUT) {
  const lockfilePath = getLockfilePath(filePath);
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Try to create lockfile exclusively
    try {
      const lockData = JSON.stringify({
        pid: process.pid,
        acquired_at: new Date().toISOString(),
        target: filePath
      });

      fs.writeFileSync(lockfilePath, lockData, { flag: 'wx' }); // wx = exclusive create
      fileLocks.set(filePath, lockfilePath);
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lockfile exists - check if stale
        if (isLockfileStale(lockfilePath)) {
          try {
            fs.unlinkSync(lockfilePath);
          } catch { /* another process may have cleaned it */ }
          continue; // Retry
        }
      } else {
        // Other error (permissions, etc) - throw
        throw error;
      }
    }

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  throw new Error(`File lock acquisition timeout for ${filePath}`);
}

/**
 * Release file-based lock
 * @param {string} filePath - Path to unlock
 */
export function releaseFileLock(filePath) {
  const lockfilePath = getLockfilePath(filePath);
  fileLocks.delete(filePath);

  try {
    fs.unlinkSync(lockfilePath);
  } catch {
    // Already cleaned up or doesn't exist
  }
}

/**
 * Clean up any stale lockfiles in a directory
 * @param {string} dirPath - Directory to clean
 * @returns {number} Number of stale locks cleaned
 */
export function cleanStaleLocks(dirPath) {
  let cleaned = 0;

  try {
    if (!fs.existsSync(dirPath)) return 0;

    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      if (entry.endsWith('.lock')) {
        const lockPath = `${dirPath}/${entry}`;
        if (isLockfileStale(lockPath)) {
          try {
            fs.unlinkSync(lockPath);
            cleaned++;
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }

  return cleaned;
}
