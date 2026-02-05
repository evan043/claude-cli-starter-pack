/**
 * Message Queue
 *
 * Message passing between agents and orchestrator.
 */

import fs from 'fs';
import { acquireLock, releaseLock } from './locking.js';
import { getStatePath, loadState } from './store.js';

/**
 * Add message to queue
 */
export async function addMessage(projectRoot, message) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    state.messages.push({
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: message.type,
      sender: message.sender,
      recipient: message.recipient || 'orchestrator',
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
      processed: false,
      payload: message.payload,
    });

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return state.messages[state.messages.length - 1];
  } finally {
    releaseLock(statePath);
  }
}

/**
 * Get messages for an agent
 */
export function getMessages(projectRoot, options = {}) {
  const state = loadState(projectRoot);
  if (!state) return [];

  let messages = state.messages;

  if (options.recipient) {
    messages = messages.filter(m =>
      m.recipient === options.recipient || m.recipient === 'all'
    );
  }

  if (options.type) {
    messages = messages.filter(m => m.type === options.type);
  }

  if (options.correlationId) {
    messages = messages.filter(m => m.correlationId === options.correlationId);
  }

  if (options.unprocessedOnly) {
    messages = messages.filter(m => !m.processed);
  }

  if (options.since) {
    const sinceDate = new Date(options.since);
    messages = messages.filter(m => new Date(m.timestamp) > sinceDate);
  }

  return messages;
}

/**
 * Mark message as processed
 */
export async function markMessageProcessed(projectRoot, messageId) {
  const statePath = getStatePath(projectRoot);

  await acquireLock(statePath);
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    const message = state.messages.find(m => m.id === messageId);
    if (message) {
      message.processed = true;
      message.processedAt = new Date().toISOString();
    }

    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

    return message;
  } finally {
    releaseLock(statePath);
  }
}
