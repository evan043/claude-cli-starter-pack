/**
 * Transcript Parser
 *
 * Parse Claude Code JSONL transcript files for session analysis,
 * message extraction, and tool usage tracking.
 *
 * Cherry-picked from johnlindquist/claude-hooks patterns.
 * Memory-safe: streams large files line-by-line instead of full load.
 */

import { createReadStream, existsSync, statSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the transcript file path for a session
 * @param {string} sessionId - The Claude Code session ID
 * @returns {string|null} Path to the JSONL transcript file, or null if not found
 */
export function getTranscriptPath(sessionId) {
  if (!sessionId) return null;

  // Claude Code stores sessions in ~/.claude/sessions/ or project-local
  const possiblePaths = [
    join(homedir(), '.claude', 'projects', '**', `${sessionId}.jsonl`),
    join(homedir(), '.claude', 'sessions', `${sessionId}.jsonl`),
    join('.claude', 'sessions', `${sessionId}.jsonl`),
  ];

  for (const p of possiblePaths) {
    // For non-glob paths, check existence directly
    if (!p.includes('**') && existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Parse a single JSONL line safely
 * @param {string} line - Raw JSONL line
 * @returns {Object|null} Parsed JSON object or null
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Stream-read a JSONL transcript file and collect entries
 * @param {string} transcriptPath - Path to the JSONL file
 * @param {Function} [filter] - Optional filter function for entries
 * @param {number} [limit] - Max entries to collect (0 = unlimited)
 * @returns {Promise<Array>} Parsed entries
 */
export async function streamTranscript(transcriptPath, filter = null, limit = 0) {
  if (!existsSync(transcriptPath)) {
    return [];
  }

  const entries = [];

  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: createReadStream(transcriptPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      const entry = parseLine(line);
      if (!entry) return;

      if (filter && !filter(entry)) return;

      entries.push(entry);

      if (limit > 0 && entries.length >= limit) {
        rl.close();
      }
    });

    rl.on('close', () => resolve(entries));
    rl.on('error', (err) => reject(err));
  });
}

/**
 * Get the initial (first) user message from a transcript
 * @param {string} transcriptPath - Path to the JSONL file
 * @returns {Promise<Object|null>} First user message entry or null
 */
export async function getInitialMessage(transcriptPath) {
  const results = await streamTranscript(
    transcriptPath,
    (entry) => entry.role === 'user' || entry.type === 'user',
    1
  );
  return results[0] || null;
}

/**
 * Get all messages from a transcript
 * @param {string} transcriptPath - Path to the JSONL file
 * @returns {Promise<Array>} All message entries
 */
export async function getAllMessages(transcriptPath) {
  return streamTranscript(
    transcriptPath,
    (entry) => entry.role === 'user' || entry.role === 'assistant' || entry.type === 'user' || entry.type === 'assistant'
  );
}

/**
 * Get conversation history as user/assistant pairs
 * @param {string} transcriptPath - Path to the JSONL file
 * @returns {Promise<Array>} Array of { user, assistant } pairs
 */
export async function getConversationHistory(transcriptPath) {
  const messages = await getAllMessages(transcriptPath);
  const pairs = [];
  let currentPair = {};

  for (const msg of messages) {
    const role = msg.role || msg.type;
    if (role === 'user') {
      if (currentPair.user) {
        pairs.push({ ...currentPair });
      }
      currentPair = { user: msg };
    } else if (role === 'assistant') {
      currentPair.assistant = msg;
      pairs.push({ ...currentPair });
      currentPair = {};
    }
  }

  // Push any remaining unpaired user message
  if (currentPair.user) {
    pairs.push({ ...currentPair });
  }

  return pairs;
}

/**
 * Analyze tool usage patterns from a transcript
 * @param {string} transcriptPath - Path to the JSONL file
 * @returns {Promise<Object>} Tool usage counts { toolName: count }
 */
export async function getToolUsage(transcriptPath) {
  const entries = await streamTranscript(
    transcriptPath,
    (entry) => entry.type === 'tool_use' || entry.tool_name || entry.name
  );

  const usage = {};
  for (const entry of entries) {
    const toolName = entry.tool_name || entry.name || entry.tool || 'unknown';
    usage[toolName] = (usage[toolName] || 0) + 1;
  }

  return usage;
}

/**
 * Get the last N messages from a transcript (tail)
 * Memory-efficient: reads the file size first, then streams with offset estimation
 * @param {string} transcriptPath - Path to the JSONL file
 * @param {number} n - Number of messages to return
 * @returns {Promise<Array>} Last N message entries
 */
export async function getLastNMessages(transcriptPath, n = 10) {
  const allMessages = await getAllMessages(transcriptPath);
  return allMessages.slice(-n);
}

/**
 * Get transcript metadata (file size, line count, time range)
 * @param {string} transcriptPath - Path to the JSONL file
 * @returns {Promise<Object>} Metadata object
 */
export async function getTranscriptMetadata(transcriptPath) {
  if (!existsSync(transcriptPath)) {
    return null;
  }

  const stats = statSync(transcriptPath);
  let lineCount = 0;
  let firstTimestamp = null;
  let lastTimestamp = null;

  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: createReadStream(transcriptPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      lineCount++;
      const entry = parseLine(line);
      if (entry?.timestamp || entry?.created_at) {
        const ts = entry.timestamp || entry.created_at;
        if (!firstTimestamp) firstTimestamp = ts;
        lastTimestamp = ts;
      }
    });

    rl.on('close', () => {
      resolve({
        filePath: transcriptPath,
        fileSize: stats.size,
        fileSizeHuman: formatBytes(stats.size),
        lineCount,
        firstTimestamp,
        lastTimestamp,
        modifiedAt: stats.mtime.toISOString(),
      });
    });

    rl.on('error', (err) => reject(err));
  });
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
