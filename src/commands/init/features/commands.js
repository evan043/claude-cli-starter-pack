/**
 * Available Commands Configuration
 *
 * Merges core and feature-specific commands.
 */

import { CORE_COMMANDS } from './commands-core.js';
import { FEATURE_COMMANDS } from './commands-features.js';

/**
 * All available slash commands for deployment
 */
export const AVAILABLE_COMMANDS = [
  ...CORE_COMMANDS,
  ...FEATURE_COMMANDS,
];
