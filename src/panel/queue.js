/**
 * CCASP Panel Queue System
 *
 * Handles IPC between the CCASP Panel (separate terminal) and Claude Code CLI
 * via a file-based queue + clipboard fallback.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'child_process';

// Queue file location - in user's .claude folder for cross-project access
const QUEUE_DIR = join(homedir(), '.claude', 'ccasp-panel');
const QUEUE_FILE = join(QUEUE_DIR, 'command-queue.json');
const LOCK_FILE = join(QUEUE_DIR, '.lock');

/**
 * Ensure queue directory exists
 */
export function ensureQueueDir() {
  if (!existsSync(QUEUE_DIR)) {
    mkdirSync(QUEUE_DIR, { recursive: true });
  }
}

/**
 * Write a command to the queue
 */
export function queueCommand(command, args = '', metadata = {}) {
  ensureQueueDir();

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    command,
    args,
    timestamp: Date.now(),
    cwd: process.cwd(),
    status: 'pending',
    ...metadata
  };

  // Read existing queue
  let queue = [];
  if (existsSync(QUEUE_FILE)) {
    try {
      queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    } catch {
      queue = [];
    }
  }

  // Add new entry
  queue.push(entry);

  // Keep only last 50 entries
  if (queue.length > 50) {
    queue = queue.slice(-50);
  }

  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');

  return entry;
}

/**
 * Get the next pending command from queue
 */
export function getNextCommand() {
  if (!existsSync(QUEUE_FILE)) {
    return null;
  }

  try {
    const queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    return queue.find(entry => entry.status === 'pending') || null;
  } catch {
    return null;
  }
}

/**
 * Mark a command as processed
 */
export function markCommandProcessed(id, status = 'completed') {
  if (!existsSync(QUEUE_FILE)) {
    return false;
  }

  try {
    const queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    const entry = queue.find(e => e.id === id);
    if (entry) {
      entry.status = status;
      entry.processedAt = Date.now();
      writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Clear the entire queue
 */
export function clearQueue() {
  if (existsSync(QUEUE_FILE)) {
    unlinkSync(QUEUE_FILE);
  }
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  if (!existsSync(QUEUE_FILE)) {
    return { total: 0, pending: 0, completed: 0, failed: 0 };
  }

  try {
    const queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    return {
      total: queue.length,
      pending: queue.filter(e => e.status === 'pending').length,
      completed: queue.filter(e => e.status === 'completed').length,
      failed: queue.filter(e => e.status === 'failed').length,
    };
  } catch {
    return { total: 0, pending: 0, completed: 0, failed: 0 };
  }
}

/**
 * Copy text to clipboard (cross-platform)
 * Uses stdin to safely pass text without shell injection risks
 */
export function copyToClipboard(text) {
  try {
    if (process.platform === 'win32') {
      // Windows: pipe text to clip via stdin
      const result = spawnSync('clip', [], {
        input: text,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.status === 0;
    } else if (process.platform === 'darwin') {
      // macOS: pipe to pbcopy via stdin
      const result = spawnSync('pbcopy', [], {
        input: text,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.status === 0;
    } else {
      // Linux: try xclip, fallback to xsel
      let result = spawnSync('xclip', ['-selection', 'clipboard'], {
        input: text,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (result.status !== 0) {
        result = spawnSync('xsel', ['--clipboard'], {
          input: text,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }

      return result.status === 0;
    }
  } catch {
    return false;
  }
}

/**
 * Watch queue for changes (for Claude Code hook)
 */
export function watchQueue(callback) {
  ensureQueueDir();

  // Create empty queue file if doesn't exist
  if (!existsSync(QUEUE_FILE)) {
    writeFileSync(QUEUE_FILE, '[]', 'utf8');
  }

  watchFile(QUEUE_FILE, { interval: 500 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      const command = getNextCommand();
      if (command) {
        callback(command);
      }
    }
  });

  return () => unwatchFile(QUEUE_FILE);
}

/**
 * Get the queue file path (for hook configuration)
 */
export function getQueueFilePath() {
  return QUEUE_FILE;
}
