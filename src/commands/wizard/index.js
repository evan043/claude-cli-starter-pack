/**
 * Wizard Module - Unified Re-exports
 *
 * Central export point for all wizard-related functionality.
 * Provides clean imports for the main setup-wizard.js file.
 */

// Re-export helpers
export {
  getTemplateCounts,
  createBackup,
  copyDirRecursive,
  findExistingBackups,
  showSetupHeader,
  showRestartReminder,
  showCompletionMessage,
  showManualLaunchInstructions,
  launchClaudeCLI,
} from './helpers.js';

// Re-export prompts
export {
  SETUP_OPTIONS,
  ADVANCED_OPTIONS,
  FEATURE_CATEGORIES,
  getAllFeatures,
  mapFeaturesToInit,
  getDefaultFeatures,
  getAllInitFeatures,
} from './prompts.js';

// Re-export actions
export {
  runRestore,
  runRemove,
  runReinstall,
  runAutoInstall,
  runCustomInstall,
  showTemplates,
  showPriorReleases,
  showReleaseDetails,
  showAddFeaturesMenu,
  addFeaturesFromRelease,
  installHappyEngineering,
} from './actions.js';
