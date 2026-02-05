/**
 * GitHub authentication functions
 *
 * Handles gh CLI authentication checks and user info
 */

import { execCommand } from '../../utils.js';

/**
 * Check if gh CLI is authenticated
 */
export function isAuthenticated() {
  const result = execCommand('gh auth status');
  return result.success;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  const result = execCommand('gh api user --jq ".login"');
  if (result.success) {
    return result.output;
  }
  return null;
}
