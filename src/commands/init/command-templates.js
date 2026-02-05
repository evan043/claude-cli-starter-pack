/**
 * Command Templates
 *
 * Template generators for slash commands deployed during CCASP initialization.
 * Each template returns the markdown content for a slash command file.
 *
 * Extracted from init.js for maintainability.
 * Organized into submodules by domain.
 */

import { CORE_TEMPLATES } from './command-templates/core.js';
import { GITHUB_TEMPLATES } from './command-templates/github.js';
import { DEVELOPMENT_TEMPLATES } from './command-templates/development.js';

/**
 * Command template generators
 * Each key is a command name, each value is a function returning the command markdown
 */
export const COMMAND_TEMPLATES = {
  ...CORE_TEMPLATES,
  ...GITHUB_TEMPLATES,
  ...DEVELOPMENT_TEMPLATES,
};

/**
 * Get a command template by name
 * @param {string} name - Command name
 * @returns {Function|undefined} Template generator function
 */
export function getCommandTemplate(name) {
  return COMMAND_TEMPLATES[name];
}

/**
 * Get all available command template names
 * @returns {string[]} Array of command names
 */
export function getCommandTemplateNames() {
  return Object.keys(COMMAND_TEMPLATES);
}

/**
 * Check if a command template exists
 * @param {string} name - Command name
 * @returns {boolean} True if template exists
 */
export function hasCommandTemplate(name) {
  return name in COMMAND_TEMPLATES;
}
