/**
 * Tech stack related template utilities
 *
 * Handles tech stack generation, merging, and validation.
 */

/**
 * Generate a tech-stack.json from detected values
 * @param {object} detected - Detected tech stack
 * @param {object} userOverrides - User-provided overrides
 * @returns {object} Merged tech stack
 */
export function generateTechStack(detected, userOverrides = {}) {
  // Deep merge function
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined && source[key] !== null) {
        result[key] = source[key];
      }
    }
    return result;
  }

  return deepMerge(detected, userOverrides);
}
