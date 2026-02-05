/**
 * Directory management and path utilities for exploration documentation
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Create exploration directory structure
 * @param {string} slug - Project slug (kebab-case)
 * @param {string} cwd - Current working directory (default: process.cwd())
 * @returns {string} Path to exploration directory
 */
export function createExplorationDir(slug, cwd = process.cwd()) {
  const explorationDir = join(cwd, '.claude', 'exploration', slug);

  if (!existsSync(explorationDir)) {
    mkdirSync(explorationDir, { recursive: true });
  }

  return explorationDir;
}

/**
 * Get exploration directory path
 * @param {string} slug - Project slug
 * @param {string} cwd - Current working directory
 * @returns {string} Path to exploration directory
 */
export function getExplorationDir(slug, cwd = process.cwd()) {
  return join(cwd, '.claude', 'exploration', slug);
}

/**
 * Check if exploration docs exist for a slug
 * @param {string} slug - Project slug
 * @param {string} cwd - Current working directory
 * @returns {boolean} True if exploration docs exist
 */
export function explorationDocsExist(slug, cwd = process.cwd()) {
  const findingsPath = join(getExplorationDir(slug, cwd), 'findings.json');
  return existsSync(findingsPath);
}
