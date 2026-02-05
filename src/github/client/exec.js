/**
 * GitHub CLI execution helpers
 *
 * Provides safe gh CLI command execution using execFileSync
 */

import { execFileSync } from 'child_process';

/**
 * Safely execute gh CLI commands using execFileSync (no shell injection)
 * @param {string[]} args - Array of arguments for gh command
 * @param {Object} options - execFileSync options
 * @returns {{ success: boolean, output: string, error?: string }}
 */
export function safeGhExec(args, options = {}) {
  try {
    const output = execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      ...options,
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.stderr || error.message,
    };
  }
}
