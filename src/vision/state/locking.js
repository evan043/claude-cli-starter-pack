/**
 * Vision State Locking
 *
 * Provides file-level locking for concurrent access to Vision state files.
 */

// In-memory lock map for file locking
const locks = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds

/**
 * Acquire lock for a file path
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
 * Release lock for a file path
 * @param {string} filePath - Path to unlock
 */
export function releaseLock(filePath) {
  locks.delete(filePath);
}
