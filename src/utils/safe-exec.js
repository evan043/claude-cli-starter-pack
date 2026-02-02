/**
 * Safe Execution Utilities
 *
 * Provides secure alternatives to execSync with string interpolation.
 * Uses execFileSync to avoid shell injection vulnerabilities.
 */

import { execFileSync, execSync } from 'child_process';

/**
 * Safely execute a GitHub CLI command
 * Uses execFileSync to avoid shell injection
 *
 * @param {string[]} args - Array of arguments for gh command
 * @param {Object} options - execFileSync options
 * @returns {string} Command output
 */
export function safeGhExec(args, options = {}) {
  const defaultOptions = {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  };

  return execFileSync('gh', args, defaultOptions);
}

/**
 * Create a GitHub issue safely
 *
 * @param {Object} params - Issue parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {string} params.title - Issue title
 * @param {string} params.body - Issue body
 * @param {string[]} [params.labels] - Issue labels
 * @returns {Object} { success, url, number, error }
 */
export function safeCreateIssue({ owner, repo, title, body, labels = [] }) {
  try {
    const args = [
      'issue', 'create',
      '--repo', `${owner}/${repo}`,
      '--title', title,
      '--body', body,
    ];

    if (labels.length > 0) {
      args.push('--label', labels.join(','));
    }

    const result = safeGhExec(args);
    const urlMatch = result.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);

    if (urlMatch) {
      return {
        success: true,
        url: urlMatch[0],
        number: parseInt(urlMatch[1]),
      };
    }

    return { success: true, url: result.trim() };
  } catch (e) {
    return {
      success: false,
      error: e.message,
    };
  }
}

/**
 * Add a comment to a GitHub issue safely
 *
 * @param {Object} params - Comment parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number|string} params.issueNumber - Issue number
 * @param {string} params.body - Comment body
 * @returns {boolean} Success status
 */
export function safeAddIssueComment({ owner, repo, issueNumber, body }) {
  try {
    safeGhExec([
      'issue', 'comment',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
      '--body', body,
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Close a GitHub issue safely
 *
 * @param {Object} params - Close parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {number|string} params.issueNumber - Issue number
 * @param {string} [params.comment] - Optional closing comment
 * @returns {boolean} Success status
 */
export function safeCloseIssue({ owner, repo, issueNumber, comment }) {
  try {
    const args = [
      'issue', 'close',
      String(issueNumber),
      '--repo', `${owner}/${repo}`,
    ];

    if (comment) {
      args.push('--comment', comment);
    }

    safeGhExec(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escape a string for safe use in shell commands
 * Only use this when execFileSync is not an option
 *
 * @param {string} str - String to escape
 * @returns {string} Shell-escaped string
 */
export function shellEscape(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  // For POSIX shells, single quotes are safest
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Escape a string for use in double-quoted shell strings
 * Handles: $ ` \ " ! (newlines converted to literal \n)
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string (without surrounding quotes)
 */
export function escapeDoubleQuotes(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  return str
    .replace(/\\/g, '\\\\')     // Backslashes first
    .replace(/"/g, '\\"')       // Double quotes
    .replace(/\$/g, '\\$')      // Dollar signs (variable expansion)
    .replace(/`/g, '\\`')       // Backticks (command substitution)
    .replace(/!/g, '\\!')       // Exclamation (history expansion)
    .replace(/\n/g, '\\n')      // Newlines
    .replace(/\r/g, '\\r');     // Carriage returns
}
