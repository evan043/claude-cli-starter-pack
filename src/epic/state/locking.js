/**
 * File Locking for Epic State
 *
 * Simple in-memory file locking implementation for concurrent access.
 */

// Simple file locking implementation
const locks = new Map();
const LOCK_TIMEOUT = 5000; // 5 seconds
const LOCK_RETRY_INTERVAL = 100; // 100ms

/**
 * Acquire lock on a file
 */
export async function acquireLock(filePath, timeout = LOCK_TIMEOUT) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!locks.has(filePath)) {
      locks.set(filePath, {
        acquired: Date.now(),
        holder: `agent-${process.pid}`,
      });
      return true;
    }

    // Check if lock is stale (holder crashed)
    const lock = locks.get(filePath);
    if (Date.now() - lock.acquired > LOCK_TIMEOUT) {
      locks.delete(filePath);
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL));
  }

  throw new Error(`Failed to acquire lock on ${filePath} after ${timeout}ms`);
}

/**
 * Release lock on a file
 */
export function releaseLock(filePath) {
  locks.delete(filePath);
}

export { locks, LOCK_TIMEOUT, LOCK_RETRY_INTERVAL };
