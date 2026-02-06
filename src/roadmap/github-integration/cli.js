/**
 * GitHub CLI Utilities
 *
 * Checks for gh CLI availability and repository information.
 */

import { execSync } from 'child_process';
import { loadConfig } from '../../utils.js';

/**
 * Check if gh CLI is available and authenticated
 *
 * @returns {Object} { available: boolean, authenticated: boolean, error?: string }
 */
export function checkGhCli() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch (e) {
    return {
      available: false,
      authenticated: false,
      error: 'GitHub CLI (gh) not found. Install from: https://cli.github.com/',
    };
  }

  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return { available: true, authenticated: true };
  } catch (e) {
    return {
      available: true,
      authenticated: false,
      error: 'GitHub CLI not authenticated. Run: gh auth login',
    };
  }
}

/**
 * Get repository info from config or git remote
 *
 * @returns {Object} { owner: string, repo: string } or null
 */
export function getRepoInfo() {
  const config = loadConfig();

  if (config?.owner && config?.repo) {
    return { owner: config.owner, repo: config.repo };
  }

  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (e) {
    // Not a git repo or no origin
  }

  return null;
}
