/**
 * Tech Stack Persistence
 *
 * Delegates to the canonical loadTechStack/saveTechStack in src/utils.js.
 * This module re-exports for backward compatibility within config submodules.
 */

import {
  loadTechStack as _loadTechStack,
  saveTechStack as _saveTechStack,
  getTechStackPath,
} from '../../../utils.js';

/**
 * Load tech-stack.json
 */
export function loadTechStack() {
  return _loadTechStack();
}

/**
 * Save tech-stack.json
 * @returns {string} Path that was written to
 */
export function saveTechStack(techStack) {
  _saveTechStack(techStack);
  return getTechStackPath();
}
