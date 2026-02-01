/**
 * Init Module
 *
 * Unified exports for the init command module.
 * Provides access to features, command templates, and generators.
 *
 * @see https://github.com/evan043/claude-cli-advanced-starter-pack/issues/52
 */

// Features configuration
export {
  OPTIONAL_FEATURES,
  AVAILABLE_COMMANDS,
  getFeatureByName,
  getCommandsForFeature,
  getDefaultFeatures,
} from './features.js';

// Command templates
export {
  COMMAND_TEMPLATES,
  getCommandTemplate,
  getCommandTemplateNames,
  hasCommandTemplate,
} from './command-templates.js';

// Generator functions
export {
  generateMenuCommand,
  generateStarterAgent,
  generateStarterSkill,
  generateStarterHook,
  generateUpdateCheckHook,
  generateSettingsJson,
  generateSettingsLocalJson,
  generateIndexFile,
  generateReadmeFile,
} from './generators.js';
