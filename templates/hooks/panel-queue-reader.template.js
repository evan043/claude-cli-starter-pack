/**
 * CCASP Panel Queue Reader Hook
 *
 * Reads commands from the CCASP Panel queue and injects them
 * when user submits an empty prompt (just presses Enter).
 *
 * Install: ccasp install-panel-hook
 * Or copy to: .claude/hooks/panel-queue-reader.js
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Queue file location
const QUEUE_FILE = join(homedir(), '.claude', 'ccasp-panel', 'command-queue.json');

/**
 * Get the next pending command from queue
 */
function getNextPendingCommand() {
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
function markCommandProcessed(id) {
  if (!existsSync(QUEUE_FILE)) {
    return;
  }

  try {
    const queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    const entry = queue.find(e => e.id === id);
    if (entry) {
      entry.status = 'completed';
      entry.processedAt = Date.now();
      writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Hook handler for UserPromptSubmit
 */
export default async function panelQueueReader(params) {
  const { prompt } = params;

  // Only trigger on empty prompts (user just pressed Enter)
  if (prompt && prompt.trim().length > 0) {
    return { proceed: true };
  }

  // Check for pending commands
  const pendingCommand = getNextPendingCommand();

  if (pendingCommand) {
    // Mark as processed immediately
    markCommandProcessed(pendingCommand.id);

    // Return the command to inject
    return {
      proceed: true,
      updatedPrompt: pendingCommand.command + (pendingCommand.args ? ' ' + pendingCommand.args : ''),
      message: `[CCASP Panel] Executing: ${pendingCommand.label || pendingCommand.command}`
    };
  }

  // No pending commands - let empty prompt through (will show help or similar)
  return { proceed: true };
}
