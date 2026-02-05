/**
 * Init Features Configuration
 *
 * Thin re-export wrapper for feature definitions and commands.
 * Split into submodules for maintainability (<300 LOC each).
 */

import { CORE_FEATURES } from './features/core.js';
import { GITHUB_FEATURES } from './features/github.js';
import { DEPLOYMENT_FEATURES } from './features/deployment.js';
import { AVAILABLE_COMMANDS } from './features/commands.js';

/**
 * Merged optional features from all submodules
 */
export const OPTIONAL_FEATURES = [
  ...CORE_FEATURES,
  ...GITHUB_FEATURES,
  ...DEPLOYMENT_FEATURES,
];

/**
 * Re-export available commands
 */
export { AVAILABLE_COMMANDS };

/**
 * Get feature by name
 */
export function getFeatureByName(name) {
  return OPTIONAL_FEATURES.find(f => f.name === name);
}

/**
 * Get commands for a feature
 */
export function getCommandsForFeature(featureName) {
  const feature = getFeatureByName(featureName);
  return feature ? feature.commands || [] : [];
}

/**
 * Get default features (those with default: true)
 */
export function getDefaultFeatures() {
  return OPTIONAL_FEATURES.filter(f => f.default);
}
