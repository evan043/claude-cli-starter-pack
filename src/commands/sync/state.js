/**
 * Sync State Management
 *
 * Handles task state persistence to disk
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { safeWriteJson } from '../../utils/file-ops.js';

// State directory
export const STATE_DIR = join(process.cwd(), '.gtask');

/**
 * Save task state to disk
 */
export function saveTaskState(state) {
  const filePath = join(STATE_DIR, `issue-${state.issueNumber}.json`);
  safeWriteJson(filePath, state);
}

/**
 * Load task state from disk
 */
export function loadTaskState(issueNumber) {
  const filePath = join(STATE_DIR, `issue-${issueNumber}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load all task states
 */
export function loadAllTaskStates() {
  if (!existsSync(STATE_DIR)) {
    return [];
  }

  const files = readdirSync(STATE_DIR).filter((f) => f.startsWith('issue-') && f.endsWith('.json'));
  const states = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(STATE_DIR, file), 'utf8');
      states.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  return states.sort((a, b) => b.issueNumber - a.issueNumber);
}

/**
 * Update a specific task's status
 */
export function updateTaskStatus(issueNumber, taskIndex, status) {
  const state = loadTaskState(issueNumber);
  if (!state || !state.tasks[taskIndex]) {
    return false;
  }

  state.tasks[taskIndex].status = status;
  saveTaskState(state);
  return true;
}
