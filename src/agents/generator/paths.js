/**
 * Agent path utilities
 */
import { join } from 'path';

/**
 * Get the path to agent templates
 * @param {string} ccaspRoot - CCASP installation root
 * @returns {string} Path to templates/agents directory
 */
export function getTemplatesPath(ccaspRoot) {
  return join(ccaspRoot, 'templates', 'agents');
}

/**
 * Get the path to project agents directory
 * @param {string} projectRoot - Project root directory
 * @returns {string} Path to .claude/agents directory
 */
export function getAgentsPath(projectRoot = process.cwd()) {
  return join(projectRoot, '.claude', 'agents');
}
