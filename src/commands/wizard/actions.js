/**
 * Wizard Action Handlers
 *
 * Re-exports all action handlers from focused submodules.
 * This maintains backwards compatibility while organizing code into modules.
 */

// Import all functions
import {
  runRestore as _runRestore,
  runRemove as _runRemove
} from './actions/backup-restore.js';

import {
  runReinstall as _runReinstall,
  runAutoInstall as _runAutoInstall,
  runCustomInstall as _runCustomInstall
} from './actions/install.js';

import {
  showTemplates as _showTemplates,
  showPriorReleases as _showPriorReleases,
  showReleaseDetails as _showReleaseDetails
} from './actions/templates.js';

import {
  showAddFeaturesMenu as _showAddFeaturesMenu,
  addFeaturesFromRelease as _addFeaturesFromRelease,
  installHappyEngineering as _installHappyEngineering
} from './actions/features.js';

// Re-export all functions
export const runRestore = _runRestore;
export const runRemove = _runRemove;
export const runReinstall = _runReinstall;
export const runAutoInstall = _runAutoInstall;
export const runCustomInstall = _runCustomInstall;
export const showTemplates = _showTemplates;
export const showPriorReleases = _showPriorReleases;
export const showReleaseDetails = _showReleaseDetails;
export const showAddFeaturesMenu = _showAddFeaturesMenu;
export const addFeaturesFromRelease = _addFeaturesFromRelease;
export const installHappyEngineering = _installHappyEngineering;

// Default export for backwards compatibility
export default {
  runRestore: _runRestore,
  runRemove: _runRemove,
  runReinstall: _runReinstall,
  runAutoInstall: _runAutoInstall,
  runCustomInstall: _runCustomInstall,
  showTemplates: _showTemplates,
  showPriorReleases: _showPriorReleases,
  showReleaseDetails: _showReleaseDetails,
  showAddFeaturesMenu: _showAddFeaturesMenu,
  addFeaturesFromRelease: _addFeaturesFromRelease,
  installHappyEngineering: _installHappyEngineering,
};
